import { CabeceraCuenta } from "@/components/cabecera-cuenta";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <CabeceraCuenta email={user.email ?? ""} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
