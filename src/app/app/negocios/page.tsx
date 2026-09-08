import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { PLANS, planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export const metadata = { title: "Mis negocios" };

export default async function BusinessesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").order("created_at", { ascending: true });
  const businesses = (data ?? []) as Business[];
  const maxAllowed = Math.max(PLANS.free.maxBusinesses, ...businesses.map((b) => planFor(b).maxBusinesses));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis negocios</h1>
          <p className="text-sm text-slate-600">
            {businesses.length} de {maxAllowed} permitidos por tu plan.
          </p>
        </div>
        {businesses.length < maxAllowed ? (
          <ButtonLink href="/app/nuevo">Agregar negocio</ButtonLink>
        ) : (
          <ButtonLink href={businesses[0] ? `/app/${businesses[0].id}/plan` : "/app/nuevo"} variant="secondary">
            Mejorar plan para agregar sucursales
          </ButtonLink>
        )}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {businesses.map((b) => {
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
        {businesses.length === 0 && (
          <Card className="sm:col-span-2">
            <p className="text-slate-600">Aún no has registrado ningún negocio.</p>
            <ButtonLink href="/app/nuevo" className="mt-4">
              Registrar mi negocio
            </ButtonLink>
          </Card>
        )}
      </div>
    </main>
  );
}
