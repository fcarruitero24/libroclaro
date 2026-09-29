"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/logo";
import { Etiqueta, MenuLateral } from "@/components/panel-menu";
import { TutorialPanel } from "@/components/tutorial-panel";
import { Badge } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { marcarTutorialVisto } from "@/lib/actions/tutorial";
import { cn } from "@/lib/cn";
import { COOKIE_MENU } from "@/lib/panel-prefs";

type Negocio = { id: string; name: string; plan: string; gratis: boolean };

/**
 * Armazón del panel de un negocio.
 *
 * - Computadora: menú lateral fijo que se pliega a solo íconos. La
 *   preferencia se guarda en una cookie y el servidor ya la pinta así.
 * - Celular y tablet: barra superior con ☰ que abre el mismo menú como
 *   panel deslizable desde la izquierda.
 * - Tutorial de 5 pasos la primera vez (y cuando se pide desde el menú).
 */
export function PanelShell({
  negocio,
  abiertos,
  email,
  publicUrl,
  plegadoInicial,
  verTutorial,
  children,
}: {
  negocio: Negocio;
  abiertos: number;
  email: string;
  publicUrl: string;
  plegadoInicial: boolean;
  verTutorial: boolean;
  children: React.ReactNode;
}) {
  const [plegado, setPlegado] = useState(plegadoInicial);
  const [cajon, setCajon] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const botonCajon = useRef<HTMLButtonElement>(null);
  const primerEnlace = useRef<HTMLDivElement>(null);

  const alternarPlegado = () => {
    const nuevo = !plegado;
    setPlegado(nuevo);
    document.cookie = `${COOKIE_MENU}=${nuevo ? "plegado" : "abierto"}; path=/; max-age=31536000; samesite=lax`;
  };

  // Primera visita: el tutorial arranca solo, apenas se asienta la página.
  useEffect(() => {
    if (!verTutorial) return;
    const t = window.setTimeout(() => setTutorial(true), 700);
    return () => window.clearTimeout(t);
  }, [verTutorial]);

  const cerrarTutorial = useCallback(() => {
    setTutorial(false);
    void marcarTutorialVisto();
  }, []);

  const cerrarCajon = useCallback(() => {
    setCajon(false);
    botonCajon.current?.focus();
  }, []);

  // Con el cajón abierto: Esc lo cierra y el foco entra al menú.
  useEffect(() => {
    if (!cajon) return;
    primerEnlace.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrarCajon();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cajon, cerrarCajon]);

  return (
    <div className="lg:flex lg:min-h-screen">
      {/* ---------- Menú lateral (computadora) ---------- */}
      <aside
        className={cn(
          "no-print hidden border-r border-slate-200 bg-white transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0 lg:flex-col",
          plegado ? "lg:w-[76px]" : "lg:w-64",
        )}
      >
        <div className={cn("flex items-center pt-5 pb-4", plegado ? "justify-center px-2" : "px-5")}>
          {plegado ? (
            <Link href="/app" aria-label="LibroClaro, ir al panel" className="rounded-lg p-1">
              <LogoMark className="h-7 w-7" />
            </Link>
          ) : (
            <Logo href="/app" />
          )}
        </div>

        {plegado ? (
          <div className="group relative mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
            {negocio.name.trim().charAt(0).toUpperCase()}
            <Etiqueta>{negocio.name}</Etiqueta>
          </div>
        ) : (
          <TarjetaNegocio negocio={negocio} className="mx-3 mb-4" />
        )}

        <div className={cn("flex-1 px-3", plegado ? "overflow-visible" : "overflow-y-auto")}>
          <MenuLateral bizId={negocio.id} abiertos={abiertos} colapsado={plegado} />
          <div className="my-4 border-t border-slate-100" />
          <EnlacesSecundarios publicUrl={publicUrl} plegado={plegado} onTutorial={() => setTutorial(true)} />
        </div>

        <div className="border-t border-slate-100 p-3">
          {!plegado && (
            <p className="truncate px-3 text-xs text-slate-500" title={email}>
              {email}
            </p>
          )}
          <form action={signOut} className="mt-1">
            <BotonMenu icono="salir" plegado={plegado} type="submit">
              Salir
            </BotonMenu>
          </form>
          <BotonMenu
            icono="plegar"
            plegado={plegado}
            onClick={alternarPlegado}
            aria-expanded={!plegado}
            girarIcono={plegado}
          >
            {plegado ? "Desplegar menú" : "Plegar menú"}
          </BotonMenu>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ---------- Barra superior (celular y tablet) ---------- */}
        <div className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6 lg:hidden">
          <button
            ref={botonCajon}
            type="button"
            onClick={() => setCajon(true)}
            aria-label="Abrir menú"
            aria-expanded={cajon}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 active:scale-95"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <Logo href="/app" />
          <span className="w-10" aria-hidden="true" />
        </div>

        {children}
      </div>

      {/* ---------- Cajón del menú (celular y tablet) ---------- */}
      <div className={cn("no-print fixed inset-0 z-50 lg:hidden", !cajon && "pointer-events-none")} inert={!cajon}>
        <div
          aria-hidden="true"
          onClick={cerrarCajon}
          className={cn("absolute inset-0 bg-slate-900/40 transition-opacity duration-200", cajon ? "opacity-100" : "opacity-0")}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú del panel"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]",
            cajon ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <Logo href="/app" />
            <button
              type="button"
              onClick={cerrarCajon}
              aria-label="Cerrar menú"
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 active:scale-95"
            >
              <Icon name="cerrar" className="h-5 w-5" />
            </button>
          </div>
          <TarjetaNegocio negocio={negocio} className="mx-3 mb-4" />
          <div ref={primerEnlace} className="flex-1 overflow-y-auto px-3">
            <MenuLateral bizId={negocio.id} abiertos={abiertos} onNavegar={() => setCajon(false)} />
            <div className="my-4 border-t border-slate-100" />
            <EnlacesSecundarios
              publicUrl={publicUrl}
              plegado={false}
              onNavegar={() => setCajon(false)}
              onTutorial={() => {
                setCajon(false);
                setTutorial(true);
              }}
            />
          </div>
          <div className="border-t border-slate-100 p-3">
            <p className="truncate px-3 text-xs text-slate-500">{email}</p>
            <form action={signOut} className="mt-1">
              <BotonMenu icono="salir" plegado={false} type="submit">
                Salir
              </BotonMenu>
            </form>
          </div>
        </div>
      </div>

      <TutorialPanel abierto={tutorial} onCerrar={cerrarTutorial} />
    </div>
  );
}

function TarjetaNegocio({ negocio, className }: { negocio: Negocio; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-slate-50 px-3 py-2.5", className)}>
      <p className="truncate text-sm font-semibold text-slate-900" title={negocio.name}>
        {negocio.name}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Badge tone={negocio.gratis ? "slate" : "teal"}>Plan {negocio.plan}</Badge>
        <Link href="/app/negocios" className="text-xs font-medium text-teal-700 hover:underline">
          Cambiar
        </Link>
      </div>
    </div>
  );
}

function EnlacesSecundarios({
  publicUrl,
  plegado,
  onNavegar,
  onTutorial,
}: {
  publicUrl: string;
  plegado: boolean;
  onNavegar?: () => void;
  onTutorial: () => void;
}) {
  const clase = cn(
    "group relative flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900",
    plegado ? "justify-center px-0" : "px-3",
  );
  const icono = "h-5 w-5 shrink-0 text-slate-400 transition-colors duration-150 group-hover:text-slate-600";
  return (
    <div className="space-y-0.5">
      <Link href="/app/negocios" onClick={onNavegar} className={clase} aria-label={plegado ? "Mis negocios" : undefined}>
        <Icon name="tienda" className={icono} />
        {plegado ? <Etiqueta>Mis negocios</Etiqueta> : "Mis negocios"}
      </Link>
      <Link
        href={publicUrl}
        target="_blank"
        data-tour="libro"
        className={clase}
        aria-label={plegado ? "Ver mi libro público" : undefined}
      >
        <Icon name="aviso" className={icono} />
        {plegado ? <Etiqueta>Ver mi libro público</Etiqueta> : "Ver mi libro público"}
      </Link>
      <button type="button" onClick={onTutorial} className={clase} aria-label={plegado ? "Ver el tutorial" : undefined}>
        <Icon name="ayuda" className={icono} />
        {plegado ? <Etiqueta>Ver el tutorial</Etiqueta> : "Ver el tutorial"}
      </button>
    </div>
  );
}

function BotonMenu({
  icono,
  plegado,
  girarIcono,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  icono: "salir" | "plegar";
  plegado: boolean;
  girarIcono?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      aria-label={plegado ? String(children) : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900",
        plegado ? "justify-center px-0" : "px-3",
      )}
    >
      <Icon
        name={icono}
        className={cn(
          "h-5 w-5 shrink-0 text-slate-400 transition duration-200 group-hover:text-slate-600",
          girarIcono && "rotate-180",
        )}
      />
      {plegado ? <Etiqueta>{children}</Etiqueta> : children}
    </button>
  );
}
