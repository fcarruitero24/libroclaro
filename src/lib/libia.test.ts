import assert from "node:assert/strict";
import { test } from "node:test";
import {
  avisoDeIA,
  conReintento,
  esErrorPasajero,
  huecosPendientes,
  INSTRUCCIONES_LIBIA,
  limpiarBorrador,
  mensajeParaLibIA,
  neuronasReales,
  nombreDePila,
  reservaDeNeuronas,
} from "./libia.ts";
import type { DatosParaLibIA } from "./libia.ts";

const DETALLE =
  "Compré una licuadora el 12 de setiembre en su tienda online. Llegó con la jarra rajada y al enchufarla no encendió. Llamé dos veces y nadie me contestó.";
const PEDIDO = "Que me devuelvan mi dinero o me cambien la licuadora por una nueva.";

// La fila trae datos que LibIA nunca debe ver; se pasa como variable para
// que TypeScript acepte los campos de más, como pasaría con una fila real.
const fila = {
  negocio: "Electro Hogar Lima",
  kind: "reclamo",
  item_type: "producto",
  item_description: "licuadora comprada en la tienda online",
  amount: "189.00",
  consumer_name: "María Quispe Huamán",
  is_minor: false,
  guardian_name: null,
  detail: DETALLE,
  request: PEDIDO,
  consumer_doc_number: "45678912",
  consumer_address: "Av. Los Olivos 123",
  consumer_phone: "987654321",
  consumer_email: "maria@correo.com",
};
const datos: DatosParaLibIA = fila;

test("mensajeParaLibIA arma el mensaje exacto", () =>
  assert.equal(
    mensajeParaLibIA(datos, ""),
    [
      "Negocio: Electro Hogar Lima",
      "Tipo: Reclamo",
      "Bien contratado: Producto: licuadora comprada en la tienda online",
      "Monto reclamado: S/ 189.00",
      "Nombre del consumidor: María",
      `Detalle: ${DETALLE}`,
      `Pedido: ${PEDIDO}`,
      "Nota del negocio: (sin nota)",
    ].join("\n"),
  ));

test("mensajeParaLibIA no lleva datos personales", () => {
  const m = mensajeParaLibIA(datos, "");
  for (const dato of ["45678912", "Los Olivos", "987654321", "maria@correo.com", "Quispe", "Huamán"]) {
    assert.ok(!m.includes(dato), `el mensaje no debe incluir ${dato}`);
  }
});

test("mensajeParaLibIA con nota", () =>
  assert.equal(
    mensajeParaLibIA(datos, "Le enviamos una licuadora nueva esta semana.").split("\n").at(-1),
    "Nota del negocio: Le enviamos una licuadora nueva esta semana.",
  ));

test("mensajeParaLibIA: queja de servicio sin monto", () => {
  const m = mensajeParaLibIA(
    { ...datos, kind: "queja", item_type: "servicio", item_description: "atención en el restaurante", amount: null },
    "",
  );
  assert.ok(m.includes("\nTipo: Queja\n"));
  assert.ok(m.includes("\nBien contratado: Servicio: atención en el restaurante\n"));
  assert.ok(m.includes("\nMonto reclamado: (no indicado)\n"));
  assert.ok(mensajeParaLibIA({ ...datos, amount: 50 }, "").includes("\nMonto reclamado: S/ 50.00\n"));
});

test("mensajeParaLibIA: menor de edad con apoderado", () => {
  const m = mensajeParaLibIA({ ...datos, is_minor: true, guardian_name: "Rosa Pérez Díaz" }, "");
  assert.ok(m.includes("\nApoderado del consumidor (menor de edad): Rosa\n"));
  assert.ok(!m.includes("Nombre del consumidor"));
  assert.ok(!m.includes("Pérez"));
});

test("mensajeParaLibIA: menor de edad sin apoderado usa el nombre del consumidor", () =>
  assert.ok(mensajeParaLibIA({ ...datos, is_minor: true, guardian_name: null }, "").includes("\nNombre del consumidor: María\n")));

test("mensajeParaLibIA tapa correos y celulares", () => {
  const conDatos = "Escríbanme a ana.perez@gmail.com o al 987 654 321, o al +51 912-345-678.";
  const m = mensajeParaLibIA({ ...datos, detail: conDatos, request: conDatos }, conDatos);
  for (const campo of ["Detalle", "Pedido", "Nota del negocio"]) {
    assert.ok(
      m.includes(`\n${campo}: Escríbanme a [correo] o al [teléfono], o al [teléfono].`),
      `${campo} debe quedar tapado`,
    );
  }
  for (const dato of ["ana.perez", "987 654 321", "912-345-678"]) assert.ok(!m.includes(dato));
});

test("mensajeParaLibIA no tapa un número de pedido largo", () =>
  assert.ok(mensajeParaLibIA({ ...datos, detail: "Pedido N.º 19876543210." }, "").includes("Detalle: Pedido N.º 19876543210.")));

test("nombreDePila toma la primera palabra", () => {
  assert.equal(nombreDePila("  María  Quispe "), "María");
  assert.equal(nombreDePila(""), "");
});

test("limpiarBorrador quita las comillas que envuelven todo", () => {
  assert.equal(limpiarBorrador('"Estimada María: gracias."'), "Estimada María: gracias.");
  assert.equal(limpiarBorrador("“Estimada María: gracias.”"), "Estimada María: gracias.");
});

test("limpiarBorrador quita un título como Borrador:", () =>
  assert.equal(limpiarBorrador("Borrador:\nEstimada María"), "Estimada María"));

test("limpiarBorrador quita las negritas", () =>
  assert.equal(limpiarBorrador("**Estimada María**, gracias"), "Estimada María, gracias"));

test("limpiarBorrador junta los saltos de línea de más", () =>
  assert.equal(limpiarBorrador("Hola\n\n\n\nChau"), "Hola\n\nChau"));

test("limpiarBorrador no toca comillas dentro del texto", () =>
  assert.equal(limpiarBorrador('Usted dijo "rápido".'), 'Usted dijo "rápido".'));

test("huecosPendientes encuentra los dos huecos de LibIA", () =>
  assert.deepEqual(
    huecosPendientes("Le ofrecemos [indica aquí la solución que ofreces]. Escríbanos a [canal de contacto]."),
    ["[indica aquí la solución que ofreces]", "[canal de contacto]"],
  ));

test("huecosPendientes encuentra un hueco a medio completar o sin tilde", () =>
  assert.deepEqual(huecosPendientes("Le ofrecemos [Indica aqui: devolución]."), ["[Indica aqui: devolución]"]));

test("huecosPendientes ignora corchetes normales", () => assert.deepEqual(huecosPendientes("Ver [nota] adjunta"), []));

test("huecosPendientes no repite un hueco", () =>
  assert.deepEqual(huecosPendientes("[canal de contacto] o [canal de contacto]"), ["[canal de contacto]"]));

test("las instrucciones piden justo los huecos que se bloquean al enviar", () =>
  assert.deepEqual(huecosPendientes(INSTRUCCIONES_LIBIA), ["[indica aquí la solución que ofreces]", "[canal de contacto]"]));

test("reservaDeNeuronas cuenta bytes, formato de chat y la salida máxima", () => {
  // (0 + 50) × 0,031876 + 600 × 0,050488 = 31,89 → 32
  assert.equal(reservaDeNeuronas("", ""), 32);
  // 1.000 bytes de "a" + 1.000 de "ñ" (2 bytes cada una): (2.000 + 50) × 0,031876 + 30,29 = 95,64 → 96
  assert.equal(reservaDeNeuronas("a".repeat(1000), "ñ".repeat(500)), 96);
});

test("neuronasReales usa los tokens que informa Cloudflare", () =>
  // 419 × 0,031876 + 170 × 0,050488 = 21,939004
  assert.equal(neuronasReales({ prompt_tokens: 419, completion_tokens: 170 }, 80), 21.939));

test("neuronasReales sin uso informado se queda con la reserva", () => {
  assert.equal(neuronasReales(undefined, 80), 80);
  assert.equal(neuronasReales({}, 80), 80);
});

test("avisoDeIA cierra con el nombre del negocio", () =>
  assert.equal(
    avisoDeIA("Cafetería Demo"),
    "Esta respuesta se redactó con ayuda de inteligencia artificial y fue revisada por Cafetería Demo.",
  ));

test("avisoDeIA no duplica el punto de S.A.C.", () =>
  assert.equal(
    avisoDeIA("Bodega Don Lucho S.A.C."),
    "Esta respuesta se redactó con ayuda de inteligencia artificial y fue revisada por Bodega Don Lucho S.A.C.",
  ));

test("esErrorPasajero reconoce ocupado y fallas de conexión", () => {
  assert.equal(esErrorPasajero(new Error("3040: Capacity temporarily exceeded, please try again.")), true);
  assert.equal(esErrorPasajero(new Error("Network connection lost.")), true);
  assert.equal(esErrorPasajero(new TypeError("fetch failed")), true);
  assert.equal(esErrorPasajero(new Error("5006: Invalid input")), false);
});

const ocupado = () => new Error("3040: Capacity temporarily exceeded, please try again.");

test("conReintento reintenta una vez si Cloudflare está ocupado", async () => {
  let llamadas = 0;
  const r = await conReintento(
    async () => {
      llamadas++;
      if (llamadas === 1) throw ocupado();
      return "ok";
    },
    { limiteMs: 200, esperaMs: 5 },
  );
  assert.equal(r, "ok");
  assert.equal(llamadas, 2);
});

test("conReintento no reintenta más de una vez", async () => {
  let llamadas = 0;
  await assert.rejects(
    conReintento(
      async () => {
        llamadas++;
        throw ocupado();
      },
      { limiteMs: 200, esperaMs: 5 },
    ),
  );
  assert.equal(llamadas, 2);
});

test("conReintento no reintenta un error que no es pasajero", async () => {
  let llamadas = 0;
  await assert.rejects(
    conReintento(
      async () => {
        llamadas++;
        throw new Error("5006: Invalid input");
      },
      { limiteMs: 200, esperaMs: 5 },
    ),
  );
  assert.equal(llamadas, 1);
});

test("conReintento no gasta otro pedido si el plazo venció mientras esperaba", async () => {
  let llamadas = 0;
  await assert.rejects(
    conReintento(
      async () => {
        llamadas++;
        throw ocupado();
      },
      { limiteMs: 20, esperaMs: 60 },
    ),
    /tiempo/,
  );
  // Pasada la espera de 60 ms, el reintento ya no debe salir.
  await new Promise((resolver) => setTimeout(resolver, 100));
  assert.equal(llamadas, 1);
});

test("conReintento corta al agotar el plazo total", async () => {
  const inicio = Date.now();
  await assert.rejects(
    conReintento(() => new Promise<string>(() => {}), { limiteMs: 50, esperaMs: 5 }),
    /tiempo/,
  );
  assert.ok(Date.now() - inicio < 200);
});
