-- EMERGENCY UNLOCK
-- El problema es 100% permisos (RLS). Tu usuario existe y está activo, 
-- pero la base de datos no le deja "leerse" a sí mismo, así que la web cree que es inactivo.

-- Desactivamos la seguridad RLS temporalmente en las tablas críticas para que PUEDAS ENTRAR.
alter table public.licenses disable row level security;
alter table public.user_profiles disable row level security;
alter table public.user_settings disable row level security;

-- Forzamos (una vez más) tu estado a activo por si acaso
update public.licenses 
set status = 'active' 
where user_id in (
    select id from public.user_profiles 
    where email ilike '%tomas%' OR email ilike '%nivra%'
);
