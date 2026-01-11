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
        // Note: req.body must be raw buffer for signature verification.
        // In Vercel serverless functions, req.body is already parsed JSON by default unless config changed.
        // If issues arise, we might need 'raw-body' package or config change.
        // For now assuming standard implementation.
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email; // Or session.customer_email

        if (customerEmail) {
            // 1. Find user by email (using service role to bypass RLS)
            // Note: Supabase Auth table isn't directly queryable via public API usually, 
            // but we can query our 'user_profiles' table since it mirrors emails.
            const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('email', customerEmail)
                .single();

            if (profileError || !profiles) {
                console.error('User not found for email:', customerEmail);
                return res.status(404).json({ error: 'User not found' });
            }

            const userId = profiles.id;

            // 2. Activate License
            const { error: updateError } = await supabase
                .from('licenses')
                .update({ status: 'active', expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }) // 3 days trial
                .eq('user_id', userId);

            if (updateError) {
                console.error('Error updating license:', updateError);
                return res.status(500).json({ error: 'Database update failed' });
            }

            console.log(`License activated for user: ${userId}`);
        }
    }

    res.json({ received: true });
}
