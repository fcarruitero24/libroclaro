"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/cn";

type Estilo = "compacto" | "completo" | "texto";

/**
 * Los tres formatos del aviso que el negocio pega en su propia web.
 *
 * El compacto y el de texto van como código en línea y usan currentColor,
 * así heredan el color del sitio donde se peguen. El completo es un archivo
 * de imagen alojado en nuestro servidor: se ve igual en todos lados, pero
 * no puede cambiar de color.
 */

function escaparAtributo(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const LIBRO_SVG =
  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 5h4c2 0 4 .7 5 2v13c-1-1.3-3-2-5-2H3z"/>' +
  '<path d="M21 5h-4c-2 0-4 .7-5 2v13c1-1.3 3-2 5-2h4z"/>' +
  "</svg>";

function snippetCompacto(url: string): string {
  const u = escaparAtributo(url);
  return `<a href="${u}" target="_blank" rel="noopener" title="Libro de Reclamaciones"
   style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;color:inherit;text-decoration:none">
  ${LIBRO_SVG}
  <span style="font-size:13px">Libro de Reclamaciones</span>
</a>`;
}

function snippetCompleto(url: string, avisoUrl: string): string {
  return `<a href="${escaparAtributo(url)}" target="_blank" rel="noopener" title="Libro de Reclamaciones">
  <img src="${escaparAtributo(avisoUrl)}" alt="Libro de Reclamaciones" width="240" height="90" />
</a>`;
}

function snippetTexto(url: string): string {
  return `<a href="${escaparAtributo(url)}" target="_blank" rel="noopener">Libro de Reclamaciones</a>`;
}

const OPCIONES: { id: Estilo; titulo: string; para: string }[] = [
  { id: "compacto", titulo: "Compacto", para: "Se adapta al color de tu web. Ideal para pies de página modernos." },
  { id: "completo", titulo: "Completo", para: "El aviso con el texto de la norma. Se nota más." },
  { id: "texto", titulo: "Solo texto", para: "Un enlace más entre los legales. Nunca desentona." },
];

export function AvisoOpciones({ publicUrl, avisoUrl }: { publicUrl: string; avisoUrl: string }) {
  const [estilo, setEstilo] = useState<Estilo>("compacto");

  const codigo =
    estilo === "compacto"
      ? snippetCompacto(publicUrl)
      : estilo === "completo"
        ? snippetCompleto(publicUrl, avisoUrl)
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

      {/* Vista previa */}
      <div className="rounded-lg border border-dashed border-slate-300 p-4">
        <p className="mb-3 text-xs text-slate-500">Vista previa:</p>

        {estilo === "completo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avisoUrl} alt="Libro de Reclamaciones" width={240} height={90} />
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
          {estilo === "completo" && (
            <a href={avisoUrl} download className="text-sm font-semibold text-blue-700 hover:underline">
              Descargar aviso (SVG)
            </a>
          )}
          <span className="text-xs text-slate-500">Pégalo en el pie de página de tu sitio.</span>
        </div>
      </div>
    </div>
  );
}
