import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">Política de privacidad</h1>
        <p className="mt-2 text-sm text-slate-500">Última actualización: septiembre de 2026</p>
        <div className="mt-8 text-slate-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
          <h2>1. Qué datos tratamos</h2>
          <p>
            <strong>De los Negocios:</strong> correo, contraseña (cifrada), razón social, RUC, dirección, teléfono y datos de
            pago gestionados por el proveedor de pagos (no almacenamos números de tarjeta).
          </p>
          <p>
            <strong>De los consumidores que registran un reclamo:</strong> nombre, documento de identidad, domicilio,
            teléfono, correo, descripción del reclamo y la respuesta del Negocio, así como la dirección IP y el navegador
            desde donde se registró, como medida de seguridad y trazabilidad.
          </p>
          <h2>2. Para qué los usamos</h2>
          <ul>
            <li>Generar la hoja de reclamación y enviar su copia al consumidor, como exige la ley.</li>
            <li>Permitir al Negocio gestionar y responder los reclamos.</li>
            <li>Enviar notificaciones operativas (nuevo reclamo, recordatorios de plazo, respuesta).</li>
            <li>Prevenir fraude y abuso del servicio.</li>
          </ul>
          <h2>3. Roles</h2>
          <p>
            Respecto de los datos de los consumidores, el Negocio actúa como titular del banco de datos y LibroClaro como
            encargado del tratamiento por cuenta del Negocio, conforme a la Ley N.º 29733 de Protección de Datos Personales
            y su reglamento. Cada Negocio es responsable de cumplir sus obligaciones como titular.
          </p>
          <h2>4. Dónde se almacenan</h2>
          <p>
            Usamos Supabase (base de datos alojada en la región de São Paulo, Brasil) y Vercel para el alojamiento de la
            aplicación. Los correos se envían mediante Resend. Estos proveedores aplican medidas de seguridad estándar de
            la industria.
          </p>
          <h2>5. Conservación</h2>
          <p>
            Las hojas de reclamación se conservan mientras el Negocio mantenga su cuenta, y al menos durante el periodo
            exigido por la normativa de protección al consumidor (dos años). El Negocio puede eliminar su cuenta y sus
            datos en cualquier momento desde el panel.
          </p>
          <h2>6. Tus derechos</h2>
          <p>
            Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo al Negocio ante el
            cual registraste tu reclamo (su correo figura en tu hoja de reclamación) o a LibroClaro a través de los canales
            indicados en la plataforma.
          </p>
          <h2>7. Cookies</h2>
          <p>
            Solo usamos cookies estrictamente necesarias para mantener la sesión de los Negocios en el panel. No usamos
            cookies publicitarias.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
