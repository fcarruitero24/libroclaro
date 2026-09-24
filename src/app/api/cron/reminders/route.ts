import { NextResponse, type NextRequest } from "next/server";
import { businessDaysLeft } from "@/lib/business-days";
import { sendEmail, tplPlanReminder, tplReminder } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { GRACE_MS, MARGEN_COBRO_MS, planFor, PLANS, type PlanId } from "@/lib/plans";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

interface Row {
  id: string;
  code: string;
  due_at: string;
  business_id: string;
  businesses: {
    name: string;
    email: string;
    plan: string;
    plan_expires_at: string | null;
    archived_at: string | null;
  } | null;
}

/**
 * Cron diario (Vercel, 8 a. m. de Lima): recuerda a los negocios Pro los
 * reclamos por vencer o vencidos, y a todos los negocios con plan pagado que
 * su plan está por vencer.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!hasAdminClient()) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });

  const admin = createAdminClient();
  const horizon = new Date(Date.now() + 8 * 86400000).toISOString();
  const { data, error } = await admin
    .from("complaints")
    .select("id, code, due_at, business_id, businesses(name, email, plan, plan_expires_at, archived_at)")
    .in("status", ["pendiente", "en_proceso"])
    .lte("due_at", horizon);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = await getAppUrl();
  type ReminderItem = { code: string; daysLeft: number; url: string };
  type Entry = { name: string; email: string; items: ReminderItem[] };
  const byBusiness = new Map<string, Entry>();

  for (const raw of (data ?? []) as unknown as Row[]) {
    const biz = Array.isArray(raw.businesses) ? raw.businesses[0] : raw.businesses;
    // Los libros archivados no reciben recordatorios.
    if (!biz || biz.archived_at || !planFor(biz).businessAlerts) continue;
    const daysLeft = businessDaysLeft(raw.due_at);
    if (daysLeft > 3 || daysLeft < -10) continue;
    const entry: Entry = byBusiness.get(raw.business_id) ?? { name: biz.name, email: biz.email, items: [] };
    entry.items.push({ code: raw.code, daysLeft, url: `${appUrl}/app/${raw.business_id}/reclamo/${raw.id}` });
    byBusiness.set(raw.business_id, entry);
  }

  let sent = 0;
  for (const [businessId, entry] of byBusiness) {
    entry.items.sort((a, b) => a.daysLeft - b.daysLeft);
    const tpl = tplReminder({ businessName: entry.name, items: entry.items, dashboardUrl: `${appUrl}/app/${businessId}` });
    const r = await sendEmail({ to: entry.email, ...tpl });
    if (r.ok) sent++;
  }

  const planes = await recordatoriosDePlan(admin, appUrl);

  return NextResponse.json({ ok: true, businesses: byBusiness.size, sent, planes });
}

/** Días de calendario, en hora de Lima, de hoy a `fecha`. Negativo si ya pasó. */
function diasHasta(fecha: string): number {
  const dia = (d: Date) => {
    const [y, m, dd] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d).split("-").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  return Math.round((dia(new Date(fecha)) - dia(new Date())) / 86400000);
}

/**
 * Qué aviso toca. Son rangos y no días exactos: si el cron falla un día, el
 * aviso sale al siguiente, y la tabla plan_reminders impide que se repita.
 */
function etapa(dias: number): "7d" | "1d" | "0d" | null {
  if (dias >= 2 && dias <= 7) return "7d";
  if (dias === 1) return "1d";
  // Los 3 días de gracia: después el plan ya es Gratis y no hay nada que avisar.
  if (dias <= 0 && dias >= -2) return "0d";
  return null;
}

async function recordatoriosDePlan(admin: ReturnType<typeof createAdminClient>, appUrl: string) {
  const { data, error } = await admin
    .from("businesses")
    .select("id, name, email, plan, plan_expires_at, mp_subscription_status")
    .neq("plan", "free")
    .is("archived_at", null)
    .gte("plan_expires_at", new Date(Date.now() - 4 * 86400000).toISOString())
    .lte("plan_expires_at", new Date(Date.now() + 8 * 86400000).toISOString());
  if (error) {
    console.error("[cron:planes]", error.message);
    return { error: error.message };
  }

  let enviados = 0;
  let repetidos = 0;
  for (const b of data ?? []) {
    if (!b.plan_expires_at) continue;
    const st = etapa(diasHasta(b.plan_expires_at));
    if (!st) continue;

    // Se reserva el aviso antes de mandarlo: si la fila ya existía, ya salió.
    const clave = { business_id: b.id, expires_at: b.plan_expires_at, stage: st };
    const { error: yaSalio } = await admin.from("plan_reminders").insert(clave);
    if (yaSalio) {
      repetidos++;
      continue;
    }

    const vence = new Date(b.plan_expires_at).getTime();
    const tpl = tplPlanReminder({
      businessName: b.name,
      planName: PLANS[b.plan as PlanId]?.name ?? b.plan,
      stage: st,
      seRenuevaSolo: b.mp_subscription_status === "authorized",
      venceEl: b.plan_expires_at,
      cobroEl: new Date(vence - MARGEN_COBRO_MS).toISOString(),
      graciaHasta: new Date(vence + GRACE_MS).toISOString(),
      planUrl: `${appUrl}/app/${b.id}/plan`,
    });
    const r = await sendEmail({ to: b.email, ...tpl });
    if (r.ok) enviados++;
    // Si no salió, se libera para que el próximo intento lo vuelva a probar.
    else await admin.from("plan_reminders").delete().match(clave);
  }
  return { enviados, repetidos };
}
