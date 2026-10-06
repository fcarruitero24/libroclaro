/**
 * Cálculos del panel de consumo: ciclos de cobro, ritmos, proyecciones,
 * estados y comisiones. Funciones puras, probadas en calculos.test.ts.
 */
import { fechaEnLima } from "../../src/lib/consumo.ts";
import { CONFIG } from "./config.ts";
import type { Estado, EstadoDelDia } from "./tipos.ts";

export const DIA_MS = 86_400_000;

export const redondear2 = (n: number) => Math.round(n * 100) / 100;

/** "YYYY-MM-DD" desplazado `n` días (fechas de calendario, sin horas). */
export const sumarDias = (fecha: string, n: number) =>
  new Date(Date.parse(fecha) + n * DIA_MS).toISOString().slice(0, 10);

/** Días de calendario que faltan, contados desde el día de hoy en Lima, hasta `fecha` ("YYYY-MM-DD"). */
export const diasHasta = (fecha: string, ahora: Date) =>
  Math.round((Date.parse(fecha) - Date.parse(fechaEnLima(ahora))) / DIA_MS);

/** Medianoche UTC del día de corte de un mes, o del último día si el mes es más corto. */
function corte(anio: number, mes: number, dia: number): Date {
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(dia, ultimoDia)));
}

/** Ciclo de cobro que contiene `ahora`: inicio <= ahora < fin. */
export function cicloDeCobro(ahora: Date, diaDeCorte: number): { inicio: Date; fin: Date } {
  const anio = ahora.getUTCFullYear();
  const mes = ahora.getUTCMonth();
  const esteMes = corte(anio, mes, diaDeCorte);
  return ahora >= esteMes
    ? { inicio: esteMes, fin: corte(anio, mes + 1, diaDeCorte) }
    : { inicio: corte(anio, mes - 1, diaDeCorte), fin: esteMes };
}

/** La API de analítica de Cloudflare no acepta ventanas de más de una semana. */
export function tramosSemanales(desde: Date, hasta: Date): { desde: Date; hasta: Date }[] {
  const tramos: { desde: Date; hasta: Date }[] = [];
  for (let t = desde.getTime(); t < hasta.getTime(); t += 7 * DIA_MS) {
    tramos.push({ desde: new Date(t), hasta: new Date(Math.min(t + 7 * DIA_MS, hasta.getTime())) });
  }
  return tramos;
}

export function estadoPorPorcentaje(pct: number): Estado {
  if (pct >= 100) return "limite";
  if (pct >= 80) return "atencion";
  return "ok";
}

/**
 * Promedio diario de los últimos días completos (hoy todavía no termina).
 * Null si no hay ninguno: el primer día de un ciclo todavía no hay ritmo.
 */
export function promedioReciente(porDia: { fecha: string; valor: number }[], hoy: string, maxDias = 7): number | null {
  const completos = porDia
    .filter((d) => d.fecha < hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-maxDias);
  if (completos.length === 0) return null;
  return completos.reduce((suma, d) => suma + d.valor, 0) / completos.length;
}

/** Dónde terminaría el periodo si sigue al mismo ritmo. */
export function proyectar(usado: number, promedioDiario: number | null, ahora: Date, fin: Date): number | null {
  if (promedioDiario === null) return null;
  return usado + (promedioDiario * (fin.getTime() - ahora.getTime())) / DIA_MS;
}

/** Cuándo llegaría al límite a este ritmo; null si no llega antes de `hasta`. */
export function diaEnQueLlega(
  usado: number,
  limite: number,
  promedioDiario: number | null,
  ahora: Date,
  hasta: Date,
): Date | null {
  if (usado >= limite) return ahora;
  if (promedioDiario === null || promedioDiario <= 0) return null;
  const llega = new Date(ahora.getTime() + ((limite - usado) / promedioDiario) * DIA_MS);
  return llega >= hasta ? null : llega;
}

/**
 * Cuánto crece la base por día según la última semana de uso_diario. Con
 * menos de 3 días el número no dice nada todavía: null.
 */
export function ritmoDeLaBase(filas: { fecha: string; base_bytes: number }[], hoy: string): number | null {
  const desde = sumarDias(hoy, -6);
  const recientes = filas
    .filter((f) => f.fecha >= desde && f.fecha <= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (recientes.length < 3) return null;
  const primera = recientes[0];
  const ultima = recientes[recientes.length - 1];
  const dias = (Date.parse(ultima.fecha) - Date.parse(primera.fecha)) / DIA_MS;
  return (ultima.base_bytes - primera.base_bytes) / dias;
}

/**
 * La cuota de Resend se guarda con cada correo. Si el último correo fue otro
 * día (UTC, como cuenta Resend), hoy van 0; si fue otro mes, el mes va en 0.
 */
export function cuotaResendVigente(
  s: { dia: number | null; mes: number | null; fecha: string } | null,
  ahora: Date,
): { dia: number | null; mes: number | null } | null {
  if (!s) return null;
  const fecha = new Date(s.fecha).toISOString();
  const hoy = ahora.toISOString();
  const mismoDia = fecha.slice(0, 10) === hoy.slice(0, 10);
  const mismoMes = fecha.slice(0, 7) === hoy.slice(0, 7);
  return {
    dia: s.dia === null ? null : mismoDia ? s.dia : 0,
    mes: s.mes === null ? null : mismoMes ? s.mes : 0,
  };
}

/** Los últimos 7 días de Lima (hoy incluido) con el resultado del cron de recordatorios. */
export function diasDelCron(
  corridas: { datetime: string; status: string }[],
  ahora: Date,
): { fecha: string; estado: EstadoDelDia }[] {
  const hoy = fechaEnLima(ahora);
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(hoy, i - 6);
    const delDia = corridas.filter((c) => fechaEnLima(new Date(c.datetime)) === fecha);
    const estado: EstadoDelDia = delDia.some((c) => c.status === "success")
      ? "ok"
      : delDia.length > 0
        ? "fallo"
        : fecha === hoy
          ? "pendiente"
          : "sin_corrida";
    return { fecha, estado };
  });
}

/** Comisión de Mercado Pago con la tarifa publicada (abono inmediato) y lo que queda. */
export function comisionMP(precio: number): { comision: number; recibes: number } {
  const { porcentaje, fijo, igv } = CONFIG.mercadoPago;
  const comision = redondear2((precio * porcentaje + fijo) * (1 + igv));
  return { comision, recibes: redondear2(precio - comision) };
}

/** Lo que Cloudflare cobraría aparte de los US$ 5 por pasar lo incluido en el plan. */
export function extraCloudflareUsd(visitas: number, cpuMs: number): number {
  const c = CONFIG.cloudflare;
  const visitasExtra = Math.max(0, visitas - c.visitas) / 1_000_000;
  const msExtra = Math.max(0, cpuMs - c.cpuMs) / 1_000_000;
  return redondear2(visitasExtra * c.usdPorMillonDeVisitas + msExtra * c.usdPorMillonDeMs);
}
