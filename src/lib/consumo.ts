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
