import assert from "node:assert/strict";
import { test } from "node:test";
import { cuotaDeResend, fechaEnLima, inicioDelMesEnLima, resumenDePagos, secretoValido } from "./consumo.ts";

const h = (o: Record<string, string>) => new Headers(o);

test("cuotaDeResend lee las dos cabeceras", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-daily-quota": "3", "x-resend-monthly-quota": "18" })), { dia: 3, mes: 18 }));

test("cuotaDeResend sin la diaria (plan pagado)", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-monthly-quota": "18" })), { dia: null, mes: 18 }));

test("cuotaDeResend sin cabeceras devuelve null", () => assert.equal(cuotaDeResend(h({})), null));

test("cuotaDeResend ignora lo que no es entero", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-daily-quota": "abc", "x-resend-monthly-quota": "18" })), { dia: null, mes: 18 }));

test("secretoValido acepta el mismo secreto", async () => assert.equal(await secretoValido("abc123", "abc123"), true));

test("secretoValido rechaza otro secreto, uno parcial o ninguno", async () => {
  assert.equal(await secretoValido("abc124", "abc123"), false);
  assert.equal(await secretoValido("abc", "abc123"), false);
  assert.equal(await secretoValido(null, "abc123"), false);
});

test("secretoValido no abre la puerta si el secreto no está configurado", async () => {
  assert.equal(await secretoValido("", ""), false);
  assert.equal(await secretoValido("x", undefined), false);
});

test("fechaEnLima cambia de día a las 5:00 UTC (medianoche de Lima)", () => {
  assert.equal(fechaEnLima(new Date("2026-10-06T04:59:00Z")), "2026-10-05");
  assert.equal(fechaEnLima(new Date("2026-10-06T05:00:00Z")), "2026-10-06");
});

test("inicioDelMesEnLima usa el mes de Lima, no el de UTC", () => {
  assert.equal(inicioDelMesEnLima(new Date("2026-10-05T12:00:00Z")), "2026-10-01T00:00:00.000-05:00");
  assert.equal(inicioDelMesEnLima(new Date("2026-11-01T03:00:00Z")), "2026-10-01T00:00:00.000-05:00");
});

test("resumenDePagos suma solo lo aprobado y las comisiones que paga el vendedor", () => {
  const pagos = [
    { status: "approved", transaction_amount: 19, fee_details: [{ amount: 1.96, fee_payer: "collector" }] },
    {
      status: "approved",
      transaction_amount: 149,
      fee_details: [
        { amount: 7.32, fee_payer: "collector" },
        { amount: 3, fee_payer: "payer" },
      ],
    },
    { status: "refunded", transaction_amount: 59, fee_details: [{ amount: 3.61, fee_payer: "collector" }] },
  ];
  assert.deepEqual(resumenDePagos(pagos), { cobrado: 168, comisiones: 9.28, pagos: 2 });
});

test("resumenDePagos sin pagos da ceros", () => assert.deepEqual(resumenDePagos([]), { cobrado: 0, comisiones: 0, pagos: 0 }));
