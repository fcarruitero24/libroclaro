"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import {
  conReintento,
  INSTRUCCIONES_LIBIA,
  LIBIA_MODELO,
  LIBIA_MODELO_CORTO,
  limpiarBorrador,
  MAX_TOKENS_SALIDA,
  mensajeParaLibIA,
  neuronasReales,
  NOTA_MAXIMA,
  reservaDeNeuronas,
} from "@/lib/libia";
import { planFor } from "@/lib/plans";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createClient, requireUser } from "@/lib/supabase/server";

export type ResultadoLibIA =
  | { ok: true; texto: string; quedan: number }
  | {
      ok: false;
      motivo: "no_encontrado" | "sin_plan" | "nota_larga" | "tope_negocio" | "tope_global" | "fallo";
      mensaje: string;
    };

/** Lo que responde reservar_borrador_libia (migración 0010). */
interface Reserva {
  ok: boolean;
  motivo?: "sin_plan" | "tope_negocio" | "tope_global";
  dia?: string;
  quedan: number;
  limite: number;
}

const SIN_PLAN = "Tu plan ya no incluye LibIA.";
const FALLO: ResultadoLibIA = { ok: false, motivo: "fallo", mensaje: "LibIA no pudo escribir ahora. Inténtalo de nuevo." };
/** Menos que esto no es un borrador: el modelo respondió vacío o se cortó. */
const MINIMO_DE_TEXTO = 40;

/**
 * Le pide a LibIA un borrador de respuesta para un reclamo. Solo lee los datos
 * que necesita para redactar (nunca documento, dirección, teléfono ni
 * correo), reserva el cupo antes de llamar al modelo y lo ajusta a lo gastado
 * de verdad, o lo devuelve si falló. No guarda ni el borrador ni la nota.
 */
export async function pedirBorradorLibIA(entrada: {
  complaintId: string;
  businessId: string;
  nota: string;
}): Promise<ResultadoLibIA> {
  const user = await requireUser();
  const nota = entrada.nota.trim();
  if (nota.length > NOTA_MAXIMA) {
    return { ok: false, motivo: "nota_larga", mensaje: `La nota puede tener hasta ${NOTA_MAXIMA} caracteres.` };
  }

  // Con la sesión del dueño: la seguridad de filas solo entrega lo suyo, y
  // eso es lo que prueba que el negocio es suyo antes de usar la service role.
  const supabase = await createClient();
  const [{ data: reclamo }, { data: negocio }] = await Promise.all([
    supabase
      .from("complaints")
      .select("kind, item_type, item_description, amount, consumer_name, is_minor, guardian_name, detail, request")
      .eq("id", entrada.complaintId)
      .eq("business_id", entrada.businessId)
      .maybeSingle(),
    supabase.from("businesses").select("name, plan, plan_expires_at").eq("id", entrada.businessId).maybeSingle(),
  ]);
  if (!reclamo || !negocio) return { ok: false, motivo: "no_encontrado", mensaje: "No se encontró el reclamo." };
  if (!planFor(negocio).libia) return { ok: false, motivo: "sin_plan", mensaje: SIN_PLAN };
  if (!hasAdminClient()) {
    console.error("[libia]", "fallo", "falta SUPABASE_SERVICE_ROLE_KEY");
    return FALLO;
  }

  const mensaje = mensajeParaLibIA({ negocio: negocio.name, ...reclamo }, nota);
  const reserva = reservaDeNeuronas(INSTRUCCIONES_LIBIA, mensaje);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reservar_borrador_libia", {
    p_business_id: entrada.businessId,
    p_usuario: user.id,
    p_reserva: reserva,
  });
  if (error || !data) {
    console.error("[libia]", "reservar", error?.message ?? "sin respuesta");
    return FALLO;
  }
  const cupo = data as Reserva;
  if (!cupo.ok) {
    if (cupo.motivo === "tope_negocio") {
      return {
        ok: false,
        motivo: "tope_negocio",
        mensaje: `Ya usaste tus ${cupo.limite} borradores de hoy. Se renuevan a las 7:00 p. m.`,
      };
    }
    if (cupo.motivo === "tope_global") {
      return {
        ok: false,
        motivo: "tope_global",
        mensaje: "LibIA descansa hasta las 7:00 p. m. Mientras tanto, puedes escribir tu respuesta o usar una plantilla.",
      };
    }
    return { ok: false, motivo: "sin_plan", mensaje: SIN_PLAN };
  }

  let texto = "";
  let gastado: number | null = null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const respuesta = (await conReintento(() =>
      env.AI.run(LIBIA_MODELO, {
        messages: [
          { role: "system", content: INSTRUCCIONES_LIBIA },
          { role: "user", content: mensaje },
        ],
        temperature: 0.4,
        max_tokens: MAX_TOKENS_SALIDA,
      }),
    )) as { response?: unknown; usage?: unknown };
    texto = limpiarBorrador(String(respuesta.response ?? ""));
    if (texto.length >= MINIMO_DE_TEXTO) gastado = neuronasReales(respuesta.usage, reserva);
    else console.error("[libia]", "fallo", `respuesta de ${texto.length} caracteres`);
  } catch (e) {
    console.error("[libia]", "fallo", e instanceof Error ? e.message : String(e));
  }

  // Con lo gastado, la reserva se cambia por ese número; sin él (falló), el
  // cupo se devuelve al día en que se reservó.
  const { error: errorAlCerrar } = await admin.rpc("cerrar_borrador_libia", {
    p_business_id: entrada.businessId,
    p_dia: cupo.dia,
    p_reserva: reserva,
    p_real: gastado,
  });
  if (errorAlCerrar) console.error("[libia]", "cerrar", errorAlCerrar.message);
  if (gastado === null) return FALLO;

  const { error: errorDelEvento } = await supabase.from("complaint_events").insert({
    complaint_id: entrada.complaintId,
    business_id: entrada.businessId,
    type: "libia",
    data: { modelo: LIBIA_MODELO_CORTO },
    actor_id: user.id,
  });
  if (errorDelEvento) console.error("[libia]", "evento", errorDelEvento.message);

  revalidatePath(`/app/${entrada.businessId}/reclamo/${entrada.complaintId}`);
  return { ok: true, texto, quedan: cupo.quedan };
}
