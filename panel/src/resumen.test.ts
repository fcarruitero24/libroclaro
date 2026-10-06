import assert from "node:assert/strict";
import { test } from "node:test";
import type { ResumenLibroClaro } from "../../src/lib/consumo.ts";
import { armarResumen } from "./resumen.ts";
import type { DatosCrudos, Fuente } from "./tipos.ts";

const d = (s: string) => new Date(s);
const AHORA = d("2026-10-05T15:00:00Z");

const porDia = (desde: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    fecha: new Date(Date.parse(desde) + i * 86_400_000).toISOString().slice(0, 10),
    visitas: 1000,
    cpuMs: 10_000,
    errores: 0,
  }));

function libroclaro(cambios: Partial<ResumenLibroClaro> = {}): ResumenLibroClaro {
  return {
    supabase: {
      base_bytes: 12_268_339,
      archivos_bytes: 0,
      usuarios: 2,
      usuarios_activos_30d: 2,
      negocios: 2,
      reclamos: 39,
      suscripciones_activas: 0,
      diario: [{ fecha: "2026-10-05", base_bytes: 12_268_339 }],
    },
    resend: { dia: 1, mes: 18, fecha: "2026-10-05T14:00:00Z" },
    recordatorios: { hora: "2026-10-05T13:00:05Z", ok: true, enviados: 0, error: null },
    mercado_pago: { cobrado: 0, comisiones: 0, pagos: 0 },
    alertas_del_mes: [],
    ...cambios,
  };
}

/** Caso base, "día normal": el 5 de octubre a las 10 a. m. de Lima, con todo en orden. */
function datos(cambios: Partial<DatosCrudos> = {}): DatosCrudos {
  return {
    ciclo: { inicio: d("2026-09-29T00:00:00Z"), fin: d("2026-10-29T00:00:00Z"), estimado: false },
    cloudflare: { ok: true, porDia: porDia("2026-09-29", 7) },
    cron: {
      ok: true,
      corridas: porDia("2026-09-29", 7).map((p) => ({ datetime: `${p.fecha}T13:00:05Z`, status: "success" })),
    },
    libroclaro: { ok: true, datos: libroclaro() },
    ruc: { ok: true, ms: 500, error: null },
    qr: { ok: true, ms: 2000, error: null },
    ...cambios,
  };
}

/** La parte de una fuente que respondió; si falló, la prueba se cae con su error. */
function okDe<T>(f: Fuente<T>): { ok: true } & T {
  if (!f.ok) throw new Error(`la fuente falló: ${f.error}`);
  return f;
}

const conCpu = (cpuMsDeHoy: number) => {
  const dias = porDia("2026-09-29", 7);
  dias[6] = { ...dias[6], cpuMs: cpuMsDeHoy };
  return datos({ cloudflare: { ok: true, porDia: dias } });
};

const conRecordatorios = (recordatorios: ResumenLibroClaro["recordatorios"]) =>
  datos({ libroclaro: { ok: true, datos: libroclaro({ recordatorios }) } });

test("día normal", () => {
  const r = armarResumen(datos(), AHORA);
  const cf = okDe(r.cloudflare);
  assert.equal(r.estado, "ok");
  assert.equal(cf.ciclo.dia, 7);
  assert.equal(cf.ciclo.dias, 30);
  assert.equal(cf.visitas.usado, 7000);
  assert.equal(cf.visitas.proyeccion, 30375);
  assert.deepEqual(r.gasto, { usd: 5, soles: 18.5 });
  assert.equal(r.masCercano?.nombre, "Base de datos de Supabase");
  assert.deepEqual(okDe(r.mercadoPago).tabla[0], { plan: "Pro mensual", precio: 19, comision: 1.96, recibes: 17.04 });
  assert.deepEqual(r.proximoCobro, { fecha: "2026-10-29T00:00:00.000Z", usd: 5 });
  assert.deepEqual(r.alertas, []);
  const dias = okDe(r.recordatorios).dias;
  assert.equal(dias.length, 7);
  assert.ok(dias.every((x) => x.estado === "ok"), JSON.stringify(dias));
});

test("si LibroClaro no responde, Cloudflare sigue y sus cinco partes dicen el error", () => {
  const caido = { ok: false, error: "LibroClaro no respondió: timeout" } as const;
  const r = armarResumen(datos({ libroclaro: caido }), AHORA);
  assert.deepEqual(r.supabase, caido);
  assert.deepEqual(r.resend, caido);
  assert.deepEqual(r.mercadoPago, caido);
  assert.deepEqual(r.recordatorios, caido);
  assert.deepEqual(r.alertasDelMes, caido);
  assert.equal(r.cloudflare.ok, true);
  assert.equal(r.estado, "ok");
  assert.deepEqual(r.fuentesConError, ["Supabase", "Resend", "Mercado Pago", "Recordatorios"]);
});

test("CPU al 85 %: atención y una alerta del umbral 80 para este ciclo", () => {
  const r = armarResumen(conCpu(25_440_000), AHORA);
  assert.equal(r.estado, "atencion");
  assert.equal(r.alertas.length, 1);
  assert.equal(r.alertas[0].clave, "cloudflare.cpu.80.2026-10-29");
  assert.ok(r.alertas[0].texto.startsWith("Tiempo de CPU de Cloudflare llegó al 85 %"), r.alertas[0].texto);
});

test("CPU al 100 %: límite y solo la alerta del umbral 100", () => {
  const r = armarResumen(conCpu(29_940_000), AHORA);
  assert.equal(r.estado, "limite");
  assert.deepEqual(
    r.alertas.map((a) => a.clave),
    ["cloudflare.cpu.100.2026-10-29"],
  );
});

test("recordatorios fallidos: la alerta lleva el día de Lima aunque en UTC ya sea otro", () => {
  const r = armarResumen(
    conRecordatorios({ hora: "2026-10-05T13:00:05Z", ok: false, enviados: 0, error: "Falta SUPABASE_SERVICE_ROLE_KEY" }),
    d("2026-10-06T02:00:00Z"),
  );
  const alerta = r.alertas.find((a) => a.clave.startsWith("cron."));
  assert.equal(alerta?.clave, "cron.recordatorios.2026-10-05");
  assert.match(alerta?.texto ?? "", /fallaron/);
});

test("recordatorios que no corren hace más de 26 h", () => {
  const ultimaBien = { hora: "2026-10-05T13:00:05Z", ok: true, enviados: 2, error: null };
  const tarde = armarResumen(conRecordatorios(ultimaBien), d("2026-10-06T16:00:06Z"));
  const alerta = tarde.alertas.find((a) => a.clave.startsWith("cron."));
  assert.equal(alerta?.clave, "cron.recordatorios.2026-10-06");
  assert.match(alerta?.texto ?? "", /no corren desde/);

  const aTiempo = armarResumen(conRecordatorios(ultimaBien), d("2026-10-06T14:00:05Z"));
  assert.equal(
    aTiempo.alertas.find((a) => a.clave.startsWith("cron.")),
    undefined,
  );
});

/** Rutas de los números NaN o infinitos dentro del objeto. */
function numerosRaros(x: unknown, ruta = "resumen"): string[] {
  if (typeof x === "number") return Number.isFinite(x) ? [] : [ruta];
  if (x && typeof x === "object") return Object.entries(x).flatMap(([k, v]) => numerosRaros(v, `${ruta}.${k}`));
  return [];
}

test("recién publicado: sin datos acumulados no hay NaN, ritmos inventados ni alertas", () => {
  const r = armarResumen(
    datos({
      cloudflare: { ok: true, porDia: [{ fecha: "2026-09-29", visitas: 50, cpuMs: 300, errores: 0 }] },
      cron: { ok: true, corridas: [] },
      libroclaro: { ok: true, datos: libroclaro({ resend: null, recordatorios: null }) },
    }),
    d("2026-09-29T15:00:00Z"),
  );
  assert.deepEqual(numerosRaros(r), []);
  assert.deepEqual(r.alertas, []);
  assert.equal(okDe(r.cloudflare).visitas.proyeccion, null);
  assert.equal(okDe(r.supabase).ritmoBytesDia, null);
  assert.deepEqual(r.resend, { ok: true, dia: null, mes: null, ultimoEnvio: null });
  assert.equal(okDe(r.recordatorios).dias[6].estado, "pendiente");
});

test("Resend de ayer: hoy van 0 correos y el mes sigue", () => {
  const r = armarResumen(
    datos({ libroclaro: { ok: true, datos: libroclaro({ resend: { dia: 60, mes: 900, fecha: "2026-10-04T22:00:00Z" } }) } }),
    AHORA,
  );
  const resend = okDe(r.resend);
  assert.equal(resend.dia?.usado, 0);
  assert.equal(resend.mes?.usado, 900);
});
