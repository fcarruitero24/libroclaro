import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppIndexPage() {
  const supabase = await createClient();

  // Primer libro activo. Si todos están archivados, va a la lista para poder reactivar.
  const { data: active } = await supabase
    .from("businesses")
    .select("id")
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (active && active.length > 0) redirect(`/app/${active[0].id}`);

  const { data: any_ } = await supabase.from("businesses").select("id").limit(1);
  if (any_ && any_.length > 0) redirect("/app/negocios");

  redirect("/app/nuevo");
}
