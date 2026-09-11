import Link from "next/link";
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
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,#dbeafe_0%,transparent_70%)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="space-y-6">
              <Badge tone="blue">Cumple con INDECOPI · D.S. 011-2011-PCM</Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Tu Libro de Reclamaciones Virtual, listo en 5 minutos
              </h1>
              <p className="text-lg text-slate-600">
                Registra tu negocio, copia el enlace en tu web o redes y recibe los reclamos ordenados, numerados y
                con el plazo legal bajo control. Sin abogados, sin cuadernos.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/registro" className="px-6 py-3 text-base">
                  Crear mi libro gratis
                </ButtonLink>
                <ButtonLink href="/r/demo" variant="secondary" className="px-6 py-3 text-base">
                  Ver un ejemplo
                </ButtonLink>
              </div>
              <p className="text-sm text-slate-500">Sin tarjeta · Reclamos ilimitados · Hecho en Perú 🇵🇪</p>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
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
                    <dd className="font-medium text-red-700">Vence en 3 días hábiles</dd>
                  </div>
                </dl>
                <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  “El producto llegó con la caja dañada y no encendía. Solicito el cambio o la devolución del dinero.”
                </div>
                <div className="mt-5 flex gap-2">
                  <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
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
        <section className="border-y border-slate-200 bg-white">
          <div className="reveal mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
            <div>
              <p className="text-3xl font-extrabold text-blue-700">Obligatorio</p>
              <p className="mt-1 text-sm text-slate-600">
                Para todo negocio que vende a consumidores, en el local y en su web o redes sociales.
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-blue-700">15 días hábiles</p>
              <p className="mt-1 text-sm text-slate-600">
                Plazo máximo e improrrogable para responder cada reclamo o queja.
              </p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-blue-700">Multas</p>
              <p className="mt-1 text-sm text-slate-600">
                INDECOPI sanciona no tener el libro, no exhibir el aviso o no responder a tiempo.
              </p>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="reveal mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Cómo funciona</h2>
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
              <li key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-lg font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section className="bg-slate-900 text-white">
          <div className="reveal mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Todo lo que exige el reglamento, sin que lo pienses</h2>
              <p className="mt-3 text-slate-300">Diseñado a partir del formato oficial de la hoja de reclamación.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="reveal mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Precios simples</h2>
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
                      ? "relative rounded-2xl border-2 border-blue-700 bg-white p-6 shadow-xl transition duration-200 ease-out hover:-translate-y-1 hover:shadow-2xl"
                      : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
                  }
                >
                  {highlight && (
                    <span className="absolute -top-3 left-6 rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
                      Más popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
                  {p.priceYearly === 0 ? (
                    <>
                      <p className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-slate-900">S/ 0</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Para siempre, sin tarjeta.</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-slate-900">S/ {p.priceYearly}</span>
                        <span className="text-sm text-slate-500">/año</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Equivale a S/ {monthlyEquivalent(p)} al mes. También S/ {p.priceMonthly} mensuales sin
                        compromiso, {yearlySavings(p)}% más caro.
                      </p>
                    </>
                  )}
                  <ul className="mt-6 space-y-2 text-sm text-slate-700">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-blue-700">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink
                    href="/registro"
                    variant={highlight ? "primary" : "secondary"}
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
          <div className="reveal mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Preguntas frecuentes</h2>
            <div className="mt-10 divide-y divide-slate-200">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-slate-900">
                    {item.q}
                    <span className="text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="reveal mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="rounded-3xl bg-blue-700 px-6 py-14 text-center text-white shadow-xl">
            <h2 className="text-3xl font-bold tracking-tight">Pon tu negocio en regla hoy</h2>
            <p className="mx-auto mt-3 max-w-xl text-blue-100">
              Crea tu Libro de Reclamaciones Virtual gratis y recibe tu enlace y aviso oficial en menos de 5 minutos.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <ButtonLink href="/registro" variant="white" className="px-6 py-3 text-base">
                Crear mi libro gratis
              </ButtonLink>
              <Link href="/r/demo" className="inline-flex items-center px-4 text-sm font-semibold text-white/90 hover:text-white">
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
