export type PlanId = "free" | "pro" | "business";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceMonthly: number; // en soles (PEN)
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
    priceMonthly: 29,
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
    priceMonthly: 79,
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

const GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 días de gracia tras vencer

/** Plan vigente considerando la fecha de vencimiento (con 3 días de gracia). */
export function effectivePlan(b: { plan: string; plan_expires_at: string | null }): PlanId {
  if (b.plan !== "pro" && b.plan !== "business") return "free";
  if (!b.plan_expires_at) return b.plan; // activación manual sin vencimiento
  return new Date(b.plan_expires_at).getTime() + GRACE_MS > Date.now() ? b.plan : "free";
}

export function planFor(b: { plan: string; plan_expires_at: string | null }): PlanDef {
  return PLANS[effectivePlan(b)];
}
