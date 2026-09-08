import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Logo />
      <h1 className="mt-8 text-3xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-slate-600">
        El enlace puede estar mal escrito o el libro de reclamaciones que buscas ya no existe.
      </p>
      <ButtonLink href="/" className="mt-8">
        Ir al inicio
      </ButtonLink>
    </main>
  );
}
