/**
 * Mascota 3D de LibroClaro: un libro teal flotante con ojos que siguen el
 * cursor, parpadeo y un saludo de ~3,1 s.
 *
 * Es el diseño aprobado (fuente: paquete "libroclaro-mascota-3d") portado
 * a TypeScript sin cambiar geometrías, materiales, luces ni trayectorias.
 * Lo único adaptado es el ciclo de vida (lo maneja React), el origen de
 * Three.js (paquete instalado, no CDN) y la sombra: sobre el fondo oscuro
 * del hero una sombra oscura no se ve, así que se pinta como un brillo
 * claro. No hay fondo: el canvas es transparente y deja ver el del hero.
 *
 * Este módulo se importa de forma diferida desde MascotaHero, así Three.js
 * viaja en su propio paquete y no retrasa el primer pintado de la página.
 */
import * as THREE from "three";

export type Mascota = {
  saludar: () => void;
  pausar: (pausa: boolean) => void;
  destruir: () => void;
};

type Opciones = {
  canvas: HTMLCanvasElement;
  /** Área de la mascota: aquí se arrastra para girarla. */
  escenario: HTMLElement;
  /** Zona donde la mirada sigue al cursor (el hero completo). */
  zonaMirada: HTMLElement;
  /** Color de la sombra bajo el libro; en fondo oscuro, uno claro. */
  sombra?: string;
  onPausa?: (pausada: boolean) => void;
  /** WebGL se perdió a mitad de camino: el componente debe ocultarse. */
  onFallo?: () => void;
};

/** Lanza si WebGL no está disponible; el componente lo atrapa y se oculta. */
export function crearMascota({ canvas, escenario, zonaMirada, sombra = "#3d7565", onPausa, onFallo }: Opciones): Mascota {
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
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 45);
  const rig = new THREE.Group();
  scene.add(rig);
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
  const mint = material("#7fc8ac", 0.65);
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
  function tube(parent: THREE.Object3D, mat: THREE.Material, points: [number, number, number][], r = 0.025) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 24, r, 8, false), mat, parent);
  }

  mesh(roundedGeometry(2.05, 2.64, 0.105, 0.19), teal, book, 0, 0, 0.35);
  mesh(roundedGeometry(2.05, 2.64, 0.105, 0.19), teal, book, 0, 0, -0.35);
  mesh(roundedGeometry(1.93, 2.47, 0.47, 0.12, 0.015), paper, book, 0.015, 0, 0);
  mesh(roundedGeometry(0.21, 2.6, 0.68, 0.095, 0.035), spineMat, book, -0.955, 0, 0);
  // Hojas marcadas en el canto, arriba y abajo.
  for (let i = 0; i < 11; i++) {
    const z = -0.21 + i * 0.042;
    mesh(new THREE.BoxGeometry(0.004, 2.19, 0.007), pageLine, book, 0.998, 0, z);
    mesh(new THREE.BoxGeometry(1.61, 0.004, 0.007), pageLine, book, 0.04, 1.253, z);
    mesh(new THREE.BoxGeometry(1.61, 0.004, 0.007), pageLine, book, 0.04, -1.253, z);
  }
  // El marcador se dobla por arriba y termina en punta sobre la tapa.
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
  });
  const brows = [
    tube(book, spineMat, [[-0.57, 0.83, 0.444], [-0.43, 0.87, 0.454], [-0.26, 0.85, 0.445]], 0.025),
    tube(book, spineMat, [[0.23, 0.85, 0.444], [0.39, 0.87, 0.454], [0.54, 0.83, 0.445]], 0.025),
  ];
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
  sphere(book, mint, -0.61, -0.15, 0.451, 0.135, 0.052, 0.012);
  sphere(book, mint, 0.63, -0.15, 0.451, 0.135, 0.052, 0.012);
  // Trazos finos en la tapa: siguen pareciendo un libro.
  tube(book, mint, [[-0.74, -0.82, 0.446], [-0.54, -0.82, 0.446], [-0.43, -0.97, 0.446], [0.08, -0.97, 0.446]], 0.012);
  tube(book, mint, [[0.34, -0.76, 0.446], [0.55, -0.76, 0.446], [0.7, -0.61, 0.446]], 0.012);
  (
    [
      [-0.74, -0.82],
      [0.08, -0.97],
      [0.34, -0.76],
      [0.7, -0.61],
    ] as const
  ).forEach(([x, y]) => sphere(book, lightMint, x, y, 0.45, 0.025, 0.025, 0.012));
  mesh(roundedGeometry(0.28, 0.037, 0.012, 0.016, 0.004), lightMint, book, -0.62, 1.11, 0.431);
  mesh(roundedGeometry(0.55, 0.023, 0.13, 0.01, 0.006), lightMint, book, 0, -1.36, 0.01);
  // Relieves de la contratapa, visibles al girarlo.
  tube(book, spineMat, [[-0.44, 0.1, -0.44], [0.42, 0.1, -0.44]], 0.019);
  tube(book, spineMat, [[-0.44, -0.04, -0.44], [0.2, -0.04, -0.44]], 0.014);
  tube(book, spineMat, [[-0.44, -0.17, -0.44], [0.32, -0.17, -0.44]], 0.014);

  // Guante de contorno continuo: tres dedos redondeados y un pulgar.
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
    // Un puño angosto une el guante al antebrazo.
    mesh(roundedGeometry(0.17, 0.052, 0.13, 0.025, 0.013), jointMaterial, wrist, 0, 0.02, 0);
    arms.push({ arm, elbow, wrist });
  });

  // Sin pies ni plataforma: sombra suave en el piso y un anillo de luz.
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
  const shadow = mesh(new THREE.PlaneGeometry(3.7, 2.5), shadowMaterial, scene, 0, -1.89, 0);
  shadow.rotation.x = -Math.PI / 2;
  shadow.castShadow = shadow.receiveShadow = false;
  const hoverMaterial = new THREE.MeshBasicMaterial({ color: "#79ceb2", transparent: true, opacity: 0.3, depthWrite: false });
  resources.add(hoverMaterial);
  const hoverRing = mesh(new THREE.TorusGeometry(0.83, 0.01, 8, 72), hoverMaterial, scene, 0, -1.83, 0);
  hoverRing.rotation.x = -Math.PI / 2;
  hoverRing.castShadow = hoverRing.receiveShadow = false;

  const hemi = new THREE.HemisphereLight("#f1fff6", "#779b84", 2.0);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#fff2dc", 3.0);
  key.position.set(-3, 5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -3;
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#d1f9ee", 1.15);
  fill.position.set(4, 1, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#ffffff", 2.5);
  rim.position.set(2, 4, -3);
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
  const pointerWorld = new THREE.Vector3();
  const localTarget = new THREE.Vector3();
  const clamp = THREE.MathUtils.clamp;
  const ease = (start: number, end: number, value: number) => {
    const p = clamp((value - start) / (end - start), 0, 1);
    return p * p * (3 - 2 * p);
  };
  const waveDuration = 3.1;

  function draw() {
    if (!disposed && !contextLost) renderer.render(scene, camera);
  }
  function resize() {
    const w = Math.max(escenario.clientWidth, 1);
    const h = Math.max(escenario.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0.55, Math.max(7.7, 6.8 / camera.aspect));
    camera.lookAt(0, -0.1, 0);
    camera.updateProjectionMatrix();
    draw();
  }
  function pose(dt: number) {
    const reduced = motion.matches;
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 8);
    px += (tx - px) * blend;
    py += (ty - py) * blend;
    yaw += (state.angle - yaw) * blend;
    waveTime = Math.max(0, waveTime - dt);
    const elapsed = waveDuration - waveTime;
    const greeting = waveTime > 0 ? (reduced ? 1 : ease(0.12, 0.66, elapsed) * (1 - ease(2.48, waveDuration, elapsed))) : 0;
    const waveMotion = reduced ? 0 : Math.sin(Math.max(0, elapsed - 0.64) * Math.PI * 3.6) * greeting;
    const idle = reduced ? 0 : Math.sin(time * 1.8) * options.movement;
    const anticipation = !reduced && waveTime > 0 && elapsed < 0.25 ? Math.sin((elapsed / 0.25) * Math.PI) : 0;
    rig.rotation.set(
      reduced ? 0 : -py * 0.09 * options.movement,
      yaw + (reduced ? 0 : px * 0.13 * options.movement),
      reduced ? 0 : -px * 0.035 * options.movement,
    );
    book.position.y = 0.09 + idle * 0.14 + (reduced ? 0 : greeting * 0.22 - anticipation * 0.065);
    book.rotation.z = reduced ? 0 : Math.sin(time * 1.15) * 0.027 * options.movement + greeting * 0.075;
    book.rotation.x = reduced ? 0 : -greeting * 0.065;
    shadow.scale.setScalar(1 + Math.max(0, book.position.y) * 0.15);
    shadowMaterial.opacity = 0.32 - book.position.y * 0.17;
    hoverRing.scale.setScalar(1 + (reduced ? 0 : Math.sin(time * 1.8) * 0.03) + greeting * 0.1);
    hoverMaterial.opacity = 0.23 + greeting * 0.17;
    lightMint.emissiveIntensity = 0.45 + greeting * 0.48;
    arms.forEach(({ arm, elbow, wrist }, i) => {
      const right = i === 1;
      const raised = right ? greeting : 0;
      arm.rotation.z = -0.62 + idle * 0.045 + (right ? 1.51 * raised : -greeting * 0.16);
      elbow.rotation.z = -0.67 + (right ? 1.13 * raised + waveMotion * 0.09 : greeting * 0.22);
      wrist.rotation.z = -Math.PI / 2 + (right ? 0.22 * raised + waveMotion * 0.43 : idle * 0.035);
      wrist.rotation.y = right ? -0.12 * raised : 0;
    });
    brows.forEach((brow, i) => (brow.position.y = greeting * (i === 1 ? 0.065 : 0.045)));
    smileLine.visible = greeting < 0.15;
    happyMouth.visible = greeting >= 0.15;
    mouth.scale.set(1 + greeting * 0.16, 1, 1);
    rig.updateMatrixWorld(true);
    pointerWorld.set(px * 4, py * 2.8 + 0.35, 6);
    localTarget.copy(pointerWorld);
    book.worldToLocal(localTarget);
    lookGroups.forEach((look, i) => {
      const eye = eyeGroups[i];
      const dx = localTarget.x - eye.position.x;
      const dy = localTarget.y - eye.position.y;
      const dz = localTarget.z - eye.position.z;
      look.rotation.y = clamp(Math.atan2(dx, Math.max(dz, 0.6)), -0.26, 0.26);
      look.rotation.x = clamp(-Math.atan2(dy, Math.max(dz, 0.6)), -0.19, 0.19);
    });
    let openness = 1;
    if (!reduced) {
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
    const dt = last ? Math.min((now - last) / 1000, 0.045) : 1 / 60;
    last = now;
    time += dt;
    pose(dt);
    draw();
    const unsettled = Math.abs(yaw - state.angle) > 0.001 || Math.abs(px - tx) > 0.001 || Math.abs(py - ty) > 0.001;
    if (!motion.matches || waveTime > 0 || unsettled) frame = requestAnimationFrame(tick);
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
    if (disposed || contextLost) return;
    if (state.paused) {
      state.paused = false;
      onPausa?.(false);
    }
    waveTime = waveDuration;
    pose(0);
    draw();
    start();
  }
  function setPaused(pausa: boolean) {
    state.paused = pausa;
    if (pausa) stop();
    else start();
    draw();
    onPausa?.(pausa);
  }

  // La mirada sigue al cursor en todo el hero; el giro, solo sobre la mascota.
  function onPointer(event: PointerEvent) {
    const bounds = escenario.getBoundingClientRect();
    tx = clamp((event.clientX - bounds.left - bounds.width / 2) / (bounds.width * 0.4), -1, 1);
    ty = clamp(-(event.clientY - bounds.top - bounds.height * 0.47) / (bounds.height * 0.4), -1, 1);
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
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    moved = false;
    startX = lastX = event.clientX;
    escenario.setPointerCapture(event.pointerId);
  }
  function onUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    if (escenario.hasPointerCapture(event.pointerId)) escenario.releasePointerCapture(event.pointerId);
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
    onFallo?.();
  }

  zonaMirada.addEventListener("pointermove", onPointer, { passive: true });
  zonaMirada.addEventListener("pointerleave", onLeave);
  escenario.addEventListener("pointerdown", onDown);
  escenario.addEventListener("pointerup", onUp);
  escenario.addEventListener("pointercancel", onCancel);
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
  observer.observe(escenario);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(escenario);

  function destruir() {
    if (disposed) return;
    disposed = true;
    stop();
    observer.disconnect();
    resizeObserver.disconnect();
    zonaMirada.removeEventListener("pointermove", onPointer);
    zonaMirada.removeEventListener("pointerleave", onLeave);
    escenario.removeEventListener("pointerdown", onDown);
    escenario.removeEventListener("pointerup", onUp);
    escenario.removeEventListener("pointercancel", onCancel);
    document.removeEventListener("visibilitychange", onVisibility);
    motion.removeEventListener("change", onMotion);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    resources.forEach((r) => r.dispose());
    key.shadow.map?.dispose();
    renderer.dispose();
  }

  rig.rotation.y = state.angle;
  resize();
  pose(0);
  draw();
  start();

  return { saludar: wave, pausar: setPaused, destruir };
}
