import Link from "next/link";
import { restoreBusiness } from "@/lib/actions/business";
import { Alert, Badge, Button, ButtonLink, Card } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { PLANS, planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export const metadata = { title: "Mis negocios" };

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ archivado?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").order("created_at", { ascending: true });
  const all = (data ?? []) as Business[];
  const active = all.filter((b) => !b.archived_at);
  const archived = all.filter((b) => b.archived_at);
  const maxAllowed = Math.max(PLANS.free.maxBusinesses, ...active.map((b) => planFor(b).maxBusinesses));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis negocios</h1>
          <p className="text-sm text-slate-600">
            {active.length} de {maxAllowed} activos según tu plan.
          </p>
        </div>
        {active.length < maxAllowed ? (
          <ButtonLink href="/app/nuevo">Agregar negocio</ButtonLink>
        ) : (
          <ButtonLink href={active[0] ? `/app/${active[0].id}/plan` : "/app/nuevo"} variant="secondary">
            Mejorar plan para agregar sucursales
          </ButtonLink>
        )}
      </div>

      {sp.archivado && (
        <Alert kind="success" className="mt-6">
          Libro archivado. Ya no acepta reclamos nuevos, y sus hojas quedan guardadas y consultables.
        </Alert>
      )}
      {sp.error === "cupo" && (
        <Alert kind="warning" className="mt-6">
          No puedes reactivar este libro porque tu plan ya tiene el máximo de negocios activos. Archiva otro o mejora tu
          plan.
        </Alert>
      )}
      {sp.error === "restaurar" && (
        <Alert kind="error" className="mt-6">
          No se pudo reactivar el libro. Intenta de nuevo.
        </Alert>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {active.map((b) => {
          const plan = planFor(b);
          return (
            <Link key={b.id} href={`/app/${b.id}`} className="block">
              <Card className="h-full transition hover:border-blue-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">RUC {b.ruc}</p>
                  </div>
                  <Badge tone={plan.id === "free" ? "slate" : "blue"}>{plan.name}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">/r/{b.slug}</p>
                <p className="mt-1 text-xs text-slate-500">{b.complaint_seq} reclamo(s) registrados</p>
              </Card>
            </Link>
          );
        })}
        {active.length === 0 && (
          <Card className="sm:col-span-2">
            <p className="text-slate-600">No tienes ningún libro activo.</p>
            <ButtonLink href="/app/nuevo" className="mt-4">
              Registrar mi negocio
            </ButtonLink>
          </Card>
        )}
      </div>

      {archived.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-slate-900">Archivados</h2>
          <p className="mt-1 text-sm text-slate-600">
            Estos libros no reciben reclamos nuevos. Conservamos sus hojas porque la norma obliga a guardarlas por al
            menos dos años, y los enlaces que ya tienen tus clientes siguen funcionando.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {archived.map((b) => (
              <Card key={b.id} className="h-full bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">RUC {b.ruc}</p>
                  </div>
                  <Badge tone="amber">Archivado</Badge>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Archivado el {fmtDate(b.archived_at as string)} · {b.complaint_seq} reclamo(s) conservados
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <form action={restoreBusiness}>
                    <input type="hidden" name="id" value={b.id} />
                    <Button type="submit" variant="secondary">
                      Reactivar
                    </Button>
                  </form>
                  <Link href={`/app/${b.id}`} className="text-sm font-semibold text-blue-700 hover:underline">
                    Ver hojas
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
