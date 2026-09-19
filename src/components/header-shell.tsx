"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cáscara del encabezado: aporta el comportamiento al scrollear y deja
 * el contenido intacto.
 *
 * El contenido llega por `children` desde `SiteHeader`, que es un
 * componente de servidor porque consulta la sesión. Con este patrón el
 * `getUser()` sigue ocurriendo en el servidor: aquí solo llegan los
 * nodos ya renderizados.
 *
 * Dos comportamientos:
 *
 * 1. Al despegarse del inicio, la barra se compacta (64px → 56px) y
 *    gana un borde de sombra. Recupera altura al volver arriba.
 * 2. En pantallas chicas, bajar oculta la barra y subir la devuelve.
 *    Así el contenido gana los 56px que en un móvil son media tarjeta.
 *    En escritorio no se oculta: ahí el espacio no escasea y la barra
 *    saltando distrae.
 *
 * Si alguien pidió menos movimiento en su sistema, no se oculta nunca.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [compacto, setCompacto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const ultimoY = useRef(0);

  useEffect(() => {
    const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const esMovil = window.matchMedia("(max-width: 767px)");
    let pendiente = false;

    ultimoY.current = window.scrollY;

    function medir() {
      const y = window.scrollY;
      setCompacto(y > 24);

      // El umbral de 5px evita que el rebote del scroll en iOS haga
      // parpadear la barra cuando el dedo apenas se mueve.
      if (menosMovimiento.matches || !esMovil.matches || y < 120) {
        setOculto(false);
      } else if (y > ultimoY.current + 5) {
        setOculto(true);
      } else if (y < ultimoY.current - 5) {
        setOculto(false);
      }

      ultimoY.current = y;
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

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-white/80 backdrop-blur transition-[transform,box-shadow,border-color] duration-300 ease-out ${
        compacto ? "border-slate-200 shadow-sm" : "border-slate-200/80"
      } ${oculto ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-4 transition-[height] duration-200 ease-out sm:px-6 ${
          compacto ? "h-14" : "h-16"
        }`}
      >
        {children}
      </div>
    </header>
  );
}
