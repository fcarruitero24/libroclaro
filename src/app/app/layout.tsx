import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/app" />
            <Link href="/app/negocios" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">
              Mis negocios
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-slate-500 sm:block">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
