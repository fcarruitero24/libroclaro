"use client";

import { useState, type CSSProperties } from "react";
import { ButtonLink } from "@/components/ui";
import { type BillingPeriod, monthlyEquivalent, PLANS, yearlySavings } from "@/lib/plans";

/** Índice para la cascada del reveal: lo lee `--i` en globals.css. */
const paso = (i: number) => ({ "--i": i }) as CSSProperties;

const AHORRO_MAXIMO = Math.max(yearlySavings(PLANS.pro), yearlySavings(PLANS.business));

/**
 * Tarjetas de precios con selector Mensual / Anual.
 *
 * Arranca en anual, que es el plan que conviene vender. El selector
 * reemplaza la frase larga que explicaba las dos modalidades a la vez:
 * cada tarjeta muestra solo el precio del periodo elegido, y el número
 * entra de nuevo (vía `key`) cada vez que cambia.
 */
export function PreciosPlanes() {
  const [periodo, setPeriodo] = useState<BillingPeriod>("yearly");
  const anual = periodo === "yearly";

  return (
    <>
      <div className="reveal mt-8 flex justify-center">
        <div role="radiogroup" aria-label="Periodo de pago" className="relative grid grid-cols-2 rounded-full bg-slate-100 p-1">
          <span
            aria-hidden="true"
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              anual ? "translate-x-full" : "translate-x-0"
            }`}
          />
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={periodo === p}
              onClick={() => setPeriodo(p)}
              className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200 ${
                periodo === p ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p === "monthly" ? "Mensual" : "Anual"}
              {p === "yearly" && (
                <span className="rounded-full bg-teal-100 px-1.5 py-px text-[10px] font-bold text-teal-800">
                  −{AHORRO_MAXIMO}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {(["free", "pro", "business"] as const).map((id, i) => {
          const p = PLANS[id];
          const highlight = id === "pro";
          const precio = anual ? p.priceYearly : p.priceMonthly;
          const tenue = highlight ? "text-teal-300" : "text-slate-500";
          return (
            <div
              key={id}
              style={paso(i)}
              className={
                highlight
                  ? "reveal relative rounded-2xl bg-teal-900 p-6 shadow-xl transition duration-200 ease-out hover:-translate-y-1 hover:shadow-2xl"
                  : "reveal rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
              }
            >
              {highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-teal-400 px-3 py-1 text-xs font-semibold text-teal-900">
                  Más popular
                </span>
              )}
              <h3 className={`text-lg font-semibold ${highlight ? "text-white" : "text-slate-900"}`}>{p.name}</h3>

              {p.priceYearly === 0 ? (
                <>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className={`text-4xl font-extrabold ${highlight ? "text-white" : "text-slate-900"}`}>S/ 0</span>
                  </p>
                  <p className={`mt-1 text-sm ${tenue}`}>Para siempre, sin tarjeta.</p>
                </>
              ) : (
                <>
                  <p key={periodo} className="anim-precio mt-2 flex items-baseline gap-1">
                    <span className={`text-4xl font-extrabold tabular-nums ${highlight ? "text-white" : "text-slate-900"}`}>
                      S/ {precio}
                    </span>
                    <span className={`text-sm ${tenue}`}>{anual ? "/año" : "/mes"}</span>
                  </p>
                  <p className={`mt-1 text-sm ${tenue}`}>
                    {anual
                      ? `Equivale a S/ ${monthlyEquivalent(p)} al mes. Ahorras ${yearlySavings(p)}%.`
                      : "Sin compromiso. Cancela cuando quieras."}
                  </p>
                </>
              )}

              <ul className={`mt-6 space-y-2 text-sm ${highlight ? "text-teal-100" : "text-slate-700"}`}>
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className={highlight ? "text-teal-400" : "text-teal-700"}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/registro" variant={highlight ? "white" : "secondary"} className="mt-8 w-full">
                {id === "free" ? "Empezar gratis" : `Elegir ${p.name}`}
              </ButtonLink>
            </div>
          );
        })}
      </div>
    </>
  );
}
