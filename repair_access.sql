-- 1. ACTIVAR TU USUARIO MANUALMENTE (Para que entres YA)
update public.licenses 
set status = 'active' 
where user_id in (select id from auth.users where email = 'tomasnivraone@gmail.com');

-- 2. ARREGLAR PERMISOS (Para que no vuelva a pasar a otros)
-- Desactivamos RLS en esta tabla porque es de uso interno (Webhook -> Trigger)
-- y el Trigger a veces se lía con los permisos si no es superuser.
alter table public.pre_paid_licenses disable row level security;

-- 3. Asegurar que la tabla licenses permite updates desde el servidor
alter table public.licenses enable row level security;

-- Política: El usuario puede LEER su propia licencia
create policy "Users can view own license" 
on public.licenses for select 
using (auth.uid() = user_id);

-- Política: Service Role (Webhook) puede hacer DE TODO (bypass RLS por defecto, pero por si acaso)
-- No hace falta policy para service_role si RLS está activo, pero aseguramos que NO bloquee updates legitimos.
