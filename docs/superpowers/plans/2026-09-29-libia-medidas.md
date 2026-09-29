# LibIA: medidas de la mascota actual (línea base)

Medido el 2026-09-29 con el código de `main` d14a7a8 (`next start`), Playwright con movimiento reducido
emulado (hoja y mascota quietas), puntero fuera del hero, ventana de 900 px de alto. La caja visible sale de
restar una captura con la mascota y otra con su `canvas` oculto (umbral 40 por canal; entre dos capturas
iguales sin mascota la diferencia fue 0 px). Coordenadas en px de página; la barra de desplazamiento ocupa
15 px, así que el ancho útil es 885, 1265 y 1425.

| Ventana | Hoja (izq, arriba, der, abajo) | Mascota visible (izq, arriba, der, abajo) | Tamaño visible | Centro | Centro − esquina inf. der. de la hoja | Espacio sobre la hoja (hoja.top − sección.top) |
|---|---|---|---|---|---|---|
| 900 (md) | 467, 182, 861, 586 | 682, 479, 828, 633 | 147 × 155 | 755, 556 | dx −106, dy −30 | 182 − 65 = **117** |
| 1280 (xl) | 657, 177, 1185, 561 | 1011, 449, 1177, 622 | 167 × 174 | 1094, 536 | dx −91, dy −25 | 177 − 65 = **112** |
| 1440 (≥1400) | 737, 177, 1265, 561 | 1133, 427, 1315, 620 | 183 × 194 | 1224, 524 | dx −41, dy −37 | 177 − 65 = **112** |

Lienzo actual (izq, arriba, der, abajo): 900 → 627, 450, 877, 650 · 1280 → 948, 416, 1233, 641 ·
1440 → 1062, 391, 1377, 641.

## Para la calibración (Tasks 3 y 5)

- LibIA en reposo debe quedar con su caja visible en el mismo centro (±10 %) y con el mismo alto (±10 %),
  medida con este mismo método.
- En la fuente, el libro mide 0,94·size de alto y la sombra y el halo bajan hasta ~0,65·size bajo el centro;
  la caja visible queda cerca de 1,15-1,2·size. Por eso, como punto de partida: size ≈ 130 (md), 145 (xl) y
  160 (≥1400).
- Para pasar al frente, LibIA necesita sobre la hoja unos 0,47·size (media altura del libro) + 0,5·size
  (despeje de la silueta) + 8 px ≈ 0,97·size + 8: **~135, ~150 y ~165 px**. Hay 117, 112 y 112, así que
  falta espacio (entre 18 y 53 px). El hero recorta por arriba (`overflow-hidden`) y encima está la cabecera
  fija, así que hay que agregar margen superior al hero en md+ o reducir el tamaño durante la subida. La
  Task 5 lo decide con capturas.
