-- SIMPLIFICACIÓN: LICENCIAS SIEMPRE ACTIVAS
-- Como pediste, eliminamos la comprobación de pago previo.
-- Todo usuario nuevo obtiene licencia 'active' por defecto.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  insert into public.user_settings (user_id, daily_limit, total_usage, last_reset_date, persona_prompt)
  values (new.id, 50, 0, current_date, '# ROL
ERES: [TU NOMBRE]. [TU PUESTO ACTUAL]. [TU EMPRESA].
# TAREA
Genera un comentario para LinkedIn... [RESTO DEL PROMPT ORIGINAL] ...@NOMBREDEPERFIL.');
  
  -- SIEMPRE ACTIVO (Ya no comprueba tabla pre_paid_licenses)
  insert into public.licenses (user_id, status) values (new.id, 'active');

  return new;
end;
$$ language plpgsql security definer;

-- Asegurar que los usuarios actuales (si alguno quedó colgado) estén activos
update public.licenses set status = 'active' where status = 'inactive';
