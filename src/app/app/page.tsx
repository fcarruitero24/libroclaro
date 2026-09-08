import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("id").order("created_at", { ascending: true }).limit(1);
  if (!data || data.length === 0) redirect("/app/nuevo");
  redirect(`/app/${data[0].id}`);
}
