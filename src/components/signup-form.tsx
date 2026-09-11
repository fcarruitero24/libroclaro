"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import { signUpWithBusiness } from "@/lib/actions/onboarding";
import { slugify } from "@/lib/format";
import type { ActionState } from "@/lib/types";

const initial: ActionState = {};

type EstadoRuc =
  | { tipo: "vacio" }
  | { tipo: "buscando" }
  | { tipo: "verificado"; razonSocial: string; estado: string | null; activo: boolean }
  | { tipo: "manual"; mensaje: string };

export function SignupForm({ appUrl }: { appUrl: string }) {
  const [state, action] = useActionState(signUpWithBusiness, initial);
  const [ruc, setRuc] = useState("");
  const [estadoRuc, setEstadoRuc] = useState<EstadoRuc>({ tipo: "vacio" });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const peticion = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fe = state.fieldErrors ?? {};

  // Limpia el temporizador pendiente si el usuario se va de la página.
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  function alCambiarRuc(valor: string) {
    const limpio = valor.replace(/\D/g, "").slice(0, 11);
    setRuc(limpio);
    if (temporizador.current) clearTimeout(temporizador.current);

    if (limpio.length !== 11) {
      peticion.current++; // invalida cualquier respuesta en vuelo
      setEstadoRuc({ tipo: "vacio" });
      return;
    }

    const id = ++peticion.current;
    setEstadoRuc({ tipo: "buscando" });

    temporizador.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ruc?numero=${limpio}`);
        const json = await res.json();
        if (id !== peticion.current) return; // llegó una respuesta vieja

        if (json.ok) {
          setEstadoRuc({
            tipo: "verificado",
            razonSocial: json.razonSocial,
            estado: json.estado ?? null,
            activo: Boolean(json.activo),
          });
          setName(json.razonSocial);
          if (json.direccion) setAddress((actual) => actual || json.direccion);
          if (!slugTocado) setSlug(slugify(json.razonSocial));
        } else {
          setEstadoRuc({ tipo: "manual", mensaje: json.mensaje ?? "No pudimos consultar SUNAT." });
        }
      } catch {
        if (id === peticion.current) {
          setEstadoRuc({ tipo: "manual", mensaje: "No pudimos consultar SUNAT. Escribe los datos a mano." });
        }
      }
    }, 350);
  }

  const enlacePreview = slug || slugify(name) || "tu-negocio";

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
    <form action={action} className="space-y-6">
      {state.error && <Alert kind="error">{state.error}</Alert>}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">1. Tu negocio</legend>

        <Field
          label="RUC"
          htmlFor="ruc"
          required
          error={fe.ruc}
          hint={estadoRuc.tipo === "vacio" ? "Escribe los 11 dígitos y traemos tus datos de SUNAT." : undefined}
        >
          <Input
            id="ruc"
            name="ruc"
            required
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            value={ruc}
            onChange={(e) => alCambiarRuc(e.target.value)}
            placeholder="20123456789"
          />
        </Field>

        {estadoRuc.tipo === "buscando" && (
          <p className="text-sm text-slate-500">Consultando SUNAT…</p>
        )}

        {estadoRuc.tipo === "verificado" && (
          <>
            <div className="anim-fade-up rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Verificado en SUNAT</p>
              <p className="mt-0.5 font-semibold text-slate-900">{estadoRuc.razonSocial}</p>
              {estadoRuc.estado && (
                <p className="mt-0.5 text-xs text-slate-600">Estado en SUNAT: {estadoRuc.estado}</p>
              )}
            </div>
            {!estadoRuc.activo && estadoRuc.estado && (
              <Alert kind="warning">
                Este RUC no figura como activo en SUNAT. Regulariza tu situación antes de publicar tu libro.
              </Alert>
            )}
            <input type="hidden" name="name" value={estadoRuc.razonSocial} />
          </>
        )}

        {estadoRuc.tipo === "manual" && (
          <>
            <Alert kind="info">{estadoRuc.mensaje}</Alert>
            <Field label="Razón social" htmlFor="name" required error={fe.name}>
              <Input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTocado) setSlug(slugify(e.target.value));
                }}
                placeholder="Tienda Ejemplo S.A.C."
              />
            </Field>
          </>
        )}

        <Field
          label="Dirección del establecimiento"
          htmlFor="address"
          required
          error={fe.address}
          hint="Aparece en cada hoja de reclamación. Puedes corregirla si difiere de la de SUNAT."
        >
          <Input
            id="address"
            name="address"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Av. Ejemplo 123, Miraflores, Lima"
          />
        </Field>

        <Field
          label="WhatsApp del negocio"
          htmlFor="phone"
          error={fe.phone}
          hint="Opcional. Lo usamos para avisarte de reclamos urgentes y darte soporte."
        >
          <Input id="phone" name="phone" inputMode="tel" placeholder="999 999 999" />
        </Field>

        <Field
          label="Enlace de tu libro"
          htmlFor="slug"
          required
          error={fe.slug}
          hint={`Quedará así: ${appUrl.replace(/^https?:\/\//, "")}/r/${enlacePreview}`}
        >
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTocado(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="tu-negocio"
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-5">
        <legend className="text-sm font-semibold text-slate-900">2. Tu cuenta</legend>

        <Field label="Correo electrónico" htmlFor="email" required error={fe.email} hint="Aquí llegarán los avisos de reclamos.">
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@negocio.pe" />
        </Field>

        <Field label="Contraseña" htmlFor="password" required error={fe.password} hint="Mínimo 8 caracteres.">
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </fieldset>

      <div className="space-y-2">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="acepta" className="mt-1 h-4 w-4 rounded border-slate-300" />
          <span>
            Declaro que represento a este negocio y estoy autorizado a registrar su Libro de Reclamaciones. Acepto los{" "}
            <Link href="/terminos" className="underline">
              Términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="underline">
              Política de privacidad
            </Link>
            . <span className="text-red-600">*</span>
          </span>
        </label>
        {fe.acepta && <p className="text-xs text-red-600">{fe.acepta}</p>}
      </div>

      <SubmitButton className="w-full py-3 text-base" pendingText="Creando tu libro…">
        Crear mi libro de reclamaciones
      </SubmitButton>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-blue-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
