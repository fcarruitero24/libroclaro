import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PanelShell } from "@/components/panel-shell";
import { Badge } from "@/components/ui";
import { getAppUrl } from "@/lib/env";
import { COOKIE_MENU } from "@/lib/panel-prefs";
import { planFor } from "@/lib/plans";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

/**
 * Panel de un negocio. El armazón (menú lateral plegable, cajón en
 * celular y tutorial) es un componente de cliente; aquí se consultan los
 * datos y se pinta la cabecera del negocio. Nada de esto se imprime: el
 * aviso A4 sale solo.
 */
export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bizId: string }>;
}) {
  const { bizId } = await params;
  const [user, supabase, jar] = await Promise.all([requireUser(), createClient(), cookies()]);
  const [{ data }, { count }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", bizId).maybeSingle(),
    // Cuántos esperan respuesta, para el contador del menú.
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("business_id", bizId)
      .in("status", ["pendiente", "en_proceso"]),
  ]);
  if (!data) notFound();
  const biz = data as Business;
  const plan = planFor(biz);
  const appUrl = await getAppUrl();
  const publicUrl = `${appUrl}/r/${biz.slug}`;

  return (
    <PanelShell
      negocio={{ id: biz.id, name: biz.name, plan: plan.name, gratis: plan.id === "free" }}
      abiertos={count ?? 0}
      email={user.email ?? ""}
      publicUrl={publicUrl}
      plegadoInicial={jar.get(COOKIE_MENU)?.value === "plegado"}
      verTutorial={!user.user_metadata?.tutorial_panel_visto}
    >
      {/* Cabecera del negocio: nombre y el enlace del libro, siempre a mano. */}
      <div className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-900">{biz.name}</h1>
              <span className="lg:hidden">
                <Badge tone={plan.id === "free" ? "slate" : "teal"}>Plan {plan.name}</Badge>
              </span>
              {biz.archived_at && <Badge tone="amber">Archivado</Badge>}
            </div>
            <p className="truncate text-sm text-slate-500">
              RUC {biz.ruc} · {biz.address}
            </p>
          </div>
          <div data-tour="enlace" className="flex flex-wrap items-center gap-2 rounded-xl">
            <Link
              href={publicUrl}
              target="_blank"
              className="max-w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 transition-colors hover:border-teal-300"
              title="Abrir formulario público"
            >
              {publicUrl.replace(/^https?:\/\//, "")}
            </Link>
            <CopyButton text={publicUrl} label="Copiar enlace" />
          </div>
        </div>
        {biz.archived_at && (
          <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Este libro está archivado y no acepta reclamos nuevos. Sus hojas siguen guardadas. Puedes reactivarlo en
              Ajustes.
            </p>
          </div>
        )}
      </div>

      <main className="panel-contenido mx-auto max-w-6xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">{children}</main>
    </PanelShell>
  );
}
