"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/format";
import { PLANS, planFor } from "@/lib/plans";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;
const RESERVED = new Set(["app", "api", "admin", "login", "registro", "libroclaro", "r", "h", "www"]);

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function validateBusiness(fd: FormData, opts: { requireSlug: boolean }) {
  const fieldErrors: Record<string, string> = {};
  const name = str(fd, "name");
  const ruc = str(fd, "ruc").replace(/\D/g, "");
  const address = str(fd, "address");
  const email = str(fd, "email").toLowerCase();
  const phone = str(fd, "phone");
  let website = str(fd, "website");
  let slug = str(fd, "slug").toLowerCase();

  if (name.length < 2 || name.length > 120) fieldErrors.name = "Ingresa la razón social o nombre comercial.";
  if (!/^\d{11}$/.test(ruc)) fieldErrors.ruc = "El RUC debe tener 11 dígitos.";
  if (address.length < 5) fieldErrors.address = "Ingresa la dirección del establecimiento.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Ingresa un correo válido para recibir notificaciones.";
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  if (opts.requireSlug) {
    if (!slug) slug = slugify(name);
    if (!SLUG_RE.test(slug)) fieldErrors.slug = "Usa solo letras minúsculas, números y guiones (3 a 50 caracteres).";
    else if (RESERVED.has(slug)) fieldErrors.slug = "Ese enlace está reservado. Elige otro.";
  }

  return { fieldErrors, values: { name, ruc, address, email, phone: phone || null, website: website || null, slug } };
}

export async function createBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { fieldErrors, values } = validateBusiness(formData, { requireSlug: true });
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revisa los campos marcados." };

  // Límite de negocios según el plan más alto que tenga el usuario
  const { data: existing, error: listError } = await supabase
    .from("businesses")
    .select("id, plan, plan_expires_at")
    .eq("owner_id", user.id);
  if (listError) return { error: "No se pudo verificar tu plan. Intenta de nuevo." };

  const maxAllowed = Math.max(PLANS.free.maxBusinesses, ...(existing ?? []).map((b) => planFor(b).maxBusinesses));
  if ((existing?.length ?? 0) >= maxAllowed) {
    return {
      error: `Tu plan actual permite ${maxAllowed} negocio${maxAllowed === 1 ? "" : "s"}. Mejora a Pro para agregar sucursales.`,
    };
  }

  const { data, error } = await supabase
    .from("businesses")
    .insert({ owner_id: user.id, ...values })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "Ese enlace ya está en uso. Elige otro." }, error: "Revisa los campos marcados." };
    return { error: `No se pudo crear el negocio: ${error.message}` };
  }

  redirect(`/app/${data.id}?bienvenida=1`);
}

export async function updateBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Negocio inválido." };

  const { fieldErrors, values } = validateBusiness(formData, { requireSlug: false });
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revisa los campos marcados." };

  const { data: current, error: curError } = await supabase
    .from("businesses")
    .select("plan, plan_expires_at")
    .eq("id", id)
    .single();
  if (curError || !current) return { error: "No se encontró el negocio." };

  const plan = planFor(current);
  const patch: Record<string, unknown> = {
    name: values.name,
    ruc: values.ruc,
    address: values.address,
    email: values.email,
    phone: values.phone,
    website: values.website,
  };

  if (plan.customBranding) {
    const logo = str(formData, "logo_url");
    const color = str(formData, "primary_color");
    if (logo && !/^https?:\/\//i.test(logo)) return { fieldErrors: { logo_url: "Debe ser una URL que empiece con https://" }, error: "Revisa los campos marcados." };
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { fieldErrors: { primary_color: "Color inválido." }, error: "Revisa los campos marcados." };
    patch.logo_url = logo || null;
    if (color) patch.primary_color = color;
  }

  const { error } = await supabase.from("businesses").update(patch).eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/app/${id}`, "layout");
  return { success: "Cambios guardados." };
}

export async function deleteBusiness(formData: FormData): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const id = str(formData, "id");
  const confirm = str(formData, "confirm");
  if (!id || confirm !== "ELIMINAR") redirect(`/app/${id}/ajustes?error=confirmacion`);
  await supabase.from("businesses").delete().eq("id", id);
  revalidatePath("/app", "layout");
  redirect("/app");
}
