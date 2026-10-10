// Bindings del Worker que usa el código de la app. Los de OpenNext (ASSETS,
// WORKER_SELF_REFERENCE…) ya los declara @opennextjs/cloudflare; esta
// interfaz se suma a la suya.
interface CloudflareEnv {
  /** Workers AI: lo usa LibIA (src/lib/actions/libia.ts). */
  AI: { run(modelo: string, entrada: Record<string, unknown>): Promise<unknown> };
}
