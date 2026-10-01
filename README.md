# LibroClaro

Libro de Reclamaciones Virtual para negocios en Perú. Cada negocio obtiene en minutos su formulario público de reclamos, con numeración correlativa, copia automática al consumidor y control del plazo legal de 15 días hábiles, según la Ley 29571 y el D.S. 011-2011-PCM.

- **En producción:** https://libroclaro.pe
- **Libro de ejemplo:** https://libroclaro.pe/r/demo

## Qué hace

- **Formulario público** `/r/{slug}` con el formato oficial de la hoja de reclamación (reclamo o queja), protegido con Cloudflare Turnstile.
- **Numeración correlativa** por negocio y año (`2026-000001`), generada dentro de la base de datos.
- **Copia al consumidor** por correo y hoja pública `/h/{token}`, imprimible o en PDF.
- **Plazo legal** de 15 días hábiles con feriados de Perú: el panel muestra la cuenta regresiva y avisa por correo los reclamos por vencer.
- **Panel del negocio**: reclamos con filtros, detalle con historial y notas, respuesta por correo, plantillas de respuesta, gráficos y exportación CSV. Una cuenta puede tener varias sucursales.
- **Instalación**: enlace propio, aviso oficial para la web y para el local (A4) y código QR.
- **Registro en un paso** con consulta del RUC en SUNAT: la razón social se toma del padrón oficial y un RUC no puede quedar registrado a nombre de otra cuenta.
- **Suscripciones** con tarjeta vía Mercado Pago (mensual o anual) y prueba gratis de 30 días del plan Pro.
- **LibIA**, la mascota 3D del inicio, hecha con Three.js: se asoma detrás de la hoja del ejemplo, saluda y sigue el cursor. Se carga solo en escritorio.

## Stack

- **Next.js 16** (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS v4
- **Supabase**: Postgres con Row Level Security, Auth y triggers
- **Cloudflare Workers** con OpenNext · Turnstile · reglas de límite de pedidos
- **Resend** (correo transaccional) · **Mercado Pago** (suscripciones) · **Three.js**
- Pruebas con `node:test`

## Decisiones técnicas

- **La seguridad vive en la base.** Las políticas RLS limitan cada fila a su dueño, y un trigger impide que un cliente cambie su plan o su vencimiento desde el navegador: solo el servidor, con su llave de servicio, puede hacerlo. El plan es de la cuenta y otro trigger lo propaga a sus sucursales.
- **Pagos verificados dos veces.** El webhook de Mercado Pago comprueba la firma HMAC del aviso y, antes de activar un plan, vuelve a consultar la suscripción con el token del servidor.
- **Formularios públicos protegidos.** Turnstile se verifica en el servidor en los reclamos, el registro y el login, y la IP real se toma de la cabecera de Cloudflare.
- **Avisos sin duplicados.** Cada recordatorio de plan se registra con una clave única antes de enviarse, así que el cron puede reintentar sin mandar el mismo correo dos veces.
- **Cerca de los datos.** El Worker corre en São Paulo (`aws:sa-east-1`), junto a la base, porque cada página hace varias consultas; los archivos estáticos se sirven desde el punto más cercano al visitante.
- **Animación medida, no estimada.** La entrada de la mascota se calibró leyendo su silueta real en el lienzo WebGL cuadro a cuadro, y su trayectoria vive en funciones puras con pruebas.

## Estructura

```
src/app/
  page.tsx                   Portada: demo animada, precios y preguntas frecuentes
  registro/  login/          Alta en un paso (RUC + cuenta + negocio) e inicio de sesión
  app/                       Panel privado (protegido por src/middleware.ts)
    [bizId]/                 Resumen, reclamos, reclamo/[id], plantillas, aviso, ajustes, plan, exportar
  r/[slug]/                  Formulario público del consumidor (y reporte de titularidad)
  h/[token]/                 Hoja de reclamación pública
  api/checkout               Crea la suscripción en Mercado Pago
  api/webhooks/mercadopago   Activa o actualiza el plan al llegar el aviso firmado
  api/cron/reminders         Recordatorios diarios
  api/ruc                    Consulta de RUC
src/components/              Interfaz; mascota/ tiene la escena 3D y su lógica con pruebas
src/lib/                     supabase/, actions/, plans.ts, business-days.ts, email.ts, turnstile.ts
supabase/migrations/         Esquema SQL, en orden (0001 a 0008)
cloudflare/worker.ts         Punto de entrada del Worker: cron y redirección al dominio
wrangler.jsonc               Configuración de Cloudflare
```

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa solo lo que necesites
npm run dev                  # http://localhost:3000
npm test                     # pruebas (Node 22.6 o más)
npm run lint
```

Sin variables extra la app funciona: registro, panel, formulario público y hoja. Los correos se escriben en la consola hasta configurar Resend. Las migraciones de `supabase/migrations/` se aplican en orden desde el SQL Editor de Supabase.

## Publicación

```bash
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

Los secretos del servidor se cargan con `npx wrangler secret put NOMBRE`. El cron diario está definido en `wrangler.jsonc`.

## Aviso legal

LibroClaro es una herramienta tecnológica y no brinda asesoría legal. Los textos legales se basan en el D.S. 011-2011-PCM y sus modificatorias (D.S. 006-2014-PCM, D.S. 058-2017-PCM y D.S. 101-2022-PCM).

## Autor

Fabrizio Carruitero · [libroclaro.pe](https://libroclaro.pe)

© 2026 Fabrizio Carruitero. El código se publica como portafolio; todos los derechos reservados.
