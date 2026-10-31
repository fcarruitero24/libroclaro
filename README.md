**English** · [Español](README.es.md)

# LibroClaro

Virtual Complaints Book ("Libro de Reclamaciones") for businesses in Peru. Each business gets its public complaints form in minutes, with sequential numbering, an automatic copy for the consumer and tracking of the 15-business-day legal deadline, as required by Law 29571 and Supreme Decree 011-2011-PCM.

- **In production:** https://libroclaro.pe
- **Sample book:** https://libroclaro.pe/r/demo

## What it does

- **Public form** `/r/{slug}` following the official complaint sheet format (claim or grievance), protected with Cloudflare Turnstile.
- **Sequential numbering** per business and year (`2026-000001`), generated inside the database.
- **Copy for the consumer** by email and a public sheet `/h/{token}`, printable or as PDF.
- **Legal deadline** of 15 business days, including Peruvian holidays: the dashboard shows the countdown and emails reminders for complaints about to expire.
- **Business dashboard**: complaints with filters, detail view with history and notes, email replies, reply templates, charts and CSV export. One account can manage several branches.
- **Setup**: own link, official notice for the website and for the store (A4) and a QR code.
- **One-step sign-up** with a RUC (tax ID) lookup in SUNAT: the company name is taken from the official registry, and a RUC cannot be registered under another account.
- **Subscriptions** by card through Mercado Pago (monthly or yearly) and a 30-day free trial of the Pro plan.
- **LibIA**, the 3D mascot on the home page, built with Three.js: it peeks out from behind the sample sheet, waves and follows the cursor. It only loads on desktop.

## Stack

- **Next.js 16** (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS v4
- **Supabase**: Postgres with Row Level Security, Auth and triggers
- **Cloudflare Workers** with OpenNext · Turnstile · rate-limiting rules
- **Resend** (transactional email) · **Mercado Pago** (subscriptions) · **Three.js**
- Tests with `node:test`

## Technical decisions

- **Security lives in the database.** RLS policies restrict each row to its owner, and a trigger prevents a client from changing its plan or expiration date from the browser: only the server, with its service key, can do it. The plan belongs to the account and another trigger propagates it to its branches.
- **Payments verified twice.** The Mercado Pago webhook checks the HMAC signature of the notification and, before activating a plan, queries the subscription again with the server token.
- **Protected public forms.** Turnstile is verified on the server for complaints, sign-up and login, and the real IP is taken from the Cloudflare header.
- **No duplicate notifications.** Each plan reminder is recorded with a unique key before it is sent, so the cron job can retry without sending the same email twice.
- **Close to the data.** The Worker runs in São Paulo (`aws:sa-east-1`), next to the database, because each page makes several queries; static files are served from the location closest to the visitor.
- **Measured, not estimated, animation.** The mascot's entrance was calibrated by reading its real silhouette on the WebGL canvas frame by frame, and its trajectory lives in pure functions with tests.

## Structure

```
src/app/
  page.tsx                   Home: animated demo, pricing and FAQ
  registro/  login/          One-step sign-up (RUC + account + business) and login
  app/                       Private dashboard (protected by src/middleware.ts)
    [bizId]/                 Summary, complaints, complaint/[id], templates, notice, settings, plan, export
  r/[slug]/                  Consumer public form (and ownership report)
  h/[token]/                 Public complaint sheet
  api/checkout               Creates the subscription in Mercado Pago
  api/webhooks/mercadopago   Activates or updates the plan when the signed notification arrives
  api/cron/reminders         Daily reminders
  api/ruc                    RUC lookup
src/components/              UI; mascota/ contains the 3D scene and its tested logic
src/lib/                     supabase/, actions/, plans.ts, business-days.ts, email.ts, turnstile.ts
supabase/migrations/         SQL schema, in order (0001 to 0008)
cloudflare/worker.ts         Worker entry point: cron and domain redirect
wrangler.jsonc               Cloudflare configuration
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in only what you need
npm run dev                  # http://localhost:3000
npm test                     # tests (Node 22.6 or later)
npm run lint
```

The app works without extra variables: sign-up, dashboard, public form and sheet. Emails are written to the console until Resend is configured. The migrations in `supabase/migrations/` are applied in order from the Supabase SQL Editor.

## Deployment

```bash
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

Server secrets are loaded with `npx wrangler secret put NAME`. The daily cron job is defined in `wrangler.jsonc`.

## Legal notice

LibroClaro is a technology tool and does not provide legal advice. The legal texts are based on Supreme Decree 011-2011-PCM and its amendments (D.S. 006-2014-PCM, D.S. 058-2017-PCM and D.S. 101-2022-PCM).

## Author

Fabrizio Carruitero · [libroclaro.pe](https://libroclaro.pe)

© 2026 Fabrizio Carruitero. The code is published as a portfolio; all rights reserved.
