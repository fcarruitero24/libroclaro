import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";
import { Alert, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/app";
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo className="justify-center" />
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-slate-600">Ingresa para gestionar tus reclamos.</p>
        </div>
        {sp.error === "enlace-invalido" && (
          <Alert kind="warning">El enlace de confirmación no es válido o ya expiró. Inicia sesión o regístrate otra vez.</Alert>
        )}
        <Card>
          <LoginForm next={next} />
        </Card>
      </div>
    </main>
  );
}
