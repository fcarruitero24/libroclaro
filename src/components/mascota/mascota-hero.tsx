"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Mascota } from "./escena";

/**
 * La mascota 3D en el hero. El lugar queda reservado desde el primer
 * pintado (el tamaño lo da `className`) y la escena se arma recién cuando
 * el navegador queda libre: Three.js viaja en su propio paquete y no
 * compite con el título ni los botones.
 *
 * - La mirada sigue al cursor en todo el hero; arrastrar sobre la mascota
 *   la gira sin bloquear el scroll vertical en celular (touch-action).
 * - Saluda una vez al aparecer y cada vez que se la toca.
 * - Botones accesibles para saludar y para pausar el movimiento.
 * - Si no hay WebGL o se pierde el contexto, se oculta: la página sigue
 *   completa, la mascota es decorativa.
 * - En Strict Mode el efecto corre dos veces: la bandera `cancelado` evita
 *   que un import que llega tarde arme una escena ya desmontada.
 */
export function MascotaHero({ className }: { className?: string }) {
  const escenario = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mascota = useRef<Mascota | null>(null);
  const [estado, setEstado] = useState<"cargando" | "lista" | "fallo">("cargando");
  const [pausada, setPausada] = useState(false);

  useEffect(() => {
    const el = escenario.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const zona = el.closest("section") ?? document.body;
    let cancelado = false;
    let saludo = 0;

    const arrancar = () => {
      import("./escena")
        .then(({ crearMascota }) => {
          if (cancelado) return;
          try {
            mascota.current = crearMascota({
              canvas: cv,
              escenario: el,
              zonaMirada: zona,
              // Sobre el verde oscuro del hero, la "sombra" es un brillo claro.
              sombra: "#5eead4",
              onPausa: setPausada,
              onFallo: () => {
                mascota.current?.destruir();
                mascota.current = null;
                setEstado("fallo");
              },
            });
            setEstado("lista");
            saludo = window.setTimeout(() => mascota.current?.saludar(), 600);
          } catch {
            setEstado("fallo");
          }
        })
        .catch(() => {
          if (!cancelado) setEstado("fallo");
        });
    };

    // Solo desde tablet (md) para arriba: en celular la mascota no se muestra
    // y Three.js ni se descarga. Si la ventana crece hasta md, arranca ahí.
    const pantalla = window.matchMedia("(min-width: 768px)");
    const idle = typeof window.requestIdleCallback === "function";
    let espera = 0;
    let programada = false;
    const programar = () => {
      if (programada || cancelado || !pantalla.matches) return;
      programada = true;
      espera = idle ? window.requestIdleCallback(arrancar, { timeout: 2000 }) : window.setTimeout(arrancar, 700);
    };
    programar();
    pantalla.addEventListener("change", programar);

    return () => {
      cancelado = true;
      pantalla.removeEventListener("change", programar);
      if (idle) window.cancelIdleCallback(espera);
      else window.clearTimeout(espera);
      window.clearTimeout(saludo);
      mascota.current?.destruir();
      mascota.current = null;
    };
  }, []);

  if (estado === "fallo") return null;

  return (
    <div className={cn("no-print", className)}>
      <div ref={escenario} className="h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing">
        <canvas
          ref={canvas}
          role="img"
          aria-label="Mascota de LibroClaro: un libro verde con manos que te sigue con la mirada y saluda."
          className="block h-full w-full touch-pan-y"
        />
      </div>

      {/* Controles ocultos a la vista (decisión de Fabrizio: no quiere
          botones sobre la mascota). Siguen en el orden de tabulación: quien
          navega con teclado los ve al llegar con Tab y puede pausar el
          movimiento, que es lo que exige la accesibilidad para animaciones
          continuas. Con el mouse, tocar la mascota la hace saludar. */}
      {estado === "lista" && (
        <div className="sr-only flex gap-1 focus-within:not-sr-only focus-within:absolute focus-within:right-0 focus-within:bottom-0">
          <button
            type="button"
            onClick={() => mascota.current?.saludar()}
            aria-label="Hacer que la mascota salude"
            title="Saludar"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-teal-100 backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            {/* Mano */}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => mascota.current?.pausar(!pausada)}
            aria-pressed={pausada}
            aria-label={pausada ? "Reanudar el movimiento de la mascota" : "Pausar el movimiento de la mascota"}
            title={pausada ? "Reanudar" : "Pausar"}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-teal-100 backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            {pausada ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <rect x="6.5" y="5" width="4" height="14" rx="1" />
                <rect x="13.5" y="5" width="4" height="14" rx="1" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
