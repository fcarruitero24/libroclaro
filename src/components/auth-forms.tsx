"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { signIn, signUp } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/types";

const initial: ActionState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Field label="Correo electrónico" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@negocio.pe" />
      </Field>
      <Field label="Contraseña" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingText="Ingresando…">
        Iniciar sesión
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-blue-700 hover:underline">
          Crea tu libro gratis
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initial);
  if (state.success) {
    return (
      <div className="space-y-4">
        <Alert kind="success">{state.success}</Alert>
        <p className="text-center text-sm text-slate-600">
          ¿Ya confirmaste?{" "}
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Field label="Correo electrónico" htmlFor="email" required hint="Usa el correo del negocio: ahí llegarán las notificaciones.">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@negocio.pe" />
      </Field>
      <Field label="Contraseña" htmlFor="password" required hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <SubmitButton className="w-full" pendingText="Creando cuenta…">
        Crear cuenta gratis
      </SubmitButton>
      <p className="text-center text-xs text-slate-500">
        Al continuar aceptas los{" "}
        <Link href="/terminos" className="underline">
          Términos
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="underline">
          Política de privacidad
        </Link>
        .
      </p>
      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-blue-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
