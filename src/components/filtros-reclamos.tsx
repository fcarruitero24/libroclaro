"use client";

import Link from "next/link";
import { useRef } from "react";
import { Input, Select } from "@/components/ui";
import { CATEGORIAS } from "@/lib/categorias";

export interface Filtros {
  q: string;
  estado: string;
  tipo: string;
  cat: string;
  desde: string;
  hasta: string;
  orden: string;
}

/**
 * Filtros de la bandeja. Es un formulario GET normal: sin JavaScript
 * funciona con el botón "Filtrar". Con JavaScript, cambiar un selector o
 * una fecha lo envía solo; la búsqueda espera a Enter o al botón para no
 * recargar con cada letra.
 */
export function FiltrosReclamos({ action, filtros }: { action: string; filtros: Filtros }) {
  const form = useRef<HTMLFormElement>(null);
  const enviar = () => form.current?.requestSubmit();
  const hayFiltros = Boolean(filtros.q || filtros.tipo || filtros.cat || filtros.desde || filtros.hasta);

  return (
    <form
      ref={form}
      action={action}
      method="get"
      // Los campos vacíos no viajan: la URL queda corta y fácil de compartir.
      onSubmit={(e) => {
        for (const el of Array.from(e.currentTarget.elements)) {
          if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.name && !el.value) el.disabled = true;
        }
      }}
      className="flex flex-wrap items-end gap-2"
    >
      {/* El estado se elige con las pestañas de arriba; aquí solo se conserva. */}
      {filtros.estado && <input type="hidden" name="estado" value={filtros.estado} />}

      <div className="relative w-full">
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m17 17-3.5-3.5" />
        </svg>
        <Input
          type="search"
          name="q"
          defaultValue={filtros.q}
          placeholder="Buscar por nombre, documento o N.º de hoja"
          aria-label="Buscar reclamos"
          className="pl-9"
        />
      </div>

      {/* Los controles base ocupan todo el ancho (w-full): el contenedor fija
          cuánto mide cada uno. */}
      <div className="w-full sm:w-44">
        <Select name="tipo" defaultValue={filtros.tipo} onChange={enviar} aria-label="Tipo">
          <option value="">Reclamos y quejas</option>
          <option value="reclamo">Solo reclamos</option>
          <option value="queja">Solo quejas</option>
        </Select>
      </div>

      <div className="w-full sm:w-60">
        <Select name="cat" defaultValue={filtros.cat} onChange={enviar} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
          <option value="sin">Sin categoría</option>
        </Select>
      </div>

      <label className="w-[calc(50%-0.25rem)] text-xs text-slate-500 sm:w-40">
        <span className="mb-1 block">Desde</span>
        <Input type="date" name="desde" defaultValue={filtros.desde} onChange={enviar} />
      </label>
      <label className="w-[calc(50%-0.25rem)] text-xs text-slate-500 sm:w-40">
        <span className="mb-1 block">Hasta</span>
        <Input type="date" name="hasta" defaultValue={filtros.hasta} onChange={enviar} />
      </label>

      <div className="w-full sm:w-48">
        <Select name="orden" defaultValue={filtros.orden} onChange={enviar} aria-label="Orden">
          <option value="">Más recientes primero</option>
          <option value="plazo">Vencen primero</option>
        </Select>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Filtrar
      </button>
      {hayFiltros && (
        <Link
          href={filtros.estado ? `${action}?estado=${filtros.estado}` : action}
          className="px-2 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          Limpiar
        </Link>
      )}
    </form>
  );
}
