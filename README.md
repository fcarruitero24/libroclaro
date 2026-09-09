# LibroClaro · Libro de Reclamaciones Virtual (micro SaaS)

Libro de Reclamaciones Virtual para negocios peruanos. Obligatorio por ley para todo proveedor que vende a consumidores (Ley 29571, D.S. 011-2011-PCM y modificatorias). Modelo freemium B2B con suscripción mensual.

- **Producción:** https://libroclaro.vercel.app (Vercel, proyecto `libroclaro`, auto-deploy desde `main`)
- **Demo pública:** https://libroclaro.vercel.app/r/demo
- **Base de datos:** Supabase, proyecto `libroclaro` (`rcjgprzmvtspviwyyrhy`, São Paulo)
- **Repo:** https://github.com/fcarruitero24/libroclaro (privado)

## Qué hace

- **Formulario público** `/r/{slug}` con el formato oficial de la hoja de reclamación (consumidor, bien contratado, detalle, pedido), aviso oficial y definiciones de reclamo/queja.
- **Numeración correlativa** por negocio y año (`2026-000001`), generada en la base de datos.
- **Copia al consumidor** por correo con enlace a su hoja `/h/{token}` (imprimible / PDF).
- **Plazo legal**: 15 días hábiles calculados con feriados de Perú; el panel muestra la cuenta regresiva y marca vencidos.
- **Panel del negocio**: lista, filtros, detalle, respuesta con envío de correo al consumidor, exportación CSV (Pro).
- **Instalación**: enlace, snippet HTML con el aviso y código QR para el local.
- **Monetización**: plan Gratis (con marca «LibroClaro»), Pro S/ 29/mes, Empresa S/ 79/mes. Pago con tarjeta vía Mercado Pago (suscripción) o manual por Yape/Plin con activación por API.
- **Cron diario** (Vercel) que recuerda a los negocios Pro los reclamos por vencer.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + RLS) · Resend (correo) · Mercado Pago (suscripciones) · Vercel (hosting + cron).

## Estructura

```
src/app/
  page.tsx                    Landing (precios, FAQ)
  login/ registro/            Autenticación (email + contraseña)
  auth/callback/route.ts      Confirmación de correo
  app/                        Panel (protegido por src/proxy.ts)
    nuevo/                    Registrar negocio
    negocios/                 Lista de negocios/sucursales
    [bizId]/                  Reclamos · reclamo/[id] · ajustes · plan · exportar (CSV)
  r/[slug]/                   Formulario público del consumidor
  h/[token]/                  Hoja de reclamación pública (PDF)
  api/checkout                Crea suscripción en Mercado Pago
  api/webhooks/mercadopago    Activa el plan al autorizarse el pago
  api/admin/activate          Activación manual (Yape/Plin)
  api/cron/reminders          Recordatorios diarios (Pro)
src/lib/                      supabase/, actions/, plans.ts, business-days.ts, email.ts
supabase/migrations/          Esquema SQL (ya aplicado en el proyecto "libroclaro")
```

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa lo que necesites
npm run dev
```

La URL y la clave anon de Supabase ya vienen por defecto en `src/lib/env.ts` (son públicas por diseño). Sin ninguna variable extra la app funciona: registro, panel, formulario público y hoja. Los correos se registran en consola hasta que configures Resend.

## Checklist de lanzamiento (≈30 minutos)

1. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://TU-DOMINIO`
   - Redirect URLs: `https://TU-DOMINIO/auth/callback`
2. **Supabase → Authentication → Providers → Email**
   - Opción A (rápida): desactiva *Confirm email* para que el registro entre directo.
   - Opción B (recomendada): configura SMTP personalizado (Resend tiene SMTP gratis) para que lleguen los correos de confirmación a cualquier usuario.
3. **Vercel → Settings → Environment Variables** (ver `.env.example`):
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API)
   - `RESEND_API_KEY` y `EMAIL_FROM` (verifica tu dominio en Resend)
   - `ADMIN_SECRET`, `CRON_SECRET` (cadenas aleatorias largas)
   - `NEXT_PUBLIC_YAPE_NUMBER`, `NEXT_PUBLIC_YAPE_NAME`, `NEXT_PUBLIC_WHATSAPP_NUMBER`
   - `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` cuando tengas cuenta de Mercado Pago
   - Redeploy después de guardarlas.
4. **Mercado Pago** (opcional al inicio): crea la aplicación en *Tus integraciones*, copia el Access Token de producción y registra el webhook `https://TU-DOMINIO/api/webhooks/mercadopago` con el evento *Suscripciones (preapproval)*.
5. **Dominio propio**: agrega `libroclaro.pe` (o el que compres) en Vercel y actualiza `NEXT_PUBLIC_APP_URL`, la Site URL de Supabase y la URL del webhook.

## Activar un plan pagado por Yape/Plin

```bash
curl -X POST https://TU-DOMINIO/api/admin/activate \
  -H "x-admin-secret: TU_ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"slug":"mi-negocio","plan":"pro","months":1}'
```

También puedes hacerlo desde el SQL editor de Supabase:

```sql
update public.businesses set plan = 'pro', plan_expires_at = now() + interval '30 days' where slug = 'mi-negocio';
```

## Cuenta demo

- Negocio público: `/r/demo` (Cafetería Demo S.A.C., con 2 hojas de ejemplo).
- Usuario: `demo@libroclaro.app` · Contraseña: `Demo.LibroClaro.2026` (cámbiala o elimina la cuenta antes de publicitar el producto).

## Cómo conseguir los primeros clientes

1. **Contenido SEO local**: la landing ya apunta a «libro de reclamaciones virtual», «INDECOPI», «tienda online». Publica 3–5 artículos: cómo responder un reclamo en 15 días hábiles, diferencias reclamo vs. queja, cómo poner el aviso en Shopify/WooCommerce/Instagram.
2. **Marca «Powered by»**: cada negocio en plan Gratis muestra el enlace a LibroClaro en su formulario y su hoja. Cada consumidor que reclama ve la marca.
3. **Outbound directo**: busca tiendas en Instagram/TikTok Perú que venden sin libro de reclamaciones visible (la mayoría). Mensaje corto: «Vi que tu tienda no tiene el aviso del Libro de Reclamaciones que exige INDECOPI. Te lo dejo listo gratis en 5 minutos: [enlace]».
4. **Alianzas**: contadores, estudios contables y agencias que crean tiendas online. Ofréceles Pro gratis para sus propios clientes a cambio de recomendación.
5. **Marketplace/gremios**: cámaras de comercio locales, asociaciones de emprendedores, grupos de Facebook de dueños de negocios.

Métrica objetivo: 100 negocios en Gratis → 10–15 % convierte a Pro por alertas por correo y quitar la marca. 50 Pro ≈ S/ 1 450/mes con costos de infraestructura ≈ S/ 0 (planes gratuitos de Vercel, Supabase y Resend cubren varios miles de reclamos al mes).

## Aviso legal

LibroClaro es una herramienta tecnológica y no brinda asesoría legal. Los textos legales se basan en el D.S. 011-2011-PCM y sus modificatorias (D.S. 006-2014-PCM, D.S. 058-2017-PCM y D.S. 101-2022-PCM). Verifica los requisitos vigentes con INDECOPI antes de comercializar.
