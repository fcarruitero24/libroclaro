-- LibIA: borradores de respuesta con IA (Workers AI, Mistral Small 3.1).
--
-- En el detalle de un reclamo, el dueño le pide a LibIA un borrador de
-- respuesta. Workers AI regala 10.000 neuronas al día por cuenta de
-- Cloudflare y cobra lo que pase de ahí, así que los topes viven aquí, donde
-- un solo candado los cuenta bien aunque dos dueños pulsen a la vez:
--   - 20 borradores por negocio al día, para que uno solo no gaste el cupo
--     de todos;
--   - 9.000 neuronas al día en total. Cada borrador reserva lo máximo que
--     podría gastar y, al terminar, se ajusta a lo que gastó de verdad; los
--     1.000 de margen cubren pruebas hechas fuera de la app.
-- El día es el de UTC porque el cupo gratis de Cloudflare se reinicia a las
-- 00:00 UTC (7 p. m. de Lima).
--
-- Las funciones solo las ejecuta la service role. El servidor las llama
-- después de leer el reclamo o el negocio con la sesión del dueño, que es lo
-- que prueba que es suyo. Si el navegador pudiera llamarlas, un dueño podría
-- mandar una reserva negativa (bajaría el contador global) o devolver cupos
-- que sí gastó.

-- Lo usado por día y por negocio. Solo filas de los días en que se usa LibIA.
create table if not exists public.libia_uso (
  dia         date not null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  borradores  integer not null default 0 check (borradores >= 0),
  neuronas    numeric(10,3) not null default 0 check (neuronas >= 0),
  primary key (dia, business_id)
);

alter table public.libia_uso enable row level security;

-- Reserva un borrador antes de llamar al modelo. Responde si se puede, por
-- qué no, y cuántos le quedan hoy al negocio.
create or replace function public.reservar_borrador_libia(p_business_id uuid, p_usuario uuid, p_reserva numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Si cambias estos números, cambia también el 20 de libia_quedan().
  c_por_negocio constant integer := 20;
  c_global      constant numeric := 9000;
  v_dia        date := (now() at time zone 'utc')::date;
  v_plan       text;
  v_vence      timestamptz;
  v_borradores integer;
  v_neuronas   numeric;
begin
  select b.plan, b.plan_expires_at into v_plan, v_vence
    from public.businesses b
   where b.id = p_business_id and b.owner_id = p_usuario;
  if not found then
    raise exception 'NO_AUTORIZADO';
  end if;

  if p_reserva is null or p_reserva <= 0 or p_reserva > 1000 then
    raise exception 'RESERVA_INVALIDA';
  end if;

  if not public.plan_vigente(v_plan, v_vence) then
    return jsonb_build_object('ok', false, 'motivo', 'sin_plan', 'quedan', 0, 'limite', c_por_negocio);
  end if;

  -- Una reserva a la vez: la suma del día no cambia entre leerla y anotar.
  perform pg_advisory_xact_lock(hashtext('libia_uso'));

  v_borradores := coalesce((
    select u.borradores from public.libia_uso u
     where u.dia = v_dia and u.business_id = p_business_id
  ), 0);
  if v_borradores >= c_por_negocio then
    return jsonb_build_object('ok', false, 'motivo', 'tope_negocio', 'quedan', 0, 'limite', c_por_negocio);
  end if;

  v_neuronas := coalesce((select sum(u.neuronas) from public.libia_uso u where u.dia = v_dia), 0);
  if v_neuronas + p_reserva > c_global then
    return jsonb_build_object(
      'ok', false, 'motivo', 'tope_global', 'quedan', c_por_negocio - v_borradores, 'limite', c_por_negocio
    );
  end if;

  insert into public.libia_uso as u (dia, business_id, borradores, neuronas)
  values (v_dia, p_business_id, 1, p_reserva)
  on conflict (dia, business_id) do update
    set borradores = u.borradores + 1,
        neuronas = u.neuronas + excluded.neuronas;

  return jsonb_build_object(
    'ok', true, 'dia', v_dia, 'quedan', c_por_negocio - v_borradores - 1, 'limite', c_por_negocio
  );
end;
$$;

-- Cierra una reserva. Con lo gastado de verdad (p_real), cambia la reserva
-- por ese número; sin él (el modelo falló), devuelve el borrador y la
-- reserva. Recibe el día de la reserva para no descontar del día siguiente si
-- la falla cae justo a medianoche UTC. Nunca deja un contador bajo cero.
create or replace function public.cerrar_borrador_libia(p_business_id uuid, p_dia date, p_reserva numeric, p_real numeric)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.libia_uso u
     set borradores = case when p_real is null then greatest(u.borradores - 1, 0) else u.borradores end,
         neuronas = greatest(u.neuronas - coalesce(p_reserva, 0) + coalesce(p_real, 0), 0)
   where u.dia = p_dia and u.business_id = p_business_id;
$$;

-- Borradores que le quedan hoy al negocio, para "Te quedan N hoy".
create or replace function public.libia_quedan(p_business_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  -- 20 por negocio: el mismo número que en reservar_borrador_libia().
  select greatest(20 - coalesce((
    select u.borradores from public.libia_uso u
     where u.dia = (now() at time zone 'utc')::date and u.business_id = p_business_id
  ), 0), 0);
$$;

revoke all on function public.reservar_borrador_libia(uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function public.cerrar_borrador_libia(uuid, date, numeric, numeric) from public, anon, authenticated;
revoke all on function public.libia_quedan(uuid) from public, anon, authenticated;
grant execute on function public.reservar_borrador_libia(uuid, uuid, numeric) to service_role;
grant execute on function public.cerrar_borrador_libia(uuid, date, numeric, numeric) to service_role;
grant execute on function public.libia_quedan(uuid) to service_role;

-- La respuesta enviada dice al pie que se redactó con ayuda de IA. La marca
-- el dueño con la casilla del formulario; el correo y la hoja la leen.
alter table public.complaints
  add column if not exists respuesta_con_ia boolean not null default false;

comment on column public.complaints.respuesta_con_ia is
  'La respuesta lleva el aviso "Esta respuesta se redactó con ayuda de inteligencia artificial…" (LibIA).';

-- Historial: un evento por borrador de LibIA. Solo guarda el modelo usado,
-- nunca el borrador ni la nota del dueño.
alter table public.complaint_events drop constraint if exists complaint_events_type_check;
alter table public.complaint_events add constraint complaint_events_type_check check (type in (
  'registrado',         -- el consumidor registró la hoja
  'estado',             -- data: {de, a}
  'categoria',          -- data: {de, a}
  'respuesta',          -- primera respuesta; data: {texto}
  'respuesta_editada',  -- data: {texto, anterior}
  'respuesta_enviada',  -- data: {correo}
  'nota',               -- nota interna; data: {texto}
  'libia'               -- LibIA propuso un borrador; data: {modelo}
));

-- La misma política de 0006, con 'libia' entre los tipos que anota el dueño.
drop policy if exists "owner can add notes" on public.complaint_events;
create policy "owner can add notes" on public.complaint_events for insert with check (
  type in ('nota', 'respuesta_enviada', 'libia')
  and actor_id = auth.uid()
  and exists (select 1 from public.businesses b where b.id = complaint_events.business_id and b.owner_id = auth.uid())
  and exists (
    select 1 from public.complaints c
     where c.id = complaint_events.complaint_id and c.business_id = complaint_events.business_id
  )
);

-- La hoja pública necesita saber si la respuesta lleva el aviso. Cambiar las
-- columnas de una función obliga a borrarla y crearla de nuevo: queda igual
-- que en 0001, con respuesta_con_ia al final, y con los mismos permisos. El
-- código anterior a LibIA ignora la columna nueva.
drop function if exists public.get_complaint_public(text);
create function public.get_complaint_public(p_token text)
returns table (
  code text, created_at timestamptz, due_at timestamptz,
  consumer_name text, consumer_doc_type text, consumer_doc_number text, consumer_address text,
  consumer_phone text, consumer_email text, is_minor boolean, guardian_name text,
  item_type text, amount numeric, item_description text,
  kind text, detail text, request text,
  status text, response text, responded_at timestamptz,
  business_name text, business_ruc text, business_address text, business_logo_url text,
  business_color text, business_plan text, business_plan_expires_at timestamptz, business_slug text,
  respuesta_con_ia boolean
)
language sql stable security definer
set search_path = public
as $$
  select c.code, c.created_at, c.due_at,
         c.consumer_name, c.consumer_doc_type, c.consumer_doc_number, c.consumer_address,
         c.consumer_phone, c.consumer_email, c.is_minor, c.guardian_name,
         c.item_type, c.amount, c.item_description,
         c.kind, c.detail, c.request,
         c.status, c.response, c.responded_at,
         b.name, b.ruc, b.address, b.logo_url, b.primary_color, b.plan, b.plan_expires_at, b.slug,
         c.respuesta_con_ia
    from public.complaints c
    join public.businesses b on b.id = c.business_id
   where c.public_token = p_token;
$$;
revoke all on function public.get_complaint_public(text) from public;
grant execute on function public.get_complaint_public(text) to anon, authenticated;
