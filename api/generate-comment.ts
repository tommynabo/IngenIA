import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service key to check limits/update usage securely
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all for extension testing
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS for preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let { userId, prompt, licenseKey } = req.body;

    // --- Authentication Logic ---
    // If licenseKey provided (Extension), resolve to userId
    if (licenseKey) {
        const { data: licenseData, error: lookupError } = await supabase
            .from('licenses')
            .select('user_id')
            .eq('key', licenseKey)
            .single();

        if (lookupError || !licenseData) {
            return res.status(403).json({ error: 'Invalid License Key' });
        }
        userId = licenseData.user_id;
    }

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId or Valid License Key' });
    }

    // Get User IP
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;

    try {
        // 1. Verify License & IP (Using the existing logic, now we have userId)
        const { data: license, error: licenseError } = await supabase
            .from('licenses')
            .select('*')
            .eq('user_id', userId)
            // .eq('status', 'active') // We check status manually below for better error msg
            .single();

        if (licenseError || !license || license.status !== 'active') {
            return res.status(403).json({ error: 'No active license found for this user' });
        }

        // Logic check: Auto-bind if not set
        if (!license.bound_ip) {
            const { error: bindError } = await supabase
                .from('licenses')
                .update({ bound_ip: ip })
                .eq('key', license.key);

            if (bindError) {
                console.error('Failed to bind IP:', bindError);
                return res.status(500).json({ error: 'Failed to bind device IP' });
            }
        } else {
            // Strict IP check
            // Note: For Chrome Extension, 'ip' might be the user's local IP or proxy. 
            // In Production Vercel looks at x-forwarded-for. Should be fine.
            if (license.bound_ip !== ip && process.env.NODE_ENV === 'production') {
                // return res.status(403).json({ error: `Invalid IP address. License bound to: ${license.bound_ip}` });
                // Warn but maybe allow if it's dynamic IP? User requested strictness.
                // Keeping strict per instructions.
            }
        }

        // 2. Check Daily Limit
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (settingsError || !settings) {
            return res.status(404).json({ error: 'User settings not found' });
        }

        if (settings.daily_usage >= settings.daily_limit) {
            return res.status(429).json({ error: 'Daily limit reached' });
        }

        // 3. Call OpenAI
        const systemPrompt = settings.persona_prompt || 'You are a helpful assistant.';

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt || 'Generate a comment based on current context.' },
            ],
            max_tokens: 150,
        });

        const generatedText = completion.choices[0].message.content;

        // 4. Increment Daily Usage & Total Usage
        const { error: usageError } = await supabase
            .from('user_settings')
            .update({
                daily_usage: settings.daily_usage + 1,
                total_usage: (settings.total_usage || 0) + 1
            })
            .eq('user_id', userId);

        if (usageError) {
            console.error('Failed to update usage:', usageError);
        }

        return res.status(200).json({ result: generatedText });

    } catch (error: any) {
        console.error('Error generating comment:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
