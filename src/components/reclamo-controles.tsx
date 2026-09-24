"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Select, Textarea } from "@/components/ui";
import { addNote, setCategory } from "@/lib/actions/panel";
import { CATEGORIAS } from "@/lib/categorias";
import type { ActionState } from "@/lib/types";

const initial: ActionState = {};

/** Categoría interna: se guarda sola al elegirla. */
export function CategoriaSelector({ id, businessId, actual }: { id: string; businessId: string; actual: string | null }) {
  const [state, action, pending] = useActionState(setCategory, initial);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={action} className="space-y-1.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="business_id" value={businessId} />
      <label htmlFor="category" className="flex items-center justify-between text-sm font-medium text-slate-700">
        Categoría interna
        <span className="text-xs font-normal text-slate-400" aria-live="polite">
          {pending ? "Guardando…" : state.success ? "Guardada ✓" : "Solo la ves tú"}
        </span>
      </label>
      <Select
        id="category"
        name="category"
        defaultValue={actual ?? ""}
        onChange={() => form.current?.requestSubmit()}
        disabled={pending}
      >
        <option value="">Sin categoría</option>
        {CATEGORIAS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </Select>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

/** Nota interna para el historial. El consumidor nunca la ve. */
export function NotaForm({ complaintId, businessId }: { complaintId: string; businessId: string }) {
  const [state, action] = useActionState(addNote, initial);
  const form = useRef<HTMLFormElement>(null);

  // Tras guardar, se vacía el campo para la siguiente nota.
  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="space-y-2">
      <input type="hidden" name="complaint_id" value={complaintId} />
      <input type="hidden" name="business_id" value={businessId} />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Textarea
        name="texto"
        placeholder="Agrega una nota interna: qué se hizo, con quién se habló, qué falta…"
        className="min-h-20"
        maxLength={2000}
        required
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Solo la ves tú. No se envía al consumidor.</p>
        <SubmitButton pendingText="Guardando…" variant="secondary" className="px-3 py-2">
          Agregar nota
        </SubmitButton>
      </div>
    </form>
  );
}
