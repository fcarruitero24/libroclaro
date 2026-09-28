import type { ReactNode } from "react";

/**
 * Íconos de trazo para la landing y el menú del panel. Van en línea y no
 * desde una librería: son un par de docenas, pesan menos que el import de
 * cualquier paquete de íconos y heredan el color con `currentColor`.
 */
const trazos = {
  // Numeración correlativa: almohadilla.
  numero: (
    <>
      <path d="M5 9h14M5 15h14" />
      <path d="M10 4 8 20M16 4l-2 16" />
    </>
  ),
  // Copia al consumidor: sobre con check.
  correo: (
    <>
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" />
      <path d="m3 7 9 6 9-6" />
      <path d="m16 19 2 2 4-4" />
    </>
  ),
  // Plazo: calendario con reloj.
  plazo: (
    <>
      <path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="17.5" cy="17.5" r="4.5" />
      <path d="M17.5 15.5v2l1.3 1" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </>
  ),
  // Respuestas documentadas: globo de diálogo con líneas.
  respuesta: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  archivo: (
    <>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </>
  ),
  tienda: (
    <>
      <path d="M3 9 4.5 4h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 11.5V20h14v-8.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  // Instala el aviso: letrero colgado.
  aviso: (
    <>
      <path d="M12 2v3" />
      <path d="m7 9 5-4 5 4" />
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M8 13.5h8M8 16.5h5" />
    </>
  ),
  bandeja: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  reloj: (
    <>
      <path d="M6 2h12M6 22h12" />
      <path d="M7 2v4a5 5 0 0 0 10 0V2M7 22v-4a5 5 0 0 1 10 0v4" />
    </>
  ),
  balanza: (
    <>
      <path d="M12 3v18M7 21h10M4 7h16" />
      <path d="m4 7-3 7a3.5 3.5 0 0 0 6 0zM20 7l-3 7a3.5 3.5 0 0 0 6 0z" />
    </>
  ),
  campana: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),

  // --- Menú lateral del panel ---
  // Inicio: cuadrícula de cuatro paneles.
  inicio: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  // Plantillas: hoja con líneas de texto.
  plantilla: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  // Ajustes: controles deslizantes (más legible que un engranaje a 20px).
  ajustes: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  // Plan: tarjeta.
  tarjeta: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  salir: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  ayuda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01" />
    </>
  ),
  // IA: chispa de cuatro puntas.
  chispa: (
    <>
      <path d="M12 3c.4 3.6 2.4 5.6 6 6-3.6.4-5.6 2.4-6 6-.4-3.6-2.4-5.6-6-6 3.6-.4 5.6-2.4 6-6z" />
      <path d="M19 15c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof trazos;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {trazos[name]}
    </svg>
  );
}
