import { NextResponse, type NextRequest } from "next/server";
import { leerAlertas, secretoValido, type AlertaPanel } from "@/lib/consumo";
import { notifyPlatform, tplPlatformAlertas } from "@/lib/email";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

/**
 * Alertas del panel de consumo (panel.libroclaro.pe). El panel revisa todo
 * cada hora y manda aquí las que tocan; el correo sale de LibroClaro porque el
 * panel no tiene la llave de Resend.
 *
 * Cada alerta se reserva en alertas_panel antes de mandarla: la clave primaria
 * impide que salga dos veces aunque lleguen dos revisiones a la vez. Las nuevas
 * van juntas en un solo correo a PLATFORM_EMAIL y, si no sale, se liberan para
 * reintentarlas en la hora siguiente.
 *
 * Sin el secreto del panel responde 404, como si la ruta no existiera.
 */
export async function POST(request: NextRequest) {
  if (!(await secretoValido(request.headers.get("x-panel-secret"), process.env.PANEL_SECRET))) {
    return new NextResponse(null, { status: 404 });
  }
  if (!hasAdminClient()) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });

  const alertas = leerAlertas(await request.json().catch(() => null));
  if (!alertas) return NextResponse.json({ error: "Alertas inválidas" }, { status: 400 });

  const admin = createAdminClient();
  const nuevas: AlertaPanel[] = [];
  let repetidas = 0;
  let fallidas = 0;
  for (const a of alertas) {
    const { error } = await admin.from("alertas_panel").insert({ clave: a.clave, texto: a.texto });
    if (!error) nuevas.push(a);
    else if (error.code === "23505") repetidas++;
    else {
      // Sin reservar no se manda: se reintenta en la hora siguiente.
      console.error("[panel:alertas]", a.clave, error.message);
      fallidas++;
    }
  }

  if (nuevas.length > 0) {
    const envio = await notifyPlatform(tplPlatformAlertas(nuevas));
    if (!envio.ok) {
      if (envio.skipped) console.error("[panel:alertas] correo omitido: falta PLATFORM_EMAIL o RESEND_API_KEY");
      const claves = nuevas.map((a) => a.clave);
      const { error } = await admin.from("alertas_panel").delete().in("clave", claves);
      if (error) console.error("[panel:alertas] no se pudieron liberar", error.message);
      return NextResponse.json({ enviadas: 0, repetidas, fallidas: fallidas + nuevas.length });
    }
  }

  return NextResponse.json({ enviadas: nuevas.length, repetidas, fallidas });
}
