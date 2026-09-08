"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { submitComplaint } from "@/lib/actions/public";
import type { ActionState } from "@/lib/types";

const initial: ActionState = {};

export function ComplaintForm({ slug, color }: { slug: string; color: string }) {
  const [state, action] = useActionState(submitComplaint, initial);
  const [isMinor, setIsMinor] = useState(false);
  const [kind, setKind] = useState<"reclamo" | "queja">("reclamo");
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="slug" value={slug} />
      {/* Honeypot anti-bots */}
      <div className="hidden" aria-hidden="true">
        <label>
          Sitio web
          <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.error && <Alert kind="error">{state.error}</Alert>}

      <Section title="1. Identificación del consumidor reclamante">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="consumer_name" required error={fe.consumer_name} className="sm:col-span-2">
            <Input id="consumer_name" name="consumer_name" required autoComplete="name" />
          </Field>
          <Field label="Tipo de documento" htmlFor="consumer_doc_type" required error={fe.consumer_doc_type}>
            <Select id="consumer_doc_type" name="consumer_doc_type" defaultValue="DNI" required>
              <option value="DNI">DNI</option>
              <option value="CE">Carné de extranjería</option>
              <option value="PASAPORTE">Pasaporte</option>
              <option value="RUC">RUC</option>
            </Select>
          </Field>
          <Field label="Número de documento" htmlFor="consumer_doc_number" required error={fe.consumer_doc_number}>
            <Input id="consumer_doc_number" name="consumer_doc_number" required inputMode="numeric" />
          </Field>
          <Field label="Domicilio" htmlFor="consumer_address" required error={fe.consumer_address} className="sm:col-span-2">
            <Input id="consumer_address" name="consumer_address" required autoComplete="street-address" placeholder="Calle, número, distrito, ciudad" />
          </Field>
          <Field label="Teléfono" htmlFor="consumer_phone" error={fe.consumer_phone}>
            <Input id="consumer_phone" name="consumer_phone" autoComplete="tel" inputMode="tel" />
          </Field>
          <Field
            label="Correo electrónico"
            htmlFor="consumer_email"
            required
            error={fe.consumer_email}
            hint="Aquí recibirás la copia de tu hoja de reclamación."
          >
            <Input id="consumer_email" name="consumer_email" type="email" required autoComplete="email" />
          </Field>
          <label className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              name="is_minor"
              checked={isMinor}
              onChange={(e) => setIsMinor(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            Soy menor de edad
          </label>
          {isMinor && (
            <Field label="Nombre del padre, madre o apoderado" htmlFor="guardian_name" required error={fe.guardian_name} className="sm:col-span-2">
              <Input id="guardian_name" name="guardian_name" required />
            </Field>
          )}
        </div>
      </Section>

      <Section title="2. Identificación del bien contratado">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="item_type" required error={fe.item_type}>
            <Select id="item_type" name="item_type" defaultValue="producto" required>
              <option value="producto">Producto</option>
              <option value="servicio">Servicio</option>
            </Select>
          </Field>
          <Field label="Monto reclamado (S/)" htmlFor="amount" error={fe.amount} hint="Opcional.">
            <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" />
          </Field>
          <Field label="Descripción del producto o servicio" htmlFor="item_description" required error={fe.item_description} className="sm:col-span-2">
            <Input id="item_description" name="item_description" required placeholder="Ej.: Zapatillas modelo X, pedido N.º 1234" />
          </Field>
        </div>
      </Section>

      <Section title="3. Detalle de la reclamación y pedido del consumidor">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Tipo <span className="text-red-600">*</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { v: "reclamo", t: "Reclamo", d: "Disconformidad relacionada con el producto o servicio." },
                  { v: "queja", t: "Queja", d: "Malestar por la atención al público, no relacionado con el producto o servicio." },
                ] as const
              ).map((o) => (
                <label
                  key={o.v}
                  className={
                    kind === o.v
                      ? "cursor-pointer rounded-lg border-2 p-3 text-sm"
                      : "cursor-pointer rounded-lg border border-slate-300 p-3 text-sm hover:border-slate-400"
                  }
                  style={kind === o.v ? { borderColor: color, backgroundColor: `${color}0d` } : undefined}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={o.v}
                    checked={kind === o.v}
                    onChange={() => setKind(o.v)}
                    className="mr-2"
                  />
                  <span className="font-semibold text-slate-900">{o.t}</span>
                  <p className="mt-1 text-xs text-slate-600">{o.d}</p>
                </label>
              ))}
            </div>
            {fe.kind && <p className="mt-1 text-xs text-red-600">{fe.kind}</p>}
          </div>
          <Field label={`Detalle del ${kind}`} htmlFor="detail" required error={fe.detail} hint="Cuéntanos qué pasó, cuándo y cómo.">
            <Textarea id="detail" name="detail" required minLength={10} maxLength={5000} className="min-h-36" />
          </Field>
          <Field label="Pedido" htmlFor="request" required error={fe.request} hint="¿Qué solicitas al proveedor? (devolución, cambio, reparación, disculpas…)">
            <Textarea id="request" name="request" required minLength={3} maxLength={3000} className="min-h-24" />
          </Field>
        </div>
      </Section>

      <div className="space-y-4">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="accept" className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>
            Declaro que la información consignada es verdadera y autorizo el tratamiento de mis datos personales para la
            atención de este {kind}, conforme a la Ley N.º 29733. <span className="text-red-600">*</span>
          </span>
        </label>
        {fe.accept && <p className="text-xs text-red-600">{fe.accept}</p>}

        <SubmitButton pendingText="Registrando…" className="w-full py-3 text-base" style={{ backgroundColor: color }}>
          Registrar {kind}
        </SubmitButton>
        <p className="text-center text-xs text-slate-500">
          Recibirás una copia en tu correo. El proveedor debe responder en un plazo máximo de 15 días hábiles.
        </p>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="px-2 text-sm font-semibold text-slate-800">{title}</legend>
      {children}
    </fieldset>
  );
}
