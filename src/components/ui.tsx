import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "white";

// active: un leve hundimiento al presionar, para que el clic se sienta.
// focus-visible: anillo solo al navegar con teclado, nunca con el mouse.
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-teal-700 text-white shadow-sm hover:bg-teal-800",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  white: "bg-white text-teal-800 shadow-sm hover:bg-teal-50",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}

const control =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-[color,border-color,box-shadow] duration-150 ease-out placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:bg-slate-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="anim-fade-up text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    // Mismo lenguaje que la portada: sin borde gris, contorno por sombra teñida.
    <div id={id} className={cn("rounded-2xl bg-white p-6 sombra-tarjeta", className)}>
      {children}
    </div>
  );
}

type AlertKind = "error" | "success" | "info" | "warning";

const alertStyles: Record<AlertKind, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-green-200 bg-green-50 text-green-800",
  info: "border-teal-200 bg-teal-50 text-teal-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function Alert({
  kind = "info",
  children,
  className,
}: {
  kind?: AlertKind;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn("anim-fade-up rounded-lg border px-4 py-3 text-sm", alertStyles[kind], className)}
    >
      {children}
    </div>
  );
}

type Tone = "slate" | "teal" | "green" | "amber" | "red" | "violet";

const tones: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  teal: "bg-teal-100 text-teal-800",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-800",
  violet: "bg-violet-100 text-violet-800",
};

export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
