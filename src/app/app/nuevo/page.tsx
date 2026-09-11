import { BusinessForm } from "@/components/business-form";
import { Alert, Card } from "@/components/ui";
import { getAppUrl } from "@/lib/env";

export const metadata = { title: "Registrar negocio" };

export default async function NewBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const appUrl = await getAppUrl();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Registra tu negocio</h1>
      <p className="mt-1 text-sm text-slate-600">
        Estos datos aparecerán en cada hoja de reclamación, tal como exige el reglamento.
      </p>
      {sp.error === "registro" && (
        <Alert kind="warning" className="mt-6">
          Tu cuenta quedó creada, pero no pudimos publicar tu libro automáticamente. Completa estos datos y listo.
        </Alert>
      )}
      <Card className="mt-6">
        <BusinessForm mode="create" appUrl={appUrl} />
      </Card>
    </main>
  );
}
