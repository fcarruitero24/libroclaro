-- El plan Gratis permanente se reemplaza por una prueba de 30 días.
--
-- El Gratis le daba a un negocio de un solo local todo lo que la norma le
-- exige, así que justo los clientes más comunes nunca tenían motivo para
-- pagar. Ahora todo negocio nuevo empieza con 30 días de Pro. Si la prueba
-- o el plan pagado vencen (más los 3 días de gracia), el libro queda
-- inactivo: no recibe reclamos nuevos, pero sus hojas se conservan y el
-- dueño puede verlas, responder las pendientes y descargarlas, porque el
-- reglamento le obliga a guardarlas dos años.
--
-- El valor 'free' de businesses.plan se mantiene: ahora significa "sin plan".

alter table public.businesses
  add column if not exists en_prueba boolean not null default false;

comment on column public.businesses.en_prueba is
  'El plan vigente es la prueba gratis de 30 días (plan pro con plan_expires_at = fin de la prueba).';

-- Misma regla que effectivePlan() en src/lib/plans.ts: un plan pagado o de
-- prueba sigue vigente hasta 3 días después de plan_expires_at (GRACE_MS).
create or replace function public.plan_vigente(p_plan text, p_expires timestamptz)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_plan in ('pro', 'business')
     and (p_expires is null or p_expires + interval '3 days' > now());
$$;

revoke all on function public.plan_vigente(text, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Plan inicial al crear un negocio.
--
-- El plan es de la cuenta: Pro incluye 3 negocios y Empresa 25, así que un
-- negocio nuevo hereda el mejor plan vigente de su dueño. Si el dueño no
-- tiene ninguno, la prueba solo se da una vez por cuenta y por RUC: quien ya
-- tuvo un libro (aunque esté archivado) o registra un RUC que ya se usó no
-- recibe otros 30 días.
--
-- Pasa a security definer para poder buscar el RUC entre los negocios de
-- otros dueños, que la RLS le ocultaría. El rol del cliente se sigue leyendo
-- de request.jwt.claims, que no cambia con security definer.
-- ---------------------------------------------------------------
create or replace function public.proteger_columnas_del_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rol text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
  heredado public.businesses%rowtype;
begin
  -- Solo se frena a las sesiones de clientes. La service role y el SQL directo
  -- (migraciones, soporte) pasan.
  if rol not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.plan is distinct from 'free'
       or new.plan_expires_at is not null
       or new.mp_preapproval_id is not null
       or new.mp_subscription_status is not null
       or new.en_prueba then
      raise exception 'PLAN_PROTEGIDO';
    end if;

    select * into heredado
      from public.businesses b
     where b.owner_id = new.owner_id
       and public.plan_vigente(b.plan, b.plan_expires_at)
     order by (b.plan = 'business') desc, b.plan_expires_at desc nulls first
     limit 1;

    if found then
      new.plan := heredado.plan;
      new.plan_expires_at := heredado.plan_expires_at;
      new.en_prueba := heredado.en_prueba;
    elsif not exists (
      select 1 from public.businesses b where b.owner_id = new.owner_id or b.ruc = new.ruc
    ) then
      new.plan := 'pro';
      new.plan_expires_at := now() + interval '30 days';
      new.en_prueba := true;
    end if;
  elsif new.plan is distinct from old.plan
     or new.plan_expires_at is distinct from old.plan_expires_at
     or new.mp_preapproval_id is distinct from old.mp_preapproval_id
     or new.mp_subscription_status is distinct from old.mp_subscription_status
     or new.en_prueba is distinct from old.en_prueba then
    raise exception 'PLAN_PROTEGIDO';
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------
-- Cuando el plan de un negocio cambia (pago, renovación, activación manual),
-- los demás negocios del mismo dueño lo reciben también. Así cada fila tiene
-- el plan de la cuenta y todo lo que lee businesses.plan (formulario público,
-- panel, cron) sigue funcionando sin consultar a los hermanos.
--
-- No se pisan negocios con su propia suscripción activa. Solo lo dispara la
-- service role o SQL directo: el trigger de arriba no deja a un cliente
-- cambiar estas columnas.
-- ---------------------------------------------------------------
create or replace function public.propagar_plan_de_la_cuenta()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Las filas que actualiza este mismo trigger no vuelven a propagar.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  update public.businesses
     set plan = new.plan,
         plan_expires_at = new.plan_expires_at,
         en_prueba = new.en_prueba
   where owner_id = new.owner_id
     and id <> new.id
     and coalesce(mp_subscription_status, '') <> 'authorized';

  return null;
end $$;

drop trigger if exists businesses_propagar_plan on public.businesses;
create trigger businesses_propagar_plan
  after update of plan, plan_expires_at, en_prueba on public.businesses
  for each row
  when (old.plan is distinct from new.plan
        or old.plan_expires_at is distinct from new.plan_expires_at
        or old.en_prueba is distinct from new.en_prueba)
  execute function public.propagar_plan_de_la_cuenta();

-- ---------------------------------------------------------------
-- submit_complaint: un libro sin plan vigente no recibe reclamos nuevos. Se
-- valida aquí y no solo en la página, porque la función se puede llamar
-- directo con la clave pública.
-- ---------------------------------------------------------------
create or replace function public.submit_complaint(
  p_slug text, p_consumer_name text, p_consumer_doc_type text, p_consumer_doc_number text,
  p_consumer_address text, p_consumer_phone text, p_consumer_email text,
  p_is_minor boolean, p_guardian_name text,
  p_item_type text, p_amount numeric, p_item_description text,
  p_kind text, p_detail text, p_request text, p_consumer_ip text, p_user_agent text
)
returns table (
  code text, public_token text, due_at timestamptz,
  business_email text, business_name text, business_plan text, business_plan_expires_at timestamptz
)
language plpgsql security definer
set search_path = public
as $$
declare
  b public.businesses%rowtype;
  c public.complaints%rowtype;
begin
  select * into b from public.businesses where slug = p_slug;
  if not found then
    raise exception 'NEGOCIO_NO_ENCONTRADO';
  end if;
  if b.archived_at is not null then
    raise exception 'NEGOCIO_ARCHIVADO';
  end if;
  if not public.plan_vigente(b.plan, b.plan_expires_at) then
    raise exception 'LIBRO_INACTIVO';
  end if;

  insert into public.complaints (
    business_id, consumer_name, consumer_doc_type, consumer_doc_number, consumer_address,
    consumer_phone, consumer_email, is_minor, guardian_name, item_type, amount,
    item_description, kind, detail, request, consumer_ip, user_agent
  ) values (
    b.id, p_consumer_name, upper(p_consumer_doc_type), p_consumer_doc_number, p_consumer_address,
    nullif(p_consumer_phone, ''), lower(p_consumer_email), coalesce(p_is_minor, false), nullif(p_guardian_name, ''),
    p_item_type, p_amount, p_item_description, p_kind, p_detail, p_request, p_consumer_ip, p_user_agent
  ) returning * into c;

  return query select c.code, c.public_token, c.due_at, b.email, b.name, b.plan, b.plan_expires_at;
end $$;

-- Aviso a 3 días del vencimiento, además de los de 7 y 1 día y el del día.
alter table public.plan_reminders drop constraint if exists plan_reminders_stage_check;
alter table public.plan_reminders
  add constraint plan_reminders_stage_check check (stage in ('7d', '3d', '1d', '0d'));
