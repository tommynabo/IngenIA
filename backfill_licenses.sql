-- 1. Insert missing licenses for existing users
INSERT INTO public.licenses (user_id, status, bound_ip)
SELECT id, 'active', NULL
FROM public.user_profiles
WHERE id NOT IN (SELECT user_id FROM public.licenses);

-- 2. Insert missing user_settings for existing users
INSERT INTO public.user_settings (user_id, daily_limit, total_usage, risk_level)
SELECT id, 50, 0, 'low'
FROM public.user_profiles
WHERE id NOT IN (SELECT user_id FROM public.user_settings);

-- 3. Verify results
SELECT count(*) as licenses_created FROM public.licenses;
