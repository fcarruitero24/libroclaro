import Link from "next/link";
import type { CSSProperties } from "react";
import { AvisoLugares } from "@/components/aviso-lugares";
import { BackToTop } from "@/components/back-to-top";
import { HeroDemo } from "@/components/hero-demo";
import { MascotaHero } from "@/components/mascota/mascota-hero";
import { HeroFondo } from "@/components/hero-fondo";
import { Icon, type IconName } from "@/components/icons";
import { PanelDemo } from "@/components/panel-demo";
import { IlusAviso, IlusRecibe, IlusRegistro } from "@/components/pasos-ilustraciones";
import { PreciosPlanes } from "@/components/precios-planes";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink } from "@/components/ui";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { WHATSAPP_NUMBER } from "@/lib/env";

/** Índice para la cascada del reveal: lo lee `--i` en globals.css. */
const paso = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * Tarjeta que reacciona al puntero: se levanta apenas y gana sombra.
 * Sin borde gris: el contorno lo da la sombra teñida (globals.css).
 */
const tarjeta =
  "rounded-2xl bg-white sombra-tarjeta transition duration-200 ease-out hover:-translate-y-0.5 hover:sombra-tarjeta-alta";

/**
 * Títulos de sección en Sora. Es ancha, así que rinde a menor tamaño que
 * una serifa condensada: con 36px ya tiene presencia, y el tracking
 * negativo la aprieta para que no se vea desparramada.
 */
const tituloSeccion =
  "font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900 sm:text-4xl";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "numero",
    title: "Numeración correlativa automática",
    text: "Cada hoja recibe un código único por año (2026-000001…), tal como exige el reglamento.",
  },
  {
    icon: "correo",
    title: "Copia al consumidor por correo",
    text: "El cliente recibe su hoja de reclamación al instante, con enlace para imprimir o guardar en PDF.",
  },
  {
    icon: "plazo",
    title: "Control del plazo de 15 días hábiles",
    text: "Contamos los días hábiles con feriados de Perú y te avisamos antes de que venza cada reclamo.",
  },
  {
    icon: "qr",
    title: "Aviso oficial y código QR",
    text: "Descarga el aviso para tu web y un QR para pegar en tu local o mostrador.",
  },
  {
    icon: "respuesta",
    title: "Respuestas documentadas",
    text: "Responde desde el panel y queda registro fechado de tu respuesta, listo para INDECOPI.",
  },
  {
    icon: "archivo",
    title: "Registro conservado",
    text: "Tus hojas quedan guardadas y exportables. Nunca más un cuaderno perdido.",
  },
];

/** Lo que corre en la cinta bajo el hero. */
const CINTA = [
  "Numeración correlativa",
  "Feriados de Perú en el plazo",
  "Copia al consumidor",
  "Aviso oficial",
  "QR para tu local",
  "Reclamos ilimitados",
  "Exportar a Excel",
  "Enlace para web y redes",
  "Hecho en Perú",
];

const FAQ = [
  {
    q: "¿Mi negocio está obligado a tener Libro de Reclamaciones?",
    a: "Sí. Todo proveedor que vende productos o servicios a consumidores en el Perú debe contar con un Libro de Reclamaciones, físico o virtual, en cada establecimiento y en su canal digital de venta (art. 150 del Código de Protección y Defensa del Consumidor y D.S. 011-2011-PCM).",
  },
  {
    q: "¿El libro virtual reemplaza al físico?",
    a: "Si vendes por internet, el libro virtual es el que corresponde a ese canal. Si además tienes un local, puedes usar el libro virtual allí, siempre que un consumidor pueda registrar su reclamo en el momento (por ejemplo, con el QR que te damos) y reciba su copia.",
  },
  {
    q: "¿Cuánto tiempo tengo para responder?",
    a: "15 días hábiles improrrogables desde que el consumidor registra el reclamo (D.S. 101-2022-PCM). LibroClaro te muestra los días que faltan y, en el plan Pro, te lo recuerda por correo.",
  },
  {
    q: "¿Qué diferencia hay entre reclamo y queja?",
    a: "El reclamo expresa disconformidad con el producto o servicio contratado. La queja expresa malestar por la atención al público, no relacionado directamente con el producto o servicio.",
  },
  {
    q: "¿Puedo empezar gratis de verdad?",
    a: "Sí. El plan Gratis incluye reclamos ilimitados, numeración legal y copia al consumidor. Solo muestra una pequeña marca «LibroClaro» en tu formulario. Cuando quieras quitarla, agregar tu logo o recibir alertas, pasas a Pro.",
  },
];

export default function HomePage() {
  return (
    <>
      <RevealOnScroll />
      <SiteHeader />
      <main className="grano flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0b1f1d]">
          <HeroFondo />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-28">
            <div className="space-y-6">
              <Badge tone="teal">Cumple con INDECOPI · D.S. 011-2011-PCM</Badge>
              {/* En md la columna es angosta (dos columnas en pantallas medianas),
                  por eso baja a 4xl; en lg, 46px es lo máximo que entra en tres
                  líneas: a 48px pasaba a cuatro. */}
              <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-5xl md:text-4xl lg:text-[2.875rem]">
                Tu Libro de Reclamaciones Virtual, listo en 5 minutos
              </h1>
              <p className="text-lg leading-relaxed text-slate-300">
                Registra tu negocio, copia el enlace en tu web o redes y recibe los reclamos ordenados, numerados y
                con el plazo legal bajo control. Sin abogados, sin cuadernos.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/registro" variant="white" className="btn-brillo px-6 py-3 text-base">
                  Crear mi libro gratis
                </ButtonLink>
                <ButtonLink
                  href="/r/demo"
                  variant="ghost"
                  className="group px-6 py-3 text-base text-teal-100 hover:bg-white/10 hover:text-white"
                >
                  Ver un ejemplo
                  <span aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-x-1">
                    →
                  </span>
                </ButtonLink>
              </div>
            </div>

            {/* La mascota flota en la esquina inferior derecha de la tarjeta,
                casi toda por fuera y con aire arriba para la mano del saludo.
                Cuánto sale a la derecha depende del margen que queda hasta el
                borde de la pantalla (el hero recorta lo que sobra): 16px hasta
                xl, 48px en xl y 112px desde 1400px. En celular no se muestra
                (decisión de Fabrizio): el componente tampoco descarga Three.js.
                El lienzo es más ancho que alto (~1,25:1) a propósito: al bajar la
                mano tras el saludo, el brazo queda estirado a la derecha, y con
                un lienzo angosto se cortaba contra el borde. El alto manda el
                tamaño del libro, así que ensanchar apenas lo agranda (~5 %). */}
            <div className="relative">
              <MascotaHero className="absolute z-30 hidden md:-right-4 md:-bottom-16 md:block md:h-[200px] md:w-[250px] xl:-right-12 xl:-bottom-20 xl:h-[225px] xl:w-[285px] min-[87.5rem]:-right-28 min-[87.5rem]:h-[250px] min-[87.5rem]:w-[315px]" />
              <HeroDemo />
            </div>
          </div>

          {/* Cinta de funciones. La segunda copia es solo para que el
              bucle empalme: el lector de pantalla lee la primera. */}
          <div className="relative z-10 border-t border-white/10 py-4">
            <div className="mask-fade-x overflow-hidden">
              <div className="anim-marquee flex w-max">
                {[0, 1].map((copia) => (
                  <ul
                    key={copia}
                    aria-hidden={copia === 1 || undefined}
                    className="flex shrink-0 items-center text-sm font-medium text-teal-100/70"
                  >
                    {CINTA.map((item) => (
                      <li key={item} className="flex items-center gap-3 px-5">
                        <span className="h-1 w-1 rounded-full bg-teal-400" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Por qué */}
        <section className="border-y border-stone-200 bg-[#faf7f2]">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
            <div className="reveal" style={paso(0)}>
              <Icon name="escudo" className="mb-3 h-7 w-7 text-teal-600" />
              <p className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-teal-800">Obligatorio</p>
              <p className="mt-2 text-sm text-slate-600">
                Para todo negocio que vende a consumidores, en el local y en su web o redes sociales.
              </p>
            </div>
            <div className="reveal" style={paso(1)}>
              <Icon name="reloj" className="mb-3 h-7 w-7 text-teal-600" />
              <p className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-teal-800">15 días hábiles</p>
              <p className="mt-2 text-sm text-slate-600">
                Plazo máximo e improrrogable para responder cada reclamo o queja.
              </p>
            </div>
            <div className="reveal" style={paso(2)}>
              <Icon name="balanza" className="mb-3 h-7 w-7 text-teal-600" />
              <p className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-teal-800">Multas</p>
              <p className="mt-2 text-sm text-slate-600">
                INDECOPI sanciona no tener el libro, no exhibir el aviso o no responder a tiempo.
              </p>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          {/* Título a la izquierda y bajada a la derecha: rompe la columna
              de títulos centrados que se repetía en toda la página. */}
          <div className="reveal grid gap-4 md:grid-cols-2 md:items-end">
            <h2 className={tituloSeccion}>Cómo funciona</h2>
            <p className="max-w-md text-lg text-slate-600 md:justify-self-end">
              Tres pasos y tu negocio queda en regla.
            </p>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "1",
                ilus: <IlusRegistro />,
                t: "Registra tu negocio",
                d: "Nombre, RUC, dirección y correo de notificaciones. Elige el enlace de tu libro: libroclaro.pe/r/tu-negocio.",
              },
              {
                n: "2",
                ilus: <IlusAviso />,
                t: "Instala el aviso",
                d: "Copia el enlace con el aviso oficial en tu web, tu perfil de Instagram o tu catálogo de WhatsApp. Imprime el QR para tu local.",
              },
              {
                n: "3",
                ilus: <IlusRecibe />,
                t: "Recibe y responde",
                d: "Cada reclamo llega numerado a tu panel con la cuenta regresiva de días hábiles. Respondes y el cliente recibe la respuesta por correo.",
              },
            ].map((s, i) => (
              <li
                key={s.n}
                style={paso(i)}
                className={`reveal group p-5 ${tarjeta}`}
              >
                {s.ilus}
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white transition duration-300 ease-out group-hover:scale-110">
                    {s.n}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900">{s.t}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Dónde va el aviso */}
        <section className="border-y border-stone-200 bg-[#faf7f2]">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <div className="reveal max-w-2xl">
              <h2 className={tituloSeccion}>Tu aviso, donde tus clientes lo vean</h2>
              <p className="mt-4 text-lg text-slate-600">
                INDECOPI te obliga a anunciar tu Libro de Reclamaciones donde atiendes. Te lo dejamos listo para los
                tres lugares, con tu razón social y tu QR.
              </p>
            </div>
            <AvisoLugares />
          </div>
        </section>

        {/* Panel */}
        <section className="relative overflow-hidden bg-[#0b1f1d]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_50%,rgba(15,118,110,0.3)_0%,transparent_70%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-5">
            <div className="reveal md:col-span-2">
              <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-4xl">
                Todos tus reclamos en un panel, con el plazo a la vista
              </h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Cada reclamo llega con su número y su cuenta regresiva de días hábiles, feriados de Perú incluidos. Ves
                de un vistazo qué vence primero y respondes desde ahí.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-teal-100">
                {[
                  "Verde, ámbar o rojo según los días que quedan",
                  "Aviso por correo antes de que venza cada plazo",
                  "Historial completo, exportable si te fiscalizan",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-300">
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
                        <path d="m2.5 6.5 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal md:col-span-3" style={paso(1)}>
              <PanelDemo />
            </div>
          </div>
        </section>

        {/* Features */}
        {/* Features. Lista editorial en vez de seis tarjetas iguales: el
            título queda fijo a la izquierda mientras se lee la lista, y cada
            punto se separa con una línea fina, sin cajas ni sombras. */}
        <section className="bg-[#faf7f2]">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-12">
            <div className="reveal md:col-span-4 md:self-start md:sticky md:top-28">
              <h2 className={tituloSeccion}>Todo lo que exige el reglamento, sin que lo pienses</h2>
              <p className="mt-4 text-lg text-slate-600">
                Diseñado a partir del formato oficial de la hoja de reclamación.
              </p>
            </div>
            <ul className="grid gap-x-10 sm:grid-cols-2 md:col-span-8">
              {FEATURES.map((f, i) => (
                <li
                  key={f.title}
                  style={paso(i % 2)}
                  className="reveal group border-t border-stone-300/70 pt-6 pb-10"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700/10 text-teal-700 transition duration-300 ease-out group-hover:bg-teal-700 group-hover:text-white">
                    <Icon name={f.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className={tituloSeccion}>Precios simples</h2>
            <p className="mt-4 text-lg text-slate-600">
              Empieza gratis y quédate gratis el tiempo que quieras. Si necesitas más, pagas por año o mes a mes, como
              te acomode.
            </p>
          </div>
          <PreciosPlanes />
          <p className="mt-6 text-center text-sm text-slate-500">
            Pagos con Yape, Plin o tarjeta. Cancela cuando quieras. Todos los planes, incluido el gratuito, reciben
            reclamos ilimitados: nunca te cobramos por recibir más.
          </p>
        </section>

        {/* FAQ en dos columnas: el título a un lado y las preguntas al
            otro, en vez del acordeón centrado de siempre. */}
        <section id="faq" className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 md:grid-cols-12">
            <div className="reveal md:col-span-4">
              <h2 className={tituloSeccion}>Preguntas frecuentes</h2>
              <p className="mt-4 text-lg text-slate-600">Lo que más preguntan los negocios antes de empezar.</p>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200 md:col-span-8">
              {FAQ.map((item, i) => (
                <details key={item.q} style={paso(i)} className="faq reveal group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-slate-900">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-200 text-teal-600 transition duration-300 ease-out group-hover:bg-teal-50 group-open:rotate-45 group-open:border-teal-600 group-open:bg-teal-600 group-open:text-white"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="reveal rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 px-6 py-16 text-center text-white shadow-xl shadow-teal-950/25 sm:py-20">
            <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">
              Pon tu negocio en regla hoy
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-teal-100">
              Crea tu Libro de Reclamaciones Virtual gratis y recibe tu enlace y aviso oficial en menos de 5 minutos.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <ButtonLink href="/registro" variant="white" className="btn-brillo px-6 py-3 text-base">
                Crear mi libro gratis
              </ButtonLink>
              <Link
                href="/r/demo"
                className="group inline-flex items-center gap-1.5 px-4 text-sm font-semibold text-teal-100 hover:text-white"
              >
                Ver demo
                <span aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <WhatsappFab />
      <BackToTop encimaDeWhatsapp={Boolean(WHATSAPP_NUMBER)} />
    </>
  );
}
