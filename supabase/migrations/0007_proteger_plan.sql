-- Nadie puede darse un plan pagado desde su propia sesión.
--
-- La política "owner can update business" deja al dueño editar su fila entera,
-- y el rol authenticated tiene UPDATE e INSERT sobre todas las columnas. Con la
-- clave pública de Supabase (que va en el navegador) y su propia sesión, un
-- cliente podía hacer update({ plan: 'business', plan_expires_at: null }) y
-- quedarse con Empresa gratis para siempre. Verificado el 2026-09-25 con una
-- transacción revertida.
--
-- Estas columnas solo las escribe el servidor con la service role: el webhook
-- de Mercado Pago, la activación manual y el cron. Un trigger es más robusto
-- que revocar permisos por columna, porque en Postgres el permiso de tabla
-- anula al de columna y cada columna nueva quedaría abierta.

create or replace function public.proteger_columnas_del_plan()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rol text := coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '');
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
       or new.mp_subscription_status is not null then
      raise exception 'PLAN_PROTEGIDO';
    end if;
  elsif new.plan is distinct from old.plan
     or new.plan_expires_at is distinct from old.plan_expires_at
     or new.mp_preapproval_id is distinct from old.mp_preapproval_id
     or new.mp_subscription_status is distinct from old.mp_subscription_status then
    raise exception 'PLAN_PROTEGIDO';
  end if;

  return new;
end $$;

drop trigger if exists businesses_proteger_plan on public.businesses;
create trigger businesses_proteger_plan
  before insert or update on public.businesses
  for each row execute function public.proteger_columnas_del_plan();
