-- Add IP tracking to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_ip text;

-- Update blocked_users to support IP blocking
ALTER TABLE public.blocked_users ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.blocked_users ADD COLUMN IF NOT EXISTS user_id uuid;

-- Optional: Create a separate blocked_ips table for cleaner IP-only blocking
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    ip_address text PRIMARY KEY,
    reason text default 'abuse',
    blocked_at timestamp with time zone default timezone('utc'::text, now()) not null
);
