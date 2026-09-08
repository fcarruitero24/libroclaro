"use client";

import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()} className="no-print">
      Imprimir / Guardar PDF
    </Button>
  );
}
