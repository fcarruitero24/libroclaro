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
      <div className="flex items-center gap-2 max-[360px]:gap-1">
        {user ? (
          <ButtonLink href="/app">Ir al panel</ButtonLink>
        ) : (
          <>
            {/* En celular "Iniciar sesión" no entra al lado de "Probar gratis" y
                ambos se partían en dos líneas. Por debajo de 360 px ni siquiera
                "Entrar" entra con el relleno normal, así que ahí se reduce. */}
            <ButtonLink href="/login" variant="ghost" className="whitespace-nowrap max-[360px]:px-2">
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">Iniciar sesión</span>
            </ButtonLink>
            <ButtonLink href="/registro" className="whitespace-nowrap max-[360px]:px-2">
              Probar gratis
            </ButtonLink>
          </>
        )}
      </div>
    </HeaderShell>
  );
}
