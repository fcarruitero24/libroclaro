import { escapeHtml, fmtDate } from "@/lib/format";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "LibroClaro <no-responder@libroclaro.pe>";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/** Envía un correo con Resend. Si no hay API key, lo registra en consola y continúa. */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean }> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (!RESEND_API_KEY) {
    console.log(`[email:omitido] sin RESEND_API_KEY · "${input.subject}" → ${to.join(", ")}`);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: input.subject,
        html: input.html,
        reply_to: input.replyTo,
      }),
    });
    if (!res.ok) {
      console.error("[email:error]", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email:error]", err);
    return { ok: false };
  }
}

function layout(title: string, body: string, footer = "Enviado por LibroClaro · Libro de Reclamaciones Virtual") {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0f766e;color:#fff;padding:20px 28px;font-size:18px;font-weight:700">${escapeHtml(title)}</div>
    <div style="padding:28px;font-size:15px;line-height:1.6">${body}</div>
    <div style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px">${escapeHtml(footer)}</div>
  </div></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${escapeHtml(label)}</a></p>`;
}

export function tplConsumerCopy(p: {
  businessName: string;
  code: string;
  kind: string;
  hojaUrl: string;
  dueAt: string;
}) {
  const kind = p.kind === "queja" ? "queja" : "reclamo";
  return {
    subject: `Copia de tu ${kind} N.º ${p.code} · ${p.businessName}`,
    html: layout(
      `Hoja de reclamación N.º ${p.code}`,
      `<p>Hola,</p>
       <p>Hemos registrado tu <strong>${kind}</strong> en el Libro de Reclamaciones Virtual de <strong>${escapeHtml(p.businessName)}</strong>.</p>
       <p>De acuerdo con el Código de Protección y Defensa del Consumidor, el proveedor debe darte respuesta en un plazo máximo de <strong>15 días hábiles</strong> (hasta el <strong>${fmtDate(p.dueAt)}</strong>).</p>
       <p>Puedes ver, imprimir o guardar en PDF tu hoja de reclamación aquí:</p>
       ${button(p.hojaUrl, "Ver mi hoja de reclamación")}
       <p style="color:#64748b;font-size:13px">Si el proveedor no responde dentro del plazo, puedes reportarlo ante INDECOPI a través de Reclama Virtual.</p>`,
    ),
  };
}

export function tplBusinessAlert(p: {
  businessName: string;
  code: string;
  kind: string;
  consumerName: string;
  detail: string;
  dashboardUrl: string;
  dueAt: string;
}) {
  const kind = p.kind === "queja" ? "Queja" : "Reclamo";
  return {
    subject: `Nuevo ${kind.toLowerCase()} N.º ${p.code} · responde antes del ${fmtDate(p.dueAt)}`,
    html: layout(
      `Nuevo ${kind} recibido`,
      `<p><strong>${escapeHtml(p.businessName)}</strong> recibió un nuevo ${kind.toLowerCase()} de <strong>${escapeHtml(p.consumerName)}</strong>.</p>
       <blockquote style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #0f766e;color:#334155">${escapeHtml(p.detail).slice(0, 600)}</blockquote>
       <p>Plazo legal de respuesta: <strong>15 días hábiles</strong>, vence el <strong>${fmtDate(p.dueAt)}</strong>.</p>
       ${button(p.dashboardUrl, "Responder ahora")}`,
    ),
  };
}

export function tplConsumerResponse(p: {
  businessName: string;
  code: string;
  response: string;
  hojaUrl: string;
}) {
  return {
    subject: `Respuesta a tu reclamo N.º ${p.code} · ${p.businessName}`,
    html: layout(
      `Respuesta del proveedor`,
      `<p><strong>${escapeHtml(p.businessName)}</strong> ha respondido a tu hoja de reclamación <strong>N.º ${p.code}</strong>:</p>
       <blockquote style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #16a34a;color:#334155;white-space:pre-wrap">${escapeHtml(p.response)}</blockquote>
       ${button(p.hojaUrl, "Ver hoja completa")}
       <p style="color:#64748b;font-size:13px">Si no estás conforme con la respuesta, puedes acudir a INDECOPI.</p>`,
    ),
  };
}

export function tplReminder(p: {
  businessName: string;
  items: { code: string; daysLeft: number; url: string }[];
  dashboardUrl: string;
}) {
  const rows = p.items
    .map(
      (i) =>
        `<li><a href="${i.url}">N.º ${i.code}</a> — ${
          i.daysLeft < 0
            ? `<strong style="color:#dc2626">vencido hace ${-i.daysLeft} día(s) hábil(es)</strong>`
            : i.daysLeft === 0
              ? `<strong style="color:#dc2626">vence hoy</strong>`
              : `vence en <strong>${i.daysLeft} día(s) hábil(es)</strong>`
        }</li>`,
    )
    .join("");
  return {
    subject: `${p.items.length} reclamo(s) por vencer · ${p.businessName}`,
    html: layout(
      `Reclamos pendientes por vencer`,
      `<p>Estos reclamos de <strong>${escapeHtml(p.businessName)}</strong> están cerca del límite legal de 15 días hábiles:</p>
       <ul>${rows}</ul>
       ${button(p.dashboardUrl, "Ir al panel")}`,
    ),
  };
}

// ---------------------------------------------------------------------------
// Avisos al dueño de la plataforma
// ---------------------------------------------------------------------------

/** Manda un aviso a PLATFORM_EMAIL. Sin esa variable no hace nada. */
export async function notifyPlatform(tpl: { subject: string; html: string }) {
  const to = process.env.PLATFORM_EMAIL;
  if (!to) return { ok: false, skipped: true };
  return sendEmail({ to, ...tpl });
}

export function tplPlatformNewBusiness(p: {
  name: string;
  ruc: string;
  email: string;
  publicUrl: string;
  origen: "registro" | "negocio adicional";
  verificadoSunat?: boolean;
}) {
  const sunat =
    p.verificadoSunat === undefined ? "" : p.verificadoSunat ? " · verificado en SUNAT" : " · SUNAT no respondió";
  return {
    subject: `Nuevo ${p.origen === "registro" ? "registro" : "negocio"}: ${p.name}`,
    html: layout(
      p.origen === "registro" ? "Nuevo registro" : "Un cliente agregó otro negocio",
      `<p><strong>${escapeHtml(p.name)}</strong> acaba de crear su Libro de Reclamaciones.</p>
       <ul>
         <li>RUC: <strong>${escapeHtml(p.ruc)}</strong>${sunat}</li>
         <li>Correo: ${escapeHtml(p.email)}</li>
         <li>Plan: Gratis</li>
       </ul>
       ${button(p.publicUrl, "Ver su libro")}`,
      "Aviso interno de LibroClaro",
    ),
  };
}

const ESTADO_SUSCRIPCION: Record<string, string> = {
  authorized: "activa",
  paused: "pausada",
  cancelled: "cancelada",
  pending: "pendiente de pago",
};

export function tplPlatformSubscription(p: {
  businessName: string;
  planName: string;
  period: "monthly" | "yearly";
  status: string;
  previo: string | null;
  hasta: string | null;
}) {
  const estado = ESTADO_SUSCRIPCION[p.status] ?? p.status;
  const titulo =
    p.status === "authorized"
      ? p.previo && p.previo !== "pending"
        ? "Suscripción reactivada"
        : "Nueva suscripción"
      : p.status === "cancelled"
        ? "Suscripción cancelada"
        : p.status === "paused"
          ? "Suscripción pausada"
          : "Cambio en una suscripción";
  return {
    subject: `${titulo}: ${p.businessName} · ${p.planName} ${p.period === "yearly" ? "anual" : "mensual"}`,
    html: layout(
      titulo,
      `<p><strong>${escapeHtml(p.businessName)}</strong> · plan <strong>${escapeHtml(p.planName)}</strong> ${
        p.period === "yearly" ? "anual" : "mensual"
      }.</p>
       <p>Estado en Mercado Pago: <strong>${escapeHtml(estado)}</strong>${
         p.previo ? ` (antes: ${escapeHtml(ESTADO_SUSCRIPCION[p.previo] ?? p.previo)})` : ""
       }.</p>
       ${p.hasta ? `<p>Plan vigente hasta el <strong>${fmtDate(p.hasta)}</strong>.</p>` : ""}`,
      "Aviso interno de LibroClaro",
    ),
  };
}

// ---------------------------------------------------------------------------
// Recordatorio de plan por vencer, para el cliente
// ---------------------------------------------------------------------------

export function tplPlanReminder(p: {
  businessName: string;
  planName: string;
  stage: "7d" | "1d" | "0d";
  /** La suscripción de Mercado Pago está activa: el plan se cobra solo. */
  seRenuevaSolo: boolean;
  venceEl: string;
  /** Fecha del cobro automático (solo con suscripción activa). */
  cobroEl: string;
  /** Último día antes de bajar a Gratis. */
  graciaHasta: string;
  planUrl: string;
}) {
  const negocio = escapeHtml(p.businessName);
  const plan = escapeHtml(p.planName);
  const queSePierde = `vuelve la marca LibroClaro a tu formulario y se apagan las alertas por correo y los recordatorios de plazo. Tu libro <strong>sigue recibiendo reclamos</strong>: el plan Gratis también los recibe sin límite.`;

  if (p.seRenuevaSolo && p.stage === "7d") {
    return {
      subject: `Tu plan ${p.planName} se renueva el ${fmtDate(p.cobroEl)} · ${p.businessName}`,
      html: layout(
        `Tu plan ${p.planName} se renueva pronto`,
        `<p>El plan <strong>${plan}</strong> de <strong>${negocio}</strong> se renueva automáticamente el <strong>${fmtDate(p.cobroEl)}</strong> con el medio de pago que registraste en Mercado Pago.</p>
         <p>No tienes que hacer nada. Si prefieres no renovarlo, puedes cancelar la suscripción desde tu cuenta de Mercado Pago antes de esa fecha.</p>
         ${button(p.planUrl, "Ver mi plan")}`,
      ),
    };
  }

  if (p.seRenuevaSolo) {
    return {
      subject: `No pudimos renovar tu plan ${p.planName} · ${p.businessName}`,
      html: layout(
        "No pudimos cobrar la renovación",
        `<p>Mercado Pago todavía no pudo cobrar la renovación del plan <strong>${plan}</strong> de <strong>${negocio}</strong>. Suele pasar cuando la tarjeta venció o no tiene saldo.</p>
         <p>Revisa tu medio de pago en Mercado Pago. Si no se resuelve, el <strong>${fmtDate(p.graciaHasta)}</strong> ${queSePierde}</p>
         ${button(p.planUrl, "Ver mi plan")}`,
      ),
    };
  }

  if (p.stage === "0d") {
    // El cron corre a las 8 a. m.: un plan que vence esa misma noche todavía no venció.
    const yaVencio = new Date(p.venceEl).getTime() <= Date.now();
    const estado = yaVencio ? "venció" : "vence hoy";
    return {
      subject: `Tu plan ${p.planName} ${estado} · tienes hasta el ${fmtDate(p.graciaHasta)} · ${p.businessName}`,
      html: layout(
        `Tu plan ${p.planName} ${estado}`,
        `<p>El plan <strong>${plan}</strong> de <strong>${negocio}</strong> ${
          yaVencio ? `venció el <strong>${fmtDate(p.venceEl)}</strong>` : "<strong>vence hoy</strong>"
        }.</p>
         <p>Te damos hasta el <strong>${fmtDate(p.graciaHasta)}</strong> para renovarlo. Después ${queSePierde}</p>
         ${button(p.planUrl, "Renovar mi plan")}`,
      ),
    };
  }

  const cuando = p.stage === "1d" ? "mañana" : `el ${fmtDate(p.venceEl)}`;
  return {
    subject: `Tu plan ${p.planName} vence ${cuando} · ${p.businessName}`,
    html: layout(
      `Tu plan ${p.planName} vence ${cuando}`,
      `<p>El plan <strong>${plan}</strong> de <strong>${negocio}</strong> vence <strong>${cuando}</strong>.</p>
       <p>Renuévalo para no perder lo que incluye. Si no lo renuevas, ${queSePierde}</p>
       ${button(p.planUrl, "Renovar mi plan")}`,
    ),
  };
}
