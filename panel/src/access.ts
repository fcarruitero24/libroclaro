/**
 * Cloudflare Access protege panel.libroclaro.pe: solo entra quien recibe el
 * código en el correo autorizado. Además, el Worker verifica en cada pedido el
 * token que Access agrega (cabecera Cf-Access-Jwt-Assertion): si alguien
 * llegara al Worker sin pasar por Access (una app de Access borrada o mal
 * configurada), no ve nada.
 */

type Resultado = { ok: true; email: string } | { ok: false; motivo: string };

const RSA_SHA256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

const bytes = (base64url: string) =>
  Uint8Array.from(atob(base64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const leerJson = (base64url: string): unknown => JSON.parse(new TextDecoder().decode(bytes(base64url)));

/**
 * Verifica firma (RS256, con las llaves que publica Access), audiencia (la de
 * esta aplicación), emisor (este equipo) y vencimiento. Nunca lanza.
 */
export async function verificarAccess(
  token: string | null,
  o: { equipo: string; aud: string; llaves: () => Promise<JsonWebKey[]>; ahora?: number },
): Promise<Resultado> {
  if (!o.equipo || !o.aud) return { ok: false, motivo: "Access sin configurar" };
  if (!token) return { ok: false, motivo: "sin token" };
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return { ok: false, motivo: "token mal formado" };
    const [cabecera, cuerpo, firma] = partes;

    const { alg, kid } = leerJson(cabecera) as { alg?: string; kid?: string };
    if (alg !== "RS256") return { ok: false, motivo: "algoritmo no permitido" };
    const llave = (await o.llaves()).find((k) => (k as JsonWebKey & { kid?: string }).kid === kid);
    if (!llave) return { ok: false, motivo: "llave desconocida" };

    const publica = await crypto.subtle.importKey("jwk", llave, RSA_SHA256, false, ["verify"]);
    const firmaValida = await crypto.subtle.verify(
      RSA_SHA256,
      publica,
      bytes(firma),
      new TextEncoder().encode(`${cabecera}.${cuerpo}`),
    );
    if (!firmaValida) return { ok: false, motivo: "firma inválida" };

    const datos = leerJson(cuerpo) as { aud?: string | string[]; iss?: string; exp?: number; email?: string };
    const audiencias = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
    if (!audiencias.includes(o.aud)) return { ok: false, motivo: "es de otra aplicación" };
    if (datos.iss !== `https://${o.equipo}`) return { ok: false, motivo: "es de otro equipo" };
    if (typeof datos.exp !== "number" || datos.exp * 1000 <= (o.ahora ?? Date.now())) {
      return { ok: false, motivo: "vencido" };
    }
    return { ok: true, email: datos.email ?? "" };
  } catch {
    return { ok: false, motivo: "token inválido" };
  }
}

let llavesGuardadas: { equipo: string; hasta: number; llaves: JsonWebKey[] } | null = null;

/**
 * Llaves públicas con las que Access firma sus tokens. Se guardan una hora:
 * Access las rota cada pocas semanas y publica la nueva antes de usarla.
 */
export async function llavesDeAccess(equipo: string): Promise<JsonWebKey[]> {
  if (llavesGuardadas && llavesGuardadas.equipo === equipo && llavesGuardadas.hasta > Date.now()) {
    return llavesGuardadas.llaves;
  }
  const res = await fetch(`https://${equipo}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Access respondió ${res.status} al pedir sus llaves`);
  const { keys } = (await res.json()) as { keys?: JsonWebKey[] };
  llavesGuardadas = { equipo, hasta: Date.now() + 60 * 60 * 1000, llaves: keys ?? [] };
  return llavesGuardadas.llaves;
}
