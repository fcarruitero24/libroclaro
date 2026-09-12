import Link from "next/link";
import { notFound } from "next/navigation";
import { BizTabs } from "@/components/biz-tabs";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui";
import { getAppUrl } from "@/lib/env";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bizId: string }>;
}) {
  const { bizId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").eq("id", bizId).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const plan = planFor(biz);
  const appUrl = await getAppUrl();
  const publicUrl = `${appUrl}/r/${biz.slug}`;

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{biz.name}</h1>
                <Badge tone={plan.id === "free" ? "slate" : "teal"}>Plan {plan.name}</Badge>
                {biz.archived_at && <Badge tone="amber">Archivado</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
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
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Este libro está archivado y no acepta reclamos nuevos. Sus hojas siguen guardadas. Puedes reactivarlo en
              Ajustes.
            </p>
          )}
          <div className="mt-5">
            <BizTabs bizId={biz.id} />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
