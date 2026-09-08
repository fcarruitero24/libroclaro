import { NextResponse, type NextRequest } from "next/server";
import { getAppUrl } from "@/lib/env";
import { PLANS, type PlanId } from "@/lib/plans";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Inicia una suscripción mensual en Mercado Pago (preapproval) y redirige al checkout.
 * Si MP no está configurado, redirige a la página de plan con instrucciones de pago manual.
 */
export async function POST(request: NextRequest) {
  const appUrl = await getAppUrl();
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`, 303);

  const fd = await request.formData();
  const businessId = String(fd.get("business_id") ?? "");
  const plan = String(fd.get("plan") ?? "") as PlanId;
  if (!businessId || !(plan in PLANS) || plan === "free") {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: biz } = await supabase.from("businesses").select("id, name, slug").eq("id", businessId).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return NextResponse.redirect(`${appUrl}/app/${biz.id}/plan?manual=1&plan=${plan}`, 303);

  const body = {
    reason: `LibroClaro ${PLANS[plan].name} · ${biz.name}`,
    external_reference: `${biz.id}|${plan}`,
    payer_email: user.email,
    back_url: `${appUrl}/app/${biz.id}/plan?status=success`,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: PLANS[plan].priceMonthly,
      currency_id: "PEN",
    },
    status: "pending",
  };

  try {
    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[mercadopago:preapproval]", res.status, await res.text());
      return NextResponse.redirect(`${appUrl}/app/${biz.id}/plan?error=mp`, 303);
    }
    const json = (await res.json()) as { init_point?: string };
    if (!json.init_point) return NextResponse.redirect(`${appUrl}/app/${biz.id}/plan?error=mp`, 303);
    return NextResponse.redirect(json.init_point, 303);
  } catch (err) {
    console.error("[mercadopago:preapproval]", err);
    return NextResponse.redirect(`${appUrl}/app/${biz.id}/plan?error=mp`, 303);
  }
}
