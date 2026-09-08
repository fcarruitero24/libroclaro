"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Select, Textarea } from "@/components/ui";
import { respondComplaint } from "@/lib/actions/complaints";
import type { ActionState, Complaint } from "@/lib/types";

const initial: ActionState = {};

export function ResponseForm({ complaint }: { complaint: Complaint }) {
  const [state, action] = useActionState(respondComplaint, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={complaint.id} />
      <input type="hidden" name="business_id" value={complaint.business_id} />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}

      <Field label="Estado" htmlFor="status" required>
        <Select id="status" name="status" defaultValue={complaint.status}>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="respondido">Respondido</option>
          <option value="cerrado">Cerrado</option>
        </Select>
      </Field>

      <Field
        label="Respuesta al consumidor"
        htmlFor="response"
        hint="Sé claro y concreto: qué solución ofreces, plazos y cómo se ejecutará. Este texto queda registrado en la hoja."
      >
        <Textarea
          id="response"
          name="response"
          defaultValue={complaint.response ?? ""}
          placeholder="Estimado(a) cliente, hemos revisado su reclamo y…"
          className="min-h-40"
          maxLength={5000}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="notify" defaultChecked className="mt-1 h-4 w-4 rounded border-slate-300" />
        Enviar la respuesta por correo al consumidor ({complaint.consumer_email}) al marcar como respondido o cerrado.
      </label>

      <div className="flex justify-end">
        <SubmitButton pendingText="Guardando…">Guardar respuesta</SubmitButton>
      </div>
    </form>
  );
}
