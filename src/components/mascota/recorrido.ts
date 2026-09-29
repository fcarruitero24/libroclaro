/**
 * La entrada de LibIA como funciones puras del tiempo: dónde está y qué
 * gesto hace a los `t` segundos. Portado de peekPose() y placeMascot() de la
 * fuente de Codex (fuente-mascota-3d.html), con los mismos tiempos y curvas.
 * No importa nada: las pruebas lo corren con Node tal cual.
 */

export const DURACION_ENTRADA = 6.55;
/** Pasa de detrás a delante de la hoja: ya despejó el borde con el libro y las dos manos. */
export const CAMBIO_DE_CAPA = 3.85;
export const DURACION_SALUDO = 3.1;

/** Px relativos a la esquina superior izquierda del lienzo. top/right/bottom son los bordes de la hoja. */
export type Medidas = {
  ancho: number;
  alto: number;
  size: number;
  top: number;
  right: number;
  bottom: number;
  /** Cuánto se extiende el lienzo a la derecha de la hoja (16, 48 o 112 px según el ancho). */
  salida: number;
};

export type Gesto = {
  x: number;
  y: number;
  turn: number;
  roll: number;
  pitch: number;
  gazeWeight: number;
  gazeX: number;
  gazeY: number;
  curiosity: number;
  second: number;
  hand: number;
  elbow: number;
  flutter: number;
};

/** Centro de LibIA en px del lienzo; `asentado` (0 a 1) multiplica la opacidad de sombra y halo. */
export type Lugar = { x: number; y: number; delante: boolean; asentado: number };

/**
 * Reposo en la esquina inferior derecha de la hoja, donde estaba la mascota
 * anterior. Se mide desde el borde del lienzo y no con un desplazamiento fijo:
 * la mascota anterior sobresalía más cuanto más margen había a la derecha
 * (ver docs/superpowers/plans/2026-09-29-libia-medidas.md).
 */
export const FINAL = { dentro: 0.99, dy: -0.33 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 124 px con la hoja de md (394) y 147 con la de xl (528): el mismo alto visible que la mascota anterior. */
export function tamanoLibIA(anchoHoja: number): number {
  return clamp(55 + 0.175 * anchoHoja, 110, 160);
}

export function ease(inicio: number, fin: number, t: number): number {
  const p = clamp((t - inicio) / (fin - inicio), 0, 1);
  return p * p * (3 - 2 * p);
}

export function mix(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

export function pulse(inicio: number, fin: number, t: number): number {
  return Math.sin(Math.PI * clamp((t - inicio) / (fin - inicio), 0, 1)) ** 2;
}

/** Gestos de los dos vistazos: arcos, mirada curiosa, retirada, rebote y saludo corto con la mano. */
export function gestoDeVistazo(t: number): Gesto {
  const first = ease(0.25, 0.7, t) * (1 - ease(1.28, 1.78, t));
  const second = ease(1.95, 2.48, t) * (1 - ease(3.16, 3.74, t));
  const scan = ease(0.77, 1.24, t);
  const returnLook = ease(2.55, 3.13, t);
  const hand = ease(2.12, 2.65, t) * (1 - ease(3.14, 3.72, t));
  const elbow = ease(2.25, 2.76, t) * (1 - ease(3.18, 3.72, t));
  const flutter = Math.sin((t - 2.63) * Math.PI * 6) * ease(2.58, 2.72, t) * (1 - ease(3.02, 3.28, t));
  return {
    x: first * mix(-0.14, 0.075, scan) + second * (0.065 * Math.sin((t - 2.05) * 4.5) - 0.045),
    y:
      -0.05 * pulse(0.53, 1.02, t) +
      0.02 * pulse(0.97, 1.38, t) -
      0.025 * pulse(1.22, 1.5, t) -
      0.058 * pulse(2.19, 2.72, t) +
      0.016 * pulse(2.66, 3.06, t) +
      0.03 * pulse(3.04, 3.37, t),
    turn: first * mix(-0.26, 0.27, scan) + second * mix(0.24, -0.075, returnLook),
    roll: first * mix(0.18, -0.115, scan) + second * (-0.105 + 0.055 * Math.sin((t - 2.12) * 5.5)),
    pitch: -0.07 * first - 0.05 * second + 0.045 * pulse(1.23, 1.66, t),
    gazeWeight: Math.max(first, second),
    gazeX: first * mix(-0.23, 0.2, ease(0.69, 1.13, t)) + second * mix(0.22, 0, returnLook),
    gazeY: -0.075 * first - 0.06 * second,
    curiosity: first * (0.6 + 0.4 * scan),
    second,
    hand: hand * 0.78,
    elbow: elbow * 0.78,
    flutter,
  };
}

/** Dónde va LibIA: escondida, asoma, se esconde, asoma con la mano, sube, pasa al frente y baja a su esquina. */
export function lugarEnRecorrido(t: number, m: Medidas, g: Gesto): Lugar {
  const { size, top, right, bottom, salida } = m;
  const hiddenY = top + size * 0.72;
  const peekY = top + size * 0.025;
  const secondY = top - size * 0.06;
  // Sube lo justo para que toda la silueta (baja 0,463·size bajo el centro) despeje el borde
  // antes de pasar al frente; la fuente subía 0,6·size + 8 y el hero la recortaba por arriba.
  // Así la entrada entera cabe en 1,02·size sobre la hoja (page.tsx deja 160 px en md+).
  const clearY = top - size * 0.49;
  const firstX = right - size * 0.83;
  const secondX = right - size * 0.73;
  const finalX = right + salida - FINAL.dentro * size;
  const finalY = bottom + FINAL.dy * size;

  let x = mix(firstX, secondX, ease(1.72, 2.12, t));
  let y: number;
  if (t < 1.3) y = mix(hiddenY, peekY, ease(0.2, 0.8, t));
  else if (t < 1.95) y = mix(peekY, hiddenY, ease(1.3, 1.78, t));
  else if (t < 3.15) y = mix(hiddenY, secondY, ease(1.95, 2.5, t));
  else if (t < CAMBIO_DE_CAPA) {
    x = secondX;
    y = mix(secondY, clearY, ease(3.15, 3.82, t));
  } else {
    x = mix(secondX, finalX, ease(3.85, 4.85, t));
    y = mix(clearY, finalY, ease(3.85, 4.85, t));
  }

  return {
    x: x + g.x * size,
    y: y + g.y * size,
    delante: t >= CAMBIO_DE_CAPA,
    asentado: ease(4.15, 4.95, t),
  };
}

export type Fase = "llegando" | "vistazo" | "escondida" | "llega-mano" | "mano" | "sale" | "saluda" | "reposo";

export function fase(t: number): Fase {
  if (t < 0.8) return "llegando";
  if (t < 1.3) return "vistazo";
  if (t < 1.95) return "escondida";
  if (t < 2.6) return "llega-mano";
  if (t < 3.15) return "mano";
  if (t < CAMBIO_DE_CAPA) return "sale";
  if (t < DURACION_ENTRADA) return "saluda";
  return "reposo";
}
