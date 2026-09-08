import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#como-funciona" className="hover:text-slate-900">Cómo funciona</Link>
          <Link href="/#precios" className="hover:text-slate-900">Precios</Link>
          <Link href="/#faq" className="hover:text-slate-900">Preguntas</Link>
          <Link href="/r/demo" className="hover:text-slate-900">Ver demo</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <ButtonLink href="/app">Ir al panel</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">Iniciar sesión</ButtonLink>
              <ButtonLink href="/registro">Crear gratis</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
