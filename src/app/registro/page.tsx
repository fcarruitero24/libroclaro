import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { SignupForm } from "@/components/signup-form";
import { Card } from "@/components/ui";
import { getAppUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  const appUrl = await getAppUrl();
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <Logo className="justify-center" />
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Crea tu Libro de Reclamaciones</h1>
          <p className="mt-1 text-sm text-slate-600">
            30 días gratis con todo lo del plan Pro, sin tarjeta. Al terminar tu libro queda publicado y listo para recibir reclamos.
          </p>
        </div>
        <Card>
          <SignupForm appUrl={appUrl} />
        </Card>
      </div>
    </main>
  );
}
