import { notFound } from "next/navigation";
import { BusinessForm } from "@/components/business-form";
import { CopyButton } from "@/components/copy-button";
import { Alert, Button, Card, Input } from "@/components/ui";
import { deleteBusiness } from "@/lib/actions/business";
import { getAppUrl } from "@/lib/env";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export const metadata = { title: "Ajustes e instalación" };

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ bizId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { bizId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").eq("id", bizId).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const plan = planFor(biz);
  const appUrl = await getAppUrl();
  const publicUrl = `${appUrl}/r/${biz.slug}`;
  const avisoUrl = `${appUrl}/aviso-libro-reclamaciones.svg`;
  const snippet = `<a href="${publicUrl}" target="_blank" rel="noopener" title="Libro de Reclamaciones">\n  <img src="${avisoUrl}" alt="Libro de Reclamaciones" width="240" height="90" />\n</a>`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div className="space-y-10">
      <section id="instalacion" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Instalación</h2>
          <p className="text-sm text-slate-600">
            El reglamento exige que el aviso del Libro de Reclamaciones sea visible y de fácil acceso en tu web (idealmente
            en la página de inicio o el pie de página) y en tu local.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <h3 className="font-semibold text-slate-900">1. Enlace directo</h3>
            <p className="mt-1 text-sm text-slate-600">Úsalo en Instagram, Facebook, WhatsApp Business, tu tienda online o catálogos.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
                {publicUrl}
              </code>
              <CopyButton text={publicUrl} />
            </div>

            <h3 className="mt-6 font-semibold text-slate-900">2. Aviso oficial con enlace (HTML)</h3>
            <p className="mt-1 text-sm text-slate-600">Pega este código en el pie de página de tu sitio (Shopify, WooCommerce, Wix, WordPress…).</p>
            <div className="mt-3 flex flex-col gap-2">
              <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">{snippet}</pre>
              <div className="flex items-center gap-3">
                <CopyButton text={snippet} label="Copiar código" />
                <a href={avisoUrl} download className="text-sm font-semibold text-blue-700 hover:underline">
                  Descargar aviso (SVG)
                </a>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4">
              <p className="mb-2 text-xs text-slate-500">Vista previa:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aviso-libro-reclamaciones.svg" alt="Libro de Reclamaciones" width={240} height={90} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900">3. Código QR para tu local</h3>
            <p className="mt-1 text-sm text-slate-600">Imprímelo y pégalo en caja o mostrador, junto al aviso.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR del libro de reclamaciones de ${biz.name}`} width={220} height={220} className="mx-auto mt-4 rounded-lg border border-slate-200" />
            <a href={qrUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-semibold text-blue-700 hover:underline">
              Abrir QR en grande
            </a>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Datos del negocio</h2>
          <p className="text-sm text-slate-600">Aparecen en la cabecera de cada hoja de reclamación.</p>
        </div>
        <Card>
          <BusinessForm mode="edit" business={biz} canCustomBrand={plan.customBranding} appUrl={appUrl} />
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-red-700">Zona de peligro</h2>
        {sp.error === "confirmacion" && <Alert kind="error">Escribe ELIMINAR para confirmar.</Alert>}
        <Card className="border-red-200">
          <p className="text-sm text-slate-700">
            Eliminar este negocio borrará también todas sus hojas de reclamación. Recuerda que la norma exige conservar los
            registros por al menos dos años. Exporta antes si lo necesitas.
          </p>
          <form action={deleteBusiness} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={biz.id} />
            <Input name="confirm" placeholder="Escribe ELIMINAR" className="max-w-56" required />
            <Button type="submit" variant="danger">
              Eliminar negocio
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
