-- 1. FIX DEFINITIVO TRIGGER (Comparación Minusculas)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_prepaid boolean;
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  insert into public.user_settings (user_id, daily_limit, total_usage, last_reset_date, persona_prompt)
  values (new.id, 50, 0, current_date, '# ROL
ERES: [TU NOMBRE]. [TU PUESTO ACTUAL]. [TU EMPRESA].
# TAREA
Genera un comentario para LinkedIn... [RESTO DEL PROMPT ORIGINAL] ...@NOMBREDEPERFIL.');
  
  -- Check if user has pre-paid (CASE INSENSITIVE CHECK)
  select exists(
    select 1 from public.pre_paid_licenses 
    where lower(email) = lower(new.email)
  ) into is_prepaid;

  if is_prepaid then
      insert into public.licenses (user_id, status) values (new.id, 'active');
  else
      insert into public.licenses (user_id, status) values (new.id, 'inactive');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 2. ACTIVAR TU USUARIO YA
update public.licenses 
set status = 'active' 
where user_id in (
    select id from public.user_profiles 
    where email ilike '%tomas%' OR email ilike '%nivra%'
);
