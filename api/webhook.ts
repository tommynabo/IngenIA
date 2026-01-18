import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';



// Disable Vercel's default body parser to get the raw stream for Stripe signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

const buffer = (req: VercelRequest) => {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingVars = [];
    if (!STRIPE_SECRET_KEY) missingVars.push('STRIPE_SECRET_KEY');
    if (!STRIPE_WEBHOOK_SECRET) missingVars.push('STRIPE_WEBHOOK_SECRET');
    if (!SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!SUPABASE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingVars.length > 0) {
        console.error(`CRITICAL: Missing env variables: ${missingVars.join(', ')}`);
        // Return 500 with details so user can see it in Stripe Dashboard
        return res.status(500).json({
            error: 'Server config error',
            missing_variables: missingVars
        });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).json({ error: 'Missing signature' });

    let event: Stripe.Event;

    try {
        const rawBody = await buffer(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook Signature Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Wrap logic in try/catch to ensure we always return 200 if it's a logic error,
    // so Stripe doesn't disable the webhook.
    try {
        console.log(`Received event: ${event.type}`);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const customerEmail = session.customer_details?.email?.toLowerCase() || session.customer_email?.toLowerCase();
            const clientReferenceId = session.client_reference_id; // Passed from frontend

            if (customerEmail) {
                console.log(`Processing Checkout for: ${customerEmail}`);

                // 1. Activate License
                // Priority: Use client_reference_id (User ID) if available, else search by email
                let userId = clientReferenceId;

                if (!userId) {
                    const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', customerEmail).single();
                    userId = profile?.id;
                }

                if (userId) {
                    // Update existing user
                    // Grant 3 days for trial (or logic based on session mode)
                    // If mode is 'subscription', we rely on invoice events for future renewals, 
                    // but we set initial active state here.
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 3); // Default 3 days trial

                    await supabase.from('licenses').upsert({
                        user_id: userId,
                        status: 'active',
                        expires_at: expiresAt.toISOString(),
                        // bound_ip: ... (optional, can be updated on login)
                    }, { onConflict: 'user_id' }); // Use upsert to be safe
                } else {
                    // Store in pre-paid for later registration
                    await supabase.from('pre_paid_licenses').upsert({
                        email: customerEmail,
                        status: 'paid'
                    });
                }
            }
        }
        else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object as Stripe.Invoice;
            const customerEmail = invoice.customer_email?.toLowerCase();

            // Calculate new expiry
            // period_end is in seconds
            const periodEnd = invoice.lines.data[0]?.period.end;
            const expiresAt = periodEnd ? new Date(periodEnd * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Fallback 30 days

            if (customerEmail) {
                console.log(`Payment Succeeded for: ${customerEmail}. Extending license.`);
                const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', customerEmail).single();

                if (profile) {
                    await supabase.from('licenses').update({
                        status: 'active',
                        expires_at: expiresAt.toISOString()
                    }).eq('user_id', profile.id);
                }
            }
        }
        else if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object as Stripe.Invoice;
            const customerEmail = invoice.customer_email?.toLowerCase();

            if (customerEmail) {
                console.log(`Payment Failed for: ${customerEmail}. Deactivating license.`);
                const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', customerEmail).single();

                if (profile) {
                    await supabase.from('licenses').update({
                        status: 'inactive'
                    }).eq('user_id', profile.id);
                }
            }
        }
        else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            // ... (Existing cancellation logic)
            if (customerId) {
                // We need to fetch customer to get email if not in event
                const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
                const customerEmail = customer.email?.toLowerCase();

                if (customerEmail) {
                    console.log(`Subscription Cancelled for: ${customerEmail}`);
                    const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', customerEmail).single();
                    if (profile) {
                        await supabase.from('licenses').update({ status: 'banned' }).eq('user_id', profile.id);
                        await supabase.from('blocked_users').upsert({
                            email: customerEmail,
                            user_id: profile.id,
                            reason: 'subscription_cancelled'
                        });
                    }
                }
            }
        }

        res.json({ received: true });

    } catch (error: any) {
        console.error(`Global Webhook Logic Error: ${error.message}`);
        // Return 200 to Stripe to acknowledge receipt and prevent retries of "bad" logic events
        // unless you want to retry. Usually for logic bugs, retrying won't help, so 200 is better to stop congestion.
        // But we log it heavily.
        res.status(200).json({ received: true, error: 'Logic error handled' });
    }
}
