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
        const { email, billingInterval } = req.body; // 'month' or 'year'

        if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');

        // 1. Try to get explicit Price IDs from Environment (Best Performance)
        let selectedPriceId = billingInterval === 'year'
            ? process.env.STRIPE_PRICE_ID_YEARLY
            : process.env.STRIPE_PRICE_ID_MONTHLY;

        // 2. If no explicit Price ID, fetch dynamically from Product ID (User provided: prod_TltwReePAZSG7t)
        if (!selectedPriceId) {
            // Ideally this comes from env, but we have a default provided by user
            const productId = process.env.STRIPE_PRODUCT_ID || 'prod_TltwReePAZSG7t';

            if (productId) {
                const prices = await stripe.prices.list({
                    product: productId,
                    active: true,
                    limit: 10,
                });

                // Find the price matching the interval
                const matchedPrice = prices.data.find(p =>
                    p.recurring?.interval === billingInterval
                );

                if (matchedPrice) {
                    selectedPriceId = matchedPrice.id;
                }
            }
        }

        if (!selectedPriceId) {
            throw new Error(`No price found for interval '${billingInterval}' (Product: prod_TltwReePAZSG7t). Check your Stripe Dashboard or .env variables.`);
        }

        // Allow Connect Account ID to be missing during dev/testing if user said "don't worry about it yet"
        // But we need it for the split. We will proceed; it might error from Stripe if invalid.
        const connectAccountId = process.env.STRIPE_CONNECT_ACCOUNT_ID;

        const origin = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.origin as string) ||
            'http://localhost:5173';

        // Build session params
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: selectedPriceId,
                    quantity: 1,
                },
            ],
            customer_email: email,
            subscription_data: {
                trial_period_days: 3,
                application_fee_percent: 50, // 50% Platform Fee
            },
            allow_promotion_codes: true, // Allow user to enter coupons in Stripe
            success_url: `${origin}/registro?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?payment=cancelled`,
        };
        // Only add transfer_data if we have a Connected Account ID
        if (connectAccountId) {
            sessionParams.subscription_data!.transfer_data = {
                destination: connectAccountId,
            };
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        return res.status(200).json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
