"use client";

import { useEffect } from "react";

/**
 * Revela los elementos con clase `.reveal` cuando entran en pantalla.
 *
 * Por qué no se usa CSS puro: con `animation-timeline: view()` el avance
 * de la animación depende de la posición del scroll, así que quien
 * scrollea normal se salta el efecto completo y no percibe nada.
 * Un observador dispara la transición una sola vez y esta corre por
 * tiempo, así se ve igual sin importar la velocidad del scroll.
 *
 * Dos protecciones importantes:
 *
 * 1. La transparencia inicial NO está en el CSS base. La aplica este
 *    componente agregando `.will-reveal`. Si el JavaScript no corre,
 *    falla o está bloqueado, la clase nunca se agrega y todo el
 *    contenido se ve normal. Nunca hay contenido invisible permanente.
 *
 * 2. Los elementos que ya están a la vista al cargar se marcan como
 *    revelados de inmediato, sin pasar por la transparencia. Como el
 *    resto está fuera de pantalla, ocultarlos no produce parpadeo.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (targets.length === 0) return;

    const alto = window.innerHeight;
    const pendientes: HTMLElement[] = [];

    for (const el of targets) {
      // 10% de margen: lo que está asomando tampoco se anima, para que
      // nada visible cambie de estado después del primer pintado.
      if (el.getBoundingClientRect().top < alto * 0.9) {
        el.classList.add("is-revealed");
      } else {
        el.classList.add("will-reveal");
        pendientes.push(el);
      }
    }

    if (pendientes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    pendientes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
