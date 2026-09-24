/* eslint-disable @next/next/no-img-element -- los avisos son SVG estáticos
   de /public y el QR viene del mismo servicio que usa el panel; next/image
   no aporta nada con ninguno de los dos. */
import type { CSSProperties } from "react";
import { getAppUrl } from "@/lib/env";

/** Índice para la cascada del reveal (`--i` en globals.css). */
const paso = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * "Tu aviso, donde tus clientes lo vean": los tres lugares donde la
 * norma pide anunciar el libro, con los archivos reales que entrega el
 * panel. Los avisos son los del Anexo II (local, A4) y Anexo III (web)
 * con la ilustración oficial de INDECOPI. El QR es de verdad: abre el
 * libro de demostración, así quien lo escanee ve cómo funciona.
 */
export async function AvisoLugares() {
  const demoUrl = `${await getAppUrl()}/r/demo`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&color=0b1f1d&data=${encodeURIComponent(demoUrl)}`;

  const tarjeta =
    "reveal group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg";

  return (
    <div className="mt-12 grid gap-5 md:grid-cols-3">
      {/* En el local: el A4 colgado de un clavo, balanceándose apenas. */}
      <div className={tarjeta} style={paso(0)}>
        <div className="relative flex h-60 items-start justify-center overflow-hidden bg-[linear-gradient(#efe9df_1px,transparent_1px),linear-gradient(90deg,#efe9df_1px,transparent_1px)] bg-[size:28px_28px] bg-[#f7f3ec] pt-6">
          <div className="anim-balanceo flex origin-top flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shadow-inner" />
            <svg viewBox="0 0 80 18" className="-mt-1 h-4 w-20 text-slate-400" fill="none" aria-hidden="true">
              <path d="M40 1 6 17M40 1l34 16" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <img
              src="/aviso-libro-reclamaciones-local.svg"
              alt="Aviso del Libro de Reclamaciones en A4 para el local"
              width={128}
              height={181}
              loading="lazy"
              className="-mt-0.5 w-32 rounded-sm shadow-lg ring-1 ring-black/5"
            />
          </div>
        </div>
        <div className="p-6">
          <h3 className="font-semibold text-slate-900">En tu local</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            El aviso en A4 que exige el reglamento, con la ilustración oficial de INDECOPI. Lo imprimes y lo cuelgas
            donde se vea.
          </p>
        </div>
      </div>

      {/* En la web: el aviso del Anexo III en el pie de página. */}
      <div className={tarjeta} style={paso(1)}>
        <div className="flex h-60 items-center justify-center bg-gradient-to-br from-stone-50 to-teal-50/60 p-5">
          <div className="w-full max-w-[16rem] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
            <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
              <span className="ml-1.5 flex-1 truncate rounded bg-white px-1.5 text-[9px] text-slate-400 ring-1 ring-slate-200">
                bodegadonlucho.pe
              </span>
            </div>
            <div className="space-y-1.5 p-3">
              <div className="h-2 w-1/2 rounded-full bg-slate-200" />
              <div className="h-1.5 w-full rounded-full bg-slate-100" />
              <div className="h-1.5 w-5/6 rounded-full bg-slate-100" />
            </div>
            <div className="flex items-end justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5">
              <div className="space-y-1">
                <div className="h-1.5 w-14 rounded-full bg-slate-200" />
                <div className="h-1.5 w-10 rounded-full bg-slate-200" />
              </div>
              <span className="relative">
                <span className="anim-halo absolute -inset-1 rounded-md ring-2 ring-teal-500/60" aria-hidden="true" />
                <img
                  src="/aviso-libro-reclamaciones.svg"
                  alt="Aviso web del Libro de Reclamaciones"
                  width={84}
                  height={50}
                  loading="lazy"
                  className="relative w-[84px] rounded-sm ring-1 ring-slate-200"
                />
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <h3 className="font-semibold text-slate-900">En tu web</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Pegas una línea de código y el aviso oficial queda en el pie de página, enlazado a tu libro. También sirve
            el enlace solo, para Instagram o WhatsApp.
          </p>
        </div>
      </div>

      {/* Con el QR: un código real, con la línea de escaneo pasando. */}
      <div className={tarjeta} style={paso(2)}>
        <div className="flex h-60 items-center justify-center bg-gradient-to-br from-teal-50/60 to-stone-50">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
            <img
              src={qrUrl}
              alt="Código QR del libro de demostración"
              width={132}
              height={132}
              loading="lazy"
              className="h-[132px] w-[132px]"
            />
            <span className="pointer-events-none absolute inset-3 overflow-hidden" aria-hidden="true">
              <span className="anim-escaneo absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent to-teal-400/35">
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-500 shadow-[0_0_8px_#14b8a6]" />
              </span>
            </span>
            {/* Esquinas de visor. */}
            <span className="absolute -left-1 -top-1 h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-teal-600" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-teal-600" aria-hidden="true" />
            <span className="absolute -bottom-1 -left-1 h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-teal-600" aria-hidden="true" />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-teal-600" aria-hidden="true" />
          </div>
        </div>
        <div className="p-6">
          <h3 className="font-semibold text-slate-900">Con tu código QR</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Para el mostrador o la caja: el cliente lo escanea y registra su reclamo en el momento.{" "}
            <span className="font-medium text-teal-700">Pruébalo, este abre el libro de demostración.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
