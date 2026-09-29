# LibIA: nueva mascota 3D del hero con entrada desde detrás de la hoja

Fecha: 2026-09-29 · Aprobado en conversación con Fabrizio (partes 1, 2 y 3 del diseño).
Fuente de referencia: `C:\Users\FABRIZIO\Documents\Codex\2026-09-28\tnego-x20\outputs\libroclaro-mascota-3d`
(`fuente-mascota-3d.html`, `vista-previa.html`, `INTEGRAR-CON-CLAUDE.md`, versión del 2026-09-29 13:57).

## Objetivo

Reemplazar la mascota actual del hero por **LibIA**, la versión nueva generada con Codex, e incorporar su
entrada: se asoma dos veces por detrás de la hoja de reclamación real del hero, pasa al frente saludando y
queda flotando en la esquina inferior derecha de la hoja. Todo con Three.js, sin archivos 3D, servicios ni
costos nuevos.

## Decisiones tomadas

1. **Enfoque A:** portar la fuente de Codex casi tal cual (cámara ortográfica en píxeles, un lienzo grande
   alrededor de la hoja, cambio de capa detrás/delante). Descartado el enfoque B (mover el lienzo pequeño
   actual con CSS), porque obliga a traducir las trayectorias y la guía advierte contra mezclar sistemas.
2. **Celular:** LibIA sigue oculta por debajo de 768 px y Three.js no se descarga (decisión previa de Fabrizio,
   confirmada). La guía de Codex pide probar desde 320 px; aquí se prueba que no aparezca y que no haya desborde.
3. **Aviso "Nuevo reclamo recibido" (opción b):** se queda arriba a la derecha de la hoja, pero aparece recién
   cuando LibIA termina de entrar. Si LibIA no va a entrar, aparece enseguida, como hoy.

## Lo que se ve

- **Apariencia (idéntica a la fuente):** libro teal `#0f766e`, lomo, páginas crema y marcador coral; lentes
  finos color champaña; rasgos suaves (cejas, rubor); brazos con hombro, codo y muñeca; guantes de tres dedos
  y pulgar; sin piernas: sombra suave y halo bajo el libro. La parte baja de la tapa queda limpia: se quitan
  solo las dos líneas curvas y sus cuatro puntitos; se conservan el LED superior, la luz del borde y los
  detalles de las articulaciones.
- **Entrada (6,55 s, una vez por carga del documento):** primer vistazo con media cara por el borde superior
  derecho de la hoja (hasta 1,30 s), retirada (hasta 1,95 s), segundo vistazo con una mano y saludo corto
  (hasta 3,15 s), subida hasta despejar el borde (3,85 s), cambio al frente, descenso saludando y reposo hacia
  4,85 s; el saludo termina con suavidad hasta 6,55 s. Se conservan los arcos, la mirada curiosa, la
  anticipación, el rebote amortiguado y los tiempos y curvas de `peekPose()` y `placeMascot()` de la fuente.
- **Después de la entrada:** flota en la esquina inferior derecha de la hoja, en una posición y tamaño
  equivalentes a los de la mascota actual; parpadea; sigue el cursor en todo el hero con la respuesta más
  amplia y rápida de la fuente (suavizado `1 - exp(-dt·20)`); al tocarla saluda (3,1 s) y al arrastrarla gira.
- **Controles:** saludar y pausar siguen ocultos a la vista y aparecen solo al navegar con teclado (decisión
  previa de Fabrizio). No se incorpora «Ver entrada» ni nada del marco de la demo.

## Cómo se arma

### Capas y geometría

- En `page.tsx`, el bloque de la columna derecha pasa a ser `relative isolate` y contiene: el lienzo de
  LibIA (hermano, `absolute`) y `HeroDemo` envuelto en `relative z-10`.
- El lienzo es transparente (`alpha: true`, `setClearAlpha(0)`, sin fondo) y **no recibe eventos**
  (`pointer-events: none`). Cubre la hoja más los márgenes que necesita la trayectoria: por arriba el espacio
  para asomarse y despejar el borde con la mano levantada; a la derecha, lo mismo que sobresale hoy la mascota
  en cada tamaño (16 px hasta xl, 48 px en xl, 112 px desde 1400 px); por abajo, la sombra.
- Detrás/delante: `z-index` del lienzo 0 (debajo de la hoja, que es `z-10`) hasta 3,85 s y 20 después.
  Antes de fijar el instante se verifica con las medidas reales que el libro y las dos manos ya despejaron el
  borde; si no, se ajusta el cambio sin alterar la coreografía.
- Cámara ortográfica con unidades de píxel del lienzo, como la fuente. Las anclas (`top`, `right`, `bottom`
  de la hoja) se miden relativas al lienzo con `getBoundingClientRect`; un `ResizeObserver` sobre la hoja y el
  bloque recalcula el recorrido sin reiniciar la entrada.
- Tamaño (`size`): se calibra para que LibIA en reposo mida y se ubique como la mascota actual en md, xl y
  desde 1400 px (se compara con capturas de hoy).
- El hero tiene `overflow-hidden`: se mide si al despejar el borde (subida máxima) LibIA cabe dentro del hero.
  Si no, se ajusta un poco la altura de la subida o el margen superior del hero, sin cambiar tiempos ni gestos.

### Coordinación con el aviso ("semáforo")

Módulo nuevo `src/components/mascota/entrada.ts`, sin dependencias:

- Guarda en memoria del documento si la entrada ya se vio. Sobrevive a remontajes y navegación interna; se
  reinicia solo con una recarga completa. No usa `localStorage`.
- `avisarEntradaTerminada()` y `alTerminarEntrada(cb): () => void` (se llama al instante si ya terminó).
- `HeroDemo`:
  - Si la pantalla es menor de 768 px o el sistema pide movimiento reducido, muestra el aviso y arranca su
    ciclo apenas carga (con la animación de entrada del aviso).
  - Si no, deja el aviso oculto y no inicia su ciclo hasta `alTerminarEntrada` o hasta 12 s después de
    montarse (red de seguridad).
  - El primer pintado del servidor deja el aviso oculto, para no mostrarlo y esconderlo enseguida.
- `MascotaHero` avisa "terminada" cuando la entrada llega a 6,55 s, cuando no habrá entrada (movimiento
  reducido o ya vista en esta visita), cuando falla WebGL o se pierde el contexto.
- Si se sale de la portada a mitad de la entrada, cuenta como vista: al volver, LibIA ya está en su pose
  final. Solo cuenta si la entrada llegó a avanzar: el montaje de prueba de React Strict Mode se desmonta
  antes de que cargue Three.js y no la consume.
- Dentro de un mismo montaje, un cambio de ancho recalcula posiciones y conserva el progreso de la entrada.

### Escena (`escena.ts`, reescrita)

`crearMascota({ canvas, hoja, bloque, zonaMirada, sombra, onPausa, onFallo, onEntradaTerminada })`
→ `{ saludar, pausar, destruir }`.

- Modelo, materiales, luces y animaciones portados de la fuente (TypeScript, `three@0.180.0` instalado; sin
  CDN). Se retiran `window.openai`, `openai:set_globals`, `Tweak`, la tarjeta de demo, «Ver entrada» y el
  marco.
- Transformación del recorrido (`mascot`) separada de la pose interna (`rig`, `book`): flotación, mirada y
  saludo no pisan la trayectoria.
- Durante la entrada, el arrastre y el saludo manual no actúan; la pausa sí. Al terminar, la mirada dirigida
  cede suavemente al cursor.
- Seguimiento del cursor en toda la sección del hero (`pointermove` pasivo). El arrastre se captura en el
  bloque solo si el puntero cae sobre LibIA (prueba de posición), sin bloquear enlaces, botones ni el scroll
  (`touch-action: pan-y`). El cursor "mano" solo sobre LibIA.

## Accesibilidad, rendimiento y fallos

- **Movimiento reducido:** sin entrada, sin flotación; LibIA en su pose final; saludo como pose breve. Si la
  preferencia cambia a mitad de la entrada, salta a la pose final y avisa "terminada".
- **Pausa y pestaña oculta:** se detienen el dibujo y el reloj de la entrada; al volver sigue desde el mismo
  punto (el paso de tiempo por cuadro se limita a 45 ms, como en la fuente). Fuera de pantalla no dibuja.
- **Carga:** Three.js en su propio paquete, con `requestIdleCallback`, solo desde 768 px. El lienzo tiene
  su tamaño desde el primer pintado, así que no hay saltos. Densidad de píxeles máxima 1,6.
- **Sin WebGL o contexto perdido:** LibIA se oculta, se avisa "terminada" y la página queda completa.
- **Limpieza:** una escena por montaje; con React Strict Mode, un import que llega tarde no crea escena. Al
  desmontar se cancelan `requestAnimationFrame`, observadores y listeners, y se liberan geometrías,
  materiales, texturas, mapa de sombras y renderer.

## Pruebas

- `tsc`, `eslint` y `next build` sin errores; y compilación de OpenNext para Cloudflare.
- En navegador (Playwright), a 1280, 1440 y 900 px de ancho:
  - Capturas de la entrada en 0,5; 1,0; 1,6; 2,4; 3,0; 3,7; 3,9; 4,5; 5,5 y 7 s: sin cuerpo completo antes
    de tiempo, sin atravesar la hoja, sin aparición repentina al cambiar de capa, manos completas.
  - Reposo en la misma posición y tamaño que la mascota actual (comparación con capturas previas).
  - Aviso oculto durante la entrada y visible después; ciclo de la hoja funcionando.
  - Seguimiento del cursor (izquierda, derecha, arriba, abajo), saludo al tocar, giro al arrastrar, y que los
    botones y enlaces del hero sigan respondiendo.
  - Pausa a mitad de la entrada y reanudación sin salto; pestaña oculta y vuelta.
  - Navegar a otra página y volver: sin repetir la entrada ni duplicar lienzos. Recarga: se repite.
  - Cambio de ancho durante la entrada.
  - Movimiento reducido (emulado): pose final inmediata y aviso inmediato.
- A 375 px y 320 px: sin lienzo ni descarga de Three.js, aviso inmediato, sin desborde horizontal nuevo.
- Comparación visual con `vista-previa.html`: lentes, rasgos, tapa limpia, frente, perfil y saludo.

## Fuera de alcance

- Mostrar LibIA en celular.
- Usar el nombre LibIA en otros lugares (por ejemplo, el botón "Pedirle una propuesta a la IA").
- Cambios en pagos, autenticación, base de datos, dominio o alojamiento.
- Publicar: se hace después de que Fabrizio lo apruebe en su PC, por el flujo de Cloudflare.
