/**
 * Qué alertas tocan según el resumen. El cron de cada hora se las pasa a
 * LibroClaro, que las manda por correo una sola vez: la clave junta métrica,
 * umbral y periodo, y LibroClaro guarda las que ya salieron.
 */
import { fechaEnLima } from "../../src/lib/consumo.ts";
import { GB, MB, NOMBRES } from "./config.ts";
import type { Alerta, Medidor, Resumen, Unidad } from "./tipos.ts";

/** Si la última corrida de los recordatorios es más vieja que esto, algo dejó de correr. */
const SIN_CORRER_MS = 26 * 60 * 60 * 1000;

const numero = (n: number, decimales = 0) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n);

/** Una cantidad legible: CPU en segundos, bytes en MB o GB, el resto como número. */
export function cantidad(valor: number, unidad: Unidad): string {
  if (unidad === "ms") return `${numero(valor / 1000)} s`;
  if (unidad === "bytes") return valor >= GB ? `${numero(valor / GB, 1)} GB` : `${numero(valor / MB, 1)} MB`;
  return numero(valor);
}

/** El umbral más alto cruzado: con el 100 % no tiene sentido avisar también del 80 %. */
function umbralCruzado(pct: number): 80 | 100 | null {
  if (pct >= 100) return 100;
  if (pct >= 80) return 80;
  return null;
}

const fechaYHoraDeLima = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" }).format(
    new Date(iso),
  );

export function alertasDelResumen(r: Resumen, ahora: Date): Alerta[] {
  const alertas: Alerta[] = [];
  const diaUtc = ahora.toISOString().slice(0, 10);
  const mesUtc = diaUtc.slice(0, 7);

  const porLimite = (clave: keyof typeof NOMBRES, m: Medidor | null, periodo: string) => {
    if (!m) return;
    const umbral = umbralCruzado(m.pct);
    if (umbral === null) return;
    alertas.push({
      clave: `${clave}.${umbral}.${periodo}`,
      texto: `${NOMBRES[clave]} llegó al ${Math.floor(m.pct)} % de su límite (${cantidad(m.usado, m.unidad)} de ${cantidad(m.limite, m.unidad)}).`,
    });
  };

  // Las fuentes caídas no avisan nada: su tarjeta ya muestra el error.
  if (r.cloudflare.ok) {
    const ciclo = r.cloudflare.ciclo.fin.slice(0, 10);
    porLimite("cloudflare.visitas", r.cloudflare.visitas, ciclo);
    porLimite("cloudflare.cpu", r.cloudflare.cpu, ciclo);
  }
  if (r.supabase.ok) {
    porLimite("supabase.base", r.supabase.base, mesUtc);
    porLimite("supabase.archivos", r.supabase.archivos, mesUtc);
    porLimite("supabase.usuarios", r.supabase.usuarios, mesUtc);
  }
  if (r.resend.ok) {
    porLimite("resend.dia", r.resend.dia, diaUtc);
    porLimite("resend.mes", r.resend.mes, mesUtc);
  }

  // Un solo correo por vencimiento: la clave lleva la fecha, que cambia al renovar.
  const dominio = r.config.dominio;
  if (r.dominio.dias <= dominio.avisoDias) {
    const vence = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(`${dominio.vence}T00:00:00Z`),
    );
    alertas.push({
      clave: `dominio.vence.${dominio.vence}`,
      texto: `El dominio ${dominio.nombre} vence el ${vence} (en ${r.dominio.dias} días). Renuévalo en ${dominio.registrador} (${dominio.renovacion}).`,
    });
  }

  if (r.recordatorios.ok && r.recordatorios.ultima) {
    const ultima = r.recordatorios.ultima;
    const clave = `cron.recordatorios.${fechaEnLima(ahora)}`;
    if (!ultima.ok) {
      const detalle = (ultima.error ?? "sin detalle").slice(0, 200);
      alertas.push({ clave, texto: `Los recordatorios de la mañana fallaron (${detalle}).` });
    } else if (ahora.getTime() - new Date(ultima.hora).getTime() > SIN_CORRER_MS) {
      alertas.push({ clave, texto: `Los recordatorios de la mañana no corren desde el ${fechaYHoraDeLima(ultima.hora)}.` });
    }
  }

  return alertas;
}
