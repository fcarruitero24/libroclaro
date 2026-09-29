import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoriaSelector, NotaForm } from "@/components/reclamo-controles";
import { ResponseForm } from "@/components/response-form";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui";
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

/** Tarjeta del panel: sin borde gris, el contorno lo da la sombra teñida. */
const tarjeta = "rounded-2xl bg-white sombra-tarjeta";

/**
 * Detalle de una hoja de reclamación.
 *
 * Dos columnas: a la izquierda, en una sola tarjeta, lo que el dueño
 * tiene que leer (qué pasó, qué pide, quién es); a la derecha, fija al
 * bajar, lo que tiene que hacer (responder) y el estado del plazo. El
 * historial completo sigue ahí, plegado: es la constancia ante una
 * fiscalización, pero no hace falta verlo para responder.
 */
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

  const tipo = KIND_LABEL[c.kind].toLowerCase();
  const wa = numeroWhatsapp(c.consumer_phone);
  const waTexto = encodeURIComponent(
    `Hola ${c.consumer_name.split(" ")[0]}, te escribimos de ${biz.name} sobre tu ${tipo} N.º ${c.code}.`,
  );

  return (
    <div className="space-y-6">
      {/* Encabezado: el código y el plazo, que es lo primero que importa. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/app/${bizId}/reclamos`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Volver a reclamos
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-2xl font-bold tracking-tight text-slate-900">{c.code}</h2>
            <ChipPlazo complaint={c} />
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Badge tone={c.kind === "queja" ? "violet" : "slate"}>{KIND_LABEL[c.kind]}</Badge>
            <StatusBadge status={c.status} />
            <span>Entró el {fmtDateTime(c.created_at)}</span>
          </p>
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
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Ver hoja / PDF
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Lo que hay que leer. */}
        <div className={`${tarjeta} divide-y divide-slate-100 lg:col-span-2`}>
          <section className="space-y-5 p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Qué motivó {c.kind === "queja" ? "la queja" : "el reclamo"}
            </h3>
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">{ITEM_LABEL[c.item_type]}</p>
                <p className="mt-0.5 font-medium text-slate-900">{c.item_description}</p>
              </div>
              {c.amount !== null && (
                <div className="text-right">
                  <p className="text-sm text-slate-500">Monto reclamado</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-900">{fmtMoney(c.amount)}</p>
                </div>
              )}
            </div>
            <Bloque titulo={`Detalle ${c.kind === "queja" ? "de la queja" : "del reclamo"}`} texto={c.detail} />
            <Bloque titulo="Lo que pide" texto={c.request} />
          </section>

          <section className="p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quién reclama</h3>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Dato label="Nombre" value={c.consumer_name} />
              <Dato label={c.consumer_doc_type} value={c.consumer_doc_number} />
              <Dato label="Correo" value={c.consumer_email} />
              <Dato label="Teléfono" value={c.consumer_phone ?? "—"} />
              <div className="sm:col-span-2">
                <Dato label="Domicilio" value={c.consumer_address} />
              </div>
              {c.is_minor && <Dato label="Padre, madre o apoderado" value={c.guardian_name ?? "—"} />}
            </dl>
          </section>

          <section className="p-6">
            <div className="max-w-sm">
              <CategoriaSelector id={c.id} businessId={bizId} actual={c.category} />
            </div>
          </section>
        </div>

        {/* Lo que hay que hacer. Fija al bajar en pantallas grandes. */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className={`${tarjeta} p-5`}>
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
            <details className="group mt-4 border-t border-slate-100 pt-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900">
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M5 3h10v14H5zM8 7h4M8 10h4M8 13h2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Agregar nota interna
              </summary>
              <div className="mt-3">
                <NotaForm complaintId={c.id} businessId={bizId} />
              </div>
            </details>
          </div>

          <Estado complaint={c} eventos={historial} />
        </div>
      </div>
    </div>
  );
}

/** Etiqueta del plazo junto al código: lo que queda, o cómo se respondió. */
function ChipPlazo({ complaint: c }: { complaint: Complaint }) {
  const abierto = c.status === "pendiente" || c.status === "en_proceso";
  if (!abierto) {
    const aTiempo = c.responded_at ? new Date(c.responded_at) <= new Date(c.due_at) : true;
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${aTiempo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
        {aTiempo ? "Respondido a tiempo" : "Respondido fuera de plazo"}
      </span>
    );
  }
  const quedan = businessDaysLeft(c.due_at);
  const tono = quedan < 0 || quedan === 0 ? "bg-red-100 text-red-800" : quedan <= 3 ? "bg-amber-100 text-amber-900" : "bg-teal-50 text-teal-800";
  const texto =
    quedan < 0
      ? `Vencido hace ${-quedan} ${-quedan === 1 ? "día hábil" : "días hábiles"}`
      : quedan === 0
        ? "Vence hoy"
        : `Quedan ${quedan} ${quedan === 1 ? "día hábil" : "días hábiles"}`;
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tono}`}>{texto}</span>;
}

/**
 * Estado del reclamo como línea de tiempo corta: recibido, respuesta y
 * envío. Debajo, plegado, el historial completo con notas y versiones.
 */
function Estado({ complaint: c, eventos }: { complaint: Complaint; eventos: ComplaintEvent[] }) {
  const abierto = c.status === "pendiente" || c.status === "en_proceso";
  const quedan = businessDaysLeft(c.due_at);
  const usados = Math.min(15, Math.max(0, 15 - quedan));
  const enviado = [...eventos].reverse().find((e) => e.type === "respuesta_enviada");
  const tardo = c.responded_at ? businessDaysBetween(c.created_at, c.responded_at) : null;
  const barra = quedan <= 0 ? "bg-red-500" : quedan <= 3 ? "bg-amber-400" : "bg-teal-600";

  const pasos: { titulo: string; detalle: string; punto: string }[] = [
    {
      titulo: c.kind === "queja" ? "Queja recibida" : "Reclamo recibido",
      detalle: fmtDateTime(c.created_at),
      punto: "bg-teal-600",
    },
  ];
  if (abierto) {
    pasos.push({
      titulo: c.status === "en_proceso" ? "En proceso, falta enviar la respuesta" : "Pendiente de respuesta",
      detalle: `Vence el ${fmtDate(c.due_at)} · 15 días hábiles sin contar feriados`,
      punto: quedan <= 0 ? "bg-red-500" : quedan <= 3 ? "bg-amber-400" : "bg-slate-300",
    });
  } else {
    pasos.push({
      titulo: STATUS_LABEL[c.status] ?? "Respondido",
      detalle: c.responded_at
        ? `${fmtDateTime(c.responded_at)}${tardo !== null ? ` · ${tardo} ${tardo === 1 ? "día hábil" : "días hábiles"}` : ""}`
        : "",
      punto: "bg-green-600",
    });
    if (enviado) {
      pasos.push({
        titulo: "Respuesta enviada por correo",
        detalle: `${fmtDateTime(enviado.created_at)}${enviado.data.correo ? ` · ${enviado.data.correo}` : ""}`,
        punto: "bg-green-600",
      });
    }
  }

  return (
    <div className={`${tarjeta} p-5`}>
      <h3 className="text-sm font-semibold text-slate-900">Estado</h3>
      <ol className="relative mt-4 space-y-4 before:absolute before:bottom-1.5 before:left-[5px] before:top-1.5 before:w-px before:bg-slate-200">
        {pasos.map((p) => (
          <li key={p.titulo} className="relative flex gap-3">
            <span className={`relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white ${p.punto}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{p.titulo}</p>
              {p.detalle && <p className="text-xs text-slate-500">{p.detalle}</p>}
            </div>
          </li>
        ))}
      </ol>

      {abierto && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barra}`} style={{ width: `${(usados / 15) * 100}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-slate-500">{usados} de 15 días hábiles usados</p>
        </div>
      )}

      <details className="group mt-4 border-t border-slate-100 pt-4">
        <summary className="cursor-pointer list-none text-sm font-medium text-teal-700 hover:underline">
          Ver historial completo ({eventos.length})
        </summary>
        <p className="mt-2 text-xs text-slate-500">
          Cada cambio queda registrado con su fecha y no se puede borrar. Si te fiscalizan, es tu constancia.
        </p>
        <Historial eventos={eventos} />
      </details>
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
    <ol className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-slate-200">
      {eventos.map((e) => {
        const ic = ICONO[e.type];
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${ic.fondo}`}>
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ic.trazo} />
              </svg>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
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

/** Texto largo del consumidor en un recuadro gris, con sus saltos de línea. */
function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3.5 leading-relaxed text-slate-800">{texto}</p>
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-slate-900">{value}</dd>
    </div>
  );
}
