"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Para animaciones que deben arrancar al entrar en pantalla (barras que
 * se llenan, números que cuentan).
 *
 * Sigue la misma regla que `RevealOnScroll`: el primer pintado es el
 * estado final. Solo si el JavaScript corre, el elemento está fuera de
 * pantalla y nadie pidió menos movimiento, pasa a "armado" (estado
 * inicial de la animación, sin transición para que el salto no se vea)
 * y a "visible" al aparecer, que es cuando corren las transiciones. Si
 * algo falla, el contenido se queda en "final": completo y quieto,
 * nunca vacío.
 */
export type FaseAparicion = "final" | "armado" | "visible";

export function useAparicion<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [fase, setFase] = useState<FaseAparicion>("final");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setFase("armado");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setFase("visible");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, fase };
}
