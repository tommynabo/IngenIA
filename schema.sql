-- Reset (Caution: Deletes all data)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.generation_history; -- Drop dependent table first
DROP TABLE IF EXISTS public.licenses;
DROP TABLE IF EXISTS public.user_settings;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
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

create policy "Users can update their own license" on public.licenses
  for update using (auth.uid() = user_id);

-- 3. Table: user_settings
create type risk_level_enum as enum ('low', 'medium', 'high');

create table public.user_settings (
  user_id uuid not null references public.user_profiles(id) on delete cascade primary key,
  persona_prompt text,
  risk_level risk_level_enum default 'low',
  daily_usage int default 0,
  daily_limit int default 50,
  total_usage int default 0, -- Added to track lifetime stats
  last_reset_date text
);

-- RLS for user_settings
alter table public.user_settings enable row level security;

create policy "Users can view their own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Users can update their own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- 4. Table: generation_history
create table public.generation_history (
  id uuid not null default uuid_generate_v4() primary key,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  post_snippet text,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for generation_history
alter table public.generation_history enable row level security;

create policy "Users can view their own history" on public.generation_history
  for select using (auth.uid() = user_id);

create policy "Users can insert their own history" on public.generation_history
  for insert with check (auth.uid() = user_id);

-- 5. Table: pre_paid_licenses (Waiting Room for new users)
create table public.pre_paid_licenses (
    email text primary key,
    status text default 'paid',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- No RLS needed as this is server-side only (Service Role)

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_prepaid boolean;
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create default settings
  insert into public.user_settings (user_id, daily_limit, total_usage, last_reset_date, persona_prompt)
  values (new.id, 50, 0, current_date, $prompt$# ROL

ERES: [TU NOMBRE]. [TU PUESTO ACTUAL]. [TU EMPRESA].
TUS PALABRAS CLAVE: [KEYWORD 1], [KEYWORD 2], [KEYWORD 3].
TU BIO: [BREVE DESCRIPCIÓN DE TU PROPUESTA DE VALOR] + [HOBBIES/INTERESES].

# TAREA
Genera un comentario para LinkedIn basado en el post proporcionado abajo.
Contexto: Estás tomando un café. Hablas directo, sin filtros corporativos, pensando en voz alta.

## ⛔ REGLAS CRÍTICAS (NO HACER)
1. CERO emojis, hashtags, comillas, listas o bullets.
2. NUNCA empieces con: "Excelente", "Gran post", "Muy interesante", "Totalmente".
3. NUNCA saludes ("Hola") ni te despidas ("Saludos").
4. NO preguntes al autor (salvo duda técnica real o retórica muy obvia).
5. NO repitas el texto del post; apórtale valor, resume o dale la vuelta.

## ✅ DIRECTRICES DE ESTILO
* Tono: Conversacional, humilde, "de la calle" pero profesional.
* Conectores permitidos: la verdad, ojo que, justo, total que, al final, la cosa es que.
* Longitud: Idealmente 1-2 frases (<70 caracteres). Máximo 4 líneas solo si cuentas una historia personal.
* CIERRE OBLIGATORIO: Integra siempre la mención al autor al final de la frase o idea: @NOMBREDEPERFIL

## 🎲 MATRIZ DE RESPUESTA (Elige 1 enfoque al azar para variar)
1. Selección: "Me quedo con el [número]..." + razón práctica inmediata.
2. Reformulación: "No es X, es Y..." (Dale una vuelta al concepto central).
3. Historia: Conecta el tema con una vivencia breve tuya (máx 3 líneas).
4. Insight: Valida el post y añade una capa extra de profundidad en 1 frase.
5. Contraste: "En mi caso funciona distinto..." (Discrepa con respeto y fundamento).
6. Advertencia: "Brutal, pero ojo con..." (Equilibrio positivo/aviso).
7. Metáfora/Humor: Breve, inteligente y natural (si aplica al tema).
8. Emoción: Solo para posts personales. Valida el sentimiento sin ser cursi.

## INPUT DEL USUARIO
[PEGAR AQUÍ EL POST DE LINKEDIN]$prompt$); 
  
  -- Check if user has pre-paid
  select exists(select 1 from public.pre_paid_licenses where email = new.email) into is_prepaid;

  if is_prepaid then
      -- Active License
      insert into public.licenses (user_id, status) values (new.id, 'active');
      -- Optional: Clean up waiting room (or keep for records)
      -- delete from public.pre_paid_licenses where email = new.email; 
  else
      -- Inactive License (Paywall)
      insert into public.licenses (user_id, status) values (new.id, 'inactive');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
