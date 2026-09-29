"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyPlatform, tplPlatformSubscription } from "@/lib/email";
import { PLANS, type PlanId } from "@/lib/plans";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient, requireUser } from "@/lib/supabase/server";

/**
 * Cancela el cobro automático de la suscripción de Mercado Pago del negocio.
 *
 * No toca el plan: sigue vigente hasta plan_expires_at y después el libro
 * queda inactivo solo, con todos sus reclamos. Cancelar tiene que ser tan fácil como contratar,
 * así que se hace desde el panel y no mandando al cliente a Mercado Pago (quien
 * pagó como invitado ni siquiera tiene cuenta ahí).
 */
export async function cancelarSuscripcion(formData: FormData): Promise<void> {
  await requireUser();
  const bizId = String(formData.get("business_id") ?? "");
  const volver = `/app/${bizId}/plan`;

  // Con la sesión del cliente: la RLS solo devuelve el negocio si es suyo.
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, name, plan, plan_expires_at, mp_preapproval_id, mp_subscription_status")
    .eq("id", bizId)
    .maybeSingle();
  if (!biz) redirect("/app");
  if (!biz.mp_preapproval_id || biz.mp_subscription_status !== "authorized") {
    redirect(`${volver}?error=sin-suscripcion`);
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || !hasAdminClient()) redirect(`${volver}?error=cancelar`);

  const res = await fetch(`https://api.mercadopago.com/preapproval/${biz.mp_preapproval_id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "cancelled" }),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("[mercadopago:cancelar]", res?.status, res ? await res.text() : "sin respuesta");
    redirect(`${volver}?error=cancelar`);
  }
  const pre = (await res.json().catch(() => ({}))) as { auto_recurring?: { frequency?: number } };

  // Se guarda ya para que la página lo muestre al volver; el webhook llegará
  // después con el mismo estado. Va con la service role porque las columnas del
  // plan están protegidas contra la sesión del cliente (migración 0007).
  await createAdminClient()
    .from("businesses")
    .update({ mp_subscription_status: "cancelled" })
    .eq("id", biz.id);

  // El aviso interno sale aquí: cuando llegue el webhook el estado ya será
  // "cancelled" y no habrá cambio que notificar.
  const plan = (biz.plan in PLANS ? biz.plan : "pro") as PlanId;
  const aviso = tplPlatformSubscription({
    businessName: biz.name,
    planName: PLANS[plan].name,
    period: pre.auto_recurring?.frequency === 12 ? "yearly" : "monthly",
    status: "cancelled",
    previo: "authorized",
    hasta: biz.plan_expires_at,
  });
  after(() => notifyPlatform(aviso));

  redirect(`${volver}?cancelada=1`);
}
