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

    // --- 1. Load & Validate Secrets ---
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!STRIPE_SECRET_KEY) {
        console.error('CRITICAL ERROR: STRIPE_SECRET_KEY is missing in environment variables.');
        return res.status(500).json({ error: 'Server Misconfiguration: STRIPE_SECRET_KEY missing' });
    }
    if (!STRIPE_WEBHOOK_SECRET) {
        console.error('CRITICAL ERROR: STRIPE_WEBHOOK_SECRET is missing in environment variables.');
        return res.status(500).json({ error: 'Server Misconfiguration: STRIPE_WEBHOOK_SECRET missing' });
    }
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('CRITICAL ERROR: Supabase credentials missing.');
        return res.status(500).json({ error: 'Server Misconfiguration: Supabase credentials missing' });
    }

    // --- 2. Initialize Clients Safely ---
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any, // Stable version
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const sig = req.headers['stripe-signature'];

    if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
        // Read raw body from request stream
        const rawBody = await buffer(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email?.toLowerCase();

        if (customerEmail) {
            // 0. Check Blacklist
            const { data: blocked } = await supabase.from('blocked_users').select('email').eq('email', customerEmail).single();
            if (blocked) {
                console.log(`BLOCKED ATTEMPT: ${customerEmail} tried to pay again but is blacklisted.`);
                return res.json({ received: true, status: 'blocked' });
            }

            // 1. Try to find existing user
            const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('email', customerEmail)
                .single();

            if (profiles && profiles.id) {
                // EXISTING USER: Activate License
                const { error: updateError } = await supabase
                    .from('licenses')
                    .update({ status: 'active', expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() })
                    .eq('user_id', profiles.id);

                if (updateError) console.error('Error activating license for existing user:', updateError);

            } else {
                // NEW USER: Add to Pre-Paid Waiting Room
                const { error: insertError } = await supabase
                    .from('pre_paid_licenses')
                    .upsert({ email: customerEmail, status: 'paid' }, { onConflict: 'email' });

                if (insertError) console.error('Error adding to pre-paid list:', insertError);
            }
        }
    } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;
        // Fetch customer from Stripe to be safe
        const customerId = subscription.customer as string;
        if (customerId) {
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            const customerEmail = customer.email?.toLowerCase();

            if (customerEmail) {
                console.log(`Processing cancellation for: ${customerEmail}`);

                // 1. Mark License as Cancelled/Banned
                const { data: profile } = await supabase.from('user_profiles').select('id, last_ip').eq('email', customerEmail).single();

                if (profile) {
                    await supabase.from('licenses').update({ status: 'banned' }).eq('user_id', profile.id);

                    // 2. Add to Blacklist (Email AND IP)
                    // Block User Entry
                    await supabase.from('blocked_users').upsert({
                        email: customerEmail,
                        ip_address: profile.last_ip,
                        user_id: profile.id,
                        reason: 'subscription_cancelled'
                    });

                    // Block IP Explicitly if known
                    if (profile.last_ip) {
                        await supabase.from('blocked_ips').upsert({
                            ip_address: profile.last_ip,
                            reason: `Associated with banned user ${customerEmail}`
                        });
                    }
                } else {
                    // Fallback just email block if no profile found
                    await supabase.from('blocked_users').upsert({
                        email: customerEmail,
                        reason: 'subscription_cancelled'
                    });
                }
            }
        }
    }

    res.json({ received: true });
}
