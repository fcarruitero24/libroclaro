"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { reportOwnership } from "@/lib/actions/report";
import type { ActionState } from "@/lib/types";

const initial: ActionState = {};

export function ReportForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(reportOwnership, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <div className="hidden" aria-hidden="true">
        <label>
          Sitio web
          <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.error && <Alert kind="error">{state.error}</Alert>}

      <Field label="Tu nombre completo" htmlFor="name" required error={fe.name}>
        <Input id="name" name="name" required autoComplete="name" />
      </Field>

      <Field
        label="Tu correo electrónico"
        htmlFor="email"
        required
        error={fe.email}
        hint="Te escribiremos a este correo para pedirte más datos o contarte el resultado."
      >
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>

      <Field label="Tu teléfono o WhatsApp" htmlFor="phone" error={fe.phone} hint="Opcional, pero acelera la verificación.">
        <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" />
      </Field>

      <Field
        label="¿Por qué este libro no corresponde a tu empresa?"
        htmlFor="reason"
        required
        error={fe.reason}
        hint="Cuéntanos tu cargo en la empresa y cualquier dato que ayude a confirmarlo."
      >
        <Textarea id="reason" name="reason" required minLength={10} maxLength={3000} className="min-h-32" />
      </Field>

      <SubmitButton className="w-full py-3 text-base" pendingText="Enviando reporte…">
        Enviar reporte
      </SubmitButton>

      <p className="text-center text-xs text-slate-500">
        Revisamos cada reporte manualmente. Si se confirma, desactivamos el libro y liberamos el RUC.
      </p>
    </form>
  );
}
