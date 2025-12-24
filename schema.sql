-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: user_profiles
-- Linked to auth.users. Automatically created via triggers usually, but here is the schema.
create table public.user_profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text
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
  user_id uuid references public.user_profiles(id), -- nullable until activated
  status license_status not null default 'inactive',
  bound_ip text,
  expires_at timestamp with time zone
);

-- RLS for licenses
alter table public.licenses enable row level security;

create policy "Users can view their own license" on public.licenses
  for select using (auth.uid() = user_id);

-- Only service role should be able to create/update licenses broadly, 
-- but we might allow "binding" logic via function or edge case. 
-- For now, read-only for users is safest for security.

-- 3. Table: user_settings
create type risk_level_enum as enum ('low', 'medium', 'high');

create table public.user_settings (
  user_id uuid not null references public.user_profiles(id) on delete cascade primary key,
  persona_prompt text,
  risk_level risk_level_enum default 'low',
  daily_usage int default 0,
  daily_limit int default 50 -- default value
);

-- RLS for user_settings
alter table public.user_settings enable row level security;

create policy "Users can view their own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Users can update their own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- Function to handle new user creation (optional but recommended)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  insert into public.user_settings (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
