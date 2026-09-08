import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo className="justify-center" />
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Crea tu Libro de Reclamaciones</h1>
          <p className="mt-1 text-sm text-slate-600">Gratis, sin tarjeta. Listo en 5 minutos.</p>
        </div>
        <Card>
          <RegisterForm />
        </Card>
      </div>
    </main>
  );
}
