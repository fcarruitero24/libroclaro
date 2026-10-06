import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIA_MS,
  cicloDeCobro,
  comisionMP,
  cuotaResendVigente,
  diaEnQueLlega,
  diasDelCron,
  estadoPorPorcentaje,
  extraCloudflareUsd,
  promedioReciente,
  proyectar,
  ritmoDeLaBase,
  tramosSemanales,
} from "./calculos.ts";

const d = (s: string) => new Date(s);

test("cicloDeCobro corta el día 29, o el último día de los meses más cortos", () => {
  const casos: [string, string, string][] = [
    ["2026-10-05T15:00:00Z", "2026-09-29", "2026-10-29"],
    ["2026-10-29T00:00:00Z", "2026-10-29", "2026-11-29"],
    ["2027-02-27T12:00:00Z", "2027-01-29", "2027-02-28"],
    ["2027-02-28T12:00:00Z", "2027-02-28", "2027-03-29"],
    ["2028-02-29T12:00:00Z", "2028-02-29", "2028-03-29"],
    ["2026-12-30T00:00:00Z", "2026-12-29", "2027-01-29"],
  ];
  for (const [ahora, inicio, fin] of casos) {
    const c = cicloDeCobro(d(ahora), 29);
    assert.equal(c.inicio.toISOString(), `${inicio}T00:00:00.000Z`, `inicio para ${ahora}`);
    assert.equal(c.fin.toISOString(), `${fin}T00:00:00.000Z`, `fin para ${ahora}`);
  }
});

test("tramosSemanales: un solo tramo si cabe en una semana", () =>
  assert.deepEqual(tramosSemanales(d("2026-09-29T00:00:00Z"), d("2026-10-05T15:00:00Z")), [
    { desde: d("2026-09-29T00:00:00Z"), hasta: d("2026-10-05T15:00:00Z") },
  ]));

test("tramosSemanales parte un ciclo en tramos contiguos de 7 días o menos", () => {
  const tramos = tramosSemanales(d("2026-09-29T00:00:00Z"), d("2026-10-28T12:00:00Z"));
  assert.equal(tramos.length, 5);
  assert.equal(tramos[0].hasta.toISOString(), "2026-10-06T00:00:00.000Z");
  assert.deepEqual(tramos[4], { desde: d("2026-10-27T00:00:00Z"), hasta: d("2026-10-28T12:00:00Z") });
  for (const [i, t] of tramos.entries()) {
    assert.ok(t.hasta.getTime() - t.desde.getTime() <= 7 * DIA_MS, `tramo ${i} dura más de 7 días`);
    if (i > 0) assert.equal(t.desde.getTime(), tramos[i - 1].hasta.getTime(), `hueco antes del tramo ${i}`);
  }
});

test("tramosSemanales sin intervalo no consulta nada", () =>
  assert.deepEqual(tramosSemanales(d("2026-09-29T00:00:00Z"), d("2026-09-29T00:00:00Z")), []));

test("estadoPorPorcentaje: menos de 80 ok, de 80 a menos de 100 atención, desde 100 límite", () => {
  assert.equal(estadoPorPorcentaje(79.99), "ok");
  assert.equal(estadoPorPorcentaje(80), "atencion");
  assert.equal(estadoPorPorcentaje(99.99), "atencion");
  assert.equal(estadoPorPorcentaje(100), "limite");
});

const dias = (desde: string, valores: number[]) =>
  valores.map((valor, i) => ({ fecha: new Date(Date.parse(desde) + i * DIA_MS).toISOString().slice(0, 10), valor }));

test("promedioReciente promedia solo los días completos (sin hoy)", () =>
  assert.equal(promedioReciente(dias("2026-09-29", [10, 20, 30, 40, 50, 60, 999]), "2026-10-05"), 35));

test("promedioReciente usa como mucho los últimos 7 días completos", () =>
  assert.equal(promedioReciente(dias("2026-09-26", [100, 100, 1, 2, 3, 4, 5, 6, 7, 500]), "2026-10-05"), 4));

test("promedioReciente sin días completos no tiene ritmo", () =>
  assert.equal(promedioReciente(dias("2026-10-05", [50]), "2026-10-05"), null));

test("proyectar suma lo usado y el ritmo por los días que faltan", () => {
  assert.equal(proyectar(100, 35, d("2026-10-05T12:00:00Z"), d("2026-10-29T00:00:00Z")), 922.5);
  assert.equal(proyectar(100, null, d("2026-10-05T12:00:00Z"), d("2026-10-29T00:00:00Z")), null);
});

test("diaEnQueLlega", () => {
  const ahora = d("2026-10-05T00:00:00Z");
  const hasta = d("2026-10-29T00:00:00Z");
  assert.deepEqual(diaEnQueLlega(900, 1000, 50, ahora, hasta), d("2026-10-07T00:00:00Z"));
  assert.equal(diaEnQueLlega(100, 1000, 10, ahora, hasta), null, "llegaría después de hasta");
  assert.deepEqual(diaEnQueLlega(1000, 1000, 5, ahora, hasta), ahora, "ya llegó");
  assert.equal(diaEnQueLlega(500, 1000, 0, ahora, hasta), null, "sin crecimiento");
  assert.equal(diaEnQueLlega(500, 1000, null, ahora, hasta), null, "sin ritmo");
});

test("ritmoDeLaBase usa solo la última semana", () =>
  assert.equal(
    ritmoDeLaBase(
      [
        { fecha: "2026-09-20", base_bytes: 0 },
        { fecha: "2026-10-01", base_bytes: 100 },
        { fecha: "2026-10-03", base_bytes: 160 },
        { fecha: "2026-10-05", base_bytes: 220 },
      ],
      "2026-10-05",
    ),
    30,
  ));

test("ritmoDeLaBase necesita 3 días", () =>
  assert.equal(
    ritmoDeLaBase(
      [
        { fecha: "2026-10-04", base_bytes: 100 },
        { fecha: "2026-10-05", base_bytes: 130 },
      ],
      "2026-10-05",
    ),
    null,
  ));

test("cuotaResendVigente vuelve el día a 0 a la medianoche UTC y el mes a 0 al cambiar de mes", () => {
  const dato = { dia: 40, mes: 900, fecha: "2026-10-05T23:59:00Z" };
  assert.deepEqual(cuotaResendVigente(dato, d("2026-10-06T00:01:00Z")), { dia: 0, mes: 900 });
  assert.deepEqual(cuotaResendVigente(dato, d("2026-10-05T23:59:30Z")), { dia: 40, mes: 900 });
  assert.deepEqual(cuotaResendVigente({ dia: 40, mes: 2900, fecha: "2026-10-31T20:00:00Z" }, d("2026-11-01T00:30:00Z")), {
    dia: 0,
    mes: 0,
  });
  assert.deepEqual(cuotaResendVigente({ dia: null, mes: 18, fecha: "2026-10-05T10:00:00Z" }, d("2026-10-05T12:00:00Z")), {
    dia: null,
    mes: 18,
  });
  assert.equal(cuotaResendVigente(null, d("2026-10-05T12:00:00Z")), null);
});

test("diasDelCron arma los 7 días de Lima con su estado", () =>
  assert.deepEqual(
    diasDelCron(
      [
        { datetime: "2026-10-05T13:00:05Z", status: "success" },
        { datetime: "2026-10-04T13:00:03Z", status: "error" },
      ],
      d("2026-10-05T15:00:00Z"),
    ),
    [
      { fecha: "2026-09-29", estado: "sin_corrida" },
      { fecha: "2026-09-30", estado: "sin_corrida" },
      { fecha: "2026-10-01", estado: "sin_corrida" },
      { fecha: "2026-10-02", estado: "sin_corrida" },
      { fecha: "2026-10-03", estado: "sin_corrida" },
      { fecha: "2026-10-04", estado: "fallo" },
      { fecha: "2026-10-05", estado: "ok" },
    ],
  ));

test("diasDelCron: hoy sin corrida todavía está pendiente", () =>
  assert.deepEqual(diasDelCron([], d("2026-10-05T12:00:00Z"))[6], { fecha: "2026-10-05", estado: "pendiente" }));

test("comisionMP con la tarifa publicada de Mercado Pago", () => {
  assert.deepEqual(comisionMP(19), { comision: 1.96, recibes: 17.04 });
  assert.deepEqual(comisionMP(149), { comision: 7.32, recibes: 141.68 });
  assert.deepEqual(comisionMP(59), { comision: 3.61, recibes: 55.39 });
  assert.deepEqual(comisionMP(499), { comision: 21.73, recibes: 477.27 });
});

test("extraCloudflareUsd cobra solo lo que pasa de lo incluido", () => {
  assert.equal(extraCloudflareUsd(10_000_000, 30_000_000), 0);
  assert.equal(extraCloudflareUsd(12_000_000, 30_000_000), 0.6);
  assert.equal(extraCloudflareUsd(0, 35_000_000), 0.1);
});

test("diasDelCron usa el día de Lima: a las 9 p. m. de Lima ya es otro día en UTC", () => {
  const dias7 = diasDelCron([{ datetime: "2026-10-06T01:00:00Z", status: "success" }], d("2026-10-06T02:00:00Z"));
  assert.deepEqual(dias7[6], { fecha: "2026-10-05", estado: "ok" });
});
