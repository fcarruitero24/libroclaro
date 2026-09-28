import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { MenuLateral, MenuMovil } from "@/components/panel-menu";
import { Badge } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { getAppUrl } from "@/lib/env";
import { planFor } from "@/lib/plans";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

/**
 * Panel de un negocio: menú lateral con íconos a la izquierda y el
 * contenido a la derecha. En pantallas chicas el menú pasa a una fila de
 * pestañas con íconos bajo la barra superior. Nada de esto se imprime:
 * el aviso A4 sale solo.
 */
export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bizId: string }>;
}) {
  const { bizId } = await params;
  const [user, supabase] = await Promise.all([requireUser(), createClient()]);
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
  const abiertos = count ?? 0;

  return (
    <div className="lg:flex lg:min-h-screen">
      {/* Menú lateral: fijo a la altura de la pantalla y con su propio scroll. */}
      <aside className="no-print hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="px-5 pt-5 pb-4">
          <Logo href="/app" />
        </div>

        <div className="mx-3 mb-4 rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-slate-900" title={biz.name}>
            {biz.name}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <Badge tone={plan.id === "free" ? "slate" : "teal"}>Plan {plan.name}</Badge>
            <Link href="/app/negocios" className="text-xs font-medium text-teal-700 hover:underline">
              Cambiar
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <MenuLateral bizId={biz.id} abiertos={abiertos} />
          <div className="my-4 border-t border-slate-100" />
          <Link
            href="/app/negocios"
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon name="tienda" className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-600" />
            Mis negocios
          </Link>
          <Link
            href={publicUrl}
            target="_blank"
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Icon name="aviso" className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-600" />
            Ver mi libro público
          </Link>
        </div>

        <div className="border-t border-slate-100 p-3">
          <p className="truncate px-3 text-xs text-slate-500" title={user.email ?? ""}>
            {user.email}
          </p>
          <form action={signOut} className="mt-1">
            <button
              type="submit"
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon name="salir" className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-600" />
              Salir
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Barra superior en celular: logo, negocio y salir; debajo el menú. */}
        <div className="no-print border-b border-slate-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
            <Logo href="/app" />
            <form action={signOut}>
              <button type="submit" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Salir
              </button>
            </form>
          </div>
          <div className="mt-2 px-4 sm:px-6">
            <MenuMovil bizId={biz.id} abiertos={abiertos} />
          </div>
        </div>

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
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={publicUrl}
                target="_blank"
                className="max-w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 hover:border-teal-300"
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

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}
