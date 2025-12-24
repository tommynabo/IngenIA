import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { licenseKey, userId } = req.body;
  
  if (!licenseKey || !userId) {
    return res.status(400).json({ error: 'Missing licenseKey or userId' });
  }

  // Get User IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;

  try {
    // 1. Check if license exists and is free (user_id is null)
    const { data: license, error: fetchError } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', licenseKey)
      .single();

    if (fetchError || !license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.user_id) {
      return res.status(409).json({ error: 'License already activated' });
    }

    if (license.status === 'banned') {
        return res.status(403).json({ error: 'License is banned' });
    }

    // 2. Assign license to user and bind IP
    const { error: updateError } = await supabase
      .from('licenses')
      .update({
        user_id: userId,
        status: 'active',
        bound_ip: ip,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Example: 1 year expiry
      })
      .eq('key', licenseKey);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ success: true, message: 'License activated successfully' });

  } catch (error: any) {
    console.error('Error activating license:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
