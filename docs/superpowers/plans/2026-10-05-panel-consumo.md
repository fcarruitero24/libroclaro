# Panel de consumo (`panel.libroclaro.pe`) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una página privada en `panel.libroclaro.pe` que muestra en vivo el uso de Cloudflare, Supabase, Resend y Mercado Pago frente a su límite, su ritmo y su costo, y que cada hora avisa por correo si algo cruza el 80 % o el 100 % o si fallan los recordatorios.

**Architecture:** LibroClaro (el Worker actual) guarda la cuota de Resend tras cada envío y el resultado de cada corrida del cron, y expone dos rutas protegidas con `PANEL_SECRET`: un resumen de solo números y el envío de alertas sin repetir. Un Worker nuevo, `libroclaro-panel` (carpeta `panel/`), detrás de Cloudflare Access y verificando su JWT, junta Cloudflare (GraphQL y suscripciones), LibroClaro (por service binding), RUC y QR. Arma el resumen con funciones puras probadas con `node:test`, lo entrega a una página estática sin dependencias y cada hora manda las alertas a LibroClaro.

**Tech Stack:**
- LibroClaro: Next.js 16.3.4 con OpenNext Cloudflare 1.20.6.
- Panel: Cloudflare Workers con Static Assets, Cron Triggers y Service Bindings (wrangler 4.141).
- Base: Supabase Postgres (migración 0009).
- Verificación del JWT: WebCrypto (RS256).
- Pruebas: `node:test` de Node 24 con borrado de tipos, y Playwright MCP para la página.
- Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-05-panel-consumo-design.md`

**Muestra aprobada:** `C:\Users\FABRIZIO\AppData\Local\Temp\claude\c--Users-FABRIZIO-Documents-VIBECODEMAXING-LibroClaro-storage\12071229-de67-4c47-92c7-017a0208c01e\scratchpad\panel-consumo\panel-consumo.html` (publicada en https://claude.ai/artifact/JC89yopPrivuk4h2wyfamM).

## Global Constraints

**Costo y claves**
- Costo S/ 0: nada que agregue planes ni cobros. Todo cabe en Workers Paid (US$ 5, ya pagado) y en los planes gratis.
- Las claves y tokens van solo en `../libroclaro/.env.local` (carpeta principal) y como secretos de Worker. Nunca en el chat, el repo (es público), los commits ni la salida de un comando: los scripts que las leen imprimen solo nombres o "listo".
- El `.env.local` de este worktree lleva solo valores `NEXT_PUBLIC_*`, porque OpenNext mete los `.env` en el paquete.
- `panel/.dev.vars` está ignorado por git y no se sube nunca.

**Código y git**
- `git add` de archivos concretos, nunca `-A`.
- Nombres, comentarios y textos en español, como el resto del repo.
- Sin dependencias npm nuevas: el JWT se verifica con WebCrypto, sin `jose`.
- Lo que corre con `node --test` usa sintaxis borrable (sin `enum` ni `namespace`), `import type` para los tipos e imports relativos con extensión `.ts`.
- `src/lib/consumo.ts` no importa nada: lo cargan `node --test` y el Worker del panel.

**Comportamiento**
- Cada consulta externa tiene un límite de 8 s (`AbortSignal.timeout(8000)`). Si una fuente se cae, no tumba a las demás ni lanza excepción.
- Las rutas `/api/panel/*` de LibroClaro responden 404 sin un `x-panel-secret` válido (comparación en tiempo constante) y devuelven solo números, sin datos personales.
- El panel solo responde en `panel.libroclaro.pe` (`workers_dev: false`, `preview_urls: false`).
- En cada pedido, el panel verifica firma, audiencia, emisor y vencimiento del JWT de Access. Si Access no está configurado, responde 403.
- Estados por porcentaje de uso:

  | Uso del límite | Estado |
  |---|---|
  | menos de 80 % | `ok` |
  | 80 % hasta antes de 100 % | `atencion` |
  | 100 % o más | `limite` |

- Alertas de límites: una por métrica, por umbral y por ciclo, y solo el umbral más alto que se cruzó.
- Alerta de recordatorios: una por día, si fallan o si no corren hace más de 26 h.

**Precios y límites** (verificados entre el 2026-09-25 y el 2026-10-05)

| Plataforma | Plan actual | Límites | Lo que cuesta pasarse |
|---|---|---|---|
| Cloudflare | Workers Paid, US$ 5/mes | 10 M visitas y 30 M ms de CPU por ciclo | US$ 0,30 por millón de visitas y US$ 0,02 por millón de ms |
| Supabase | Gratis | 500 MB de base, 1 GB de archivos, 50.000 usuarios activos | Pro, US$ 25/mes |
| Resend | Gratis | 100 al día (se reinicia a las 00:00 UTC) y 3.000 al mes | Pro, US$ 20/mes |
| Mercado Pago | Sin mensualidad | No tiene | 3,49 % + S/ 1, más IGV 18 % sobre esa comisión |

- El ciclo de Cloudflare empieza el día 29, o el último día del mes si el mes es más corto.
- Tipo de cambio fijo: 3,70 soles por dólar (aproximado).

**Unidades y fechas**
- 1 MB = 1024² bytes y 1 GB = 1024³ bytes.
- En UTC: los límites del ciclo y el "día" de Resend.
- En Lima (UTC−5 fijo, sin horario de verano): el día de `uso_diario`, la clave de recordatorios y el mes de Mercado Pago.

**Publicar**
- LibroClaro se publica solo con `npx opennextjs-cloudflare deploy` exacto, desde este worktree, y solo después del "súbelo" de Fabrizio.
- `npx wrangler deploy --config panel/wrangler.jsonc` y los `wrangler secret put` no están permitidos de antemano. Si el clasificador los frena, los corre Fabrizio; nunca se rodea un rechazo.
- Aplicar la migración, subir secretos, publicar y hacer push piden el OK explícito de Fabrizio.

## Review Focus

- **`PANEL_SECRET` distinto, o ausente, entre los dos Workers al publicar.** LibroClaro responde 404, y las cuatro tarjetas que dependen de él deben decir exactamente eso, no un error genérico. Lo cubre la prueba de `errorDeLibroClaro` (Tarea 8).
- **La sesión de Access vence, o se cae la red, con la pestaña abierta.** Los refrescos fallan. La página debe conservar los últimos datos, mostrar su antigüedad y pedir recargar; nunca mostrar números viejos como si fueran actuales. Lo cubre la verificación 6 de la Tarea 9.
- **Recién publicado, sin datos acumulados:** sin correos registrados, sin corridas, una sola fila en `uso_diario` y primer día del ciclo. Debe verse "sin datos" o "el ritmo aparece…"; nunca `NaN`, porcentajes engañosos ni alertas falsas. Lo cubre la prueba "recién publicado" (Tarea 7).
- **Cloudflare responde 200 con `errors` y `data: null`** (token sin permiso, ventana de más de una semana). La tarjeta debe mostrar el mensaje, no ceros. Lo cubre la prueba de `leerInvocaciones` (Tarea 8).
- **Entre las 7 p. m. y la medianoche de Lima la fecha UTC ya cambió.** El contador diario de Resend vuelve a 0, y `uso_diario` y la clave de recordatorios usan el día de Lima, sin duplicar ni saltar alertas. Lo cubren las pruebas de `fechaEnLima` (Tarea 3), de `cuotaResendVigente` (Tarea 5) y de la clave a las 02:00 UTC (Tarea 7).

## Lo que hace Fabrizio, y cuándo

| Tarea | Lo que hace Fabrizio |
|---|---|
| 1 | Aprueba que se aplique la migración 0009. |
| 4 | Confirma que llegaron los 2 correos de prueba a libroclaro.pe@gmail.com. |
| 8 | Antes de la verificación, crea el token de Cloudflare (la guía está en esa tarea). |
| 9 | Mira el panel en `http://localhost:8790` y pide cambios o dice "súbelo". |
| 10 | Activa Zero Trust y crea la app de Access (con guía), aprueba los secretos, corre el deploy del panel si el clasificador lo frena, entra con su correo y prueba con otro. |

---

### Task 1: Migración 0009

**Files:**
- Create: `supabase/migrations/0009_panel_de_consumo.sql`

**Interfaces:**
- Produces (la usan las Tareas 2 a 4):
  - **`public.uso_de_la_plataforma() returns jsonb`**, con exactamente estas 7 claves:

    | Clave | De dónde sale |
    |---|---|
    | `base_bytes` | `pg_database_size(current_database())` |
    | `archivos_bytes` | suma de `(metadata->>'size')::bigint` en `storage.objects` (0 si no hay) |
    | `usuarios` | filas de `auth.users` |
    | `usuarios_activos_30d` | `auth.users` con `last_sign_in_at` en los últimos 30 días |
    | `negocios` | todas las filas de `businesses`, archivadas incluidas |
    | `reclamos` | filas de `complaints` |
    | `suscripciones_activas` | `businesses` con `mp_subscription_status = 'authorized'` |

    Se declara `language sql stable security definer set search_path = ''` (todo con esquema), con `revoke all … from public, anon, authenticated` y `grant execute … to service_role`.
  - **Tablas nuevas:**
    - `public.uso_plataformas (clave text primary key, valor jsonb not null, actualizado timestamptz not null default now())`
    - `public.uso_diario (fecha date primary key, base_bytes bigint not null)`
    - `public.alertas_panel (clave text primary key, texto text not null, enviada_el timestamptz not null default now())`
  - Las tres tablas llevan RLS activo y ninguna política.

- [ ] **Step 1:** Escribir el archivo con un comentario de cabecera al estilo de 0005 y 0008: qué es, y por qué solo el servidor lee y escribe estas tablas.
- [ ] **Step 2: Pruebas en transacción revertida.** Con `execute_sql` del MCP de Supabase, en el proyecto `rcjgprzmvtspviwyyrhy`. Una llamada por caso, cada una con la forma `begin; <contenido del archivo>; <caso>; rollback;`:
  - La función devuelve las 7 claves, y cada número coincide con su consulta directa (por ejemplo, `(f->>'reclamos')::bigint = (select count(*) from public.complaints)`).
  - `set local role anon; select public.uso_de_la_plataforma();` → error `permission denied for function uso_de_la_plataforma`.
  - El mismo caso con `authenticated` → el mismo error.
  - `set local role authenticated; insert into public.uso_plataformas (clave, valor) values ('x', '{}');` → error `new row violates row-level security policy`.
  - `insert into public.alertas_panel (clave, texto) values ('a', 'x'), ('a', 'y');` → error `duplicate key value violates unique constraint`.

  Al terminar, `select to_regclass('public.uso_diario')` → `null`: no quedó nada aplicado.
- [ ] **Step 3:** Pedir a Fabrizio el OK para aplicarla. Con el OK, `apply_migration` con el nombre `0009_panel_de_consumo` y el contenido del archivo.
- [ ] **Step 4: Verificar.**
  - `select public.uso_de_la_plataforma()` devuelve los 7 números.
  - `get_advisors` (seguridad) no trae avisos nuevos, salvo el informativo de "RLS sin políticas" de las tres tablas, igual que con `plan_reminders`.
- [ ] **Step 5:** Commit: `git add supabase/migrations/0009_panel_de_consumo.sql` · "Panel de consumo: migración 0009".

### Task 2: LibroClaro guarda la cuota de Resend y cada corrida de los recordatorios

**Files:**
- Create: `src/lib/consumo.ts`, `src/lib/consumo.test.ts`, `src/lib/uso.ts`
- Modify: `src/lib/email.ts` (en `sendEmail`, después de `res.ok`)
- Modify: `src/app/api/cron/reminders/route.ts`

**Interfaces:**
- Consumes: la tabla `uso_plataformas` (Tarea 1).
- Produces:
  - **`cuotaDeResend(h: Headers): { dia: number | null; mes: number | null } | null`**
    - Lee `x-resend-daily-quota` y `x-resend-monthly-quota`: correos ya usados en el día y en el mes.
    - Devuelve `null` si no viene ninguna de las dos.
  - **`guardarUso(clave: "resend" | "cron.recordatorios", valor: Record<string, unknown>): Promise<void>`**, en `uso.ts`:
    - Hace upsert por `clave` con `actualizado = now`.
    - Sin service role, no hace nada.
    - Nunca lanza: registra el error con `console.error("[uso]", …)`.
  - **Filas que quedan en `uso_plataformas`:**

    | Clave | Valor | `actualizado` |
    |---|---|---|
    | `resend` | `{ dia, mes }` | hora del envío |
    | `cron.recordatorios` | `{ ok: boolean, enviados: number, negocios: number, error: string \| null }` | hora de la corrida |

- [ ] **Step 1: Pruebas que fallan**, en `consumo.test.ts`:
```ts
const h = (o: Record<string, string>) => new Headers(o);
test("cuotaDeResend lee las dos cabeceras", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-daily-quota": "3", "x-resend-monthly-quota": "18" })), { dia: 3, mes: 18 }));
test("cuotaDeResend sin la diaria (plan pagado)", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-monthly-quota": "18" })), { dia: null, mes: 18 }));
test("cuotaDeResend sin cabeceras devuelve null", () => assert.equal(cuotaDeResend(h({})), null));
test("cuotaDeResend ignora lo que no es entero", () =>
  assert.deepEqual(cuotaDeResend(h({ "x-resend-daily-quota": "abc", "x-resend-monthly-quota": "18" })), { dia: null, mes: 18 }));
```
- [ ] **Step 2:** `node --test src/lib/consumo.test.ts` → FAIL (el módulo no existe).
- [ ] **Step 3:** Implementar `cuotaDeResend` en `consumo.ts` y `guardarUso` en `uso.ts` (con `createAdminClient` y `hasAdminClient`).
- [ ] **Step 4:** `node --test src/lib/consumo.test.ts` → 4 pass.
- [ ] **Step 5: Conectar las dos escrituras.**
  - **En `sendEmail`:** después de `res.ok`, si `cuotaDeResend(res.headers)` devuelve algo, `await guardarUso("resend", cuota)`. Va con `await` porque en el Worker una promesa suelta se puede cortar al responder.
  - **En el cron de recordatorios:**
    - Si falla la consulta de reclamos, guardar `{ ok: false, enviados: 0, negocios: 0, error: error.message }` antes de responder 500.
    - Al terminar, guardar `{ ok: !("error" in planes), enviados: sent + (planes.enviados ?? 0), negocios: byBusiness.size, error: planes.error ?? null }`.
    - Los caminos 401 y 503 no guardan nada.
  - Esto se comprueba en vivo: la parte de Resend en la Tarea 4 y la del cron en la Tarea 10.
- [ ] **Step 6:** `npm test` y `npx tsc --noEmit` → sin fallos.
- [ ] **Step 7:** Commit de los 5 archivos: "Panel de consumo: LibroClaro guarda la cuota de Resend y las corridas del cron".

### Task 3: `GET /api/panel/resumen`

**Files:**
- Modify: `src/lib/consumo.ts`, `src/lib/consumo.test.ts`
- Create: `src/app/api/panel/resumen/route.ts`
- Modify: `.env.example` (línea `PANEL_SECRET=` con su comentario)

**Interfaces:**
- Consumes: `uso_de_la_plataforma()`, `uso_plataformas`, `uso_diario` y `alertas_panel` (Tarea 1); las filas que escribe la Tarea 2.
- Produces, en `consumo.ts`:
  - **`secretoValido(recibido: string | null, esperado: string | undefined): Promise<boolean>`**
    - Devuelve `false` si falta cualquiera de los dos.
    - Compara el SHA-256 de ambos (`crypto.subtle.digest`) byte a byte, acumulando con XOR: tarda lo mismo acierte o no.
  - **`fechaEnLima(d: Date): string`** → `"YYYY-MM-DD"`.
  - **`inicioDelMesEnLima(d: Date): string`** → `"YYYY-MM-01T00:00:00.000-05:00"`.
  - **`resumenDePagos(pagos: PagoMP[]): { cobrado: number; comisiones: number; pagos: number }`**
    - `PagoMP = { status: string; transaction_amount: number; fee_details?: { amount: number; fee_payer?: string }[] }`.
    - Cuenta solo los pagos `approved`.
    - Las comisiones son las de `fee_details` con `fee_payer === "collector"`.
    - Redondea a 2 decimales.
  - **`interface ResumenLibroClaro`**: el JSON que devuelve la ruta. El panel lo importa con `import type`.
```ts
export interface ResumenLibroClaro {
  supabase:
    | { base_bytes: number; archivos_bytes: number; usuarios: number; usuarios_activos_30d: number;
        negocios: number; reclamos: number; suscripciones_activas: number;
        diario: { fecha: string; base_bytes: number }[] } // hasta 8 días, del más antiguo al más nuevo
    | { error: string };
  resend: { dia: number | null; mes: number | null; fecha: string } | null | { error: string }; // null: aún sin envíos
  recordatorios: { hora: string; ok: boolean; enviados: number; error: string | null } | null | { error: string };
  mercado_pago: { cobrado: number; comisiones: number; pagos: number } | { error: string };
  alertas_del_mes: { clave: string; texto: string; enviada_el: string }[] | { error: string };
}
```

- [ ] **Step 1: Pruebas que fallan**, agregadas a `consumo.test.ts`:
  - **`secretoValido`:**
    - `await secretoValido("abc123", "abc123") === true`.
    - Devuelven `false`: `("abc124", "abc123")`, `("abc", "abc123")`, `(null, "abc123")`, `("", "")` y `("x", undefined)`.
  - **`fechaEnLima`:**
    - `fechaEnLima(new Date("2026-10-06T04:59:00Z")) === "2026-10-05"`.
    - `fechaEnLima(new Date("2026-10-06T05:00:00Z")) === "2026-10-06"`.
  - **`inicioDelMesEnLima`:** con `new Date("2026-10-05T12:00:00Z")` y con `new Date("2026-11-01T03:00:00Z")` devuelve `"2026-10-01T00:00:00.000-05:00"` en los dos casos.
  - **`resumenDePagos`:** con tres pagos →

    | `status` | `transaction_amount` | `fee_details` |
    |---|---|---|
    | `approved` | 19 | 1,96 del `collector` |
    | `approved` | 149 | 7,32 del `collector` y 3 del `payer` |
    | `refunded` | 59 | 3,61 del `collector` |

    → `{ cobrado: 168, comisiones: 9.28, pagos: 2 }`. Con `[]` → `{ cobrado: 0, comisiones: 0, pagos: 0 }`.
- [ ] **Step 2:** `node --test src/lib/consumo.test.ts` → FAIL en las pruebas nuevas.
- [ ] **Step 3:** Implementarlas → `node --test src/lib/consumo.test.ts` pasa entero.
- [ ] **Step 4: La ruta `GET`.**
  - **Acceso:**
    - Si `!(await secretoValido(request.headers.get("x-panel-secret"), process.env.PANEL_SECRET))` → `new NextResponse(null, { status: 404 })`.
    - Sin service role → 503.
  - **Consultas, en paralelo:** si una falla, solo su parte lleva `{ error }`.
    - `rpc("uso_de_la_plataforma")`.
    - `uso_plataformas` con las claves `resend` y `cron.recordatorios`. Si esta consulta falla, el error va en las dos secciones.
    - `alertas_panel` con `enviada_el >= inicioDelMesEnLima(ahora)`, de la más nueva a la más vieja, 20 como máximo.
    - Los pagos de Mercado Pago.
  - **Mercado Pago:**
    - `GET https://api.mercadopago.com/v1/payments/search?status=approved&range=date_approved&begin_date=<inicioDelMesEnLima>&end_date=NOW&sort=date_approved&criteria=desc&limit=100&offset=<n>`, con `Authorization: Bearer ${MP_ACCESS_TOKEN}`.
    - Paginar mientras `offset < paging.total`, 10 páginas como máximo, y pasar el resultado por `resumenDePagos`.
    - Sin token → `{ error: "Falta MP_ACCESS_TOKEN" }`.
  - **Fila diaria:** con el tamaño de la base, `upsert` en `uso_diario` de `{ fecha: fechaEnLima(ahora), base_bytes }` con `ignoreDuplicates: true` (se queda el primer dato del día). Después, leer las últimas 8 filas.
  - **Respuesta:** `ResumenLibroClaro` con `Cache-Control: no-store`.
- [ ] **Step 5: Secreto local y ayudante.** Dos scripts desechables en el scratchpad:
  - `panel-secreto.mjs`: si `../libroclaro/.env.local` no tiene `PANEL_SECRET=`, agrega `PANEL_SECRET=<randomBytes(32) en base64url>`. Imprime solo "creado" o "ya existía".
  - `llamar-panel.mjs <url> [cuerpo-json] [--sin-secreto|--secreto-malo]`: lee el secreto de ese archivo, lo manda en `x-panel-secret` (POST si hay cuerpo) e imprime el estado y el cuerpo.
- [ ] **Step 6: Servidor local**, que se reutiliza en la Tarea 4: en segundo plano y con la salida a un archivo, `node --env-file=../libroclaro/.env.local node_modules/next/dist/bin/next dev -p 3005`.
- [ ] **Step 7: Verificar.**
  - Sin secreto → 404. Con secreto malo → 404.
  - Con secreto → 200, con las 5 claves, números y ningún `@` en el cuerpo.
  - Una segunda llamada no agrega otra fila: `select count(*) from uso_diario` → 1.
- [ ] **Step 8:** `npm test` y `npx tsc --noEmit` → sin fallos. Commit de los 4 archivos: "Panel de consumo: resumen de LibroClaro para el panel".

### Task 4: `POST /api/panel/alertas`

**Files:**
- Modify: `src/lib/consumo.ts`, `src/lib/consumo.test.ts`, `src/lib/email.ts`
- Create: `src/app/api/panel/alertas/route.ts`

**Interfaces:**
- Consumes: `secretoValido` (Tarea 3), `notifyPlatform` y la captura de Resend (Tarea 2), `alertas_panel` (Tarea 1).
- Produces:
  - **`interface AlertaPanel { clave: string; texto: string }`**, en `consumo.ts`. El panel lo importa.
  - **`leerAlertas(cuerpo: unknown): AlertaPanel[] | null`**
    - Acepta `{ alertas: [...] }` con 1 a 20 elementos, cada `clave` que cumpla `/^[a-z0-9.-]{1,120}$/` y cada `texto` de 1 a 500 caracteres.
    - Si hay claves repetidas, deja la primera.
    - Cualquier otra cosa → `null`.
  - **`tplPlatformAlertas(alertas: AlertaPanel[]): { subject: string; html: string }`**, en `email.ts`:
    - Asunto `Alerta del panel: <texto>` si es una sola; `<n> alertas del panel de consumo` si son varias.
    - Cuerpo con la lista escapada y un botón "Abrir el panel" a `https://panel.libroclaro.pe`.
    - Pie "Aviso interno de LibroClaro".
  - **La ruta:**
    - Responde 404 sin secreto válido, 400 si `leerAlertas` da `null`, y 200 con `{ enviadas: number; repetidas: number; fallidas: number }`.
    - Reserva cada alerta con un `insert` en `alertas_panel`; si da el error `23505`, cuenta como repetida.
    - Con las nuevas, manda un solo correo con `notifyPlatform`.
    - Si el correo no sale (`!ok`, incluido "omitido"), borra esas claves, que se reintentan en la hora siguiente, y las cuenta como fallidas.

- [ ] **Step 1: Pruebas que fallan** de `leerAlertas`:
  - Una válida → `[{ clave: "cloudflare.cpu.80.2026-10-29", texto: "x" }]`.
  - Devuelven `null`: `{ alertas: [] }`, 21 elementos, la clave `"Cloudflare CPU"`, un texto de 501 caracteres, `"hola"` y `null`.
  - Dos con la misma clave → un solo elemento.
- [ ] **Step 2:** `node --test src/lib/consumo.test.ts` → FAIL en las pruebas nuevas.
- [ ] **Step 3:** Implementar `leerAlertas`, `tplPlatformAlertas` y la ruta → `node --test src/lib/consumo.test.ts` pasa.
- [ ] **Step 4: Verificar con el servidor local**, usando `llamar-panel.mjs`:
  - Sin secreto → 404. Con cuerpo `{}` → 400.
  - `{ alertas: [{ clave: "prueba.local.<epoch>", texto: "Alerta de prueba del panel (local)" }] }` → `{ enviadas: 1, repetidas: 0, fallidas: 0 }`. La misma otra vez → `{ enviadas: 0, repetidas: 1, fallidas: 0 }`.
  - Dos POST en paralelo con otra clave nueva → entre los dos, `enviadas` suma 1.
  - La fila `resend` de `uso_plataformas` tiene `actualizado` de hace menos de 2 minutos y `dia`/`mes` numéricos: la captura de la Tarea 2 funciona.
  - `GET /api/panel/resumen` → `alertas_del_mes` trae las 2 alertas de prueba.
  - **Sin Resend:** detener el servidor y levantarlo igual pero con `RESEND_API_KEY=` vacío delante del comando. Un POST con una clave nueva → `{ enviadas: 0, repetidas: 0, fallidas: 1 }`, y esa clave no queda en `alertas_panel`. Volver a levantarlo normal.
- [ ] **Step 5:** Fabrizio confirma que llegaron 2 correos, uno por clave. Luego `delete from public.alertas_panel where clave like 'prueba.local.%'`.
- [ ] **Step 6:** `npm test` y `npx tsc --noEmit` → sin fallos. Commit de los 4 archivos: "Panel de consumo: alertas por correo sin repetir".

### Task 5: Base del panel y cálculos

**Files:**
- Create: `panel/tsconfig.json`, `panel/src/config.ts`, `panel/src/tipos.ts`, `panel/src/calculos.ts`, `panel/src/calculos.test.ts`
- Modify: `tsconfig.json` (agregar `"panel"` a `exclude`, porque lo revisa su propio tsconfig y `next build` no debe tocarlo)
- Modify: `package.json` (`"test": "node --test \"src/**/*.test.ts\" \"panel/src/**/*.test.ts\""`)

**Interfaces:**
- Consumes:
  - `PLANS` de `../../src/lib/plans.ts`.
  - `fechaEnLima` de `../../src/lib/consumo.ts`.
  - Los tipos `ResumenLibroClaro` y `AlertaPanel`, con `import type`.
- Produces:
  - **`panel/tsconfig.json`:** `target "ES2022"`, `module "ESNext"`, `moduleResolution "Bundler"`, `strict`, `noEmit`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `lib ["ES2022", "DOM"]`, `types ["node"]`, `include ["src/**/*.ts"]`.
  - **`config.ts`:**
    - `CONFIG`, con los valores de Global Constraints agrupados en `verificadoEl: "2026-10-05"`, `tipoDeCambio: 3.7`, `cloudflare`, `supabase` (con `proyecto: "rcjgprzmvtspviwyyrhy"`), `resend` y `mercadoPago`.
    - Las constantes `MB`, `GB` y `RUC_DE_PRUEBA = "20131312955"` (el RUC de SUNAT).
    - `NOMBRES`:

      | Clave | Nombre |
      |---|---|
      | `cloudflare.visitas` | "Visitas de Cloudflare" |
      | `cloudflare.cpu` | "Tiempo de CPU de Cloudflare" |
      | `supabase.base` | "Base de datos de Supabase" |
      | `supabase.archivos` | "Archivos de Supabase" |
      | `supabase.usuarios` | "Usuarios activos de Supabase" |
      | `resend.dia` | "Correos de hoy (Resend)" |
      | `resend.mes` | "Correos del mes (Resend)" |

  - **`tipos.ts`:** el contrato entre el Worker, las alertas y la página.
```ts
import type { AlertaPanel, ResumenLibroClaro } from "../../src/lib/consumo.ts";
import type { CONFIG } from "./config.ts";
export type Alerta = AlertaPanel;
export type Estado = "ok" | "atencion" | "limite";
export type Fuente<T> = ({ ok: true } & T) | { ok: false; error: string };
export type Unidad = "visitas" | "ms" | "bytes" | "usuarios" | "correos";
export interface Medidor { usado: number; limite: number; unidad: Unidad; pct: number; estado: Estado;
  proyeccion: number | null; llegaEl: string | null } // pct sin redondear; null = sin ritmo / no llega
export interface Prueba { ok: boolean; ms: number | null; error: string | null }
export interface Resumen {
  generado: string; estado: Estado; fuentesConError: string[];
  gasto: { usd: number; soles: number };
  masCercano: { nombre: string; medidor: Medidor } | null;
  proximoCobro: { fecha: string; usd: number };
  cloudflare: Fuente<{ ciclo: { inicio: string; fin: string; dia: number; dias: number; estimado: boolean };
    visitas: Medidor; cpu: Medidor; errores: number; extraUsd: number; porDia: { fecha: string; visitas: number }[] }>;
  supabase: Fuente<{ base: Medidor; archivos: Medidor; usuarios: Medidor; negocios: number; reclamos: number;
    ritmoBytesDia: number | null }>;
  resend: Fuente<{ dia: Medidor | null; mes: Medidor | null; ultimoEnvio: string | null }>;
  mercadoPago: Fuente<{ suscripcionesActivas: number | null; cobrado: number; comisiones: number; pagos: number;
    tabla: { plan: string; precio: number; comision: number; recibes: number }[] }>;
  servicios: { ruc: Prueba; qr: Prueba };
  recordatorios: Fuente<{ ultima: { hora: string; ok: boolean; enviados: number; error: string | null } | null;
    dias: { fecha: string; estado: "ok" | "fallo" | "sin_corrida" | "pendiente" }[] }>;
  alertas: Alerta[]; // las que tocan ahora; el cron se las pasa a LibroClaro
  alertasDelMes: Fuente<{ lista: { texto: string; enviadaEl: string }[] }>;
  config: typeof CONFIG;
}
export interface DatosCrudos {
  ciclo: { inicio: Date; fin: Date; estimado: boolean };
  cloudflare: Fuente<{ porDia: { fecha: string; visitas: number; cpuMs: number; errores: number }[] }>;
  cron: Fuente<{ corridas: { datetime: string; status: string }[] }>;
  libroclaro: Fuente<{ datos: ResumenLibroClaro }>;
  ruc: Prueba; qr: Prueba;
}
```
  - **`calculos.ts`** (`DIA_MS = 86_400_000`):
    - `cicloDeCobro(ahora: Date, diaDeCorte: number): { inicio: Date; fin: Date }`: medianoche UTC del día de corte, o del último día del mes si el mes es más corto; cumple `inicio <= ahora < fin`.
    - `tramosSemanales(desde: Date, hasta: Date): { desde: Date; hasta: Date }[]`: tramos contiguos de 7 días como máximo; `[]` si `hasta <= desde`.
    - `estadoPorPorcentaje(pct: number): Estado`.
    - `promedioReciente(porDia: { fecha: string; valor: number }[], hoy: string, maxDias = 7): number | null`: promedio de los últimos `maxDias` días completos (`fecha < hoy`); `null` si no hay ninguno.
    - `proyectar(usado: number, promedioDiario: number | null, ahora: Date, fin: Date): number | null`: `usado + promedio × (fin − ahora) / DIA_MS`.
    - `diaEnQueLlega(usado: number, limite: number, promedioDiario: number | null, ahora: Date, hasta: Date): Date | null`: `ahora` si ya llegó; `null` sin ritmo, con ritmo ≤ 0, o si llegaría en `hasta` o después.
    - `ritmoDeLaBase(filas: { fecha: string; base_bytes: number }[], hoy: string): number | null`: toma las filas de `hoy − 6` a `hoy` y calcula (última − primera) / días entre las dos; `null` con menos de 3 filas.
    - `cuotaResendVigente(s: { dia: number | null; mes: number | null; fecha: string } | null, ahora: Date): { dia: number | null; mes: number | null } | null`: `dia` pasa a 0 si `s.fecha` es de otro día UTC, y `mes` a 0 si es de otro mes UTC.
    - `diasDelCron(corridas: { datetime: string; status: string }[], ahora: Date): { fecha: string; estado: "ok" | "fallo" | "sin_corrida" | "pendiente" }[]`: los 7 días de Lima hasta hoy, del más viejo al más nuevo. Cada día queda así:
      - `ok` si alguna corrida de ese día tiene `status === "success"`;
      - `fallo` si hubo corridas y ninguna lo es;
      - `pendiente` si es hoy y todavía no hubo corrida;
      - `sin_corrida` en los demás casos.
    - `comisionMP(precio: number): { comision: number; recibes: number }`: `comision = round2((precio × 0,0349 + 1) × 1,18)`.
    - `extraCloudflareUsd(visitas: number, cpuMs: number): number`: redondeado a 2 decimales.

- [ ] **Step 1:** Crear `panel/tsconfig.json`, `config.ts` y `tipos.ts`; ajustar `tsconfig.json` de la raíz y el script `test`.
- [ ] **Step 2: Pruebas que fallan**, en `calculos.test.ts`, con `d = (s: string) => new Date(s)`:
  - **`cicloDeCobro(…, 29)`:**

    | `ahora` | `inicio` | `fin` |
    |---|---|---|
    | `2026-10-05T15:00Z` | 2026-09-29 | 2026-10-29 |
    | `2026-10-29T00:00Z` | 2026-10-29 | 2026-11-29 |
    | `2027-02-27T12:00Z` | 2027-01-29 | 2027-02-28 |
    | `2027-02-28T12:00Z` | 2027-02-28 | 2027-03-29 |
    | `2028-02-29T12:00Z` | 2028-02-29 | 2028-03-29 |
    | `2026-12-30T00:00Z` | 2026-12-29 | 2027-01-29 |

    Todos los límites son a las `T00:00:00.000Z`.
  - **`tramosSemanales`:**
    - De `2026-09-29T00:00Z` a `2026-10-05T15:00Z` → un solo tramo, igual a esos dos extremos.
    - De `2026-09-29T00:00Z` a `2026-10-28T12:00Z` → 5 tramos. El primero termina el 2026-10-06T00:00Z y el último va del `2026-10-27T00:00Z` al `2026-10-28T12:00Z`. Cada uno dura 7 días o menos, y cada `hasta` es el `desde` del siguiente.
    - Con `desde` igual a `hasta` → `[]`.
  - **`estadoPorPorcentaje`:** 79,99 → `ok`; 80 → `atencion`; 99,99 → `atencion`; 100 → `limite`.
  - **`promedioReciente`:**
    - Fechas del 2026-09-29 al 10-05 con valores 10, 20, 30, 40, 50, 60 y 999, con `hoy = "2026-10-05"` → 35.
    - Con 9 días completos, promedia solo los últimos 7.
    - Si solo está el día de hoy → `null`.
  - **`proyectar`:**
    - `proyectar(100, 35, d("2026-10-05T12:00:00Z"), d("2026-10-29T00:00:00Z")) === 922.5`.
    - Con promedio `null` → `null`.
  - **`diaEnQueLlega`**, con `ahora = d("2026-10-05T00:00:00Z")` y `hasta = d("2026-10-29T00:00:00Z")`:

    | `usado` | `limite` | `promedioDiario` | Resultado |
    |---|---|---|---|
    | 900 | 1000 | 50 | `d("2026-10-07T00:00:00Z")` |
    | 100 | 1000 | 10 | `null` (llegaría después de `hasta`) |
    | 1000 | 1000 | 5 | `ahora` |
    | 500 | 1000 | 0 | `null` |
    | 500 | 1000 | `null` | `null` |

  - **`ritmoDeLaBase`:**
    - Con las filas `09-20: 0`, `10-01: 100`, `10-03: 160` y `10-05: 220`, y `hoy = "2026-10-05"` → 30.
    - Con solo `10-04: 100` y `10-05: 130` → `null`.
  - **`cuotaResendVigente`:**

    | Dato guardado | `ahora` | Resultado |
    |---|---|---|
    | `{ dia: 40, mes: 900, fecha: "2026-10-05T23:59:00Z" }` | `2026-10-06T00:01:00Z` | `{ dia: 0, mes: 900 }` |
    | el mismo | `2026-10-05T23:59:30Z` | `{ dia: 40, mes: 900 }` |
    | `{ dia: 40, mes: 2900, fecha: "2026-10-31T20:00:00Z" }` | `2026-11-01T00:30:00Z` | `{ dia: 0, mes: 0 }` |
    | `{ dia: null, mes: 18 }`, del mismo día | ese día | `{ dia: null, mes: 18 }` |
    | `null` | cualquiera | `null` |

  - **`diasDelCron`:**
    - Con `[{ datetime: "2026-10-05T13:00:05Z", status: "success" }, { datetime: "2026-10-04T13:00:03Z", status: "error" }]` y `ahora = d("2026-10-05T15:00:00Z")` → 7 días, del `2026-09-29` al `2026-10-05`. El día 6 queda `ok`, el 5 `fallo` y el 0 `sin_corrida`.
    - `diasDelCron([], d("2026-10-05T12:00:00Z"))[6].estado === "pendiente"`.
  - **`comisionMP`:**

    | Precio | Comisión | Recibes |
    |---|---|---|
    | 19 | 1,96 | 17,04 |
    | 149 | 7,32 | 141,68 |
    | 59 | 3,61 | 55,39 |
    | 499 | 21,73 | 477,27 |

  - **`extraCloudflareUsd`:** `(10_000_000, 30_000_000)` → 0; `(12_000_000, 30_000_000)` → 0,6; `(0, 35_000_000)` → 0,1.
- [ ] **Step 3:** `node --test panel/src/calculos.test.ts` → FAIL (el módulo no existe).
- [ ] **Step 4:** Implementar `calculos.ts` → `node --test panel/src/calculos.test.ts` pasa entero.
- [ ] **Step 5:** `npm test`, `npx tsc --noEmit` y `npx tsc -p panel/tsconfig.json` → sin fallos. Commit de los 7 archivos: "Panel de consumo: base del panel y cálculos".

### Task 6: Verificación del token de Access

**Files:**
- Create: `panel/src/access.ts`, `panel/src/access.test.ts`

**Interfaces:**
- Produces:
  - **`verificarAccess(token: string | null, o: { equipo: string; aud: string; llaves: () => Promise<JsonWebKey[]>; ahora?: number }): Promise<{ ok: true; email: string } | { ok: false; motivo: string }>`**
    - `equipo` es el dominio del equipo (`<equipo>.cloudflareaccess.com`).
    - Exige `alg: "RS256"`, un `kid` que esté en `llaves()`, firma RSASSA-PKCS1-v1_5/SHA-256 válida, un `aud` (texto o lista) que incluya `o.aud`, `iss === "https://" + equipo` y `exp × 1000 > ahora`.
    - Nunca lanza: cualquier error devuelve `{ ok: false }`.
  - **`llavesDeAccess(equipo: string): Promise<JsonWebKey[]>`**: `GET https://<equipo>/cdn-cgi/access/certs` → `keys`. Las guarda 1 h en la memoria del módulo.

- [ ] **Step 1: Pruebas que fallan**, en `access.test.ts`.
  - **Preparación:**
    - Las llaves se generan en la prueba con `crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"])`, y un ayudante `firmar(payload, llavePrivada, kid)` arma los tokens.
    - Valores base: `equipo = "libroclaro.cloudflareaccess.com"`, `aud = "aud-de-prueba"`, `ahora = 1_790_000_000_000`.
    - Payload base: `{ aud: ["aud-de-prueba"], iss: "https://libroclaro.cloudflareaccess.com", email: "libroclaro.pe@gmail.com", exp: 1_790_000_600 }`.
  - **Casos:**

    | Caso | Resultado |
    |---|---|
    | token válido | `{ ok: true, email: "libroclaro.pe@gmail.com" }` |
    | `aud: ["otra"]` | `ok: false` |
    | `exp: 1_789_999_999` (vencido) | `ok: false` |
    | `iss` de otro equipo | `ok: false` |
    | firmado con otra llave privada, mismo `kid` | `ok: false` |
    | `kid` desconocido | `ok: false` |
    | token `null`, `""` o `"abc"` | `ok: false` |
    | `o.aud = ""` (Access sin configurar) | `ok: false` |

- [ ] **Step 2:** `node --test panel/src/access.test.ts` → FAIL.
- [ ] **Step 3:** Implementar con WebCrypto: `importKey("jwk", …, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"])` → `node --test panel/src/access.test.ts` → pasan todas.
- [ ] **Step 4:** `npm test` y `npx tsc -p panel/tsconfig.json` → sin fallos. Commit de los 2 archivos: "Panel de consumo: verificación del token de Access".

### Task 7: Resumen y alertas (funciones puras)

**Files:**
- Create: `panel/src/resumen.ts`, `panel/src/alertas.ts`, `panel/src/resumen.test.ts`

**Interfaces:**
- Consumes: `calculos`, `config` y `tipos` (Tarea 5); `PLANS`.
- Produces:
  - **`armarResumen(d: DatosCrudos, ahora: Date): Resumen`**. Reglas por sección:
    - **Cloudflare:**
      - `porDia` lleva ceros en los días sin datos, desde `ciclo.inicio` hasta hoy (UTC). Visitas y CPU son las sumas.
      - Ritmo: `promedioReciente`, con `hoy` en UTC.
      - `proyeccion` y `llegaEl` hasta `ciclo.fin`.
      - `dia = floor((ahora − inicio) / DIA_MS) + 1` y `dias = round((fin − inicio) / DIA_MS)`.
    - **Supabase:**
      - `base.llegaEl = diaEnQueLlega(usado, 500 MB, ritmoDeLaBase(diario, fechaEnLima(ahora)), ahora, ahora + 365 días)`.
      - `proyeccion` es `null` en sus tres medidores; archivos y usuarios no llevan `llegaEl`.
    - **Resend:**
      - Usa `cuotaResendVigente`.
      - `dia` es el medidor con límite 100, o `null` si no hay dato.
      - `mes` es el medidor con límite 3.000, con `proyeccion = usado / díaDelMesUTC × díasDelMes` y `llegaEl` hasta fin de mes (UTC).
      - `ultimoEnvio` es la `fecha` del dato guardado.
    - **Mercado Pago:**
      - `tabla`: Pro mensual, Pro anual, Empresa mensual y Empresa anual, con los precios de `PLANS` y `comisionMP`.
      - `suscripcionesActivas` sale de la sección de Supabase, o es `null` si esa sección falló.
    - **Recordatorios:** `dias = diasDelCron(cron.corridas, ahora)`, o `[]` si `cron` falló.
    - **Si LibroClaro falló:**
      - Si falló entero: `supabase`, `resend`, `mercadoPago`, `recordatorios` y `alertasDelMes` llevan `{ ok: false, error: libroclaro.error }`, con el texto tal cual.
      - Si solo una sección trae `{ error }`: solo esa sección falla.
    - **Arriba de la página:**
      - `estado`: el peor de los medidores presentes.
      - `masCercano`: el medidor con mayor `pct`, con su nombre de `NOMBRES`.
      - `gasto.usd = CONFIG.cloudflare.usdMes + extraUsd` (sin extra si Cloudflare falló) y `gasto.soles = round2(usd × 3,7)`.
      - `proximoCobro = { fecha: ciclo.fin en ISO, usd: gasto.usd }`.
      - `fuentesConError`, en este orden: "Cloudflare", "Supabase", "Resend", "Mercado Pago", "Recordatorios".
      - `alertas = alertasDelResumen(resumen, ahora)`.
  - **`alertasDelResumen(r: Resumen, ahora: Date): Alerta[]`**:
    - Una alerta por cada medidor con `pct >= 80`, solo con el umbral más alto que cruzó (100 u 80). Las claves son:

      | Medidor | Clave |
      |---|---|
      | Cloudflare | `cloudflare.{visitas\|cpu}.<u>.<fecha UTC de ciclo.fin>` |
      | Supabase | `supabase.{base\|archivos\|usuarios}.<u>.<YYYY-MM UTC>` |
      | Resend, día | `resend.dia.<u>.<YYYY-MM-DD UTC>` |
      | Resend, mes | `resend.mes.<u>.<YYYY-MM UTC>` |

    - El texto es `<NOMBRE> llegó al <floor(pct)> % de su límite (<usado> de <límite>).`, con números en es-PE: los ms en segundos y los bytes en MB/GB con 1 decimal.
    - Recordatorios, con la clave `cron.recordatorios.<fechaEnLima(ahora)>`:
      - si `ultima.ok === false`: `Los recordatorios de la mañana fallaron (<error, o "sin detalle">).`;
      - si `ultima.hora` es de hace más de 26 h: `Los recordatorios de la mañana no corren desde el <fecha y hora de Lima>.`.
    - Las fuentes caídas no generan alertas.

- [ ] **Step 1: Pruebas que fallan**, en `resumen.test.ts`.

  **El caso base, "día normal"**, lo arma un ayudante `datos(cambios)`:

  | Dato | Valor |
  |---|---|
  | `ahora` | `2026-10-05T15:00:00Z` |
  | Ciclo | del 2026-09-29 al 2026-10-29, `estimado: false` |
  | Cloudflare | 7 días, del 09-29 al 10-05, cada uno `{ visitas: 1000, cpuMs: 10_000, errores: 0 }` |
  | Cron | una corrida `success` por día, a las 13:00:05Z |
  | Supabase | `{ base_bytes: 12_268_339, archivos_bytes: 0, usuarios: 2, usuarios_activos_30d: 2, negocios: 2, reclamos: 39, suscripciones_activas: 0, diario: [{ fecha: "2026-10-05", base_bytes: 12_268_339 }] }` |
  | Resend | `{ dia: 1, mes: 18, fecha: "2026-10-05T14:00:00Z" }` |
  | Recordatorios | `{ hora: "2026-10-05T13:00:05Z", ok: true, enviados: 0, error: null }` |
  | Mercado Pago | `{ cobrado: 0, comisiones: 0, pagos: 0 }` |
  | Alertas del mes | `[]` |
  | RUC | `{ ok: true, ms: 500, error: null }` |
  | QR | `{ ok: true, ms: 2000, error: null }` |

  **Las pruebas:**
  1. **Día normal:**
     - `estado` es `"ok"`.
     - `ciclo.dia` 7 y `ciclo.dias` 30.
     - `visitas.usado` 7000 y `visitas.proyeccion` 30375.
     - `gasto` es `{ usd: 5, soles: 18.5 }`.
     - `masCercano.nombre` es "Base de datos de Supabase".
     - `tabla[0]` es `{ plan: "Pro mensual", precio: 19, comision: 1.96, recibes: 17.04 }`.
     - `proximoCobro` es `{ fecha: "2026-10-29T00:00:00.000Z", usd: 5 }`.
     - `alertas` es `[]`.
     - Los 7 días de recordatorios están en `ok`.
  2. **LibroClaro caído** (`libroclaro: { ok: false, error: "LibroClaro no respondió: timeout" }`):
     - Las 5 secciones que dependen de LibroClaro llevan ese mismo `{ ok: false, error }`.
     - `cloudflare.ok` sigue en `true` y `estado` en `"ok"`.
     - `fuentesConError` es `["Supabase", "Resend", "Mercado Pago", "Recordatorios"]`.
  3. **CPU al 85 %** (un día con `cpuMs: 25_440_000`):
     - `estado` es `"atencion"`.
     - Hay una sola alerta, con la clave `cloudflare.cpu.80.2026-10-29` y un texto que empieza con "Tiempo de CPU de Cloudflare llegó al 85 %".
  4. **CPU al 100 %** (ese día con `29_940_000`): `estado` es `"limite"` y la única alerta es `cloudflare.cpu.100.2026-10-29`.
  5. **Recordatorios fallidos:** con `ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY"` y `ahora = 2026-10-06T02:00:00Z`, hay una alerta `cron.recordatorios.2026-10-05` cuyo texto incluye "fallaron".
  6. **Recordatorios que no corren** (la última corrida, bien, a las `2026-10-05T13:00:05Z`):
     - Con `ahora = 2026-10-06T16:00:06Z` (27 h después) → alerta `cron.recordatorios.2026-10-06` cuyo texto incluye "no corren desde".
     - Con `ahora = 2026-10-06T14:00:05Z` (25 h) → ninguna alerta de recordatorios.
  7. **Recién publicado:**
     - Datos: `ahora = 2026-09-29T15:00:00Z`; Cloudflare solo con el 09-29 `{ visitas: 50, cpuMs: 300, errores: 0 }`; cron sin corridas; resend `null`; recordatorios `null`; `diario` con una sola fila.
     - Ningún número del objeto, recorrido entero, es `NaN` ni `Infinity`.
     - `alertas` es `[]`.
     - `visitas.proyeccion` y `ritmoBytesDia` son `null`.
     - `resend` es `{ ok: true, dia: null, mes: null, ultimoEnvio: null }`.
     - `recordatorios.dias[6].estado` es `"pendiente"`.
  8. **Resend de ayer** (`{ dia: 60, mes: 900, fecha: "2026-10-04T22:00:00Z" }`): `resend.dia.usado` es 0 y `resend.mes.usado` es 900.
- [ ] **Step 2:** `node --test panel/src/resumen.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `alertas.ts` y `resumen.ts` → `node --test panel/src/resumen.test.ts` → 8 pass.
- [ ] **Step 4:** `npm test` y `npx tsc -p panel/tsconfig.json` → sin fallos. Commit de los 3 archivos: "Panel de consumo: resumen y alertas".

### Task 8: Fuentes de datos y Worker del panel

**Files:**
- Create: `panel/wrangler.jsonc`, `panel/src/fuentes.ts`, `panel/src/fuentes.test.ts`, `panel/src/index.ts`

**Interfaces:**
- Consumes: las Tareas 5 a 7, y las rutas de LibroClaro de las Tareas 3 y 4.
- Produces:
  - **Lectores puros**, en `fuentes.ts`:
    - `leerInvocaciones(json: unknown): Fuente<{ porDia: { fecha: string; visitas: number; cpuMs: number; errores: number }[] }>`
    - `leerCorridas(json: unknown): Fuente<{ corridas: { datetime: string; status: string }[] }>`
    - `leerSuscripciones(json: unknown): { inicio: Date; fin: Date } | null`: toma la primera suscripción cuyo `rate_plan.id` o `rate_plan.public_name` contenga "worker" (sin importar mayúsculas) y que traiga las dos fechas del periodo.
    - `errorDeLibroClaro(status: number): string`
  - **`obtenerResumen(env: Env, o: { fresco: boolean }, ahora?: Date): Promise<Resumen>`**: guarda el resultado 60 s en la memoria del módulo, salvo con `fresco`.
  - **`interface Env`**: `{ ASSETS: Fetcher; LIBROCLARO: Fetcher; CLOUDFLARE_ACCOUNT_ID: string; CLOUDFLARE_ANALYTICS_TOKEN?: string; PANEL_SECRET?: string; ACCESS_EQUIPO?: string; ACCESS_AUD?: string; PANEL_SIN_ACCESS?: string; LIBROCLARO_URL?: string }`, con `Fetcher = { fetch(r: Request): Promise<Response> }`. Son tipos mínimos propios, como en `cloudflare/worker.ts`.
  - **`export default { fetch, scheduled }`**, en `index.ts`.

**Cómo se consulta cada fuente:**
- **Cloudflare GraphQL:** `POST https://api.cloudflare.com/client/v4/graphql` con `Authorization: Bearer <CLOUDFLARE_ANALYTICS_TOKEN>` y `$a = CLOUDFLARE_ACCOUNT_ID`. Se usan estas dos consultas:
```graphql
# Una por cada tramo de tramosSemanales(ciclo.inicio, ahora), en paralelo; se juntan por date (cpuMs = cpuTimeUs / 1000).
query ($a: string, $s: Time, $e: Time) { viewer { accounts(filter: { accountTag: $a }) {
  workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: $s, datetime_lt: $e }) {
    sum { requests errors cpuTimeUs } dimensions { date } } } } }
# Corridas del cron, con $s = ahora − 7 días y $e = ahora.
query ($a: string, $s: Time, $e: Time) { viewer { accounts(filter: { accountTag: $a }) {
  workersInvocationsScheduled(limit: 100, filter: { datetime_geq: $s, datetime_lt: $e, scriptName: "libroclaro" }, orderBy: [datetime_DESC]) {
    datetime status } } } }
```
- **Ciclo de cobro:** `GET https://api.cloudflare.com/client/v4/accounts/<CLOUDFLARE_ACCOUNT_ID>/subscriptions` → `leerSuscripciones`. Si da `null` o error, se usa `cicloDeCobro(ahora, 29)` con `estimado: true`.
- **LibroClaro:** `GET /api/panel/resumen` con `x-panel-secret`.
  - En local, `fetch(env.LIBROCLARO_URL + ruta)`; si no hay `LIBROCLARO_URL`, `env.LIBROCLARO.fetch(new Request("https://libroclaro.pe" + ruta, …))`.
  - Si falla la red → `LibroClaro no respondió: <mensaje>`. Si el estado no es 200 → `errorDeLibroClaro(status)`.
- **RUC:** `GET https://api.apis.net.pe/v1/ruc?numero=20131312955`. Responde si da 200 y el JSON trae `razonSocial` o `nombre`.
- **QR:** `GET https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=libroclaro`. Responde si da 200 y el `content-type` es `image/*`.
- En las dos pruebas se mide el tiempo de respuesta en ms.

**Cómo responde el Worker:**
- **Access en cada pedido:** salvo con `env.PANEL_SIN_ACCESS === "1"` (solo en `.dev.vars`), se llama a `verificarAccess` con la cabecera `cf-access-jwt-assertion`, `ACCESS_EQUIPO`, `ACCESS_AUD` y `llavesDeAccess`. Si falla → 403 con el texto "Acceso denegado".
- **`GET /api/resumen`:** devuelve el `Resumen` en JSON con `Cache-Control: no-store`. `?fresco=1` salta la caché. Cualquier otro método → 405.
- **Lo demás:** `env.ASSETS.fetch(request)`, con estas cabeceras:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
- **Cron cada hora (`scheduled`),** dentro de `ctx.waitUntil`:
  1. `obtenerResumen(env, { fresco: true })`.
  2. Si hay alertas, `POST /api/panel/alertas` con `{ alertas }` y `console.log("[alertas]", status, cuerpo)`.
  3. Si no hay, `console.log("[alertas] sin alertas")`.

- [ ] **Step 1: Pruebas que fallan**, en `fuentes.test.ts`:
  - **`leerInvocaciones`:**
    - Con `{ data: { viewer: { accounts: [{ workersInvocationsAdaptive: [{ sum: { requests: 664, errors: 1, cpuTimeUs: 12_345_000 }, dimensions: { date: "2026-10-05" } }] }] } }, errors: null }` → `{ ok: true, porDia: [{ fecha: "2026-10-05", visitas: 664, cpuMs: 12_345, errores: 1 }] }`.
    - Con `{ data: null, errors: [{ message: "not authorized for that account" }] }` → `{ ok: false, error: "Cloudflare: not authorized for that account" }`.
  - **`leerCorridas`:** el mismo par de casos, el normal y el de `errors`.
  - **`leerSuscripciones`:**
    - Con un `result` que trae `{ rate_plan: { id: "free", public_name: "Free" } }` y luego `{ rate_plan: { id: "workers_paid", public_name: "Workers Paid" }, current_period_start: "2026-09-29T16:45:00Z", current_period_end: "2026-10-29T16:45:00Z" }` → `{ inicio: new Date("2026-09-29T16:45:00Z"), fin: new Date("2026-10-29T16:45:00Z") }`.
    - Con `{ success: false, errors: [...] }` → `null`.
    - Sin ningún plan de Workers → `null`.
  - **`errorDeLibroClaro`:**
    - `errorDeLibroClaro(404) === "LibroClaro respondió 404: revisa que PANEL_SECRET sea el mismo en los dos Workers"`.
    - `errorDeLibroClaro(503) === "LibroClaro respondió 503"`.
- [ ] **Step 2:** `node --test panel/src/fuentes.test.ts` → FAIL. Implementar los lectores → pasa.
- [ ] **Step 3:** Escribir `panel/wrangler.jsonc` (con comentarios en español, como el `wrangler.jsonc` de la raíz), el resto de `fuentes.ts` e `index.ts`. Después, `npx tsc -p panel/tsconfig.json` → sin errores.
```jsonc
{
  "$schema": "../node_modules/wrangler/config-schema.json",
  "name": "libroclaro-panel",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-20",
  "routes": [{ "pattern": "panel.libroclaro.pe", "custom_domain": true }],
  "workers_dev": false,
  "preview_urls": false,
  "assets": { "directory": "./public", "binding": "ASSETS", "run_worker_first": true },
  "services": [{ "binding": "LIBROCLARO", "service": "libroclaro" }],
  "triggers": { "crons": ["0 * * * *"] },
  "vars": { "CLOUDFLARE_ACCOUNT_ID": "09006dca4aa7164ce87bddeeda2c43bb", "ACCESS_EQUIPO": "", "ACCESS_AUD": "" },
  "observability": { "enabled": true }
}
```
  Los comentarios del archivo deben explicar tres cosas:
  - con `run_worker_first`, la página también pasa por la verificación de Access;
  - el service binding llega a LibroClaro por dentro de Cloudflare, sin internet público ni las reglas de la zona;
  - con `ACCESS_*` vacíos todo responde 403 (se llenan en la Tarea 10).
- [ ] **Step 4: Fabrizio crea el token.** Pasos para darle:
  1. En dash.cloudflare.com, ir a Mi perfil → API Tokens → Create Token → Custom token.
  2. Permisos: Account · Account Analytics · Read, y Account · Billing · Read.
  3. Recursos: solo la cuenta de LibroClaro.
  4. Crear el token y pegarlo en `libroclaro/.env.local` como `CLOUDFLARE_ANALYTICS_TOKEN=…`, nunca en el chat.
- [ ] **Step 5: Variables locales.** Script del scratchpad `panel-dev-vars.mjs`:
  - Escribe `panel/.dev.vars` con `CLOUDFLARE_ANALYTICS_TOKEN` y `PANEL_SECRET`, copiados de `../libroclaro/.env.local`, más `PANEL_SIN_ACCESS=1` y `LIBROCLARO_URL=http://localhost:3005`.
  - Imprime solo los nombres.

  Después, `git check-ignore panel/.dev.vars` debe imprimir la ruta (el archivo está ignorado).
- [ ] **Step 6:** Con el `next dev` de la Tarea 3 corriendo: `npx wrangler dev --config panel/wrangler.jsonc --port 8790 --test-scheduled`, en segundo plano y con la salida a un archivo.
- [ ] **Step 7: Verificar.**
  - **Datos:** `curl -s localhost:8790/api/resumen` → 200, con todas las fuentes en `ok: true` y `cloudflare.visitas.usado` igual a la suma de `porDia`.
  - **Ciclo real:** `cloudflare.ciclo.estimado` debe ser `false`. Si da `true`:
    1. Imprimir solo `rate_plan.id`, `public_name` y las fechas de cada suscripción.
    2. Ajustar `leerSuscripciones` con una prueba nueva.
    3. Anotar la decisión como Ruling en el ledger.
  - **Caché:** dos llamadas dentro de 60 s → el mismo `generado`. Con `?fresco=1` → uno más nuevo.
  - **Access:** con `PANEL_SIN_ACCESS=0` y reiniciando, `/` y `/api/resumen` → 403. Volver a ponerlo en 1.
  - **Cron:** `curl "localhost:8790/__scheduled?cron=0+*+*+*+*"` → en el log, `[alertas] sin alertas` o el resultado del POST.
- [ ] **Step 8:** `npm test` y `npx tsc -p panel/tsconfig.json` → sin fallos. Commit de los 4 archivos: "Panel de consumo: fuentes de datos y Worker del panel".

### Task 9: Página del panel

**Files:**
- Create: `panel/public/index.html`, `panel/public/estilos.css`, `panel/public/app.js`, `panel/public/favicon.svg`

**Interfaces:**
- Consumes: `GET /api/resumen` (y `?fresco=1`), que devuelve el `Resumen` de `panel/src/tipos.ts`.

**Reglas de la página**

*Base*
- Parte de la muestra aprobada: mismos tokens de color, fuentes (Google Fonts), secciones y textos.
- Sin el aviso "Diseño de muestra" ni ningún número de ejemplo.
- `<html lang="es">`, y como favicon el logo de la muestra.

*Seguridad*
- El CSS va en `estilos.css` y el JS en `app.js`: la CSP prohíbe `<style>` y `<script>` en línea y los atributos `style="…"`. Los tamaños se ponen con `element.style`.
- Todo se dibuja con `createElement` y `textContent`; nunca `innerHTML` con datos.

*Carga y errores*
- Esqueletos mientras carga.
- Si una fuente falló, su tarjeta dice `No se pudo consultar: <error>` y el resto se muestra igual.

*Formato*
- Números en es-PE. Bytes en base 1024 con 1 decimal (MB y GB), CPU en segundos, `US$ 5.00` y `S/ 18.50`.
- Fechas del ciclo y del próximo cobro en UTC (por ejemplo, `29 de octubre`); las demás horas, en America/Lima.

*Barras y notas*
- El ancho de la barra es `min(pct, 100)%` y su color, el del estado.
- La raya de proyección va en `min(proyeccion / limite × 100, 100)%` cuando hay proyección.
- La nota bajo cada barra dice una de estas cuatro cosas:
  - `A este ritmo cierras el ciclo en ~<proyección>: no llega al límite.`
  - `A este ritmo llegaría al límite el <fecha>.`
  - `El ritmo aparece mañana.` (Cloudflare sin proyección)
  - `El ritmo aparece en unos días.` (Supabase sin ritmo)

*Secciones*
- **Gráfico de visitas por día:** sale de `porDia` (SVG con `createElementNS`) y marca el valor de hoy.
- **Supabase:** el enlace "ver en Supabase" (tráfico del mes) va a `https://supabase.com/dashboard/project/<config.supabase.proyecto>`.
- **Resend:** "Último correo hace X", o "Aún no hay correos registrados".
- **Recordatorios:** 7 puntos según el estado (los `pendiente` en gris) y "N de M", contando solo los días que no están pendientes.
- **Alertas:** "Este mes: ninguna", o la lista de `alertasDelMes`.
- **Pie de página:** la fecha de `config.verificadoEl` y el tipo de cambio aproximado.

*Actualización*
- Se actualiza:
  - al cargar;
  - con "Actualizar" (pide `?fresco=1`);
  - cada 5 min mientras `document.visibilityState === "visible"`;
  - en cuanto la pestaña vuelve a verse, si pasaron 5 min o más desde la última vez.
- La etiqueta dice `Actualizado hace X min · hh:mm`. Pasados 10 min, se suma el chip `Datos de hace X min`.
- Si una actualización falla (red caída, estado distinto de 200, respuesta que no es JSON o redirigida), se quedan los datos anteriores y aparece: `No se pudo actualizar. Si la página estuvo abierta muchas horas, recárgala para volver a entrar.`

- [ ] **Step 1:** Escribir los 4 archivos a partir de la muestra.
- [ ] **Step 2: Verificar con Playwright MCP** en `http://localhost:8790`, con los servidores de las Tareas 3 y 8 corriendo:
  1. **Escritorio:** a 1280×900, datos reales en las 4 tarjetas, los servicios y las alertas, 0 errores en la consola, y una captura.
  2. **Celular:** a 320 px, `document.documentElement.scrollWidth <= 320`.
  3. **Modo oscuro:** con `emulateMedia({ colorScheme: "dark" })`, `getComputedStyle(document.body).backgroundColor === "rgb(12, 21, 19)"`.
  4. **Una fuente caída:** con `LIBROCLARO_URL=http://127.0.0.1:9` en `.dev.vars` y wrangler reiniciado:
     - Supabase, Resend, Mercado Pago y Recordatorios dicen "No se pudo consultar".
     - Cloudflare, RUC y QR muestran datos.

     Después, restaurar `.dev.vars`.
  5. **Refresco con reloj falso:** `page.clock.install()` antes de cargar, contando los pedidos a `/api/resumen`:
     - tras `runFor("05:00")` → 2 pedidos;
     - pestaña oculta (`Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })` y el evento `visibilitychange`) y `runFor("15:00")` → siguen 2;
     - pestaña visible otra vez → 3.
  6. **Actualización fallida:** tras una carga buena, `page.route("**/api/resumen*", r => r.abort())` y clic en Actualizar:
     - aparece el mensaje y los números anteriores siguen ahí;
     - tras `runFor("11:00")` aparece el chip "Datos de hace 11 min".
- [ ] **Step 3:** Fabrizio abre `http://localhost:8790`. Los cambios que pida se hacen aquí, antes de la Tarea 10.
- [ ] **Step 4:** Commit de los 4 archivos: "Panel de consumo: página del panel".

### Task 10: Publicar y comprobar en producción

**Files:**
- Modify: `panel/wrangler.jsonc` (`ACCESS_EQUIPO` y `ACCESS_AUD`)

- [ ] **Step 1: Fabrizio activa Zero Trust y crea la app de Access.** Pasos para darle:
  1. En dash.cloudflare.com → Zero Trust, elegir un nombre de equipo y el plan Free (US$ 0, hasta 50 usuarios). Si pide un medio de pago, sirve el de Workers Paid y no cobra nada.
  2. Access → Applications → Add an application → Self-hosted. Nombre "Panel de consumo", dominio `panel.libroclaro.pe`, sesión de 24 h.
  3. Política "Solo Fabrizio": Allow, Include → Emails → `libroclaro.pe@gmail.com`. Método de entrada: One-time PIN.
  4. Guardar, y anotar en `../libroclaro/.env.local`:
     - `ACCESS_EQUIPO=<equipo>.cloudflareaccess.com`
     - `ACCESS_AUD=<Application Audience (AUD) Tag>`

     No son secretos, pero así no pasan por el chat.
- [ ] **Step 2:** Copiar los dos valores a `vars` de `panel/wrangler.jsonc`. Commit: "Panel de consumo: datos de Cloudflare Access".
- [ ] **Step 3: Revisión final**, todo sin errores:
  - `npm test`
  - `npx tsc --noEmit`
  - `npx tsc -p panel/tsconfig.json`
  - `npx eslint src/lib src/app/api/panel panel/src`
  - `npx opennextjs-cloudflare build`
- [ ] **Step 4: Ningún secreto en el repo.** Tras `git fetch origin`, un script del scratchpad compara cada valor de `../libroclaro/.env.local` (de 12 caracteres o más) con `git diff origin/main..refs/heads/cloudflare`. Imprime "limpio" o solo los nombres que encuentre.
- [ ] **Step 5:** Esperar el "súbelo" de Fabrizio.
- [ ] **Step 6:** Publicar LibroClaro: `npx opennextjs-cloudflare deploy`.
- [ ] **Step 7:** Con el OK de Fabrizio, subir el secreto a LibroClaro: `node <scratchpad>/leer-env.mjs PANEL_SECRET | npx wrangler secret put PANEL_SECRET`. `leer-env.mjs` escribe el valor solo hacia la tubería. Si el clasificador lo frena, lo corre Fabrizio.
- [ ] **Step 8: Publicar el panel.**
  1. `npx wrangler deploy --config panel/wrangler.jsonc`. Lo corre Fabrizio, o agrega una regla Allow para ese comando exacto.
  2. Subir `PANEL_SECRET` y `CLOUDFLARE_ANALYTICS_TOKEN` con `… | npx wrangler secret put <NOMBRE> --config panel/wrangler.jsonc`.
- [ ] **Step 9: Comprobar en producción.**
  - **El panel exige entrar:** `curl -sI https://panel.libroclaro.pe` → 302 a `https://<equipo>.cloudflareaccess.com/…`.
  - **No hay otra dirección:** `curl -sI https://libroclaro-panel.libroclaro.workers.dev` → no responde el panel.
  - **Las rutas de LibroClaro:**
    - `llamar-panel.mjs https://libroclaro.pe/api/panel/resumen --sin-secreto` → 404.
    - Con el secreto → 200, con números.
  - **La entrada de Fabrizio:** entra con libroclaro.pe@gmail.com (código de un solo uso) y ve datos reales, con todas las tarjetas en `ok`. Con otro correo, no llega código y no entra.
  - **Alerta de prueba:**
    - Mandar dos veces `llamar-panel.mjs https://libroclaro.pe/api/panel/alertas '{"alertas":[{"clave":"prueba.produccion.2026-10-05","texto":"Alerta de prueba del panel"}]}'`.
    - La primera da `enviadas: 1` y la segunda `repetidas: 1`.
    - Fabrizio confirma que le llegó un solo correo. Después, borrar esa fila.
  - **El cron del panel:** pasada la primera hora completa, `workersInvocationsScheduled` de `libroclaro-panel` muestra `status: "success"` (con un script que usa el token de analítica).
  - **El cron de LibroClaro:** a las 8 a. m. siguientes, `uso_plataformas` tiene `cron.recordatorios` con `ok: true` y la hora de ese día. Si todavía no llegó la hora, queda como comprobación pendiente en el mensaje final.
- [ ] **Step 10:** Con el OK de Fabrizio, subir a GitHub: `git push origin refs/heads/cloudflare:refs/heads/main`.
