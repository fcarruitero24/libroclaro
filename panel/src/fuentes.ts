/**
 * De dónde sale cada dato del panel: Cloudflare (analítica por GraphQL y
 * suscripciones), LibroClaro (por service binding), y pedidos de prueba a la
 * consulta de RUC y al generador de QR. Cada fuente tiene 8 s y, si falla,
 * trae su error sin tumbar a las demás.
 *
 * Los lectores (leer*) son puros y tienen pruebas; las consultas no.
 */
import type { ResumenLibroClaro } from "../../src/lib/consumo.ts";
import { cicloDeCobro, DIA_MS, tramosSemanales } from "./calculos.ts";
import { CONFIG, RUC_DE_PRUEBA } from "./config.ts";
import { armarResumen } from "./resumen.ts";
import type { DatosCrudos, Fuente, Prueba, Resumen } from "./tipos.ts";

/** Tipos mínimos del Worker, como en cloudflare/worker.ts. */
export interface Fetcher {
  fetch(r: Request): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
  LIBROCLARO: Fetcher;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_ANALYTICS_TOKEN?: string;
  PANEL_SECRET?: string;
  ACCESS_EQUIPO?: string;
  ACCESS_AUD?: string;
  /** Solo en panel/.dev.vars: salta la verificación de Access en local. */
  PANEL_SIN_ACCESS?: string;
  /** Solo en panel/.dev.vars: LibroClaro corriendo en local, en vez del service binding. */
  LIBROCLARO_URL?: string;
}

type PorDia = { fecha: string; visitas: number; cpuMs: number; errores: number }[];

const LIMITE_MS = 8000;
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------------------------------------------------------------------------
// Lectores
// ---------------------------------------------------------------------------

/** GraphQL responde 200 aunque falle: el error viene en `errors`. */
function errorDeGraphQL(json: unknown): { ok: false; error: string } | null {
  const errores = (json as { errors?: { message?: string }[] | null } | null)?.errors;
  if (!Array.isArray(errores) || errores.length === 0) return null;
  return { ok: false, error: `Cloudflare: ${errores.map((e) => e.message ?? "error sin detalle").join("; ")}` };
}

/**
 * La cuenta dentro de la respuesta. Si no viene (cuenta equivocada o token sin
 * permiso), es un error: devolver ceros haría creer que no hubo visitas.
 */
function cuentaDe(json: unknown): Record<string, unknown> | null {
  const cuentas = (json as { data?: { viewer?: { accounts?: unknown } } | null } | null)?.data?.viewer?.accounts;
  return Array.isArray(cuentas) && cuentas.length > 0 ? (cuentas[0] as Record<string, unknown>) : null;
}

const SIN_CUENTA =
  "Cloudflare: la respuesta no trae la cuenta (revisa CLOUDFLARE_ACCOUNT_ID y los permisos del token)";

export function leerInvocaciones(json: unknown): Fuente<{ porDia: PorDia }> {
  const fallo = errorDeGraphQL(json);
  if (fallo) return fallo;
  const cuenta = cuentaDe(json);
  if (!cuenta) return { ok: false, error: SIN_CUENTA };
  const filas = (cuenta.workersInvocationsAdaptive ?? []) as {
    sum?: { requests?: number; errors?: number; cpuTimeUs?: number };
    dimensions?: { date?: string };
  }[];
  const porDia = filas.flatMap((f) =>
    f.dimensions?.date
      ? [
          {
            fecha: f.dimensions.date,
            visitas: f.sum?.requests ?? 0,
            cpuMs: (f.sum?.cpuTimeUs ?? 0) / 1000,
            errores: f.sum?.errors ?? 0,
          },
        ]
      : [],
  );
  return { ok: true, porDia };
}

export function leerCorridas(json: unknown): Fuente<{ corridas: { datetime: string; status: string }[] }> {
  const fallo = errorDeGraphQL(json);
  if (fallo) return fallo;
  const cuenta = cuentaDe(json);
  if (!cuenta) return { ok: false, error: SIN_CUENTA };
  const filas = (cuenta.workersInvocationsScheduled ?? []) as { datetime?: string; status?: string }[];
  return {
    ok: true,
    corridas: filas.flatMap((f) => (f.datetime ? [{ datetime: f.datetime, status: f.status ?? "" }] : [])),
  };
}

/** Un día puede quedar partido entre dos tramos semanales: se suman. */
export function sumarPorFecha(listas: PorDia[]): PorDia {
  const porFecha = new Map<string, PorDia[number]>();
  for (const p of listas.flat()) {
    const previo = porFecha.get(p.fecha);
    porFecha.set(
      p.fecha,
      previo
        ? { fecha: p.fecha, visitas: previo.visitas + p.visitas, cpuMs: previo.cpuMs + p.cpuMs, errores: previo.errores + p.errores }
        : { ...p },
    );
  }
  return [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** El periodo de la suscripción de Workers Paid, o null si no se puede leer. */
export function leerSuscripciones(json: unknown): { inicio: Date; fin: Date } | null {
  const r = json as { success?: boolean; result?: unknown } | null;
  if (!r?.success || !Array.isArray(r.result)) return null;
  for (const s of r.result as {
    rate_plan?: { id?: string; public_name?: string };
    current_period_start?: string;
    current_period_end?: string;
  }[]) {
    const plan = `${s.rate_plan?.id ?? ""} ${s.rate_plan?.public_name ?? ""}`.toLowerCase();
    if (!plan.includes("worker") || !s.current_period_start || !s.current_period_end) continue;
    const inicio = new Date(s.current_period_start);
    const fin = new Date(s.current_period_end);
    if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime())) return { inicio, fin };
  }
  return null;
}

export function errorDeLibroClaro(status: number): string {
  // Las rutas del panel responden 404 sin el secreto correcto, como si no existieran.
  if (status === 404) return "LibroClaro respondió 404: revisa que PANEL_SECRET sea el mismo en los dos Workers";
  return `LibroClaro respondió ${status}`;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

const CONSULTA_INVOCACIONES = `query ($a: string, $s: Time, $e: Time) { viewer { accounts(filter: { accountTag: $a }) {
  workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: $s, datetime_lt: $e }) {
    sum { requests errors cpuTimeUs } dimensions { date } } } } }`;

const CONSULTA_CORRIDAS = `query ($a: string, $s: Time, $e: Time) { viewer { accounts(filter: { accountTag: $a }) {
  workersInvocationsScheduled(limit: 100, filter: { datetime_geq: $s, datetime_lt: $e, scriptName: "libroclaro" }, orderBy: [datetime_DESC]) {
    datetime status } } } }`;

async function graphql(env: Env, query: string, desde: Date, hasta: Date): Promise<unknown> {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { a: env.CLOUDFLARE_ACCOUNT_ID, s: desde.toISOString(), e: hasta.toISOString() },
    }),
    signal: AbortSignal.timeout(LIMITE_MS),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok && !errorDeGraphQL(json)) throw new Error(`respondió ${res.status}`);
  return json;
}

async function consultarCiclo(env: Env, ahora: Date): Promise<DatosCrudos["ciclo"]> {
  if (env.CLOUDFLARE_ANALYTICS_TOKEN) {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/subscriptions`, {
        headers: { authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}` },
        signal: AbortSignal.timeout(LIMITE_MS),
      });
      const periodo = leerSuscripciones(await res.json().catch(() => null));
      // Un periodo que no contiene a hoy (todavía no se renovó) no sirve: se estima.
      if (periodo && periodo.inicio <= ahora && ahora < periodo.fin) return { ...periodo, estimado: false };
    } catch {
      // Se estima con el día de corte.
    }
  }
  return { ...cicloDeCobro(ahora, CONFIG.cloudflare.diaDeCorte), estimado: true };
}

async function consultarCloudflare(env: Env, ciclo: DatosCrudos["ciclo"], ahora: Date): Promise<DatosCrudos["cloudflare"]> {
  if (!env.CLOUDFLARE_ANALYTICS_TOKEN) return { ok: false, error: "Falta CLOUDFLARE_ANALYTICS_TOKEN" };
  try {
    const tramos = tramosSemanales(ciclo.inicio, ahora);
    const leidas = (await Promise.all(tramos.map((t) => graphql(env, CONSULTA_INVOCACIONES, t.desde, t.hasta)))).map(
      leerInvocaciones,
    );
    const listas: PorDia[] = [];
    for (const l of leidas) {
      if (!l.ok) return l;
      listas.push(l.porDia);
    }
    return { ok: true, porDia: sumarPorFecha(listas) };
  } catch (e) {
    return { ok: false, error: `Cloudflare: ${mensaje(e)}` };
  }
}

async function consultarCron(env: Env, ahora: Date): Promise<DatosCrudos["cron"]> {
  if (!env.CLOUDFLARE_ANALYTICS_TOKEN) return { ok: false, error: "Falta CLOUDFLARE_ANALYTICS_TOKEN" };
  try {
    // La analítica no acepta más de una semana por consulta.
    return leerCorridas(await graphql(env, CONSULTA_CORRIDAS, new Date(ahora.getTime() - 7 * DIA_MS), ahora));
  } catch (e) {
    return { ok: false, error: `Cloudflare: ${mensaje(e)}` };
  }
}

/** Pide algo a LibroClaro con el secreto del panel: por service binding, o en local por LIBROCLARO_URL. */
export function llamarLibroClaro(env: Env, ruta: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-panel-secret", env.PANEL_SECRET ?? "");
  const pedido: RequestInit = { ...init, headers, signal: AbortSignal.timeout(LIMITE_MS) };
  return env.LIBROCLARO_URL
    ? fetch(env.LIBROCLARO_URL + ruta, pedido)
    : env.LIBROCLARO.fetch(new Request(`https://libroclaro.pe${ruta}`, pedido));
}

async function consultarLibroClaro(env: Env): Promise<DatosCrudos["libroclaro"]> {
  try {
    const res = await llamarLibroClaro(env, "/api/panel/resumen");
    if (res.status !== 200) return { ok: false, error: errorDeLibroClaro(res.status) };
    return { ok: true, datos: (await res.json()) as ResumenLibroClaro };
  } catch (e) {
    return { ok: false, error: `LibroClaro no respondió: ${mensaje(e)}` };
  }
}

/** Un pedido de prueba a un servicio externo, con su tiempo de respuesta. */
async function probar(url: string, sirve: (res: Response) => Promise<boolean>): Promise<Prueba> {
  const inicio = Date.now();
  try {
    const res = await fetch(url, { headers: { accept: "application/json, image/*" }, signal: AbortSignal.timeout(LIMITE_MS) });
    const ok = await sirve(res);
    const ms = Date.now() - inicio;
    return ok ? { ok: true, ms, error: null } : { ok: false, ms, error: `respondió ${res.status}` };
  } catch (e) {
    return { ok: false, ms: null, error: mensaje(e) };
  }
}

const probarRuc = () =>
  probar(`https://api.apis.net.pe/v1/ruc?numero=${RUC_DE_PRUEBA}`, async (res) => {
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as { razonSocial?: string; nombre?: string } | null;
    return Boolean(json?.razonSocial || json?.nombre);
  });

const probarQr = () =>
  probar("https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=libroclaro", async (res) => {
    await res.arrayBuffer();
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  });

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------

let guardado: { hasta: number; resumen: Resumen } | null = null;

/** Junta todas las fuentes y arma el resumen. Lo guarda 60 s salvo que se pida fresco. */
export async function obtenerResumen(env: Env, o: { fresco: boolean }, ahora = new Date()): Promise<Resumen> {
  if (!o.fresco && guardado && guardado.hasta > ahora.getTime()) return guardado.resumen;

  const ciclo = consultarCiclo(env, ahora);
  const [cicloListo, cloudflare, cron, libroclaro, ruc, qr] = await Promise.all([
    ciclo,
    ciclo.then((c) => consultarCloudflare(env, c, ahora)),
    consultarCron(env, ahora),
    consultarLibroClaro(env),
    probarRuc(),
    probarQr(),
  ]);

  const resumen = armarResumen({ ciclo: cicloListo, cloudflare, cron, libroclaro, ruc, qr }, ahora);
  guardado = { hasta: ahora.getTime() + 60_000, resumen };
  return resumen;
}
