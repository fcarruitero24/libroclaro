import Link from "next/link";
import { HeaderShell } from "@/components/header-shell";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";

const enlace =
  "relative transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-teal-700 after:transition-transform after:duration-200 after:ease-out hover:text-slate-900 hover:after:origin-left hover:after:scale-x-100";

export async function SiteHeader() {
  const user = await getUser();
  return (
    <HeaderShell>
      <Logo />
      <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
        <Link href="/#como-funciona" className={enlace}>Cómo funciona</Link>
        <Link href="/#precios" className={enlace}>Precios</Link>
        <Link href="/#faq" className={enlace}>Preguntas</Link>
        <Link href="/r/demo" className={enlace}>Ver demo</Link>
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
    </HeaderShell>
  );
}
