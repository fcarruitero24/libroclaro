"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { saveTemplate } from "@/lib/actions/panel";
import type { ActionState, ResponseTemplate } from "@/lib/types";

const initial: ActionState = {};

/** Crear (sin `plantilla`) o editar una plantilla de respuesta. */
export function PlantillaForm({ businessId, plantilla }: { businessId: string; plantilla?: ResponseTemplate }) {
  const [state, action] = useActionState(saveTemplate, initial);
  const form = useRef<HTMLFormElement>(null);

  // Una plantilla nueva deja el formulario limpio para la siguiente.
  useEffect(() => {
    if (state.success && !plantilla) form.current?.reset();
  }, [state, plantilla]);

  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="business_id" value={businessId} />
      {plantilla && <input type="hidden" name="id" value={plantilla.id} />}
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <Field label="Nombre" htmlFor={`title-${plantilla?.id ?? "nueva"}`} error={state.fieldErrors?.title} required>
        <Input
          id={`title-${plantilla?.id ?? "nueva"}`}
          name="title"
          defaultValue={plantilla?.title}
          placeholder="Ej.: Demora en la entrega"
          maxLength={80}
        />
      </Field>
      <Field
        label="Texto"
        htmlFor={`body-${plantilla?.id ?? "nueva"}`}
        error={state.fieldErrors?.body}
        hint="Variables: {nombre}, {nombre_completo}, {codigo} y {negocio}. Se reemplazan al usarla en un reclamo."
        required
      >
        <Textarea
          id={`body-${plantilla?.id ?? "nueva"}`}
          name="body"
          defaultValue={plantilla?.body}
          placeholder="Hola {nombre}, lamentamos lo ocurrido con tu reclamo N.º {codigo}…"
          className="min-h-32"
          maxLength={5000}
        />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando…">{plantilla ? "Guardar cambios" : "Crear plantilla"}</SubmitButton>
      </div>
    </form>
  );
}
