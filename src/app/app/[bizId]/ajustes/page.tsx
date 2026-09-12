import { notFound } from "next/navigation";
import { AvisoOpciones } from "@/components/aviso-opciones";
import { BusinessForm } from "@/components/business-form";
import { CopyButton } from "@/components/copy-button";
import { Alert, Button, Card, Input } from "@/components/ui";
import { archiveBusiness, restoreBusiness } from "@/lib/actions/business";
import { getAppUrl } from "@/lib/env";
import { fmtDate } from "@/lib/format";
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

            <h3 className="mt-6 font-semibold text-slate-900">2. Aviso para tu web (HTML)</h3>
            <p className="mt-1 text-sm text-slate-600">
              Elige el estilo que encaje con tu sitio y pega el código en el pie de página (Shopify, WooCommerce, Wix,
              WordPress…). Los tres llevan al mismo formulario.
            </p>
            <div className="mt-4">
              <AvisoOpciones publicUrl={publicUrl} avisoUrl={avisoUrl} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-900">3. Código QR para tu local</h3>
            <p className="mt-1 text-sm text-slate-600">Imprímelo y pégalo en caja o mostrador, junto al aviso.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt={`QR del libro de reclamaciones de ${biz.name}`} width={220} height={220} className="mx-auto mt-4 rounded-lg border border-slate-200" />
            <a href={qrUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-semibold text-teal-700 hover:underline">
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
        <h2 className="text-lg font-bold text-slate-900">Cerrar este libro</h2>
        {sp.error === "confirmacion" && <Alert kind="error">Escribe ARCHIVAR para confirmar.</Alert>}
        {sp.error === "archivar" && <Alert kind="error">No se pudo archivar el libro. Intenta de nuevo.</Alert>}

        {biz.archived_at ? (
          <Card className="border-amber-200 bg-amber-50/40">
            <p className="text-sm text-slate-700">
              Este libro está <strong>archivado</strong> desde el {fmtDate(biz.archived_at)}. No acepta reclamos nuevos,
              pero sus hojas siguen guardadas y los consumidores pueden seguir consultando las suyas.
            </p>
            <form action={restoreBusiness} className="mt-4">
              <input type="hidden" name="id" value={biz.id} />
              <Button type="submit">Reactivar este libro</Button>
            </form>
          </Card>
        ) : (
          <Card className="border-slate-200">
            <p className="text-sm text-slate-700">
              Si dejas de usar este libro, archívalo. El formulario público deja de aceptar reclamos nuevos y el negocio
              sale de tu panel, liberando un cupo de tu plan.
            </p>
            <p className="mt-3 text-sm text-slate-700">
              <strong>No borramos tus hojas de reclamación.</strong> El reglamento obliga al proveedor a conservarlas por
              al menos dos años, así que quedan archivadas y los enlaces que ya recibieron tus clientes siguen
              funcionando. Puedes reactivar el libro cuando quieras.
            </p>
            <form action={archiveBusiness} className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={biz.id} />
              <Input name="confirm" placeholder="Escribe ARCHIVAR" className="max-w-56" required />
              <Button type="submit" variant="secondary">
                Archivar libro
              </Button>
            </form>
          </Card>
        )}
      </section>
    </div>
  );
}
