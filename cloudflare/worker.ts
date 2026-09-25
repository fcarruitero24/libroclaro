/**
 * Punto de entrada del Worker. Las peticiones las atiende el handler que genera
 * OpenNext; aquí solo se añade el cron diario, que en Vercel vivía en
 * vercel.json. El cron llama a la misma ruta /api/cron/reminders dentro del
 * Worker, con el mismo CRON_SECRET, así que la ruta no cambia.
 */

// @ts-expect-error: .open-next/worker.js se genera al hacer el build.
import { default as handler } from "../.open-next/worker.js";

type Env = { CRON_SECRET?: string };

interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}

const worker = {
  fetch: handler.fetch,

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
