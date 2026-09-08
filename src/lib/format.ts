const TZ = "America/Lima";

export function fmtDate(d: string | Date): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: TZ, dateStyle: "medium" }).format(new Date(d));
}

export function fmtDateTime(d: string | Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

export function fmtMoney(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(n));
}

export const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  respondido: "Respondido",
  cerrado: "Cerrado",
};

export const KIND_LABEL: Record<string, string> = {
  reclamo: "Reclamo",
  queja: "Queja",
};

export const ITEM_LABEL: Record<string, string> = {
  producto: "Producto",
  servicio: "Servicio",
};

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
