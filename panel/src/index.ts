/**
 * Worker del panel de consumo (panel.libroclaro.pe).
 *
 * - Todo pedido pasa primero por la verificación del token de Cloudflare
 *   Access (también la página: ver run_worker_first en wrangler.jsonc).
 * - GET /api/resumen junta las fuentes y devuelve el resumen; la página lo pide
 *   al abrirse, con "Actualizar" y cada 5 minutos.
 * - Cada hora arma el resumen y pide a LibroClaro mandar las alertas nuevas.
 */
import { llavesDeAccess, verificarAccess } from "./access.ts";
import { llamarLibroClaro, obtenerResumen, type Env } from "./fuentes.ts";

interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; " +
  "frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

function conCabecerasDeSeguridad(res: Response): Response {
  const copia = new Response(res.body, res);
  copia.headers.set("Content-Security-Policy", CSP);
  copia.headers.set("X-Content-Type-Options", "nosniff");
  copia.headers.set("Referrer-Policy", "no-referrer");
  return copia;
}

async function revisarAlertas(env: Env): Promise<void> {
  const { alertas } = await obtenerResumen(env, { fresco: true });
  if (alertas.length === 0) {
    console.log("[alertas] sin alertas");
    return;
  }
  try {
    const res = await llamarLibroClaro(env, "/api/panel/alertas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alertas }),
    });
    // Si no salieron, LibroClaro no las marca y se reintentan en la hora siguiente.
    console.log("[alertas]", res.status, await res.text());
  } catch (e) {
    console.error("[alertas] LibroClaro no respondió", e);
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    // PANEL_SIN_ACCESS solo existe en panel/.dev.vars, para probar en local.
    if (env.PANEL_SIN_ACCESS !== "1") {
      const acceso = await verificarAccess(request.headers.get("cf-access-jwt-assertion"), {
        equipo: env.ACCESS_EQUIPO ?? "",
        aud: env.ACCESS_AUD ?? "",
        llaves: () => llavesDeAccess(env.ACCESS_EQUIPO ?? ""),
      });
      if (!acceso.ok) {
        return new Response("Acceso denegado", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
    }

    const url = new URL(request.url);
    if (url.pathname === "/api/resumen") {
      if (request.method !== "GET") return new Response(null, { status: 405, headers: { allow: "GET" } });
      const resumen = await obtenerResumen(env, { fresco: url.searchParams.has("fresco") });
      return Response.json(resumen, { headers: { "cache-control": "no-store" } });
    }
    return conCabecerasDeSeguridad(await env.ASSETS.fetch(request));
  },

  async scheduled(_controlador: unknown, env: Env, ctx: Ctx): Promise<void> {
    ctx.waitUntil(revisarAlertas(env));
  },
};

export default worker;
