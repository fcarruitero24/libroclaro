import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/icons";

/** Índice para la cascada del reveal: lo lee `--i` en globals.css. */
const paso = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * Normas en las que se basa el producto, con enlace a su texto en gob.pe
 * (enlaces comprobados el 2026-09-28).
 *
 * Se citan las normas y no se muestran logos de INDECOPI ni de la PCM: esas
 * entidades no certifican ni respaldan plataformas de libro de reclamaciones,
 * y su logo daría a entender que sí, lo que puede sancionarse como
 * publicidad engañosa.
 */
const NORMAS: { icon: IconName; numero: string; nombre: string; detalle: string; href: string }[] = [
  {
    icon: "balanza",
    numero: "Ley N.º 29571",
    nombre: "Código de Protección y Defensa del Consumidor",
    detalle: "Obliga a todo proveedor a tener un Libro de Reclamaciones, físico o virtual (art. 150).",
    href: "https://www.gob.pe/institucion/indecopi/normas-legales/1244218-29571",
  },
  {
    icon: "archivo",
    numero: "D.S. N.º 011-2011-PCM",
    nombre: "Reglamento del Libro de Reclamaciones",
    detalle: "Define la hoja de reclamación, el aviso y la obligación de conservar las hojas por dos años.",
    href: "https://www.gob.pe/institucion/presidencia/normas-legales/541080-011-2011-pcm",
  },
  {
    icon: "reloj",
    numero: "D.S. N.º 101-2022-PCM",
    nombre: "Modificación del Reglamento",
    detalle: "Fija el plazo de 15 días hábiles para responder cada reclamo o queja.",
    href: "https://www.gob.pe/institucion/pcm/normas-legales/3346742-101-2022-pcm",
  },
];

const AVISO_OFICIAL = "https://consumidor.gob.pe/wp-content/uploads/2020/07/Aviso_LR-1.pdf";

export function NormativaPeruana() {
  return (
    <section className="border-y border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-12">
        <div className="reveal md:col-span-4">
          <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900 sm:text-4xl">
            Hecho según la normativa peruana
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Cada parte de tu libro sigue lo que piden el Código del Consumidor y el Reglamento. Puedes revisar cada
            norma en la plataforma oficial del Estado.
          </p>
          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            LibroClaro es un servicio privado: no pertenece a INDECOPI ni a ninguna entidad del Estado.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 md:col-span-8">
          {NORMAS.map((n, i) => (
            <li key={n.numero} style={paso(i)} className="reveal">
              <a
                href={n.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col rounded-2xl bg-[#faf7f2] p-5 ring-1 ring-stone-200 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:sombra-tarjeta-alta"
              >
                <span className="flex items-center gap-2 text-teal-700">
                  <Icon name={n.icon} className="h-5 w-5" />
                  <span className="text-xs font-bold tracking-wide uppercase">{n.numero}</span>
                </span>
                <span className="mt-3 font-semibold text-slate-900">{n.nombre}</span>
                <span className="mt-1.5 text-sm leading-relaxed text-slate-600">{n.detalle}</span>
                <span className="mt-auto pt-4 text-sm font-semibold text-teal-700 group-hover:underline">
                  Ver la norma en gob.pe <span aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}

          <li style={paso(3)} className="reveal">
            <a
              href={AVISO_OFICIAL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-2xl bg-[#faf7f2] p-5 ring-1 ring-stone-200 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:sombra-tarjeta-alta"
            >
              <span className="flex items-center gap-2 text-teal-700">
                <Icon name="aviso" className="h-5 w-5" />
                <span className="text-xs font-bold tracking-wide uppercase">Formato oficial</span>
              </span>
              <span className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/aviso-libro-reclamaciones.svg"
                  alt="Aviso oficial del Libro de Reclamaciones"
                  width={176}
                  height={105}
                  loading="lazy"
                  className="h-14 w-auto shrink-0"
                />
                <span className="font-semibold text-slate-900">El aviso de tu libro, tal como lo publica INDECOPI</span>
              </span>
              <span className="mt-auto pt-4 text-sm font-semibold text-teal-700 group-hover:underline">
                Ver el formato oficial <span aria-hidden="true">↗</span>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
