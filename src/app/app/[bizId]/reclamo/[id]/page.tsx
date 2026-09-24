import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoriaSelector, NotaForm } from "@/components/reclamo-controles";
import { ResponseForm } from "@/components/response-form";
import { StatusBadge } from "@/components/status-badge";
import { Badge, Card } from "@/components/ui";
import { businessDaysBetween, businessDaysLeft } from "@/lib/business-days";
import { categoriaLabel } from "@/lib/categorias";
import { fmtDate, fmtDateTime, fmtMoney, ITEM_LABEL, KIND_LABEL, STATUS_LABEL } from "@/lib/format";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business, Complaint, ComplaintEvent, ResponseTemplate } from "@/lib/types";

export const metadata = { title: "Detalle del reclamo" };

/** Número para wa.me: los celulares peruanos de 9 dígitos llevan el 51 delante. */
function numeroWhatsapp(tel: string | null): string | null {
  const d = (tel ?? "").replace(/\D/g, "");
  if (/^9\d{8}$/.test(d)) return `51${d}`;
  if (/^519\d{8}$/.test(d)) return d;
  return d.length >= 10 ? d : null;
}

export default async function ComplaintDetailPage({ params }: { params: Promise<{ bizId: string; id: string }> }) {
  const { bizId, id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: bizData }, { data: eventos }, { data: plantillas }] = await Promise.all([
    supabase.from("complaints").select("*").eq("id", id).eq("business_id", bizId).maybeSingle(),
    supabase.from("businesses").select("*").eq("id", bizId).maybeSingle(),
    supabase.from("complaint_events").select("*").eq("complaint_id", id).order("created_at", { ascending: true }),
    supabase.from("response_templates").select("*").order("title", { ascending: true }),
  ]);
  if (!data || !bizData) notFound();
  const c = data as Complaint;
  const biz = bizData as Business;
  const plan = planFor(biz);
  const historial = (eventos ?? []) as ComplaintEvent[];

  const abierto = c.status === "pendiente" || c.status === "en_proceso";
  const wa = numeroWhatsapp(c.consumer_phone);
  const waTexto = encodeURIComponent(
    `Hola ${c.consumer_name.split(" ")[0]}, te escribimos de ${biz.name} sobre tu ${KIND_LABEL[c.kind].toLowerCase()} N.º ${c.code}.`,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/app/${bizId}/reclamos`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Volver a reclamos
          </Link>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold text-slate-900">
            Hoja N.º {c.code}
            <StatusBadge status={c.status} />
            <Badge tone={c.kind === "queja" ? "violet" : "slate"}>{KIND_LABEL[c.kind]}</Badge>
          </h2>
          <p className="mt-1 text-sm text-slate-500">Registrado el {fmtDateTime(c.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${waTexto}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M12.05 2.5a9.44 9.44 0 0 0-8.1 14.3L2.6 21.4l4.7-1.2a9.44 9.44 0 1 0 4.75-17.7Zm5.46 13.42c-.23.65-1.35 1.24-1.86 1.3-.48.05-1.08.08-1.74-.11a15.9 15.9 0 0 1-1.58-.58c-2.78-1.2-4.6-4-4.74-4.18-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03.97-2.3.25-.28.55-.35.73-.35h.53c.17 0 .4-.06.62.47.23.55.78 1.9.85 2.04.07.14.11.3.02.49-.1.18-.14.3-.28.46-.14.16-.3.36-.42.49-.14.14-.29.29-.12.57.16.28.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.17-.19.7-.82.89-1.1.18-.28.37-.23.62-.14.25.1 1.6.76 1.87.9.28.13.46.2.53.32.06.12.06.67-.17 1.32Z" />
              </svg>
              WhatsApp
            </a>
          )}
          <Link
            href={`/h/${c.public_token}`}
            target="_blank"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Ver hoja pública / PDF
          </Link>
        </div>
      </div>

      <Plazo complaint={c} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">1. Identificación del consumidor</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Nombre" value={c.consumer_name} />
              <Item label="Documento" value={`${c.consumer_doc_type} ${c.consumer_doc_number}`} />
              <Item label="Domicilio" value={c.consumer_address} />
              <Item label="Teléfono" value={c.consumer_phone ?? "—"} />
              <Item label="Correo" value={c.consumer_email} />
              {c.is_minor && <Item label="Padre / madre / apoderado" value={c.guardian_name ?? "—"} />}
            </dl>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">2. Identificación del bien contratado</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Tipo" value={ITEM_LABEL[c.item_type]} />
              <Item label="Monto reclamado" value={fmtMoney(c.amount)} />
              <div className="sm:col-span-2">
                <Item label="Descripción" value={c.item_description} />
              </div>
            </dl>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">3. Detalle de la reclamación</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <Item label={`Detalle del ${KIND_LABEL[c.kind].toLowerCase()}`} value={c.detail} pre />
              <Item label="Pedido del consumidor" value={c.request} pre />
            </dl>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Historial</h3>
            <p className="mt-1 text-xs text-slate-500">
              Cada cambio queda registrado con su fecha y no se puede borrar. Si te fiscalizan, es tu constancia.
            </p>
            <Historial eventos={historial} />
            <div className="mt-5 border-t border-slate-100 pt-5">
              <NotaForm complaintId={c.id} businessId={bizId} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-4 lg:sticky lg:top-4">
            <Card>
              <CategoriaSelector id={c.id} businessId={bizId} actual={c.category} />
            </Card>
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">4. Respuesta del proveedor</h3>
              {c.responded_at && (
                <p className="mt-2 text-xs text-slate-500">Respondido el {fmtDateTime(c.responded_at)}</p>
              )}
              <div className="mt-4">
                {/* La clave es solo el reclamo: el texto ya vive en el estado del
                    formulario, y así el aviso de "guardado" no se pierde cuando
                    la página se refresca con la respuesta nueva. */}
                <ResponseForm
                  key={c.id}
                  complaint={c}
                  businessName={biz.name}
                  bizId={bizId}
                  templates={plan.templates ? ((plantillas ?? []) as ResponseTemplate[]) : null}
                />
              </div>
            </Card>
            {abierto && (
              <p className="px-1 text-xs text-slate-500">
                Al marcarlo como respondido, el consumidor recibe la respuesta por correo y la hoja pública se actualiza.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cuenta regresiva del plazo legal, o cuánto se tardó si ya se respondió. */
function Plazo({ complaint: c }: { complaint: Complaint }) {
  const abierto = c.status === "pendiente" || c.status === "en_proceso";
  if (!abierto) {
    const tardo = c.responded_at ? businessDaysBetween(c.created_at, c.responded_at) : null;
    const aTiempo = c.responded_at ? new Date(c.responded_at) <= new Date(c.due_at) : true;
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="m5 10.5 3.2 3.2L15 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-green-900">
            {aTiempo ? "Respondido dentro del plazo" : "Respondido fuera del plazo"}
            {tardo !== null && ` · ${tardo} ${tardo === 1 ? "día hábil" : "días hábiles"}`}
          </p>
          <p className="text-sm text-green-800">
            El plazo vencía el {fmtDate(c.due_at)}.{c.responded_at ? ` Respuesta del ${fmtDate(c.responded_at)}.` : ""}
          </p>
        </div>
      </div>
    );
  }

  const quedan = businessDaysLeft(c.due_at);
  const usados = Math.min(15, Math.max(0, 15 - quedan));
  const tono =
    quedan < 0
      ? { caja: "border-red-200 bg-red-50", num: "text-red-700", barra: "bg-red-500", txt: "text-red-900" }
      : quedan <= 3
        ? { caja: "border-amber-200 bg-amber-50", num: "text-amber-700", barra: "bg-amber-400", txt: "text-amber-900" }
        : { caja: "border-teal-200 bg-teal-50", num: "text-teal-700", barra: "bg-teal-600", txt: "text-teal-900" };

  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border px-5 py-4 ${tono.caja}`}>
      <p className={`text-4xl font-extrabold ${tono.num}`}>{quedan < 0 ? -quedan : quedan}</p>
      <div className="min-w-48 flex-1">
        <p className={`font-semibold ${tono.txt}`}>
          {quedan < 0
            ? `${-quedan === 1 ? "día hábil" : "días hábiles"} de retraso`
            : quedan === 0
              ? "Vence hoy"
              : `${quedan === 1 ? "día hábil" : "días hábiles"} para responder`}
        </p>
        <p className={`text-sm ${tono.txt} opacity-80`}>
          Vence el {fmtDate(c.due_at)} · 15 días hábiles desde el registro, sin contar feriados.
        </p>
      </div>
      <div className="w-full sm:w-56">
        <div className="h-2 overflow-hidden rounded-full bg-white/70">
          <div className={`h-full rounded-full ${tono.barra}`} style={{ width: `${(usados / 15) * 100}%` }} />
        </div>
        <p className={`mt-1 text-right text-xs ${tono.txt} opacity-80`}>{usados} de 15 días hábiles usados</p>
      </div>
    </div>
  );
}

const ICONO: Record<ComplaintEvent["type"], { fondo: string; trazo: string }> = {
  registrado: { fondo: "bg-slate-100 text-slate-600", trazo: "M4 4h12v12H4zM7 8h6M7 11h4" },
  estado: { fondo: "bg-teal-50 text-teal-700", trazo: "M4 10h12M12 6l4 4-4 4" },
  categoria: { fondo: "bg-slate-100 text-slate-600", trazo: "M3 10V4h6l8 8-6 6-8-8Z" },
  respuesta: { fondo: "bg-green-50 text-green-700", trazo: "M4 5h12v8H9l-4 3v-3H4z" },
  respuesta_editada: { fondo: "bg-amber-50 text-amber-700", trazo: "M13 4l3 3-8 8H5v-3l8-8Z" },
  respuesta_enviada: { fondo: "bg-green-50 text-green-700", trazo: "M3 5h14v10H3zM3 5l7 6 7-6" },
  nota: { fondo: "bg-violet-50 text-violet-700", trazo: "M5 3h10v14H5zM8 7h4M8 10h4M8 13h2" },
};

function describir(e: ComplaintEvent): string {
  switch (e.type) {
    case "registrado":
      return "El consumidor registró la hoja";
    case "estado":
      return `Estado: ${STATUS_LABEL[e.data.de ?? ""] ?? e.data.de} → ${STATUS_LABEL[e.data.a ?? ""] ?? e.data.a}`;
    case "categoria":
      return e.data.a ? `Categoría: ${categoriaLabel(e.data.a)}` : "Se quitó la categoría";
    case "respuesta":
      return "Se guardó la respuesta";
    case "respuesta_editada":
      return "Se corrigió la respuesta";
    case "respuesta_enviada":
      return `Respuesta enviada por correo${e.data.correo ? ` a ${e.data.correo}` : ""}`;
    case "nota":
      return "Nota interna";
  }
}

function Historial({ eventos }: { eventos: ComplaintEvent[] }) {
  if (eventos.length === 0) return <p className="mt-4 text-sm text-slate-500">Sin movimientos todavía.</p>;
  return (
    <ol className="relative mt-5 space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-slate-200">
      {eventos.map((e) => {
        const ic = ICONO[e.type];
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${ic.fondo}`}>
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ic.trazo} />
              </svg>
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm font-medium text-slate-900">{describir(e)}</p>
              <p className="text-xs text-slate-500">
                {fmtDateTime(e.created_at)} · {e.actor_id ? "Tú" : e.type === "registrado" ? "Consumidor" : "Sistema"}
              </p>
              {e.type === "nota" && e.data.texto && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-violet-50/70 px-3 py-2 text-sm text-slate-700">{e.data.texto}</p>
              )}
              {(e.type === "respuesta" || e.type === "respuesta_editada") && e.data.texto && (
                <details className="mt-1 text-sm">
                  <summary className="cursor-pointer text-xs font-semibold text-teal-700 hover:underline">
                    Ver el texto de esta versión
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{e.data.texto}</p>
                  {e.type === "respuesta_editada" && e.data.anterior && (
                    <>
                      <p className="mt-2 text-xs font-semibold text-slate-500">Versión anterior</p>
                      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-slate-500 line-through decoration-slate-300">
                        {e.data.anterior}
                      </p>
                    </>
                  )}
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Item({ label, value, pre }: { label: string; value: string; pre?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={pre ? "mt-0.5 whitespace-pre-wrap text-slate-900" : "mt-0.5 font-medium text-slate-900"}>{value}</dd>
    </div>
  );
}
