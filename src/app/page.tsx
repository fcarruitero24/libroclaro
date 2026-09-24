import Link from "next/link";
import type { CSSProperties } from "react";
import { BackToTop } from "@/components/back-to-top";
import { HeroDemo } from "@/components/hero-demo";
import { Icon, type IconName } from "@/components/icons";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink } from "@/components/ui";
import { WhatsappFab } from "@/components/whatsapp-fab";
import { WHATSAPP_NUMBER } from "@/lib/env";
import { monthlyEquivalent, PLANS, yearlySavings } from "@/lib/plans";

/** Índice para la cascada del reveal: lo lee `--i` en globals.css. */
const paso = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * Tarjeta que reacciona al puntero: se levanta apenas y gana sombra.
 * No toca el color del borde a propósito: las tarjetas de features
 * llevan una barra teal a la izquierda y cambiarles el borde en hover
 * la apagaba.
 */
const tarjeta = "transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg";

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
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0b1f1d]">
          {/* z-0 sobre el fondo de la sección, y el contenido en z-10 encima.
              Con -z-10 el degradado quedaba detrás del color sólido y no se veía. */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(65%_55%_at_50%_0%,rgba(15,118,110,0.35)_0%,transparent_70%)]" />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-28">
            <div className="space-y-6">
              <Badge tone="teal">Cumple con INDECOPI · D.S. 011-2011-PCM</Badge>
              <h1 className="font-display text-4xl tracking-tight text-white sm:text-5xl md:text-[3.25rem] md:leading-[1.15]">
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
              <p className="text-sm text-slate-400">Sin tarjeta · Reclamos ilimitados · Hecho en Perú 🇵🇪</p>
            </div>

            <HeroDemo />
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
              <p className="text-3xl font-extrabold text-teal-700">Obligatorio</p>
              <p className="mt-1 text-sm text-slate-600">
                Para todo negocio que vende a consumidores, en el local y en su web o redes sociales.
              </p>
            </div>
            <div className="reveal" style={paso(1)}>
              <Icon name="reloj" className="mb-3 h-7 w-7 text-teal-600" />
              <p className="text-3xl font-extrabold text-teal-700">15 días hábiles</p>
              <p className="mt-1 text-sm text-slate-600">
                Plazo máximo e improrrogable para responder cada reclamo o queja.
              </p>
            </div>
            <div className="reveal" style={paso(2)}>
              <Icon name="balanza" className="mb-3 h-7 w-7 text-teal-600" />
              <p className="text-3xl font-extrabold text-teal-700">Multas</p>
              <p className="mt-1 text-sm text-slate-600">
                INDECOPI sanciona no tener el libro, no exhibir el aviso o no responder a tiempo.
              </p>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-tight text-slate-900">Cómo funciona</h2>
            <p className="mt-3 text-slate-600">Tres pasos y tu negocio queda en regla.</p>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "1",
                icon: "tienda" as IconName,
                t: "Registra tu negocio",
                d: "Nombre, RUC, dirección y correo de notificaciones. Elige el enlace de tu libro: libroclaro.app/r/tu-negocio.",
              },
              {
                n: "2",
                icon: "aviso" as IconName,
                t: "Instala el aviso",
                d: "Copia el enlace con el aviso oficial en tu web, tu perfil de Instagram o tu catálogo de WhatsApp. Imprime el QR para tu local.",
              },
              {
                n: "3",
                icon: "bandeja" as IconName,
                t: "Recibe y responde",
                d: "Cada reclamo llega numerado a tu panel con la cuenta regresiva de días hábiles. Respondes y el cliente recibe la respuesta por correo.",
              },
            ].map((s, i) => (
              <li
                key={s.n}
                style={paso(i)}
                className={`reveal group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${tarjeta}`}
              >
                <Icon
                  name={s.icon}
                  className="absolute right-6 top-6 h-10 w-10 text-teal-100 transition duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110 group-hover:text-teal-600"
                />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-lg font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section className="bg-[#faf7f2]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="reveal mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl tracking-tight text-slate-900">
                Todo lo que exige el reglamento, sin que lo pienses
              </h2>
              <p className="mt-3 text-slate-500">Diseñado a partir del formato oficial de la hoja de reclamación.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  style={paso(i)}
                  className={`reveal group rounded-2xl border border-stone-200 border-l-[3px] border-l-teal-600 bg-white p-6 shadow-sm ${tarjeta}`}
                >
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition duration-300 ease-out group-hover:scale-110 group-hover:bg-teal-700 group-hover:text-white">
                    <Icon name={f.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-tight text-slate-900">Precios simples</h2>
            <p className="mt-3 text-slate-600">
              Empieza gratis y quédate gratis el tiempo que quieras. Los planes pagados se cobran por año, como cualquier
              trámite de tu negocio, y también puedes pagarlos mes a mes.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {(["free", "pro", "business"] as const).map((id, i) => {
              const p = PLANS[id];
              const highlight = id === "pro";
              return (
                <div
                  key={id}
                  style={paso(i)}
                  className={
                    highlight
                      ? "reveal relative rounded-2xl bg-teal-900 p-6 shadow-xl transition duration-200 ease-out hover:-translate-y-1 hover:shadow-2xl"
                      : "reveal rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
                  }
                >
                  {highlight && (
                    <span className="absolute -top-3 left-6 rounded-full bg-teal-400 px-3 py-1 text-xs font-semibold text-teal-900">
                      Más popular
                    </span>
                  )}
                  <h3 className={`text-lg font-semibold ${highlight ? "text-white" : "text-slate-900"}`}>{p.name}</h3>
                  {p.priceYearly === 0 ? (
                    <>
                      <p className="mt-2 flex items-baseline gap-1">
                        <span className={`text-4xl font-extrabold ${highlight ? "text-white" : "text-slate-900"}`}>
                          S/ 0
                        </span>
                      </p>
                      <p className={`mt-1 text-sm ${highlight ? "text-teal-300" : "text-slate-500"}`}>
                        Para siempre, sin tarjeta.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 flex items-baseline gap-1">
                        <span className={`text-4xl font-extrabold ${highlight ? "text-white" : "text-slate-900"}`}>
                          S/ {p.priceYearly}
                        </span>
                        <span className={`text-sm ${highlight ? "text-teal-300" : "text-slate-500"}`}>/año</span>
                      </p>
                      <p className={`mt-1 text-sm ${highlight ? "text-teal-300" : "text-slate-500"}`}>
                        Equivale a S/ {monthlyEquivalent(p)} al mes. Ahorras {yearlySavings(p)}% frente a los S/{" "}
                        {p.priceMonthly} mensuales sin compromiso.
                      </p>
                    </>
                  )}
                  <ul className={`mt-6 space-y-2 text-sm ${highlight ? "text-teal-100" : "text-slate-700"}`}>
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className={highlight ? "text-teal-400" : "text-teal-700"}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink
                    href="/registro"
                    variant={highlight ? "white" : "secondary"}
                    className="mt-8 w-full"
                  >
                    {id === "free" ? "Empezar gratis" : `Elegir ${p.name}`}
                  </ButtonLink>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Pagos con Yape, Plin o tarjeta. Cancela cuando quieras. Todos los planes, incluido el gratuito, reciben
            reclamos ilimitados: nunca te cobramos por recibir más.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="reveal font-display text-center text-3xl tracking-tight text-slate-900">
              Preguntas frecuentes
            </h2>
            <div className="mt-10 divide-y divide-slate-200">
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
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="reveal rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 px-6 py-16 text-center text-white shadow-xl">
            <h2 className="font-display text-3xl tracking-tight">Pon tu negocio en regla hoy</h2>
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
