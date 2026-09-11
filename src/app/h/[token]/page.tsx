import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PoweredBy } from "@/components/powered-by";
import { PrintButton } from "@/components/print-button";
import { Alert } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtMoney, ITEM_LABEL, KIND_LABEL } from "@/lib/format";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { ComplaintPublic } from "@/lib/types";

export const metadata: Metadata = {
  title: "Hoja de reclamación",
  robots: { index: false, follow: false },
};

export default async function PublicComplaintPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ registrado?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  if (!/^[a-f0-9]{32}$/.test(token)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_complaint_public", { p_token: token });
  const row = (Array.isArray(data) ? data[0] : data) as ComplaintPublic | undefined;
  if (!row) notFound();

  const plan = planFor({ plan: row.business_plan, plan_expires_at: row.business_plan_expires_at });
  const color = plan.customBranding ? row.business_color : "#1d4ed8";
  const logo = plan.customBranding ? row.business_logo_url : null;
  const answered = Boolean(row.response) && (row.status === "respondido" || row.status === "cerrado");

  return (
    <main className="flex-1 bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {sp.registrado && (
          <Alert kind="success" className="no-print mb-6">
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 40 40" aria-hidden="true" className="mt-0.5 h-9 w-9 shrink-0 text-green-600">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  transform="rotate(-90 20 20)"
                  className="anim-check-ring"
                />
                <path
                  d="M13 20.5l5 5 9-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="anim-check-mark"
                />
              </svg>
              <p className="anim-fade-rise">
                <strong>
                  Tu {KIND_LABEL[row.kind].toLowerCase()} fue registrado con el N.º {row.code}.
                </strong>{" "}
                Te enviamos una copia a <strong>{row.consumer_email}</strong>. Guarda este enlace: es tu constancia.
              </p>
            </div>
          </Alert>
        )}

        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/r/${row.business_slug}`} className="text-sm text-slate-600 hover:text-slate-900">
            ← Volver al Libro de Reclamaciones de {row.business_name}
          </Link>
          <PrintButton />
        </div>

        <article className="print-page rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={row.business_name} className="h-12 w-auto max-w-36 object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold text-white" style={{ backgroundColor: color }}>
                  {row.business_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900">{row.business_name}</p>
                <p className="text-xs text-slate-600">RUC {row.business_ruc}</p>
                <p className="text-xs text-slate-600">{row.business_address}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Libro de Reclamaciones</p>
              <p className="text-lg font-extrabold text-slate-900">HOJA DE RECLAMACIÓN</p>
              <p className="font-mono text-sm font-semibold" style={{ color }}>
                N.º {row.code}
              </p>
              <p className="text-xs text-slate-600">Fecha: {fmtDateTime(row.created_at)}</p>
            </div>
          </header>

          <Block title="1. Identificación del consumidor reclamante">
            <Grid>
              <Item label="Nombre" value={row.consumer_name} />
              <Item label="Documento" value={`${row.consumer_doc_type} ${row.consumer_doc_number}`} />
              <Item label="Domicilio" value={row.consumer_address} />
              <Item label="Teléfono" value={row.consumer_phone ?? "—"} />
              <Item label="Correo electrónico" value={row.consumer_email} />
              {row.is_minor && <Item label="Padre / madre / apoderado" value={row.guardian_name ?? "—"} />}
            </Grid>
          </Block>

          <Block title="2. Identificación del bien contratado">
            <Grid>
              <Item label="Tipo" value={ITEM_LABEL[row.item_type]} />
              <Item label="Monto reclamado" value={fmtMoney(row.amount)} />
              <div className="sm:col-span-2">
                <Item label="Descripción" value={row.item_description} />
              </div>
            </Grid>
          </Block>

          <Block title="3. Detalle de la reclamación y pedido del consumidor">
            <div className="space-y-4">
              <Item label="Tipo" value={KIND_LABEL[row.kind]} />
              <Item label="Detalle" value={row.detail} pre />
              <Item label="Pedido" value={row.request} pre />
            </div>
          </Block>

          <Block title="4. Observaciones y acciones adoptadas por el proveedor">
            {answered ? (
              <div className="space-y-3">
                <p className="whitespace-pre-wrap text-sm text-slate-900">{row.response}</p>
                <p className="text-xs text-slate-500">Fecha de comunicación de la respuesta: {row.responded_at ? fmtDateTime(row.responded_at) : "—"}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Pendiente de respuesta. Plazo máximo para responder: <strong>{fmtDate(row.due_at)}</strong> (15 días hábiles).
              </p>
            )}
          </Block>

          <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
            <p>
              * La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo
              para interponer una denuncia ante el INDECOPI.
            </p>
            <p>
              * El proveedor deberá dar respuesta al reclamo o queja en un plazo no mayor a quince (15) días hábiles,
              improrrogables.
            </p>
            <p className="mt-2">
              Documento generado electrónicamente. Constancia disponible en línea con el código N.º {row.code}.
            </p>
          </footer>
        </article>

        {plan.branding && <PoweredBy />}
      </div>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>;
}

function Item({ label, value, pre }: { label: string; value: string; pre?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={pre ? "mt-0.5 whitespace-pre-wrap text-sm text-slate-900" : "mt-0.5 text-sm font-medium text-slate-900"}>{value}</dd>
    </div>
  );
}
