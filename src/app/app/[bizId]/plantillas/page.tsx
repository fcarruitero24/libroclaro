import { PlantillaForm } from "@/components/plantilla-form";
import { ButtonLink, Card } from "@/components/ui";
import { deleteTemplate } from "@/lib/actions/panel";
import { planFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import type { Business, ResponseTemplate } from "@/lib/types";

export const metadata = { title: "Plantillas de respuesta" };

export default async function PlantillasPage({ params }: { params: Promise<{ bizId: string }> }) {
  const { bizId } = await params;
  const supabase = await createClient();
  const [{ data: bizData }, { data }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", bizId).single(),
    supabase.from("response_templates").select("*").order("title", { ascending: true }),
  ]);
  const plan = planFor(bizData as Business);
  const plantillas = (data ?? []) as ResponseTemplate[];

  if (!plan.templates) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-lg font-semibold text-slate-900">Responde en segundos con plantillas</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Guarda las respuestas que más usas —demoras, cambios, cobros— y complétalas con un clic. El nombre del
          consumidor y el número de la hoja se ponen solos.
        </p>
        <ButtonLink href={`/app/${bizId}/plan`} className="mt-5">
          Disponible en el plan Pro
        </ButtonLink>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tus plantillas</h2>
          <p className="text-sm text-slate-600">
            Las compartes entre todos tus negocios. Úsalas desde el detalle de cada reclamo, en &ldquo;Usar
            plantilla&rdquo;.
          </p>
        </div>
        {plantillas.length === 0 ? (
          <Card className="text-sm text-slate-600">Aún no tienes plantillas. Crea la primera a la derecha.</Card>
        ) : (
          plantillas.map((p) => (
            <details key={p.id} className="group rounded-xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{p.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 group-open:hidden">{p.body}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-teal-700 group-open:hidden">Editar</span>
              </summary>
              <div className="border-t border-slate-100 p-5">
                <PlantillaForm businessId={bizId} plantilla={p} />
                <form action={deleteTemplate} className="mt-3 border-t border-slate-100 pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="business_id" value={bizId} />
                  <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                    Eliminar plantilla
                  </button>
                </form>
              </div>
            </details>
          ))
        )}
      </div>
      <Card className="h-fit lg:col-span-2">
        <h3 className="font-semibold text-slate-900">Nueva plantilla</h3>
        <div className="mt-4">
          <PlantillaForm businessId={bizId} />
        </div>
      </Card>
    </div>
  );
}
