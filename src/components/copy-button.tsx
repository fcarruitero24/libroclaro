"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // El navegador puede bloquear el portapapeles; el usuario puede seleccionar el texto.
        }
      }}
    >
      {copied ? "¡Copiado!" : label}
    </Button>
  );
}
