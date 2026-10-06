/*
 * Panel de consumo: pide /api/resumen y dibuja cada parte. Todo se arma con
 * createElement y textContent: la CSP no permite estilos ni scripts en línea,
 * y así ningún dato llega a interpretarse como HTML.
 *
 * Se actualiza al abrir, con "Actualizar" (sin caché) y cada 5 minutos
 * mientras la pestaña está a la vista. Si una actualización falla, se quedan
 * los datos anteriores con su antigüedad.
 */
(function () {
  "use strict";

  const CINCO_MIN = 5 * 60 * 1000;
  const DIEZ_MIN = 10 * 60 * 1000;
  const KB = 1024;
  const MB = 1024 ** 2;
  const GB = 1024 ** 3;
  const SVG = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------------ formato

  const numero = (n, max = 0, min = 0) =>
    new Intl.NumberFormat("es-PE", { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
  const dinero = (n) => numero(n, 2, 2);

  function porcentaje(p) {
    if (p === 0) return "0 %";
    const decimales = p >= 10 ? 0 : p >= 1 ? 1 : p >= 0.1 ? 2 : 3;
    const texto = numero(p, decimales);
    return texto === "0" ? "< 0.001 %" : `${texto} %`;
  }

  function cantidad(valor, unidad) {
    if (unidad === "ms") return `${numero(valor / 1000)} s`;
    if (unidad === "bytes") {
      if (valor >= GB) return `${numero(valor / GB, 1)} GB`;
      if (valor >= MB) return `${numero(valor / MB, 1)} MB`;
      if (valor >= KB) return `${numero(valor / KB, 1)} KB`;
      return `${numero(valor)} B`;
    }
    return numero(valor);
  }

  const formato = (opciones) => new Intl.DateTimeFormat("es-PE", opciones);
  // Los límites del ciclo son medianoche UTC: se muestran en UTC para no correrse un día.
  const diaUtc = (iso) => formato({ day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(iso));
  const diaLima = (iso) => formato({ day: "numeric", month: "long", timeZone: "America/Lima" }).format(new Date(iso));
  const horaLima = (ms) => formato({ hour: "numeric", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(ms));
  const fechaHoraLima = (iso) =>
    formato({ day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(iso));
  const diaCorto = (fecha) => formato({ day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`));

  function hace(iso) {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "hace unos segundos";
    if (min < 60) return `hace ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
  }

  // ---------------------------------------------------------------------- DOM

  function el(etiqueta, clase, ...hijos) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    for (const h of hijos) if (h !== null && h !== undefined && h !== false && h !== "") nodo.append(h);
    return nodo;
  }

  function svg(etiqueta, atributos, texto) {
    const nodo = document.createElementNS(SVG, etiqueta);
    for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, String(v));
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }

  const ETIQUETA_ESTADO = { ok: "En orden", atencion: "Atención", limite: "Al límite" };
  const GRAVEDAD = ["ok", "atencion", "limite"];
  const peor = (estados) => estados.reduce((a, b) => (GRAVEDAD.indexOf(b) > GRAVEDAD.indexOf(a) ? b : a), "ok");
  const chipEstado = (estado) => el("span", `chip ${estado}`, ETIQUETA_ESTADO[estado]);
  const chipSinDatos = () => el("span", "chip limite", "Sin datos");

  const cabecera = (titulo, plan, chip) =>
    el("header", null, el("h2", null, titulo), el("div", "etiquetas", el("span", "plan", plan), chip));
  const errorDeFuente = (error) => el("p", "error-fuente", `No se pudo consultar: ${error}`);
  const lineaPie = (rotulo, ...valor) => el("div", "linea", el("span", null, rotulo), el("span", null, ...valor));

  function terminar(tarjeta, ...hijos) {
    tarjeta.replaceChildren(...hijos.filter(Boolean));
    tarjeta.removeAttribute("aria-busy");
  }

  function dato(rotulo, valor, detalle, numerico) {
    return el(
      "div",
      "dato",
      el("span", "rotulo", rotulo),
      el("span", numerico ? "valor num" : "valor", ...valor),
      el("span", "detalle", detalle),
    );
  }

  // ---------------------------------------------------------------- medidores

  function medidor(titulo, m, nota) {
    const relleno = el("span", `relleno ${m.estado}`);
    relleno.style.width = `${Math.min(m.pct, 100)}%`;
    const pista = el("div", "pista", relleno);
    let descripcion = `${porcentaje(m.pct)} usado`;
    if (m.proyeccion !== null) {
      const alCierre = (m.proyeccion / m.limite) * 100;
      const raya = el("span", "proyeccion");
      raya.style.left = `${Math.min(alCierre, 100)}%`;
      pista.append(raya);
      descripcion += `; al cierre se estima ${porcentaje(alCierre)}`;
    }
    pista.setAttribute("role", "img");
    pista.setAttribute("aria-label", descripcion);
    return el(
      "div",
      "medidor",
      el(
        "div",
        "fila",
        el("span", "que", titulo),
        el("span", "cuanto", `${cantidad(m.usado, m.unidad)} `, el("small", null, `de ${cantidad(m.limite, m.unidad)}`), ` · ${porcentaje(m.pct)}`),
      ),
      pista,
      nota ? el("p", "nota", nota) : null,
    );
  }

  function notaDeRitmo(m, periodo, sinRitmo) {
    if (m.pct >= 100) return "Ya llegó al límite.";
    if (m.llegaEl) return `A este ritmo llegaría al límite el ${diaLima(m.llegaEl)}.`;
    if (m.proyeccion !== null) return `A este ritmo cierras ${periodo} en ~${cantidad(m.proyeccion, m.unidad)}: no llega al límite.`;
    return sinRitmo;
  }

  // ------------------------------------------------------------------ resumen

  function pintarResumen(r) {
    const textos = {
      ok: ["Todo en orden", "Nada pasa del 80 % de su límite."],
      atencion: ["Atención", "Algo pasa del 80 % de su límite."],
      limite: ["Límite alcanzado", "Algo llegó al 100 % de su límite."],
    };
    // Con una fuente caída no se puede decir "todo en orden": lo que no se ve podría estar al límite.
    const incompleto = r.estado === "ok" && r.fuentesConError.length > 0;
    const [titulo, detalle] = incompleto
      ? ["Datos incompletos", "Lo que sí respondió está bajo el 80 % de su límite."]
      : textos[r.estado];
    const tono = incompleto ? "atencion" : r.estado;
    const sinRespuesta = r.fuentesConError.length ? ` No respondió: ${r.fuentesConError.join(", ")}.` : "";
    const icono = svg("svg", {
      width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
    });
    icono.append(svg("path", { d: tono === "ok" ? "m5 12.5 4.5 4.5L19 7.5" : "M12 6v8m0 4h.01" }));
    const estado = dato("Estado general", [icono, titulo], detalle + sinRespuesta);
    estado.classList.add("estado", tono);

    const cf = r.cloudflare.ok ? r.cloudflare : null;
    const extra = cf ? cf.extraUsd : 0;
    const gasto = dato(
      "Gasto de este mes",
      [`US$ ${dinero(r.gasto.usd)}`],
      `≈ S/ ${dinero(r.gasto.soles)} · ${extra > 0 ? `incluye US$ ${dinero(extra)} extra de Cloudflare` : "solo el plan fijo de Cloudflare"}`,
      true,
    );

    const mc = r.masCercano;
    const cercano = mc
      ? dato(
          "Lo más cerca de su límite",
          [porcentaje(mc.medidor.pct)],
          `${mc.nombre} (${cantidad(mc.medidor.usado, mc.medidor.unidad)} de ${cantidad(mc.medidor.limite, mc.medidor.unidad)})`,
          true,
        )
      : dato("Lo más cerca de su límite", ["—"], "Todavía no hay datos de uso.");

    const estimado = cf && cf.ciclo.estimado ? " · fecha estimada" : "";
    const cobro = dato("Próximo cobro", [diaUtc(r.proximoCobro.fecha)], `Cloudflare Workers Paid · US$ ${dinero(r.proximoCobro.usd)}${estimado}`);

    document.getElementById("resumen").replaceChildren(estado, gasto, cercano, cobro);
  }

  // ---------------------------------------------------------------- Cloudflare

  function grafico(porDia) {
    const izquierda = 8, derecha = 308, arriba = 16, abajo = 66;
    const n = porDia.length;
    const maximo = Math.max(1, ...porDia.map((p) => p.visitas));
    const x = (i) => (n === 1 ? (izquierda + derecha) / 2 : izquierda + (i * (derecha - izquierda)) / (n - 1));
    const y = (v) => abajo - (v / maximo) * (abajo - arriba);
    const fuente = { "font-family": "IBM Plex Mono, monospace", "font-size": 9, fill: "var(--suave)" };

    const lienzo = svg("svg", { viewBox: "0 0 320 78", role: "img" });
    lienzo.append(svg("line", { x1: 0, y1: abajo, x2: 320, y2: abajo, stroke: "var(--linea)", "stroke-width": 1 }));
    if (n > 0) {
      const puntos = porDia.map((p, i) => `${x(i).toFixed(1)} ${y(p.visitas).toFixed(1)}`);
      if (n > 1) {
        lienzo.append(
          svg("path", { d: `M${puntos.join(" L")} L${x(n - 1).toFixed(1)} ${abajo} L${x(0).toFixed(1)} ${abajo} Z`, fill: "var(--teal-tenue)" }),
          svg("path", { d: `M${puntos.join(" L")}`, fill: "none", stroke: "var(--teal)", "stroke-width": 2, "stroke-linejoin": "round" }),
        );
      }
      const iMaximo = porDia.findIndex((p) => p.visitas === maximo);
      const hoy = porDia[n - 1];
      if (iMaximo >= 0 && iMaximo !== n - 1) {
        const enLaIzquierda = x(iMaximo) < 160;
        lienzo.append(
          svg("circle", { cx: x(iMaximo), cy: y(maximo), r: 3, fill: "var(--teal)" }),
          svg(
            "text",
            { ...fuente, x: enLaIzquierda ? x(iMaximo) + 7 : x(iMaximo) - 7, y: y(maximo) + 4, "text-anchor": enLaIzquierda ? "start" : "end" },
            `${numero(maximo)} · máximo`,
          ),
        );
      }
      const yHoy = y(hoy.visitas);
      lienzo.append(
        svg("circle", { cx: x(n - 1), cy: yHoy, r: 4, fill: "var(--teal)", stroke: "var(--papel)", "stroke-width": 2 }),
        svg("text", { ...fuente, x: 312, y: yHoy - 8 < 10 ? yHoy + 14 : yHoy - 8, "text-anchor": "end" }, `hoy ${numero(hoy.visitas)}`),
      );
      lienzo.setAttribute(
        "aria-label",
        `Visitas por día desde el ${diaCorto(porDia[0].fecha)}: máximo ${numero(maximo)}, hoy ${numero(hoy.visitas)}`,
      );
    }
    const ejes = el(
      "div",
      "ejes",
      el("span", null, n ? diaCorto(porDia[0].fecha) : ""),
      el("span", null, "Visitas por día"),
      el("span", null, n ? diaCorto(porDia[n - 1].fecha) : ""),
    );
    return el("div", "grafico", lienzo, ejes);
  }

  function pintarCloudflare(r) {
    const tarjeta = document.getElementById("cloudflare");
    const c = r.config.cloudflare;
    const plan = `Workers Paid · US$ ${numero(c.usdMes)}/mes`;
    if (!r.cloudflare.ok) return terminar(tarjeta, cabecera("Cloudflare", plan, chipSinDatos()), errorDeFuente(r.cloudflare.error));
    const cf = r.cloudflare;
    const ciclo = `Ciclo del ${diaUtc(cf.ciclo.inicio)} al ${diaUtc(cf.ciclo.fin)} · día ${cf.ciclo.dia} de ${cf.ciclo.dias}${cf.ciclo.estimado ? " · fechas estimadas" : ""}`;
    terminar(
      tarjeta,
      cabecera("Cloudflare", plan, chipEstado(peor([cf.visitas.estado, cf.cpu.estado]))),
      el("p", "nota", ciclo),
      medidor("Visitas a la web", cf.visitas, notaDeRitmo(cf.visitas, "el ciclo", "El ritmo aparece mañana.")),
      medidor(
        "Tiempo de CPU",
        cf.cpu,
        `${notaDeRitmo(cf.cpu, "el ciclo", "El ritmo aparece mañana.")} Errores del servidor este ciclo: ${numero(cf.errores)}.`,
      ),
      grafico(cf.porDia),
      el(
        "div",
        "pie-tarjeta",
        lineaPie("Costo de este mes", el("span", "num", `US$ ${dinero(c.usdMes)} fijo + US$ ${dinero(cf.extraUsd)} extra`)),
        lineaPie(
          "Cuándo pagarías más",
          `Al pasar ${numero(c.visitas / 1e6)} M visitas o ${numero(c.cpuMs / 1000)} s de CPU: US$ ${dinero(c.usdPorMillonDeVisitas)} por millón de visitas y US$ ${dinero(c.usdPorMillonDeMs)} por millón de ms`,
        ),
      ),
    );
  }

  // ------------------------------------------------------------------ Supabase

  function pintarSupabase(r) {
    const tarjeta = document.getElementById("supabase");
    const c = r.config.supabase;
    if (!r.supabase.ok) return terminar(tarjeta, cabecera("Supabase", "Gratis", chipSinDatos()), errorDeFuente(r.supabase.error));
    const s = r.supabase;

    let ritmo;
    if (s.ritmoBytesDia === null) ritmo = "El ritmo aparece en unos días.";
    else if (s.base.pct >= 100) ritmo = "Ya llegó al límite.";
    else if (s.ritmoBytesDia <= 0) ritmo = "No creció en la última semana.";
    else if (s.base.llegaEl) ritmo = `Crece ~${cantidad(s.ritmoBytesDia, "bytes")} por día: llegaría al límite el ${diaLima(s.base.llegaEl)}.`;
    else ritmo = `Crece ~${cantidad(s.ritmoBytesDia, "bytes")} por día: no llega al límite en el próximo año.`;

    const enlace = el("a", null, "ver en Supabase");
    enlace.href = `https://supabase.com/dashboard/project/${c.proyecto}`;
    enlace.target = "_blank";
    enlace.rel = "noopener";

    terminar(
      tarjeta,
      cabecera("Supabase", "Gratis", chipEstado(peor([s.base.estado, s.archivos.estado, s.usuarios.estado]))),
      medidor(
        "Base de datos",
        s.base,
        `${numero(s.reclamos)} ${s.reclamos === 1 ? "reclamo" : "reclamos"} y ${numero(s.negocios)} ${s.negocios === 1 ? "negocio guardado" : "negocios guardados"}. ${ritmo}`,
      ),
      medidor("Usuarios activos (30 días)", s.usuarios),
      medidor("Archivos", s.archivos),
      el(
        "div",
        "pie-tarjeta",
        lineaPie(`Tráfico del mes (límite ${cantidad(c.traficoBytes, "bytes")})`, "Supabase no lo entrega por API · ", enlace),
        lineaPie("Pausa por inactividad", "No aplica: el panel y los recordatorios la usan cada día"),
        lineaPie("Costo de este mes", el("span", "num", "US$ 0.00")),
        lineaPie("Cuándo pagarías", `Al pasar cualquiera de estos límites: plan Pro, US$ ${numero(c.usdPro)}/mes`),
      ),
    );
  }

  // -------------------------------------------------------------------- Resend

  function pintarResend(r) {
    const tarjeta = document.getElementById("resend");
    const c = r.config.resend;
    if (!r.resend.ok) return terminar(tarjeta, cabecera("Resend", "Gratis", chipSinDatos()), errorDeFuente(r.resend.error));
    const s = r.resend;
    const pie = el(
      "div",
      "pie-tarjeta",
      lineaPie("Costo de este mes", el("span", "num", "US$ 0.00")),
      lineaPie(
        "Cuándo pagarías",
        `Más de ${numero(c.dia)} en un día o ${numero(c.mes)} en el mes: plan Pro, US$ ${numero(c.usdPro)}/mes (${numero(c.mesPro)} al mes, sin tope diario)`,
      ),
    );
    if (!s.ultimoEnvio) {
      return terminar(
        tarjeta,
        cabecera("Resend", "Gratis", el("span", "chip gris", "Sin datos aún")),
        el("p", "nota", "Aún no hay correos registrados: el dato llega con el primer correo que envíe la web."),
        pie,
      );
    }
    const estados = [s.dia && s.dia.estado, s.mes && s.mes.estado].filter(Boolean);
    terminar(
      tarjeta,
      cabecera("Resend", "Gratis", chipEstado(peor(estados))),
      el("p", "nota", `Último correo ${hace(s.ultimoEnvio)} (${fechaHoraLima(s.ultimoEnvio)}). Resend informa su cuenta con cada envío.`),
      s.dia ? medidor("Correos de hoy", s.dia, "El contador diario se reinicia a las 7:00 p. m. (medianoche en hora UTC).") : null,
      s.mes ? medidor("Correos del mes", s.mes, notaDeRitmo(s.mes, "el mes", "")) : null,
      pie,
    );
  }

  // -------------------------------------------------------------- Mercado Pago

  function pintarMercadoPago(r) {
    const tarjeta = document.getElementById("mercadopago");
    const c = r.config.mercadoPago;
    if (!r.mercadoPago.ok) {
      return terminar(tarjeta, cabecera("Mercado Pago", "Sin mensualidad", chipSinDatos()), errorDeFuente(r.mercadoPago.error));
    }
    const m = r.mercadoPago;
    const tabla = el(
      "table",
      "tabla-comision",
      el("thead", null, el("tr", null, ...["Plan", "Precio", "Comisión", "Recibes"].map((t) => el("th", null, t)))),
      el(
        "tbody",
        null,
        ...m.tabla.map((f) =>
          el("tr", null, el("td", null, f.plan), el("td", null, `S/ ${dinero(f.precio)}`), el("td", null, `S/ ${dinero(f.comision)}`), el("td", null, `S/ ${dinero(f.recibes)}`)),
        ),
      ),
    );
    terminar(
      tarjeta,
      cabecera("Mercado Pago", "Sin mensualidad", chipEstado("ok")),
      el(
        "div",
        "resumen",
        dato("Suscripciones activas", [m.suscripcionesActivas === null ? "—" : numero(m.suscripcionesActivas)], "", true),
        dato("Cobrado este mes", [`S/ ${dinero(m.cobrado)}`], m.pagos === 1 ? "1 pago" : `${numero(m.pagos)} pagos`, true),
        dato("Comisiones del mes", [`S/ ${dinero(m.comisiones)}`], "lo que se quedó Mercado Pago", true),
      ),
      el(
        "p",
        "nota",
        `No tiene límite de uso: cobra un porcentaje en cada pago. Así quedaría cada plan con la tarifa publicada (${numero(c.porcentaje * 100, 2)} % + S/ ${numero(c.fijo)} + IGV, abono inmediato):`,
      ),
      el("div", "contenedor-tabla", tabla),
      el("div", "pie-tarjeta", lineaPie("De dónde sale", "Suscripciones de tu base; la comisión real de cada pago la informa Mercado Pago")),
    );
  }

  // ----------------------------------------------------- servicios y alertas

  const NOMBRE_DEL_DIA = { ok: "corrió bien", fallo: "falló", sin_corrida: "no corrió", pendiente: "todavía no corre" };

  const servicio = (nombre, chip, sub, extra) =>
    el("div", "servicio", el("div", "fila", el("span", "nombre", nombre), chip), el("span", "sub", sub), extra);

  function prueba(nombre, p, sitio, condiciones) {
    const tiempo = p.ms === null ? "" : ` · ${numero(p.ms / 1000, 1, 1)} s${p.ms >= 1500 ? " (algo lento)" : ""}`;
    const chip = p.ok ? el("span", "chip ok", "Responde") : el("span", "chip limite", "No responde");
    return servicio(nombre, chip, `${sitio}${tiempo} · ${condiciones}${p.ok ? "" : ` · ${p.error}`}`);
  }

  function recordatorios(rec) {
    const nombre = "Recordatorios de cada mañana";
    if (!rec.ok) return servicio(nombre, chipSinDatos(), `No se pudo consultar: ${rec.error}`);
    const contados = rec.dias.filter((d) => d.estado !== "pendiente");
    const bien = contados.filter((d) => d.estado === "ok").length;
    const chip =
      contados.length === 0
        ? el("span", "chip gris", "Sin datos")
        : el("span", `chip ${bien === contados.length ? "ok" : "atencion"}`, `${bien} de ${contados.length}`);
    const u = rec.ultima;
    // Los puntos salen de la analítica de Cloudflare; el detalle (hora y avisos) lo guarda
    // LibroClaro desde la primera corrida con esta versión.
    const sub = !u
      ? "El detalle de cada corrida aparece desde la próxima mañana · también mantiene activa la base"
      : u.ok
        ? `Última: ${hace(u.hora)} (${fechaHoraLima(u.hora)}) · ${u.enviados === 1 ? "1 aviso enviado" : `${numero(u.enviados)} avisos enviados`} · también mantiene activa la base`
        : `La última corrida falló ${hace(u.hora)}: ${u.error || "sin detalle"}`;
    const puntos = el(
      "div",
      "puntos",
      ...rec.dias.map((d) => {
        const punto = el("span", `punto ${d.estado}`, String(Number(d.fecha.slice(8))));
        punto.title = `${diaCorto(d.fecha)}: ${NOMBRE_DEL_DIA[d.estado]}`;
        return punto;
      }),
    );
    puntos.setAttribute("aria-label", `Últimos 7 días: ${bien} correctos de ${contados.length}`);
    return servicio(nombre, chip, sub, rec.dias.length ? puntos : null);
  }

  function pintarServicios(r) {
    document.getElementById("servicios").replaceChildren(
      prueba("Consulta de RUC", r.servicios.ruc, "apis.net.pe", "sin cuenta ni límite publicado"),
      prueba("Códigos QR del aviso", r.servicios.qr, "api.qrserver.com", "sin cuenta"),
      recordatorios(r.recordatorios),
    );
  }

  function pintarAlertas(r) {
    const intro = el(
      "p",
      null,
      el("b", null, "Alertas por correo."),
      " Si algo pasa del 80 % de su límite, o si los recordatorios fallan una mañana, te llega un correo a libroclaro.pe@gmail.com.",
    );
    const a = r.alertasDelMes;
    let detalle;
    if (!a.ok) detalle = el("p", null, `No se pudo consultar las alertas del mes: ${a.error}`);
    else if (a.lista.length === 0) detalle = el("p", null, "Este mes: ninguna.");
    else {
      detalle = el(
        "div",
        null,
        el("p", null, `Este mes: ${a.lista.length}.`),
        el("ul", null, ...a.lista.map((x) => el("li", null, `${x.texto} · ${fechaHoraLima(x.enviadaEl)}`))),
      );
    }
    document.getElementById("alertas").replaceChildren(intro, detalle);
  }

  function pintar(r) {
    pintarResumen(r);
    pintarCloudflare(r);
    pintarSupabase(r);
    pintarResend(r);
    pintarMercadoPago(r);
    pintarServicios(r);
    pintarAlertas(r);
    const verificado = formato({ day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${r.config.verificadoEl}T00:00:00Z`),
    );
    document.getElementById("verificado").textContent =
      `Precios y límites verificados el ${verificado} · tipo de cambio aproximado: S/ ${dinero(r.config.tipoDeCambio)} por dólar.`;
  }

  // ------------------------------------------------------------- actualización

  const boton = document.getElementById("actualizar");
  const etiqueta = document.getElementById("actualizado");
  const antiguedad = document.getElementById("antiguedad");
  const aviso = document.getElementById("aviso");
  let ultimoExito = 0;
  let ultimoIntento = 0;
  let cargando = false;

  function pintarEtiqueta() {
    if (!ultimoExito) return;
    const min = Math.floor((Date.now() - ultimoExito) / 60000);
    const cuando = horaLima(ultimoExito);
    etiqueta.textContent = min < 1 ? `Actualizado hace unos segundos · ${cuando}` : `Actualizado hace ${min} min · ${cuando}`;
    const viejo = Date.now() - ultimoExito > DIEZ_MIN;
    antiguedad.hidden = !viejo;
    if (viejo) antiguedad.textContent = `Datos de hace ${min} min`;
  }

  async function actualizar(fresco) {
    if (cargando) return;
    cargando = true;
    ultimoIntento = Date.now();
    boton.disabled = true;
    boton.classList.add("girando");
    try {
      const res = await fetch(fresco ? "/api/resumen?fresco=1" : "/api/resumen", { cache: "no-store" });
      // Si la sesión de Access venció, la respuesta es una redirección a la página de entrada, no el resumen.
      const esJson = (res.headers.get("content-type") || "").includes("application/json");
      if (!res.ok || res.redirected || !esJson) throw new Error(`respuesta ${res.status}`);
      pintar(await res.json());
      ultimoExito = Date.now();
      aviso.hidden = true;
    } catch {
      aviso.hidden = false;
      if (!ultimoExito) etiqueta.textContent = "No se pudo consultar";
    } finally {
      cargando = false;
      boton.disabled = false;
      boton.classList.remove("girando");
      pintarEtiqueta();
    }
  }

  boton.addEventListener("click", () => actualizar(true));
  setInterval(() => {
    if (document.visibilityState === "visible") actualizar(false);
  }, CINCO_MIN);
  setInterval(pintarEtiqueta, 30 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - ultimoIntento >= CINCO_MIN) actualizar(false);
  });
  actualizar(false);
})();
