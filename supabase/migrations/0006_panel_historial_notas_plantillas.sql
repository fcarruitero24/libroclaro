-- LibroClaro · 0006
-- Fase 1 del panel: categoría interna, historial del reclamo (con las notas
-- internas) y plantillas de respuesta. Todo es aditivo: no cambia ni borra
-- nada de lo que ya existe.

-- ---------------------------------------------------------------
-- 1) Categoría interna
-- ---------------------------------------------------------------
-- La pone el negocio, nunca el consumidor: la hoja de reclamación tiene un
-- formato fijado por el reglamento (Anexo I del D.S. 011-2011-PCM) y no se le
-- agregan campos. Sirve para agrupar causas en el análisis del panel.
-- La lista vive aquí y en src/lib/categorias.ts; si cambia, cambian las dos.
alter table public.complaints
  add column if not exists category text
  check (category is null or category in ('entrega', 'producto', 'cobro', 'atencion', 'garantia', 'otro'));

create index if not exists complaints_business_category_idx on public.complaints (business_id, category);

-- ---------------------------------------------------------------
-- 2) Historial del reclamo
-- ---------------------------------------------------------------
-- Bitácora de solo agregar: nadie puede editar ni borrar una fila (no hay
-- políticas de update ni delete). Los cambios del reclamo los anotan los
-- triggers de abajo, no la aplicación, así que no dependen de que el código
-- se acuerde de registrarlos. La aplicación solo puede agregar notas
-- internas y el aviso de que la respuesta salió por correo.
create table if not exists public.complaint_events (
  id           bigint generated always as identity primary key,
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  type         text not null check (type in (
                 'registrado',         -- el consumidor registró la hoja
                 'estado',             -- data: {de, a}
                 'categoria',          -- data: {de, a}
                 'respuesta',          -- primera respuesta; data: {texto}
                 'respuesta_editada',  -- data: {texto, anterior}
                 'respuesta_enviada',  -- data: {correo}
                 'nota'                -- nota interna; data: {texto}
               )),
  data         jsonb not null default '{}'::jsonb,
  -- Quién lo hizo: el dueño del negocio. Null = el consumidor o el sistema.
  actor_id     uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists complaint_events_complaint_idx on public.complaint_events (complaint_id, created_at);

alter table public.complaint_events enable row level security;

create policy "owner can select events" on public.complaint_events for select using (
  exists (select 1 from public.businesses b where b.id = complaint_events.business_id and b.owner_id = auth.uid())
);

create policy "owner can add notes" on public.complaint_events for insert with check (
  type in ('nota', 'respuesta_enviada')
  and actor_id = auth.uid()
  and exists (select 1 from public.businesses b where b.id = complaint_events.business_id and b.owner_id = auth.uid())
  and exists (
    select 1 from public.complaints c
     where c.id = complaint_events.complaint_id and c.business_id = complaint_events.business_id
  )
);

-- Registro de la hoja nueva. Usa created_at del reclamo, no now(), para que
-- el historial cuadre con la fecha de la hoja.
create or replace function public.complaints_log_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.complaint_events (complaint_id, business_id, type, created_at)
  values (new.id, new.business_id, 'registrado', new.created_at);
  return new;
end $$;

drop trigger if exists complaints_log_insert on public.complaints;
create trigger complaints_log_insert after insert on public.complaints
  for each row execute function public.complaints_log_insert();

-- Cambios de estado, categoría y respuesta. La respuesta anterior se guarda
-- entera: corregirla deja las dos versiones, nunca la sobrescribe en silencio.
create or replace function public.complaints_log_update()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if new.status is distinct from old.status then
    insert into public.complaint_events (complaint_id, business_id, type, data, actor_id)
    values (new.id, new.business_id, 'estado', jsonb_build_object('de', old.status, 'a', new.status), actor);
  end if;

  if new.category is distinct from old.category then
    insert into public.complaint_events (complaint_id, business_id, type, data, actor_id)
    values (new.id, new.business_id, 'categoria', jsonb_build_object('de', old.category, 'a', new.category), actor);
  end if;

  if new.response is distinct from old.response and new.response is not null then
    if old.response is null then
      insert into public.complaint_events (complaint_id, business_id, type, data, actor_id)
      values (new.id, new.business_id, 'respuesta', jsonb_build_object('texto', new.response), actor);
    else
      insert into public.complaint_events (complaint_id, business_id, type, data, actor_id)
      values (new.id, new.business_id, 'respuesta_editada',
              jsonb_build_object('texto', new.response, 'anterior', old.response), actor);
    end if;
  end if;

  return new;
end $$;

drop trigger if exists complaints_log_update on public.complaints;
create trigger complaints_log_update after update of status, category, response on public.complaints
  for each row execute function public.complaints_log_update();

-- Los reclamos que ya existían arrancan su historial con lo que se sabe:
-- cuándo se registraron y, si ya tenían respuesta, cuándo se respondieron.
insert into public.complaint_events (complaint_id, business_id, type, created_at)
select c.id, c.business_id, 'registrado', c.created_at
  from public.complaints c
 where not exists (select 1 from public.complaint_events e where e.complaint_id = c.id and e.type = 'registrado');

insert into public.complaint_events (complaint_id, business_id, type, data, created_at)
select c.id, c.business_id, 'respuesta', jsonb_build_object('texto', c.response), coalesce(c.responded_at, c.created_at)
  from public.complaints c
 where c.response is not null
   and not exists (select 1 from public.complaint_events e where e.complaint_id = c.id and e.type = 'respuesta');

-- ---------------------------------------------------------------
-- 3) Plantillas de respuesta
-- ---------------------------------------------------------------
-- Son del dueño, no de un negocio: quien tiene varias sedes escribe la
-- plantilla una vez y la usa en todas.
create table if not exists public.response_templates (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 80),
  body       text not null check (char_length(body) between 10 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists response_templates_owner_idx on public.response_templates (owner_id, title);

alter table public.response_templates enable row level security;
create policy "owner can select templates" on public.response_templates for select using (owner_id = auth.uid());
create policy "owner can insert templates" on public.response_templates for insert with check (owner_id = auth.uid());
create policy "owner can update templates" on public.response_templates for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner can delete templates" on public.response_templates for delete using (owner_id = auth.uid());

create trigger response_templates_set_updated_at before update on public.response_templates
  for each row execute function public.set_updated_at();

-- Las funciones de trigger no se invocan por la API (fallarían igual fuera de
-- un trigger), pero sin este revoke el linter de Supabase las lista como
-- expuestas. Aplicado aparte como 0006b_revocar_triggers_de_historial.
revoke execute on function public.complaints_log_insert() from public, anon, authenticated;
revoke execute on function public.complaints_log_update() from public, anon, authenticated;
