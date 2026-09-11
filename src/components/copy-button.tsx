"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="anim-pop-in h-4 w-4">
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <Button
      type="button"
      variant="secondary"
      className="transition"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2000);
        } catch {
          // El navegador puede bloquear el portapapeles; el usuario puede seleccionar el texto.
        }
      }}
    >
      {copied ? (
        <>
          <CheckIcon />
          <span className="text-green-700">¡Copiado!</span>
        </>
      ) : (
        label
      )}
    </Button>
  );
}
