import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2023-10-16',
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
        return res.status(400).json({ error: 'Missing signature or secret' });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email; // Or session.customer_email

        if (customerEmail) {
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
                    .update({ status: 'active', expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }) // 3 days trial
                    .eq('user_id', profiles.id);

                if (updateError) console.error('Error activating license for existing user:', updateError);
                else console.log(`License activated for existing user: ${profiles.id}`);

            } else {
                // NEW USER: Add to Pre-Paid Waiting Room
                const { error: insertError } = await supabase
                    .from('pre_paid_licenses')
                    .upsert({ email: customerEmail, status: 'paid' }, { onConflict: 'email' });

                if (insertError) console.error('Error adding to pre-paid list:', insertError);
                else console.log(`Added email to pre-paid licenses: ${customerEmail}`);
            }
        }
    }

    res.json({ received: true });
}
