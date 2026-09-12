import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-7 w-7", className)}>
      <rect x="4" y="3" width="24" height="26" rx="4" fill="#0f766e" />
      <rect x="8" y="7" width="16" height="18" rx="2" fill="#fff" />
      <rect x="11" y="11" width="10" height="2" rx="1" fill="#0f766e" />
      <rect x="11" y="15" width="10" height="2" rx="1" fill="#99f6e4" />
      <rect x="11" y="19" width="7" height="2" rx="1" fill="#99f6e4" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold text-slate-900", className)}>
      <LogoMark />
      <span className="text-lg tracking-tight">
        Libro<span className="text-teal-700">Claro</span>
      </span>
    </Link>
  );
}
