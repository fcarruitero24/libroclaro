/**
 * Cómputo de días hábiles en Perú (lunes a viernes, sin feriados nacionales).
 * Debe mantenerse en sincronía con public.holidays en la base de datos.
 */
const HOLIDAYS = new Set<string>([
  "2026-01-01", "2026-04-02", "2026-04-03", "2026-05-01", "2026-06-07", "2026-06-29",
  "2026-07-23", "2026-07-28", "2026-07-29", "2026-08-06", "2026-08-30", "2026-10-08",
  "2026-11-01", "2026-12-08", "2026-12-09", "2026-12-25",
  "2027-01-01", "2027-03-25", "2027-03-26", "2027-05-01", "2027-06-07", "2027-06-29",
  "2027-07-23", "2027-07-28", "2027-07-29", "2027-08-06", "2027-08-30", "2027-10-08",
  "2027-11-01", "2027-12-08", "2027-12-09", "2027-12-25",
]);

const TZ = "America/Lima";

/** Fecha en Lima como "YYYY-MM-DD". */
export function limaDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function keyToUTC(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysKey(key: string, n: number): string {
  const dt = keyToUTC(key);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function isBusinessDayKey(key: string): boolean {
  const dow = keyToUTC(key).getUTCDay();
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(key);
}

/**
 * Días hábiles que faltan desde hoy (Lima) hasta la fecha límite.
 * 0 = vence hoy. Negativo = días hábiles de retraso.
 */
export function businessDaysLeft(dueAt: string | Date, now: Date = new Date()): number {
  const today = limaDateKey(now);
  const due = limaDateKey(new Date(dueAt));
  if (due === today) return 0;
  let count = 0;
  if (due > today) {
    let k = today;
    while (k < due) {
      k = addDaysKey(k, 1);
      if (isBusinessDayKey(k)) count++;
    }
    return count;
  }
  let k = due;
  while (k < today) {
    k = addDaysKey(k, 1);
    if (isBusinessDayKey(k)) count--;
  }
  return count;
}

/**
 * Días hábiles transcurridos entre dos fechas (Lima): los hábiles después
 * del día de `desde` hasta el día de `hasta`, inclusive. Registrado y
 * respondido el mismo día = 0.
 */
export function businessDaysBetween(desde: string | Date, hasta: string | Date): number {
  let k = limaDateKey(new Date(desde));
  const fin = limaDateKey(new Date(hasta));
  let count = 0;
  while (k < fin) {
    k = addDaysKey(k, 1);
    if (isBusinessDayKey(k)) count++;
  }
  return count;
}

export type Urgency = "vencido" | "urgente" | "pronto" | "normal" | "resuelto";

export function urgencyFor(status: string, dueAt: string | Date): Urgency {
  if (status === "respondido" || status === "cerrado") return "resuelto";
  const left = businessDaysLeft(dueAt);
  if (left < 0) return "vencido";
  if (left <= 2) return "urgente";
  if (left <= 5) return "pronto";
  return "normal";
}
