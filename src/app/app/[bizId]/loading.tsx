/**
 * Esqueleto mientras carga una sección del panel. El menú y la cabecera
 * quedan fijos (son del layout) y esto aparece al instante al hacer clic,
 * en vez de dejar la pantalla congelada hasta que responda el servidor.
 * Imita la forma común de las secciones: título, fila de indicadores y un
 * bloque grande.
 */
export default function CargandoSeccion() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <div className="esqueleto h-4 w-28 rounded" />
        <div className="esqueleto h-7 w-56 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-5 sombra-tarjeta">
            <div className="esqueleto h-3.5 w-20 rounded" />
            <div className="esqueleto mt-3 h-8 w-12 rounded-lg" />
            <div className="esqueleto mt-3 h-3 w-32 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-2xl bg-white p-6 sombra-tarjeta">
        <div className="esqueleto h-4 w-40 rounded" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="esqueleto h-3.5 w-24 rounded" />
            <div className="esqueleto h-3.5 flex-1 rounded" />
            <div className="esqueleto h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
