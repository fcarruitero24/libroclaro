import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Button, Card } from "@/components/ui";
import { WHATSAPP_NUMBER, YAPE_NAME, YAPE_NUMBER } from "@/lib/env";
import { fmtDate } from "@/lib/format";
import { monthlyEquivalent, PLANS, planFor, priceFor, yearlySavings, type BillingPeriod } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export const metadata = { title: "Plan" };

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ bizId: string }>;
  searchParams: Promise<{ status?: string; manual?: string; plan?: string; error?: string; periodo?: string }>;
}) {
  const { bizId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").eq("id", bizId).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const current = planFor(biz);
  const period: BillingPeriod = sp.periodo === "mensual" ? "monthly" : "yearly";
  const mpEnabled = Boolean(process.env.MP_ACCESS_TOKEN);
  const manualEnabled = Boolean(YAPE_NUMBER);

  const tab = (value: BillingPeriod, label: string, hint?: string) => {
    const active = period === value;
    return (
      <Link
        href={`/app/${bizId}/plan?periodo=${value === "yearly" ? "anual" : "mensual"}`}
        className={
          active
            ? "rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition duration-200 ease-out"
            : "rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition duration-200 ease-out hover:text-slate-900"
        }
      >
        {label}
        {hint && <span className="ml-1.5 text-xs font-bold text-green-700">{hint}</span>}
      </Link>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Tu plan</h2>
        <p className="text-sm text-slate-600">
          Estás en el plan <strong>{current.name}</strong>
          {biz.plan !== "free" && biz.plan_expires_at && <> · vigente hasta el {fmtDate(biz.plan_expires_at)}</>}.
        </p>
      </div>

      {sp.status === "success" && (
        <Alert kind="success">
          ¡Gracias! Estamos confirmando tu pago con Mercado Pago. Tu plan se activará automáticamente en unos minutos.
        </Alert>
      )}
      {sp.error === "mp" && (
        <Alert kind="error">
          No pudimos iniciar el pago con tarjeta. Intenta de nuevo{manualEnabled ? " o paga con Yape/Plin" : ""}.
        </Alert>
      )}
      {sp.manual && (
        <Alert kind="info">
          {manualEnabled
            ? "El pago con tarjeta no está disponible por ahora. Puedes activar tu plan pagando con Yape o Plin (abajo)."
            : "Los pagos se habilitarán muy pronto."}
        </Alert>
      )}

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {tab("yearly", "Pago anual", `ahorra ${yearlySavings(PLANS.pro)}%`)}
          {tab("monthly", "Mes a mes")}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {(["free", "pro", "business"] as const).map((id) => {
          const p = PLANS[id];
          const isCurrent = current.id === id;
          const price = priceFor(p, period);
          return (
            <Card key={id} className={id === "pro" ? "border-2 border-teal-700" : ""}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                {isCurrent && <Badge tone="green">Actual</Badge>}
              </div>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">S/ {price}</span>
                <span className="text-sm text-slate-500">{price === 0 ? "" : period === "yearly" ? "/año" : "/mes"}</span>
              </p>
              <p className="mt-1 min-h-5 text-xs text-slate-500">
                {price === 0
                  ? "Para siempre, sin tarjeta."
                  : period === "yearly"
                    ? `Equivale a S/ ${monthlyEquivalent(p)} al mes.`
                    : `Pagando el año completo: S/ ${p.priceYearly}.`}
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-teal-700">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {id !== "free" && !isCurrent && (
                <div className="mt-6 space-y-2">
                  {mpEnabled && (
                    <form action="/api/checkout" method="post">
                      <input type="hidden" name="business_id" value={biz.id} />
                      <input type="hidden" name="plan" value={id} />
                      <input type="hidden" name="period" value={period} />
                      <Button type="submit" className="w-full">
                        Pagar con tarjeta
                      </Button>
                    </form>
                  )}
                  {manualEnabled && (
                    <a
                      href="#yape"
                      className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Pagar con Yape / Plin
                    </a>
                  )}
                  {!mpEnabled && !manualEnabled && (
                    <p className="text-xs text-slate-500">Los pagos se habilitarán muy pronto.</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {manualEnabled && (
        <Card id="yape" className="border-violet-200 bg-violet-50/40">
          <h3 className="text-lg font-semibold text-slate-900">Pagar con Yape o Plin</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>
              Yapea o plinea <strong>S/ {priceFor(PLANS.pro, period)}</strong> por el plan Pro, o{" "}
              <strong>S/ {priceFor(PLANS.business, period)}</strong> por el plan Empresa, al número{" "}
              <strong className="font-mono">{YAPE_NUMBER}</strong>
              {YAPE_NAME && (
                <>
                  {" "}
                  a nombre de <strong>{YAPE_NAME}</strong>
                </>
              )}
              . Esos montos son por {period === "yearly" ? "un año completo" : "un mes"}.
            </li>
            <li>
              Envíanos la captura por WhatsApp indicando tu enlace: <code className="rounded bg-white px-1 py-0.5 text-xs">/r/{biz.slug}</code>.
            </li>
            <li>Activamos tu plan en menos de 24 horas (normalmente en minutos) y te confirmamos por WhatsApp.</li>
          </ol>
          {WHATSAPP_NUMBER && (
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, acabo de pagar el plan Pro de LibroClaro (${period === "yearly" ? "anual" : "mensual"}) para /r/${biz.slug}. Adjunto la captura.`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Enviar comprobante por WhatsApp
            </a>
          )}
        </Card>
      )}

      <p className="text-xs text-slate-500">
        Puedes cancelar en cualquier momento; mantendrás los beneficios hasta el fin del periodo pagado. Con el plan
        Gratis tu libro sigue funcionando y tus reclamos siguen guardados: solo dejan de aplicarse los beneficios Pro.
      </p>
    </div>
  );
}
