-- DATA REPAIR SCRIPT
-- Run this in Supabase SQL Editor to fix "No License" errors for existing users.

-- 1. Ensure all Auth users have a User Profile
insert into public.user_profiles (id, email, full_name, avatar_url)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name', 
  raw_user_meta_data->>'avatar_url'
from auth.users
where id not in (select id from public.user_profiles);

-- 2. Ensure all Users have Settings
insert into public.user_settings (user_id, daily_limit, total_usage, last_reset_date)
select 
  id, 
  50, 
  0, -- Starts at 0, will be updated by app logic if history exists
  current_date
from public.user_profiles
where id not in (select user_id from public.user_settings);

-- 3. Ensure all Users have an Active License
insert into public.licenses (user_id, status)
select 
  id, 
  'active'
from public.user_profiles
where id not in (select user_id from public.licenses);

-- 4. (Optional) Attempt to restore Total Usage from History Count (if history survived)
-- This updates the local counter based on how many rows are in generation_history
update public.user_settings
set total_usage = (
  select count(*) 
  from public.generation_history 
  where public.generation_history.user_id = public.user_settings.user_id
)
where total_usage = 0; -- Only if currently 0 to avoid overwriting valid data
