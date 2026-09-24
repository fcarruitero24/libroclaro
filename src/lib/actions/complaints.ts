"use server";

import { revalidatePath } from "next/cache";
import { sendEmail, tplConsumerResponse } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { createClient, requireUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const STATUSES = new Set(["pendiente", "en_proceso", "respondido", "cerrado"]);

export async function respondComplaint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const businessId = String(formData.get("business_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const response = String(formData.get("response") ?? "").trim();
  const notify = formData.get("notify") === "on";

  if (!id || !businessId) return { error: "Reclamo inválido." };
  if (!STATUSES.has(status)) return { error: "Estado inválido." };
  if ((status === "respondido" || status === "cerrado") && response.length < 10) {
    return { error: "Escribe una respuesta de al menos 10 caracteres antes de marcar como respondido." };
  }

  const { data: current, error: curError } = await supabase
    .from("complaints")
    .select("id, code, status, response, responded_at, consumer_email, public_token, businesses(name, email)")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();
  if (curError || !current) return { error: "No se encontró el reclamo." };

  const nowResponded = status === "respondido" || status === "cerrado";
  const patch: Record<string, unknown> = {
    status,
    response: response || null,
  };
  if (nowResponded && !current.responded_at) patch.responded_at = new Date().toISOString();

  const { error } = await supabase.from("complaints").update(patch).eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  let note = "Cambios guardados.";
  if (nowResponded && notify && response) {
    const biz = Array.isArray(current.businesses) ? current.businesses[0] : current.businesses;
    const appUrl = await getAppUrl();
    const tpl = tplConsumerResponse({
      businessName: biz?.name ?? "El proveedor",
      code: current.code,
      response,
      hojaUrl: `${appUrl}/h/${current.public_token}`,
    });
    const sent = await sendEmail({ to: current.consumer_email, replyTo: biz?.email, ...tpl });
    // El cambio de estado y la respuesta los anota el trigger; que el correo
    // salió solo lo sabe la aplicación.
    if (sent.ok) {
      await supabase.from("complaint_events").insert({
        complaint_id: id,
        business_id: businessId,
        type: "respuesta_enviada",
        data: { correo: current.consumer_email },
        actor_id: user.id,
      });
    }
    note = sent.ok
      ? "Respuesta guardada y enviada al consumidor por correo."
      : sent.skipped
        ? "Respuesta guardada. (Correo no enviado: falta configurar RESEND_API_KEY.)"
        : "Respuesta guardada, pero el correo al consumidor falló. Comunícasela por otro medio.";
  }

  revalidatePath(`/app/${businessId}`, "layout");
  return { success: note };
}
