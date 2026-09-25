export interface Business {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  ruc: string;
  address: string;
  email: string;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string;
  plan: string;
  plan_expires_at: string | null;
  mp_preapproval_id: string | null;
  /** Estado de la suscripción en Mercado Pago: authorized, cancelled, paused o pending. */
  mp_subscription_status: string | null;
  complaint_seq: number;
  /** Si no es null, el libro está archivado: no acepta reclamos nuevos. */
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  business_id: string;
  code: string;
  public_token: string;
  consumer_name: string;
  consumer_doc_type: string;
  consumer_doc_number: string;
  consumer_address: string;
  consumer_phone: string | null;
  consumer_email: string;
  is_minor: boolean;
  guardian_name: string | null;
  item_type: string;
  amount: string | null;
  item_description: string;
  kind: string;
  detail: string;
  request: string;
  status: string;
  /** Categoría interna que pone el negocio (ver src/lib/categorias.ts). */
  category: string | null;
  response: string | null;
  responded_at: string | null;
  due_at: string;
  created_at: string;
}

/** Una línea del historial del reclamo (tabla complaint_events). */
export interface ComplaintEvent {
  id: number;
  complaint_id: string;
  business_id: string;
  type: "registrado" | "estado" | "categoria" | "respuesta" | "respuesta_editada" | "respuesta_enviada" | "nota";
  data: { de?: string | null; a?: string | null; texto?: string; anterior?: string; correo?: string };
  actor_id: string | null;
  created_at: string;
}

export interface ResponseTemplate {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessPublic {
  id: string;
  slug: string;
  name: string;
  ruc: string;
  address: string;
  logo_url: string | null;
  primary_color: string;
  plan: string;
  plan_expires_at: string | null;
  website: string | null;
  archived_at: string | null;
}

export interface ComplaintPublic {
  code: string;
  created_at: string;
  due_at: string;
  consumer_name: string;
  consumer_doc_type: string;
  consumer_doc_number: string;
  consumer_address: string;
  consumer_phone: string | null;
  consumer_email: string;
  is_minor: boolean;
  guardian_name: string | null;
  item_type: string;
  amount: string | null;
  item_description: string;
  kind: string;
  detail: string;
  request: string;
  status: string;
  response: string | null;
  responded_at: string | null;
  business_name: string;
  business_ruc: string;
  business_address: string;
  business_logo_url: string | null;
  business_color: string;
  business_plan: string;
  business_plan_expires_at: string | null;
  business_slug: string;
}

export interface ActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}
