"use server";

import { revalidatePath } from "next/cache";
import { esCategoria } from "@/lib/categorias";
import { planFor } from "@/lib/plans";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { ActionState, Business } from "@/lib/types";

/**
 * Acciones del panel que no son la respuesta en sí: categoría interna,
 * notas del historial y plantillas. El historial de categoría lo escribe
 * el trigger de complaints (migración 0006); aquí solo se actualiza.
 */

export async function setCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const businessId = String(formData.get("business_id") ?? "");
  const raw = String(formData.get("category") ?? "");
  const category = raw === "" ? null : raw;

  if (!id || !businessId) return { error: "Reclamo inválido." };
  if (category !== null && !esCategoria(category)) return { error: "Categoría inválida." };

  const { error } = await supabase
    .from("complaints")
    .update({ category })
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/app/${businessId}`, "layout");
  return { success: "Categoría guardada." };
}

export async function addNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const businessId = String(formData.get("business_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();

  if (!complaintId || !businessId) return { error: "Reclamo inválido." };
  if (texto.length < 3) return { error: "Escribe la nota antes de guardarla." };
  if (texto.length > 2000) return { error: "La nota puede tener hasta 2000 caracteres." };

  // La política de la tabla ya exige que el reclamo sea de un negocio del
  // usuario; si no lo es, el insert falla.
  const { error } = await supabase.from("complaint_events").insert({
    complaint_id: complaintId,
    business_id: businessId,
    type: "nota",
    data: { texto },
    actor_id: user.id,
  });
  if (error) return { error: `No se pudo guardar la nota: ${error.message}` };

  revalidatePath(`/app/${businessId}/reclamo/${complaintId}`);
  return { success: "Nota agregada." };
}

/** El plan que habilita plantillas es el del negocio desde el que se guardan. */
async function puedeUsarPlantillas(businessId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("plan, plan_expires_at")
    .eq("id", businessId)
    .maybeSingle();
  return Boolean(data && planFor(data as Pick<Business, "plan" | "plan_expires_at">).templates);
}

export async function saveTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();
  const businessId = String(formData.get("business_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!(await puedeUsarPlantillas(businessId))) {
    return { error: "Las plantillas están disponibles desde el plan Pro." };
  }
  const fieldErrors: Record<string, string> = {};
  if (title.length < 2 || title.length > 80) fieldErrors.title = "El nombre debe tener entre 2 y 80 caracteres.";
  if (body.length < 10 || body.length > 5000) fieldErrors.body = "El texto debe tener entre 10 y 5000 caracteres.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { error } = id
    ? await supabase.from("response_templates").update({ title, body }).eq("id", id).eq("owner_id", user.id)
    : await supabase.from("response_templates").insert({ owner_id: user.id, title, body });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/app/${businessId}`, "layout");
  return { success: id ? "Plantilla actualizada." : "Plantilla creada." };
}

export async function deleteTemplate(formData: FormData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const businessId = String(formData.get("business_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("response_templates").delete().eq("id", id).eq("owner_id", user.id);
  revalidatePath(`/app/${businessId}`, "layout");
}
