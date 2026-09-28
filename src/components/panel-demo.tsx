"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { type FaseAparicion, useAparicion } from "@/components/use-aparicion";

type Estado = "Pendiente" | "En proceso" | "Respondido";

type Reclamo = {
  codigo: string;
  nombre: string;
  tipo: "Reclamo" | "Queja";
  estado: Estado;
  /** Días hábiles que le quedan de los 15; null si ya se respondió. */
  dias: number | null;
};

/** El que "llega" en vivo a mitad de la animación. */
const NUEVO: Reclamo = { codigo: "2026-000014", nombre: "Ana T.", tipo: "Reclamo", estado: "Pendiente", dias: 15 };

const RECLAMOS: Reclamo[] = [
  { codigo: "2026-000013", nombre: "Carlos R.", tipo: "Reclamo", estado: "Pendiente", dias: 14 },
  { codigo: "2026-000012", nombre: "María Q.", tipo: "Reclamo", estado: "En proceso", dias: 3 },
  { codigo: "2026-000011", nombre: "Lucía P.", tipo: "Queja", estado: "Pendiente", dias: 9 },
  { codigo: "2026-000010", nombre: "Jorge M.", tipo: "Reclamo", estado: "Respondido", dias: null },
];

/** `antes` es lo que se cuenta al aparecer; `despues`, tras llegar el nuevo. */
const STATS = [
  { label: "Abiertos", antes: 3, despues: 4, color: "text-teal-700" },
  { label: "Por vencer", antes: 1, despues: 1, color: "text-amber-700" },
  { label: "Vencidos", antes: 0, despues: 0, color: "text-red-700" },
  { label: "Respondidos", antes: 12, despues: 12, color: "text-green-700" },
];

const ESTADO_TONO: Record<Estado, string> = {
  Pendiente: "bg-amber-100 text-amber-900",
  "En proceso": "bg-teal-100 text-teal-800",
  Respondido: "bg-green-100 text-green-800",
};

/**
 * Alto fijo de cada fila, borde incluido. La lista se desliza con
 * `transform` una fila exacta cuando entra el reclamo nuevo, y eso solo
 * cuadra si todas miden lo mismo. El contenido (dos líneas cortas y
 * truncadas) entra con holgura también en celular.
 */
const ALTO_FILA = 52;
const FILAS_VISIBLES = 4;

/** Cuánto después de aparecer llega el reclamo nuevo: ya terminó de armarse todo lo demás. */
const LLEGADA_MS = 1900;

/** La curva del resto de la landing: arranca rápido y frena largo. */
const CURVA = "ease-[cubic-bezier(0.22,1,0.36,1)]";

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
 *
 * Al aparecer cuenta una historia corta, una sola vez: se arma el panel
 * (contadores, filas, barras de plazo) y, ya quieto, llega un reclamo
 * nuevo: suena la campana, entra la fila por arriba empujando la lista y
 * "Abiertos" sube de 3 a 4. Es lo que el negocio vive de verdad, y se ve
 * sin leer nada. No se repite en bucle: una vez contada, queda quieta.
 *
 * Sin JavaScript o con movimiento reducido se ve directo el final: el
 * reclamo nuevo arriba, la campana con su aviso y los números completos.
 * Todo lo que se mueve usa `transform`, `opacity`, `filter` o
 * `clip-path`, nada que obligue a recalcular el diseño de la página.
 */
export function PanelDemo() {
  const { ref, fase } = useAparicion<HTMLDivElement>();
  const oculto = fase === "armado";
  // Las transiciones solo al aparecer: al armarse, el paso a cero es
  // instantáneo (y fuera de pantalla).
  const anima = fase === "visible";

  const [llego, setLlego] = useState(false);
  useEffect(() => {
    if (fase !== "visible") return;
    const t = window.setTimeout(() => setLlego(true), LLEGADA_MS);
    return () => window.clearTimeout(t);
  }, [fase]);
  const trasLlegada = fase === "final" || llego;

  const filas = [NUEVO, ...RECLAMOS];

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
            <span className={`block ${llego ? "panel-campana" : ""}`}>
              <Icon name="campana" className="h-5 w-5" />
            </span>
            <span
              className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ${
                trasLlegada ? "" : "scale-50 opacity-0 blur-[2px]"
              } ${anima ? `transition duration-300 ${CURVA}` : ""}`}
            >
              1
            </span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-200 p-2 sm:p-3">
              <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">{s.label}</p>
              <p className={`mt-0.5 text-xl font-extrabold tabular-nums sm:text-2xl ${s.color}`}>
                {fase === "final" ? (
                  s.despues
                ) : llego && s.despues !== s.antes ? (
                  // La key nueva monta otro span y así corre el pop.
                  <span key="despues" className="panel-pop inline-block">
                    {s.despues}
                  </span>
                ) : (
                  <Contador valor={s.antes} fase={fase} />
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Ventana de cuatro filas: el reclamo nuevo espera justo encima,
            recortado, y al llegar la lista baja una fila; la última sale
            por abajo. Así el alto no cambia y la página no salta. */}
        <div
          className="mt-4 overflow-hidden rounded-lg border border-slate-200"
          // −1: el borde inferior de la cuarta fila queda bajo el del marco.
          style={{ height: FILAS_VISIBLES * ALTO_FILA - 1 + 2 }}
        >
          <div
            className={anima ? `transition-transform duration-500 ${CURVA}` : ""}
            style={{ transform: trasLlegada ? "none" : `translateY(-${ALTO_FILA}px)` }}
          >
            {filas.map((r, i) => {
              const esNuevo = r === NUEVO;
              // Puesto en la cascada de entrada; el nuevo no participa.
              const puesto = i - 1;
              const c = colorPlazo(r.dias);
              const ancho = r.dias === null ? 100 : (r.dias / 15) * 100;
              // La barra del nuevo se llena apenas termina de entrar.
              const llena = esNuevo ? trasLlegada : !oculto;
              const retrasoBarra = esNuevo ? 250 : 400 + puesto * 110;

              return (
                <div
                  key={r.codigo}
                  className={`relative flex items-center gap-3 border-b border-slate-100 px-3 ${
                    anima ? `transition duration-500 ${CURVA}` : ""
                  } ${
                    esNuevo
                      ? trasLlegada
                        ? ""
                        : "opacity-0"
                      : oculto
                        ? "translate-y-2 opacity-0 blur-[2px]"
                        : ""
                  }`}
                  style={{
                    height: ALTO_FILA,
                    transitionDelay: anima && !esNuevo ? `${150 + puesto * 110}ms` : undefined,
                  }}
                >
                  {esNuevo && (
                    // Resaltado del recién llegado: se desvanece solo.
                    <span
                      className={`pointer-events-none absolute inset-0 bg-teal-50 ${
                        llego ? "opacity-0 transition-opacity delay-[900ms] duration-[1200ms]" : ""
                      } ${fase === "final" ? "opacity-0" : ""}`}
                    />
                  )}
                  <div className="relative min-w-0 flex-1">
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
                  <span
                    className={`relative shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_TONO[r.estado]}`}
                  >
                    {r.estado}
                  </span>
                  <div className="relative w-20 shrink-0 sm:w-28">
                    <p className={`text-right text-[10px] font-semibold ${c.texto}`}>
                      {r.dias === null ? "A tiempo" : `${r.dias} d.h.`}
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      {/* Se llena recortando con clip-path, no con width: no
                          toca el diseño y las puntas siguen redondas a
                          cualquier largo (scaleX las aplastaría). */}
                      <div
                        className={`h-full ${c.barra} ${anima ? `transition-[clip-path] duration-700 ${CURVA}` : ""}`}
                        style={{
                          clipPath: `inset(0 ${llena ? 100 - ancho : 100}% 0 0 round 9999px)`,
                          transitionDelay: anima ? `${retrasoBarra}ms` : undefined,
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
    </div>
  );
}
