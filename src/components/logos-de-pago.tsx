import { cn } from "@/lib/cn";

/**
 * Tarjetas que acepta la cuenta de Mercado Pago. Verificado con
 * GET /v1/payment_methods el 2026-09-28: Visa, Mastercard, American Express
 * y Diners, en crédito, más débito Visa y Mastercard. Si se agrega una marca
 * aquí, tiene que estar en esa lista.
 *
 * Las imágenes viven en public/pagos. El Mastercard es el símbolo vigente
 * (dos círculos), no el logo con franjas que se usó hasta 2016. De Diners va
 * solo el círculo: con "Diners Club International" debajo, a este tamaño el
 * texto no se lee. American Express es su caja azul, que ocupa casi toda la
 * placa como en cualquier checkout.
 */
const TARJETAS = [
  { src: "/pagos/visa.png", alt: "Visa", w: 296, h: 96, alto: "h-3.5" },
  { src: "/pagos/mastercard.svg", alt: "Mastercard", w: 124, h: 72, alto: "h-6" },
  { src: "/pagos/american-express.png", alt: "American Express", w: 96, h: 96, alto: "h-7" },
  { src: "/pagos/diners-club.png", alt: "Diners Club", w: 110, h: 96, alto: "h-6" },
];

/** Placas blancas del mismo tamaño con cada marca, como en un checkout. */
export function LogosDeTarjetas({ className }: { className?: string }) {
  return (
    <ul aria-label="Tarjetas aceptadas" className={cn("flex flex-wrap items-center gap-2", className)}>
      {TARJETAS.map((t) => (
        <li key={t.alt} className="flex h-9 w-14 items-center justify-center rounded-md bg-white ring-1 ring-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.src} alt={t.alt} width={t.w} height={t.h} loading="lazy" className={cn("w-auto max-w-[80%] object-contain", t.alto)} />
        </li>
      ))}
    </ul>
  );
}

/** "Mercado Pago" con su símbolo. El texto va en gris: su celeste sobre blanco no se lee bien. */
export function MarcaMercadoPago({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold text-slate-700", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pagos/mercado-pago.svg" alt="" width={24} height={24} className="h-5 w-5" />
      Mercado Pago
    </span>
  );
}
