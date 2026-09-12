import Link from "next/link";
import { DeadlineBadge, StatusBadge } from "@/components/status-badge";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { businessDaysLeft } from "@/lib/business-days";
import { fmtDate, KIND_LABEL } from "@/lib/format";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business, Complaint } from "@/lib/types";

export const metadata = { title: "Reclamos" };

const FILTERS = [
  { key: "", label: "Todos" },
  { key: "abiertos", label: "Abiertos" },
  { key: "vencidos", label: "Vencidos" },
  { key: "respondido", label: "Respondidos" },
  { key: "cerrado", label: "Cerrados" },
];

export default async function ComplaintsPage({
  params,
  searchParams,
}: {
  params: Promise<{ bizId: string }>;
  searchParams: Promise<{ estado?: string; bienvenida?: string }>;
}) {
  const { bizId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: bizData }, { data }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", bizId).single(),
    supabase.from("complaints").select("*").eq("business_id", bizId).order("created_at", { ascending: false }).limit(500),
  ]);
  const biz = bizData as Business;
  const plan = planFor(biz);
  const all = (data ?? []) as Complaint[];

  const isOpen = (c: Complaint) => c.status === "pendiente" || c.status === "en_proceso";
  const open = all.filter(isOpen);
  const overdue = open.filter((c) => businessDaysLeft(c.due_at) < 0);
  const soon = open.filter((c) => {
    const d = businessDaysLeft(c.due_at);
    return d >= 0 && d <= 3;
  });
  const responded = all.filter((c) => c.status === "respondido" || c.status === "cerrado");

  const filter = sp.estado ?? "";
  const rows =
    filter === "abiertos"
      ? open
      : filter === "vencidos"
        ? overdue
        : filter === "respondido" || filter === "cerrado"
          ? all.filter((c) => c.status === filter)
          : all;

  return (
    <div className="space-y-6">
      {sp.bienvenida && (
        <Alert kind="success">
          <strong>¡Tu libro está listo!</strong> Ahora instala el enlace y el aviso en tu web o redes. Te explicamos cómo en{" "}
          <Link href={`/app/${bizId}/ajustes#instalacion`} className="font-semibold underline">
            Ajustes e instalación
          </Link>
          .
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Abiertos" value={open.length} tone="teal" href={`/app/${bizId}?estado=abiertos`} />
        <Stat label="Por vencer (≤3 d.h.)" value={soon.length} tone="amber" href={`/app/${bizId}?estado=abiertos`} />
        <Stat label="Vencidos" value={overdue.length} tone="red" href={`/app/${bizId}?estado=vencidos`} />
        <Stat label="Respondidos" value={responded.length} tone="green" href={`/app/${bizId}?estado=respondido`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key ? `/app/${bizId}?estado=${f.key}` : `/app/${bizId}`}
              className={
                filter === f.key
                  ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }
            >
              {f.label}
            </Link>
          ))}
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
            <p className="text-sm text-slate-600">No hay reclamos con este filtro.</p>
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
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Plazo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-800">{c.code}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.consumer_name}</p>
                    <p className="text-xs text-slate-500">{c.consumer_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.kind === "queja" ? "violet" : "slate"}>{KIND_LABEL[c.kind]}</Badge>
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

function Stat({ label, value, tone, href }: { label: string; value: number; tone: "teal" | "amber" | "red" | "green"; href: string }) {
  const color = { teal: "text-teal-700", amber: "text-amber-700", red: "text-red-700", green: "text-green-700" }[tone];
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${color}`}>{value}</p>
    </Link>
  );
}
