"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { avisarEntradaTerminada, entradaTerminada } from "./entrada";
import type { Mascota } from "./escena";

/**
 * LibIA en el hero. El lienzo cubre la hoja y sus márgenes (el tamaño lo da
 * `className`), así LibIA puede asomarse por el borde de arriba y bajar a la
 * esquina inferior derecha. No recibe clics: solo el "asa" que la sigue.
 *
 * - Debe estar dentro de un `[data-libia-bloque]` junto a la hoja
 *   (`[data-libia-hoja]`), que va en `z-10`: el lienzo pasa de z-index 0
 *   (detrás) a 20 (delante) a mitad de la entrada. Por eso este contenedor
 *   no puede crear su propio contexto de apilamiento (sin z-index,
 *   transform ni opacity).
 * - La escena se arma recién cuando el navegador queda libre y solo desde
 *   768 px: en celular LibIA no se muestra y Three.js ni se descarga.
 * - Avisa a la hoja cuando termina la entrada (entrada.ts), o enseguida si no
 *   habrá entrada: ya vista, movimiento reducido, sin WebGL o pantalla chica.
 * - En Strict Mode el efecto corre dos veces: la bandera `cancelado` evita
 *   que un import que llega tarde arme una escena ya desmontada, y como ese
 *   montaje de prueba no llega a avanzar la entrada, no la consume.
 */
export function MascotaHero({ className }: { className?: string }) {
  const raiz = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const asa = useRef<HTMLDivElement>(null);
  const mascota = useRef<Mascota | null>(null);
  const [estado, setEstado] = useState<"cargando" | "lista" | "fallo">("cargando");
  const [pausada, setPausada] = useState(false);

  useEffect(() => {
    const el = raiz.current;
    const cv = canvas.current;
    const toque = asa.current;
    const hoja = el?.closest("[data-libia-bloque]")?.querySelector<HTMLElement>("[data-libia-hoja]");
    if (!el || !cv || !toque || !hoja) return;
    const zona = el.closest("section") ?? document.body;
    let cancelado = false;

    // Si sale de la portada a mitad de la entrada, cuenta como vista: al volver, LibIA ya está en su sitio.
    const soltar = () => {
      const m = mascota.current;
      if (!m) return;
      if (m.entradaEmpezada()) avisarEntradaTerminada();
      m.destruir();
      mascota.current = null;
    };
    const fallar = () => {
      soltar();
      avisarEntradaTerminada();
      setEstado("fallo");
    };

    const pantalla = window.matchMedia("(min-width: 768px)");
    const arrancar = () => {
      import("./escena")
        .then(({ crearMascota }) => {
          if (cancelado || !pantalla.matches || mascota.current) return;
          try {
            mascota.current = crearMascota({
              canvas: cv,
              hoja,
              zonaMirada: zona,
              zonaToque: toque,
              // Sobre el verde oscuro del hero, la "sombra" es un brillo claro.
              sombra: "#5eead4",
              entradaYaVista: entradaTerminada(),
              onPausa: setPausada,
              onFallo: fallar,
              onEntradaTerminada: avisarEntradaTerminada,
            });
            setEstado("lista");
          } catch {
            fallar();
          }
        })
        .catch(() => {
          if (!cancelado) fallar();
        });
    };

    const idle = typeof window.requestIdleCallback === "function";
    let espera = 0;
    let programada = false;
    const programar = () => {
      if (programada || cancelado || !pantalla.matches) return;
      programada = true;
      espera = idle ? window.requestIdleCallback(arrancar, { timeout: 2000 }) : window.setTimeout(arrancar, 700);
    };
    // Si la ventana baja de 768 px LibIA se oculta (CSS): se libera la escena y la hoja muestra su aviso.
    const alCambiarPantalla = () => {
      if (pantalla.matches) {
        programar();
        return;
      }
      soltar();
      avisarEntradaTerminada();
      programada = false;
    };
    programar();
    pantalla.addEventListener("change", alCambiarPantalla);

    return () => {
      cancelado = true;
      pantalla.removeEventListener("change", alCambiarPantalla);
      if (idle) window.cancelIdleCallback(espera);
      else window.clearTimeout(espera);
      soltar();
    };
  }, []);

  if (estado === "fallo") return null;

  return (
    <div ref={raiz} className={cn("no-print pointer-events-none", className)}>
      <canvas
        ref={canvas}
        role="img"
        aria-label="LibIA, la mascota de LibroClaro: un libro verde con lentes que se asoma detrás de la hoja, saluda y te sigue con la mirada."
        className="absolute inset-0 block h-full w-full"
        style={{ zIndex: 0 }}
      />
      {/* Asa invisible sobre LibIA: tocarla la hace saludar y arrastrarla la
          gira. La escena la coloca y la muestra al terminar la entrada. */}
      <div
        ref={asa}
        aria-hidden="true"
        className="pointer-events-auto absolute z-[21] hidden cursor-grab touch-pan-y select-none active:cursor-grabbing"
      />

      {/* Controles ocultos a la vista (decisión de Fabrizio: no quiere
          botones sobre la mascota). Siguen en el orden de tabulación: quien
          navega con teclado los ve al llegar con Tab y puede pausar el
          movimiento, que es lo que exige la accesibilidad para animaciones
          continuas. Con el mouse, tocar a LibIA la hace saludar. */}
      {estado === "lista" && (
        <div className="pointer-events-auto sr-only flex gap-1 focus-within:not-sr-only focus-within:absolute focus-within:right-0 focus-within:bottom-0 focus-within:z-[22]">
          <button
            type="button"
            onClick={() => mascota.current?.saludar()}
            aria-label="Hacer que LibIA salude"
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
            aria-label={pausada ? "Reanudar el movimiento de LibIA" : "Pausar el movimiento de LibIA"}
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
