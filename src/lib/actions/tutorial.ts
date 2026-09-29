"use server";

import { createClient, requireUser } from "@/lib/supabase/server";

/**
 * Marca que el dueño ya vio (o saltó) el tutorial del panel. Se guarda en
 * los metadatos de su usuario de Supabase, no en el navegador: así no le
 * vuelve a salir al entrar desde el celular u otra computadora, y no hace
 * falta una tabla ni una migración.
 */
export async function marcarTutorialVisto(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { tutorial_panel_visto: new Date().toISOString() } });
}
