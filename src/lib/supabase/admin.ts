import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/** ¿Está configurada la service role key? (necesaria para webhooks, cron y admin) */
export function hasAdminClient(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Cliente con service role: omite RLS. Úsalo SOLO en el servidor
 * (webhooks de pago, cron de recordatorios, activación manual de planes).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  }
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
