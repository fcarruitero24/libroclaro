import Link from "next/link";
import { notFound } from "next/navigation";
import { ResponseForm } from "@/components/response-form";
import { DeadlineBadge, StatusBadge } from "@/components/status-badge";
import { Badge, Card } from "@/components/ui";
import { fmtDate, fmtDateTime, fmtMoney, ITEM_LABEL, KIND_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Complaint } from "@/lib/types";

export const metadata = { title: "Detalle del reclamo" };

export default async function ComplaintDetailPage({ params }: { params: Promise<{ bizId: string; id: string }> }) {
  const { bizId, id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("complaints").select("*").eq("id", id).eq("business_id", bizId).maybeSingle();
  if (!data) notFound();
  const c = data as Complaint;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/app/${bizId}`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Volver a reclamos
          </Link>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold text-slate-900">
            Hoja N.º {c.code}
            <StatusBadge status={c.status} />
            <Badge tone={c.kind === "queja" ? "violet" : "slate"}>{KIND_LABEL[c.kind]}</Badge>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Registrado el {fmtDateTime(c.created_at)} · Vence el {fmtDate(c.due_at)}{" "}
            <DeadlineBadge status={c.status} dueAt={c.due_at} />
          </p>
        </div>
        <Link
          href={`/h/${c.public_token}`}
          target="_blank"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Ver hoja pública / PDF
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">1. Identificación del consumidor</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Nombre" value={c.consumer_name} />
              <Item label="Documento" value={`${c.consumer_doc_type} ${c.consumer_doc_number}`} />
              <Item label="Domicilio" value={c.consumer_address} />
              <Item label="Teléfono" value={c.consumer_phone ?? "—"} />
              <Item label="Correo" value={c.consumer_email} />
              {c.is_minor && <Item label="Padre / madre / apoderado" value={c.guardian_name ?? "—"} />}
            </dl>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">2. Identificación del bien contratado</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Tipo" value={ITEM_LABEL[c.item_type]} />
              <Item label="Monto reclamado" value={fmtMoney(c.amount)} />
              <div className="sm:col-span-2">
                <Item label="Descripción" value={c.item_description} />
              </div>
            </dl>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">3. Detalle de la reclamación</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <Item label={`Detalle del ${KIND_LABEL[c.kind].toLowerCase()}`} value={c.detail} pre />
              <Item label="Pedido del consumidor" value={c.request} pre />
            </dl>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">4. Respuesta del proveedor</h3>
            {c.responded_at && (
              <p className="mt-2 text-xs text-slate-500">Respondido el {fmtDateTime(c.responded_at)}</p>
            )}
            <div className="mt-4">
              <ResponseForm complaint={c} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value, pre }: { label: string; value: string; pre?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={pre ? "mt-0.5 whitespace-pre-wrap text-slate-900" : "mt-0.5 font-medium text-slate-900"}>{value}</dd>
    </div>
  );
}
