import Link from "next/link";
import { notFound } from "next/navigation";
import { SelectorSegmentado } from "@/components/selector-segmentado";
import { Alert, Badge, Button, Card } from "@/components/ui";
import { cancelarSuscripcion } from "@/lib/actions/billing";
import { WHATSAPP_NUMBER, YAPE_NAME, YAPE_NUMBER } from "@/lib/env";
import { fmtDate } from "@/lib/format";
import {
  estadoDelPlan,
  MARGEN_COBRO_MS,
  monthlyEquivalent,
  PLANS,
  planFor,
  priceFor,
  yearlySavings,
  type BillingPeriod,
} from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export const metadata = { title: "Plan" };

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ bizId: string }>;
  searchParams: Promise<{
    status?: string;
    manual?: string;
    plan?: string;
    error?: string;
    periodo?: string;
    cancelar?: string;
    cancelada?: string;
  }>;
}) {
  const { bizId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").eq("id", bizId).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const current = planFor(biz);
  const estado = estadoDelPlan(biz);
  const period: BillingPeriod = sp.periodo === "mensual" ? "monthly" : "yearly";
  const mpEnabled = Boolean(process.env.MP_ACCESS_TOKEN);
  const manualEnabled = Boolean(YAPE_NUMBER);
  // Con una suscripción activa no se ofrece pagar otro plan: se crearía una
  // segunda suscripción y Mercado Pago cobraría las dos.
  const suscripcionActiva = biz.mp_subscription_status === "authorized" && biz.plan !== "free";
  const renuevaEl =
    suscripcionActiva && biz.plan_expires_at
      ? new Date(new Date(biz.plan_expires_at).getTime() - MARGEN_COBRO_MS).toISOString()
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Tu plan</h2>
        <p className="text-sm text-slate-600">
          {estado.tipo === "pagado" && (
            <>
              Estás en el plan <strong>{estado.plan.name}</strong>
              {estado.hasta && <> · vigente hasta el {fmtDate(estado.hasta)}</>}.
            </>
          )}
          {estado.tipo === "prueba" && (
            <>
              Estás en tu <strong>prueba gratis</strong> con todo lo del plan Pro. Termina el {fmtDate(estado.termina)}:
              elige un plan antes para que tu libro siga recibiendo reclamos.
            </>
          )}
          {estado.tipo === "gracia" && (
            <>
              {estado.prueba ? "Tu prueba gratis terminó" : `Tu plan ${current.name} venció`} el {fmtDate(estado.vencio)}.
              Tienes hasta el <strong>{fmtDate(estado.hasta)}</strong> para elegir un plan; después tu libro deja de
              recibir reclamos nuevos.
            </>
          )}
          {estado.tipo === "inactivo" && (
            <>
              Tu libro <strong>no está recibiendo reclamos nuevos</strong>. Elige un plan y se reactiva al instante, con
              el mismo enlace y el mismo QR.
            </>
          )}
        </p>
      </div>

      {suscripcionActiva && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Suscripción activa</h3>
              <p className="text-sm text-slate-600">
                Se renueva automáticamente
                {renuevaEl && <> el {fmtDate(renuevaEl)}</>} con el medio de pago que registraste en Mercado Pago.
              </p>
            </div>
            {!sp.cancelar && (
              <Link href={`/app/${biz.id}/plan?cancelar=1`} className="text-sm font-semibold text-slate-600 underline hover:text-slate-900">
                Cancelar suscripción
              </Link>
            )}
          </div>
          {sp.cancelar && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">¿Seguro que quieres cancelar?</p>
              <p className="mt-1">
                No se te volverá a cobrar. Mantienes el plan {current.name}
                {biz.plan_expires_at && <> hasta el {fmtDate(biz.plan_expires_at)}</>}; después tu libro deja de recibir
                reclamos nuevos, pero conserva todos los que ya tiene.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <form action={cancelarSuscripcion}>
                  <input type="hidden" name="business_id" value={biz.id} />
                  <Button type="submit" variant="danger">
                    Sí, cancelar la suscripción
                  </Button>
                </form>
                <Link href={`/app/${biz.id}/plan`} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                  No, mantenerla
                </Link>
              </div>
            </div>
          )}
        </Card>
      )}

      {sp.cancelada && (
        <Alert kind="success">
          Cancelaste la suscripción: no se te volverá a cobrar. Mantienes el plan {current.name}
          {biz.plan_expires_at && <> hasta el {fmtDate(biz.plan_expires_at)}</>}; después tu libro deja de recibir
          reclamos nuevos, pero conserva todos los que ya tiene.
        </Alert>
      )}
      {sp.error === "cancelar" && (
        <Alert kind="error">No pudimos cancelar la suscripción. Intenta de nuevo en unos minutos.</Alert>
      )}
      {sp.error === "sin-suscripcion" && <Alert kind="info">No tienes una suscripción activa que cancelar.</Alert>}

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
        <SelectorSegmentado
          etiqueta="Periodo de pago"
          tamano="md"
          activa={period === "yearly" ? 0 : 1}
          opciones={[
            {
              clave: "anual",
              href: `/app/${bizId}/plan?periodo=anual`,
              contenido: (
                <>
                  Pago anual
                  <span className="ml-1.5 text-xs font-bold text-green-700">ahorra {yearlySavings(PLANS.pro)}%</span>
                </>
              ),
            },
            { clave: "mensual", href: `/app/${bizId}/plan?periodo=mensual`, contenido: "Mes a mes" },
          ]}
        />
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {(["pro", "business"] as const).map((id) => {
          const p = PLANS[id];
          // La prueba también es Pro, pero no está pagada: ahí sí se ofrece pagar.
          const isCurrent = estado.tipo === "pagado" && estado.plan.id === id;
          const price = priceFor(p, period);
          return (
            <Card key={id} className={id === "pro" ? "border-2 border-teal-700" : ""}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                {isCurrent && <Badge tone="green">Actual</Badge>}
                {estado.tipo === "prueba" && id === "pro" && <Badge tone="teal">En prueba</Badge>}
              </div>
              {/* La clave con el periodo hace que el precio vuelva a entrar al cambiarlo. */}
              <p key={`${id}-${period}`} className="anim-precio mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tabular-nums text-slate-900">S/ {price}</span>
                <span className="text-sm text-slate-500">{period === "yearly" ? "/año" : "/mes"}</span>
              </p>
              <p key={`${id}-${period}-nota`} className="anim-precio mt-1 min-h-5 text-xs text-slate-500">
                {period === "yearly"
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
              {!isCurrent && suscripcionActiva && (
                <p className="mt-6 text-xs text-slate-500">
                  Para cambiar de plan, primero cancela tu suscripción actual.
                </p>
              )}
              {!isCurrent && !suscripcionActiva && (
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
        Puedes cancelar en cualquier momento; mantendrás los beneficios hasta el fin del periodo pagado. Si tu plan
        vence, tu libro deja de recibir reclamos nuevos, pero tus reclamos siguen guardados: puedes verlos, responder los
        pendientes y descargarlos.
      </p>
    </div>
  );
}
