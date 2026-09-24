-- Estado de la suscripción de Mercado Pago y registro de los avisos de plan
-- por vencer.

-- El webhook solo guardaba algo cuando la suscripción quedaba autorizada, así
-- que no había forma de saber si seguía activa o si el cliente la canceló.
-- Hace falta para dos cosas: avisarle al dueño de la plataforma cuando cambia,
-- y elegir el recordatorio correcto (una suscripción activa se cobra sola; una
-- cancelada o un pago manual hay que renovarlos a mano).
alter table public.businesses
  add column if not exists mp_subscription_status text;

-- Un aviso por negocio, por vencimiento y por etapa. El cron corre una vez al
-- día, pero Vercel puede reintentarlo: la clave primaria garantiza que el mismo
-- aviso no salga dos veces. Cuando el plan se renueva, plan_expires_at cambia
-- y los avisos del nuevo periodo quedan libres de nuevo.
create table if not exists public.plan_reminders (
  business_id uuid not null references public.businesses(id) on delete cascade,
  expires_at  timestamptz not null,
  stage       text not null check (stage in ('7d', '1d', '0d')),
  sent_at     timestamptz not null default now(),
  primary key (business_id, expires_at, stage)
);

-- Solo la usa el cron con la service role: sin políticas, nadie más la lee.
alter table public.plan_reminders enable row level security;
