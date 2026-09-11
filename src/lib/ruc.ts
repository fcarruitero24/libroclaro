/**
 * Consulta de RUC en el padrón de SUNAT.
 *
 * Sirve para dos cosas:
 *  1. Autocompletar la razón social y la dirección al registrarse.
 *  2. Confirmar que el RUC existe y está activo, para que nadie registre
 *     un número inventado o escriba un nombre que no corresponde.
 *
 * Lo que NO hace, y conviene tener claro: no prueba que quien registra
 * sea el dueño de ese RUC. Eso solo lo podría confirmar SUNAT con la
 * Clave SOL del contribuyente. Ningún competidor peruano lo verifica.
 * La defensa práctica es fijar la razón social al valor oficial, dejar
 * la declaración firmada del usuario y guardar el rastro de auditoría.
 */

export interface RucInfo {
  ruc: string;
  razonSocial: string;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  /** ACTIVO, BAJA DE OFICIO, SUSPENSION TEMPORAL… */
  estado: string | null;
  /** HABIDO, NO HABIDO… */
  condicion: string | null;
}

export type RucLookup =
  | { ok: true; data: RucInfo }
  | { ok: false; reason: "formato" | "no_encontrado" | "servicio" };

export function isValidRucFormat(ruc: string): boolean {
  return /^(10|15|16|17|20)\d{9}$/.test(ruc);
}

interface ApisNetPeV1 {
  nombre?: string;
  razonSocial?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  estado?: string;
  condicion?: string;
}

function limpiar(v: string | undefined | null): string | null {
  const s = (v ?? "").replace(/\s+/g, " ").trim();
  return s.length > 0 && s !== "-" ? s : null;
}

/** Caché en memoria. Reduce llamadas al servicio, que es gratuito y limitado. */
const cache = new Map<string, { hasta: number; valor: RucLookup }>();
const TTL_MS = 12 * 60 * 60 * 1000;

export async function lookupRuc(rucRaw: string): Promise<RucLookup> {
  const ruc = (rucRaw ?? "").replace(/\D/g, "");
  if (!isValidRucFormat(ruc)) return { ok: false, reason: "formato" };

  const enCache = cache.get(ruc);
  if (enCache && enCache.hasta > Date.now()) return enCache.valor;

  const base = process.env.RUC_API_URL ?? "https://api.apis.net.pe/v1/ruc";
  const token = process.env.RUC_API_TOKEN;

  let resultado: RucLookup;
  try {
    const res = await fetch(`${base}?numero=${ruc}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404 || res.status === 422) {
      resultado = { ok: false, reason: "no_encontrado" };
    } else if (!res.ok) {
      resultado = { ok: false, reason: "servicio" };
    } else {
      const json = (await res.json()) as ApisNetPeV1;
      const razonSocial = limpiar(json.razonSocial ?? json.nombre);
      resultado = razonSocial
        ? {
            ok: true,
            data: {
              ruc,
              razonSocial,
              direccion: limpiar(json.direccion),
              distrito: limpiar(json.distrito),
              provincia: limpiar(json.provincia),
              departamento: limpiar(json.departamento),
              estado: limpiar(json.estado),
              condicion: limpiar(json.condicion),
            },
          }
        : { ok: false, reason: "no_encontrado" };
    }
  } catch {
    // Timeout o servicio caído: el registro sigue, solo que sin autocompletar.
    resultado = { ok: false, reason: "servicio" };
  }

  // Los fallos de servicio se cachean poco, para reintentar pronto.
  cache.set(ruc, {
    hasta: Date.now() + (resultado.ok ? TTL_MS : 60_000),
    valor: resultado,
  });
  if (cache.size > 500) {
    for (const [k, v] of cache) if (v.hasta < Date.now()) cache.delete(k);
  }
  return resultado;
}

/** Arma una dirección legible a partir de lo que devuelve SUNAT. */
export function direccionCompleta(info: RucInfo): string {
  const partes = [info.direccion, info.distrito, info.provincia].filter(Boolean);
  return partes.join(", ");
}
