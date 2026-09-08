"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { createBusiness, updateBusiness } from "@/lib/actions/business";
import { slugify } from "@/lib/format";
import type { ActionState, Business } from "@/lib/types";

const initial: ActionState = {};

export function BusinessForm({
  mode,
  business,
  canCustomBrand = false,
  appUrl,
}: {
  mode: "create" | "edit";
  business?: Business;
  canCustomBrand?: boolean;
  appUrl: string;
}) {
  const [state, action] = useActionState(mode === "create" ? createBusiness : updateBusiness, initial);
  const [name, setName] = useState(business?.name ?? "");
  const [slug, setSlug] = useState(business?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const fe = state.fieldErrors ?? {};

  const previewSlug = slug || slugify(name) || "tu-negocio";

  return (
    <form action={action} className="space-y-6">
      {business && <input type="hidden" name="id" value={business.id} />}
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Razón social o nombre comercial" htmlFor="name" required error={fe.name} className="sm:col-span-2">
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (mode === "create" && !slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Tienda Ejemplo S.A.C."
          />
        </Field>
        <Field label="RUC" htmlFor="ruc" required error={fe.ruc} hint="11 dígitos.">
          <Input id="ruc" name="ruc" required inputMode="numeric" pattern="[0-9]{11}" maxLength={11} defaultValue={business?.ruc ?? ""} placeholder="20123456789" />
        </Field>
        <Field label="Teléfono (opcional)" htmlFor="phone" error={fe.phone}>
          <Input id="phone" name="phone" defaultValue={business?.phone ?? ""} placeholder="+51 999 999 999" />
        </Field>
        <Field label="Dirección del establecimiento" htmlFor="address" required error={fe.address} className="sm:col-span-2">
          <Input id="address" name="address" required defaultValue={business?.address ?? ""} placeholder="Av. Ejemplo 123, Miraflores, Lima" />
        </Field>
        <Field
          label="Correo para notificaciones"
          htmlFor="email"
          required
          error={fe.email}
          hint="Los consumidores podrán responderte a este correo."
        >
          <Input id="email" name="email" type="email" required defaultValue={business?.email ?? ""} placeholder="reclamos@tunegocio.pe" />
        </Field>
        <Field label="Sitio web o red social (opcional)" htmlFor="website" error={fe.website}>
          <Input id="website" name="website" defaultValue={business?.website ?? ""} placeholder="https://www.tunegocio.pe" />
        </Field>

        {mode === "create" && (
          <Field
            label="Enlace de tu libro"
            htmlFor="slug"
            required
            error={fe.slug}
            hint={`Será: ${appUrl}/r/${previewSlug}`}
            className="sm:col-span-2"
          >
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-slate-500 sm:block">{appUrl.replace(/^https?:\/\//, "")}/r/</span>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="tu-negocio"
                pattern="[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?"
              />
            </div>
          </Field>
        )}
      </div>

      {mode === "edit" && (
        <fieldset className="rounded-xl border border-slate-200 p-5">
          <legend className="px-2 text-sm font-semibold text-slate-800">Marca (plan Pro)</legend>
          {canCustomBrand ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="URL de tu logo" htmlFor="logo_url" error={fe.logo_url} hint="PNG o SVG, fondo transparente, https://…">
                <Input id="logo_url" name="logo_url" defaultValue={business?.logo_url ?? ""} placeholder="https://tunegocio.pe/logo.png" />
              </Field>
              <Field label="Color principal" htmlFor="primary_color" error={fe.primary_color}>
                <div className="flex items-center gap-3">
                  <input
                    id="primary_color"
                    name="primary_color"
                    type="color"
                    defaultValue={business?.primary_color ?? "#1d4ed8"}
                    className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                  />
                  <span className="text-sm text-slate-500">Se usa en el formulario y la hoja.</span>
                </div>
              </Field>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Con el plan Pro puedes mostrar tu logo y color, y quitar la marca LibroClaro.{" "}
              {business && (
                <Link href={`/app/${business.id}/plan`} className="font-semibold text-blue-700 hover:underline">
                  Ver planes →
                </Link>
              )}
            </p>
          )}
        </fieldset>
      )}

      <div className="flex items-center justify-end gap-3">
        <SubmitButton pendingText={mode === "create" ? "Creando…" : "Guardando…"}>
          {mode === "create" ? "Crear mi libro de reclamaciones" : "Guardar cambios"}
        </SubmitButton>
      </div>
    </form>
  );
}
