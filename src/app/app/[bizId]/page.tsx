import Link from "next/link";
import { BarrasHorizontales, ColumnasPorPeriodo, type Barra, type Columna } from "@/components/graficos-resumen";
import { DeadlineBadge } from "@/components/status-badge";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { businessDaysBetween, businessDaysLeft, limaDateKey } from "@/lib/business-days";
import { CATEGORIA_CORTA, CATEGORIAS } from "@/lib/categorias";
import { fmtMoney, ITEM_LABEL, KIND_LABEL } from "@/lib/format";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business, Complaint } from "@/lib/types";

export const metadata = { title: "Resumen" };

type Fila = Pick<
  Complaint,
  "id" | "code" | "created_at" | "due_at" | "status" | "kind" | "category" | "item_type" | "amount" | "responded_at" | "consumer_name"
>;

const PERIODOS = [
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: 365, label: "12 meses" },
] as const;

const DIA = 86400000;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Lunes de la semana (Lima) de una fecha "YYYY-MM-DD". */
function lunes(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Columnas del gráfico: semanas para 30 y 90 días, meses para 12 meses. */
function columnas(filas: Fila[], dias: number, ahora: Date): Columna[] {
  const cols = new Map<string, Columna>();
  if (dias === 365) {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 15));
      const key = d.toISOString().slice(0, 7);
      const mes = MESES[d.getUTCMonth()];
      cols.set(key, { etiqueta: mes, detalle: `${mes} ${d.getUTCFullYear()}`, reclamos: 0, quejas: 0 });
    }
    for (const f of filas) {
      const c = cols.get(limaDateKey(new Date(f.created_at)).slice(0, 7));
      if (c) c[f.kind === "queja" ? "quejas" : "reclamos"]++;
    }
  } else {
    const hoy = limaDateKey(ahora);
    const semanas = Math.ceil(dias / 7);
    for (let i = semanas - 1; i >= 0; i--) {
      const key = lunes(limaDateKey(new Date(new Date(`${hoy}T12:00:00Z`).getTime() - i * 7 * DIA)));
      const d = new Date(`${key}T12:00:00Z`);
      const corto = `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
      cols.set(key, { etiqueta: corto, detalle: `Semana del ${corto}`, reclamos: 0, quejas: 0 });
    }
    for (const f of filas) {
      const c = cols.get(lunes(limaDateKey(new Date(f.created_at))));
      if (c) c[f.kind === "queja" ? "quejas" : "reclamos"]++;
    }
  }
  return [...cols.values()];
}

export default async function ResumenPage({
  params,
  searchParams,
}: {
  params: Promise<{ bizId: string }>;
  searchParams: Promise<{ p?: string; bienvenida?: string }>;
}) {
  const { bizId } = await params;
  const sp = await searchParams;
  const dias = PERIODOS.find((p) => String(p.dias) === sp.p)?.dias ?? 90;
  const supabase = await createClient();
  const ahora = new Date();
  // Se trae el doble del periodo para comparar con el periodo anterior.
  const desdeAnterior = new Date(ahora.getTime() - dias * 2 * DIA).toISOString();

  const [{ data: bizData }, { data: abiertosData }, { data: periodoData }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", bizId).single(),
    supabase
      .from("complaints")
      .select("id, code, created_at, due_at, status, kind, category, item_type, amount, responded_at, consumer_name")
      .eq("business_id", bizId)
      .in("status", ["pendiente", "en_proceso"])
      .order("due_at", { ascending: true })
      .limit(1000),
    supabase
      .from("complaints")
      .select("id, code, created_at, due_at, status, kind, category, item_type, amount, responded_at, consumer_name")
      .eq("business_id", bizId)
      .or(`created_at.gte."${desdeAnterior}",responded_at.gte."${desdeAnterior}"`)
      .limit(5000),
  ]);
  const biz = bizData as Business;
  const plan = planFor(biz);
  const abiertos = (abiertosData ?? []) as Fila[];
  const filas = (periodoData ?? []) as Fila[];

  const inicio = ahora.getTime() - dias * DIA;
  const inicioAnterior = ahora.getTime() - dias * 2 * DIA;
  const t = (s: string) => new Date(s).getTime();

  const recibidos = filas.filter((c) => t(c.created_at) >= inicio);
  const recibidosAntes = filas.filter((c) => t(c.created_at) >= inicioAnterior && t(c.created_at) < inicio).length;
  const respondidos = filas.filter((c) => c.responded_at && t(c.responded_at) >= inicio);
  const aTiempo = respondidos.filter((c) => t(c.responded_at!) <= t(c.due_at)).length;
  const pctATiempo = respondidos.length ? Math.round((aTiempo / respondidos.length) * 100) : null;
  const promedio = respondidos.length
    ? respondidos.reduce((s, c) => s + businessDaysBetween(c.created_at, c.responded_at!), 0) / respondidos.length
    : null;
  const monto = recibidos.reduce((s, c) => s + (c.amount ? Number(c.amount) : 0), 0);

  const vencidos = abiertos.filter((c) => businessDaysLeft(c.due_at) < 0).length;
  const porVencer = abiertos.filter((c) => {
    const d = businessDaysLeft(c.due_at);
    return d >= 0 && d <= 3;
  }).length;
  const sinCategoria = abiertos.filter((c) => !c.category).length;

  const variacion = recibidosAntes > 0 ? Math.round(((recibidos.length - recibidosAntes) / recibidosAntes) * 100) : null;

  const bandeja = `/app/${bizId}/reclamos`;
  const porCategoria: Barra[] = [
    ...CATEGORIAS.map((c) => ({
      etiqueta: CATEGORIA_CORTA[c.id],
      valor: recibidos.filter((r) => r.category === c.id).length,
      href: `${bandeja}?cat=${c.id}`,
    })),
    { etiqueta: "Sin categoría", valor: recibidos.filter((r) => !r.category).length, href: `${bandeja}?cat=sin` },
  ]
    .filter((b) => b.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const porBien: Barra[] = (["producto", "servicio"] as const)
    .map((k) => ({ etiqueta: ITEM_LABEL[k], valor: recibidos.filter((r) => r.item_type === k).length }))
    .sort((a, b) => b.valor - a.valor);
  const quejas = recibidos.filter((r) => r.kind === "queja").length;

  const nombrePeriodo = dias === 365 ? "los últimos 12 meses" : `los últimos ${dias} días`;

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

      {/* Ahora mismo: no depende del periodo. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Estado
          label="Abiertos"
          valor={abiertos.length}
          detalle="Pendientes o en proceso"
          tono="teal"
          href={`${bandeja}?estado=abiertos&orden=plazo`}
        />
        <Estado
          label="Por vencer"
          valor={porVencer}
          detalle="Les quedan 3 días hábiles o menos"
          tono="amber"
          href={`${bandeja}?estado=por_vencer&orden=plazo`}
        />
        <Estado
          label="Vencidos"
          valor={vencidos}
          detalle={vencidos ? "Respóndelos cuanto antes" : "Ninguno fuera de plazo"}
          tono={vencidos ? "red" : "green"}
          href={`${bandeja}?estado=vencidos&orden=plazo`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Filtro del periodo: una fila, arriba de todo lo que afecta. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Desempeño en {nombrePeriodo}</h2>
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {PERIODOS.map((p) => (
                <Link
                  key={p.dias}
                  href={`/app/${bizId}?p=${p.dias}`}
                  scroll={false}
                  className={
                    p.dias === dias
                      ? "rounded-md bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm"
                      : "rounded-md px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                  }
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Cifra
              label="Recibidos"
              valor={String(recibidos.length)}
              nota={
                variacion === null
                  ? `${quejas} ${quejas === 1 ? "queja" : "quejas"}`
                  : `${variacion > 0 ? "+" : ""}${variacion}% vs. periodo anterior`
              }
            />
            <Cifra
              label="Respondidos a tiempo"
              valor={pctATiempo === null ? "—" : `${pctATiempo}%`}
              nota={respondidos.length ? `${aTiempo} de ${respondidos.length} respuestas` : "Aún sin respuestas"}
            />
            <Cifra
              label="Tiempo de respuesta"
              valor={promedio === null ? "—" : promedio.toFixed(1).replace(".", ",")}
              nota="Días hábiles en promedio (máx. 15)"
            />
            <Cifra label="Monto reclamado" valor={fmtMoney(monto)} nota="Suma de lo declarado en las hojas" />
          </div>

          <Card className="relative overflow-hidden">
            <h3 className="font-semibold text-slate-900">Reclamos y quejas recibidos</h3>
            <p className="mb-4 text-xs text-slate-500">
              Por {dias === 365 ? "mes" : "semana"}, en {nombrePeriodo}.
            </p>
            {plan.analytics ? (
              <ColumnasPorPeriodo datos={columnas(recibidos, dias, ahora)} />
            ) : (
              <Bloqueado bizId={bizId} />
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="relative overflow-hidden">
              <h3 className="font-semibold text-slate-900">Por categoría</h3>
              <p className="mb-4 text-xs text-slate-500">La causa de cada reclamo, según como lo clasificaste.</p>
              {!plan.analytics ? (
                <Bloqueado bizId={bizId} compacto />
              ) : porCategoria.length ? (
                <BarrasHorizontales datos={porCategoria} total={recibidos.length} />
              ) : (
                <p className="text-sm text-slate-500">Sin reclamos en este periodo.</p>
              )}
            </Card>
            <Card className="relative overflow-hidden">
              <h3 className="font-semibold text-slate-900">Por tipo de bien</h3>
              <p className="mb-4 text-xs text-slate-500">Lo que el consumidor declaró en la hoja.</p>
              {!plan.analytics ? (
                <Bloqueado bizId={bizId} compacto />
              ) : recibidos.length ? (
                <BarrasHorizontales datos={porBien} total={recibidos.length} />
              ) : (
                <p className="text-sm text-slate-500">Sin reclamos en este periodo.</p>
              )}
            </Card>
          </div>
        </div>

        {/* Lo urgente, siempre a la vista: en celular va antes de los gráficos. */}
        <Card className="order-first h-fit lg:sticky lg:top-4 lg:order-none">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Vencen primero</h3>
            <Link href={`${bandeja}?estado=abiertos&orden=plazo`} className="text-xs font-semibold text-teal-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {abiertos.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No tienes reclamos abiertos. Todo al día.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {abiertos.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/${bizId}/reclamo/${c.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-slate-800">{c.code}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {c.consumer_name} · {KIND_LABEL[c.kind]}
                      </span>
                    </span>
                    <DeadlineBadge status={c.status} dueAt={c.due_at} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {sinCategoria > 0 && (
            <Link
              href={`${bandeja}?estado=abiertos&cat=sin`}
              className="mt-4 block rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-600 transition-colors hover:border-teal-400 hover:text-slate-900"
            >
              <strong className="font-semibold text-slate-900">
                {sinCategoria} {sinCategoria === 1 ? "reclamo abierto" : "reclamos abiertos"} sin categoría.
              </strong>{" "}
              Clasifícalos para que el análisis muestre las causas.
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}

const TONOS = {
  teal: { barra: "bg-teal-600", texto: "text-teal-700" },
  amber: { barra: "bg-amber-400", texto: "text-amber-700" },
  red: { barra: "bg-red-500", texto: "text-red-700" },
  green: { barra: "bg-green-500", texto: "text-green-700" },
} as const;

/** Estado actual: cifra grande con su color de estado y enlace a la bandeja. */
function Estado({
  label,
  valor,
  detalle,
  tono,
  href,
}: {
  label: string;
  valor: number;
  detalle: string;
  tono: keyof typeof TONOS;
  href: string;
}) {
  const t = TONOS[tono];
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${t.barra}`} aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`mt-1 text-4xl font-extrabold ${t.texto}`}>{valor}</p>
      <p className="mt-1 flex items-center justify-between text-xs text-slate-500">
        {detalle}
        <span aria-hidden="true" className="text-slate-400 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </p>
    </Link>
  );
}

function Cifra({ label, valor, nota }: { label: string; valor: string; nota: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{nota}</p>
    </div>
  );
}

/**
 * Lo que ve el plan Gratis en lugar de un gráfico. El botón va solo en el
 * gráfico grande (`compacto` = sin botón), para no repetirlo tres veces.
 */
function Bloqueado({ bizId, compacto = false }: { bizId: string; compacto?: boolean }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="flex h-36 items-end gap-3 px-2 opacity-40 blur-[3px]">
        {[40, 65, 30, 80, 55, 90, 45, 70].map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-teal-500" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-slate-900">Disponible en el plan Pro</p>
        {!compacto && (
          <>
            <p className="mt-1 max-w-xs text-xs text-slate-600">Mira cómo evolucionan tus reclamos y cuáles son sus causas.</p>
            <ButtonLink href={`/app/${bizId}/plan`} className="mt-3 px-3 py-1.5 text-xs">
              Ver planes
            </ButtonLink>
          </>
        )}
      </div>
    </div>
  );
}
