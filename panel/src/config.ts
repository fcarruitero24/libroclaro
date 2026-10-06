/**
 * Precios y límites de cada plataforma, verificados a mano en sus páginas de
 * precios. Si una plataforma cambia su plan, se actualiza aquí junto con
 * `verificadoEl`, que el panel muestra al pie.
 */

/** Unidades en base 1024, como las muestra Postgres (pg_size_pretty). */
export const MB = 1024 ** 2;
export const GB = 1024 ** 3;

export const CONFIG = {
  verificadoEl: "2026-10-05",
  /** Soles por dólar, aproximado: solo para mostrar el gasto en soles. */
  tipoDeCambio: 3.7,
  cloudflare: {
    usdMes: 5,
    visitas: 10_000_000,
    cpuMs: 30_000_000,
    usdPorMillonDeVisitas: 0.3,
    usdPorMillonDeMs: 0.02,
    /** Workers Paid se contrató el 29 de setiembre: cada ciclo empieza ese día (o el último del mes si es más corto). */
    diaDeCorte: 29,
  },
  supabase: {
    baseBytes: 500 * MB,
    archivosBytes: 1 * GB,
    usuariosActivos: 50_000,
    /** No se mide: Supabase no lo entrega por API. Solo para el texto de la tarjeta. */
    traficoBytes: 5 * GB,
    usdPro: 25,
    proyecto: "rcjgprzmvtspviwyyrhy",
  },
  resend: {
    dia: 100,
    mes: 3_000,
    usdPro: 20,
    mesPro: 50_000,
  },
  mercadoPago: {
    /** Tarifa con abono inmediato: 3,49 % + S/ 1, más IGV sobre esa comisión. */
    porcentaje: 0.0349,
    fijo: 1,
    igv: 0.18,
  },
} as const;

/** RUC de SUNAT: siempre existe, sirve para probar que la consulta de RUC responde. */
export const RUC_DE_PRUEBA = "20131312955";

/** Nombre de cada medidor, para la página y los correos de alerta. */
export const NOMBRES = {
  "cloudflare.visitas": "Visitas de Cloudflare",
  "cloudflare.cpu": "Tiempo de CPU de Cloudflare",
  "supabase.base": "Base de datos de Supabase",
  "supabase.archivos": "Archivos de Supabase",
  "supabase.usuarios": "Usuarios activos de Supabase",
  "resend.dia": "Correos de hoy (Resend)",
  "resend.mes": "Correos del mes (Resend)",
} as const;
