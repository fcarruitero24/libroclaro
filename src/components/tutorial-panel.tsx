"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Paso = { tour: string; titulo: string; texto: string };

/**
 * Cinco pasos, lo mínimo para empezar a usar el libro. Cada uno apunta a
 * un elemento con `data-tour`; si no está a la vista (celular, menú
 * cerrado), la tarjeta sale centrada y el paso se entiende igual.
 * No promete funciones de un plan que el negocio quizá no tenga.
 */
const PASOS: Paso[] = [
  {
    tour: "enlace",
    titulo: "Este es el enlace de tu libro",
    texto: "Cópialo y ponlo en tu web, tu Instagram o tu catálogo de WhatsApp. Ahí tus clientes registran sus reclamos.",
  },
  {
    tour: "ajustes",
    titulo: "Descarga tu aviso y tu QR",
    texto: "INDECOPI exige exhibir el aviso del libro. En Ajustes e instalación tienes el aviso oficial para imprimir y el QR para tu local.",
  },
  {
    tour: "reclamos",
    titulo: "Aquí llegan los reclamos",
    texto: "Cada reclamo entra numerado a esta bandeja. El número a la derecha te dice cuántos esperan tu respuesta.",
  },
  {
    tour: "inicio",
    titulo: "Responde dentro de 15 días hábiles",
    texto: "En Inicio ves qué vence primero: a tiempo, por vencer o vencido. Respondes desde el mismo reclamo y el cliente recibe tu respuesta por correo.",
  },
  {
    tour: "libro",
    titulo: "Haz una prueba",
    texto: "Abre tu libro y registra un reclamo de prueba: verás lo que recibe tu cliente y cómo aparece aquí en tu panel.",
  },
];

type Caja = { top: number; left: number; width: number; height: number };

/** Primer elemento visible con ese `data-tour` (puede haber uno en el menú y otro en el cajón móvil). */
function buscar(tour: string): HTMLElement | null {
  const todos = document.querySelectorAll<HTMLElement>(`[data-tour="${tour}"]`);
  for (const el of todos) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
  }
  return null;
}

const ANCHO = 320;
const MARGEN = 12;

export function TutorialPanel({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [paso, setPaso] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLButtonElement>(null);

  const medir = useCallback(() => {
    const el = buscar(PASOS[paso].tour);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const alto = tarjeta.current?.offsetHeight ?? 200;
    if (!el) {
      setCaja(null);
      setPos({ top: Math.max(MARGEN, (vh - alto) / 2), left: Math.max(MARGEN, (vw - ANCHO) / 2) });
      return;
    }
    const r = el.getBoundingClientRect();
    const c = { top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 };
    setCaja(c);
    // A la derecha si cabe (menú lateral); si no, debajo; si no, encima.
    let top: number;
    let left: number;
    if (c.left + c.width + MARGEN + ANCHO <= vw - MARGEN) {
      left = c.left + c.width + MARGEN;
      top = c.top + c.height / 2 - alto / 2;
    } else if (c.top + c.height + MARGEN + alto <= vh - MARGEN) {
      top = c.top + c.height + MARGEN;
      left = c.left + c.width - ANCHO;
    } else {
      top = c.top - MARGEN - alto;
      left = c.left + c.width - ANCHO;
    }
    setPos({
      top: Math.min(Math.max(MARGEN, top), vh - alto - MARGEN),
      left: Math.min(Math.max(MARGEN, left), vw - ANCHO - MARGEN),
    });
  }, [paso]);

  // Llevar el elemento a la vista y medir al abrir y en cada paso.
  useEffect(() => {
    if (!abierto) return;
    buscar(PASOS[paso].tour)?.scrollIntoView({ block: "nearest" });
    const id = requestAnimationFrame(medir);
    principal.current?.focus();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [abierto, paso, medir]);

  const cerrar = useCallback(() => {
    onCerrar();
    setPaso(0);
  }, [onCerrar]);

  // Esc cierra; Tab no se escapa de la tarjeta mientras está abierta.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "Tab" && tarjeta.current) {
        const f = tarjeta.current.querySelectorAll<HTMLElement>("button");
        if (!f.length) return;
        const primero = f[0];
        const ultimo = f[f.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, cerrar]);

  if (!abierto) return null;
  const actual = PASOS[paso];
  const ultimo = paso === PASOS.length - 1;

  return (
    <div className="no-print fixed inset-0 z-[70]">
      {/* Fondo oscurecido. Con un elemento señalado, la sombra enorme del
          recuadro hace de fondo y deja el hueco iluminado; el recuadro se
          desliza de un paso al siguiente. */}
      {caja ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-teal-400 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ ...caja, boxShadow: "0 0 0 9999px rgb(2 20 18 / 0.55)" }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[rgb(2_20_18/0.55)]" />
      )}

      <div
        ref={tarjeta}
        key={paso}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-titulo"
        aria-describedby="tutorial-texto"
        className="tutorial-tarjeta absolute rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5"
        style={{ width: ANCHO, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-teal-700">
            Paso {paso + 1} de {PASOS.length}
          </p>
          <button type="button" onClick={cerrar} className="text-xs font-medium text-slate-500 hover:text-slate-800">
            Saltar
          </button>
        </div>
        <h2 id="tutorial-titulo" className="mt-2 text-base font-semibold text-slate-900">
          {actual.titulo}
        </h2>
        <p id="tutorial-texto" className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {actual.texto}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            {PASOS.map((p, i) => (
              <span
                key={p.tour}
                className={`h-1.5 rounded-full transition-all duration-200 ${i === paso ? "w-5 bg-teal-600" : "w-1.5 bg-slate-200"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {paso > 0 && (
              <button
                type="button"
                onClick={() => setPaso((p) => p - 1)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
              >
                Atrás
              </button>
            )}
            <button
              ref={principal}
              type="button"
              onClick={() => (ultimo ? cerrar() : setPaso((p) => p + 1))}
              className="rounded-lg bg-teal-700 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.98]"
            >
              {ultimo ? "Empezar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
