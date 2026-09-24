"use client";

import { useEffect, useRef } from "react";

/**
 * Capas de fondo del hero: el degradado de siempre, una grilla de
 * puntos que se desvanece hacia los bordes y un brillo que sigue al
 * puntero.
 *
 * El brillo escucha a la sección entera (el padre), no a esta capa,
 * que no recibe eventos para no tapar los botones. Solo se activa con
 * un mouse de verdad: en táctil no hay puntero que seguir y el brillo
 * quedaría clavado donde fue el último toque.
 */
export function HeroFondo() {
  const brillo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = brillo.current;
    const seccion = el?.parentElement;
    if (!el || !seccion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;

    function mover(e: PointerEvent) {
      const r = seccion!.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        el!.style.setProperty("--x", `${x}px`);
        el!.style.setProperty("--y", `${y}px`);
        raf = 0;
      });
    }
    function entrar() {
      el!.style.opacity = "1";
    }
    function salir() {
      el!.style.opacity = "0";
    }

    seccion.addEventListener("pointermove", mover);
    seccion.addEventListener("pointerenter", entrar);
    seccion.addEventListener("pointerleave", salir);
    return () => {
      cancelAnimationFrame(raf);
      seccion.removeEventListener("pointermove", mover);
      seccion.removeEventListener("pointerenter", entrar);
      seccion.removeEventListener("pointerleave", salir);
    };
  }, []);

  return (
    <>
      {/* z-0 sobre el fondo de la sección, y el contenido en z-10 encima.
          Con -z-10 el degradado quedaba detrás del color sólido y no se veía. */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(65%_55%_at_50%_0%,rgba(15,118,110,0.35)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(153,246,228,0.16)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,#000_20%,transparent_75%)]" />
      <div
        ref={brillo}
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500"
        style={{
          background: "radial-gradient(520px circle at var(--x, 50%) var(--y, 30%), rgba(45, 212, 191, 0.13), transparent 65%)",
        }}
      />
    </>
  );
}
