# LibIA: borradores de respuesta con IA · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En el detalle de cada reclamo, el botón "Pedirle una propuesta a LibIA" escribe con Mistral Small 3.1 (Workers AI) un borrador de respuesta editable, con topes que nunca salen de lo gratis y un aviso de IA para el consumidor.

**Architecture:** La lógica sin red (instrucciones, mensaje con datos mínimos, limpieza, huecos, neuronas y reintento) vive en `src/lib/libia.ts` y se prueba con `node:test`. Una acción de servidor lee el reclamo con la sesión del dueño, reserva cupo en Supabase con funciones solo para `service_role`, llama a Mistral por el binding `AI` (con `getCloudflareContext()`) y devuelve el texto al formulario. Al enviar, `respondComplaint` guarda si la respuesta lleva aviso de IA, y el correo y la hoja lo muestran.

**Tech Stack:**
- Next.js 16.3.4 con OpenNext Cloudflare 1.20.6 y wrangler 4.141 (en `next dev` los bindings remotos vienen activos por defecto).
- Workers AI: `@cf/mistralai/mistral-small-3.1-24b-instruct` por el binding `AI`.
- Supabase Postgres (migración 0010).
- Pruebas: `node:test` de Node 24 (borrado de tipos), `execute_sql` del MCP de Supabase en transacciones revertidas, y Playwright MCP en localhost.
- Sin dependencias npm nuevas.

**Spec:** `docs/superpowers/specs/2026-10-09-libia-borradores-design.md`

## Global Constraints

**Costo y topes**
- Costo S/ 0. Topes diarios: **20 borradores por negocio** y **9.000 neuronas en total**. Esos dos números viven solo en las funciones SQL. Se reinician a las 00:00 UTC (7 p. m. de Lima).
- Neuronas: **0,031876 por token de entrada** y **0,050488 por token de salida**.
  - Reserva = `ceil((bytes UTF-8 de instrucciones + mensaje + 50) × 0,031876 + 600 × 0,050488)`.
  - Real = `prompt_tokens × 0,031876 + completion_tokens × 0,050488`, redondeado a 3 decimales. Sin `usage`, vale la reserva.
- Una reserva válida es mayor que 0 y como máximo 1.000.

**Modelo**
- `@cf/mistralai/mistral-small-3.1-24b-instruct`, `temperature: 0.4`, `max_tokens: 600`, mensajes `system` + `user`. El texto viene en `response` y el uso en `usage`.
- Límite **total** de 25 s, reintento incluido. Un solo reintento, tras 1 s, y solo si el error es pasajero: 3040 ("Capacity temporarily exceeded") o de conexión.
- Las instrucciones y el formato del mensaje son exactamente los de la spec ("Instrucciones del modelo").

**Datos**
- Al modelo van solo: negocio, reclamo o queja, producto o servicio con su descripción, monto, nombre de pila, detalle, pedido y nota.
  - El nombre de pila es la primera palabra del nombre. Si el consumidor es menor de edad y tiene apoderado, se usa el del apoderado.
  - Nunca van documento, dirección, teléfono, correo ni apellidos.
- Los correos y celulares escritos dentro del detalle, el pedido o la nota se reemplazan por `[correo]` y `[teléfono]`.
- No se guardan ni el borrador ni la nota. Solo se guardan el evento `libia` (con `{"modelo": "mistral-small-3.1"}`) y los contadores.

**Seguridad**
- Las 3 funciones SQL de LibIA son solo para `service_role`. El servidor las llama con `createAdminClient()` después de leer el reclamo o el negocio con la sesión del dueño.
- Ninguna clave nueva: el binding `AI` usa la cuenta del Worker.

**Código y git**
- Antes de tocar código de Next.js, leer la guía que corresponda en `node_modules/next/dist/docs/`. Esta versión cambia APIs (lo advierte AGENTS.md).
- `src/lib/libia.ts` no importa nada, porque lo cargan Next, `node --test` y el script de la prueba de calidad.
  - Sintaxis borrable: sin `enum` ni `namespace`.
  - `import type` para los tipos.
  - Imports relativos con extensión `.ts` en las pruebas.
- `git add` de archivos concretos, nunca `-A`, y revisar `git status` antes de cada commit. Editar con la herramienta Edit y no con `sed -i`, porque algunos archivos están en CRLF.
- Nombres, comentarios y textos en español. Cada commit termina con la línea `Co-Authored-By` que indique la sesión.
- Sin dependencias npm nuevas.
- Para probar en localhost con el cliente de servicio:
  - El `.env.local` de este worktree lleva solo `NEXT_PUBLIC_*`.
  - Desde este worktree, correr `node ../traspaso-panel-consumo/scripts/iniciar-next.mjs 3005 TURNSTILE_SECRET_KEY=`. El script carga `../libroclaro/.env.local` en memoria, y `TURNSTILE_SECRET_KEY=` vacío salta Turnstile en localhost.
  - Next 16 no deja correr dos `next dev` en el mismo proyecto. Si ya hay otro, pedir permiso a Fabrizio para cerrarlo.
- El token OAuth de wrangler dura 1 h. Antes de usar Workers AI desde localhost o desde la API, `npx wrangler deployments list` lo renueva.

**Textos que ve el dueño** (exactos)

| Dónde | Texto |
|---|---|
| Título del recuadro | Pedirle una propuesta a LibIA |
| Campo de nota | ¿Algo que LibIA deba saber? (opcional); ejemplo: "Ej.: Ya le devolvimos el dinero el 5 de octubre." |
| Botón | Escribir borrador; después del primero, Pedir otra versión |
| Mientras escribe | LibIA está escribiendo… |
| Contador | Te quedan N hoy |
| Explicación | LibIA lee el reclamo, sin documento ni datos de contacto, y te propone un texto. Revísalo siempre. |
| Etiqueta del borrador | Borrador de LibIA: revísalo antes de enviarlo |
| Recuperar el texto | Deshacer |
| Casilla | Indicar que se redactó con ayuda de inteligencia artificial |
| Cuenta inactiva | LibIA (Pro), con enlace a `/app/{bizId}/plan` |
| Huecos al enviar | Completa las partes entre corchetes antes de enviar: {huecos separados por coma}. |
| Historial | LibIA propuso un borrador |

Los mensajes de la acción están en la Tarea 4.

**Publicar**
- La migración se aplica solo con el OK de Fabrizio.
- El código se publica solo después de su "súbelo", con `npx opennextjs-cloudflare deploy` exacto desde este worktree, y se sube a GitHub con `git push origin refs/heads/cloudflare:refs/heads/main`.

## Review Focus

- **El consumidor escribió su correo o su celular dentro del detalle** ("escríbanme a ana@gmail.com o al 987 654 321"). No debe llegar al modelo: se reemplaza por `[correo]` y `[teléfono]`. Lo cubre la prueba "mensajeParaLibIA tapa correos y celulares" (Tarea 2).
- **El nombre del negocio termina en punto** ("Bodega Don Lucho S.A.C."). El aviso al pie no debe salir con doble punto. Lo cubre la prueba de `avisoDeIA` (Tarea 2).
- **El dueño completa un hueco a medias** ("[indica aquí: devolución]") o lo escribe sin tilde ("[Indica aqui …]"). Debe seguir contando como hueco y bloquear el envío; un corchete normal ("[nota]") no. Lo cubre la prueba de `huecosPendientes` (Tarea 2).
- **LibIA falla cuando el dueño ya había escrito algo.** Su texto no se toca, solo aparece el mensaje. Lo cubre la verificación 4 de la Tarea 6.
- **Un borrador empieza a las 6:59:59 p. m. de Lima y falla después de las 7.** El cupo se devuelve al día en que se reservó, no al nuevo. Lo cubre el caso "cambio de día" de la Tarea 1.

## Lo que hace Fabrizio, y cuándo

| Tarea | Lo que hace Fabrizio |
|---|---|
| 1 | Aprueba que se aplique la migración 0010. Si el conector de Supabase no está conectado, lo reconecta en claude.ai. |
| 3 | Revisa la página con los borradores de la prueba de calidad. |
| 8 | Prueba LibIA en `http://localhost:3005`, confirma que llegó el correo de prueba y pide cambios o dice "súbelo". |
| 9 | Decide si sale junto con la parte del panel de consumo que ya está en la rama `cloudflare`. |

---

### Task 1: Migración 0010

**Files:**
- Create: `supabase/migrations/0010_libia.sql`

**Interfaces:**
- Produces (lo usan las Tareas 4 a 6):
  - **Tabla `public.libia_uso`** `(dia date, business_id uuid references public.businesses(id) on delete cascade, borradores integer not null default 0 check (borradores >= 0), neuronas numeric(10,3) not null default 0 check (neuronas >= 0), primary key (dia, business_id))`. Con RLS y sin políticas.
  - **`public.reservar_borrador_libia(p_business_id uuid, p_usuario uuid, p_reserva numeric) returns jsonb`.** Hace esto, en orden:
    1. Si el negocio no existe o su `owner_id` no es `p_usuario`: `raise exception 'NO_AUTORIZADO'`.
    2. Si `p_reserva` es nulo, ≤ 0 o > 1000: `raise exception 'RESERVA_INVALIDA'`.
    3. Si `not public.plan_vigente(plan, plan_expires_at)`, responde `{"ok": false, "motivo": "sin_plan", "quedan": 0, "limite": 20}`.
    4. Toma `pg_advisory_xact_lock(hashtext('libia_uso'))`. El día es `(now() at time zone 'utc')::date`.
    5. Si el negocio ya lleva 20 borradores ese día, responde `{"ok": false, "motivo": "tope_negocio", "quedan": 0, "limite": 20}`.
    6. Si las `neuronas` del día más `p_reserva` pasan de 9000, responde `{"ok": false, "motivo": "tope_global", "quedan": <20 − borradores>, "limite": 20}`.
    7. Si pasa todo, suma 1 borrador y `p_reserva` (`insert … on conflict`) y responde `{"ok": true, "dia": "<YYYY-MM-DD>", "quedan": <20 − borradores después>, "limite": 20}`.
  - **`public.cerrar_borrador_libia(p_business_id uuid, p_dia date, p_reserva numeric, p_real numeric) returns void`.**
    - Con `p_real`: `neuronas = greatest(neuronas - p_reserva + p_real, 0)`.
    - Con `p_real` nulo: `borradores = greatest(borradores - 1, 0)` y `neuronas = greatest(neuronas - p_reserva, 0)`.
    - Si no hay fila, no hace nada.
  - **`public.libia_quedan(p_business_id uuid) returns integer`:** `greatest(20 - <borradores de hoy, o 0 si no hay fila>, 0)`.
  - **Las tres funciones:** `security definer`, `set search_path = ''` (todo con esquema), `revoke all … from public, anon, authenticated` y `grant execute … to service_role`.
  - **`public.complaints.respuesta_con_ia`** `boolean not null default false`.
  - **`complaint_events`:** la restricción del tipo y la política "owner can add notes" (de 0006) suman `'libia'`. El resto de la política queda igual.
  - **`public.get_complaint_public(text)`:** `drop` y `create` idéntica a la de `0001_init.sql`, más `respuesta_con_ia boolean` como última columna (`c.respuesta_con_ia`). Los mismos `revoke` y `grant` que en 0001.

- [ ] **Step 1:** Con `execute_sql`, leer el nombre de la restricción del tipo: `select conname from pg_constraint where conrelid = 'public.complaint_events'::regclass and contype = 'c'`. Se espera `complaint_events_type_check`.
- [ ] **Step 2:** Escribir el archivo con una cabecera al estilo de 0008 y 0009: qué es LibIA, por qué los topes viven aquí y por qué las funciones son solo para el servidor.
- [ ] **Step 3: Pruebas en transacción revertida.** Con `execute_sql` en el proyecto `rcjgprzmvtspviwyyrhy`, una llamada por caso, cada una con la forma `begin; <archivo>; <caso>; rollback;`.

  **Datos:** el negocio con `slug = 'demo'` (Pro sin vencimiento) y su dueño, y cualquier otro usuario que no sea su dueño. Los casos que llaman a las funciones van con `set local role service_role;`.
  - **Reserva normal:** `reservar(demo, dueño, 30)` → `ok: true, quedan: 19, limite: 20`, y la fila del día en `libia_uso` queda con 1 borrador y 30 neuronas.
  - **Extraño:** `reservar(demo, otro, 30)` → error `NO_AUTORIZADO`.
  - **Reserva inválida:** `-5`, `0`, `1001` y `null` → error `RESERVA_INVALIDA` en cada uno.
  - **Plan vencido:** antes de cambiar de rol, `update public.businesses set plan = 'free', plan_expires_at = null where slug = 'demo'`; luego `reservar` → `motivo: sin_plan`.
  - **Tope del negocio:** con una fila del día de 20 borradores → `motivo: tope_negocio, quedan: 0`.
  - **Tope global:** con una fila del día de otro negocio con 8990 neuronas, `reservar(…, 11)` → `tope_global`, y `reservar(…, 10)` → `ok` (8990 + 10 no pasa de 9000).
  - **Cerrar con éxito:** `reservar(…, 100)` y `cerrar(demo, hoy, 100, 22.5)` → 1 borrador y 22,5 neuronas.
  - **Cerrar con falla:** `reservar(…, 100)` y `cerrar(demo, hoy, 100, null)` → 0 y 0.
  - **Cambio de día:** con filas de ayer (1, 100) y de hoy (1, 100), `cerrar(demo, ayer, 100, null)` → ayer queda en 0 y 0, y hoy sigue en 1 y 100.
  - **Nunca bajo cero:** con una fila (1, 100), `cerrar(demo, hoy, 500, null)` → 0 y 0.
  - **`libia_quedan`:** sin fila → 20; con 3 borradores → 17; con 25 → 0.
  - **Permisos:** con `set local role authenticated`, llamar a cada una de las 3 funciones → `permission denied for function …`. Un `insert into public.libia_uso …` → `new row violates row-level security policy`.
  - **Evento:** con `select set_config('request.jwt.claims', json_build_object('sub', '<dueño>', 'role', 'authenticated')::text, true)` y `set local role authenticated`, insertar en `complaint_events` un evento `libia` de un reclamo del demo con `actor_id` = dueño → funciona. Con tipo `'otro'` → error de la restricción.
  - **Hoja:** `select respuesta_con_ia from public.get_complaint_public((select public_token from public.complaints limit 1))` → `false`.

  Al terminar, `select to_regclass('public.libia_uso')` → `null`: no quedó nada aplicado.
- [ ] **Step 4:** Pedir el OK a Fabrizio. Con el OK, `apply_migration` con el nombre `0010_libia` y el contenido del archivo.
- [ ] **Step 5: Verificar.**
  - `set local role service_role; select public.libia_quedan(id) from public.businesses where slug = 'demo'` → 20.
  - `get_advisors` (seguridad) no trae avisos nuevos, salvo el informativo de "RLS sin políticas" de `libia_uso`.
  - La hoja pública de un reclamo de `/r/demo` sigue abriendo en libroclaro.pe.
- [ ] **Step 6:** Commit: `git add supabase/migrations/0010_libia.sql` · "LibIA: migración 0010".

---

### Task 2: Lógica de LibIA

**Files:**
- Create: `src/lib/libia.ts`
- Test: `src/lib/libia.test.ts`

**Interfaces:**
- Produces (lo usan las Tareas 3 a 6):

```ts
export const LIBIA_MODELO = "@cf/mistralai/mistral-small-3.1-24b-instruct";
export const LIBIA_MODELO_CORTO = "mistral-small-3.1";
export const NOTA_MAXIMA = 500;
export const INSTRUCCIONES_LIBIA: string; // texto exacto de la spec
export interface DatosParaLibIA {
  negocio: string;
  kind: string; // "reclamo" | "queja"
  item_type: string; // "producto" | "servicio"
  item_description: string;
  amount: string | number | null;
  consumer_name: string;
  is_minor: boolean;
  guardian_name: string | null;
  detail: string;
  request: string;
}
export function nombreDePila(nombre: string): string;
export function mensajeParaLibIA(d: DatosParaLibIA, nota: string): string;
export function limpiarBorrador(texto: string): string;
export function huecosPendientes(texto: string): string[];
export function reservaDeNeuronas(instrucciones: string, mensaje: string): number;
export function neuronasReales(usage: unknown, reserva: number): number;
export function avisoDeIA(negocio: string): string;
export function esErrorPasajero(e: unknown): boolean;
export function conReintento<T>(pedir: () => Promise<T>, opciones?: { limiteMs?: number; esperaMs?: number }): Promise<T>;
```

- [ ] **Step 1: Escribir las pruebas** en `src/lib/libia.test.ts`, que importa de `./libia.ts`.

  **Datos de prueba (`datos`):** el caso "producto" de la prueba de calidad: negocio "Electro Hogar Lima", `kind: "reclamo"`, `item_type: "producto"`, `item_description: "licuadora comprada en la tienda online"`, `amount: "189.00"`, `consumer_name: "María Quispe Huamán"`, `is_minor: false` y `guardian_name: null`.
  - Más estos campos que la función no debe leer: `consumer_doc_number: "45678912"`, `consumer_address: "Av. Los Olivos 123"`, `consumer_phone: "987654321"` y `consumer_email: "maria@correo.com"`.
  - El objeto se pasa como variable, no como literal, para que TypeScript acepte los campos de más.

  **Pruebas:**
  - **`mensajeParaLibIA arma el mensaje exacto`:** `mensajeParaLibIA(datos, "")` es exactamente:

    ```
    Negocio: Electro Hogar Lima
    Tipo: Reclamo
    Bien contratado: Producto: licuadora comprada en la tienda online
    Monto reclamado: S/ 189.00
    Nombre del consumidor: María
    Detalle: <detalle>
    Pedido: <pedido>
    Nota del negocio: (sin nota)
    ```
  - **`mensajeParaLibIA no lleva datos personales`:** el mensaje no contiene `45678912`, `Los Olivos`, `987654321`, `maria@correo.com`, `Quispe` ni `Huamán`.
  - **`mensajeParaLibIA con nota`:** la última línea es `Nota del negocio: Le enviamos una licuadora nueva esta semana.`.
  - **`mensajeParaLibIA: queja de servicio sin monto`:** da `Tipo: Queja`, `Bien contratado: Servicio: …` y `Monto reclamado: (no indicado)`. Con `amount: 50` da `S/ 50.00`.
  - **`mensajeParaLibIA: menor de edad`:**
    - Con `is_minor: true, guardian_name: "Rosa Pérez Díaz"` lleva `Apoderado del consumidor (menor de edad): Rosa` y ninguna línea `Nombre del consumidor`.
    - Con `guardian_name: null` usa `Nombre del consumidor: María`.
  - **`mensajeParaLibIA tapa correos y celulares`:** con el detalle `Escríbanme a ana.perez@gmail.com o al 987 654 321, o al +51 912-345-678.`, el mensaje contiene `[correo]` y dos veces `[teléfono]`, y no contiene `ana.perez`, `987 654 321` ni `912-345-678`. Lo mismo vale en el pedido y en la nota.
  - **`nombreDePila`:** `"  María  Quispe "` → `"María"`; `""` → `""`.
  - **`limpiarBorrador`:**
    - `"\"Estimada María: …\""` y `"“Estimada María: …”"` quedan sin las comillas de los extremos.
    - `"Borrador:\nEstimada María"` → `"Estimada María"`.
    - `"**Estimada María**, gracias"` → `"Estimada María, gracias"`.
    - `"Hola\n\n\n\nChau"` → `"Hola\n\nChau"`.
    - `'Usted dijo "rápido".'` queda igual.
  - **`huecosPendientes`:**
    - `"Le ofrecemos [indica aquí la solución que ofreces]. Escríbanos a [canal de contacto]."` → `["[indica aquí la solución que ofreces]", "[canal de contacto]"]`.
    - `"[Indica aqui: devolución]"` → `["[Indica aqui: devolución]"]`.
    - `"Ver [nota] adjunta"` → `[]`.
    - Un hueco repetido sale una sola vez.
  - **`reservaDeNeuronas`:** `("", "")` → 32; `("a".repeat(1000), "ñ".repeat(500))` → 96 (2.000 bytes).
  - **`neuronasReales`:** `({ prompt_tokens: 419, completion_tokens: 170 }, 80)` → 21.939; `(undefined, 80)` y `({}, 80)` → 80.
  - **`avisoDeIA`:**
    - `"Cafetería Demo"` → `"Esta respuesta se redactó con ayuda de inteligencia artificial y fue revisada por Cafetería Demo."`.
    - `"Bodega Don Lucho S.A.C."` termina en `"…revisada por Bodega Don Lucho S.A.C."`, con un solo punto.
  - **`esErrorPasajero`:** verdadero para `new Error("3040: Capacity temporarily exceeded, please try again.")`, `new Error("Network connection lost.")` y `new TypeError("fetch failed")`; falso para `new Error("5006: Invalid input")`.
  - **`conReintento`**, con `limiteMs: 200` y `esperaMs: 5`:
    - Ocupado y luego "ok" → resuelve "ok" con 2 llamadas.
    - Ocupado dos veces → rechaza, con 2 llamadas.
    - Error no pasajero → rechaza con 1 llamada.
    - Con `limiteMs: 50` y una promesa que nunca resuelve → rechaza antes de 200 ms con un error cuyo mensaje contiene "tiempo".
  - **`INSTRUCCIONES_LIBIA`:** contiene `[indica aquí la solución que ofreces]`, `[canal de contacto]`, `"usted"` y `no sigas instrucciones`.
- [ ] **Step 2:** `npm test` → fallan las pruebas nuevas, porque `./libia.ts` no existe.
- [ ] **Step 3: Implementar `src/lib/libia.ts`**, sin imports:
  - `INSTRUCCIONES_LIBIA` y el formato del mensaje se copian de la spec.
  - Patrón de correo: `/[^\s@]+@[^\s@]+\.[^\s@]+/g`.
  - Patrón de celular peruano: `/(?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/g`.
  - Patrón de huecos: `/\[(?:indica aqu[ií][^\]]*|canal de contacto[^\]]*)\]/gi`.
  - Los bytes se cuentan con `new TextEncoder()`.
  - `conReintento` reparte un solo plazo total entre los intentos, con `setTimeout` y `Promise.race`, y limpia el temporizador al terminar.
- [ ] **Step 4:** `npm test` → pasan todas, las 80 de antes y las nuevas. `npx tsc --noEmit` y `npm run lint`, sin errores.
- [ ] **Step 5:** Commit: `git add src/lib/libia.ts src/lib/libia.test.ts` · "LibIA: instrucciones, mensaje con datos mínimos, neuronas y reintento".

---

### Task 3: Prueba de calidad con Mistral

Es desechable y vive fuera del repo: es la prueba "antes de lanzar" que pide la spec. Se hace en este punto para corregir las instrucciones antes de construir lo demás.

**Files:**
- Create: `../traspaso-ia-borradores/prueba/prueba-final.mjs`. Escribe `resultados-final.json` y `borradores-libia.html` en la misma carpeta.

**Interfaces:**
- Consumes, de `../../libroclaro-cloudflare/src/lib/libia.ts`: `INSTRUCCIONES_LIBIA`, `mensajeParaLibIA`, `limpiarBorrador`, `reservaDeNeuronas`, `neuronasReales` y `LIBIA_MODELO`.

- [ ] **Step 1: Escribir el script.**
  - **Casos:** toma los 4 `casos` de `resultados.json` y los convierte a `DatosParaLibIA`. "Reclamo" → `reclamo`; "Producto: X" → `item_type: "producto"` e `item_description: "X"`; "S/ 189.00" → `"189.00"`; `nombre` → `consumer_name`.
  - **Pedidos:** corre cada caso sin nota y con su `nota` (8 pedidos). Agrega un noveno: el caso "producto" con el detalle repetido hasta llegar a 5.000 caracteres.
  - **Llamada:** la misma de `prueba2.mjs` (API REST con el token de wrangler), con `temperature: 0.4` y `max_tokens: 600`.
  - **Qué guarda por pedido:** el texto limpio, los segundos, `usage`, las neuronas reales, la reserva y si `real ≤ reserva`.
- [ ] **Step 2:** `npx wrangler deployments list` (renueva el token). Luego `node prueba-final.mjs` desde `../traspaso-ia-borradores/prueba/`. Se espera: 9 textos no vacíos y `real ≤ reserva` en los 9. Costo: ~300 neuronas.
- [ ] **Step 3: Calificar** cada borrador como listo, por ajustar o malo, con los criterios de la primera prueba.
  - Es "malo" si inventa hechos, plazos, montos o medidas; promete algo que la nota no dice; cita leyes o a INDECOPI; o repite insultos o datos personales.
  - Generar `borradores-libia.html` (como lo hacía `generar-pagina.mjs`) y publicarla como página privada para Fabrizio.
- [ ] **Step 4: Criterio: 0 borradores malos.**
  - Si sale alguno, ajustar `INSTRUCCIONES_LIBIA` (y también la spec), correr `npm test`, commitear ("LibIA: ajuste de instrucciones tras la prueba de calidad") y repetir. Máximo 3 vueltas; si sigue fallando, parar y hablar con Fabrizio.
  - Si en algún pedido `real > reserva`, parar: la cota de la reserva está mal.

---

### Task 4: Acción `pedirBorradorLibIA` y configuración

**Files:**
- Modify: `wrangler.jsonc`. Agregar `"ai": { "binding": "AI" }` con un comentario: es Workers AI, con 10.000 neuronas gratis al día, y los topes viven en la migración 0010.
- Create: `src/cloudflare-env.d.ts`.
- Modify: `next.config.ts`. Agregar `initOpenNextCloudflareForDev()` de `@opennextjs/cloudflare`, con un comentario: en `next dev`, LibIA usa el Workers AI real y cuenta para los mismos topes.
- Modify: `src/lib/plans.ts`. Agregar `libia: boolean` en `PlanDef`: `false` en `free`, `true` en `pro` y en `business`.
- Modify: `src/lib/types.ts`. `Complaint.respuesta_con_ia: boolean`; `ComplaintEvent.type` suma `"libia"`; `data` suma `modelo?: string`.
- Create: `src/lib/actions/libia.ts`.

**Interfaces:**
- Consumes: de la Tarea 1, `reservar_borrador_libia` y `cerrar_borrador_libia`; de la Tarea 2, todo `src/lib/libia.ts`.
- Produces (lo usa la Tarea 6):

```ts
// src/cloudflare-env.d.ts
interface CloudflareEnv {
  AI: { run(modelo: string, entrada: Record<string, unknown>): Promise<unknown> };
}

// src/lib/actions/libia.ts ("use server")
export type ResultadoLibIA =
  | { ok: true; texto: string; quedan: number }
  | {
      ok: false;
      motivo: "no_encontrado" | "sin_plan" | "nota_larga" | "tope_negocio" | "tope_global" | "fallo";
      mensaje: string;
    };
export async function pedirBorradorLibIA(entrada: {
  complaintId: string;
  businessId: string;
  nota: string;
}): Promise<ResultadoLibIA>;
```

- Mensajes exactos:

  | Motivo | `mensaje` |
  |---|---|
  | `no_encontrado` | No se encontró el reclamo. |
  | `sin_plan` | Tu plan ya no incluye LibIA. |
  | `nota_larga` | La nota puede tener hasta 500 caracteres. |
  | `tope_negocio` | Ya usaste tus {limite} borradores de hoy. Se renuevan a las 7:00 p. m. |
  | `tope_global` | LibIA descansa hasta las 7:00 p. m. Mientras tanto, puedes escribir tu respuesta o usar una plantilla. |
  | `fallo` | LibIA no pudo escribir ahora. Inténtalo de nuevo. |

- [ ] **Step 1:** Leer lo de Server Actions en `node_modules/next/dist/docs/` y lo de `getCloudflareContext` en la documentación de OpenNext. Usar `await getCloudflareContext({ async: true })`.
- [ ] **Step 2: Implementar `pedirBorradorLibIA`**, en este orden:
  1. `requireUser()`. Aplicar `trim()` a la nota; si pasa de `NOTA_MAXIMA` → `nota_larga`.
  2. Con `createClient()` (la sesión del dueño), leer del reclamo **solo** `kind, item_type, item_description, amount, consumer_name, is_minor, guardian_name, detail, request`, por `id` y `business_id`. Del negocio, leer `name, plan, plan_expires_at`. Si falta alguno → `no_encontrado`.
  3. Si `planFor(negocio).libia` es falso → `sin_plan`. Sin `hasAdminClient()` → `fallo`.
  4. `mensaje = mensajeParaLibIA(…, nota)` y `reserva = reservaDeNeuronas(INSTRUCCIONES_LIBIA, mensaje)`.
  5. `createAdminClient().rpc("reservar_borrador_libia", { p_business_id, p_usuario: user.id, p_reserva: reserva })`. Si da error → `fallo`. Si responde `ok: false` → su motivo, con el mensaje de la tabla (`tope_negocio` usa `limite`).
  6. `conReintento(() => env.AI.run(LIBIA_MODELO, { messages: [system, user], temperature: 0.4, max_tokens: 600 }))`. Luego `texto = limpiarBorrador(String(respuesta.response ?? ""))`.
  7. Cerrar la reserva con `cerrar_borrador_libia({ p_business_id, p_dia: <dia de la reserva>, p_reserva: reserva, p_real })`:
     - Si hubo error o el texto tiene menos de 40 caracteres: con `p_real: null`, y devolver `fallo`.
     - Si no: con `p_real: neuronasReales(respuesta.usage, reserva)`.
  8. Con `createClient()`, insertar el evento `{ complaint_id, business_id, type: "libia", data: { modelo: LIBIA_MODELO_CORTO }, actor_id: user.id }`. Hacer `revalidatePath` del detalle del reclamo y devolver `{ ok: true, texto, quedan }`.

  Los errores se registran solo con `console.error("[libia]", motivo, mensajeDelError)`, sin datos del reclamo.
- [ ] **Step 3:** `npx tsc --noEmit`, `npm run lint` y `npm test`, sin errores.
  - Al sumar `"libia"` al tipo de evento, TypeScript exige completar `ICONO` y `describir` en la página del reclamo. Hacerlo en esta tarea, con el texto "LibIA propuso un borrador" y un ícono de chispa en `bg-teal-50 text-teal-700`.
- [ ] **Step 4:** `npx opennextjs-cloudflare build` termina bien. Eso comprueba que todo se empaqueta para el Worker con el binding.
- [ ] **Step 5:** Commit de los 6 archivos más la página del reclamo · "LibIA: acción de servidor y binding de Workers AI".

---

### Task 5: Respuesta con aviso de IA

**Files:**
- Modify: `src/lib/actions/complaints.ts` (`respondComplaint`)
- Modify: `src/lib/email.ts` (`tplConsumerResponse`)
- Modify: `src/app/h/[token]/page.tsx`

**Interfaces:**
- Consumes: de la Tarea 2, `huecosPendientes` y `avisoDeIA`; de la Tarea 1, la columna `respuesta_con_ia` y su salida en `get_complaint_public`.
- Produces (lo usa la Tarea 6):
  - El campo de formulario **`con_ia`**, que vale `"on"` cuando la casilla está marcada.
  - `tplConsumerResponse` acepta `avisoIA?: string | null`.

- [ ] **Step 1: `respondComplaint`.**
  - Lee `con_ia` y lo guarda en `respuesta_con_ia`, junto con el resto del `patch`.
  - Si se envía (`respondido` o `cerrado`) y `huecosPendientes(response)` no está vacío, devuelve `{ error: "Completa las partes entre corchetes antes de enviar: <huecos separados por coma>." }` y no guarda nada.
  - Al correo le pasa `avisoIA: conIA ? avisoDeIA(biz.name) : null`.
- [ ] **Step 2: `tplConsumerResponse`.** Con `avisoIA`, agrega después del `blockquote` `<p style="color:#64748b;font-size:13px">${escapeHtml(avisoIA)}</p>`. Sin él, el HTML queda idéntico al de hoy.
- [ ] **Step 3: Hoja.** Si `row.respuesta_con_ia`, poner bajo el texto de la respuesta `<p className="text-xs text-slate-500">{avisoDeIA(row.business_name)}</p>`.
- [ ] **Step 4: Verificar.**
  - Con un script desechable en la carpeta de trabajo temporal, corrido con `npx -y tsx --tsconfig tsconfig.json <script>.mts` desde este worktree (sin `await` de nivel superior; tsx no se agrega al proyecto):
    - `tplConsumerResponse` con `avisoIA` contiene el aviso exacto.
    - Sin `avisoIA`, el `html` es igual al que genera la versión de `git show HEAD:src/lib/email.ts`.
  - Además, `npx tsc --noEmit`, `npm run lint` y `npm test`.
- [ ] **Step 5:** Commit · "LibIA: aviso de IA en la respuesta, el correo y la hoja".

---

### Task 6: El recuadro de LibIA en el reclamo

**Files:**
- Modify: `src/components/response-form.tsx`
- Modify: `src/app/app/[bizId]/reclamo/[id]/page.tsx`

**Interfaces:**
- Consumes:
  - De la Tarea 4: `pedirBorradorLibIA` y `ResultadoLibIA`.
  - De la Tarea 2: `huecosPendientes`, `avisoDeIA` y `NOTA_MAXIMA`.
  - De la Tarea 1: `libia_quedan`.
  - De la Tarea 5: el campo `con_ia`.
- Produces: `ResponseForm` recibe una prop nueva, `libia: { incluido: boolean; quedan: number; usado: boolean }`.

- [ ] **Step 1: Página.**
  - `incluido = plan.libia`.
  - `usado = historial.some((e) => e.type === "libia")`.
  - `quedan`: con `createAdminClient().rpc("libia_quedan", { p_business_id: bizId })`, solo si `incluido && hasAdminClient()`; si no, 0. El negocio ya se leyó con la sesión del dueño, y eso prueba que es suyo.
- [ ] **Step 2: Formulario.** Reemplaza el botón "Próximamente". Los textos exactos están en Global Constraints.
  - **Sin `incluido`:** el recuadro aparece apagado, con el enlace "LibIA (Pro)".
  - **Con `incluido`:** campo de nota (máximo `NOTA_MAXIMA`), botón, "Te quedan N hoy" y la explicación.
  - **Mientras espera la acción:** el botón dice "LibIA está escribiendo…", y quedan bloqueados la caja de texto y los botones de guardar (`BotonEstado` suma `bloqueado?: boolean`).
  - **Con `ok: true`:**
    - Si había texto, se guarda para "Deshacer".
    - El borrador entra en la caja con la etiqueta.
    - El botón pasa a "Pedir otra versión" y `quedan` se actualiza.
  - **Con `ok: false`:** se muestra `mensaje` (en `sin_plan`, con el enlace a Plan) y **la caja no se toca**.
  - **Casilla `con_ia` (controlada):**
    - Se muestra si `libia.usado` es verdadero o si ya salió un borrador en esta visita.
    - Empieza marcada, salvo cuando `respondido && !complaint.respuesta_con_ia`.
    - La vista previa del correo muestra `avisoDeIA(businessName)` cuando está marcada.
  - **Al enviar** (`respondido`, `cerrado` o "Actualizar respuesta"): si `huecosPendientes(texto)` no está vacío, se cancela el envío y se muestra el mismo mensaje que da el servidor.
- [ ] **Step 3:** `npx tsc --noEmit`, `npm run lint` y `npm test`.
- [ ] **Step 4: Verificar en localhost.** Cómo levantarlo está en Global Constraints. Se usa Playwright MCP con la sesión de `demo@libroclaro.app`; la contraseña es `DEMO_PASSWORD` de `../libroclaro/.env.local` y no se imprime.
  1. Crear en `http://localhost:3005/r/demo` el reclamo de prueba, con el correo libroclaro.pe@gmail.com y un detalle que mencione un celular.
  2. En su detalle se ven el recuadro, "Te quedan 20 hoy" y la explicación.
  3. Escribir una nota y pedir un borrador: aparece en ~6 s con la etiqueta, el contador baja a "Te quedan 19 hoy" y el historial muestra "LibIA propuso un borrador".
  4. Con texto propio en la caja, forzar una falla: cambiar `LIBIA_MODELO` a `"@cf/no/existe"` solo en local, sin commitear, y devolverlo después. Se ve "LibIA no pudo escribir ahora. Inténtalo de nuevo.", el texto propio sigue intacto y el contador no baja.
  5. "Deshacer" recupera el texto anterior y "Pedir otra versión" trae otro.
  6. Sin nota, si el borrador trae `[indica aquí …]`, "Enviar respuesta" no envía y muestra el mensaje de huecos.
  7. A 390 px y a 320 px, el recuadro no se desborda.
- [ ] **Step 5:** Commit · "LibIA: recuadro en el detalle del reclamo".

---

### Task 7: Textos: Términos, Privacidad y la línea en Pro

**Files:**
- Modify: `src/app/terminos/page.tsx`, `src/app/privacidad/page.tsx`, `src/lib/plans.ts`

- [ ] **Step 1:** Agregar las frases exactas de la spec (sección "Textos legales"):
  - En Términos, al final del párrafo de "2. Responsabilidad del Negocio".
  - En Privacidad, al final del párrafo de "4. Dónde se almacenan".
  - En las dos páginas, cambiar a "Última actualización: octubre de 2026".
- [ ] **Step 2:** En `PLANS.pro.features`, después de "Plantillas de respuesta", agregar `"Borradores de respuesta con LibIA (IA)"`.
- [ ] **Step 3: Verificar en localhost.**
  - `/terminos` y `/privacidad` muestran las frases.
  - La tarjeta Pro de la portada y la página Plan muestran la línea nueva.
  - A 320 px, la portada no se desborda más que en producción.
- [ ] **Step 4:** Commit · "LibIA: términos, privacidad y beneficio del plan Pro".

---

### Task 8: Prueba completa en localhost y revisión de Fabrizio

- [ ] **Step 1:** Con el reclamo de prueba de la Tarea 6: pedir un borrador con nota, completarlo y enviarlo con la casilla marcada. Se espera:
  - La hoja pública (`/h/<token>`) muestra la respuesta y el aviso al pie.
  - Fabrizio confirma que el correo con el aviso llegó a libroclaro.pe@gmail.com.
  - Con `execute_sql`: la fila de hoy del demo en `libia_uso` tiene los borradores pedidos y neuronas reales de unas 22 por borrador, no la reserva.
- [ ] **Step 2:** Enviar otro con la casilla desmarcada: ni el correo ni la hoja llevan el aviso.
- [ ] **Step 3:** Fabrizio prueba en `http://localhost:3005` y pide cambios o dice "súbelo".

---

### Task 9: Publicar y comprobar en producción

- [ ] **Step 1:** Con el "súbelo" de Fabrizio y su decisión sobre la parte del panel de consumo, correr `npx opennextjs-cloudflare deploy` exacto desde este worktree.
- [ ] **Step 2:** En libroclaro.pe, con la sesión del demo, pedir un borrador del reclamo de prueba: aparece, y el historial y `libia_uso` lo registran.
- [ ] **Step 3:** `git push origin refs/heads/cloudflare:refs/heads/main`.
- [ ] **Step 4:** Actualizar `../traspaso-ia-borradores/TRASPASO.md` y la memoria con LibIA publicada (versión del Worker y commit) y con la siguiente entrega: LibIA en el panel de consumo.
