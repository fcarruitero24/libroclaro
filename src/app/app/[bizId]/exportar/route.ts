import { NextResponse, type NextRequest } from "next/server";
import { fmtDateTime, KIND_LABEL, STATUS_LABEL } from "@/lib/format";
import { planFor } from "@/lib/plans";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Business, Complaint } from "@/lib/types";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ bizId: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { bizId } = await params;
  const supabase = await createClient();
  const { data: bizData } = await supabase.from("businesses").select("*").eq("id", bizId).maybeSingle();
  if (!bizData) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const biz = bizData as Business;
  if (!planFor(biz).csvExport) {
    return NextResponse.json({ error: "La exportación está disponible en el plan Pro." }, { status: 403 });
  }

  const { data } = await supabase
    .from("complaints")
    .select("*")
    .eq("business_id", bizId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Complaint[];

  const header = [
    "N°", "Fecha registro", "Vence", "Tipo", "Estado", "Consumidor", "Tipo doc", "N° doc", "Domicilio", "Teléfono",
    "Correo", "Menor de edad", "Apoderado", "Bien", "Monto (S/)", "Descripción del bien", "Detalle", "Pedido",
    "Respuesta", "Fecha respuesta",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const c of rows) {
    lines.push(
      [
        c.code, fmtDateTime(c.created_at), fmtDateTime(c.due_at), KIND_LABEL[c.kind], STATUS_LABEL[c.status],
        c.consumer_name, c.consumer_doc_type, c.consumer_doc_number, c.consumer_address, c.consumer_phone,
        c.consumer_email, c.is_minor ? "Sí" : "No", c.guardian_name, c.item_type, c.amount, c.item_description,
        c.detail, c.request, c.response, c.responded_at ? fmtDateTime(c.responded_at) : "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  const csv = "﻿" + lines.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="libro-reclamaciones-${biz.slug}.csv"`,
    },
  });
}
