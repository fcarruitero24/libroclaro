"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/cn";

type Estilo = "oficial" | "compacto" | "texto";

/**
 * Los tres formatos del aviso que el negocio pega en su propia web.
 *
 * El oficial es la propia ilustración del Anexo III del D.S. 011-2011-PCM,
 * extraída del documento que publica INDECOPI, no un dibujo parecido: solo el
 * título y el libro abierto, sin el párrafo ni el correo que sí lleva el
 * Anexo II de los locales físicos.
 * Va primero y es el recomendado, porque es el único que cumple el formato.
 *
 * El compacto y el de texto son comodidades de diseño, no formatos oficiales:
 * van como código en línea y usan currentColor, así heredan el color del sitio
 * donde se peguen.
 */

function escaparAtributo(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const LIBRO_SVG =
  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 5h4c2 0 4 .7 5 2v13c-1-1.3-3-2-5-2H3z"/>' +
  '<path d="M21 5h-4c-2 0-4 .7-5 2v13c1-1.3 3-2 5-2h4z"/>' +
  "</svg>";

function snippetOficial(url: string, avisoUrl: string): string {
  return `<a href="${escaparAtributo(url)}" target="_blank" rel="noopener" title="Libro de Reclamaciones">
  <img src="${escaparAtributo(avisoUrl)}" alt="Libro de Reclamaciones" width="220" height="132" />
</a>`;
}

function snippetCompacto(url: string): string {
  const u = escaparAtributo(url);
  return `<a href="${u}" target="_blank" rel="noopener" title="Libro de Reclamaciones"
   style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;color:inherit;text-decoration:none">
  ${LIBRO_SVG}
  <span style="font-size:13px">Libro de Reclamaciones</span>
</a>`;
}

function snippetTexto(url: string): string {
  return `<a href="${escaparAtributo(url)}" target="_blank" rel="noopener">Libro de Reclamaciones</a>`;
}

const OPCIONES: { id: Estilo; titulo: string; para: string }[] = [
  {
    id: "oficial",
    titulo: "Oficial",
    para:
      "Es la imagen del Anexo III del reglamento tal como la publica INDECOPI, el formato que la norma define para portales web. Es el recomendado.",
  },
  {
    id: "compacto",
    titulo: "Compacto",
    para: "Versión reducida que hereda el color de tu web. Cómoda para pies de página, pero no es el formato oficial.",
  },
  {
    id: "texto",
    titulo: "Solo texto",
    para: "Un enlace más entre los legales. Es lo mínimo y tampoco es el formato oficial.",
  },
];

export function AvisoOpciones({
  publicUrl,
  avisoUrl,
  avisoLocalUrl,
  avisoA4Href,
}: {
  publicUrl: string;
  avisoUrl: string;
  avisoLocalUrl: string;
  /** Página con el A4 que lleva la razón social y el QR del negocio. */
  avisoA4Href?: string;
}) {
  const [estilo, setEstilo] = useState<Estilo>("oficial");

  const codigo =
    estilo === "oficial"
      ? snippetOficial(publicUrl, avisoUrl)
      : estilo === "compacto"
        ? snippetCompacto(publicUrl)
        : snippetTexto(publicUrl);

  const activo = OPCIONES.find((o) => o.id === estilo)!;

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {OPCIONES.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setEstilo(o.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition duration-200 ease-out",
              estilo === o.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {o.titulo}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-600">{activo.para}</p>

      {estilo !== "oficial" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Si te fiscalizan, el formato que respalda tu cumplimiento es el oficial. Usa este solo si el diseño de tu web
          no admite el otro.
        </p>
      )}

      <div className="rounded-lg border border-dashed border-slate-300 p-4">
        <p className="mb-3 text-xs text-slate-500">Vista previa:</p>

        {estilo === "oficial" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avisoUrl} alt="Libro de Reclamaciones" width={220} height={132} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-4 text-center text-slate-700 ring-1 ring-slate-200">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">Sobre fondo claro</p>
              <div
                className={estilo === "texto" ? "text-sm underline" : undefined}
                dangerouslySetInnerHTML={{ __html: codigo }}
              />
            </div>
            <div className="rounded-lg bg-slate-900 p-4 text-center text-slate-200">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Sobre fondo oscuro</p>
              <div
                className={estilo === "texto" ? "text-sm underline" : undefined}
                dangerouslySetInnerHTML={{ __html: codigo }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
          {codigo}
        </pre>
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={codigo} label="Copiar código" />
          {estilo === "oficial" && (
            <a href={avisoUrl} download className="text-sm font-semibold text-teal-700 hover:underline">
              Descargar aviso web (SVG)
            </a>
          )}
          <span className="text-xs text-slate-500">Pégalo en el pie de página de tu sitio.</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-semibold text-slate-900">¿Tienes local físico?</h4>
        <p className="mt-1 text-sm text-slate-600">
          Ahí va otro aviso distinto, el del Anexo II: lleva además el párrafo del Código y el correo de INDECOPI, y la
          norma exige que mida como mínimo una hoja A4. Este archivo usa la misma ilustración oficial y ya viene en ese tamaño exacto, listo para imprimir.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {avisoA4Href && (
            <a
              href={avisoA4Href}
              className="inline-flex rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Aviso A4 con tu razón social y tu QR
            </a>
          )}
          <a href={avisoLocalUrl} download className="text-sm font-semibold text-teal-700 hover:underline">
            {avisoA4Href ? "o el genérico (SVG)" : "Descargar aviso para imprimir (A4)"}
          </a>
        </div>
      </div>
    </div>
  );
}
