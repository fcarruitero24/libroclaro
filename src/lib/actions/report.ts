"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/env";
import { escapeHtml } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/**
 * Reporte de suplantación: la empresa real avisa que un libro publicado
 * con su RUC no le pertenece.
 *
 * No hay forma de verificar la titularidad de un RUC sin la Clave SOL del
 * contribuyente, así que este es el mecanismo de corrección: cualquiera
 * puede avisar, y una persona revisa y decide.
 */
export async function reportOwnership(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Honeypot anti-bots.
  if (str(formData, "website_url")) return { error: "No se pudo enviar el formulario." };

  const slug = str(formData, "slug").toLowerCase();
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const phone = str(formData, "phone");
  const reason = str(formData, "reason");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Ingresa tu nombre completo.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Ingresa un correo válido para poder responderte.";
  if (reason.length < 10) fieldErrors.reason = "Explica por qué este libro no corresponde a tu empresa.";
  if (reason.length > 3000) fieldErrors.reason = "Máximo 3000 caracteres.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, error: "Revisa los campos marcados." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  const ua = (h.get("user-agent") ?? "").slice(0, 300) || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_ownership", {
    p_slug: slug,
    p_name: name,
    p_email: email,
    p_phone: phone || null,
    p_reason: reason,
    p_ip: ip,
    p_user_agent: ua,
  });

  if (error) {
    if (error.message.includes("REPORTE_DUPLICADO")) {
      return { error: "Ya recibimos un reporte tuyo sobre este libro. Lo estamos revisando." };
    }
    if (error.message.includes("NEGOCIO_NO_ENCONTRADO")) {
      return { error: "Este libro de reclamaciones no existe." };
    }
    console.error("[report_ownership]", error);
    return { error: "No se pudo enviar el reporte. Intenta nuevamente en unos minutos." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const businessName = row?.business_name ?? slug;

  // Aviso a la plataforma. Sin Resend configurado queda en el registro del
  // servidor; el reporte igual está guardado en la base.
  const destino = process.env.PLATFORM_EMAIL;
  if (destino) {
    const appUrl = await getAppUrl();
    await sendEmail({
      to: destino,
      replyTo: email,
      subject: `Reporte de suplantación · ${businessName}`,
      html: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}${phone ? `, ${escapeHtml(phone)}` : ""})
             reporta que el libro <a href="${appUrl}/r/${escapeHtml(slug)}">${escapeHtml(slug)}</a>
             no pertenece a su empresa.</p>
             <blockquote style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #0f766e;white-space:pre-wrap">${escapeHtml(reason)}</blockquote>
             <p style="color:#64748b;font-size:13px">Revisa la tabla <code>ownership_reports</code> en Supabase para gestionarlo.</p>`,
    });
  } else {
    console.log(`[reporte de suplantación] ${slug} · ${name} <${email}> · ${reason.slice(0, 200)}`);
  }

  redirect(`/r/${slug}/reportar?enviado=1`);
}
