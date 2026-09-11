"use server";

import { redirect } from "next/navigation";
import { slugify } from "@/lib/format";
import { isValidRucFormat, lookupRuc } from "@/lib/ruc";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;
const RESERVADOS = new Set([
  "app", "api", "admin", "login", "registro", "libroclaro", "r", "h", "www", "auth", "terminos", "privacidad",
]);

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/**
 * Registro en un solo paso: crea la cuenta y deja el libro publicado.
 *
 * La razón social NO se toma de lo que envía el navegador. Se vuelve a
 * consultar el RUC en el servidor y, si SUNAT responde, manda el valor
 * oficial. Así nadie puede registrar un RUC real con el nombre de otra
 * empresa, que era el hueco que dejan los competidores.
 */
export async function signUpWithBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: Record<string, string> = {};

  const ruc = str(formData, "ruc").replace(/\D/g, "");
  const address = str(formData, "address");
  const phone = str(formData, "phone");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const acepta = formData.get("acepta") === "on";
  let name = str(formData, "name");
  let slug = str(formData, "slug").toLowerCase();

  if (!isValidRucFormat(ruc)) fieldErrors.ruc = "El RUC debe tener 11 dígitos y empezar en 10, 15, 16, 17 o 20.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Ingresa un correo válido.";
  if (password.length < 8) fieldErrors.password = "La contraseña debe tener al menos 8 caracteres.";
  if (address.length < 5) fieldErrors.address = "Ingresa la dirección de tu establecimiento.";
  if (!acepta) fieldErrors.acepta = "Debes aceptar la declaración para continuar.";

  // Fuente de verdad del nombre: SUNAT, no el navegador.
  let verificado = false;
  if (!fieldErrors.ruc) {
    const r = await lookupRuc(ruc);
    if (r.ok) {
      verificado = true;
      name = r.data.razonSocial;
      const estado = (r.data.estado ?? "").toUpperCase();
      if (estado && !estado.startsWith("ACTIVO")) {
        fieldErrors.ruc = `Según SUNAT este RUC está en estado "${r.data.estado}". Regulariza tu situación antes de registrarte.`;
      }
    } else if (r.reason === "no_encontrado") {
      fieldErrors.ruc = "No encontramos ese RUC en SUNAT. Revisa el número.";
    }
    // Si el servicio falló, se acepta el nombre escrito a mano.
  }

  if (!verificado && (name.length < 2 || name.length > 120)) {
    fieldErrors.name = "Ingresa la razón social de tu negocio.";
  }

  if (!slug) slug = slugify(name);
  if (!SLUG_RE.test(slug)) fieldErrors.slug = "Usa solo letras minúsculas, números y guiones.";
  else if (RESERVADOS.has(slug)) fieldErrors.slug = "Ese enlace está reservado. Elige otro.";

  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revisa los campos marcados." };

  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError) {
    const m = signUpError.message.toLowerCase();
    if (m.includes("already registered")) {
      return { fieldErrors: { email: "Ya existe una cuenta con ese correo. Inicia sesión." }, error: "Revisa los campos marcados." };
    }
    if (m.includes("password")) return { fieldErrors: { password: signUpError.message }, error: "Revisa los campos marcados." };
    return { error: signUpError.message };
  }

  if (!signUpData.session) {
    return {
      success:
        "Te enviamos un correo para confirmar tu cuenta. Ábrelo, haz clic en el enlace y termina de crear tu libro (revisa también la carpeta de spam).",
    };
  }

  const userId = signUpData.user?.id;
  if (!userId) return { error: "No se pudo crear la cuenta. Intenta de nuevo." };

  // El enlace debe ser único: si está tomado, se prueba con un sufijo.
  let creado: { id: string } | null = null;
  let ultimoError = "";
  for (let intento = 0; intento < 5 && !creado; intento++) {
    const candidato = intento === 0 ? slug : `${slug}-${intento + 1}`.slice(0, 50);
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        owner_id: userId,
        slug: candidato,
        name,
        ruc,
        address,
        email,
        phone: phone || null,
      })
      .select("id")
      .single();

    if (!error) {
      creado = data;
      break;
    }
    ultimoError = error.message;
    if (error.code !== "23505") break; // solo reintenta por enlace duplicado
  }

  if (!creado) {
    console.error("[signUpWithBusiness] negocio no creado:", ultimoError);
    // La cuenta sí existe: se manda a crear el negocio por el camino normal.
    redirect("/app/nuevo?error=registro");
  }

  redirect(`/app/${creado.id}?bienvenida=1`);
}
