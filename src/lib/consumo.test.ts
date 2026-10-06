import assert from "node:assert/strict";
import { test } from "node:test";
import { cuotaDeResend } from "./consumo.ts";

const h = (o: Record<string, string>) => new Headers(o);

test("cuotaDeResend lee las dos cabeceras", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-daily-quota": "3", "x-resend-monthly-quota": "18" })), { dia: 3, mes: 18 }));

test("cuotaDeResend sin la diaria (plan pagado)", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-monthly-quota": "18" })), { dia: null, mes: 18 }));

test("cuotaDeResend sin cabeceras devuelve null", () => assert.equal(cuotaDeResend(h({})), null));

test("cuotaDeResend ignora lo que no es entero", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-daily-quota": "abc", "x-resend-monthly-quota": "18" })), { dia: null, mes: 18 }));
