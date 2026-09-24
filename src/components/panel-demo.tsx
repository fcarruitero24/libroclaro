"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { type FaseAparicion, useAparicion } from "@/components/use-aparicion";

type Estado = "Pendiente" | "En proceso" | "Respondido";

const RECLAMOS: {
  codigo: string;
  nombre: string;
  tipo: "Reclamo" | "Queja";
  estado: Estado;
  /** Días hábiles que le quedan de los 15; null si ya se respondió. */
  dias: number | null;
}[] = [
  { codigo: "2026-000013", nombre: "Carlos R.", tipo: "Reclamo", estado: "Pendiente", dias: 14 },
  { codigo: "2026-000012", nombre: "María Q.", tipo: "Reclamo", estado: "En proceso", dias: 3 },
  { codigo: "2026-000011", nombre: "Lucía P.", tipo: "Queja", estado: "Pendiente", dias: 9 },
  { codigo: "2026-000010", nombre: "Jorge M.", tipo: "Reclamo", estado: "Respondido", dias: null },
];

const STATS = [
  { label: "Abiertos", valor: 3, color: "text-teal-700" },
  { label: "Por vencer", valor: 1, color: "text-amber-700" },
  { label: "Vencidos", valor: 0, color: "text-red-700" },
  { label: "Respondidos", valor: 12, color: "text-green-700" },
];

const ESTADO_TONO: Record<Estado, string> = {
  Pendiente: "bg-amber-100 text-amber-900",
  "En proceso": "bg-teal-100 text-teal-800",
  Respondido: "bg-green-100 text-green-800",
};

/** Mismos cortes que `urgencyFor`: ≤3 días hábiles es "pronto". */
function colorPlazo(dias: number | null) {
  if (dias === null) return { barra: "bg-green-500", texto: "text-green-700" };
  if (dias <= 3) return { barra: "bg-amber-400", texto: "text-amber-700" };
  return { barra: "bg-teal-500", texto: "text-slate-600" };
}

/** Número que cuenta de 0 a `valor` cuando el panel aparece. */
function Contador({ valor, fase }: { valor: number; fase: FaseAparicion }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (fase !== "visible") return;
    let raf = 0;
    const inicio = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - inicio) / 900);
      setN(Math.round(valor * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fase, valor]);

  return <>{fase === "final" ? valor : n}</>;
}

/**
 * Maqueta del panel de reclamos. Reproduce el aspecto de /app/[bizId]
 * (contadores arriba, lista con estado y plazo) con datos de ejemplo.
 * Las barras de plazo se llenan y los contadores suben al aparecer; sin
 * JavaScript o con movimiento reducido se ve todo en su valor final.
 */
export function PanelDemo() {
  const { ref, fase } = useAparicion<HTMLDivElement>();
  const oculto = fase === "armado";
  // Las transiciones solo al aparecer: al armarse, el paso a cero es
  // instantáneo (y fuera de pantalla).
  const anima = fase === "visible";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/40"
    >
      {/* Barra de ventana. */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
        <span className="ml-3 hidden flex-1 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200 sm:block">
          libroclaro.pe/app/bodega-don-lucho
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <p className="text-sm font-semibold text-slate-900">Bodega Don Lucho</p>
          </div>
          <span className="relative text-slate-500">
            <Icon name="campana" className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              1
            </span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-200 p-2 sm:p-3">
              <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">{s.label}</p>
              <p className={`mt-0.5 text-xl font-extrabold tabular-nums sm:text-2xl ${s.color}`}>
                <Contador valor={s.valor} fase={fase} />
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {RECLAMOS.map((r, i) => {
            const c = colorPlazo(r.dias);
            const ancho = r.dias === null ? 100 : (r.dias / 15) * 100;
            return (
              <div
                key={r.codigo}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  anima ? "transition duration-500 ease-out" : ""
                } ${oculto ? "translate-y-2 opacity-0" : ""}`}
                style={{ transitionDelay: anima ? `${150 + i * 110}ms` : undefined }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-800">{r.codigo}</span>
                    <span
                      className={`hidden rounded-full px-1.5 py-px text-[10px] font-semibold sm:inline ${
                        r.tipo === "Queja" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.tipo}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-600">{r.nombre}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_TONO[r.estado]}`}>
                  {r.estado}
                </span>
                <div className="w-20 shrink-0 sm:w-28">
                  <p className={`text-right text-[10px] font-semibold ${c.texto}`}>
                    {r.dias === null ? "A tiempo" : `${r.dias} d.h.`}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${c.barra} ${anima ? "transition-[width] duration-700 ease-out" : ""}`}
                      style={{
                        width: oculto ? "0%" : `${ancho}%`,
                        transitionDelay: anima ? `${400 + i * 110}ms` : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
