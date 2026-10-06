/**
 * Contrato entre el Worker del panel, las alertas y la página: lo que arma
 * armarResumen() y devuelve GET /api/resumen.
 */
import type { AlertaPanel, ResumenLibroClaro } from "../../src/lib/consumo.ts";
import type { CONFIG } from "./config.ts";

export type Alerta = AlertaPanel;

export type Estado = "ok" | "atencion" | "limite";

/** Cada fuente se consulta por separado: si falla, su parte trae el error y el resto sigue. */
export type Fuente<T> = ({ ok: true } & T) | { ok: false; error: string };

export type Unidad = "visitas" | "ms" | "bytes" | "usuarios" | "correos";

export interface Medidor {
  usado: number;
  limite: number;
  unidad: Unidad;
  /** Sin redondear: la página decide los decimales. */
  pct: number;
  estado: Estado;
  /** Valor estimado al cierre del ciclo o del mes; null = todavía no hay ritmo. */
  proyeccion: number | null;
  /** ISO del día en que llegaría al límite; null = no llega en el periodo. */
  llegaEl: string | null;
}

export interface Prueba {
  ok: boolean;
  ms: number | null;
  error: string | null;
}

export type EstadoDelDia = "ok" | "fallo" | "sin_corrida" | "pendiente";

export interface Resumen {
  generado: string;
  estado: Estado;
  fuentesConError: string[];
  gasto: { usd: number; soles: number };
  masCercano: { nombre: string; medidor: Medidor } | null;
  proximoCobro: { fecha: string; usd: number };
  cloudflare: Fuente<{
    ciclo: { inicio: string; fin: string; dia: number; dias: number; estimado: boolean };
    visitas: Medidor;
    cpu: Medidor;
    errores: number;
    extraUsd: number;
    porDia: { fecha: string; visitas: number }[];
  }>;
  supabase: Fuente<{
    base: Medidor;
    archivos: Medidor;
    usuarios: Medidor;
    negocios: number;
    reclamos: number;
    ritmoBytesDia: number | null;
  }>;
  resend: Fuente<{ dia: Medidor | null; mes: Medidor | null; ultimoEnvio: string | null }>;
  mercadoPago: Fuente<{
    suscripcionesActivas: number | null;
    cobrado: number;
    comisiones: number;
    pagos: number;
    tabla: { plan: string; precio: number; comision: number; recibes: number }[];
  }>;
  servicios: { ruc: Prueba; qr: Prueba };
  recordatorios: Fuente<{
    ultima: { hora: string; ok: boolean; enviados: number; error: string | null } | null;
    dias: { fecha: string; estado: EstadoDelDia }[];
  }>;
  /** Las que tocan ahora según los datos; el cron de cada hora se las pasa a LibroClaro. */
  alertas: Alerta[];
  alertasDelMes: Fuente<{ lista: { texto: string; enviadaEl: string }[] }>;
  config: typeof CONFIG;
}

/** Lo que traen las fuentes, antes de calcular nada. */
export interface DatosCrudos {
  ciclo: { inicio: Date; fin: Date; estimado: boolean };
  cloudflare: Fuente<{ porDia: { fecha: string; visitas: number; cpuMs: number; errores: number }[] }>;
  cron: Fuente<{ corridas: { datetime: string; status: string }[] }>;
  libroclaro: Fuente<{ datos: ResumenLibroClaro }>;
  ruc: Prueba;
  qr: Prueba;
}
