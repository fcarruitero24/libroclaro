import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Las páginas estáticas (inicio, términos, privacidad) se sirven tal como
// salieron del build desde los assets del Worker. No usamos revalidación por
// tiempo, así que no hace falta R2 (que pide tarjeta aunque sea gratis).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
