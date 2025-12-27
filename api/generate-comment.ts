import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // --- CORS Headers ---
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
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

    try {
        // --- Safe Initialization ---
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const openaiApiKey = process.env.OPENAI_API_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing Supabase Credentials");
            return res.status(500).json({ error: 'Server Configuration Error: Missing Supabase Credentials' });
        }

        if (!openaiApiKey) {
            console.error("Missing OpenAI API Key");
            return res.status(500).json({ error: 'Server Configuration Error: Missing OpenAI Key' });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const openai = new OpenAI({ apiKey: openaiApiKey });

        // --- Request Processing ---
        let { userId, prompt, licenseKey } = req.body;

        // If licenseKey provided (Extension), resolve to userId
        if (licenseKey) {
            const { data: licenseData, error: lookupError } = await supabase
                .from('licenses')
                .select('user_id')
                .eq('key', licenseKey)
                .single();

            if (lookupError || !licenseData) {
                return res.status(403).json({ error: 'Invalid License Key (Not Found)' });
            }
            userId = licenseData.user_id;
        }

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId or License Key' });
        }

        // Get User IP
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;

        // 1. Verify License & IP
        const { data: license, error: licenseError } = await supabase
            .from('licenses')
            .select('*')
            .eq('user_id', userId)
            // .eq('status', 'active') // Manual check
            .single();

        if (licenseError || !license || license.status !== 'active') {
            return res.status(403).json({ error: 'No active license found for this user' });
        }

        // Auto-bind IP if empty
        if (!license.bound_ip) {
            await supabase.from('licenses').update({ bound_ip: ip }).eq('key', license.key);
        } else {
            // Strict IP check (Optional: comment out if testing from fluctuating IPs)
            if (license.bound_ip !== ip && process.env.NODE_ENV === 'production') {
                // console.warn(`IP Mismatch: ${license.bound_ip} vs ${ip}`);
                // return res.status(403).json({ error: 'IP Address Mismatch' });
            }
        }

        // 2. Check Daily Limit
        const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();

        if (settings) {
            if (settings.daily_usage >= settings.daily_limit) {
                return res.status(429).json({ error: 'Daily usage limit reached' });
            }
        }

        // 3. Call OpenAI
        const systemPrompt = settings?.persona_prompt || 'You are a helpful assistant for LinkedIn.';

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt || 'Generate a comment.' },
            ],
            max_tokens: 250,
        });

        const generatedText = completion.choices[0].message.content;

        // 4. Update Usage
        if (settings) {
            await supabase.from('user_settings').update({
                daily_usage: settings.daily_usage + 1,
                total_usage: (settings.total_usage || 0) + 1
            }).eq('user_id', userId);
        }

        return res.status(200).json({ result: generatedText });

    } catch (error: any) {
        console.error('API Handler Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
