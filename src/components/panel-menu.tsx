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
    { href: base, label: "Inicio", icon: "inicio", activa: (p) => p === base },
    {
      href: `${base}/reclamos`,
      label: "Reclamos",
      icon: "bandeja",
      activa: (p) => p.startsWith(`${base}/reclamos`) || p.startsWith(`${base}/reclamo/`),
      contador: abiertos,
    },
    { href: `${base}/plantillas`, label: "Plantillas", icon: "plantilla", activa: (p) => p.startsWith(`${base}/plantillas`) },
    {
      href: `${base}/ajustes`,
      label: "Ajustes e instalación",
      icon: "ajustes",
      activa: (p) => p.startsWith(`${base}/ajustes`) || p.startsWith(`${base}/aviso`),
    },
    { href: `${base}/plan`, label: "Plan", icon: "tarjeta", activa: (p) => p === `${base}/plan` },
  ];
}

/** Menú vertical con íconos, para la barra lateral en pantallas grandes. */
export function MenuLateral({ bizId, abiertos }: { bizId: string; abiertos: number }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {items(bizId, abiertos).map((it) => {
        const activa = it.activa(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              activa ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon
              name={it.icon}
              className={cn("h-5 w-5 shrink-0", activa ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600")}
            />
            <span className="flex-1 truncate">{it.label}</span>
            {!!it.contador && (
              <span
                className="rounded-full bg-teal-700 px-1.5 py-px text-[11px] font-semibold tabular-nums text-white"
                aria-label={`${it.contador} abiertos`}
              >
                {it.contador}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** El mismo menú en fila, con íconos, para celulares y tablets. */
export function MenuMovil({ bizId, abiertos }: { bizId: string; abiertos: number }) {
  const pathname = usePathname();
  return (
    // Se desliza con el dedo; la barra de scroll solo estorbaría.
    <nav className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {items(bizId, abiertos).map((it) => {
        const activa = it.activa(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
              activa ? "border-teal-700 text-teal-800" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            <Icon name={it.icon} className="h-4 w-4" />
            {it.label}
            {!!it.contador && (
              <span className="rounded-full bg-teal-700 px-1.5 text-[10px] font-semibold tabular-nums text-white">
                {it.contador}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
