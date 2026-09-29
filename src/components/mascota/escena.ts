/**
 * LibIA, la mascota 3D de LibroClaro: un libro teal flotante con lentes
 * finos, que se asoma dos veces por detrás de la hoja del hero, pasa al
 * frente saludando y queda flotando en la esquina inferior derecha de la
 * hoja, siguiendo el cursor.
 *
 * Es la versión aprobada (fuente: paquete "libroclaro-mascota-3d" de Codex,
 * 2026-09-29) portada a TypeScript sin cambiar geometrías, materiales,
 * luces, tiempos ni curvas. La trayectoria y los gestos de la entrada viven
 * en recorrido.ts (con pruebas). Lo adaptado: el ciclo de vida (React), el
 * origen de Three.js (paquete instalado, no CDN), la sombra (sobre el verde
 * oscuro del hero se pinta como un brillo claro) y que la hoja es la real
 * del hero, no una tarjeta de demostración.
 *
 * Cámara ortográfica en píxeles del lienzo: el lienzo cubre la hoja y sus
 * márgenes, y durante los vistazos va detrás de ella (z-index 0; la hoja
 * está en z-10). A los 3,85 s, con todo el libro y las manos por encima del
 * borde, pasa delante (z-index 20).
 *
 * Se importa de forma diferida desde MascotaHero: Three.js viaja en su
 * propio paquete y no retrasa el primer pintado.
 */
import * as THREE from "three";
import {
  DURACION_ENTRADA,
  DURACION_SALUDO,
  ease,
  gestoDeVistazo,
  lugarEnRecorrido,
  mix,
  pulse,
  tamanoLibIA,
  type Medidas,
} from "./recorrido";

export type Mascota = {
  saludar(): void;
  pausar(pausada: boolean): void;
  /** La entrada llegó a avanzar en esta escena (para no repetirla al volver a la portada). */
  entradaEmpezada(): boolean;
  destruir(): void;
};

export type OpcionesMascota = {
  canvas: HTMLCanvasElement;
  /** La hoja real del hero: tapa a LibIA durante los vistazos y da las medidas del recorrido. */
  hoja: HTMLElement;
  /** Zona donde la mirada sigue al cursor (el hero completo). */
  zonaMirada: HTMLElement;
  /** "Asa" transparente que se coloca sobre LibIA: tocarla la hace saludar y arrastrarla la gira. */
  zonaToque: HTMLElement;
  /** Color de la sombra bajo el libro; sobre fondo oscuro, uno claro. */
  sombra: string;
  /** Ya se vio la entrada en esta visita: LibIA aparece directo en su sitio. */
  entradaYaVista: boolean;
  onPausa: (pausada: boolean) => void;
  /** WebGL se perdió a mitad de camino: el componente debe ocultarse. */
  onFallo: () => void;
  onEntradaTerminada: () => void;
};

type Punto = [number, number, number];

/** Lanza si WebGL no está disponible; el componente lo atrapa y se oculta. */
export function crearMascota({
  canvas,
  hoja,
  zonaMirada,
  zonaToque,
  sombra,
  entradaYaVista,
  onPausa,
  onFallo,
  onEntradaTerminada,
}: OpcionesMascota): Mascota {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const options = { color: "#0f766e", roughness: 0.36, movement: 0.65 };
  const state = { paused: false, angle: -0.3 };

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearAlpha(0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);
  // mascot lleva el recorrido y la escala; rig y book, la pose interna.
  const mascot = new THREE.Group();
  mascot.visible = false;
  scene.add(mascot);
  const rig = new THREE.Group();
  mascot.add(rig);
  const book = new THREE.Group();
  rig.add(book);
  const resources = new Set<{ dispose: () => void }>();

  const material = (color: string, roughness = 0.5) => {
    const m = new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.38 });
    resources.add(m);
    return m;
  };
  const teal = material(options.color, options.roughness);
  const spineMat = material("#085d56", 0.48);
  const paper = material("#f4e6c8", 0.8);
  const pageLine = material("#d0bc96", 0.85);
  const cream = material("#fff5de", 0.32);
  const ink = material("#092f2b", 0.22);
  const coral = material("#ef986b", 0.56);
  const blush = material("#d4b6a3", 0.65);
  const glassesMaterial = material("#c4a683", 0.28);
  glassesMaterial.metalness = 0.56;
  const lightMint = material("#a7f5db", 0.26);
  lightMint.emissive.set("#62dabb");
  lightMint.emissiveIntensity = 0.45;
  const jointMaterial = material("#d6e9df", 0.35);
  jointMaterial.metalness = 0.15;
  const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  resources.add(shine);
  const sphereGeometry = new THREE.SphereGeometry(1, 28, 20);
  resources.add(sphereGeometry);

  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    resources.add(geometry);
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function sphere(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const m = mesh(sphereGeometry, mat, parent, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }
  function roundedGeometry(w: number, h: number, d: number, r = 0.14, bevel = 0.035) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ExtrudeGeometry(s, {
      steps: 1,
      depth: d,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.translate(0, 0, -d / 2);
    g.computeVertexNormals();
    return g;
  }
  function tube(parent: THREE.Object3D, mat: THREE.Material, points: Punto[], r = 0.025) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 24, r, 8, false), mat, parent);
  }

  // Tapas, páginas y lomo.
  mesh(roundedGeometry(2.05, 2.64, 0.105, 0.19), teal, book, 0, 0, 0.35);
  mesh(roundedGeometry(2.05, 2.64, 0.105, 0.19), teal, book, 0, 0, -0.35);
  mesh(roundedGeometry(1.93, 2.47, 0.47, 0.12, 0.015), paper, book, 0.015, 0, 0);
  mesh(roundedGeometry(0.21, 2.6, 0.68, 0.095, 0.035), spineMat, book, -0.955, 0, 0);
  // Hojas visibles en el canto, arriba y abajo.
  for (let i = 0; i < 11; i++) {
    const z = -0.21 + i * 0.042;
    mesh(new THREE.BoxGeometry(0.004, 2.19, 0.007), pageLine, book, 0.998, 0, z);
    mesh(new THREE.BoxGeometry(1.61, 0.004, 0.007), pageLine, book, 0.04, 1.253, z);
    mesh(new THREE.BoxGeometry(1.61, 0.004, 0.007), pageLine, book, 0.04, -1.253, z);
  }
  // Marcador que se dobla sobre el borde y termina en punta sobre la tapa.
  const ribbonShape = new THREE.Shape();
  ribbonShape.moveTo(-0.105, 0.23);
  ribbonShape.lineTo(0.105, 0.23);
  ribbonShape.lineTo(0.105, -0.28);
  ribbonShape.lineTo(0, -0.19);
  ribbonShape.lineTo(-0.105, -0.28);
  ribbonShape.closePath();
  mesh(
    new THREE.ExtrudeGeometry(ribbonShape, { depth: 0.024, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.007, bevelSegments: 2 }),
    coral,
    book,
    0.55,
    1.13,
    0.429,
  );
  mesh(roundedGeometry(0.21, 0.025, 0.19, 0.01, 0.006), coral, book, 0.55, 1.365, 0.35);

  // Ojos.
  const eyeGroups: THREE.Group[] = [];
  const lookGroups: THREE.Group[] = [];
  [-0.37, 0.39].forEach((x) => {
    const eye = new THREE.Group();
    eye.position.set(x, 0.35, 0.455);
    book.add(eye);
    eyeGroups.push(eye);
    sphere(eye, cream, 0, 0, 0, 0.3, 0.38, 0.145);
    const look = new THREE.Group();
    eye.add(look);
    lookGroups.push(look);
    sphere(look, ink, 0, -0.015, 0.136, 0.115, 0.164, 0.06);
    sphere(look, shine, -0.035, 0.046, 0.19, 0.035, 0.043, 0.014);
    sphere(look, shine, 0.033, -0.065, 0.185, 0.014, 0.017, 0.009);
    const side = x < 0 ? -1 : 1;
    tube(eye, spineMat, [[side * 0.2, 0.26, 0.1], [side * 0.27, 0.31, 0.1], [side * 0.29, 0.35, 0.1]], 0.014);
  });
  // Lentes de montura fina color champaña, con las esquinas externas apenas
  // levantadas; no tapan los ojos.
  [-0.37, 0.39].forEach((x) => {
    const side = x < 0 ? -1 : 1;
    const points: [number, number][] = [
      [-0.31, 0], [-0.29, 0.28], [-0.12, 0.39], [0.15, 0.37], [0.32, 0.26],
      [0.31, -0.17], [0.17, -0.32], [-0.15, -0.32], [-0.31, -0.16], [-0.31, 0],
    ];
    const framePoints = points.map(([dx, dy]): Punto => [x + dx, 0.35 + dy + (dx * side > 0.2 && dy > 0.15 ? 0.055 : 0), 0.702]);
    tube(book, glassesMaterial, framePoints, 0.025);
    tube(book, cream, [[x + side * 0.22, 0.69, 0.714], [x + side * 0.29, 0.65, 0.714]], 0.008);
  });
  tube(book, glassesMaterial, [[-0.05, 0.4, 0.704], [0.01, 0.45, 0.716], [0.07, 0.4, 0.704]], 0.02);
  [-1, 1].forEach((side) =>
    tube(book, glassesMaterial, [[side * 0.71, 0.46, 0.7], [side * 0.94, 0.44, 0.45], [side * 1.025, 0.4, 0.08]], 0.022),
  );
  const brows = [
    tube(book, spineMat, [[-0.58, 0.85, 0.444], [-0.43, 0.91, 0.454], [-0.25, 0.86, 0.445]], 0.019),
    tube(book, spineMat, [[0.23, 0.86, 0.444], [0.39, 0.91, 0.454], [0.55, 0.85, 0.445]], 0.019),
  ];
  // Boca: línea en reposo y sonrisa abierta al saludar.
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.29, 0.46);
  book.add(mouth);
  const smileLine = tube(mouth, cream, [[-0.16, 0.01, 0], [-0.1, -0.06, 0.02], [0, -0.08, 0.03], [0.1, -0.06, 0.02], [0.16, 0.01, 0]], 0.023);
  const happyMouth = new THREE.Group();
  mouth.add(happyMouth);
  const smileShape = new THREE.Shape();
  smileShape.moveTo(-0.19, 0);
  smileShape.quadraticCurveTo(0, -0.035, 0.19, 0);
  smileShape.bezierCurveTo(0.16, -0.27, -0.16, -0.27, -0.19, 0);
  mesh(
    new THREE.ExtrudeGeometry(smileShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.007, bevelSegments: 2, curveSegments: 16 }),
    ink,
    happyMouth,
  );
  tube(happyMouth, cream, [[-0.135, -0.033, 0.024], [0, -0.051, 0.026], [0.135, -0.033, 0.024]], 0.016);
  sphere(happyMouth, coral, 0, -0.16, 0.026, 0.078, 0.037, 0.014);
  happyMouth.visible = false;
  sphere(book, blush, -0.61, -0.15, 0.451, 0.12, 0.044, 0.012);
  sphere(book, blush, 0.63, -0.15, 0.451, 0.12, 0.044, 0.012);
  // Parte baja de la tapa limpia; se conservan el LED de arriba y la luz del borde.
  mesh(roundedGeometry(0.28, 0.037, 0.012, 0.016, 0.004), lightMint, book, -0.62, 1.11, 0.431);
  mesh(roundedGeometry(0.55, 0.023, 0.13, 0.01, 0.006), lightMint, book, 0, -1.36, 0.01);
  // Detalles en relieve de la contratapa, visibles al girarla.
  tube(book, spineMat, [[-0.44, 0.1, -0.44], [0.42, 0.1, -0.44]], 0.019);
  tube(book, spineMat, [[-0.44, -0.04, -0.44], [0.2, -0.04, -0.44]], 0.014);
  tube(book, spineMat, [[-0.44, -0.17, -0.44], [0.32, -0.17, -0.44]], 0.014);

  // Guante de un solo volumen: tres dedos redondeados y un pulgar.
  const gloveShape = new THREE.Shape();
  gloveShape.moveTo(-0.065, 0);
  gloveShape.quadraticCurveTo(-0.14, 0.025, -0.15, 0.13);
  gloveShape.lineTo(-0.15, 0.37);
  gloveShape.bezierCurveTo(-0.15, 0.435, -0.065, 0.45, -0.064, 0.375);
  gloveShape.lineTo(-0.061, 0.265);
  gloveShape.quadraticCurveTo(-0.055, 0.25, -0.046, 0.267);
  gloveShape.lineTo(-0.035, 0.448);
  gloveShape.bezierCurveTo(-0.031, 0.513, 0.055, 0.511, 0.053, 0.448);
  gloveShape.lineTo(0.052, 0.271);
  gloveShape.quadraticCurveTo(0.06, 0.253, 0.071, 0.275);
  gloveShape.lineTo(0.091, 0.385);
  gloveShape.bezierCurveTo(0.104, 0.451, 0.18, 0.428, 0.163, 0.361);
  gloveShape.lineTo(0.14, 0.194);
  gloveShape.quadraticCurveTo(0.14, 0.16, 0.165, 0.181);
  gloveShape.lineTo(0.215, 0.235);
  gloveShape.bezierCurveTo(0.257, 0.279, 0.313, 0.223, 0.266, 0.176);
  gloveShape.lineTo(0.166, 0.056);
  gloveShape.quadraticCurveTo(0.105, -0.007, 0.065, 0);
  gloveShape.closePath();
  const gloveGeometry = new THREE.ExtrudeGeometry(gloveShape, {
    depth: 0.105,
    bevelEnabled: true,
    bevelThickness: 0.031,
    bevelSize: 0.007,
    bevelSegments: 4,
    curveSegments: 12,
  });
  gloveGeometry.translate(0, 0, -0.0525);
  gloveGeometry.computeVertexNormals();

  // Brazos: hombro, codo y muñeca.
  const arms: { arm: THREE.Group; elbow: THREE.Group; wrist: THREE.Group }[] = [];
  function capsule(parent: THREE.Object3D, mat: THREE.Material, length: number, radius: number, x: number) {
    const segment = mesh(new THREE.CapsuleGeometry(radius, length - 2 * radius, 5, 14), mat, parent, x, 0, 0);
    segment.rotation.z = -Math.PI / 2;
    return segment;
  }
  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 1.025, -0.03, 0.045);
    shoulder.scale.x = side;
    book.add(shoulder);
    const arm = new THREE.Group();
    shoulder.add(arm);
    sphere(arm, spineMat, 0, 0, 0, 0.13, 0.13, 0.13);
    capsule(arm, teal, 0.47, 0.078, 0.235);
    const elbow = new THREE.Group();
    elbow.position.x = 0.47;
    arm.add(elbow);
    sphere(elbow, jointMaterial, 0, 0, 0, 0.088, 0.088, 0.09);
    sphere(elbow, lightMint, 0, 0, 0.083, 0.04, 0.04, 0.014);
    capsule(elbow, teal, 0.43, 0.071, 0.215);
    const wrist = new THREE.Group();
    wrist.position.set(0.43, 0, 0.018);
    elbow.add(wrist);
    capsule(wrist, spineMat, 0.155, 0.055, 0).rotation.z = 0;
    mesh(gloveGeometry, cream, wrist, 0, 0.045, 0);
    // Un puño delgado une el guante con el antebrazo.
    mesh(roundedGeometry(0.17, 0.052, 0.13, 0.025, 0.013), jointMaterial, wrist, 0, 0.02, 0);
    arms.push({ arm, elbow, wrist });
  });

  // Sin pies ni plataforma: una sombra suave y un halo fino bajo el libro.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d");
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,.65)");
    gradient.addColorStop(0.45, "rgba(255,255,255,.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    shadowContext.fillStyle = gradient;
    shadowContext.fillRect(0, 0, 128, 128);
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  resources.add(shadowTexture);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: sombra, map: shadowTexture, transparent: true, opacity: 0.3, depthWrite: false });
  resources.add(shadowMaterial);
  const shadow = mesh(new THREE.PlaneGeometry(3.7, 2.5), shadowMaterial, mascot, 0, -1.89, 0);
  shadow.rotation.x = -1.34;
  shadow.castShadow = shadow.receiveShadow = false;
  const hoverMaterial = new THREE.MeshBasicMaterial({ color: "#79ceb2", transparent: true, opacity: 0.3, depthWrite: false });
  resources.add(hoverMaterial);
  const hoverRing = mesh(new THREE.TorusGeometry(0.83, 0.01, 8, 72), hoverMaterial, mascot, 0, -1.83, 0);
  hoverRing.rotation.x = -1.34;
  hoverRing.castShadow = hoverRing.receiveShadow = false;

  // Luces en unidades de píxel, como la fuente.
  scene.add(new THREE.HemisphereLight("#f1fff6", "#779b84", 2.0));
  const key = new THREE.DirectionalLight("#fff2dc", 3.0);
  key.position.set(-300, 500, 500);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -500;
  key.shadow.camera.right = 500;
  key.shadow.camera.top = 500;
  key.shadow.camera.bottom = -500;
  key.shadow.camera.far = 2000;
  key.shadow.normalBias = 0.8;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#d1f9ee", 1.15);
  fill.position.set(400, 100, 300);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#ffffff", 2.5);
  rim.position.set(200, 400, -300);
  scene.add(rim);

  let frame = 0;
  let visible = true;
  let last = 0;
  let time = 0;
  let waveTime = 0;
  let blinkTime = 0;
  let nextBlink = 2.7;
  let disposed = false;
  let contextLost = false;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  let yaw = state.angle;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let lastX = 0;
  // La entrada se omite si ya se vio en esta visita o si el sistema pide menos movimiento.
  let introTime = entradaYaVista || motion.matches ? DURACION_ENTRADA : 0;
  let empezo = false;
  let avisada = false;
  let delante: boolean | null = null;
  let medidas: Medidas = { ancho: 1, alto: 1, size: 150, top: 0, right: 0, bottom: 0, salida: 0 };
  const pointerWorld = new THREE.Vector3();
  const localTarget = new THREE.Vector3();
  const clamp = THREE.MathUtils.clamp;

  function draw() {
    if (!disposed && !contextLost) renderer.render(scene, camera);
  }
  function avisarSiTermino() {
    if (avisada || introTime < DURACION_ENTRADA) return;
    avisada = true;
    zonaToque.style.display = "block";
    onEntradaTerminada();
  }
  // Todo se mide contra la hoja real; un cambio de tamaño no reinicia la entrada.
  function resize() {
    const c = canvas.getBoundingClientRect();
    const h = hoja.getBoundingClientRect();
    medidas = {
      ancho: Math.max(Math.round(c.width), 1),
      alto: Math.max(Math.round(c.height), 1),
      size: tamanoLibIA(h.width),
      top: h.top - c.top,
      right: h.right - c.left,
      bottom: h.bottom - c.top,
      salida: c.right - h.right,
    };
    renderer.setSize(medidas.ancho, medidas.alto, false);
    camera.left = -medidas.ancho / 2;
    camera.right = medidas.ancho / 2;
    camera.top = medidas.alto / 2;
    camera.bottom = -medidas.alto / 2;
    camera.updateProjectionMatrix();
    pose(0);
    draw();
  }
  function pose(dt: number) {
    const reduced = motion.matches;
    const peek = gestoDeVistazo(introTime);
    // Respuesta corta e independiente de los cuadros por segundo: la mirada sigue rápido al cursor.
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 20);
    px += (tx - px) * blend;
    py += (ty - py) * blend;
    yaw += (state.angle - yaw) * blend;
    waveTime = Math.max(0, waveTime - dt);
    const introGreeting = introTime >= 4.1 && introTime < 6.45;
    const elapsed = introGreeting ? ((introTime - 4.1) / 2.35) * DURACION_SALUDO : DURACION_SALUDO - waveTime;
    const greeting =
      waveTime > 0 || introGreeting ? (reduced ? 1 : ease(0.12, 0.66, elapsed) * (1 - ease(2.48, DURACION_SALUDO, elapsed))) : 0;
    const peekHand = peek.hand;
    const waveMotion = reduced ? 0 : Math.sin(Math.max(0, elapsed - 0.64) * Math.PI * 3.6) * greeting;
    const idle = reduced ? 0 : Math.sin(time * 1.8) * options.movement * ease(4.2, 5.0, introTime);
    const anticipation = !reduced && waveTime > 0 && elapsed < 0.25 ? Math.sin((elapsed / 0.25) * Math.PI) : 0;
    const entering = introTime < DURACION_ENTRADA;
    const facing = entering ? mix(-0.18, yaw, ease(4.85, 6.2, introTime)) : yaw;
    rig.rotation.set(
      reduced ? 0 : -py * 0.46 * options.movement,
      facing + (reduced ? 0 : px * 0.82 * options.movement + peek.turn),
      reduced ? 0 : -px * 0.055 * options.movement,
    );
    book.position.y = 0.09 + idle * 0.14 + (reduced ? 0 : greeting * 0.22 - anticipation * 0.065);
    book.rotation.z = reduced
      ? 0
      : Math.sin(time * 1.15) * 0.027 * options.movement * ease(4.2, 5, introTime) + greeting * 0.075 + peek.roll + peek.flutter * 0.018;
    book.rotation.x = reduced ? 0 : -greeting * 0.065 + peek.pitch;
    shadow.scale.setScalar(1 + Math.max(0, book.position.y) * 0.15);
    shadowMaterial.opacity = 0.32 - book.position.y * 0.17;
    hoverRing.scale.setScalar(1 + (reduced ? 0 : Math.sin(time * 1.8) * 0.03) + greeting * 0.1);
    hoverMaterial.opacity = 0.23 + greeting * 0.17;
    lightMint.emissiveIntensity = 0.45 + greeting * 0.48;
    arms.forEach(({ arm, elbow, wrist }, i) => {
      const right = i === 1;
      const raised = right ? Math.max(greeting, peekHand) : 0;
      arm.rotation.z = -0.62 + idle * 0.045 + (right ? 1.51 * raised + peek.flutter * 0.025 : -greeting * 0.16 - peek.second * 0.1);
      elbow.rotation.z =
        -0.67 + (right ? 1.13 * Math.max(greeting, peek.elbow) + waveMotion * 0.09 + peek.flutter * 0.075 : greeting * 0.22 + peek.second * 0.15);
      wrist.rotation.z = -Math.PI / 2 + (right ? 0.22 * raised + waveMotion * 0.43 + peek.flutter * 0.32 : idle * 0.035);
      wrist.rotation.y = right ? -0.12 * raised + peek.flutter * 0.045 : 0;
    });
    brows.forEach((brow, i) => (brow.position.y = Math.max(greeting, peekHand) * (i === 1 ? 0.065 : 0.045) + peek.curiosity * (i === 1 ? 0.08 : 0.015)));
    smileLine.visible = greeting < 0.15;
    happyMouth.visible = greeting >= 0.15;
    mouth.scale.set(1 + greeting * 0.16, 1, 1);

    // Recorrido: separado de la pose interna, así flotar y saludar no pisan la trayectoria.
    const { ancho, alto, size } = medidas;
    const lugar = lugarEnRecorrido(introTime, medidas, peek);
    if (lugar.delante !== delante) {
      canvas.style.zIndex = lugar.delante ? "20" : "0";
      delante = lugar.delante;
    }
    mascot.visible = true;
    mascot.position.set(lugar.x - ancho / 2, alto / 2 - lugar.y, 0);
    mascot.scale.setScalar(size / 2.8);
    shadow.visible = hoverRing.visible = lugar.delante;
    shadowMaterial.opacity *= lugar.asentado;
    hoverMaterial.opacity *= lugar.asentado;
    mascot.updateMatrixWorld(true);
    // El asa para tocar y arrastrar sigue a LibIA (prueba de posición de la fuente: 0,76·size × 0,65·size).
    zonaToque.style.left = `${lugar.x - size * 0.76}px`;
    zonaToque.style.top = `${lugar.y - size * 0.65}px`;
    zonaToque.style.width = `${size * 1.52}px`;
    zonaToque.style.height = `${size * 1.3}px`;

    pointerWorld.set(mascot.position.x + px * 520, mascot.position.y + py * 360 + 20, 400);
    localTarget.copy(pointerWorld);
    book.worldToLocal(localTarget);
    lookGroups.forEach((look, i) => {
      const eye = eyeGroups[i];
      const dx = localTarget.x - eye.position.x;
      const dy = localTarget.y - eye.position.y;
      const dz = localTarget.z - eye.position.z;
      look.rotation.y = mix(clamp(Math.atan2(dx, Math.max(dz, 0.6)), -0.36, 0.36), peek.gazeX, peek.gazeWeight);
      look.rotation.x = mix(clamp(-Math.atan2(dy, Math.max(dz, 0.6)), -0.26, 0.26), peek.gazeY, peek.gazeWeight);
    });
    let openness = 1;
    if (!reduced && entering) {
      // Parpadea al esconderse y en la segunda subida; el saludo con la mano se ve con ojos abiertos.
      openness = 1 - 0.96 * Math.max(pulse(1.35, 1.56, introTime), pulse(2.14, 2.35, introTime));
      blinkTime = 0;
      nextBlink = time + 2.7;
    } else if (!reduced) {
      if (time > nextBlink && !blinkTime) blinkTime = 0.001;
      if (blinkTime) {
        blinkTime += dt;
        openness = blinkTime < 0.09 ? 1 - (blinkTime / 0.09) * 0.96 : 0.04 + ((blinkTime - 0.09) / 0.13) * 0.96;
        if (blinkTime >= 0.22) {
          blinkTime = 0;
          nextBlink = time + 3.0 + Math.random() * 2;
          openness = 1;
        }
      }
    }
    eyeGroups.forEach((eye) => (eye.scale.y = clamp(openness, 0.04, 1)));
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || contextLost) return;
    if (state.paused || !visible || document.hidden) return;
    // Con la pestaña oculta o en pausa el reloj no corre: al volver sigue desde el mismo punto.
    const dt = last ? Math.min((now - last) / 1000, 0.045) : 1 / 60;
    last = now;
    time += dt;
    if (introTime < DURACION_ENTRADA) empezo = true;
    introTime = Math.min(DURACION_ENTRADA, introTime + dt);
    pose(dt);
    draw();
    avisarSiTermino();
    const unsettled = Math.abs(yaw - state.angle) > 0.001 || Math.abs(px - tx) > 0.001 || Math.abs(py - ty) > 0.001;
    if (!motion.matches || waveTime > 0 || introTime < DURACION_ENTRADA || unsettled) frame = requestAnimationFrame(tick);
  }
  function start() {
    if (!frame && !disposed && !contextLost && !state.paused && visible && !document.hidden) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function wave() {
    // Durante la entrada no: el saludo ya es parte de ella.
    if (disposed || contextLost || introTime < DURACION_ENTRADA) return;
    if (state.paused) {
      state.paused = false;
      onPausa(false);
    }
    waveTime = DURACION_SALUDO;
    pose(0);
    draw();
    start();
  }
  function setPaused(pausa: boolean) {
    state.paused = pausa;
    if (pausa) stop();
    else start();
    draw();
    onPausa(pausa);
  }
  function sobreLibIA(event: PointerEvent) {
    const b = canvas.getBoundingClientRect();
    const x = event.clientX - b.left - medidas.ancho / 2 - mascot.position.x;
    const y = event.clientY - b.top - medidas.alto / 2 + mascot.position.y;
    return Math.abs(x) <= medidas.size * 0.76 && Math.abs(y) <= medidas.size * 0.65;
  }

  // La mirada sigue al cursor en todo el hero (solo después de la entrada).
  function onPointer(event: PointerEvent) {
    if (introTime < DURACION_ENTRADA) return;
    const b = canvas.getBoundingClientRect();
    const reachX = clamp(medidas.size * 0.85, 90, 140);
    const reachY = clamp(medidas.size * 0.75, 80, 125);
    tx = clamp((event.clientX - b.left - medidas.ancho / 2 - mascot.position.x) / reachX, -1, 1);
    ty = clamp(-(event.clientY - b.top - medidas.alto / 2 + mascot.position.y) / reachY, -1, 1);
    if (dragging) {
      const dx = event.clientX - lastX;
      if (Math.abs(event.clientX - startX) > 5) moved = true;
      state.angle += dx * 0.012;
      lastX = event.clientX;
      if (state.paused || motion.matches) {
        yaw = state.angle;
        rig.rotation.y = yaw;
        draw();
      }
    }
    if (!state.paused && motion.matches) {
      pose(0);
      draw();
    }
    start();
  }
  function onDown(event: PointerEvent) {
    if (introTime < DURACION_ENTRADA || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (!sobreLibIA(event)) return;
    dragging = true;
    moved = false;
    startX = lastX = event.clientX;
    zonaToque.setPointerCapture(event.pointerId);
  }
  function onUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    if (zonaToque.hasPointerCapture(event.pointerId)) zonaToque.releasePointerCapture(event.pointerId);
    // Un toque sin arrastrar la hace saludar.
    if (!moved) wave();
  }
  function onCancel() {
    dragging = false;
    moved = false;
  }
  function onLeave() {
    if (!dragging) {
      tx = ty = 0;
      start();
    }
  }
  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }
  function onMotion() {
    // Si el sistema pide menos movimiento a mitad de la entrada, termina en la pose final.
    if (motion.matches) introTime = DURACION_ENTRADA;
    avisarSiTermino();
    blinkTime = 0;
    eyeGroups.forEach((e) => (e.scale.y = 1));
    pose(0);
    draw();
    stop();
    start();
  }
  function onContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    stop();
    onFallo();
  }

  zonaMirada.addEventListener("pointermove", onPointer, { passive: true });
  zonaMirada.addEventListener("pointerleave", onLeave);
  zonaToque.addEventListener("pointerdown", onDown);
  zonaToque.addEventListener("pointerup", onUp);
  zonaToque.addEventListener("pointercancel", onCancel);
  hoja.addEventListener("animationend", resize);
  document.addEventListener("visibilitychange", onVisibility);
  motion.addEventListener("change", onMotion);
  canvas.addEventListener("webglcontextlost", onContextLost);
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) start();
      else stop();
    },
    { threshold: 0.01 },
  );
  observer.observe(canvas);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resizeObserver.observe(hoja);

  function destruir() {
    if (disposed) return;
    disposed = true;
    stop();
    observer.disconnect();
    resizeObserver.disconnect();
    zonaMirada.removeEventListener("pointermove", onPointer);
    zonaMirada.removeEventListener("pointerleave", onLeave);
    zonaToque.removeEventListener("pointerdown", onDown);
    zonaToque.removeEventListener("pointerup", onUp);
    zonaToque.removeEventListener("pointercancel", onCancel);
    hoja.removeEventListener("animationend", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    motion.removeEventListener("change", onMotion);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    zonaToque.style.display = "";
    resources.forEach((r) => r.dispose());
    key.shadow.map?.dispose();
    renderer.dispose();
  }

  rig.rotation.y = state.angle;
  resize();
  avisarSiTermino();
  start();

  return { saludar: wave, pausar: setPaused, entradaEmpezada: () => empezo, destruir };
}
