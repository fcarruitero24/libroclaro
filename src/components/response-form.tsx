"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icons";
import { Alert, Button, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
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

/**
 * Botón que guarda con un estado concreto. El estado viaja como el valor
 * del propio botón (la Server Action lo lee de `status`), así no hace
 * falta un selector: "Enviar respuesta" marca respondido y "Guardar
 * borrador" deja el reclamo en proceso. El spinner sale solo en el botón
 * que se presionó, no en todos.
 */
function BotonEstado({
  estado,
  children,
  className,
  variant,
}: {
  estado: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const { pending, data } = useFormStatus();
  const esteBoton = pending && data?.get("status") === estado;
  return (
    <Button
      type="submit"
      name="status"
      value={estado}
      variant={variant}
      disabled={pending}
      aria-busy={esteBoton}
      className={cn("relative", className)}
    >
      <span className={esteBoton ? "invisible" : undefined}>{children}</span>
      {esteBoton && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 animate-spin">
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M18 10a8 8 0 0 0-8-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Guardando…</span>
        </span>
      )}
    </Button>
  );
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
  const respondido = complaint.status === "respondido" || complaint.status === "cerrado";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={complaint.id} />
      <input type="hidden" name="business_id" value={complaint.business_id} />

      {/* Lugar reservado para la IA que propondrá un borrador de respuesta.
          Todavía no existe: queda visible y desactivado para anunciarla. */}
      <button
        type="button"
        disabled
        title="Muy pronto: la IA te propondrá una respuesta a partir del reclamo."
        className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 px-3.5 py-2.5 text-left text-sm font-medium text-slate-600"
      >
        <Icon name="chispa" className="h-4 w-4 shrink-0 text-teal-600" />
        Pedirle una propuesta a la IA
        <span className="ml-auto rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
          Próximamente
        </span>
      </button>

      <div className="flex items-center justify-between gap-2">
        <label htmlFor="response" className="text-sm font-semibold text-slate-900">
          Respuesta al cliente
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
            className="max-w-[11rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
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

      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}

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
          placeholder={`Estimado(a) cliente, hemos revisado su ${complaint.kind === "queja" ? "queja" : "reclamo"} y…`}
          className="min-h-56"
          maxLength={5000}
        />
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <button type="button" onClick={() => setVista((v) => !v)} className="font-semibold text-teal-700 hover:underline">
          {vista ? "Seguir editando" : "Vista previa del correo"}
        </button>
        <span className={texto.length > 4800 ? "text-amber-700" : undefined}>{texto.length} / 5000</span>
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-4 w-4 rounded border-slate-300" />
        <span>
          Enviar por correo a <span className="font-medium text-slate-800">{complaint.consumer_email}</span>
        </span>
      </label>

      <BotonEstado estado={respondido ? complaint.status : "respondido"} className="w-full py-3">
        {respondido ? "Actualizar respuesta" : "Enviar respuesta"}
      </BotonEstado>

      {!respondido && (
        <BotonEstado estado="en_proceso" variant="secondary" className="w-full">
          Guardar borrador
        </BotonEstado>
      )}

      {/* Lo que casi nunca se usa queda plegado, para que la decisión
          normal sea un solo botón. */}
      <details className="group text-xs">
        <summary className="cursor-pointer list-none font-semibold text-slate-500 hover:text-slate-800">
          <span className="inline-block transition-transform group-open:rotate-90">›</span> Más opciones
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {complaint.status !== "cerrado" && (
            <BotonEstado estado="cerrado" variant="ghost" className="px-2 py-1.5 text-xs">
              Marcar como cerrado
            </BotonEstado>
          )}
          {respondido && (
            <BotonEstado estado="pendiente" variant="ghost" className="px-2 py-1.5 text-xs">
              Reabrir (volver a pendiente)
            </BotonEstado>
          )}
        </div>
        <p className="mt-2 text-slate-500">
          Si corriges una respuesta ya enviada, la versión anterior queda en el historial.
        </p>
      </details>
    </form>
  );
}
