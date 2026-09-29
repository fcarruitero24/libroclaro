import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CAMBIO_DE_CAPA,
  DURACION_ENTRADA,
  FINAL,
  ease,
  fase,
  gestoDeVistazo,
  lugarEnRecorrido,
  tamanoLibIA,
  type Medidas,
} from "./recorrido.ts";

const m: Medidas = { ancho: 600, alto: 900, size: 150, top: 260, right: 560, bottom: 700, salida: 48 };
const lugar = (t: number, medidas: Medidas = m) => lugarEnRecorrido(t, medidas, gestoDeVistazo(t));
const cerca = (real: number, esperado: number, tolerancia = 0.5) =>
  assert.ok(Math.abs(real - esperado) <= tolerancia, `${real} no está a ±${tolerancia} de ${esperado}`);

test("ease vale 0 al inicio, 1 al final, 0,5 a la mitad y se limita fuera del rango", () => {
  assert.equal(ease(2, 4, 2), 0);
  assert.equal(ease(2, 4, 4), 1);
  assert.equal(ease(2, 4, 3), 0.5);
  assert.equal(ease(2, 4, 1), 0);
  assert.equal(ease(2, 4, 9), 1);
});

test("empieza escondida detrás de la hoja", () => {
  const l = lugar(0);
  assert.equal(l.y, 260 + 0.72 * 150);
  assert.equal(l.delante, false);
});

test("en el primer vistazo asoma media cara por el borde", () => {
  const { y } = lugar(1.0);
  assert.ok(y >= 260 - 0.1 * 150 && y <= 260 + 0.15 * 150, `y = ${y}`);
});

test("pasa al frente recién a los 3,85 s", () => {
  assert.equal(lugar(3.84).delante, false);
  assert.equal(lugar(CAMBIO_DE_CAPA).delante, true);
});

test("despeja el borde antes de pasar al frente", () => {
  assert.ok(lugar(CAMBIO_DE_CAPA).y + 0.5 * 150 <= 260);
});

test("termina en la esquina inferior derecha, asentada", () => {
  const l = lugar(DURACION_ENTRADA);
  cerca(l.x, 560 + 48 - FINAL.dentro * 150);
  cerca(l.y, 700 + FINAL.dy * 150);
  assert.equal(l.asentado, 1);
  assert.equal(l.delante, true);
});

test("no depende de llamadas previas y escala con la hoja", () => {
  assert.deepEqual(lugar(2.2), lugar(2.2));
  const doble: Medidas = { ancho: 1200, alto: 1800, size: 300, top: 520, right: 1120, bottom: 1400, salida: 96 };
  for (const t of [1.0, DURACION_ENTRADA]) {
    const a = lugar(t);
    const b = lugar(t, doble);
    cerca(b.x - doble.right, 2 * (a.x - m.right), 1e-9);
    cerca(b.y - doble.top, 2 * (a.y - m.top), 1e-9);
  }
});

test("fases de la entrada", () => {
  assert.equal(fase(0.5), "llegando");
  assert.equal(fase(1.0), "vistazo");
  assert.equal(fase(1.5), "escondida");
  assert.equal(fase(2.8), "mano");
  assert.equal(fase(3.5), "sale");
  assert.equal(fase(5), "saluda");
  assert.equal(fase(7), "reposo");
});

test("el tamaño sigue a la hoja: como la mascota actual en md y xl", () => {
  cerca(tamanoLibIA(394), 124, 1);
  cerca(tamanoLibIA(528), 147, 1);
  assert.equal(tamanoLibIA(200), 110);
  assert.equal(tamanoLibIA(2000), 160);
});
