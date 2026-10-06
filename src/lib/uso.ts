import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

/**
 * Guarda el último dato de una fuente del panel de consumo que no tiene
 * consulta propia (tabla uso_plataformas, migración 0009): la cuota de Resend
 * tras cada envío y el resultado de cada corrida de los recordatorios.
 *
 * Nunca lanza: si falla, el correo o el cron que lo llamó sigue igual y solo
 * se pierde este dato.
 */
export async function guardarUso(
  clave: "resend" | "cron.recordatorios",
  valor: Record<string, unknown>,
): Promise<void> {
  if (!hasAdminClient()) return;
  try {
    const { error } = await createAdminClient()
      .from("uso_plataformas")
      .upsert({ clave, valor, actualizado: new Date().toISOString() });
    if (error) console.error("[uso]", clave, error.message);
  } catch (err) {
    console.error("[uso]", clave, err);
  }
}
