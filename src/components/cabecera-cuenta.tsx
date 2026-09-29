"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";

/**
 * Cabecera de las páginas de cuenta que no son de un negocio (Mis
 * negocios, registrar negocio). Dentro de un negocio no se muestra:
 * allí el logo, el correo y "Salir" viven en el menú lateral, y repetirlos
 * arriba sería una segunda barra con lo mismo.
 */
export function CabeceraCuenta({ email }: { email: string }) {
  const pathname = usePathname();
  if (/^\/app\/[0-9a-f-]{36}(\/|$)/.test(pathname)) return null;

  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo href="/app" />
          <Link href="/app/negocios" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">
            Mis negocios
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-48 truncate text-sm text-slate-500 sm:block">{email}</span>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
