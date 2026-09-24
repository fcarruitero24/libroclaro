import Link from "next/link";
import { FiltrosReclamos, type Filtros } from "@/components/filtros-reclamos";
import { DeadlineBadge, StatusBadge } from "@/components/status-badge";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { businessDaysLeft, limaDateKey } from "@/lib/business-days";
import { CATEGORIA_CORTA, esCategoria } from "@/lib/categorias";
import { fmtDate, KIND_LABEL } from "@/lib/format";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business, Complaint } from "@/lib/types";

export const metadata = { title: "Reclamos" };

type Fila = Pick<
  Complaint,
  | "id"
  | "code"
  | "created_at"
  | "due_at"
  | "status"
  | "kind"
  | "category"
  | "consumer_name"
  | "consumer_email"
  | "consumer_doc_number"
>;

const ESTADOS = [
  { key: "", label: "Todos" },
  { key: "abiertos", label: "Abiertos" },
  { key: "por_vencer", label: "Por vencer" },
  { key: "vencidos", label: "Vencidos" },
  { key: "respondido", label: "Respondidos" },
  { key: "cerrado", label: "Cerrados" },
];

const isOpen = (c: Fila) => c.status === "pendiente" || c.status === "en_proceso";

/** Minúsculas y sin tildes, para que "maria" encuentre a "María". */
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

function cumpleEstado(c: Fila, estado: string): boolean {
  if (!estado) return true;
  if (estado === "abiertos") return isOpen(c);
  if (estado === "vencidos") return isOpen(c) && businessDaysLeft(c.due_at) < 0;
  if (estado === "por_vencer") {
    const d = businessDaysLeft(c.due_at);
    return isOpen(c) && d >= 0 && d <= 3;
  }
  return c.status === estado;
}

export default async function ComplaintsPage({
  params,
  searchParams,
}: {
  params: Promise<{ bizId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { bizId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: bizData }, { data }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", bizId).single(),
    supabase
      .from("complaints")
      .select("id, code, created_at, due_at, status, kind, category, consumer_name, consumer_email, consumer_doc_number")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const biz = bizData as Business;
  const plan = planFor(biz);
  const all = (data ?? []) as Fila[];

  const filtros: Filtros = {
    q: (sp.q ?? "").trim().slice(0, 80),
    estado: ESTADOS.some((e) => e.key === sp.estado) ? (sp.estado ?? "") : "",
    tipo: sp.tipo === "reclamo" || sp.tipo === "queja" ? sp.tipo : "",
    cat: sp.cat === "sin" || esCategoria(sp.cat) ? (sp.cat ?? "") : "",
    desde: /^\d{4}-\d{2}-\d{2}$/.test(sp.desde ?? "") ? (sp.desde ?? "") : "",
    hasta: /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta ?? "") ? (sp.hasta ?? "") : "",
    orden: sp.orden === "plazo" ? "plazo" : "",
  };

  // Todo menos el estado: las pestañas de estado muestran cuántos quedan en
  // cada una con los demás filtros aplicados.
  const q = normalizar(filtros.q);
  const base = all.filter((c) => {
    if (filtros.tipo && c.kind !== filtros.tipo) return false;
    if (filtros.cat === "sin" ? c.category !== null : filtros.cat && c.category !== filtros.cat) return false;
    const dia = limaDateKey(new Date(c.created_at));
    if (filtros.desde && dia < filtros.desde) return false;
    if (filtros.hasta && dia > filtros.hasta) return false;
    if (q) {
      const texto = normalizar(`${c.consumer_name} ${c.consumer_email} ${c.consumer_doc_number} ${c.code}`);
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const rows = base.filter((c) => cumpleEstado(c, filtros.estado));
  if (filtros.orden === "plazo") {
    // Primero lo abierto por fecha límite; lo ya resuelto va al final.
    rows.sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || a.due_at.localeCompare(b.due_at));
  }

  const hrefEstado = (estado: string) => {
    const p = new URLSearchParams();
    if (estado) p.set("estado", estado);
    for (const k of ["q", "tipo", "cat", "desde", "hasta", "orden"] as const) if (filtros[k]) p.set(k, filtros[k]);
    const s = p.toString();
    return `/app/${bizId}/reclamos${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {ESTADOS.map((e) => {
            const n = base.filter((c) => cumpleEstado(c, e.key)).length;
            const activo = filtros.estado === e.key;
            return (
              <Link
                key={e.key}
                href={hrefEstado(e.key)}
                className={
                  activo
                    ? "inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    : "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }
              >
                {e.label}
                <span className={activo ? "text-white/70" : "text-slate-400"}>{n}</span>
              </Link>
            );
          })}
        </div>
        {plan.csvExport ? (
          <ButtonLink href={`/app/${bizId}/exportar`} variant="secondary">
            Exportar CSV
          </ButtonLink>
        ) : (
          <Link href={`/app/${bizId}/plan`} className="text-xs font-semibold text-teal-700 hover:underline">
            Exportar a Excel (Pro) →
          </Link>
        )}
      </div>

      <FiltrosReclamos action={`/app/${bizId}/reclamos`} filtros={filtros} />

      {rows.length === 0 ? (
        <Card className="text-center">
          {all.length === 0 ? (
            <>
              <p className="text-lg font-semibold text-slate-900">Aún no tienes reclamos</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Eso es bueno. Asegúrate de que tu enlace y el aviso estén visibles en tu web, redes y local para cumplir la
                norma.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <ButtonLink href={`/app/${bizId}/ajustes#instalacion`}>Ver cómo instalar</ButtonLink>
                <ButtonLink href={`/r/${biz.slug}`} target="_blank" variant="secondary">
                  Abrir mi formulario
                </ButtonLink>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Ningún reclamo coincide con estos filtros.</p>
          )}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">N.º</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Consumidor</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Plazo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-800">{c.code}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.consumer_name}</p>
                    <p className="text-xs text-slate-500">{c.consumer_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.kind === "queja" ? "violet" : "slate"}>{KIND_LABEL[c.kind]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                    {c.category && esCategoria(c.category) ? (
                      CATEGORIA_CORTA[c.category]
                    ) : (
                      <span className="text-slate-400">Sin categoría</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <DeadlineBadge status={c.status} dueAt={c.due_at} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/app/${bizId}/reclamo/${c.id}`} className="font-semibold text-teal-700 hover:underline">
                      {isOpen(c) ? "Responder" : "Ver"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
