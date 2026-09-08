import { NextResponse, type NextRequest } from "next/server";
import { PLANS, type PlanId } from "@/lib/plans";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

/**
 * Activación manual de planes (pagos por Yape/Plin).
 *
 * curl -X POST https://TU-DOMINIO/api/admin/activate \
 *   -H "x-admin-secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
 *   -d '{"slug":"mi-negocio","plan":"pro","months":1}'
 */
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !hasAdminClient()) {
    return NextResponse.json({ error: "Configura ADMIN_SECRET y SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }
  if (request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    business_id?: string;
    plan?: string;
    months?: number;
    note?: string;
  };
  const plan = (body.plan ?? "pro") as PlanId;
  if (!(plan in PLANS)) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  const months = Math.min(Math.max(Number(body.months ?? 1), 0), 24);

  const admin = createAdminClient();
  const query = admin.from("businesses").select("id, slug, plan, plan_expires_at");
  const { data: biz, error } = body.business_id
    ? await query.eq("id", body.business_id).maybeSingle()
    : await query.eq("slug", String(body.slug ?? "").toLowerCase()).maybeSingle();
  if (error || !biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  let expires: string | null = null;
  if (plan !== "free") {
    const now = Date.now();
    const currentExp = biz.plan === plan && biz.plan_expires_at ? new Date(biz.plan_expires_at).getTime() : 0;
    const base = Math.max(now, currentExp);
    expires = new Date(base + months * 30 * 86400000).toISOString();
  }

  const { error: upErr } = await admin
    .from("businesses")
    .update({ plan, plan_expires_at: expires })
    .eq("id", biz.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await admin.from("payment_events").insert({
    business_id: biz.id,
    provider: "manual",
    event_type: `activate:${plan}`,
    external_id: null,
    payload: { months, note: body.note ?? null },
  });

  return NextResponse.json({ ok: true, business_id: biz.id, slug: biz.slug, plan, plan_expires_at: expires });
}
