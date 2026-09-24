/* eslint-disable @next/next/no-img-element -- la ilustración es un SVG de
   /public y el QR viene del mismo servicio que usa Ajustes; ninguno gana
   nada con next/image, y al imprimir conviene la imagen tal cual. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { getAppUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

export const metadata = { title: "Aviso para tu local" };

/**
 * Aviso del Anexo II del D.S. 011-2011-PCM en A4, con los datos del
 * negocio. Lo que exige la norma va igual que en el aviso genérico: la
 * ilustración oficial de INDECOPI, el texto del anexo y el correo de
 * INDECOPI al pie. Lo que se agrega (razón social, RUC y el QR del libro)
 * va arriba y abajo, sin tocar ese bloque.
 */
export default async function AvisoPage({ params }: { params: Promise<{ bizId: string }> }) {
  const { bizId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("*").eq("id", bizId).maybeSingle();
  if (!data) notFound();
  const biz = data as Business;
  const publicUrl = `${await getAppUrl()}/r/${biz.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div>
      {/* Al imprimir, la hoja ocupa el A4 completo sin márgenes del navegador. */}
      <style>{`
        @media print { @page { size: A4; margin: 0; } }
        @media screen { .hoja-a4 { zoom: 0.72; } }
      `}</style>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/app/${bizId}/ajustes#instalacion`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Volver a instalación
          </Link>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Aviso para tu local (A4)</h2>
          <p className="text-sm text-slate-600">
            El aviso oficial con tu razón social y el QR de tu libro. Imprímelo en A4 y cuélgalo donde se vea.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="flex justify-center print:block">
        <article className="hoja-a4 relative box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[10mm] text-center text-slate-900 shadow-xl ring-1 ring-slate-200 print:shadow-none print:ring-0">
          <div className="flex flex-1 flex-col border-2 border-slate-800 px-[12mm] py-[10mm]">
            <p className="text-[17pt] font-bold leading-tight">{biz.name}</p>
            <p className="mt-[1.5mm] text-[10.5pt] text-slate-600">
              RUC {biz.ruc} · {biz.address}
            </p>

            <img
              src="/aviso-libro-reclamaciones.svg"
              alt="Libro de Reclamaciones"
              className="mx-auto mt-[8mm] w-[150mm]"
            />

            <p className="mx-auto mt-[8mm] max-w-[165mm] text-[19pt] leading-[1.6]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              Conforme a lo establecido en el Código de Protección y Defensa del Consumidor este establecimiento cuenta
              con un Libro de Reclamaciones (<strong>virtual</strong>) a tu disposición. Solicítalo para registrar una
              queja o reclamo
            </p>

            <div className="mt-auto flex items-center justify-center gap-[7mm] pt-[6mm]">
              <img src={qrUrl} alt={`QR del libro de ${biz.name}`} className="h-[36mm] w-[36mm]" />
              <div className="text-left">
                <p className="text-[13pt] font-bold leading-snug">
                  Escanea el código
                  <br />
                  para registrar tu reclamo
                </p>
                <p className="mt-[2mm] text-[9.5pt] text-slate-600">o entra a</p>
                <p className="text-[10.5pt] font-semibold">{publicUrl.replace(/^https?:\/\//, "")}</p>
              </div>
            </div>

            <p className="mt-[7mm] text-[8.5pt] text-slate-700" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              En caso de negativa de entrega del libro escribe a libroreclamaciones@indecopi.gob.pe
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
