import Link from "next/link";
import { Logo } from "@/components/logo";
import { WHATSAPP_NUMBER } from "@/lib/env";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-[#fafaf8]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm text-slate-600">
              Libro de Reclamaciones Virtual para negocios peruanos. Cumple con el Código de Protección y
              Defensa del Consumidor sin complicarte.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-slate-600">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Producto</p>
              <Link href="/#precios" className="block hover:text-slate-900">Precios</Link>
              <Link href="/r/demo" className="block hover:text-slate-900">Demo</Link>
              <Link href="/registro" className="block hover:text-slate-900">Crear cuenta</Link>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-900">Legal</p>
              <Link href="/terminos" className="block hover:text-slate-900">Términos</Link>
              <Link href="/privacidad" className="block hover:text-slate-900">Privacidad</Link>
              {WHATSAPP_NUMBER && (
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="block hover:text-slate-900">
                  Soporte por WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs leading-relaxed text-slate-500">
          LibroClaro es una herramienta tecnológica y no brinda asesoría legal. La información sobre plazos y
          requisitos se basa en el D.S. 011-2011-PCM y sus modificatorias (incluido el D.S. 101-2022-PCM); verifica
          siempre la normativa vigente en INDECOPI. © {new Date().getFullYear()} LibroClaro · Hecho en Perú.
        </p>
      </div>
    </footer>
  );
}
