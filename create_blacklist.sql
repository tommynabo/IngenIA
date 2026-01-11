-- Tabla de Usuarios Bloqueados (Lista Negra)
create table if not exists public.blocked_users (
    email text primary key,
    reason text default 'subscription_cancelled',
    blocked_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Asegurar que RLS no estorba
alter table public.blocked_users enable row level security;

-- Permitir lectura pública (o auth) si quisiéramos verificar desde frontend (opcional)
-- Por ahora solo la usará el Service Role desde el Webhook.
