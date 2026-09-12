-- LibroClaro · 0003  (aplicada el 2026-09-12)
-- 1) Un RUC no puede ser reclamado por dos dueños distintos.
-- 2) Canal para que la empresa real reporte un libro que la suplanta.
--
-- Contexto: verificar que un RUC PERTENECE a quien lo registra es imposible
-- sin la Clave SOL del contribuyente, y ningún competidor peruano lo hace
-- (Respondo aplica primero-que-llega, Librovirtual llama por teléfono,
-- Reclamo Virtual usa el pago como señal, Reclama Virtual da de alta a mano).
-- Estos son los dos controles prácticos que sí se pueden aplicar.

-- ---------------------------------------------------------------
-- 1) Un RUC, un dueño
-- ---------------------------------------------------------------
create or replace function public.check_ruc_owner()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.businesses b
     where b.ruc = new.ruc
       and b.owner_id <> new.owner_id
       and b.archived_at is null
       and b.id <> new.id
  ) then
    raise exception 'RUC_DE_OTRO_DUENO';
  end if;
  return new;
end $$;

drop trigger if exists businesses_check_ruc on public.businesses;
create trigger businesses_check_ruc
  before insert or update of ruc, owner_id, archived_at on public.businesses
  for each row execute function public.check_ruc_owner();

-- Consulta previa, para avisar en el formulario antes de crear la cuenta.
create or replace function public.ruc_disponible(p_ruc text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.businesses
     where ruc = p_ruc
       and archived_at is null
       and owner_id is distinct from auth.uid()
  );
$$;

revoke all on function public.ruc_disponible(text) from public;
grant execute on function public.ruc_disponible(text) to anon, authenticated;

-- ---------------------------------------------------------------
-- 2) Reportes de suplantación
-- ---------------------------------------------------------------
create table if not exists public.ownership_reports (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  reporter_name  text not null check (char_length(reporter_name) between 2 and 160),
  reporter_email text not null,
  reporter_phone text,
  reason         text not null check (char_length(reason) between 10 and 3000),
  status         text not null default 'pendiente'
                 check (status in ('pendiente','revisado','procede','no_procede')),
  ip             text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

create index if not exists ownership_reports_pendientes_idx
  on public.ownership_reports (created_at desc) where status = 'pendiente';

alter table public.ownership_reports enable row level security;
-- Sin políticas: solo se leen con service role o desde el panel de Supabase.

create or replace function public.report_ownership(
  p_slug text, p_name text, p_email text, p_phone text, p_reason text,
  p_ip text, p_user_agent text
)
returns table (business_name text)
language plpgsql security definer
set search_path = public
as $$
declare
  b public.businesses%rowtype;
begin
  select * into b from public.businesses where slug = p_slug;
  if not found then
    raise exception 'NEGOCIO_NO_ENCONTRADO';
  end if;

  -- Un mismo correo no puede inundar de reportes al mismo negocio.
  if exists (
    select 1 from public.ownership_reports r
     where r.business_id = b.id
       and lower(r.reporter_email) = lower(p_email)
       and r.created_at > now() - interval '24 hours'
  ) then
    raise exception 'REPORTE_DUPLICADO';
  end if;

  insert into public.ownership_reports (
    business_id, reporter_name, reporter_email, reporter_phone, reason, ip, user_agent
  ) values (
    b.id, p_name, lower(p_email), nullif(p_phone, ''), p_reason, p_ip, p_user_agent
  );

  return query select b.name;
end $$;

revoke all on function public.report_ownership(text,text,text,text,text,text,text) from public;
grant execute on function public.report_ownership(text,text,text,text,text,text,text) to anon, authenticated;
