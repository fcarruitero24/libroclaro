import { NextResponse, type NextRequest } from "next/server";
import { businessDaysLeft } from "@/lib/business-days";
import { sendEmail, tplReminder } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { planFor } from "@/lib/plans";
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

/** Cron diario (Vercel): recuerda a los negocios Pro los reclamos por vencer o vencidos. */
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

  return NextResponse.json({ ok: true, businesses: byBusiness.size, sent });
}
