"use client";

import { useState } from "react";

/**
 * Gráficos del Resumen, en SVG propio. Reglas que siguen (guía de dataviz):
 * barras de 24px como máximo con la punta redondeada y la base recta, 2px
 * del color del fondo entre segmentos apilados, cuadrícula de un pelo,
 * leyenda siempre que hay dos series, tooltip por barra y la misma
 * información en una tabla para quien no usa el mouse.
 *
 * Paleta validada (reclamo / queja) contra fondo blanco: pasa daltonismo,
 * visión normal y contraste 3:1.
 */
export const COLOR_RECLAMO = "#0d9488";
export const COLOR_QUEJA = "#7c3aed";
const GRID = "#e2e8f0";
const BASE = "#cbd5e1";

export interface Columna {
  etiqueta: string;
  /** Texto largo para el tooltip y la tabla ("Semana del 14 sep"). */
  detalle: string;
  reclamos: number;
  quejas: number;
}

/** Rectángulo con las dos esquinas superiores redondeadas y la base recta. */
function barraArriba(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/**
 * Máximo "redondo" y par del eje, para que la marca del medio también sea
 * un entero (se cuentan reclamos, no hay medio reclamo): 3 → 4, 7 → 8,
 * 13 → 20, 27 → 40.
 */
function techo(n: number) {
  if (n <= 10) return Math.max(2, Math.ceil(n / 2) * 2);
  const paso = n <= 50 ? 10 : Math.pow(10, Math.floor(Math.log10(n)));
  const t = Math.ceil(n / paso) * paso;
  return t % 2 === 0 ? t : t + paso;
}

export function ColumnasPorPeriodo({ datos }: { datos: Columna[] }) {
  const [activa, setActiva] = useState<number | null>(null);

  const W = 640;
  const H = 220;
  const izq = 28;
  const abajo = 26;
  const arriba = 14;
  const alto = H - abajo - arriba;
  const max = techo(Math.max(1, ...datos.map((d) => d.reclamos + d.quejas)));
  const banda = (W - izq) / datos.length;
  const ancho = Math.min(24, banda * 0.6);
  const y = (v: number) => arriba + alto - (v / max) * alto;
  const ticks = [0, max / 2, max];
  const ultima = datos.length - 1;
  const d = activa !== null ? datos[activa] : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_RECLAMO }} />
          Reclamos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_QUEJA }} />
          Quejas
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Reclamos y quejas recibidos por periodo">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={izq} x2={W} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASE : GRID} strokeWidth="1" />
              <text x={izq - 6} y={y(t) + 3.5} textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">
                {t}
              </text>
            </g>
          ))}

          {datos.map((c, i) => {
            const cx = izq + banda * i + banda / 2;
            const x = cx - ancho / 2;
            const total = c.reclamos + c.quejas;
            const yR = y(c.reclamos);
            const hR = arriba + alto - yR;
            const yQ = y(total);
            // 2px del fondo entre reclamo y queja, restados a la queja.
            const hQ = Math.max(0, yR - yQ - (c.reclamos > 0 ? 2 : 0));
            const tenue = activa !== null && activa !== i;
            return (
              <g
                key={c.detalle}
                tabIndex={0}
                role="button"
                aria-label={`${c.detalle}: ${c.reclamos} reclamos, ${c.quejas} quejas`}
                onPointerEnter={() => setActiva(i)}
                onPointerLeave={() => setActiva(null)}
                onFocus={() => setActiva(i)}
                onBlur={() => setActiva(null)}
                className="cursor-default outline-none"
                style={{ opacity: tenue ? 0.45 : 1, transition: "opacity 150ms" }}
              >
                {/* Área de toque: toda la banda, no solo la barra. */}
                <rect x={izq + banda * i} y={arriba} width={banda} height={alto} fill="transparent" />
                {c.reclamos > 0 && (
                  <path
                    d={c.quejas > 0 ? `M${x},${yR}h${ancho}v${hR}h${-ancho}Z` : barraArriba(x, yR, ancho, hR, 4)}
                    fill={COLOR_RECLAMO}
                  />
                )}
                {c.quejas > 0 && hQ > 0 && <path d={barraArriba(x, yQ, ancho, hQ, 4)} fill={COLOR_QUEJA} />}
                {i === ultima && total > 0 && (
                  <text x={cx} y={yQ - 5} textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">
                    {total}
                  </text>
                )}
                <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
                  {c.etiqueta}
                </text>
              </g>
            );
          })}
        </svg>

        {d && activa !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `${((izq + (W - izq) / datos.length * (activa + 0.5)) / W) * 100}%` }}
          >
            <p className="text-slate-500">{d.detalle}</p>
            <p className="mt-1 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="h-0.5 w-3 rounded" style={{ background: COLOR_RECLAMO }} />
                Reclamos
              </span>
              <strong className="text-slate-900">{d.reclamos}</strong>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="h-0.5 w-3 rounded" style={{ background: COLOR_QUEJA }} />
                Quejas
              </span>
              <strong className="text-slate-900">{d.quejas}</strong>
            </p>
          </div>
        )}
      </div>

      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-800">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-slate-400">
            <tr>
              <th className="py-1 font-medium">Periodo</th>
              <th className="py-1 text-right font-medium">Reclamos</th>
              <th className="py-1 text-right font-medium">Quejas</th>
            </tr>
          </thead>
          <tbody className="tabular-nums text-slate-700">
            {datos.map((c) => (
              <tr key={c.detalle} className="border-t border-slate-100">
                <td className="py-1">{c.detalle}</td>
                <td className="py-1 text-right">{c.reclamos}</td>
                <td className="py-1 text-right">{c.quejas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export interface Barra {
  etiqueta: string;
  valor: number;
  /** Enlace a la bandeja filtrada por esta barra. */
  href?: string;
}

/**
 * Barras horizontales de una sola serie (magnitud): un solo color, sin
 * leyenda, ordenadas de mayor a menor y con el valor en la punta.
 */
export function BarrasHorizontales({ datos, total }: { datos: Barra[]; total: number }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <ul className="space-y-2.5">
      {datos.map((d) => {
        const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0;
        const fila = (
          <>
            <span className="w-24 shrink-0 truncate text-slate-600 sm:w-28">{d.etiqueta}</span>
            <span className="relative h-3 flex-1">
              <span
                className="absolute inset-y-0 left-0 rounded-r"
                style={{ width: `${(d.valor / max) * 100}%`, background: COLOR_RECLAMO, minWidth: d.valor ? 4 : 0 }}
              />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-slate-700">
              <strong className="font-semibold text-slate-900">{d.valor}</strong>
              <span className="text-slate-400"> · {pct}%</span>
            </span>
          </>
        );
        return (
          <li key={d.etiqueta}>
            {d.href ? (
              <a
                href={d.href}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-0.5 text-xs transition-colors hover:bg-slate-50"
                title={`${d.etiqueta}: ${d.valor} (${pct}%) — ver en la bandeja`}
              >
                {fila}
              </a>
            ) : (
              <div className="flex items-center gap-3 text-xs">{fila}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
