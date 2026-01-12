import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover' as any,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body; // or userId if we map it to customer ID

        // We need the Stripe Customer ID. 
        // Option A: Pass it from frontend if known.
        // Option B: Search by email.

        if (!email) throw new Error('Email is required');

        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'No customer found' });
        }
        const customerId = customers.data[0].id;

        const origin = process.env.NEXT_PUBLIC_BASE_URL || (req.headers.origin as string) || 'http://localhost:5173';

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/user`,
        });

        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('Portal Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
