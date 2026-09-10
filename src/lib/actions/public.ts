"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendEmail, tplBusinessAlert, tplConsumerCopy } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOC_TYPES = new Set(["DNI", "CE", "PASAPORTE", "RUC"]);

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function submitComplaint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Honeypot anti-bots: campo oculto que los humanos no llenan.
  if (str(formData, "website_url")) return { error: "No se pudo enviar el formulario." };

  const slug = str(formData, "slug").toLowerCase();
  const fieldErrors: Record<string, string> = {};

  const consumer_name = str(formData, "consumer_name");
  const consumer_doc_type = str(formData, "consumer_doc_type").toUpperCase();
  const consumer_doc_number = str(formData, "consumer_doc_number").replace(/\s/g, "");
  const consumer_address = str(formData, "consumer_address");
  const consumer_phone = str(formData, "consumer_phone");
  const consumer_email = str(formData, "consumer_email").toLowerCase();
  const is_minor = formData.get("is_minor") === "on";
  const guardian_name = str(formData, "guardian_name");
  const item_type = str(formData, "item_type");
  const amountRaw = str(formData, "amount").replace(",", ".");
  const item_description = str(formData, "item_description");
  const kind = str(formData, "kind");
  const detail = str(formData, "detail");
  const request = str(formData, "request");
  const accepted = formData.get("accept") === "on";

  if (consumer_name.length < 2) fieldErrors.consumer_name = "Ingresa tu nombre completo.";
  if (!DOC_TYPES.has(consumer_doc_type)) fieldErrors.consumer_doc_type = "Selecciona el tipo de documento.";
  if (consumer_doc_number.length < 6 || consumer_doc_number.length > 20) fieldErrors.consumer_doc_number = "Número de documento inválido.";
  if (consumer_address.length < 5) fieldErrors.consumer_address = "Ingresa tu domicilio.";
  if (!EMAIL_RE.test(consumer_email)) fieldErrors.consumer_email = "Ingresa un correo válido: ahí recibirás la copia de tu reclamo.";
  if (is_minor && guardian_name.length < 2) fieldErrors.guardian_name = "Indica el nombre del padre, madre o apoderado.";
  if (item_type !== "producto" && item_type !== "servicio") fieldErrors.item_type = "Indica si es producto o servicio.";
  let amount: number | null = null;
  if (amountRaw) {
    amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) fieldErrors.amount = "Monto inválido.";
  }
  if (item_description.length < 3) fieldErrors.item_description = "Describe el producto o servicio.";
  if (kind !== "reclamo" && kind !== "queja") fieldErrors.kind = "Selecciona reclamo o queja.";
  if (detail.length < 10) fieldErrors.detail = "Describe con más detalle lo ocurrido (mínimo 10 caracteres).";
  if (detail.length > 5000) fieldErrors.detail = "Máximo 5000 caracteres.";
  if (request.length < 3) fieldErrors.request = "Indica qué solicitas al proveedor.";
  if (!accepted) fieldErrors.accept = "Debes aceptar la declaración para continuar.";

  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revisa los campos marcados en rojo." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  const ua = (h.get("user-agent") ?? "").slice(0, 300) || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_complaint", {
    p_slug: slug,
    p_consumer_name: consumer_name,
    p_consumer_doc_type: consumer_doc_type,
    p_consumer_doc_number: consumer_doc_number,
    p_consumer_address: consumer_address,
    p_consumer_phone: consumer_phone || null,
    p_consumer_email: consumer_email,
    p_is_minor: is_minor,
    p_guardian_name: guardian_name || null,
    p_item_type: item_type,
    p_amount: amount,
    p_item_description: item_description,
    p_kind: kind,
    p_detail: detail,
    p_request: request,
    p_consumer_ip: ip,
    p_user_agent: ua,
  });

  if (error) {
    if (error.message.includes("NEGOCIO_NO_ENCONTRADO")) return { error: "Este libro de reclamaciones no existe." };
    if (error.message.includes("NEGOCIO_ARCHIVADO")) {
      return { error: "Este libro de reclamaciones fue cerrado por el proveedor y ya no acepta reclamos nuevos." };
    }
    console.error("[submit_complaint]", error);
    return { error: "No se pudo registrar tu reclamo. Intenta nuevamente en unos minutos." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "No se pudo registrar tu reclamo." };

  const appUrl = await getAppUrl();
  const hojaUrl = `${appUrl}/h/${row.public_token}`;
  const plan = planFor({ plan: row.business_plan, plan_expires_at: row.business_plan_expires_at });

  const consumerTpl = tplConsumerCopy({
    businessName: row.business_name,
    code: row.code,
    kind,
    hojaUrl,
    dueAt: row.due_at,
  });

  const jobs: Promise<unknown>[] = [sendEmail({ to: consumer_email, replyTo: row.business_email, ...consumerTpl })];

  if (plan.businessAlerts) {
    const bizTpl = tplBusinessAlert({
      businessName: row.business_name,
      code: row.code,
      kind,
      consumerName: consumer_name,
      detail,
      dashboardUrl: `${appUrl}/app`,
      dueAt: row.due_at,
    });
    jobs.push(sendEmail({ to: row.business_email, ...bizTpl }));
  }

  await Promise.allSettled(jobs);

  redirect(`/h/${row.public_token}?registrado=1`);
}
