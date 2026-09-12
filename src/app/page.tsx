import Link from "next/link";
import { RevealOnScroll } from "@/components/reveal-on-scroll";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge, ButtonLink } from "@/components/ui";
import { monthlyEquivalent, PLANS, yearlySavings } from "@/lib/plans";

const FEATURES = [
  {
    title: "Numeración correlativa automática",
    text: "Cada hoja recibe un código único por año (2026-000001…), tal como exige el reglamento.",
  },
  {
    title: "Copia al consumidor por correo",
    text: "El cliente recibe su hoja de reclamación al instante, con enlace para imprimir o guardar en PDF.",
  },
  {
    title: "Control del plazo de 15 días hábiles",
    text: "Contamos los días hábiles con feriados de Perú y te avisamos antes de que venza cada reclamo.",
  },
  {
    title: "Aviso oficial y código QR",
    text: "Descarga el aviso para tu web y un QR para pegar en tu local o mostrador.",
  },
  {
    title: "Respuestas documentadas",
    text: "Responde desde el panel y queda registro fechado de tu respuesta, listo para INDECOPI.",
  },
  {
    title: "Registro conservado",
    text: "Tus hojas quedan guardadas y exportables. Nunca más un cuaderno perdido.",
  },
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
                <ButtonLink href="/registro" variant="white" className="px-6 py-3 text-base">
                  Crear mi libro gratis
                </ButtonLink>
                <ButtonLink
                  href="/r/demo"
                  variant="ghost"
                  className="px-6 py-3 text-base text-teal-100 hover:bg-white/10 hover:text-white"
                >
                  Ver un ejemplo →
                </ButtonLink>
              </div>
              <p className="text-sm text-slate-400">Sin tarjeta · Reclamos ilimitados · Hecho en Perú 🇵🇪</p>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/40">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hoja de reclamación</p>
                    <p className="text-xl font-bold text-slate-900">N.º 2026-000012</p>
                  </div>
                  <Badge tone="amber">Pendiente</Badge>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Consumidor</dt>
                    <dd className="font-medium text-slate-900">María Q.</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tipo</dt>
                    <dd className="font-medium text-slate-900">Reclamo · Producto</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Monto</dt>
                    <dd className="font-medium text-slate-900">S/ 189.00</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Plazo</dt>
                    <dd className="font-medium text-amber-700">Vence en 3 días hábiles</dd>
                  </div>
                </dl>
                <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  &ldquo;El producto llegó con la caja dañada y no encendía. Solicito el cambio o la devolución del dinero.&rdquo;
                </div>
                <div className="mt-5 flex gap-2">
                  <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
                    Responder
                  </span>
                  <span className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                    Ver hoja
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg sm:block">
                <p className="text-xs text-slate-500">Copia enviada a</p>
                <p className="text-sm font-semibold text-slate-900">maria@correo.com ✓</p>
              </div>
            </div>
          </div>
        </section>

        {/* Por qué */}
        <section className="border-y border-stone-200 bg-[#faf7f2]">
          <div className="reveal mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
            <div>
              <p className="text-3xl font-extrabold text-teal-700">Obligatorio</p>
              <p className="mt-1 text-sm text-slate-600">
                Para todo negocio que vende a consumidores, en el local y en su web o redes sociales.
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-teal-700">15 días hábiles</p>
              <p className="mt-1 text-sm text-slate-600">
                Plazo máximo e improrrogable para responder cada reclamo o queja.
              </p>
            </div>
            <div>
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
                t: "Registra tu negocio",
                d: "Nombre, RUC, dirección y correo de notificaciones. Elige el enlace de tu libro: libroclaro.app/r/tu-negocio.",
              },
              {
                n: "2",
                t: "Instala el aviso",
                d: "Copia el enlace con el aviso oficial en tu web, tu perfil de Instagram o tu catálogo de WhatsApp. Imprime el QR para tu local.",
              },
              {
                n: "3",
                t: "Recibe y responde",
                d: "Cada reclamo llega numerado a tu panel con la cuenta regresiva de días hábiles. Respondes y el cliente recibe la respuesta por correo.",
              },
            ].map((s) => (
              <li key={s.n} className="reveal rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="reveal rounded-2xl border border-stone-200 border-l-[3px] border-l-teal-600 bg-white p-6 shadow-sm"
                >
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
            {(["free", "pro", "business"] as const).map((id) => {
              const p = PLANS[id];
              const highlight = id === "pro";
              return (
                <div
                  key={id}
                  className={
                    highlight
                      ? "relative rounded-2xl bg-teal-900 p-6 shadow-xl transition duration-200 ease-out hover:-translate-y-1 hover:shadow-2xl"
                      : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
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
                        Equivale a S/ {monthlyEquivalent(p)} al mes. También S/ {p.priceMonthly} mensuales sin
                        compromiso, {yearlySavings(p)}% más caro.
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
              {FAQ.map((item) => (
                <details key={item.q} className="reveal group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-slate-900">
                    {item.q}
                    <span className="shrink-0 text-teal-600 transition group-open:rotate-45">+</span>
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
              <ButtonLink href="/registro" variant="white" className="px-6 py-3 text-base">
                Crear mi libro gratis
              </ButtonLink>
              <Link
                href="/r/demo"
                className="inline-flex items-center px-4 text-sm font-semibold text-teal-100 hover:text-white"
              >
                Ver demo →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
