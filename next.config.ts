import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// En `next dev`, getCloudflareContext() entrega los bindings de
// wrangler.dev.jsonc (hoy solo Workers AI, para LibIA; ver ese archivo). Solo
// en desarrollo: en `next build` arrancaría también el proxy remoto de
// Workers AI, que pide la sesión de wrangler. Sin sesión válida (el token dura
// 1 h) la conexión falla: se avisa y el servidor sigue, sin LibIA, en vez de
// caerse por un rechazo sin manejar.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev({ configPath: "wrangler.dev.jsonc" }).catch((e: unknown) => {
    const motivo = e instanceof Error ? e.message.split("\n")[0] : String(e);
    console.warn(`[libia] LibIA no está disponible en desarrollo (para usarla: npx wrangler login). ${motivo}`);
  });
}

const nextConfig: NextConfig = {
  experimental: {
    // Next 16.2+ trae esta opción prendida por defecto, y OpenNext 1.20.6
    // (@opennextjs/aws 4.1.4) responde a la precarga del "árbol" de una página
    // estática (hoy /registro) con la página completa: el navegador la descarta
    // y la vuelve a pedir sin fin (~4 por segundo), y la regla de límite de
    // Cloudflare termina bloqueando a visitantes reales. Apagada, Next vuelve al
    // formato de precarga que esa versión de OpenNext sí sirve bien. Se puede
    // quitar al pasar a @opennextjs/cloudflare 1.20.7+ (aws 4.1.6, que lo
    // corrige), que a su vez pide Next 16.3.6+.
    prefetchInlining: false,
  },
};

export default nextConfig;
