"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Opcion = { clave: string; href: string; contenido: ReactNode };

/**
 * Selector de opciones con una píldora blanca que se desliza hasta la
 * elegida, como el mensual/anual de la portada.
 *
 * Cada opción es un enlace (el servidor recalcula la página con el nuevo
 * parámetro), pero la píldora no espera al servidor: se mueve en el mismo
 * clic gracias al estado optimista, que dura lo que dura la navegación.
 * Mientras tanto se sigue viendo el contenido anterior, sin esqueleto.
 * Las columnas son iguales (la más ancha manda), así la píldora solo
 * necesita desplazarse de a una columna.
 */
export function SelectorSegmentado({
  opciones,
  activa,
  etiqueta,
  tamano = "sm",
}: {
  opciones: Opcion[];
  /** Índice de la opción vigente según la URL. */
  activa: number;
  etiqueta: string;
  tamano?: "sm" | "md";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [elegida, setElegida] = useOptimistic(activa);
  const n = opciones.length;

  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={cn("relative inline-grid bg-slate-100 p-1", tamano === "md" ? "rounded-xl" : "rounded-lg")}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1 left-1 bg-white shadow-sm ring-1 ring-slate-200/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          tamano === "md" ? "rounded-lg" : "rounded-md",
        )}
        style={{ width: `calc((100% - 0.5rem) / ${n})`, transform: `translateX(${elegida * 100}%)` }}
      />
      {opciones.map((o, i) => {
        const sel = i === elegida;
        return (
          <Link
            key={o.clave}
            href={o.href}
            scroll={false}
            role="radio"
            aria-checked={sel}
            onClick={(e) => {
              // Abrir en otra pestaña (Ctrl/Cmd/Shift o botón medio) sigue siendo un enlace normal.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              if (i === elegida) return;
              startTransition(() => {
                setElegida(i);
                router.push(o.href, { scroll: false });
              });
            }}
            className={cn(
              "relative z-10 flex items-center justify-center whitespace-nowrap font-semibold transition-colors duration-200",
              tamano === "md" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs",
              sel ? "text-slate-900" : "text-slate-500 hover:text-slate-900",
            )}
          >
            {o.contenido}
          </Link>
        );
      })}
    </div>
  );
}
