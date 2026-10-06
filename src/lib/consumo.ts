/**
 * Panel de consumo (panel.libroclaro.pe): funciones puras y el formato de los
 * datos que LibroClaro le entrega al panel. Este archivo no importa nada: lo
 * cargan `node --test` y también el Worker del panel, que toma de aquí los
 * tipos del resumen y las fechas en hora de Lima.
 */

/** Un entero no negativo, o null si no vino o no es un entero. */
function entero(valor: string | null): number | null {
  const v = (valor ?? "").trim();
  return /^\d+$/.test(v) ? Number(v) : null;
}

/**
 * Correos ya usados en el día y en el mes, según las cabeceras que Resend
 * agrega a cada envío (no tiene una consulta de uso). La del día solo llega en
 * el plan gratis. Null si no vino ninguna de las dos.
 */
export function cuotaDeResend(h: Headers): { dia: number | null; mes: number | null } | null {
  const dia = entero(h.get("x-resend-daily-quota"));
  const mes = entero(h.get("x-resend-monthly-quota"));
  if (dia === null && mes === null) return null;
  return { dia, mes };
}

/**
 * Compara el secreto recibido con el configurado sin que el tiempo de
 * respuesta delate cuántos caracteres acertó: compara enteros los SHA-256 de
 * ambos. Sin secreto configurado no deja pasar a nadie.
 */
export async function secretoValido(recibido: string | null, esperado: string | undefined): Promise<boolean> {
  if (!recibido || !esperado) return false;
  const sha256 = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([sha256(recibido), sha256(esperado)]);
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

/** Día en Lima como "YYYY-MM-DD". Perú no tiene horario de verano: siempre es UTC−5. */
export function fechaEnLima(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d);
}

/** Primer instante del mes en curso en Lima, con su desfase (para filtrar pagos del mes). */
export function inicioDelMesEnLima(d: Date): string {
  return `${fechaEnLima(d).slice(0, 8)}01T00:00:00.000-05:00`;
}

/** Lo que usamos de cada pago de GET /v1/payments/search de Mercado Pago. */
export interface PagoMP {
  status: string;
  transaction_amount: number;
  fee_details?: { amount: number; fee_payer?: string }[];
}

const aCentimos = (n: number) => Math.round(n * 100) / 100;

/**
 * Lo cobrado en el mes y lo que se llevó Mercado Pago, con la comisión real de
 * cada pago aprobado. Las comisiones que paga el comprador (cuotas) no cuentan.
 */
export function resumenDePagos(pagos: PagoMP[]): { cobrado: number; comisiones: number; pagos: number } {
  let cobrado = 0;
  let comisiones = 0;
  let aprobados = 0;
  for (const p of pagos) {
    if (p.status !== "approved") continue;
    aprobados++;
    cobrado += p.transaction_amount;
    for (const f of p.fee_details ?? []) if (f.fee_payer === "collector") comisiones += f.amount;
  }
  return { cobrado: aCentimos(cobrado), comisiones: aCentimos(comisiones), pagos: aprobados };
}

/**
 * Lo que devuelve GET /api/panel/resumen. Solo números, sin datos personales.
 * Cada parte se consulta por separado: si una falla, trae { error } y las demás
 * siguen.
 */
export interface ResumenLibroClaro {
  supabase:
    | {
        base_bytes: number;
        archivos_bytes: number;
        usuarios: number;
        usuarios_activos_30d: number;
        negocios: number;
        reclamos: number;
        suscripciones_activas: number;
        /** Hasta 8 días, del más antiguo al más nuevo. */
        diario: { fecha: string; base_bytes: number }[];
      }
    | { error: string };
  /** null: todavía no se registró ningún envío. */
  resend: { dia: number | null; mes: number | null; fecha: string } | null | { error: string };
  /** null: todavía no se registró ninguna corrida. */
  recordatorios: { hora: string; ok: boolean; enviados: number; error: string | null } | null | { error: string };
  mercado_pago: { cobrado: number; comisiones: number; pagos: number } | { error: string };
  alertas_del_mes: { clave: string; texto: string; enviada_el: string }[] | { error: string };
}
