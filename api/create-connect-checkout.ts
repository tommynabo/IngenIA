import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// Fix: Use the API version expected by the installed Stripe library types
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover' as any, // Explicit cast to avoid type conflicts if definitions vary
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, billingInterval, userId } = req.body; // 'month' or 'year'

        if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');

        // ... (Price resolution logic remains the same)
        // 1. Try to get explicit Price IDs from Environment (Best Performance)
        let selectedPriceId = billingInterval === 'year'
            ? process.env.STRIPE_PRICE_ID_YEARLY
            : process.env.STRIPE_PRICE_ID_MONTHLY;

        // 2. If no explicit Price ID, fetch dynamically from Product ID (User provided: prod_TltwReePAZSG7t)
        if (!selectedPriceId) {
            // ... (keep existing dynamic fetch logic)
            const productId = process.env.STRIPE_PRODUCT_ID || 'prod_TltwReePAZSG7t';
            if (productId) {
                const prices = await stripe.prices.list({
                    product: productId,
                    active: true,
                    limit: 10,
                });
                const matchedPrice = prices.data.find(p => p.recurring?.interval === billingInterval);
                if (matchedPrice) selectedPriceId = matchedPrice.id;
            }
        }

        if (!selectedPriceId) {
            throw new Error(`No price found for interval '${billingInterval}' (Product: prod_TltwReePAZSG7t). Check your Stripe Dashboard or .env variables.`);
        }

        const connectAccountId = process.env.STRIPE_CONNECT_ACCOUNT_ID;
        const origin = process.env.NEXT_PUBLIC_BASE_URL || (req.headers.origin as string) || 'http://localhost:5173';

        // Determine Success URL: If User ID is known (Paywall), go to Panel. If new (Landing), go to Register.
        const successUrl = userId
            ? `${origin}/panel?payment=success&session_id={CHECKOUT_SESSION_ID}`
            : `${origin}/registro?payment=success&session_id={CHECKOUT_SESSION_ID}`;

        // Build session params
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: selectedPriceId, quantity: 1 }],
            customer_email: email,
            client_reference_id: userId, // CRITICAL: Links Stripe session to Supabase User ID for Webhooks
            subscription_data: {
                trial_period_days: 3,
            },
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: `${origin}/?payment=cancelled`,
        };
        // Only add transfer_data and application_fee_percent if we have a Connected Account ID
        if (connectAccountId) {
            sessionParams.subscription_data!.transfer_data = {
                destination: connectAccountId,
            };
            sessionParams.subscription_data!.application_fee_percent = 50; // 50% Platform Fee
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        return res.status(200).json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
