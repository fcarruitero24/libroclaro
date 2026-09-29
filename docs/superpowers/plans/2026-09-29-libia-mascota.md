# LibIA: mascota con entrada desde detrás de la hoja · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la mascota del hero por LibIA (versión Codex del 2026-09-29) con su entrada de 6,55 s desde detrás de la hoja real y el aviso "Nuevo reclamo recibido" apareciendo después.

**Architecture:** La lógica pura (semáforo de la entrada y trayectoria/gestos en función del tiempo) vive en dos módulos sin dependencias con pruebas `node:test`. `escena.ts` porta el modelo Three.js de la fuente con cámara ortográfica en píxeles y usa esos módulos; `mascota-hero.tsx` monta un lienzo grande alrededor de la hoja y cambia su capa; `hero-demo.tsx` espera al semáforo para mostrar el aviso.

**Tech Stack:** Next.js 16.3.4 (App Router), React 19, TypeScript, Tailwind v4, three@0.180.0 (ya instalado), `node:test` de Node 24 (sin dependencias nuevas).

**Spec:** `docs/superpowers/specs/2026-09-29-libia-mascota-design.md`
**Fuente a portar:** `C:\Users\FABRIZIO\Documents\Codex\2026-09-28\tnego-x20\outputs\libroclaro-mascota-3d\fuente-mascota-3d.html`

## Global Constraints

- Sin dependencias nuevas; `three` 0.180.0 importado desde el paquete instalado, nunca desde CDN.
- LibIA solo desde 768 px (`md`); por debajo no se renderiza ni se descarga Three.js.
- Entrada 6,55 s; cambio de capa a 3,85 s (solo si el libro y las dos manos ya despejaron el borde); saludo 3,1 s.
- Lienzo transparente (`alpha: true`, `setClearAlpha(0)`), `pointer-events: none`; densidad de píxeles ≤ 1,6.
- Capas: hoja en `relative z-10`; lienzo `z-index` 0 detrás y 20 delante.
- Aviso "Nuevo reclamo recibido": oculto hasta que LibIA termine; red de seguridad 12 s desde que monta `HeroDemo`.
- Estado de la entrada solo en memoria del documento; nada en `localStorage`.
- Se retira todo lo de la demo: `window.openai`, `openai:set_globals`, `Tweak`, «Ver entrada», textos de estado, tarjeta y marco.
- Nombres, comentarios y textos en español, como el resto del repo. `git add` de archivos concretos, nunca `-A`.

## Review Focus

- Pausa a mitad de la entrada: el aviso aparece a más tardar 12 s después de montar la hoja, y LibIA reanuda sin salto.
- La ventana baja de 768 px durante la entrada: LibIA desaparece y el aviso aparece enseguida.
- Three.js tarda (chunk retrasado 9 s): el aviso sale a los 12 s, LibIA igual entra, sin errores en consola.
- Con LibIA delante, los botones del hero ("Probar 30 días gratis", "Ver un ejemplo") y el resto de la página responden; el arrastre solo empieza sobre LibIA.
- La página carga con el hero fuera de pantalla (scroll restaurado abajo): la entrada no avanza hasta verse, y el aviso sale a los 12 s.

---

### Task 1: Medidas de la mascota actual (línea base)

**Files:**
- Create: `docs/superpowers/plans/2026-09-29-libia-medidas.md`

**Interfaces:**
- Produces: para md (900 px), xl (1280 px) y ≥1400 (1440 px): caja de la hoja, caja visible de la mascota actual (izquierda, arriba, derecha, abajo, en px de página), centro de la mascota relativo a la esquina inferior derecha de la hoja, y el espacio `hoja.top − sección.top`. La Task 3 fija con esto `FINAL` y `tamanoLibIA`.

- [ ] **Step 1:** Con el código actual sin cambios: `npm run build` y `npx next start -p 3107` en segundo plano.
- [ ] **Step 2:** Con Playwright, en cada ancho (alto 900): cargar `/`, esperar 9 s (carga y saludo inicial), mover el puntero fuera del hero y esperar 2 s. Captura del hero; poner `visibility:hidden` al `canvas` del hero y otra captura; la diferencia de píxeles es la caja visible de la mascota. Medir con `getBoundingClientRect` la hoja (`div.anim-rise-in.rounded-2xl` dentro del hero) y la `section` del hero.
- [ ] **Step 3:** Escribir los números en `2026-09-29-libia-medidas.md` (tabla por ancho) y detener el servidor.
- [ ] **Step 4:** Commit: `git add docs/superpowers/plans/2026-09-29-libia-medidas.md` · `git commit -m "LibIA: medidas de la mascota actual"`.

### Task 2: Semáforo de la entrada

**Files:**
- Create: `src/components/mascota/entrada.ts`
- Create: `src/components/mascota/entrada.test.ts`
- Modify: `tsconfig.json` (agregar `"allowImportingTsExtensions": true`; el repo ya tiene `noEmit`)
- Modify: `package.json` (script `"test": "node --test \"src/**/*.test.ts\""`)

**Interfaces:**
- Produces:
  - `entradaTerminada(): boolean`
  - `avisarEntradaTerminada(): void` — idempotente; avisa a los suscriptores una sola vez.
  - `alTerminarEntrada(cb: () => void): () => void` — si ya terminó llama `cb` al instante (sincrónico); devuelve la función para desuscribirse.

- [ ] **Step 1: Pruebas que fallan.** En `entrada.test.ts`, cada prueba importa un módulo fresco con `await import("./entrada.ts?caso=N")`:
  - `empieza sin terminar`: `entradaTerminada() === false`.
  - `avisa una sola vez`: con un suscriptor, llamar `avisarEntradaTerminada()` dos veces → el suscriptor se llamó 1 vez y `entradaTerminada() === true`.
  - `suscribirse tarde llama al instante`: tras avisar, `alTerminarEntrada(cb)` llama `cb` 1 vez antes de retornar.
  - `desuscribirse evita el aviso`: `const quitar = alTerminarEntrada(cb); quitar(); avisarEntradaTerminada()` → `cb` se llamó 0 veces.
- [ ] **Step 2:** `node --test src/components/mascota/entrada.test.ts` → FAIL (no existe el módulo).
- [ ] **Step 3:** Implementar `entrada.ts` con estado a nivel de módulo (`let terminada`, `Set` de suscriptores). Comentario de por qué vive en el módulo: sobrevive a remontajes y navegación interna; una recarga lo reinicia.
- [ ] **Step 4:** `npm test` → 4 pass. `npx tsc --noEmit` → sin errores.
- [ ] **Step 5:** Commit de los 4 archivos: "LibIA: semáforo de la entrada con pruebas".

### Task 3: Trayectoria y gestos en función del tiempo

**Files:**
- Create: `src/components/mascota/recorrido.ts`
- Create: `src/components/mascota/recorrido.test.ts`

**Interfaces:**
- Consumes: números de la Task 1.
- Produces:
  - `DURACION_ENTRADA = 6.55`, `CAMBIO_DE_CAPA = 3.85`, `DURACION_SALUDO = 3.1`.
  - `type Medidas = { ancho: number; alto: number; size: number; top: number; right: number; bottom: number }` — px relativos a la esquina superior izquierda del lienzo; `top/right/bottom` son los bordes de la hoja.
  - `type Gesto = { x: number; y: number; turn: number; roll: number; pitch: number; gazeWeight: number; gazeX: number; gazeY: number; curiosity: number; second: number; hand: number; elbow: number; flutter: number }`
  - `type Lugar = { x: number; y: number; delante: boolean; asentado: number }` — centro de LibIA en px del lienzo; `asentado` ∈ [0,1] multiplica la opacidad de sombra y halo.
  - `ease(inicio, fin, t)`, `mix(a, b, p)`, `pulse(inicio, fin, t)` — idénticas a la fuente (líneas 234-236).
  - `gestoDeVistazo(t: number): Gesto` — port literal de `peekPose()` (fuente 267-287).
  - `lugarEnRecorrido(t: number, m: Medidas, g: Gesto): Lugar` — port de la parte de posición de `placeMascot()` (fuente 289-305), con el destino final en `right + FINAL.dx·size`, `bottom + FINAL.dy·size`.
  - `FINAL: { dx: number; dy: number }` y `tamanoLibIA(anchoHoja: number): number` (con `clamp`) — valores tomados de la Task 1 para que el reposo coincida en centro y alto (±10 %) con la mascota actual en los tres anchos.
  - `fase(t: number): "llegando" | "vistazo" | "escondida" | "llega-mano" | "mano" | "sale" | "saluda" | "reposo"` — mismos cortes que `phase()` de la fuente (línea 243).

- [ ] **Step 1: Pruebas que fallan** en `recorrido.test.ts`, con `const m = { ancho: 600, alto: 900, size: 150, top: 260, right: 560, bottom: 700 }`:
  - `ease` vale 0 en el inicio, 1 en el fin, 0,5 a la mitad, y se limita fuera del rango.
  - `empieza escondida`: `lugarEnRecorrido(0, m, gestoDeVistazo(0))` → `y === 260 + 0.72·150` y `delante === false`.
  - `primer vistazo asoma media cara`: en t = 1,0, `y` está entre `top − 0.10·size` y `top + 0.15·size`.
  - `capa`: en t = 3,84 `delante === false`; en t = 3,85 `delante === true`.
  - `despeja el borde antes de pasar al frente`: en t = 3,85, `y + 0.5·size <= top` (0,5·size es la mitad inferior de la silueta: libro 0,47·size más margen).
  - `reposo`: en t = 6,55, `x === right + FINAL.dx·size`, `y === bottom + FINAL.dy·size` (tolerancia 0,5 px) y `asentado === 1`.
  - `no depende de llamadas previas`: la misma `t` y `m` dan el mismo resultado llamada tras llamada, y con `m` escalado ×2 las posiciones relativas a la hoja escalan ×2.
  - `fase`: 0,5 → "llegando"; 1,0 → "vistazo"; 1,5 → "escondida"; 2,8 → "mano"; 3,5 → "sale"; 5 → "saluda"; 7 → "reposo".
- [ ] **Step 2:** `npm test` → las nuevas FAIL.
- [ ] **Step 3:** Implementar `recorrido.ts` sin importar nada (Node debe poder correrlo tal cual).
- [ ] **Step 4:** `npm test` → todas PASS; `npx tsc --noEmit` sin errores.
- [ ] **Step 5:** Commit: "LibIA: recorrido y gestos de la entrada con pruebas".

### Task 4: Escena nueva e integración en el hero

**Files:**
- Modify (reescritura): `src/components/mascota/escena.ts`
- Modify (reescritura): `src/components/mascota/mascota-hero.tsx`
- Modify: `src/components/hero-demo.tsx` (aviso esperando al semáforo; `data-libia-hoja` en la tarjeta)
- Modify: `src/app/page.tsx:145-160` (bloque `data-libia-bloque`, `relative isolate`; `HeroDemo` dentro de `relative z-10`; nuevo `className` del lienzo)

**Interfaces:**
- Consumes: `entrada.ts` (Task 2) y `recorrido.ts` (Task 3).
- Produces:
  - `type OpcionesMascota = { canvas: HTMLCanvasElement; hoja: HTMLElement; zonaMirada: HTMLElement; zonaToque: HTMLElement; sombra: string; entradaYaVista: boolean; onPausa: (pausada: boolean) => void; onFallo: () => void; onEntradaTerminada: () => void }`
  - `type Mascota = { saludar(): void; pausar(pausada: boolean): void; entradaEmpezada(): boolean; destruir(): void }`
  - `crearMascota(o: OpcionesMascota): Mascota`
  - `MascotaHero({ className }: { className?: string })` — encuentra la hoja como `[data-libia-hoja]` dentro del `[data-libia-bloque]` más cercano.

- [ ] **Step 1: `escena.ts`.** Portar de la fuente, en TypeScript, la configuración del renderer (88-99: `alpha: true`, `antialias`, `powerPreference: "low-power"`, `setPixelRatio(Math.min(devicePixelRatio, 1.6))`, tone mapping y sombras; más `setClearAlpha(0)` y sin `scene.background`), los materiales (106-119), ayudantes (120-131), modelo completo (132-223, que ya trae la tapa baja limpia y los lentes), luces (224-227), `pose()` (307-364) usando `gestoDeVistazo`/`lugarEnRecorrido`, el reloj (`tick`/`start`/`stop`, 365-376) y el saludo (377). Cámara ortográfica con `left/right/top/bottom = ±ancho/2, ±alto/2` del lienzo. `Medidas` se calculan con `getBoundingClientRect` de lienzo y hoja; `size = tamanoLibIA(anchoHoja)`; `ResizeObserver` sobre lienzo y hoja recalcula sin tocar `introTime`. El lienzo cambia `style.zIndex` a `"0"` o `"20"` según `lugar.delante`. Mirada: `pointermove` pasivo en `zonaMirada`; arrastre en `zonaToque` solo si el puntero cae dentro de `0,76·size × 0,65·size` alrededor de LibIA (fuente 395-399), con `setPointerCapture`; cursor `grab` solo sobre LibIA. Durante la entrada no hay arrastre ni saludo; la pausa sí congela el reloj. `entradaYaVista` o movimiento reducido → `introTime = DURACION_ENTRADA` desde el inicio. `onEntradaTerminada` se llama una vez al llegar a `DURACION_ENTRADA` (o al crear, si no habrá entrada). Pestaña oculta y `IntersectionObserver` detienen el reloj; `webglcontextlost` → `onFallo`. `destruir()` libera todo (fuente 422-428, sin lo de la demo). No portar `save`, `onGlobals`, `Tweak`, `replay`, `ui`/textos, `theme`/`MutationObserver`.
- [ ] **Step 2: `mascota-hero.tsx`.** Lienzo `absolute` con `aria-label` de LibIA, clases para cubrir la hoja más márgenes (arriba el espacio de la subida, derecha 16/48/112 px según ancho, abajo la sombra), `hidden md:block`. Carga diferida igual que hoy (`requestIdleCallback`, solo con `(min-width: 768px)`). Al crear: `entradaYaVista: entradaTerminada()`, `onEntradaTerminada: avisarEntradaTerminada`, `onFallo` → destruir, avisar y ocultar. Si la media query deja de cumplirse → destruir y avisar. En el cleanup: `if (m.entradaEmpezada()) avisarEntradaTerminada()` antes de `destruir()`. Controles ocultos de saludar y pausar como hoy.
- [ ] **Step 3: `hero-demo.tsx`.** Agregar `data-libia-hoja` a la tarjeta blanca. Estado `avisoListo` (inicia `false` también en el servidor): `true` al instante si `!(min-width: 768px)`, movimiento reducido o `entradaTerminada()`; si no, con `alTerminarEntrada` o a los 12 s. `activo` exige además `avisoListo`; el aviso se ve solo con `fase === 0 && avisoListo`.
- [ ] **Step 4: `page.tsx`.** Bloque `<div data-libia-bloque className="relative isolate">` con `<MascotaHero …/>` y `<div className="relative z-10"><HeroDemo /></div>`; actualizar el comentario del bloque.
- [ ] **Step 5:** `npx tsc --noEmit`, `npx eslint` de los archivos tocados y `npm test` → sin errores.
- [ ] **Step 6:** `npm run build` y `npx next start -p 3107`; con Playwright a 1280 px: la entrada ocurre, termina en la esquina inferior derecha, aparece el aviso y no hay errores en consola.
- [ ] **Step 7:** Commit de los cuatro archivos: "LibIA: escena nueva con entrada desde detrás de la hoja".

### Task 5: Verificación completa y calibración

**Files:**
- Modify según hallazgos: `src/components/mascota/recorrido.ts` (`FINAL`, `tamanoLibIA`, subida), `src/components/mascota/mascota-hero.tsx` (márgenes del lienzo), `src/app/page.tsx` (margen superior del hero, solo si la subida no cabe).

**Interfaces:**
- Consumes: todo lo anterior. Si cambian `FINAL`, `tamanoLibIA` o la subida, se actualizan las pruebas de la Task 3 y deben seguir pasando.

- [ ] **Step 1: Cuadros de la entrada** a 900, 1280 y 1440 px: capturas en 0,5; 1,0; 1,6; 2,4; 3,0; 3,7; 3,9; 4,5; 5,5 y 7 s (pausando el reloj con el botón de pausa o midiendo tiempos). Esperado: nada del cuerpo visible fuera del borde superior antes de tiempo, media cara en el primer vistazo, mano en el segundo, sin aparición repentina al cambiar de capa, sin atravesar la hoja, manos completas y nada recortado por el borde superior del hero.
- [ ] **Step 2: Reposo:** caja visible de LibIA en reposo con el mismo método de la Task 1; centro y alto dentro de ±10 % de las medidas base. Si no, ajustar `FINAL`/`tamanoLibIA` y repetir.
- [ ] **Step 3: Interacción:** puntero a izquierda, derecha, arriba y abajo del hero (giro e inclinación claros, sin ocultar la cara, vuelta suave al salir); clic en LibIA → saludo; arrastre → giro; clic en "Probar 30 días gratis" y "Ver un ejemplo" → navegan; clic en la hoja no inicia arrastre.
- [ ] **Step 4: Casos del Review Focus:** pausa a mitad de la entrada (aviso ≤ 12 s, reanuda sin salto); ventana a 700 px durante la entrada (LibIA desaparece, aviso sale); chunk de Three.js retrasado 9 s con `page.route` (aviso a los 12 s, LibIA entra, consola limpia); hero fuera de pantalla al cargar (la entrada no avanza; aviso a los 12 s).
- [ ] **Step 5: Otros:** pestaña oculta y vuelta sin salto; ir a `/r/demo` y volver (sin repetir la entrada, un solo `canvas`); recarga (se repite); cambio de ancho a mitad de la entrada (sigue su progreso); movimiento reducido emulado (pose final y aviso inmediatos); 375 y 320 px (sin `canvas`, sin petición al chunk de Three.js, aviso inmediato, sin desborde horizontal nuevo).
- [ ] **Step 6: Comparación con `vista-previa.html`:** abrirla en Playwright y comparar frente, perfil (arrastrando), lentes, rasgos, tapa baja limpia, LED y saludo con la integración.
- [ ] **Step 7:** `npm test`, `npx tsc --noEmit`, `npx eslint` y `npm run build` sin errores. Commit de lo ajustado: "LibIA: calibración y verificación".

### Task 6: Entrega local

**Files:**
- Modify: `C:\Users\FABRIZIO\.claude\projects\c--Users-FABRIZIO-Documents-VIBECODEMAXING-LibroClaro-storage\memory\libroclaro-saas.md` (nota corta: LibIA integrada, archivos, pruebas; sin publicar)

- [ ] **Step 1:** En el worktree `../libroclaro-cloudflare`: `git merge --no-edit main` y `npx opennextjs-cloudflare build` → "OpenNext build complete." (sin desplegar).
- [ ] **Step 2:** Dejar `npx next start -p 3107` corriendo en `libroclaro` y pasar a Fabrizio la dirección `http://localhost:3107/` con qué mirar (entrada, reposo, aviso) y la lista de archivos cambiados.
- [ ] **Step 3:** Actualizar la memoria. No publicar: el despliegue a Cloudflare va después de su aprobación.
