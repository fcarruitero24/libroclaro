/**
 * Categorías internas de un reclamo. Las pone el negocio desde el panel,
 * nunca el consumidor: la hoja de reclamación tiene un formato fijado por
 * el reglamento y no se le agregan campos.
 *
 * La lista está duplicada en el check de complaints.category (migración
 * 0006): si cambia aquí, cambia allá.
 */
export const CATEGORIAS = [
  { id: "entrega", label: "Demora o problema en la entrega" },
  { id: "producto", label: "Producto defectuoso o en mal estado" },
  { id: "cobro", label: "Cobro o facturación" },
  { id: "atencion", label: "Atención del personal" },
  { id: "garantia", label: "Garantía o devolución" },
  { id: "otro", label: "Otro" },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]["id"];

const POR_ID = new Map<string, string>(CATEGORIAS.map((c) => [c.id, c.label]));

export function esCategoria(v: unknown): v is CategoriaId {
  return typeof v === "string" && POR_ID.has(v);
}

/** Etiqueta corta para listas y gráficos. */
export const CATEGORIA_CORTA: Record<CategoriaId, string> = {
  entrega: "Entrega",
  producto: "Producto",
  cobro: "Cobro",
  atencion: "Atención",
  garantia: "Garantía",
  otro: "Otro",
};

export function categoriaLabel(id: string | null | undefined): string {
  return (id && POR_ID.get(id)) || "Sin categoría";
}
