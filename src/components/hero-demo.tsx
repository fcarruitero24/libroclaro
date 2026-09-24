"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

const RESPUESTA =
  "Hola María, lamentamos lo ocurrido. Te cambiamos el producto sin costo esta semana; te escribimos para coordinar el recojo.";

/** Milisegundos por letra al "teclear" la respuesta. */
const TECLEO_MS = 28;

/**
 * Fases del bucle:
 * 0 · llega el reclamo (aviso arriba, hoja pendiente)
 * 1 · el negocio escribe la respuesta
 * 2 · respondido a tiempo y copia enviada al consumidor
 */
type Fase = 0 | 1 | 2;

/**
 * Tarjeta del hero que cuenta el ciclo de un reclamo en bucle.
 *
 * El primer pintado (servidor y cliente) es la fase 0 completa, igual
 * a la tarjeta estática que había antes, así que no hay salto al
 * hidratar. Todo lo que cambia de contenido vive en celdas apiladas
 * de una misma grilla: la tarjeta mide siempre lo mismo y el titular
 * de al lado no se mueve.
 *
 * El bucle se detiene fuera de pantalla o con la pestaña oculta, y no
 * arranca si el sistema pide menos movimiento.
 */
export function HeroDemo() {
  const raiz = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState(false);
  const [fase, setFase] = useState<Fase>(0);
  const [letras, setLetras] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = raiz.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let visible = false;
    const actualizar = () => setActivo(visible && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      actualizar();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, []);

  useEffect(() => {
    if (!activo) return;

    if (fase === 0) {
      const t = window.setTimeout(() => {
        setLetras(0);
        setFase(1);
      }, 2600);
      return () => window.clearTimeout(t);
    }

    if (fase === 1) {
      if (letras < RESPUESTA.length) {
        const t = window.setTimeout(() => setLetras((n) => n + 1), TECLEO_MS);
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setFase(2), 700);
      return () => window.clearTimeout(t);
    }

    const t = window.setTimeout(() => setFase(0), 4200);
    return () => window.clearTimeout(t);
  }, [activo, fase, letras]);

  const respondido = fase === 2;
  const escribiendo = fase >= 1;

  return (
    <div ref={raiz} className="relative">
      {/* Aviso de reclamo nuevo: flota sobre el borde de la tarjeta. */}
      <div
        aria-hidden="true"
        className={`anim-toast-in absolute -top-5 right-4 z-20 flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-lg transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          fase === 0 ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white">
          <span className={`absolute inset-0 rounded-full bg-teal-500 ${fase === 0 && activo ? "anim-ping-once" : ""}`} />
          <Icon name="campana" className="relative h-3 w-3" />
        </span>
        Nuevo reclamo recibido
      </div>

      <div className="anim-rise-in rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoja de reclamación</p>
            <p className="text-xl font-bold text-slate-900">N.º 2026-000012</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-300 ${
              respondido ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
            }`}
          >
            {respondido && (
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden="true">
                <path
                  d="m2.5 6.5 2.2 2.2 4.8-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="anim-check-mini"
                />
              </svg>
            )}
            {respondido ? "Respondido" : "Pendiente"}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Consumidor</dt>
            <dd className="font-medium text-slate-900">María Q.</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tipo</dt>
            <dd className="font-medium text-slate-900">Reclamo · Producto</dd>
          </div>
          <div>
            <dt className="text-slate-500">Monto</dt>
            <dd className="font-medium text-slate-900">S/ 189.00</dd>
          </div>
          <div>
            <dt className="text-slate-500">Plazo</dt>
            <dd className="grid font-medium">
              <span
                className={`col-start-1 row-start-1 text-amber-700 transition-opacity duration-300 ${respondido ? "opacity-0" : ""}`}
              >
                Vence en 3 días hábiles
              </span>
              <span
                className={`col-start-1 row-start-1 text-green-700 transition-opacity duration-300 ${respondido ? "" : "opacity-0"}`}
              >
                Respondido a tiempo
              </span>
            </dd>
            {/* 12 de 15 días hábiles consumidos. */}
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-[width,background-color] duration-700 ease-out ${
                  respondido ? "w-full bg-green-500" : "w-4/5 bg-amber-400"
                }`}
              />
            </div>
          </div>
        </dl>

        {/* Reclamo y respuesta en la misma celda: la caja mide lo que el
            más largo de los dos, así la tarjeta no cambia de alto. */}
        <div className="mt-5 grid text-sm">
          <div
            className={`col-start-1 row-start-1 rounded-lg bg-slate-50 p-3 text-slate-700 transition duration-300 ${
              escribiendo ? "pointer-events-none -translate-y-1 opacity-0" : ""
            }`}
          >
            <p className="mb-1 text-xs font-semibold text-slate-500">Reclamo del consumidor</p>
            &ldquo;El producto llegó con la caja dañada y no encendía. Solicito el cambio o la devolución del
            dinero.&rdquo;
          </div>
          <div
            aria-hidden="true"
            className={`col-start-1 row-start-1 rounded-lg border border-teal-200 bg-teal-50/60 p-3 text-slate-800 transition duration-300 ${
              escribiendo ? "" : "translate-y-1 opacity-0"
            }`}
          >
            <p className="mb-1 text-xs font-semibold text-teal-800">Tu respuesta</p>
            {RESPUESTA.slice(0, letras)}
            {fase === 1 && <span className="anim-caret ml-px inline-block h-4 w-0.5 translate-y-0.5 bg-teal-700" />}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <span
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition duration-200 ${
              fase === 1 ? "scale-[0.97] bg-teal-800" : "bg-teal-700"
            }`}
          >
            {respondido ? "Respuesta enviada" : fase === 1 ? "Escribiendo…" : "Responder"}
          </span>
          <span className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Ver hoja
          </span>
        </div>
      </div>

      {/* La copia al consumidor: primero la de su reclamo, luego la de
          la respuesta. El `key` reinicia la entrada en cada cambio.
          Cuelga del borde inferior sin llegar al botón: con -bottom-4
          tapaba el texto de "Responder". */}
      <div
        key={respondido ? "respuesta" : "reclamo"}
        className="anim-fade-rise absolute -bottom-12 -left-4 z-20 hidden items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Icon name="correo" className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs text-slate-500">{respondido ? "Respuesta enviada a" : "Copia enviada a"}</p>
          <p className="text-sm font-semibold text-slate-900">maria@correo.com ✓</p>
        </div>
      </div>
    </div>
  );
}
