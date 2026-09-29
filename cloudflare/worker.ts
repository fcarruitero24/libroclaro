/**
 * Punto de entrada del Worker. Las peticiones las atiende el handler que genera
 * OpenNext; aquí solo se añade el cron diario, que en Vercel vivía en
 * vercel.json, y la redirección al dominio principal. El cron llama a la misma
 * ruta /api/cron/reminders dentro del Worker, con el mismo CRON_SECRET, así que
 * la ruta no cambia.
 */

// @ts-expect-error: .open-next/worker.js se genera al hacer el build.
import { default as handler } from "../.open-next/worker.js";

type Env = { CRON_SECRET?: string };

interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}

const DOMINIO = "libroclaro.pe";

const worker = {
  /**
   * http:// y www. van a https://libroclaro.pe con la misma ruta. Una sola
   * dirección evita que la sesión quede partida entre www y el dominio (las
   * cookies son por nombre) y que Google vea el sitio duplicado. 308 y no 301:
   * conserva el método, así que un POST no se convierte en GET.
   */
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    const esDominio = url.hostname === DOMINIO || url.hostname === `www.${DOMINIO}`;
    if (esDominio && (url.hostname !== DOMINIO || url.protocol === "http:")) {
      url.hostname = DOMINIO;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 308);
    }
    return handler.fetch(request, env, ctx);
  },

  async scheduled(_controller: unknown, env: Env, ctx: Ctx) {
    const request = new Request("https://libroclaro.pe/api/cron/reminders", {
      headers: env.CRON_SECRET ? { authorization: `Bearer ${env.CRON_SECRET}` } : {},
    });
    ctx.waitUntil(
      handler.fetch(request, env, ctx).then(async (res: Response) => {
        console.log("[cron] /api/cron/reminders", res.status, await res.text());
      }),
    );
  },
};

export default worker;
