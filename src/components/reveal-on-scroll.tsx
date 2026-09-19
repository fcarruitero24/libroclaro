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
 *
 * 3. Terminada la aparición se retira `will-reveal`. Si se quedara, su
 *    `transition` de 420ms seguiría mandando sobre el elemento y los
 *    hover de las tarjetas (que Tailwind resuelve en 200ms, y que
 *    incluyen la sombra) quedarían lentos y a medias.
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
      // nada visible cambie de estado después del primer pintado. Esos
      // se quedan tal cual, sin clases de estado que luego le disputen
      // el hover a la tarjeta.
      if (el.getBoundingClientRect().top < alto * 0.9) continue;
      el.classList.add("will-reveal");
      pendientes.push(el);
    }

    if (pendientes.length === 0) return;

    const limpiezas: Array<() => void> = [];

    // Devuelve el elemento a su estado natural una vez que apareció.
    // Se van las dos clases: `is-revealed` fija `transform: none`, que
    // con la misma especificidad y más abajo en la hoja le ganaba al
    // `hover:-translate-y` de las tarjetas.
    function soltar(el: HTMLElement) {
      el.classList.remove("will-reveal", "is-revealed");
    }

    function revelar(el: HTMLElement) {
      el.classList.add("is-revealed");

      // El respaldo cubre el caso en que la transición nunca llega a
      // correr (una pestaña en segundo plano, por ejemplo): sin él, el
      // elemento se quedaría con la transparencia puesta. Tiene que
      // durar más que la aparición más lenta de la página —600ms de
      // recorrido detrás de 130ms por puesto en la grilla—, o cortaría
      // a media animación a las últimas tarjetas.
      const respaldo = window.setTimeout(() => soltar(el), 2500);
      const alTerminar = () => {
        window.clearTimeout(respaldo);
        soltar(el);
      };

      el.addEventListener("transitionend", alTerminar, { once: true });
      limpiezas.push(() => {
        window.clearTimeout(respaldo);
        el.removeEventListener("transitionend", alTerminar);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          revelar(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      // El 18% de margen inferior retrasa el disparo: el elemento tiene
      // que estar bien dentro de la pantalla para animarse. Con un
      // margen chico, quien baja a velocidad normal llega cuando la
      // aparición ya terminó y no percibe nada.
      { rootMargin: "0px 0px -18% 0px", threshold: 0.12 },
    );

    pendientes.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      limpiezas.forEach((fn) => fn());
    };
  }, []);

  return null;
}
