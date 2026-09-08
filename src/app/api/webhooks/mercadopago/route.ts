import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { PLANS, type PlanId } from "@/lib/plans";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

interface Preapproval {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  external_reference?: string;
  next_payment_date?: string;
  payer_email?: string;
}

function verifySignature(request: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto configurado no se valida (configúralo en producción)
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    signature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}

async function fetchPreapproval(id: string, token: string): Promise<Preapproval | null> {
  const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as Preapproval;
}

async function fetchAuthorizedPayment(id: string, token: string): Promise<{ preapproval_id?: string } | null> {
  const res = await fetch(`https://api.mercadopago.com/authorized_payments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { preapproval_id?: string };
}

export async function POST(request: NextRequest) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || !hasAdminClient()) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string } };
  const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? "";
  const type = url.searchParams.get("type") ?? body.type ?? "";

  if (!dataId) return NextResponse.json({ ok: true, ignored: "sin data.id" });
  if (!verifySignature(request, dataId.toLowerCase())) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let preapprovalId: string | null = null;
  if (type === "subscription_preapproval") preapprovalId = dataId;
  else if (type === "subscription_authorized_payment") {
    const ap = await fetchAuthorizedPayment(dataId, token);
    preapprovalId = ap?.preapproval_id ?? null;
  } else {
    return NextResponse.json({ ok: true, ignored: type });
  }
  if (!preapprovalId) return NextResponse.json({ ok: true, ignored: "sin preapproval" });

  const pre = await fetchPreapproval(preapprovalId, token);
  if (!pre) return NextResponse.json({ error: "No se pudo leer la suscripción" }, { status: 502 });

  const [businessId, planRaw] = String(pre.external_reference ?? "").split("|");
  const plan = (planRaw in PLANS && planRaw !== "free" ? planRaw : "pro") as PlanId;

  const admin = createAdminClient();
  await admin.from("payment_events").insert({
    business_id: businessId || null,
    provider: "mercadopago",
    event_type: `${type}:${pre.status}`,
    external_id: pre.id,
    payload: { body, preapproval: pre },
  });

  if (!businessId) return NextResponse.json({ ok: true, ignored: "sin external_reference" });

  if (pre.status === "authorized") {
    const base = pre.next_payment_date ? new Date(pre.next_payment_date) : new Date(Date.now() + 30 * 86400000);
    const expires = new Date(base.getTime() + 3 * 86400000); // margen para el cobro recurrente
    await admin
      .from("businesses")
      .update({ plan, plan_expires_at: expires.toISOString(), mp_preapproval_id: pre.id })
      .eq("id", businessId);
  }
  // cancelled / paused: el plan sigue vigente hasta plan_expires_at y luego baja a Gratis solo.

  return NextResponse.json({ ok: true });
}
