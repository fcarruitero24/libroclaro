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
  features: string[];
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Gratis",
    priceMonthly: 0,
    priceYearly: 0,
    maxBusinesses: 1,
    branding: true,
    businessAlerts: false,
    customBranding: false,
    csvExport: false,
    features: [
      "1 negocio",
      "Reclamos y quejas ilimitados",
      "Hoja de reclamación con numeración correlativa",
      "Copia automática al correo del consumidor",
      "Panel para responder dentro del plazo",
      "Con marca «LibroClaro» en el formulario",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 12,
    priceYearly: 99,
    maxBusinesses: 3,
    branding: false,
    businessAlerts: true,
    customBranding: true,
    csvExport: true,
    features: [
      "Hasta 3 negocios o sucursales",
      "Sin marca LibroClaro",
      "Tu logo y tu color",
      "Alerta por correo de cada reclamo nuevo",
      "Recordatorio antes de vencer los 15 días hábiles",
      "Exportar a Excel (CSV)",
      "Soporte por WhatsApp",
    ],
  },
  business: {
    id: "business",
    name: "Empresa",
    priceMonthly: 35,
    priceYearly: 299,
    maxBusinesses: 25,
    branding: false,
    businessAlerts: true,
    customBranding: true,
    csvExport: true,
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

/** Días de gracia tras vencer, antes de bajar a Gratis. */
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
