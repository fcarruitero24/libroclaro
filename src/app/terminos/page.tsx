import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">Términos y condiciones</h1>
        <p className="mt-2 text-sm text-slate-500">Última actualización: septiembre de 2026</p>
        <div className="prose prose-slate mt-8 max-w-none text-slate-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_p]:mt-3 [&_p]:leading-relaxed">
          <h2>1. El servicio</h2>
          <p>
            LibroClaro es una plataforma tecnológica que permite a proveedores («el Negocio») implementar un Libro de
            Reclamaciones Virtual: registrar hojas de reclamación con numeración correlativa, enviar copias al consumidor,
            gestionar respuestas y controlar plazos. LibroClaro no es un estudio de abogados y no brinda asesoría legal.
          </p>
          <h2>2. Responsabilidad del Negocio</h2>
          <p>
            El Negocio es el único responsable de la veracidad de sus datos (razón social, RUC, dirección), de exhibir el
            aviso del Libro de Reclamaciones, de responder a los consumidores dentro del plazo legal y de conservar sus
            registros conforme a la normativa vigente. LibroClaro es una herramienta de apoyo y no garantiza el cumplimiento
            normativo, que depende del uso que el Negocio haga de la plataforma.
          </p>
          <h2>3. Planes y pagos</h2>
          <p>
            Todo Negocio nuevo recibe una prueba gratuita de 30 días con las funciones del plan Pro, sin necesidad de
            registrar un medio de pago; la prueba se otorga una sola vez por cuenta y por RUC. Si al terminar la prueba o
            el periodo pagado el Negocio no contrata un plan, su Libro de Reclamaciones Virtual deja de recibir reclamos
            nuevos, pero sus hojas se conservan y el Negocio puede consultarlas, responder las pendientes y descargarlas.
            Los planes de pago se facturan mensualmente por adelantado en soles (PEN) a través
            de Mercado Pago o por transferencia (Yape/Plin). El Negocio puede cancelar en cualquier momento; los beneficios
            se mantienen hasta el fin del periodo pagado. No se realizan reembolsos por periodos parciales.
          </p>
          <h2>4. Disponibilidad y datos</h2>
          <p>
            Hacemos esfuerzos razonables para mantener el servicio disponible y respaldado, pero no garantizamos
            disponibilidad ininterrumpida. El Negocio puede exportar sus registros en cualquier momento y es
            responsable de mantener sus propias copias. Si el Negocio elimina su cuenta, sus datos se eliminan de forma
            permanente.
          </p>
          <h2>5. Uso aceptable</h2>
          <p>
            Está prohibido usar LibroClaro para fines ilícitos, suplantar a terceros, registrar información falsa o intentar
            vulnerar la seguridad del servicio. Podemos suspender cuentas que infrinjan estos términos.
          </p>
          <h2>6. Limitación de responsabilidad</h2>
          <p>
            En la medida permitida por la ley, LibroClaro no será responsable por sanciones, multas, daños indirectos o
            lucro cesante derivados del uso o la imposibilidad de uso del servicio. La responsabilidad total se limita al
            monto pagado por el Negocio en los últimos tres meses.
          </p>
          <h2>7. Cambios</h2>
          <p>
            Podemos actualizar estos términos. Notificaremos los cambios relevantes por correo o en la plataforma. El uso
            continuado del servicio implica la aceptación de los términos vigentes.
          </p>
          <h2>8. Ley aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República del Perú.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
