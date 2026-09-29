"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opciones: Record<string, unknown>): string;
      reset(id: string): void;
      remove(id: string): void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

let carga: Promise<void> | null = null;

/** Carga el script de Turnstile una sola vez por página, aunque haya varios formularios. */
function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  carga ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      carga = null;
      reject(new Error("No cargó Turnstile"));
    };
    document.head.appendChild(s);
  });
  return carga;
}

/**
 * Casilla anti-bots de Cloudflare dentro de un formulario. Agrega el campo
 * oculto cf-turnstile-response, que el servidor verifica (lib/turnstile.ts).
 * Con "interaction-only" casi nadie ve nada: solo aparece la casilla si
 * Cloudflare duda.
 *
 * `reinicio` debe cambiar cada vez que la acción responde con error: el token
 * sirve una sola vez y el servidor ya lo gastó, así que hay que pedir otro.
 * Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY (desarrollo local) no se muestra.
 */
export function Turnstile({ reinicio }: { reinicio: unknown }) {
  const caja = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    const el = caja.current;
    if (!SITE_KEY || !el) return;
    let vigente = true;
    cargarScript()
      .then(() => {
        if (!vigente || !window.turnstile) return;
        widget.current = window.turnstile.render(el, {
          sitekey: SITE_KEY,
          language: "es",
          appearance: "interaction-only",
        });
      })
      .catch(() => {
        // Sin el script el formulario igual se envía; el servidor decide.
      });
    return () => {
      vigente = false;
      // Al salir de la página React ya quitó la caja: borrarla de nuevo solo
      // llena la consola de avisos de Turnstile.
      if (widget.current && window.turnstile && el.isConnected) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, [reinicio]);

  if (!SITE_KEY) return null;
  // Centrada: la casilla de Cloudflare mide 300 px y pegada a la izquierda
  // se veía descuadrada bajo campos que ocupan todo el ancho.
  return <div ref={caja} className="flex justify-center" />;
}
