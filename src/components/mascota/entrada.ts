/**
 * "Semáforo" entre LibIA y la hoja del hero: la hoja no muestra el aviso
 * "Nuevo reclamo recibido" hasta que LibIA termina de entrar, o hasta saber
 * que no va a entrar (celular, movimiento reducido, sin WebGL, ya la vio).
 *
 * El estado vive en el módulo, no en un componente: así sobrevive a los
 * remontajes y a la navegación interna, y la entrada se ve una sola vez por
 * carga del documento. Una recarga completa lo reinicia. No se guarda nada en
 * el navegador.
 */

let terminada = false;
const suscriptores = new Set<() => void>();

export function entradaTerminada(): boolean {
  return terminada;
}

export function avisarEntradaTerminada(): void {
  if (terminada) return;
  terminada = true;
  for (const cb of suscriptores) cb();
  suscriptores.clear();
}

/** Llama `cb` cuando termine la entrada, o al instante si ya terminó. Devuelve cómo desuscribirse. */
export function alTerminarEntrada(cb: () => void): () => void {
  if (terminada) {
    cb();
    return () => {};
  }
  suscriptores.add(cb);
  return () => {
    suscriptores.delete(cb);
  };
}
