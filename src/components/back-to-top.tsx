"use client";

import { useEffect, useState } from "react";

/**
 * Botón para volver al inicio. Aparece recién pasadas dos pantallas,
 * que es cuando volver arriba con el dedo empieza a costar.
 *
 * Nace fuera del DOM (no solo transparente) para que el lector de
 * pantalla no anuncie un botón que no lleva a ninguna parte mientras
 * el visitante está leyendo el encabezado.
 */
export function BackToTop({ encimaDeWhatsapp = false }: { encimaDeWhatsapp?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let pendiente = false;

    function medir() {
      setVisible(window.scrollY > window.innerHeight * 2);
      pendiente = false;
    }

    function alScrollear() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(medir);
    }

    medir();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const brusco = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: brusco ? "auto" : "smooth" });
      }}
      aria-label="Volver al inicio"
      // Con el botón de WhatsApp abajo, este sube y queda centrado sobre
      // él: 20px de margen + 56px del botón verde + 12px de aire.
      className={`anim-fade-up fixed z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur transition duration-200 ease-out hover:-translate-y-0.5 hover:text-teal-700 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 ${
        encimaDeWhatsapp ? "bottom-[88px] right-[26px]" : "bottom-5 right-5"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 13V3m0 0L3.5 7.5M8 3l4.5 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
