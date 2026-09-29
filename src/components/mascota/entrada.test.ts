import assert from "node:assert/strict";
import { test } from "node:test";

type Entrada = typeof import("./entrada.ts");

/**
 * El semáforo guarda su estado a nivel de módulo, así que cada prueba carga
 * una copia nueva: Node trata "entrada.ts?caso=N" como otro módulo.
 */
let caso = 0;
async function moduloNuevo(): Promise<Entrada> {
  caso += 1;
  return import(new URL(`./entrada.ts?caso=${caso}`, import.meta.url).href);
}

test("empieza sin terminar", async () => {
  const { entradaTerminada } = await moduloNuevo();
  assert.equal(entradaTerminada(), false);
});

test("avisa una sola vez", async () => {
  const { alTerminarEntrada, avisarEntradaTerminada, entradaTerminada } = await moduloNuevo();
  let llamadas = 0;
  alTerminarEntrada(() => llamadas++);
  avisarEntradaTerminada();
  avisarEntradaTerminada();
  assert.equal(llamadas, 1);
  assert.equal(entradaTerminada(), true);
});

test("suscribirse tarde llama al instante", async () => {
  const { alTerminarEntrada, avisarEntradaTerminada } = await moduloNuevo();
  avisarEntradaTerminada();
  let llamadas = 0;
  alTerminarEntrada(() => llamadas++);
  assert.equal(llamadas, 1);
});

test("desuscribirse evita el aviso", async () => {
  const { alTerminarEntrada, avisarEntradaTerminada } = await moduloNuevo();
  let llamadas = 0;
  const quitar = alTerminarEntrada(() => llamadas++);
  quitar();
  avisarEntradaTerminada();
  assert.equal(llamadas, 0);
});
