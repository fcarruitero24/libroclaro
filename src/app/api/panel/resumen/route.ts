import { NextResponse, type NextRequest } from "next/server";
import {
  fechaEnLima,
  inicioDelMesEnLima,
  resumenDePagos,
  secretoValido,
  type PagoMP,
  type ResumenLibroClaro,
} from "@/lib/consumo";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
type UsoDeSupabase = Omit<Extract<ResumenLibroClaro["supabase"], { base_bytes: number }>, "diario">;

const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Resumen para el panel de consumo (panel.libroclaro.pe): números de Supabase,
 * Resend y Mercado Pago, más la última corrida de los recordatorios. El panel
 * no tiene la llave de la base ni el token de Mercado Pago: los pide aquí, y
 * aquí solo salen números, sin datos personales.
 *
 * Sin el secreto del panel responde 404, como si la ruta no existiera. Cada
 * parte se consulta por separado: si una falla, trae { error } y las demás
 * siguen.
 */
export async function GET(request: NextRequest) {
  if (!(await secretoValido(request.headers.get("x-panel-secret"), process.env.PANEL_SECRET))) {
    return new NextResponse(null, { status: 404 });
  }
  if (!hasAdminClient()) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });

  const admin = createAdminClient();
  const ahora = new Date();
  const [supabase, ultimos, alertas, mercadoPago] = await Promise.all([
    usoDeSupabase(admin, ahora),
    ultimosUsos(admin),
    alertasDelMes(admin, ahora),
    pagosDelMes(ahora),
  ]);

  const cuerpo: ResumenLibroClaro = {
    supabase,
    resend: ultimos.resend,
    recordatorios: ultimos.recordatorios,
    mercado_pago: mercadoPago,
    alertas_del_mes: alertas,
  };
  return NextResponse.json(cuerpo, { headers: { "Cache-Control": "no-store" } });
}

async function usoDeSupabase(admin: Admin, ahora: Date): Promise<ResumenLibroClaro["supabase"]> {
  try {
    const { data, error } = await admin.rpc("uso_de_la_plataforma");
    if (error) return { error: error.message };
    const uso = data as UsoDeSupabase;

    // El primer resumen de cada día anota el tamaño de la base: con esas filas
    // el panel calcula a qué ritmo crece. Las siguientes del día no la pisan.
    const { error: errorFila } = await admin
      .from("uso_diario")
      .upsert({ fecha: fechaEnLima(ahora), base_bytes: uso.base_bytes }, { onConflict: "fecha", ignoreDuplicates: true });
    if (errorFila) console.error("[panel:uso_diario]", errorFila.message);

    const { data: filas, error: errorDiario } = await admin
      .from("uso_diario")
      .select("fecha, base_bytes")
      .order("fecha", { ascending: false })
      .limit(8);
    if (errorDiario) return { error: errorDiario.message };
    return { ...uso, diario: (filas ?? []).reverse() };
  } catch (e) {
    return { error: mensaje(e) };
  }
}

async function ultimosUsos(admin: Admin): Promise<Pick<ResumenLibroClaro, "resend" | "recordatorios">> {
  try {
    const { data, error } = await admin
      .from("uso_plataformas")
      .select("clave, valor, actualizado")
      .in("clave", ["resend", "cron.recordatorios"]);
    if (error) return { resend: { error: error.message }, recordatorios: { error: error.message } };

    const fila = (clave: string) => (data ?? []).find((f) => f.clave === clave);
    const resend = fila("resend");
    const cron = fila("cron.recordatorios");
    const r = (resend?.valor ?? {}) as { dia?: number | null; mes?: number | null };
    const c = (cron?.valor ?? {}) as { ok?: boolean; enviados?: number; error?: string | null };
    return {
      resend: resend ? { dia: r.dia ?? null, mes: r.mes ?? null, fecha: resend.actualizado } : null,
      recordatorios: cron
        ? { hora: cron.actualizado, ok: c.ok === true, enviados: Number(c.enviados ?? 0), error: c.error ?? null }
        : null,
    };
  } catch (e) {
    const error = mensaje(e);
    return { resend: { error }, recordatorios: { error } };
  }
}

async function alertasDelMes(admin: Admin, ahora: Date): Promise<ResumenLibroClaro["alertas_del_mes"]> {
  try {
    const { data, error } = await admin
      .from("alertas_panel")
      .select("clave, texto, enviada_el")
      .gte("enviada_el", inicioDelMesEnLima(ahora))
      .order("enviada_el", { ascending: false })
      .limit(20);
    if (error) return { error: error.message };
    return data ?? [];
  } catch (e) {
    return { error: mensaje(e) };
  }
}

/** Lo cobrado en el mes (hora de Lima), con la comisión real de cada pago. */
async function pagosDelMes(ahora: Date): Promise<ResumenLibroClaro["mercado_pago"]> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { error: "Falta MP_ACCESS_TOKEN" };
  try {
    const pagos: PagoMP[] = [];
    for (let pagina = 0, offset = 0; pagina < 10; pagina++, offset += 100) {
      const url = new URL("https://api.mercadopago.com/v1/payments/search");
      url.search = new URLSearchParams({
        status: "approved",
        range: "date_approved",
        begin_date: inicioDelMesEnLima(ahora),
        end_date: "NOW",
        sort: "date_approved",
        criteria: "desc",
        limit: "100",
        offset: String(offset),
      }).toString();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { error: `Mercado Pago respondió ${res.status}` };
      const json = (await res.json()) as { results?: PagoMP[]; paging?: { total?: number } };
      pagos.push(...(json.results ?? []));
      if (offset + 100 >= (json.paging?.total ?? 0)) break;
    }
    return resumenDePagos(pagos);
  } catch (e) {
    return { error: mensaje(e) };
  }
}
