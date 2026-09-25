import { headers } from "next/headers";

/**
 * Valores públicos. La URL y la clave anon/publishable de Supabase están
 * diseñadas para exponerse en el navegador (la seguridad la da RLS).
 * Los secretos (service role, Mercado Pago, Resend, admin) SOLO se leen
 * de variables de entorno del servidor.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rcjgprzmvtspviwyyrhy.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjamdwcnptdnRzcHZpd3l5cmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDU5NjIsImV4cCI6MjEwNDQ4MTk2Mn0.GBq8jnsnT6PYSXQ9MR2VgbsnXBu5vEqOXs4OQKJCz7M";

export const APP_NAME = "LibroClaro";

/** WhatsApp de soporte/ventas (solo dígitos, con código de país). */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
/** Número de Yape/Plin para pagos manuales. */
export const YAPE_NUMBER = process.env.NEXT_PUBLIC_YAPE_NUMBER ?? "";
export const YAPE_NAME = process.env.NEXT_PUBLIC_YAPE_NAME ?? "";

/**
 * URL base de la app. Prioridad: NEXT_PUBLIC_APP_URL → host de la petición →
 * localhost. En producción NEXT_PUBLIC_APP_URL va fija en el build.
 */
export async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    // Solo "host": Cloudflare enruta por él, así que no se puede falsear. Los
    // x-forwarded-* en cambio los manda el cliente tal cual y servirían para
    // meter otro dominio en los enlaces de los correos.
    const host = h.get("host");
    if (host) {
      const proto = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
      return `${proto}://${host}`;
    }
  } catch {
    // fuera de un request (p. ej. cron)
  }
  return "http://localhost:3000";
}
