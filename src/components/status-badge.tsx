import { Badge } from "@/components/ui";
import { businessDaysLeft, urgencyFor } from "@/lib/business-days";
import { STATUS_LABEL } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "respondido" ? "green" : status === "cerrado" ? "slate" : status === "en_proceso" ? "teal" : "amber";
  return <Badge tone={tone}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function DeadlineBadge({ status, dueAt }: { status: string; dueAt: string }) {
  const urgency = urgencyFor(status, dueAt);
  if (urgency === "resuelto") return <span className="text-xs text-slate-400">—</span>;
  const left = businessDaysLeft(dueAt);
  if (urgency === "vencido") return <Badge tone="red">Vencido hace {-left} d.h.</Badge>;
  if (left === 0) return <Badge tone="red">Vence hoy</Badge>;
  const tone = urgency === "urgente" ? "red" : urgency === "pronto" ? "amber" : "slate";
  return (
    <Badge tone={tone}>
      {left} {left === 1 ? "día hábil" : "días hábiles"}
    </Badge>
  );
}
