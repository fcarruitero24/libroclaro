export type PlanId = "free" | "pro" | "business";
export type BillingPeriod = "monthly" | "yearly";

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Precio en soles pagando mes a mes. */
  priceMonthly: number;
  /** Precio en soles pagando el año completo por adelantado. */
  priceYearly: number;
  maxBusinesses: number;
  /** Muestra "Powered by LibroClaro" en el formulario público y la hoja */
  branding: boolean;
  /** Envía un correo al negocio por cada reclamo nuevo y recordatorios de vencimiento */
  businessAlerts: boolean;
  /** Logo y color personalizados en el formulario */
  customBranding: boolean;
  csvExport: boolean;
  /** Gráficos del Resumen: evolución, categorías y tipo de bien */
  analytics: boolean;
  /** Plantillas de respuesta guardadas */
  templates: boolean;
  features: string[];
}

/** Días de la prueba gratis. La fecha la pone la base al crear el negocio (migración 0008). */
export const DIAS_DE_PRUEBA = 30;

export const PLANS: Record<PlanId, PlanDef> = {
  // Ya no es un plan que se ofrezca: es el estado de un libro cuya prueba o
  // plan venció. No recibe reclamos nuevos (lo frena submit_complaint), pero
  // el dueño conserva sus hojas: puede verlas, responder las pendientes y
  // descargarlas, porque la norma le obliga a guardarlas dos años.
  free: {
    id: "free",
    name: "Inactivo",
    priceMonthly: 0,
    priceYearly: 0,
    maxBusinesses: 1,
    branding: true,
    businessAlerts: false,
    customBranding: false,
    csvExport: true,
    analytics: false,
    templates: false,
    features: [],
  },
  pro: {
    id: "pro",
    name: "Pro",
    // Antes S/ 12 y S/ 99 (subidos el 2026-09-28): con S/ 12 la comisión de
    // Mercado Pago (3,49 % + S/ 1 + IGV) se llevaba ~14 % de cada cobro.
    priceMonthly: 19,
    priceYearly: 149,
    maxBusinesses: 3,
    branding: false,
    businessAlerts: true,
    customBranding: true,
    csvExport: true,
    analytics: true,
    templates: true,
    features: [
      "Hasta 3 negocios o sucursales",
      "Sin marca LibroClaro",
      "Tu logo y tu color",
      "Alerta por correo de cada reclamo nuevo",
      "Recordatorio antes de vencer los 15 días hábiles",
      "Análisis con gráficos y categorías",
      "Plantillas de respuesta",
      "Exportar a Excel (CSV)",
      "Soporte por WhatsApp",
    ],
  },
  business: {
    id: "business",
    name: "Empresa",
    // Antes S/ 35 y S/ 299 (subidos el 2026-09-28).
    priceMonthly: 59,
    priceYearly: 499,
    maxBusinesses: 25,
    branding: false,
    businessAlerts: true,
    customBranding: true,
    csvExport: true,
    analytics: true,
    templates: true,
    features: [
      "Hasta 25 sucursales",
      "Todo lo del plan Pro",
      "Onboarding asistido",
      "Soporte prioritario",
    ],
  },
};

/** Precio del plan según el periodo de facturación elegido. */
export function priceFor(plan: PlanDef, period: BillingPeriod): number {
  return period === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

/** Porcentaje de ahorro al pagar el año completo por adelantado. */
export function yearlySavings(plan: PlanDef): number {
  if (plan.priceMonthly === 0) return 0;
  return Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100);
}

/** Equivalente mensual de un plan anual, redondeado a un decimal. */
export function monthlyEquivalent(plan: PlanDef): number {
  return Math.round((plan.priceYearly / 12) * 10) / 10;
}

export function isBillingPeriod(v: unknown): v is BillingPeriod {
  return v === "monthly" || v === "yearly";
}

/** Días de gracia tras vencer, antes de que el libro quede inactivo. Igual en plan_vigente() de la base. */
export const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
/**
 * En una suscripción, el plan vence este margen después de la fecha del
 * próximo cobro, para que Mercado Pago tenga tiempo de cobrar. Por eso, si el
 * plan llega a vencer con la suscripción activa, es que el cobro falló.
 */
export const MARGEN_COBRO_MS = 3 * 24 * 60 * 60 * 1000;

/** Plan vigente considerando la fecha de vencimiento (con 3 días de gracia). */
export function effectivePlan(b: { plan: string; plan_expires_at: string | null }): PlanId {
  if (b.plan !== "pro" && b.plan !== "business") return "free";
  if (!b.plan_expires_at) return b.plan; // activación manual sin vencimiento
  return new Date(b.plan_expires_at).getTime() + GRACE_MS > Date.now() ? b.plan : "free";
}

export function planFor(b: { plan: string; plan_expires_at: string | null }): PlanDef {
  return PLANS[effectivePlan(b)];
}

export type EstadoPlan =
  /** Plan pagado vigente, o activado a mano sin vencimiento. */
  | { tipo: "pagado"; plan: PlanDef; hasta: string | null }
  /** En la prueba gratis, antes de que termine. */
  | { tipo: "prueba"; termina: string; diasRestantes: number }
  /** La prueba o el plan ya venció, pero siguen los 3 días de gracia. */
  | { tipo: "gracia"; prueba: boolean; vencio: string; hasta: string }
  /** Sin plan: el libro no recibe reclamos nuevos. */
  | { tipo: "inactivo"; prueba: boolean };

/** En qué situación está el plan de un negocio, para mostrárselo al dueño. */
export function estadoDelPlan(
  b: { plan: string; plan_expires_at: string | null; en_prueba: boolean },
  ahora = Date.now(),
): EstadoPlan {
  const id = effectivePlan(b);
  if (id === "free") return { tipo: "inactivo", prueba: b.en_prueba };
  if (!b.plan_expires_at) return { tipo: "pagado", plan: PLANS[id], hasta: null };
  const vence = new Date(b.plan_expires_at).getTime();
  if (vence <= ahora) {
    return { tipo: "gracia", prueba: b.en_prueba, vencio: b.plan_expires_at, hasta: new Date(vence + GRACE_MS).toISOString() };
  }
  if (b.en_prueba) {
    return { tipo: "prueba", termina: b.plan_expires_at, diasRestantes: Math.ceil((vence - ahora) / 86400000) };
  }
  return { tipo: "pagado", plan: PLANS[id], hasta: b.plan_expires_at };
}

/** Texto y color de la insignia del plan en el panel. */
export function insigniaDelPlan(e: EstadoPlan): { texto: string; tono: "teal" | "amber" | "red" } {
  switch (e.tipo) {
    case "pagado":
      return { texto: `Plan ${e.plan.name}`, tono: "teal" };
    case "prueba":
      return { texto: "Prueba gratis", tono: e.diasRestantes <= 7 ? "amber" : "teal" };
    case "gracia":
      return { texto: e.prueba ? "Prueba terminada" : "Plan vencido", tono: "amber" };
    case "inactivo":
      return { texto: "Inactivo", tono: "red" };
  }
}
