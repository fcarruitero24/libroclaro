-- LibroClaro · Libro de Reclamaciones Virtual (Perú) · Esquema inicial
-- (Aplicado en el proyecto Supabase "libroclaro" como migración init_libroclaro)
create extension if not exists pgcrypto;

-- Feriados nacionales (para el cómputo de días hábiles)
create table if not exists public.holidays (
  day  date primary key,
  name text not null
);

insert into public.holidays (day, name) values
 ('2026-01-01','Año Nuevo'),('2026-04-02','Jueves Santo'),('2026-04-03','Viernes Santo'),
 ('2026-05-01','Día del Trabajo'),('2026-06-07','Batalla de Arica y Día de la Bandera'),
 ('2026-06-29','San Pedro y San Pablo'),('2026-07-23','Día de la Fuerza Aérea del Perú'),
 ('2026-07-28','Fiestas Patrias'),('2026-07-29','Fiestas Patrias'),('2026-08-06','Batalla de Junín'),
 ('2026-08-30','Santa Rosa de Lima'),('2026-10-08','Combate de Angamos'),('2026-11-01','Todos los Santos'),
 ('2026-12-08','Inmaculada Concepción'),('2026-12-09','Batalla de Ayacucho'),('2026-12-25','Navidad'),
 ('2027-01-01','Año Nuevo'),('2027-03-25','Jueves Santo'),('2027-03-26','Viernes Santo'),
 ('2027-05-01','Día del Trabajo'),('2027-06-07','Batalla de Arica y Día de la Bandera'),
 ('2027-06-29','San Pedro y San Pablo'),('2027-07-23','Día de la Fuerza Aérea del Perú'),
 ('2027-07-28','Fiestas Patrias'),('2027-07-29','Fiestas Patrias'),('2027-08-06','Batalla de Junín'),
 ('2027-08-30','Santa Rosa de Lima'),('2027-10-08','Combate de Angamos'),('2027-11-01','Todos los Santos'),
 ('2027-12-08','Inmaculada Concepción'),('2027-12-09','Batalla de Ayacucho'),('2027-12-25','Navidad')
on conflict (day) do nothing;

alter table public.holidays enable row level security;
create policy "holidays are public" on public.holidays for select using (true);

-- Suma N días hábiles (L-V sin feriados). Devuelve fin del día hábil resultante (hora de Lima).
create or replace function public.add_business_days(start_ts timestamptz, n integer)
returns timestamptz
language plpgsql stable
set search_path = public
as $$
declare
  d date := (start_ts at time zone 'America/Lima')::date;
  added integer := 0;
begin
  while added < n loop
    d := d + 1;
    if extract(isodow from d) < 6
       and not exists (select 1 from public.holidays h where h.day = d) then
      added := added + 1;
    end if;
  end loop;
  return (d::timestamp + interval '23 hours 59 minutes 59 seconds') at time zone 'America/Lima';
end
$$;

-- Negocios (proveedores)
create table if not exists public.businesses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  slug            text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$'),
  name            text not null check (char_length(name) between 2 and 120),
  ruc             text not null check (ruc ~ '^[0-9]{11}$'),
  address         text not null check (char_length(address) between 5 and 300),
  email           text not null,
  phone           text,
  website         text,
  logo_url        text,
  primary_color   text not null default '#1d4ed8' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  plan            text not null default 'free' check (plan in ('free','pro','business')),
  plan_expires_at timestamptz,
  mp_preapproval_id text,
  complaint_seq   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists businesses_owner_idx on public.businesses (owner_id);
alter table public.businesses enable row level security;
create policy "owner can select business" on public.businesses for select using (auth.uid() = owner_id);
create policy "owner can insert business" on public.businesses for insert with check (auth.uid() = owner_id);
create policy "owner can update business" on public.businesses for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner can delete business" on public.businesses for delete using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- Reclamos y quejas (hojas de reclamación)
create table if not exists public.complaints (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  code                text not null,
  public_token        text not null unique default encode(gen_random_bytes(16), 'hex'),
  consumer_name       text not null check (char_length(consumer_name) between 2 and 160),
  consumer_doc_type   text not null check (consumer_doc_type in ('DNI','CE','PASAPORTE','RUC')),
  consumer_doc_number text not null check (char_length(consumer_doc_number) between 6 and 20),
  consumer_address    text not null,
  consumer_phone      text,
  consumer_email      text not null,
  is_minor            boolean not null default false,
  guardian_name       text,
  item_type           text not null check (item_type in ('producto','servicio')),
  amount              numeric(12,2) check (amount is null or amount >= 0),
  item_description    text not null,
  kind                text not null check (kind in ('reclamo','queja')),
  detail              text not null check (char_length(detail) between 10 and 5000),
  request             text not null check (char_length(request) between 3 and 3000),
  status              text not null default 'pendiente' check (status in ('pendiente','en_proceso','respondido','cerrado')),
  response            text,
  responded_at        timestamptz,
  due_at              timestamptz not null,
  consumer_ip         text,
  user_agent          text,
  created_at          timestamptz not null default now(),
  unique (business_id, code)
);
create index if not exists complaints_business_created_idx on public.complaints (business_id, created_at desc);
create index if not exists complaints_business_status_idx  on public.complaints (business_id, status);
alter table public.complaints enable row level security;
create policy "owner can select complaints" on public.complaints for select using (
  exists (select 1 from public.businesses b where b.id = complaints.business_id and b.owner_id = auth.uid())
);
create policy "owner can update complaints" on public.complaints for update using (
  exists (select 1 from public.businesses b where b.id = complaints.business_id and b.owner_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = complaints.business_id and b.owner_id = auth.uid())
);

-- Numeración correlativa por negocio + plazo legal de 15 días hábiles
create or replace function public.complaints_before_insert()
returns trigger language plpgsql
set search_path = public
as $$
declare
  seq integer;
begin
  update public.businesses set complaint_seq = complaint_seq + 1
   where id = new.business_id returning complaint_seq into seq;
  if seq is null then
    raise exception 'NEGOCIO_NO_ENCONTRADO';
  end if;
  new.code   := to_char(now() at time zone 'America/Lima', 'YYYY') || '-' || lpad(seq::text, 6, '0');
  new.due_at := public.add_business_days(now(), 15);
  return new;
end $$;
create trigger complaints_before_insert before insert on public.complaints
  for each row execute function public.complaints_before_insert();

-- Eventos de pago (auditoría de webhooks; solo service role)
create table if not exists public.payment_events (
  id          bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete set null,
  provider    text not null,
  event_type  text not null,
  external_id text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.payment_events enable row level security;

-- Funciones públicas (security definer) para el formulario del consumidor
create or replace function public.get_business_public(p_slug text)
returns table (
  id uuid, slug text, name text, ruc text, address text,
  logo_url text, primary_color text, plan text, plan_expires_at timestamptz, website text
)
language sql stable security definer
set search_path = public
as $$
  select id, slug, name, ruc, address, logo_url, primary_color, plan, plan_expires_at, website
    from public.businesses where slug = p_slug;
$$;

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

create or replace function public.get_complaint_public(p_token text)
returns table (
  code text, created_at timestamptz, due_at timestamptz,
  consumer_name text, consumer_doc_type text, consumer_doc_number text, consumer_address text,
  consumer_phone text, consumer_email text, is_minor boolean, guardian_name text,
  item_type text, amount numeric, item_description text,
  kind text, detail text, request text,
  status text, response text, responded_at timestamptz,
  business_name text, business_ruc text, business_address text, business_logo_url text,
  business_color text, business_plan text, business_plan_expires_at timestamptz, business_slug text
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
         b.name, b.ruc, b.address, b.logo_url, b.primary_color, b.plan, b.plan_expires_at, b.slug
    from public.complaints c
    join public.businesses b on b.id = c.business_id
   where c.public_token = p_token;
$$;

revoke all on function public.get_business_public(text) from public;
revoke all on function public.submit_complaint(text,text,text,text,text,text,text,boolean,text,text,numeric,text,text,text,text,text,text) from public;
revoke all on function public.get_complaint_public(text) from public;
grant execute on function public.get_business_public(text) to anon, authenticated;
grant execute on function public.submit_complaint(text,text,text,text,text,text,text,boolean,text,text,numeric,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.get_complaint_public(text) to anon, authenticated;
