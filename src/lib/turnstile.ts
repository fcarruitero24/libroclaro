/**
 * Cloudflare Turnstile: comprueba en el servidor que quien envía el formulario
 * no es un bot. Gratis y sin límite de verificaciones.
 *
 * Sin TURNSTILE_SECRET_KEY no se verifica nada: así funcionan el desarrollo
 * local y Vercel, que no tienen la clave. En producción es un secreto del
 * Worker de Cloudflare, junto con NEXT_PUBLIC_TURNSTILE_SITE_KEY en el build.
 */

export const TEXTO_TURNSTILE =
  "No pudimos confirmar que no eres un robot. Espera unos segundos y vuelve a intentarlo.";

/**
 * IP del visitante. Detrás de Cloudflare vale cf-connecting-ip, que pone
 * Cloudflare y el visitante no puede falsear. x-forwarded-for sí se puede
 * falsear ahí (Cloudflare agrega la IP real al final de lo que mande el
 * cliente), así que solo se usa como respaldo, como en Vercel.
 */
export function ipDelCliente(h: Headers): string | null {
  return (
    h.get("cf-connecting-ip") ||
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    null
  );
}

export async function verificarTurnstile(formData: FormData, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  const token = String(formData.get("cf-turnstile-response") ?? "");
  if (!token) return false;

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("[turnstile] rechazado:", data["error-codes"]);
    return data.success === true;
  } catch (err) {
    // Si Cloudflare no responde, se deja pasar: un consumidor tiene derecho a
    // registrar su reclamo, y un bot no puede provocar esta falla a voluntad.
    console.error("[turnstile] no se pudo verificar:", err);
    return true;
  }
}
