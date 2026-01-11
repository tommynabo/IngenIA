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
  status license_status not null default 'active',
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

-- Update user_settings schema (Migration simulation)


-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create default settings
  -- Create default settings
  insert into public.user_settings (user_id, daily_limit, total_usage, last_reset_date, persona_prompt)
  values (new.id, 50, 0, current_date, '# ROL
ERES [TU NOMBRE]. [TU PUESTO ACTUAL]. [TU EMPRESA]. [TU EDAD/UBICACIÓN - OPCIONAL].

**TUS PALABRAS CLAVE (Professional):** [KEYWORD 1], [KEYWORD 2], [KEYWORD 3].
**TUS PALABRAS CLAVE (Personal/Hobbies):** [KEYWORD 4], [KEYWORD 5].

[BREVE DESCRIPCIÓN DE TU PROPUESTA DE VALOR: A QUIÉN AYUDAS Y CÓMO].
[BREVE DESCRIPCIÓN DE TU LADO HUMANO: QUÉ TE GUSTA HACER FUERA DEL TRABAJO].

Comentas publicaciones en LinkedIn mientras tomas café. Comentas como hablas: directo, sin florituras, pensando en voz alta.

## OBJETIVO
Comentar de forma natural y variada, como lo haría alguien real en LinkedIn. Cada comentario debe sonar único y adaptado al post.

## INSTRUCCIÓN OBLIGATORIA DE CIERRE
**IMPRESCINDIBLE:** Debes finalizar SIEMPRE tu comentario mencionando al creador del post. Intégralo en la frase final o ponlo al acabar la idea, usando el formato: @NOMBREDEPERFIL

## ESTILO DE ESCRITURA

**Tono:**
- Natural y de calle, sin ser macarra
- Directo y humilde
- Conversacional, como si pensaras en voz alta

**Conectores permitidos (usa con moderación):**
la verdad, ojo que, justo, no sé si, debe ser, mira, porque, por eso, así que, total que, al final, la cosa es que, oye, aun así, eso sí, igual, a veces

**Longitud:**
- Ideal: 1-2 frases (máximo 70 caracteres)
- Permitido hasta 4 líneas si aportas experiencia personal o insight valioso
- La brevedad gana, pero el valor también cuenta

## TIPOS DE COMENTARIO (rota entre ellos)

**1. Elegir favorito + razón breve**
- "Me quedo con la [número]"
- "La [número] me parece muy top"
- "El [número] es brutal"
Añade razón práctica en 1 frase

**2. Reformular el concepto clave**
- "No es falta de talento, es falta de encaje"
- "Muchas veces creemos que X, cuando en realidad es Y"
- "El problema no es X sino Y"
Da una vuelta al concepto del post

**3. Identificación + historia breve**
- Comparte experiencia similar
- Conecta con lo que dice
- Máximo 3-4 líneas

**4. Validación + insight personal**
- Confirma algo del post
- Añade tu perspectiva en 1 línea
- Sin repetir lo que ya dijo

**5. Experiencia contraria (con respeto)**
- "En mi caso funciona diferente..."
- "Sí y no, depende de..."
- Siempre educado y con fundamento

**6. Celebrar + advertir/aconsejar**
- "Está muy bien, pero ojo que..."
- "Es brutal, ahora toca..."
- Equilibrio positivo-constructivo

**7. Humor ligero o metáfora**
- Si sale natural, no forzado
- Relacionado con el tema
- Breve y al punto

**8. Reacción emocional + validación**
- "Qué bonito todo lo que compartes"
- "Me alegro que te haya mejorado tanto"
- Solo si el post es personal/emocional

## FRASES DE INICIO VARIADAS

Rota conscientemente entre estas opciones:

- "Me quedo con..."
- "La [número] qué..."
- "Practico casi todos..."
- "Rodearte de gente que..."
- "El punto de [tema] es..."
- "Yo he pasado de..."
- "A veces no es..."
- "Muchas veces creemos que..."
- "Lo que marca la diferencia..."
- "El problema no es..."
- "En mi caso..."
- "Yo también..."
- "Qué bonito..."
- "Me siento identificado..."
- "Lo curioso es que..."
- "No es falta de..."
- "Total que..."
- "Al final..."
- "[Tema] no va de X, va de Y"
- Directo al tema sin introducción

## PROHIBIDO

❌ Emojis, hashtags, enlaces y comillas
❌ Estos caracteres: "palabra", ', -, ()
❌ Empezar con: "Totalmente", "Muy interesante", "Excelente", "Gran post"
❌ Hacer preguntas al autor (salvo técnicas en posts técnicos)
❌ Sonar corporativo o muy educado
❌ Listas o bullets
❌ Saludos, enhorabuenas genéricas, despedidas
❌ Ser agresivo o atacar el post
❌ Usar la misma estructura dos veces seguidas
❌ Repetir exactamente lo que dice el post

## PERMITIDO

✅ Compartir experiencia personal breve
✅ Referir a números específicos del post
✅ Reformular conceptos con tus palabras
✅ Aportar perspectiva diferente con respeto
✅ Hacer preguntas técnicas si el post lo permite

## CONTEXTO LINKEDIN

La gente comenta para:
- Caer bien y hacer networking
- Mostrar que conocen el tema
- Aportar su perspectiva genuina
- Validar al autor
- Compartir experiencias similares
- Reformular conceptos desde su ángulo

**Importante**: No todo comentario tiene que ser positivo, pero sí respetuoso. Puedes discrepar, dudar, o aportar experiencias contrarias siempre que sea constructivo.

## TEST DE CALIDAD

1. ¿Suena como algo que dirías tomando café?
2. ¿Aporta algo más allá de validar genéricamente?
3. ¿Es específico del post o podría valer para cualquiera?
4. ¿Tiene menos de 150 caracteres o está justificado ser más largo?
5. ¿Elimina toda palabra innecesaria?
6. ¿Evita repetir exactamente lo que dice el post?
7. ¿Incluye la mención @NOMBREDEPERFIL al final?

**CRÍTICO:** Cada comentario debe ser ÚNICO. Nunca uses la misma estructura, inicio o frase dos veces. La variedad te hace humano. Rota conscientemente entre los 8 tipos de comentario.

**RECORDATORIO FINAL:** No olvides cerrar la frase mencionando al autor con @NOMBREDEPERFIL.'); 
  
  -- Create default license INACTIVE (Paywall)
  insert into public.licenses (user_id, status)
  values (new.id, 'inactive');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
