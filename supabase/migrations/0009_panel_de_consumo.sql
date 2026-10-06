-- Panel de consumo (panel.libroclaro.pe).
--
-- El panel muestra cuánto usa LibroClaro de cada plataforma frente al límite
-- de su plan. Lo que vive en la base lo lee LibroClaro con la service role y
-- se lo entrega al panel solo como números, sin datos personales. El panel no
-- tiene la llave de la base: si alguien lo vulnerara, no podría leer reclamos.
--
-- Solo el servidor usa todo esto: la función se ejecuta únicamente con la
-- service role y las tablas tienen RLS sin políticas, como plan_reminders.

-- Último dato de las fuentes que no tienen consulta propia: la cuota de
-- Resend (llega en las cabeceras de cada envío; Resend no la expone por API)
-- y la última corrida de los recordatorios de la mañana.
create table if not exists public.uso_plataformas (
  clave       text primary key,
  valor       jsonb not null,
  actualizado timestamptz not null default now()
);

-- El tamaño de la base una vez por día (el primer resumen del día lo anota),
-- para calcular a qué ritmo crece y cuándo llegaría al límite del plan.
create table if not exists public.uso_diario (
  fecha      date primary key,
  base_bytes bigint not null
);

-- Alertas que ya salieron por correo. El panel revisa todo cada hora y manda
-- las que tocan; la clave junta métrica, umbral y ciclo (por ejemplo
-- cloudflare.cpu.80.2026-10-29), así que la clave primaria impide repetirlas.
-- Si el correo no sale, la fila se borra y se reintenta en la hora siguiente.
create table if not exists public.alertas_panel (
  clave      text primary key,
  texto      text not null,
  enviada_el timestamptz not null default now()
);

alter table public.uso_plataformas enable row level security;
alter table public.uso_diario enable row level security;
alter table public.alertas_panel enable row level security;

-- Cuánto ocupa y cuánto mueve LibroClaro dentro de Supabase. Es security
-- definer porque lee auth.users y storage.objects, que la service role no ve
-- por PostgREST; el search_path vacío obliga a nombrar cada esquema.
create or replace function public.uso_de_la_plataforma()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'base_bytes', pg_database_size(current_database()),
    'archivos_bytes', (select coalesce(sum((o.metadata ->> 'size')::bigint), 0) from storage.objects o),
    'usuarios', (select count(*) from auth.users),
    'usuarios_activos_30d', (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '30 days'),
    'negocios', (select count(*) from public.businesses),
    'reclamos', (select count(*) from public.complaints),
    'suscripciones_activas', (select count(*) from public.businesses b where b.mp_subscription_status = 'authorized')
  );
$$;

revoke all on function public.uso_de_la_plataforma() from public, anon, authenticated;
grant execute on function public.uso_de_la_plataforma() to service_role;
