import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComplaintForm } from "@/components/complaint-form";
import { PoweredBy } from "@/components/powered-by";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { BusinessPublic } from "@/lib/types";

async function loadBusiness(slug: string): Promise<BusinessPublic | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_business_public", { p_slug: slug.toLowerCase() });
  const row = Array.isArray(data) ? data[0] : data;
  return (row as BusinessPublic) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const biz = await loadBusiness(slug);
  if (!biz) return { title: "Libro de Reclamaciones" };
  return {
    title: `Libro de Reclamaciones · ${biz.name}`,
    description: `Registra tu reclamo o queja en el Libro de Reclamaciones Virtual de ${biz.name} (RUC ${biz.ruc}).`,
  };
}

export default async function PublicBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const biz = await loadBusiness(slug);
  if (!biz) notFound();

  const plan = planFor(biz);
  const color = plan.customBranding ? biz.primary_color : "#1d4ed8";
  const logo = plan.customBranding ? biz.logo_url : null;

  return (
    <main className="flex-1 bg-slate-50">
      <div className="h-2 w-full" style={{ backgroundColor: color }} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={biz.name} className="h-14 w-auto max-w-40 object-contain" />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {biz.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{biz.name}</h1>
              <p className="text-sm text-slate-600">RUC {biz.ruc}</p>
              <p className="text-sm text-slate-600">{biz.address}</p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aviso-libro-reclamaciones.svg" alt="Libro de Reclamaciones" width={200} height={75} className="shrink-0" />
        </header>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Libro de Reclamaciones Virtual</h2>
          <p className="mt-2">
            Conforme a lo establecido en el Código de Protección y Defensa del Consumidor (Ley N.º 29571), este
            establecimiento pone a tu disposición su Libro de Reclamaciones. Completa la hoja de reclamación y recibirás
            una copia en tu correo con tu número de registro.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
            <li>
              <strong>Reclamo:</strong> disconformidad relacionada con los productos o servicios.
            </li>
            <li>
              <strong>Queja:</strong> disconformidad no relacionada con los productos o servicios, o malestar respecto a la
              atención al público.
            </li>
            <li>
              El proveedor debe responder en un plazo máximo de <strong>15 días hábiles</strong>. La formulación del reclamo
              no impide acudir a otras vías de solución ni es requisito previo para denunciar ante INDECOPI.
            </li>
          </ul>
        </section>

        <div className="mt-8">
          <ComplaintForm slug={biz.slug} color={color} />
        </div>

        {plan.branding && <PoweredBy />}
      </div>
    </main>
  );
}
