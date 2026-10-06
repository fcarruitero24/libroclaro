import assert from "node:assert/strict";
import { test } from "node:test";
import {
  errorDeLibroClaro,
  leerCorridas,
  leerInvocaciones,
  leerResumenLibroClaro,
  leerSuscripciones,
  sumarPorFecha,
} from "./fuentes.ts";

const conCuenta = (datos: Record<string, unknown>) => ({ data: { viewer: { accounts: [datos] } }, errors: null });
const conErrores = { data: null, errors: [{ message: "not authorized for that account" }] };

test("leerInvocaciones pasa las visitas, la CPU en ms y los errores de cada día", () =>
  assert.deepEqual(
    leerInvocaciones(
      conCuenta({
        workersInvocationsAdaptive: [{ sum: { requests: 664, errors: 1, cpuTimeUs: 12_345_000 }, dimensions: { date: "2026-10-05" } }],
      }),
    ),
    { ok: true, porDia: [{ fecha: "2026-10-05", visitas: 664, cpuMs: 12_345, errores: 1 }] },
  ));

test("leerInvocaciones muestra el error de Cloudflare en vez de ceros", () =>
  assert.deepEqual(leerInvocaciones(conErrores), { ok: false, error: "Cloudflare: not authorized for that account" }));

test("leerInvocaciones sin la cuenta en la respuesta es un error, no ceros", () => {
  const r = leerInvocaciones({ data: { viewer: { accounts: [] } }, errors: null });
  assert.equal(r.ok, false);
});

test("leerCorridas pasa la hora y el resultado de cada corrida del cron", () =>
  assert.deepEqual(
    leerCorridas(conCuenta({ workersInvocationsScheduled: [{ datetime: "2026-10-05T13:00:05Z", status: "success" }] })),
    { ok: true, corridas: [{ datetime: "2026-10-05T13:00:05Z", status: "success" }] },
  ));

test("leerCorridas muestra el error de Cloudflare", () =>
  assert.deepEqual(leerCorridas(conErrores), { ok: false, error: "Cloudflare: not authorized for that account" }));

test("sumarPorFecha junta un día partido entre dos tramos semanales", () =>
  assert.deepEqual(
    sumarPorFecha([
      [{ fecha: "2026-10-06", visitas: 100, cpuMs: 10, errores: 0 }],
      [
        { fecha: "2026-10-06", visitas: 50, cpuMs: 5, errores: 1 },
        { fecha: "2026-10-07", visitas: 7, cpuMs: 1, errores: 0 },
      ],
    ]),
    [
      { fecha: "2026-10-06", visitas: 150, cpuMs: 15, errores: 1 },
      { fecha: "2026-10-07", visitas: 7, cpuMs: 1, errores: 0 },
    ],
  ));

test("leerSuscripciones toma el periodo de la suscripción de Workers", () =>
  assert.deepEqual(
    leerSuscripciones({
      success: true,
      result: [
        { rate_plan: { id: "free", public_name: "Free" } },
        {
          rate_plan: { id: "workers_paid", public_name: "Workers Paid" },
          current_period_start: "2026-09-29T16:45:00Z",
          current_period_end: "2026-10-29T16:45:00Z",
        },
      ],
    }),
    { inicio: new Date("2026-09-29T16:45:00Z"), fin: new Date("2026-10-29T16:45:00Z") },
  ));

test("leerSuscripciones sin respuesta válida o sin plan de Workers no inventa el ciclo", () => {
  assert.equal(leerSuscripciones({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }), null);
  assert.equal(leerSuscripciones({ success: true, result: [{ rate_plan: { id: "free", public_name: "Free" } }] }), null);
});

test("errorDeLibroClaro: un 404 casi siempre es PANEL_SECRET distinto entre los dos Workers", () => {
  assert.equal(
    errorDeLibroClaro(404),
    "LibroClaro respondió 404: revisa que PANEL_SECRET sea el mismo en los dos Workers",
  );
  assert.equal(errorDeLibroClaro(503), "LibroClaro respondió 503");
});

test("leerResumenLibroClaro pasa la respuesta con sus cinco partes", () => {
  const datos = {
    supabase: { error: "x" },
    resend: null,
    recordatorios: null,
    mercado_pago: { cobrado: 0, comisiones: 0, pagos: 0 },
    alertas_del_mes: [],
  };
  assert.deepEqual(leerResumenLibroClaro(datos), { ok: true, datos });
});

test("leerResumenLibroClaro con otra forma es un error, no una caída del panel", () => {
  const inesperado = { ok: false, error: "LibroClaro respondió algo inesperado: ¿están publicadas las dos versiones?" };
  assert.deepEqual(leerResumenLibroClaro({ error: "algo" }), inesperado);
  assert.deepEqual(leerResumenLibroClaro(null), inesperado);
  assert.deepEqual(
    leerResumenLibroClaro({ supabase: null, resend: null, recordatorios: null, mercado_pago: { pagos: 0 }, alertas_del_mes: [] }),
    inesperado,
  );
});
