import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/logo";

/**
 * Miniaturas animadas de los tres pasos de "Cómo funciona".
 *
 * Son solo CSS: cada pieza entra con `.anim-ciclo` y un retraso propio
 * (`--d`), todas en el mismo ciclo de 7s. El estado base de cada
 * elemento es el final (visible, completo), así que sin animaciones —o
 * con el movimiento reducido del sistema— la miniatura se ve entera.
 */

const retraso = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function Marco({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="relative mb-5 flex h-44 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-stone-50 to-teal-50/60 p-4"
    >
      {children}
    </div>
  );
}

/** Paso 1: se teclea el RUC y SUNAT completa la razón social. */
export function IlusRegistro() {
  return (
    <Marco>
      <div className="w-full max-w-[15rem] rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">RUC del negocio</p>
        <div className="mt-1 flex h-7 items-center rounded-md border border-teal-500 px-2 ring-2 ring-teal-500/15">
          <span className="anim-teclear inline-block overflow-hidden whitespace-nowrap font-mono text-xs text-slate-800">
            20601234567
          </span>
          <span className="anim-caret ml-px h-3.5 w-px bg-teal-700" />
        </div>
        <div className="anim-ciclo mt-2.5 flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1.5" style={retraso(2.3)}>
          <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-green-600" fill="none">
            <path d="m2.5 6.5 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate text-[11px] font-semibold text-green-800">BODEGA DON LUCHO S.A.C.</span>
        </div>
        <p className="anim-ciclo mt-1 text-[10px] text-slate-400" style={retraso(2.5)}>
          Datos traídos de SUNAT
        </p>
        <div className="anim-ciclo mt-2 truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[10px] text-teal-700" style={retraso(3.3)}>
          libroclaro.pe/r/bodega-don-lucho
        </div>
      </div>
    </Marco>
  );
}

/** Paso 2: el enlace en la biografía de Instagram, y un clic sobre él. */
export function IlusAviso() {
  return (
    <Marco>
      <div className="relative w-full max-w-[15rem] rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px]">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-700">
              DL
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900">bodega.donlucho</p>
            <p className="text-[10px] text-slate-500">Abarrotes · Surco</p>
          </div>
        </div>
        <div className="mt-2.5 space-y-1">
          <div className="h-1.5 w-11/12 rounded-full bg-slate-100" />
          <div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
        </div>
        <div className="anim-enlace mt-2.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-semibold text-teal-700">
          <Icon name="aviso" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Libro de Reclamaciones</span>
        </div>

        {/* Puntero que llega al enlace y hace clic. */}
        <svg viewBox="0 0 16 16" className="anim-puntero absolute bottom-3 left-24 h-5 w-5 drop-shadow" fill="none">
          <path d="M3 1.5v11l3-2.6 2 4.4 2-.9-2-4.3 4-.3z" fill="#0f172a" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>
    </Marco>
  );
}

/** Paso 3: los avisos que llegan al correo del negocio. */
export function IlusRecibe() {
  const avisos = [
    { color: "bg-teal-500", titulo: "Nuevo reclamo N.º 2026-000013", sub: "Tienes 15 días hábiles", d: 0.4 },
    { color: "bg-amber-400", titulo: "Recordatorio N.º 2026-000009", sub: "Vence en 3 días hábiles", d: 1.5 },
    { color: "bg-green-500", titulo: "Respondido N.º 2026-000008", sub: "Copia enviada al consumidor", d: 2.6 },
  ];
  return (
    <Marco>
      <div className="w-full max-w-[15rem] space-y-2">
        {avisos.map((a) => (
          <div
            key={a.titulo}
            className="anim-ciclo flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left shadow-sm"
            style={retraso(a.d)}
          >
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50">
              <LogoMark className="h-4 w-4" />
              <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${a.color}`} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-900">{a.titulo}</p>
              <p className="truncate text-[10px] text-slate-500">{a.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </Marco>
  );
}
