"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function BizTabs({ bizId }: { bizId: string }) {
  const pathname = usePathname();
  const base = `/app/${bizId}`;
  // Cada pestaña declara qué rutas la dejan activa. El Resumen es la raíz del
  // negocio, así que solo cuenta la coincidencia exacta.
  const tabs = [
    { href: base, label: "Resumen", activa: (p: string) => p === base },
    {
      href: `${base}/reclamos`,
      label: "Reclamos",
      activa: (p: string) => p.startsWith(`${base}/reclamos`) || p.startsWith(`${base}/reclamo/`),
    },
    { href: `${base}/plantillas`, label: "Plantillas", activa: (p: string) => p.startsWith(`${base}/plantillas`) },
    {
      href: `${base}/ajustes`,
      label: "Ajustes e instalación",
      activa: (p: string) => p.startsWith(`${base}/ajustes`) || p.startsWith(`${base}/aviso`),
    },
    // Exacta: con startsWith, "/plantillas" también empieza por "/plan".
    { href: `${base}/plan`, label: "Plan", activa: (p: string) => p === `${base}/plan` },
  ];
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.activa(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
              active ? "border-teal-700 text-teal-800" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
