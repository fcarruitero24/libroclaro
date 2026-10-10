"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icons";
import { Alert, Button, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { respondComplaint } from "@/lib/actions/complaints";
import { pedirBorradorLibIA } from "@/lib/actions/libia";
import { avisoDeIA, huecosPendientes, mensajeMientrasEscribe, NOTA_MAXIMA, textoQuedan } from "@/lib/libia";
import type { ActionState, Complaint, ResponseTemplate } from "@/lib/types";

const initial: ActionState = {};

/** Reemplaza las variables de una plantilla con los datos de esta hoja. */
function rellenar(texto: string, c: Complaint, negocio: string) {
  return texto
    .replaceAll("{nombre}", c.consumer_name.split(" ")[0] ?? c.consumer_name)
    .replaceAll("{nombre_completo}", c.consumer_name)
    .replaceAll("{codigo}", c.code)
    // "S.A.C." seguido del punto de la plantilla daría "S.A.C..".
    .replaceAll("{negocio}.", negocio.endsWith(".") ? negocio : `${negocio}.`)
    .replaceAll("{negocio}", negocio);
}

/**
 * Botón que guarda con un estado concreto. El estado viaja como el valor
 * del propio botón (la Server Action lo lee de `status`), así no hace
 * falta un selector: "Enviar respuesta" marca respondido y "Guardar
 * borrador" deja el reclamo en proceso. El spinner sale solo en el botón
 * que se presionó, no en todos.
 */
function BotonEstado({
  estado,
  children,
  className,
  variant,
  bloqueado = false,
}: {
  estado: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  /** Mientras LibIA escribe no se guarda nada: el texto todavía va a cambiar. */
  bloqueado?: boolean;
}) {
  const { pending, data } = useFormStatus();
  const esteBoton = pending && data?.get("status") === estado;
  return (
    <Button
      type="submit"
      name="status"
      value={estado}
      variant={variant}
      disabled={pending || bloqueado}
      aria-busy={esteBoton}
      className={cn("relative", className)}
    >
      <span className={esteBoton ? "invisible" : undefined}>{children}</span>
      {esteBoton && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 animate-spin">
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
            <path d="M18 10a8 8 0 0 0-8-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Guardando…</span>
        </span>
      )}
    </Button>
  );
}

// Anchos de las líneas del velo: que parezcan un párrafo.
const LINEAS = ["w-11/12", "w-full", "w-10/12", "w-full", "w-8/12", "w-5/12"];

/**
 * El velo que cubre la caja de respuesta mientras LibIA escribe: líneas que
 * brillan y un mensaje que avanza con los segundos de espera. Lo que hubiera
 * escrito el dueño queda debajo, intacto si LibIA falla. Los lectores de
 * pantalla oyen el aviso del formulario, no estos mensajes.
 */
function LibIAEscribiendo() {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const reloj = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(reloj);
  }, []);
  const mensaje = mensajeMientrasEscribe(segundos);
  return (
    <div
      aria-hidden="true"
      className="libia-velo absolute inset-0 z-10 rounded-lg border border-teal-200 bg-white/95 p-3 backdrop-blur-[2px]"
    >
      <p key={mensaje} className="libia-mensaje text-sm font-medium text-teal-800">
        {mensaje}
      </p>
      <div className="mt-3 space-y-2.5">
        {LINEAS.map((ancho, i) => (
          <div key={i} className={cn("esqueleto libia-esqueleto h-2.5 rounded-full", ancho)} />
        ))}
      </div>
    </div>
  );
}

export function ResponseForm({
  complaint,
  businessName,
  bizId,
  templates,
  libia,
}: {
  complaint: Complaint;
  businessName: string;
  bizId: string;
  /** null = el plan no incluye plantillas. */
  templates: ResponseTemplate[] | null;
  /** LibIA: si el plan la incluye, cuántos borradores le quedan hoy y si ya se usó en este reclamo. */
  libia: { incluido: boolean; quedan: number; usado: boolean };
}) {
  const [state, action] = useActionState(respondComplaint, initial);
  const [texto, setTexto] = useState(complaint.response ?? "");
  const [vista, setVista] = useState(false);
  const respondido = complaint.status === "respondido" || complaint.status === "cerrado";

  // LibIA. El borrador entra en la caja de texto; si el dueño ya había escrito
  // algo, se guarda para "Deshacer". Pedir otra versión de un borrador que no
  // se tocó conserva el texto propio de antes, no el borrador anterior.
  const [nota, setNota] = useState("");
  const [generando, setGenerando] = useState(false);
  const [quedan, setQuedan] = useState(libia.quedan);
  const [avisoLibIA, setAvisoLibIA] = useState<{ texto: string; conPlan: boolean; tope: boolean } | null>(null);
  const [ultimoBorrador, setUltimoBorrador] = useState<string | null>(null);
  const [anterior, setAnterior] = useState<string | null>(null);
  const [usoLibIA, setUsoLibIA] = useState(libia.usado);
  // Viene marcada, salvo que la respuesta ya se haya enviado antes sin el aviso.
  const [conIA, setConIA] = useState(!(respondido && !complaint.respuesta_con_ia));
  const [errorHuecos, setErrorHuecos] = useState<string | null>(null);
  // Al llegar un borrador: la cortina que lo destapa y el destello de la caja.
  const [revelar, setRevelar] = useState(false);
  // Lo que oyen los lectores de pantalla. Los errores ya los anuncia el Alert.
  const [anuncio, setAnuncio] = useState("");
  const esBorradorLibIA = ultimoBorrador !== null && texto === ultimoBorrador;

  async function pedirBorrador() {
    setGenerando(true);
    setAvisoLibIA(null);
    setRevelar(false);
    // El velo de "LibIA está escribiendo" va sobre la caja, no sobre la vista previa.
    setVista(false);
    setAnuncio("LibIA está escribiendo un borrador.");
    try {
      const r = await pedirBorradorLibIA({ complaintId: complaint.id, businessId: complaint.business_id, nota });
      if (r.ok) {
        if (!esBorradorLibIA) setAnterior(texto.trim() ? texto : null);
        setTexto(r.texto);
        setUltimoBorrador(r.texto);
        setQuedan(r.quedan);
        setUsoLibIA(true);
        // Un texto nuevo de LibIA vuelve a llevar el aviso por defecto, aunque
        // una respuesta anterior se haya enviado sin él.
        setConIA(true);
        setErrorHuecos(null);
        setRevelar(true);
        setAnuncio("LibIA terminó el borrador. Revísalo antes de enviarlo.");
      } else {
        setAvisoLibIA({
          texto: r.mensaje,
          conPlan: r.motivo === "sin_plan",
          tope: r.motivo === "tope_negocio" || r.motivo === "tope_global",
        });
        setAnuncio("");
      }
    } catch {
      setAvisoLibIA({ texto: "LibIA no pudo escribir ahora. Inténtalo de nuevo.", conPlan: false, tope: false });
      setAnuncio("");
    } finally {
      setGenerando(false);
    }
  }

  function deshacer() {
    setTexto(anterior ?? "");
    setAnterior(null);
    setUltimoBorrador(null);
    setRevelar(false);
  }

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        // El mismo control que hace el servidor: un borrador a medio completar
        // no se envía. Guardarlo como borrador sí se puede.
        const estado = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
        const huecos = huecosPendientes(texto);
        if ((estado === "respondido" || estado === "cerrado") && huecos.length > 0) {
          e.preventDefault();
          setErrorHuecos(`Completa las partes entre corchetes antes de enviar: ${huecos.join(", ")}.`);
        } else {
          setErrorHuecos(null);
        }
      }}
    >
      <input type="hidden" name="id" value={complaint.id} />
      <input type="hidden" name="business_id" value={complaint.business_id} />
      <p role="status" className="sr-only">
        {anuncio}
      </p>

      {libia.incluido ? (
        // Borde con degradado: el fondo de afuera asoma por el px de relleno.
        <div className="rounded-xl bg-gradient-to-br from-teal-300 via-teal-100 to-cyan-300 p-px shadow-[0_10px_28px_-16px_rgb(15_118_110/0.5)]">
          <div className="space-y-2.5 rounded-[11px] bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-3.5">
            <p className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm">
                <Icon name="chispa" className="h-4 w-4" />
              </span>
              <span>
                Pedirle una propuesta a <span className="text-teal-700">LibIA</span>
              </span>
            </p>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="libia-nota" className="text-xs font-medium text-slate-600">
                  ¿Algo que LibIA deba saber? (opcional)
                </label>
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    nota.length > NOTA_MAXIMA - 50 ? "text-amber-700" : "text-slate-500",
                  )}
                >
                  {nota.length} / {NOTA_MAXIMA}
                </span>
              </div>
              <Textarea
                id="libia-nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={NOTA_MAXIMA}
                placeholder="Ej.: Ya le devolvimos el dinero el 5 de octubre."
                className="min-h-16"
                disabled={generando}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Antes del primer borrador es la acción principal; después, lo
                  que sigue es revisar y enviar, y pedir otra versión pasa a
                  segundo plano. Mientras escribe no se atenúa: la chispa que
                  titila es la señal de que está trabajando. */}
              <Button
                type="button"
                variant={ultimoBorrador === null ? "primary" : "secondary"}
                onClick={pedirBorrador}
                disabled={generando}
                aria-busy={generando}
                className={cn(
                  ultimoBorrador === null && "btn-brillo",
                  generando && "disabled:cursor-progress! disabled:opacity-100!",
                )}
              >
                <Icon name="chispa" className={cn("h-4 w-4 shrink-0", generando && "libia-chispa-activa")} />
                {generando ? "LibIA está escribiendo…" : ultimoBorrador !== null ? "Pedir otra versión" : "Escribir borrador"}
              </Button>
              <span className="text-xs text-slate-500">{textoQuedan(quedan)}</span>
            </div>
            <p className="text-xs text-slate-500">
              LibIA lee el reclamo, sin documento ni datos de contacto, y te propone un texto. Revísalo siempre.
            </p>
            {avisoLibIA && (
              <Alert kind={avisoLibIA.tope ? "info" : "error"}>
                {avisoLibIA.texto}
                {avisoLibIA.conPlan && (
                  <>
                    {" "}
                    <Link href={`/app/${bizId}/plan`} className="font-semibold underline">
                      Ver planes
                    </Link>
                  </>
                )}
              </Alert>
            )}
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500">
          <Icon name="chispa" className="h-4 w-4 shrink-0 text-slate-400" />
          Pedirle una propuesta a LibIA
          <Link href={`/app/${bizId}/plan`} className="ml-auto text-xs font-semibold text-teal-700 hover:underline">
            LibIA (Pro)
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <label htmlFor="response" className="text-sm font-semibold text-slate-900">
          Respuesta al cliente
        </label>
        {templates === null ? (
          <Link href={`/app/${bizId}/plan`} className="text-xs font-semibold text-teal-700 hover:underline">
            Plantillas (Pro)
          </Link>
        ) : templates.length === 0 ? (
          <Link href={`/app/${bizId}/plantillas`} className="text-xs font-semibold text-teal-700 hover:underline">
            Crear una plantilla
          </Link>
        ) : (
          <select
            aria-label="Usar una plantilla"
            value=""
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) setTexto(rellenar(t.body, complaint, businessName));
            }}
            disabled={generando}
            className="max-w-[11rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="">Usar plantilla…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {errorHuecos && <Alert kind="error">{errorHuecos}</Alert>}
      {!errorHuecos && state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}

      {/* "Deshacer" sigue a mano aunque el dueño ya haya empezado a corregir el
          borrador, y se apaga mientras LibIA escribe: si no, el texto propio
          se perdería al llegar la otra versión. */}
      {(esBorradorLibIA || anterior !== null) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
          <span>Borrador de LibIA: revísalo antes de enviarlo</span>
          {anterior !== null && (
            <button
              type="button"
              onClick={deshacer}
              disabled={generando}
              className="font-semibold underline hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deshacer
            </button>
          )}
        </div>
      )}

      {vista ? (
        // Cómo le llega al consumidor: mismo asunto y bloque que el correo real.
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Asunto:</span> Respuesta a tu reclamo N.º {complaint.code} ·{" "}
            {businessName}
          </p>
          <div className="mt-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-700">
              <strong>{businessName}</strong> ha respondido a tu hoja de reclamación <strong>N.º {complaint.code}</strong>:
            </p>
            <blockquote className="mt-3 whitespace-pre-wrap border-l-4 border-green-600 bg-slate-50 px-3 py-2 text-slate-700">
              {texto || "(todavía sin texto)"}
            </blockquote>
            {(usoLibIA || complaint.respuesta_con_ia) && conIA && (
              <p className="mt-2 text-xs text-slate-500">{avisoDeIA(businessName)}</p>
            )}
            <p className="mt-3 text-xs text-slate-500">Si no estás conforme con la respuesta, puedes acudir a INDECOPI.</p>
          </div>
          {/* El texto viaja igual aunque la vista previa esté abierta. */}
          <input type="hidden" name="response" value={texto} />
        </div>
      ) : (
        <div className="relative">
          <Textarea
            id="response"
            name="response"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Estimado(a) cliente, hemos revisado su ${complaint.kind === "queja" ? "queja" : "reclamo"} y…`}
            className="block min-h-56"
            maxLength={5000}
            readOnly={generando}
            aria-busy={generando}
          />
          {generando && <LibIAEscribiendo />}
          {revelar && (
            <>
              {/* La cortina se recorta al borde de adentro de la caja y el
                  destello la rodea por fuera. Cuando el destello termina,
                  se desmontan los dos. */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-px overflow-hidden rounded-[7px]">
                <span className="libia-cortina absolute inset-x-0 top-0 h-[200%]" />
              </span>
              <span
                aria-hidden="true"
                onAnimationEnd={() => setRevelar(false)}
                className="libia-destello pointer-events-none absolute -inset-1 rounded-xl"
              />
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          onClick={() => {
            setVista((v) => !v);
            // Al volver a la caja no se repite la entrada del borrador.
            setRevelar(false);
          }}
          className="font-semibold text-teal-700 hover:underline"
        >
          {vista ? "Seguir editando" : "Vista previa del correo"}
        </button>
        <span className={texto.length > 4800 ? "text-amber-700" : undefined}>{texto.length} / 5000</span>
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-4 w-4 rounded border-slate-300" />
        <span>
          Enviar por correo a <span className="font-medium text-slate-800">{complaint.consumer_email}</span>
        </span>
      </label>

      {/* También si la respuesta ya lleva el aviso aunque falte el evento de
          LibIA: sin la casilla, el próximo guardado lo quitaría en silencio. */}
      {(usoLibIA || complaint.respuesta_con_ia) && (
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            name="con_ia"
            checked={conIA}
            onChange={(e) => setConIA(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>Indicar que se redactó con ayuda de inteligencia artificial</span>
        </label>
      )}

      <BotonEstado estado={respondido ? complaint.status : "respondido"} className="w-full py-3" bloqueado={generando}>
        {respondido ? "Actualizar respuesta" : "Enviar respuesta"}
      </BotonEstado>

      {!respondido && (
        <BotonEstado estado="en_proceso" variant="secondary" className="w-full" bloqueado={generando}>
          Guardar borrador
        </BotonEstado>
      )}

      {/* Lo que casi nunca se usa queda plegado, para que la decisión
          normal sea un solo botón. */}
      <details className="group text-xs">
        <summary className="cursor-pointer list-none font-semibold text-slate-500 hover:text-slate-800">
          <span className="inline-block transition-transform group-open:rotate-90">›</span> Más opciones
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {complaint.status !== "cerrado" && (
            <BotonEstado estado="cerrado" variant="ghost" className="px-2 py-1.5 text-xs" bloqueado={generando}>
              Marcar como cerrado
            </BotonEstado>
          )}
          {respondido && (
            <BotonEstado estado="pendiente" variant="ghost" className="px-2 py-1.5 text-xs" bloqueado={generando}>
              Reabrir (volver a pendiente)
            </BotonEstado>
          )}
        </div>
        <p className="mt-2 text-slate-500">
          Si corriges una respuesta ya enviada, la versión anterior queda en el historial.
        </p>
      </details>
    </form>
  );
}
