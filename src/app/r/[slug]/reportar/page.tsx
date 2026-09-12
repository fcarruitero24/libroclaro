import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { ReportForm } from "@/components/report-form";
import { Alert, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { BusinessPublic } from "@/lib/types";

export const metadata: Metadata = {
  title: "Reportar un libro",
  robots: { index: false, follow: false },
};

export default async function ReportarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_business_public", { p_slug: slug.toLowerCase() });
  const biz = (Array.isArray(data) ? data[0] : data) as BusinessPublic | undefined;
  if (!biz) notFound();

  return (
    <main className="flex-1 bg-slate-50 py-12">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <div className="text-center">
          <Logo className="justify-center" />
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Reportar este libro de reclamaciones</h1>
        </div>

        <Card className="mt-6">
          {sp.enviado ? (
            <div className="space-y-4">
              <Alert kind="success">
                Recibimos tu reporte. Vamos a revisarlo y te escribiremos al correo que dejaste.
              </Alert>
              <p className="text-sm text-slate-600">
                Si se confirma que el libro no pertenece a tu empresa, lo desactivamos y liberamos el RUC para que
                puedas registrarlo tú.
              </p>
              <Link href="/" className="block text-center text-sm font-semibold text-teal-700 hover:underline">
                Ir a LibroClaro
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Libro reportado</p>
                <p className="mt-0.5 font-semibold text-slate-900">{biz.name}</p>
                <p className="text-xs text-slate-600">
                  RUC {biz.ruc} · /r/{biz.slug}
                </p>
              </div>

              <p className="mb-6 text-sm text-slate-600">
                Usa este formulario solo si eres el titular o representante de la empresa con este RUC y este libro no
                fue creado por ti. Si lo que quieres es presentar un reclamo como consumidor,{" "}
                <Link href={`/r/${biz.slug}`} className="font-semibold text-teal-700 hover:underline">
                  vuelve al formulario
                </Link>
                .
              </p>

              <ReportForm slug={biz.slug} />
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
