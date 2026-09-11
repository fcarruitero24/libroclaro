import { NextResponse, type NextRequest } from "next/server";
import { direccionCompleta, lookupRuc } from "@/lib/ruc";

/**
 * Consulta pública de RUC para el formulario de registro.
 *
 * Va por el servidor y no directo desde el navegador para no exponer
 * el servicio externo, poder cachear y poner un límite por IP: el
 * padrón de SUNAT se consulta con un servicio gratuito y limitado.
 */

const porIp = new Map<string, { conteo: number; hasta: number }>();
const VENTANA_MS = 60_000;
const MAX_POR_MINUTO = 20;

function excedeLimite(ip: string): boolean {
  const ahora = Date.now();
  const actual = porIp.get(ip);
  if (!actual || actual.hasta < ahora) {
    porIp.set(ip, { conteo: 1, hasta: ahora + VENTANA_MS });
    return false;
  }
  actual.conteo += 1;
  if (porIp.size > 1000) {
    for (const [k, v] of porIp) if (v.hasta < ahora) porIp.delete(k);
  }
  return actual.conteo > MAX_POR_MINUTO;
}

export async function GET(request: NextRequest) {
  const numero = request.nextUrl.searchParams.get("numero") ?? "";
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "desconocida";

  if (excedeLimite(ip)) {
    return NextResponse.json(
      { ok: false, reason: "limite", mensaje: "Demasiadas consultas. Espera un momento." },
      { status: 429 },
    );
  }

  const r = await lookupRuc(numero);

  if (!r.ok) {
    const mensajes = {
      formato: "El RUC debe tener 11 dígitos y empezar en 10, 15, 16, 17 o 20.",
      no_encontrado: "No encontramos ese RUC en SUNAT. Revisa el número.",
      servicio: "No pudimos consultar SUNAT ahora. Puedes escribir los datos a mano.",
    } as const;
    return NextResponse.json({ ok: false, reason: r.reason, mensaje: mensajes[r.reason] });
  }

  return NextResponse.json({
    ok: true,
    razonSocial: r.data.razonSocial,
    direccion: direccionCompleta(r.data),
    estado: r.data.estado,
    condicion: r.data.condicion,
    activo: (r.data.estado ?? "").toUpperCase().startsWith("ACTIVO"),
  });
}
