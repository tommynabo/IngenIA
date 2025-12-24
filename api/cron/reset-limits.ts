import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Reset daily_usage to 0 for all rows
        const { error } = await supabase
            .from('user_settings')
            .update({ daily_usage: 0 })
            .neq('daily_usage', 0); // Optimize: only update if not 0

        if (error) {
            throw error;
        }

        return res.status(200).json({ success: true, message: 'Daily limits reset' });
    } catch (error: any) {
        console.error('Error resetting limits:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
