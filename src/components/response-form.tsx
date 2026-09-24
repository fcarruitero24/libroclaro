"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Select, Textarea } from "@/components/ui";
import { respondComplaint } from "@/lib/actions/complaints";
import type { ActionState, Complaint, ResponseTemplate } from "@/lib/types";

const initial: ActionState = {};

/** Reemplaza las variables de una plantilla con los datos de esta hoja. */
function rellenar(texto: string, c: Complaint, negocio: string) {
  return texto
    .replaceAll("{nombre}", c.consumer_name.split(" ")[0] ?? c.consumer_name)
    .replaceAll("{nombre_completo}", c.consumer_name)
    .replaceAll("{codigo}", c.code)
    // "S.A.C." seguido del punto de la plantilla daría "S.A.C..".
    .replaceAll("{negocio}.", negocio.endsWith(".") ? negocio : `${negocio}.`)
    .replaceAll("{negocio}", negocio);
}

export function ResponseForm({
  complaint,
  businessName,
  bizId,
  templates,
}: {
  complaint: Complaint;
  businessName: string;
  bizId: string;
  /** null = el plan no incluye plantillas. */
  templates: ResponseTemplate[] | null;
}) {
  const [state, action] = useActionState(respondComplaint, initial);
  const [texto, setTexto] = useState(complaint.response ?? "");
  const [vista, setVista] = useState(false);

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

      <div className="space-y-1.5">
        <div className="flex items-end justify-between gap-2">
          <label htmlFor="response" className="block text-sm font-medium text-slate-700">
            Respuesta al consumidor
          </label>
          {templates === null ? (
            <Link href={`/app/${bizId}/plan`} className="text-xs font-semibold text-teal-700 hover:underline">
              Plantillas (Pro)
            </Link>
          ) : templates.length === 0 ? (
            <Link href={`/app/${bizId}/plantillas`} className="text-xs font-semibold text-teal-700 hover:underline">
              Crear una plantilla
            </Link>
          ) : (
            <select
              aria-label="Usar una plantilla"
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (t) setTexto(rellenar(t.body, complaint, businessName));
              }}
              className="max-w-[12rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
            >
              <option value="">Usar plantilla…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {vista ? (
          // Cómo le llega al consumidor: mismo asunto y bloque que el correo real.
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Asunto:</span> Respuesta a tu reclamo N.º {complaint.code} ·{" "}
              {businessName}
            </p>
            <div className="mt-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <p className="text-slate-700">
                <strong>{businessName}</strong> ha respondido a tu hoja de reclamación <strong>N.º {complaint.code}</strong>:
              </p>
              <blockquote className="mt-3 whitespace-pre-wrap border-l-4 border-green-600 bg-slate-50 px-3 py-2 text-slate-700">
                {texto || "(todavía sin texto)"}
              </blockquote>
              <p className="mt-3 text-xs text-slate-500">Si no estás conforme con la respuesta, puedes acudir a INDECOPI.</p>
            </div>
            {/* El texto viaja igual aunque la vista previa esté abierta. */}
            <input type="hidden" name="response" value={texto} />
          </div>
        ) : (
          <Textarea
            id="response"
            name="response"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Estimado(a) cliente, hemos revisado su reclamo y…"
            className="min-h-40"
            maxLength={5000}
          />
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => setVista((v) => !v)}
            className="font-semibold text-teal-700 hover:underline"
          >
            {vista ? "Seguir editando" : "Vista previa del correo"}
          </button>
          <span className={texto.length > 4800 ? "text-amber-700" : undefined}>{texto.length} / 5000</span>
        </div>
        <p className="text-xs text-slate-500">
          Sé claro y concreto: qué solución ofreces, plazos y cómo se ejecutará. Si luego la corriges, la versión anterior
          queda en el historial.
        </p>
      </div>

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
