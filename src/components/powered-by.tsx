import Link from "next/link";
import { LogoMark } from "@/components/logo";

/** Marca que aparece en el plan Gratis (motor de adquisición). */
export function PoweredBy() {
  return (
    <div className="no-print mt-8 flex justify-center">
      <Link
        href="/?ref=powered-by"
        target="_blank"
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:border-teal-300 hover:text-teal-800"
      >
        <LogoMark className="h-4 w-4" />
        Libro de Reclamaciones Virtual por <strong>LibroClaro</strong> · crea el tuyo gratis
      </Link>
    </div>
  );
}
