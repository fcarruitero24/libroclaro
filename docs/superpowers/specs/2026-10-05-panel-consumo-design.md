# Panel de consumo de LibroClaro (`panel.libroclaro.pe`)

Fecha: 2026-10-05 · Aprobado en conversación con Fabrizio: el diseño visual (muestra privada
https://claude.ai/artifact/JC89yopPrivuk4h2wyfamM), que sea "en vivo" y que viva en Cloudflare.

## Objetivo

Una página privada que muestre, en el momento, cuánto usa LibroClaro de cada plataforma frente al límite de su
plan, a qué ritmo, cuándo se acabaría ese límite y cuánto cuesta cada una. Si algo se acerca al límite, avisa por
correo. Sin costo extra.

## Decisiones tomadas

1. **Cloudflare y no Vercel.** Vercel gratis prohíbe el uso comercial (zona gris para un panel de un negocio) y
   solo corre tareas una vez al día. En Cloudflare entra en el plan Workers Paid que ya se paga, permite uso
   comercial y deja todo en un solo lugar.
2. **Qué muestra:** Cloudflare, Supabase, Resend y Mercado Pago con su uso, límite, precio y "cuándo pagarías";
   la consulta de RUC (apis.net.pe) y el generador de QR (api.qrserver.com) solo como "responde / no responde";
   el estado de los recordatorios de cada mañana; y el vencimiento del dominio `libroclaro.pe` (agregado el
   2026-10-06: es un dato a mano porque punto.pe no tiene API, y si se olvida se apaga todo LibroClaro).
   Fuera: GitHub, Vercel (retirado) y Gmail.
3. **En vivo:** consulta a cada plataforma al abrir la página, al tocar "Actualizar" y cada 5 minutos mientras la
   pestaña está a la vista. Resend no tiene consulta de uso: su dato es el del último correo enviado.
4. **Alertas:** cada hora se revisa todo y se manda un correo a `PLATFORM_EMAIL` cuando algo cruza el 80 % o el
   100 % de su límite, o cuando los recordatorios de la mañana fallan o no corren. Las de límites se mandan una sola
   vez por ciclo; la de recordatorios, una vez por día.
5. **Costo: S/ 0.** Calculado: con el panel abierto 24 h y alertas cada hora usaría menos del 0,3 % de las visitas y
   del 2 % de la CPU que incluye el plan. Cloudflare Access es gratis hasta 50 usuarios.

## Lo que se ve

La muestra aprobada, con datos reales:

- **Arriba:** estado general (verde si nada pasa del 80 %, ámbar entre 80 y 99 %, rojo desde 100 %), gasto del
  mes en US$ y su equivalente en soles, lo más cercano a su límite y el próximo cobro.
- **Una tarjeta por plataforma** con barras de uso frente al límite, una raya que marca dónde terminaría el ciclo
  al ritmo actual, el costo del mes y "cuándo pagarías". Cloudflare suma un gráfico de visitas por día. Mercado
  Pago muestra suscripciones activas, lo cobrado y las comisiones del mes, más la tabla de lo que queda de cada
  plan con la tarifa publicada.
- **Abajo:** RUC, QR, los últimos 7 días de los recordatorios, el vencimiento del dominio y las alertas.
- **Estados:** mientras carga, esqueletos; si una fuente falla, su tarjeta dice qué no se pudo consultar y el resto
  se muestra igual; si el dato tiene más de 10 minutos, se indica su antigüedad. Resend muestra siempre la hora de
  su último envío ("último correo hace 2 h").
- Funciona desde 320 px de ancho, en modo claro y oscuro, con la identidad de LibroClaro.

## Cómo se arma

### Piezas

1. **Worker `libroclaro-panel`** (carpeta `panel/` del repo, con su propio `wrangler.jsonc`):
   - Sirve la página (archivos estáticos) y `GET /api/resumen`, que junta los datos de todas las fuentes.
   - Tiene un cron cada hora (`0 * * * *`) que arma el mismo resumen y pide a LibroClaro mandar las alertas nuevas.
   - Solo responde en `panel.libroclaro.pe`: sin `workers.dev` ni vistas previas.
2. **LibroClaro** (el Worker actual) suma:
   - `GET /api/panel/resumen`: datos de Supabase, Mercado Pago, Resend y la última corrida de recordatorios.
   - `POST /api/panel/alertas`: recibe las alertas, descarta las ya enviadas y manda por correo las nuevas.
   - En `email.ts`, después de cada envío, guarda las cabeceras `x-resend-daily-quota` y `x-resend-monthly-quota`.
   - En el cron de recordatorios, guarda el resultado de cada corrida (hora, si salió bien, cuántos avisos mandó).
3. **Supabase, migración 0009:**
   - Función `uso_de_la_plataforma()`: tamaño de la base, archivos, usuarios totales y activos en 30 días, negocios,
     reclamos y suscripciones activas. `security definer`, ejecutable solo por `service_role`.
   - Tabla `uso_plataformas` (clave, valor json, actualizado): último dato de Resend y última corrida del cron.
   - Tabla `uso_diario` (fecha, tamaño de la base): una fila por día, para calcular el ritmo de crecimiento.
   - Tabla `alertas_panel` (clave única, fecha): qué alertas ya se mandaron.
   - Las tres tablas con RLS activo y sin políticas: solo las lee y escribe el servidor.

### De dónde sale cada dato

| Dato | Fuente | Cuándo se actualiza |
|---|---|---|
| Visitas, CPU y errores (todos los Workers de la cuenta), visitas por día | API GraphQL de Cloudflare, `workersInvocationsAdaptive` | Al consultar (Cloudflare tarda unos minutos) |
| Corridas del cron (7 días) | GraphQL, `workersInvocationsScheduled`, más el resultado guardado por la ruta | Al consultar |
| Base, archivos, usuarios, negocios, reclamos | `uso_de_la_plataforma()` vía `/api/panel/resumen` | Al instante |
| Ritmo de la base | `uso_diario` (la escribe el resumen una vez por día) | Diario |
| Correos del día y del mes | `uso_plataformas`, escrito tras cada envío | Con cada correo |
| Suscripciones activas | `businesses.mp_subscription_status` | Al instante |
| Cobrado y comisiones del mes | API de pagos de Mercado Pago (`/v1/payments/search`, aprobados del mes, `fee_details`) | Al instante |
| RUC y QR | Pedido de prueba desde el panel, con tiempo de respuesta | Al consultar |
| Ciclo de cobro de Cloudflare (inicio y fin) | API de suscripciones de Cloudflare (`current_period_start/end`) | Al consultar |
| Precios y límites | Configuración del panel, con la fecha en que se verificaron | A mano |

- La API de Cloudflare no acepta ventanas de más de una semana: el ciclo se consulta en tramos semanales.
- Si la API de suscripciones no responde, el ciclo se calcula desde el día 29 de cada mes (o el último día del mes,
  cuando el mes es más corto).
- El tráfico de Supabase no está en su API: la tarjeta enlaza a su página de uso.
- El resumen se guarda 60 segundos en la caché del panel; "Actualizar" la salta.

### Precios y límites (verificados entre el 2026-09-25 y el 2026-10-05)

- **Cloudflare Workers Paid:** US$ 5/mes; incluye 10 M de visitas y 30 M de ms de CPU; extra US$ 0,30 por millón
  de visitas y US$ 0,02 por millón de ms.
- **Supabase gratis:** 500 MB de base, 1 GB de archivos, 5 GB de tráfico y 50.000 usuarios activos al mes; se pausa
  tras 7 días sin actividad. Pro: US$ 25/mes.
- **Resend gratis:** 100 correos al día (se reinicia a medianoche UTC, 7:00 p. m. en Lima) y 3.000 al mes. Pro:
  US$ 20/mes, 50.000 al mes y sin tope diario.
- **Mercado Pago:** sin mensualidad; 3,49 % + S/ 1 + IGV por cobro con abono inmediato. La tabla del panel usa esta
  tarifa; lo cobrado del mes usa la comisión real de cada pago.
- **Tipo de cambio** para mostrar soles: valor fijo en la configuración, marcado como aproximado.

### Proyecciones

- **Cloudflare:** promedio de los últimos días completos del ciclo, multiplicado por los días que faltan, más lo usado.
- **Resend del mes:** lineal según el día del mes.
- **Base de Supabase:** pendiente de los últimos 7 días de `uso_diario`. Con menos de 3 días se muestra "el ritmo
  aparece en unos días" y no se proyecta.
- Cada barra dice "no llega al límite este ciclo" o "llegaría el día X".

### Alertas

- Umbrales: 80 % y 100 % de cada límite medido, recordatorios fallidos o sin correr en más de 26 horas, y 60 días
  o menos para que venza el dominio (contados en día de Lima).
- La clave de cada alerta junta métrica, umbral y ciclo (por ejemplo `cloudflare.cpu.80.2026-10-29`); la de
  recordatorios usa el día (`cron.recordatorios.2026-10-05`) y la del dominio, su fecha de vencimiento
  (`dominio.vence.2028-09-19`: un solo correo hasta que se renueve y cambie la fecha). La tabla `alertas_panel`
  impide repetirlas.
- El correo lo manda LibroClaro, que ya tiene Resend; el panel no guarda la clave de Resend.

### Seguridad

- **Cloudflare Access** protege `panel.libroclaro.pe`: entrada con código de un solo uso al correo autorizado
  (libroclaro.pe@gmail.com). Además, el Worker verifica en cada pedido la firma, la audiencia y el vencimiento del
  token de Access (`Cf-Access-Jwt-Assertion`) y responde 403 si no es válido.
- **Las claves peligrosas no salen de LibroClaro:** el token de Mercado Pago y la llave de servicio de Supabase solo
  las usa LibroClaro. El panel tiene solo dos secretos: un token de Cloudflare de solo lectura ("Account Analytics:
  Read" y "Billing: Read") y `PANEL_SECRET`.
- **Las rutas `/api/panel/*` de LibroClaro** exigen la cabecera `x-panel-secret` (comparación en tiempo constante) y,
  sin ella, responden 404 como si no existieran. No devuelven datos personales: solo números.

### Errores

- Cada fuente se consulta por separado con tiempo límite de 8 s. Si una falla, su parte del resumen trae el error y
  la página lo muestra en su tarjeta; las demás siguen.
- Si LibroClaro no responde, el panel igual muestra Cloudflare, RUC y QR.
- Si una alerta no se pudo enviar, no se marca como enviada y se reintenta en la hora siguiente.

## Lo que hace Fabrizio

1. Crear en Cloudflare un token de API con los permisos de solo lectura **Account Analytics: Read** y **Billing:
   Read**, y guardarlo en `libroclaro/.env.local` como `CLOUDFLARE_ANALYTICS_TOKEN` (nunca en el chat).
2. Activar Cloudflare Zero Trust (plan gratis) y crear la aplicación de Access para `panel.libroclaro.pe`, con guía
   paso a paso.
3. Aprobar la subida de los secretos (`PANEL_SECRET` en los dos Workers y el token en el panel), la migración 0009 y
   las publicaciones.

## Pruebas

- **Pruebas `node:test` de las funciones puras:**
  - inicio y fin del ciclo de cobro (incluido febrero);
  - tramos semanales;
  - proyecciones;
  - estado según el porcentaje;
  - claves de alerta;
  - comisión de Mercado Pago;
  - verificación del token de Access con una llave generada en la prueba (firma válida, audiencia equivocada,
    vencido, sin token).
- **Migración:** la función devuelve los números esperados y `anon`/`authenticated` no pueden ejecutarla
  (transacción revertida).
- **Rutas de LibroClaro:** sin secreto → 404; con secreto → números sin datos personales.
- **En local** (`wrangler dev`): la página con datos reales, una fuente caída a propósito, 320 px, modo oscuro y la
  actualización cada 5 minutos que se pausa con la pestaña oculta.
- **En producción, antes de dar por terminado:**
  - entrar con el correo autorizado;
  - comprobar que otro correo no entra;
  - comprobar que la dirección del Worker sin Access no responde;
  - forzar una alerta de prueba y ver que llega una sola vez.

## Fuera de alcance

- Historial largo (más de un ciclo) y gráficos de meses anteriores.
- Varios usuarios o roles en el panel.
- Tráfico de Supabase (no está en su API).
- Editar precios o límites desde el panel (se cambian en la configuración).
- Mostrar el panel a los clientes de LibroClaro.
