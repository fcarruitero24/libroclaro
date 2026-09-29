"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/cn";

type Item = {
  href: string;
  label: string;
  icon: IconName;
  activa: (p: string) => boolean;
  contador?: number;
  /** Punto que señala el tutorial del panel. */
  tour?: string;
};

/**
 * Secciones del panel de un negocio. Cada una declara qué rutas la dejan
 * activa: el Inicio es la raíz del negocio, así que solo cuenta la
 * coincidencia exacta, y "Plan" también, porque con startsWith
 * "/plantillas" empezaría por "/plan".
 */
function items(bizId: string, abiertos: number): Item[] {
  const base = `/app/${bizId}`;
  return [
    { href: base, label: "Inicio", icon: "inicio", activa: (p) => p === base, tour: "inicio" },
    {
      href: `${base}/reclamos`,
      label: "Reclamos",
      icon: "bandeja",
      activa: (p) => p.startsWith(`${base}/reclamos`) || p.startsWith(`${base}/reclamo/`),
      contador: abiertos,
      tour: "reclamos",
    },
    { href: `${base}/plantillas`, label: "Plantillas", icon: "plantilla", activa: (p) => p.startsWith(`${base}/plantillas`) },
    {
      href: `${base}/ajustes`,
      label: "Ajustes e instalación",
      icon: "ajustes",
      activa: (p) => p.startsWith(`${base}/ajustes`) || p.startsWith(`${base}/aviso`),
      tour: "ajustes",
    },
    { href: `${base}/plan`, label: "Plan", icon: "tarjeta", activa: (p) => p === `${base}/plan` },
  ];
}

/**
 * Menú del panel. Plegado muestra solo los íconos, con el nombre en una
 * etiqueta al pasar el mouse o al enfocarlo con teclado; el contador de
 * reclamos pasa a ser un puntito sobre el ícono.
 */
export function MenuLateral({
  bizId,
  abiertos,
  colapsado = false,
  onNavegar,
}: {
  bizId: string;
  abiertos: number;
  colapsado?: boolean;
  onNavegar?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {items(bizId, abiertos).map((it) => {
        const activa = it.activa(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavegar}
            data-tour={it.tour}
            aria-current={activa ? "page" : undefined}
            aria-label={colapsado ? it.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors duration-150",
              colapsado ? "justify-center px-0" : "px-3",
              activa ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {/* Barra de la sección activa: crece desde el centro. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-teal-600 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                activa ? "scale-y-100" : "scale-y-0",
              )}
            />
            <span className="relative">
              <Icon
                name={it.icon}
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors duration-150",
                  activa ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              {colapsado && !!it.contador && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-teal-600 ring-2 ring-white" aria-hidden="true" />
              )}
            </span>
            {!colapsado && <span className="flex-1 truncate">{it.label}</span>}
            {!colapsado && !!it.contador && (
              <span
                className="rounded-full bg-teal-700 px-1.5 py-px text-[11px] font-semibold tabular-nums text-white"
                aria-label={`${it.contador} abiertos`}
              >
                {it.contador}
              </span>
            )}
            {colapsado && <Etiqueta>{it.contador ? `${it.label} (${it.contador})` : it.label}</Etiqueta>}
          </Link>
        );
      })}
    </nav>
  );
}

/** Nombre flotante de un ícono cuando el menú está plegado. */
export function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full z-50 ml-3 -translate-x-1 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}
