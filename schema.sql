-- Reset (Caution: Deletes all data)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.licenses;
DROP TABLE IF EXISTS public.user_settings;
DROP TABLE IF EXISTS public.user_profiles;
DROP TYPE IF EXISTS license_status;
DROP TYPE IF EXISTS risk_level_enum;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: user_profiles
create table public.user_profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for user_profiles
alter table public.user_profiles enable row level security;

create policy "Users can view their own profile" on public.user_profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- 2. Table: licenses
create type license_status as enum ('active', 'inactive', 'banned');

create table public.licenses (
  key uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id) on delete cascade, -- Added cascade deletion
  status license_status not null default 'inactive',
  bound_ip text,
  expires_at timestamp with time zone
);

-- RLS for licenses
alter table public.licenses enable row level security;

create policy "Users can view their own license" on public.licenses
  for select using (auth.uid() = user_id);

-- 3. Table: user_settings
create type risk_level_enum as enum ('low', 'medium', 'high');

create table public.user_settings (
  user_id uuid not null references public.user_profiles(id) on delete cascade primary key,
  persona_prompt text,
  risk_level risk_level_enum default 'low',
  daily_usage int default 0,
  daily_limit int default 50,
  total_usage int default 0 -- Added to track lifetime stats
);

-- RLS for user_settings
alter table public.user_settings enable row level security;

create policy "Users can view their own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Users can update their own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create default settings
  insert into public.user_settings (user_id, daily_limit, total_usage)
  values (new.id, 50, 0); 
  
  -- Create default ACTIVE license (so they can use it immediately)
  insert into public.licenses (user_id, status)
  values (new.id, 'active');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
