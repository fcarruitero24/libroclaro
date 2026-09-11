"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 animate-spin">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M18 10a8 8 0 0 0-8-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Botón de envío. Mientras la Server Action corre muestra un spinner
 * centrado y deja el texto original ocupando su espacio, así el botón
 * conserva exactamente el mismo ancho y no salta el layout.
 */
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  className,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn("relative", className)}
      {...props}
    >
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
          <span className="sr-only">{pendingText}</span>
        </span>
      )}
    </Button>
  );
}
