"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function BizTabs({ bizId }: { bizId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/app/${bizId}`, label: "Reclamos", exact: false, excludes: ["/ajustes", "/plan"] },
    { href: `/app/${bizId}/ajustes`, label: "Ajustes e instalación", exact: false, excludes: [] },
    { href: `/app/${bizId}/plan`, label: "Plan", exact: false, excludes: [] },
  ];
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active =
          pathname === t.href ||
          (pathname.startsWith(t.href) && !t.excludes.some((ex) => pathname.startsWith(`/app/${bizId}${ex}`)));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
              active ? "border-blue-700 text-blue-800" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
