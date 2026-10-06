/**
 * Arma el resumen del panel a partir de lo que trajeron las fuentes: uso
 * frente al límite, ritmo, proyección, costo y estado de cada plataforma.
 * Función pura, probada en resumen.test.ts.
 */
import { fechaEnLima, type ResumenLibroClaro } from "../../src/lib/consumo.ts";
import { PLANS } from "../../src/lib/plans.ts";
import { alertasDelResumen } from "./alertas.ts";
import {
  DIA_MS,
  comisionMP,
  cuotaResendVigente,
  diaEnQueLlega,
  diasDelCron,
  estadoPorPorcentaje,
  extraCloudflareUsd,
  promedioReciente,
  proyectar,
  redondear2,
  ritmoDeLaBase,
  sumarDias,
} from "./calculos.ts";
import { CONFIG, NOMBRES } from "./config.ts";
import type { DatosCrudos, Estado, Medidor, Resumen, Unidad } from "./tipos.ts";

function medidor(
  usado: number,
  limite: number,
  unidad: Unidad,
  proyeccion: number | null = null,
  llegaEl: Date | null = null,
): Medidor {
  // usado × 100 / límite (y no usado / límite × 100) da porcentajes exactos: 85 y no 84,999…
  const pct = (usado * 100) / limite;
  return { usado, limite, unidad, pct, estado: estadoPorPorcentaje(pct), proyeccion, llegaEl: llegaEl?.toISOString() ?? null };
}

/** Si LibroClaro no respondió, cada una de sus partes lleva el mismo error. */
function todoConError(error: string): ResumenLibroClaro {
  const e = { error };
  return { supabase: e, resend: e, recordatorios: e, mercado_pago: e, alertas_del_mes: e };
}

function seccionCloudflare(d: DatosCrudos, ahora: Date): Resumen["cloudflare"] {
  if (!d.cloudflare.ok) return { ok: false, error: d.cloudflare.error };
  const { inicio, fin, estimado } = d.ciclo;
  const hoy = ahora.toISOString().slice(0, 10);

  // Los días sin visitas no vienen en la consulta: van en cero.
  const porFecha = new Map(d.cloudflare.porDia.map((p) => [p.fecha, p]));
  const dias: { fecha: string; visitas: number; cpuMs: number; errores: number }[] = [];
  for (let f = inicio.toISOString().slice(0, 10); f <= hoy; f = sumarDias(f, 1)) {
    dias.push(porFecha.get(f) ?? { fecha: f, visitas: 0, cpuMs: 0, errores: 0 });
  }

  const suma = (campo: "visitas" | "cpuMs" | "errores") => dias.reduce((s, p) => s + p[campo], 0);
  const visitas = suma("visitas");
  const cpuMs = suma("cpuMs");
  const ritmoVisitas = promedioReciente(dias.map((p) => ({ fecha: p.fecha, valor: p.visitas })), hoy);
  const ritmoCpu = promedioReciente(dias.map((p) => ({ fecha: p.fecha, valor: p.cpuMs })), hoy);
  const c = CONFIG.cloudflare;

  return {
    ok: true,
    ciclo: {
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      dia: Math.floor((ahora.getTime() - inicio.getTime()) / DIA_MS) + 1,
      dias: Math.round((fin.getTime() - inicio.getTime()) / DIA_MS),
      estimado,
    },
    visitas: medidor(
      visitas,
      c.visitas,
      "visitas",
      proyectar(visitas, ritmoVisitas, ahora, fin),
      diaEnQueLlega(visitas, c.visitas, ritmoVisitas, ahora, fin),
    ),
    cpu: medidor(cpuMs, c.cpuMs, "ms", proyectar(cpuMs, ritmoCpu, ahora, fin), diaEnQueLlega(cpuMs, c.cpuMs, ritmoCpu, ahora, fin)),
    errores: suma("errores"),
    extraUsd: extraCloudflareUsd(visitas, cpuMs),
    porDia: dias.map((p) => ({ fecha: p.fecha, visitas: p.visitas })),
  };
}

function seccionSupabase(s: ResumenLibroClaro["supabase"], ahora: Date): Resumen["supabase"] {
  if ("error" in s) return { ok: false, error: s.error };
  const c = CONFIG.supabase;
  // No tiene ciclo: la fecha de llegada se busca hasta un año adelante.
  const ritmo = ritmoDeLaBase(s.diario, fechaEnLima(ahora));
  const enUnAnio = new Date(ahora.getTime() + 365 * DIA_MS);
  return {
    ok: true,
    base: medidor(s.base_bytes, c.baseBytes, "bytes", null, diaEnQueLlega(s.base_bytes, c.baseBytes, ritmo, ahora, enUnAnio)),
    archivos: medidor(s.archivos_bytes, c.archivosBytes, "bytes"),
    usuarios: medidor(s.usuarios_activos_30d, c.usuariosActivos, "usuarios"),
    negocios: s.negocios,
    reclamos: s.reclamos,
    ritmoBytesDia: ritmo,
  };
}

function seccionResend(r: ResumenLibroClaro["resend"], ahora: Date): Resumen["resend"] {
  if (r !== null && "error" in r) return { ok: false, error: r.error };
  const vigente = cuotaResendVigente(r, ahora);
  if (r === null || vigente === null) return { ok: true, dia: null, mes: null, ultimoEnvio: null };

  // Resend cuenta por mes calendario en UTC: proyección lineal según el día del mes.
  const anio = ahora.getUTCFullYear();
  const mes = ahora.getUTCMonth();
  const diaDelMes = ahora.getUTCDate();
  const diasDelMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const finDeMes = new Date(Date.UTC(anio, mes + 1, 1));
  const c = CONFIG.resend;
  const ritmoMes = vigente.mes === null ? null : vigente.mes / diaDelMes;

  return {
    ok: true,
    dia: vigente.dia === null ? null : medidor(vigente.dia, c.dia, "correos"),
    mes:
      vigente.mes === null
        ? null
        : medidor(
            vigente.mes,
            c.mes,
            "correos",
            (vigente.mes / diaDelMes) * diasDelMes,
            diaEnQueLlega(vigente.mes, c.mes, ritmoMes, ahora, finDeMes),
          ),
    ultimoEnvio: new Date(r.fecha).toISOString(),
  };
}

function seccionMercadoPago(lc: ResumenLibroClaro): Resumen["mercadoPago"] {
  const mp = lc.mercado_pago;
  if ("error" in mp) return { ok: false, error: mp.error };
  const fila = (plan: string, precio: number) => ({ plan, precio, ...comisionMP(precio) });
  return {
    ok: true,
    suscripcionesActivas: "error" in lc.supabase ? null : lc.supabase.suscripciones_activas,
    cobrado: mp.cobrado,
    comisiones: mp.comisiones,
    pagos: mp.pagos,
    tabla: [
      fila(`${PLANS.pro.name} mensual`, PLANS.pro.priceMonthly),
      fila(`${PLANS.pro.name} anual`, PLANS.pro.priceYearly),
      fila(`${PLANS.business.name} mensual`, PLANS.business.priceMonthly),
      fila(`${PLANS.business.name} anual`, PLANS.business.priceYearly),
    ],
  };
}

function seccionRecordatorios(
  rec: ResumenLibroClaro["recordatorios"],
  cron: DatosCrudos["cron"],
  ahora: Date,
): Resumen["recordatorios"] {
  // La corrida también tiene un campo error (null si salió bien): el fallo de
  // LibroClaro se reconoce porque no trae hora.
  if (rec !== null && !("hora" in rec)) return { ok: false, error: rec.error };
  return { ok: true, ultima: rec, dias: cron.ok ? diasDelCron(cron.corridas, ahora) : [] };
}

function seccionAlertasDelMes(a: ResumenLibroClaro["alertas_del_mes"]): Resumen["alertasDelMes"] {
  if (!Array.isArray(a)) return { ok: false, error: a.error };
  return { ok: true, lista: a.map((x) => ({ texto: x.texto, enviadaEl: new Date(x.enviada_el).toISOString() })) };
}

const GRAVEDAD: Estado[] = ["ok", "atencion", "limite"];

export function armarResumen(d: DatosCrudos, ahora: Date): Resumen {
  const lc = d.libroclaro.ok ? d.libroclaro.datos : todoConError(d.libroclaro.error);

  const cloudflare = seccionCloudflare(d, ahora);
  const supabase = seccionSupabase(lc.supabase, ahora);
  const resend = seccionResend(lc.resend, ahora);
  const mercadoPago = seccionMercadoPago(lc);
  const recordatorios = seccionRecordatorios(lc.recordatorios, d.cron, ahora);

  const medidores: { clave: keyof typeof NOMBRES; m: Medidor }[] = [];
  if (cloudflare.ok) {
    medidores.push({ clave: "cloudflare.visitas", m: cloudflare.visitas }, { clave: "cloudflare.cpu", m: cloudflare.cpu });
  }
  if (supabase.ok) {
    medidores.push(
      { clave: "supabase.base", m: supabase.base },
      { clave: "supabase.archivos", m: supabase.archivos },
      { clave: "supabase.usuarios", m: supabase.usuarios },
    );
  }
  if (resend.ok) {
    if (resend.dia) medidores.push({ clave: "resend.dia", m: resend.dia });
    if (resend.mes) medidores.push({ clave: "resend.mes", m: resend.mes });
  }

  const estado = medidores.reduce<Estado>(
    (peor, { m }) => (GRAVEDAD.indexOf(m.estado) > GRAVEDAD.indexOf(peor) ? m.estado : peor),
    "ok",
  );
  const masAlto = medidores.reduce<(typeof medidores)[number] | null>(
    (max, x) => (max === null || x.m.pct > max.m.pct ? x : max),
    null,
  );
  const usd = redondear2(CONFIG.cloudflare.usdMes + (cloudflare.ok ? cloudflare.extraUsd : 0));

  const fuentes: [string, { ok: boolean }][] = [
    ["Cloudflare", cloudflare],
    ["Supabase", supabase],
    ["Resend", resend],
    ["Mercado Pago", mercadoPago],
    ["Recordatorios", recordatorios],
  ];

  const resumen: Resumen = {
    generado: ahora.toISOString(),
    estado,
    fuentesConError: fuentes.filter(([, f]) => !f.ok).map(([nombre]) => nombre),
    gasto: { usd, soles: redondear2(usd * CONFIG.tipoDeCambio) },
    masCercano: masAlto ? { nombre: NOMBRES[masAlto.clave], medidor: masAlto.m } : null,
    proximoCobro: { fecha: d.ciclo.fin.toISOString(), usd },
    cloudflare,
    supabase,
    resend,
    mercadoPago,
    servicios: { ruc: d.ruc, qr: d.qr },
    recordatorios,
    alertas: [],
    alertasDelMes: seccionAlertasDelMes(lc.alertas_del_mes),
    config: CONFIG,
  };
  resumen.alertas = alertasDelResumen(resumen, ahora);
  return resumen;
}
