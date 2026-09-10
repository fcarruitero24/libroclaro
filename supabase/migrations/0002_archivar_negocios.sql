-- LibroClaro · 0002
-- Archivar negocios en vez de borrarlos.
--
-- Motivo: el reglamento del Libro de Reclamaciones obliga al proveedor a
-- conservar sus hojas de reclamación por al menos dos años. La versión
-- anterior permitía eliminar un negocio y borraba en cascada todas sus
-- hojas, lo que hacía que la propia app llevara al cliente a incumplir.
--
-- A partir de aquí, "eliminar" marca archived_at: el libro deja de recibir
-- reclamos nuevos, desaparece del panel activo, y todas las hojas ya
-- emitidas siguen guardadas y consultables por su enlace público.

alter table public.businesses
  add column if not exists archived_at timestamptz;

comment on column public.businesses.archived_at is
  'Fecha de archivado. Si no es null, el libro no acepta reclamos nuevos pero conserva sus hojas.';

create index if not exists businesses_owner_active_idx
  on public.businesses (owner_id)
  where archived_at is null;

-- ---------------------------------------------------------------
-- get_business_public: expone archived_at para que el formulario
-- público pueda cerrarse sin perder las hojas ya emitidas.
-- (Se agrega una columna al retorno, así que hay que recrear.)
-- ---------------------------------------------------------------
drop function if exists public.get_business_public(text);

create function public.get_business_public(p_slug text)
returns table (
  id uuid, slug text, name text, ruc text, address text,
  logo_url text, primary_color text, plan text, plan_expires_at timestamptz,
  website text, archived_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select id, slug, name, ruc, address, logo_url, primary_color, plan, plan_expires_at,
         website, archived_at
    from public.businesses
   where slug = p_slug;
$$;

revoke all on function public.get_business_public(text) from public;
grant execute on function public.get_business_public(text) to anon, authenticated;

-- ---------------------------------------------------------------
-- submit_complaint: rechaza negocios archivados.
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

revoke all on function public.submit_complaint(text,text,text,text,text,text,text,boolean,text,text,numeric,text,text,text,text,text,text) from public;
grant execute on function public.submit_complaint(text,text,text,text,text,text,text,boolean,text,text,numeric,text,text,text,text,text,text) to anon, authenticated;
