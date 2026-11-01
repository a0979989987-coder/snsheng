// 背景：午後的玻璃攝影棚。
// 一打開：窗光裡的金塵旋成一團 → 凝成一排玻璃 K 棒 → 整排往下壓、停一下、發抖 → 最後幾根一格衝到頂（金光掃過、鏡頭推近震一下、塵埃炸開、地上金色波紋）。
// 往下滑：同一排玻璃長高、後面長出玻璃大樓變成城市 → 滑到底城市沉下去、金塵旋回星雲。
// 互動：手指推開塵埃、留下金色光痕、按住會吸過來、點空白處炸開、點頭像再演一次。
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const canvas = document.getElementById("bg");
const flash = document.getElementById("flash");
const sweep = document.getElementById("sweep");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = matchMedia("(max-width: 600px)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (e) {
  document.documentElement.classList.add("no-webgl");
}
if (renderer) start();

function start() {
  // ---------- 小工具 ----------
  let seed = 51;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment(renderer);
  {
    const dark = new THREE.MeshBasicMaterial({ color: 0x15181d });
    const card = (x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(), dark); m.position.set(x, y, z); m.scale.set(sx, sy, sz); studio.add(m); };
    card(-15.4, 11, -2, 0.3, 22, 4.5);   // 左邊一片直的黑卡
    card(14.6, 11, 6, 0.3, 22, 3.5);     // 右邊一片
    card(0, 4.5, -13.8, 18, 1.6, 0.3);   // 後面一條橫的
    card(-3, 2.2, 14.2, 16, 1.2, 0.3);   // 前面低處一條
    const strip = (x, y, z, sx, sy, sz, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.96) })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); studio.add(m); };
    strip(-15.3, 11, 4.2, 0.2, 22, 1.4, 22);   // 左前方一條亮燈
    strip(14.5, 11, -3.5, 0.2, 22, 1.2, 14);   // 右後方一條亮燈
    strip(5, 14, 14.3, 2.2, 10, 0.2, 18);      // 鏡頭後面一條
  }
  scene.environment = pmrem.fromScene(studio, 0.03).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 900);

  // 光從左後上方的窗戶照進來
  const L = new THREE.Vector3(0.5, -0.78, 0.38).normalize();
  const WIN = { x0: -15, x1: 1, z0: 1.5, z1: 10 };   // 窗格光落在地上的範圍

  // ---------- 攝影棚：背景球＋地板 ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime;
      float disc(vec3 d, vec3 c, float r){ float x = distance(d, normalize(c)); return smoothstep(r, r*0.8, x) * (0.75 + 0.25 * smoothstep(r*0.55, r*0.9, x)); }
      void main(){
        float y = vDir.y;
        vec3 top = vec3(0.900, 0.855, 0.780);   // 香檳金
        vec3 mid = vec3(0.940, 0.925, 0.902);
        vec3 low = vec3(0.870, 0.890, 0.920);   // 淡藍
        vec3 col = y > 0.0 ? mix(mid, top, smoothstep(0.02, 0.55, y)) : mix(mid, low, smoothstep(0.0, 0.25, -y));
        // 遠處柔焦光斑
        float b = 0.0;
        b += disc(vDir, vec3(-0.62, 0.20, -0.76), 0.085) * 0.55;
        b += disc(vDir, vec3( 0.52, 0.26, -0.81), 0.065) * 0.50;
        b += disc(vDir, vec3( 0.18, 0.30, -0.94), 0.045) * 0.45;
        b += disc(vDir, vec3(-0.30, 0.08, -0.95), 0.035) * 0.50;
        b += disc(vDir, vec3( 0.78, 0.12, -0.61), 0.055) * 0.40;
        b += disc(vDir, vec3(-0.85, 0.30, -0.45), 0.060) * 0.35;
        col = mix(col, vec3(1.0, 0.94, 0.80), clamp(b, 0.0, 1.0) * (0.85 + 0.15 * sin(uTime * 0.6)));
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  sky.renderOrder = -2;
  scene.add(sky);

  const floorMat = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uShift: { value: 0 }, uWin: { value: new THREE.Vector4(WIN.x0, WIN.x1, WIN.z0, WIN.z1) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      varying vec3 vW; uniform float uTime, uShift; uniform vec4 uWin;
      void main(){
        vec3 base = vec3(0.900, 0.888, 0.866);
        vec3 far = vec3(0.940, 0.925, 0.902);
        float d = length(vW.xz);
        vec3 col = mix(base, far, smoothstep(30.0, 140.0, d));
        // 窗格光：3 欄 × 2 列，邊緣柔一點，慢慢移動
        vec2 q = vec2((vW.x - uWin.x - uShift) / (uWin.y - uWin.x), (vW.z - uWin.z) / (uWin.w - uWin.z));
        q.x += q.y * 0.32;
        float inside = smoothstep(0.0, 0.03, q.x) * smoothstep(1.0, 0.97, q.x) * smoothstep(0.0, 0.04, q.y) * smoothstep(1.0, 0.96, q.y);
        vec2 f = fract(q * vec2(3.0, 2.0));
        float pane = smoothstep(0.05, 0.09, f.x) * smoothstep(0.95, 0.91, f.x) * smoothstep(0.06, 0.11, f.y) * smoothstep(0.94, 0.89, f.y);
        float glow = smoothstep(0.6, 0.0, length((q - 0.5) * vec2(1.0, 1.3))) * 0.35;
        vec3 sun = vec3(1.0, 0.985, 0.950);
        col = mix(col, sun, clamp(inside * pane * 0.97 + glow * 0.35, 0.0, 1.0));
        col *= 0.95 + 0.05 * smoothstep(-6.0, 30.0, -vW.z);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  scene.add(floor);

  // 地上的影子（淡藍色）
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x5d7491, opacity: 0.3 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = 0.01; shadowCatcher.receiveShadow = true;
  shadowCatcher.renderOrder = 2;
  scene.add(shadowCatcher);

  // 光：窗戶的陽光＋環境
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 140;
  sun.shadow.radius = 6; sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xdfe7f1, 0.7));

  // 光束：從窗戶斜斜打下來的三道光
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uA: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uA;
      void main(){
        float side = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
        float along = pow(1.0 - vUv.y, 0.7) * smoothstep(0.0, 0.05, vUv.y);
        gl_FragColor = vec4(1.0, 0.985, 0.94, 0.34 * side * along * uA);
      }`
  });
  const beams = [];
  for (let c = 0; c < 3; c++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(g, beamMat);
    m.frustumCulled = false; m.renderOrder = 5;
    scene.add(m); beams.push(m);
  }
  function placeBeams(shift) {
    const up = L.clone().multiplyScalar(-48);
    const zc = (WIN.z0 + WIN.z1) / 2;
    for (let c = 0; c < 3; c++) {
      const w = (WIN.x1 - WIN.x0) / 3;
      const x0 = WIN.x0 + shift - 0.16 * (WIN.x1 - WIN.x0) + c * w + w * 0.08, x1 = x0 + w * 0.84;
      const p = beams[c].geometry.attributes.position.array;
      p.set([x0, 0.02, zc, x1, 0.02, zc, x1 + up.x, up.y, zc + up.z, x0 + up.x, up.y, zc + up.z]);
      beams[c].geometry.attributes.position.needsUpdate = true;
    }
  }

  // ---------- K 線資料 ----------
  const M = phone ? 13 : 18, SQ = phone ? 9 : 13;
  const DX = 1.24, BW = 0.98, BD = 0.98;
  const candles = [];
  {
    let c = 0;
    const steps = [1.9, 2.5, 2.9, 1.8, 2.3, 1.5];
    for (let k = 0; k < M; k++) {
      const o = c;
      if (k < SQ) {
        const amp = 2.5 * (1 - k / (SQ + 2)) + 0.35;
        c = (k % 2 ? 1 : -1) * amp * (0.6 + 0.4 * rand());
      } else c = o + steps[(k - SQ) % steps.length];
      candles.push({ x: (k - (M - 1) / 2) * DX, o, c, hi: Math.max(o, c) + 0.15 + rand() * 0.45, lo: Math.min(o, c) - 0.15 - rand() * 0.45, up: c >= o });
    }
    const lo = Math.min(...candles.map(k => k.lo));
    candles.forEach(k => { const d = 1.4 - lo; k.o += d; k.c += d; k.hi += d; k.lo += d; });
  }
  const topY = Math.max(...candles.map(k => k.hi));

  // 城市：同一排長高＋後面幾排玻璃大樓
  const towers = [];
  const rows = phone ? 3 : 4, perRow = phone ? 12 : 16;
  for (let r = 1; r <= rows; r++) {
    for (let j = 0; j < perRow; j++) {
      const span = (M - 1) * DX + 6;
      const x = -span / 2 + (j + 0.2 + rand() * 0.6) * (span / perRow);
      towers.push({ x, z: -r * 3.4 - rand() * 1.2, w: 0.9 + rand() * 1.0, d: 0.9 + rand() * 1.1, h: 4 + rand() * 7 + r * 1.8 + 5 * sstep(-span / 2, span / 2, x), t0: 0.12 + 0.45 * (j / perRow) * 0.6 + r * 0.07 + rand() * 0.05 });
    }
  }
  const NB = M + towers.length;

  // ---------- 玻璃 ----------
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02,
    transmission: 1, thickness: 1.8, ior: 1.5,
    clearcoat: 1, clearcoatRoughness: 0.02,
    iridescence: 0.45, iridescenceIOR: 1.25, iridescenceThicknessRange: [180, 620],
    attenuationColor: new THREE.Color(0xbfe0de), attenuationDistance: 1.7,
    envMapIntensity: 1.7, specularIntensity: 1
  });
  // 圓角長方體：直邊導圓，上下是平的，拉高不會變形
  const rr = new THREE.Shape();
  {
    const x = -0.5, y = -0.5, w = 1, h = 1, r = 0.17;
    rr.moveTo(x + r, y); rr.lineTo(x + w - r, y); rr.quadraticCurveTo(x + w, y, x + w, y + r);
    rr.lineTo(x + w, y + h - r); rr.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    rr.lineTo(x + r, y + h); rr.quadraticCurveTo(x, y + h, x, y + h - r);
    rr.lineTo(x, y + r); rr.quadraticCurveTo(x, y, x + r, y);
  }
  const box = new THREE.ExtrudeGeometry(rr, { depth: 1, bevelEnabled: false, curveSegments: 8 });
  box.rotateX(-Math.PI / 2);
  const bodies = new THREE.InstancedMesh(box, glass, NB);
  bodies.castShadow = true; bodies.frustumCulled = false; bodies.renderOrder = 6;
  scene.add(bodies);

  // 倒影：地板下面一份淡淡的
  const mirrorShader = (alpha, useColor) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uA: { value: alpha } },
    defines: useColor ? { MIRROR_COLOR: 1 } : {},
    vertexShader: `varying float vY; varying vec3 vC;
      void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vY = w.y;
        vC = vec3(0.56, 0.63, 0.72);
        #if defined(MIRROR_COLOR) && defined(USE_INSTANCING_COLOR)
          vC = instanceColor;
        #endif
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uA; varying float vY; varying vec3 vC;
      void main(){ float a = uA * smoothstep(-5.0, -0.2, vY); if (a < 0.003) discard; gl_FragColor = vec4(vC, a); }`
  });
  const mirrorMat = mirrorShader(0.11, false);
  const mirror = new THREE.InstancedMesh(box, mirrorMat, NB);
  mirror.frustumCulled = false; mirror.renderOrder = 0;
  scene.add(mirror);

  // 影線：包在玻璃裡的一條細光，畫面上唯一的顏色
  const wickGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 10); wickGeo.translate(0, 0.5, 0);
  const wicks = new THREE.InstancedMesh(wickGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), M);
  wicks.frustumCulled = false;
  for (let k = 0; k < M; k++) wicks.setColorAt(k, new THREE.Color(candles[k].up ? 0x3fb2d4 : 0xee4a7c));
  scene.add(wicks);
  const wickMirror = new THREE.InstancedMesh(wickGeo, mirrorShader(0.3, true), M);
  wickMirror.frustumCulled = false;
  for (let k = 0; k < M; k++) wickMirror.setColorAt(k, new THREE.Color(candles[k].up ? 0x3fb2d4 : 0xee4a7c));
  scene.add(wickMirror);

  // 玻璃的細輪廓（上下圓角框＋四條直邊）
  const RING = [];
  {
    const pts = rr.getPoints(4);   // 圓角長方形的一圈
    for (let i = 0; i < pts.length - 1; i++) RING.push(pts[i].x, -pts[i].y, pts[i + 1].x, -pts[i + 1].y);
  }
  const CORNERS = [[-0.4575, -0.4575], [0.4575, -0.4575], [-0.4575, 0.4575], [0.4575, 0.4575]];
  const OUT_V = (RING.length / 4) * 2 * 2 + CORNERS.length * 2;   // 每棟幾個頂點
  const outPos = new Float32Array(NB * OUT_V * 3);
  const outGeo = new THREE.BufferGeometry();
  outGeo.setAttribute("position", new THREE.BufferAttribute(outPos, 3).setUsage(THREE.DynamicDrawUsage));
  const outMat = new THREE.LineBasicMaterial({ color: 0x6f8598, transparent: true, opacity: 0.32, depthWrite: false });
  const outline = new THREE.LineSegments(outGeo, outMat);
  outline.frustumCulled = false; outline.renderOrder = 7;
  scene.add(outline);
  function setOutline(b, x, z, w, d, y0, y1) {
    let o = b * OUT_V * 3;
    if (y1 - y0 < 0.01) { outPos.fill(0, o, o + OUT_V * 3); return; }
    for (const yy of [y0 + 0.01, y1 - 0.01]) {
      for (let i = 0; i < RING.length; i += 4) {
        outPos[o++] = x + RING[i] * w; outPos[o++] = yy; outPos[o++] = z + RING[i + 1] * d;
        outPos[o++] = x + RING[i + 2] * w; outPos[o++] = yy; outPos[o++] = z + RING[i + 3] * d;
      }
    }
    for (const [cx, cz] of CORNERS) {
      outPos[o++] = x + cx * w; outPos[o++] = y0; outPos[o++] = z + cz * d;
      outPos[o++] = x + cx * w; outPos[o++] = y1; outPos[o++] = z + cz * d;
    }
  }

  // 玻璃把光聚在地上：每根影子中間一小塊亮光
  const causticMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; void main(){ vec2 q = (vUv - 0.5) * 2.0; float r = length(q);
      float a = smoothstep(1.0, 0.0, r); a = a * a * 0.85; gl_FragColor = vec4(1.0, 0.985, 0.93, a); }`
  });
  const causticGeo = new THREE.PlaneGeometry(1, 1); causticGeo.rotateX(-Math.PI / 2);
  const caustics = new THREE.InstancedMesh(causticGeo, causticMat, NB);
  caustics.frustumCulled = false; caustics.renderOrder = 3;
  scene.add(caustics);
  const shadowYaw = Math.atan2(L.x, L.z);

  // 金色細邊，讓玻璃在白底上看得清楚
  const edgePos = new Float32Array(NB * 72);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3).setUsage(THREE.DynamicDrawUsage));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xc3a15a, transparent: true, opacity: 0, depthWrite: false });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  edges.frustumCulled = false; edges.renderOrder = 7;
  scene.add(edges);

  // 突破時地上的金色波紋
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), new THREE.MeshBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  ripple.rotation.x = -Math.PI / 2; ripple.position.y = 0.03; ripple.renderOrder = 3;
  scene.add(ripple);

  // ---------- 金塵 ----------
  const ND = phone ? 480 : 800, NT = 520;     // 塵埃、光痕
  const BASE = new Float32Array(ND * 3); let baseInit = false, replayGlide = 0;
  const D = {
    home: new Float32Array(ND * 3), neb: new Float32Array(ND * 4), bar: new Float32Array(ND * 3), barK: new Int16Array(ND).fill(-1),
    ph: new Float32Array(ND), size: new Float32Array(ND), o: new Float32Array(ND * 3), v: new Float32Array(ND * 3), delay: new Float32Array(ND)
  };
  for (let i = 0; i < ND; i++) {
    D.home.set([(rand() - 0.5) * 50, 0.4 + Math.pow(rand(), 0.8) * 17, -16 + rand() * 26], i * 3);
    const r = 1.5 + Math.pow(rand(), 0.8) * 11, a = (i % 3) * 2.094 + r * 0.35 + (rand() - 0.5) * 0.8;
    D.neb.set([r, a, (rand() - 0.5) * (1.6 - r * 0.05), 0.5 * (6 / (r + 4))], i * 4);
    if (rand() < 0.62) {
      const k = Math.floor(rand() * M);
      D.barK[i] = k;
      D.bar.set([candles[k].x + (rand() - 0.5) * BW, 0, (rand() - 0.5) * BD], i * 3);  // y 之後照 K 棒算
      D.bar[i * 3 + 1] = rand();
    }
    D.ph[i] = rand() * 6.283;
    D.size[i] = rand() < 0.035 ? 2.4 + rand() * 1.8 : 0.5 + rand() * 0.8;   // 少數大顆的當近景光斑
    D.delay[i] = rand() * 0.5;
  }
  const NP = ND + NT;
  const pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), pSize = new Float32Array(NP), pAlpha = new Float32Array(NP);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute("aColor", new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute("aAlpha", new THREE.BufferAttribute(pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 1 } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale;
      varying vec3 vC; varying float vA; varying float vSoft;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, aSize * uScale / -mv.z); vC = aColor; vA = aAlpha; vSoft = clamp((aSize - 1.5) / 2.0, 0.0, 1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vA; varying float vSoft;
      void main(){ float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, mix(0.15, 0.0, vSoft), d) * vA * mix(1.0, 0.35, vSoft);
        if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`
  });
  const dust = new THREE.Points(pGeo, pMat);
  dust.frustumCulled = false; dust.renderOrder = 8;
  scene.add(dust);
  const GOLD = [0.72, 0.56, 0.24], GOLD_LT = [0.86, 0.72, 0.42], SUNNY = [0.98, 0.84, 0.48];
  // 光痕
  const T = { x: new Float32Array(NT), y: new Float32Array(NT), z: new Float32Array(NT), vx: new Float32Array(NT), vy: new Float32Array(NT), vz: new Float32Array(NT), life: new Float32Array(NT), span: new Float32Array(NT).fill(1), big: new Float32Array(NT), n: 0 };
  function spark(x, y, z, vx, vy, vz, span, big) {
    const j = T.n++ % NT;
    T.x[j] = x; T.y[j] = y; T.z[j] = z; T.vx[j] = vx; T.vy[j] = vy; T.vz[j] = vz; T.life[j] = 1; T.span[j] = span; T.big[j] = big;
  }

  // ---------- 時間軸 ----------
  const C = {
    nebEnd: 1.5, condense0: 1.6, condense1: 3.0,
    squeeze0: 3.0, squeeze1: 4.1, pause1: 4.55, burstGap: 0.07, settle: 6.2
  };
  const SC_MIN = 0.55;
  let tI = reduce ? 9 : 0;              // 開場的時間
  let replayAt = -1;
  const appearAt = k => k < SQ ? C.condense0 + 0.12 + (C.condense1 - C.condense0 - 0.4) * (k / SQ) : C.pause1 + C.burstGap * (k - SQ);
  const burstT = C.pause1;
  let fxDone = false;

  function fireBurstFx() {
    if (flash) { flash.style.transition = "none"; flash.style.opacity = "1"; requestAnimationFrame(() => { flash.style.transition = "opacity 1.1s ease-out"; flash.style.opacity = "0"; }); }
    if (sweep) { sweep.classList.remove("go"); void sweep.offsetWidth; sweep.classList.add("go"); }
    // 塵埃炸開
    const bx = candles[SQ].x, by = 3;
    for (let i = 0; i < ND; i++) {
      const i3 = i * 3, dx = D.home[i3] - bx, dy = D.home[i3 + 1] - by, dz = D.home[i3 + 2];
      const dl = Math.hypot(dx, dy, dz) + 1, f = 1.4 / (1 + dl * 0.08);
      D.v[i3] += dx / dl * f; D.v[i3 + 1] += dy / dl * f + 0.2; D.v[i3 + 2] += dz / dl * f;
    }
  }

  // ---------- 鏡頭 ----------
  let W = 1, H = 1, aspect = 1, dist = 40, viewY = 0.3;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.dpr));
    renderer.setSize(W, H, false);
    aspect = W / H;
    camera.aspect = aspect;
    const spanW = (M - 1) * DX + BW;
    const fill = aspect >= 1 ? 0.68 : 0.94;
    dist = Math.max(30, spanW / fill / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * aspect));
    viewY = aspect >= 1 ? 0.36 : 0.27;     // 舞台中心在畫面的高度
    camera.setViewOffset(W, H, 0, (0.5 - viewY) * H, W, H);
    camera.updateProjectionMatrix();
    pMat.uniforms.uScale.value = H * renderer.getPixelRatio() * 0.22 * (dist / 40);
  }
  const quality = { dpr: phone ? 1.6 : 1.5, low: false };

  const target = new THREE.Vector3(), camPos = new THREE.Vector3();
  function orbit(yaw, pitch, d, tx, ty, tz) {
    target.set(tx, ty, tz);
    const cy = Math.cos(pitch);
    camPos.set(tx + Math.sin(yaw) * cy * d, ty + Math.sin(pitch) * d, tz + Math.cos(yaw) * cy * d);
  }

  // ---------- 滑動 ----------
  function scrollS() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    return clamp(scrollY / max, 0, 1);
  }
  const qT = new URLSearchParams(location.search);
  const lockS = qT.has("s") ? parseFloat(qT.get("s")) : null;
  if (qT.has("t")) tI = parseFloat(qT.get("t"));
  const freezeT = qT.has("t");
  let sCur = lockS ?? scrollS();

  // ---------- 互動 ----------
  const ptr = { x: -1e4, y: -1e4, at: -1e9, down: false, downAt: 0, dx: 0, dy: 0, still: 0, holdOn: false };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3();
  function worldAt(x, y, depthPoint) {
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), depthPoint);
    return ray.ray.intersectPlane(plane, hit) ? hit : null;
  }
  let lastTrail = null;
  function spawnTrail(x, y) {
    const from = lastTrail && performance.now() - lastTrail.at < 120 ? lastTrail : { x, y };
    const steps = Math.min(24, Math.max(1, Math.round(Math.hypot(x - from.x, y - from.y) / 5)));
    for (let k = 1; k <= steps; k++) {
      const p = worldAt(lerp(from.x, x, k / steps), lerp(from.y, y, k / steps), target);
      if (!p) continue;
      spark(p.x + (rand() - 0.5) * 0.12, p.y + (rand() - 0.5) * 0.12, p.z, (rand() - 0.5) * 0.3, 0.25 + rand() * 0.3, (rand() - 0.5) * 0.3, 0.9, 1);
    }
    lastTrail = { x, y, at: performance.now() };
  }
  // 點一下：一圈火花往外炸
  function sparkBurst(x, y) {
    const p = worldAt(x, y, target);
    if (!p) return;
    for (let k = 0; k < 44; k++) {
      const a = (k / 44) * 6.283 + rand() * 0.2, sp = 5 + rand() * 4;
      const ca = Math.cos(a) * sp, sa = Math.sin(a) * sp;
      spark(p.x, p.y, p.z, right.x * ca + up.x * sa, right.y * ca + up.y * sa, right.z * ca + up.z * sa, 0.75, 1.3);
    }
  }
  // 按住：火花從四周旋進來
  function sparkVortex(x, y, dt) {
    const p = worldAt(x, y, target);
    if (!p) return;
    const n = Math.max(1, Math.round(dt * 90));
    for (let k = 0; k < n; k++) {
      const a = rand() * 6.283, r = 2.2 + rand() * 1.6;
      const ca = Math.cos(a), sa = Math.sin(a);
      const ox = right.x * ca * r + up.x * sa * r, oy = right.y * ca * r + up.y * sa * r, oz = right.z * ca * r + up.z * sa * r;
      // 往內＋繞圈
      const tx = -ca * 3.2 - sa * 3.6, ty = -sa * 3.2 + ca * 3.6;
      spark(p.x + ox, p.y + oy, p.z + oz, right.x * tx + up.x * ty, right.y * tx + up.y * ty, right.z * tx + up.z * ty, 0.65, 0.9);
    }
  }
  function onMove(x, y) {
    if (Math.hypot(x - ptr.x, y - ptr.y) > 6) { ptr.still = performance.now(); ptr.holdOn = false; }
    ptr.x = x; ptr.y = y; ptr.at = performance.now();
    if (!reduce) spawnTrail(x, y);
  }
  addEventListener("pointermove", e => onMove(e.clientX, e.clientY), { passive: true });
  addEventListener("touchmove", e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });
  addEventListener("pointerdown", e => {
    ptr.down = true; ptr.downAt = ptr.still = performance.now(); ptr.dx = e.clientX; ptr.dy = e.clientY;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.at = performance.now();
  }, { passive: true });
  const endPress = e => {
    const quick = performance.now() - ptr.downAt < 260 && Math.hypot(e.clientX - ptr.dx, e.clientY - ptr.dy) < 10;
    const onUi = e.target && e.target.closest && e.target.closest("a, button, .avatar");
    if (quick && !onUi && !reduce) tapBurst(e.clientX, e.clientY);
    ptr.down = false; ptr.holdOn = false;
  };
  addEventListener("pointerup", endPress, { passive: true });
  addEventListener("pointercancel", () => { ptr.down = false; ptr.holdOn = false; }, { passive: true });

  let tapQueue = null;
  function tapBurst(x, y) { tapQueue = { x, y }; sparkBurst(x, y); }

  // 點頭像再演一次
  const av = document.querySelector(".avatar");
  if (av) av.addEventListener("click", () => { if (!reduce && tI > C.condense1) replayAt = performance.now(); });

  // ---------- 每一格 ----------
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const PM = new THREE.Matrix4(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const boxTop = new Float32Array(NB), boxBot = new Float32Array(NB);   // 每棟現在的上下緣
  let last = performance.now(), clock = 0, slowFrames = 0, frames = 0, shake = 0, push = 0;

  function setEdges(b, x, z, w, d, y0, y1) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    edgePos.set(y1 - y0 < 0.01 ? ZERO72 : [
      x0, y0, z0, x1, y0, z0, x1, y0, z0, x1, y0, z1, x1, y0, z1, x0, y0, z1, x0, y0, z1, x0, y0, z0,
      x0, y1, z0, x1, y1, z0, x1, y1, z0, x1, y1, z1, x1, y1, z1, x0, y1, z1, x0, y1, z1, x0, y1, z0,
      x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0, x1, y0, z1, x1, y1, z1, x0, y0, z1, x0, y1, z1], b * 72);
  }
  const ZERO72 = new Array(72).fill(0);
  const qY = new THREE.Quaternion();
  function setCaustic(b, x, z, w, yMid, h) {
    if (w <= 0.001 || h <= 0.001) { m4.makeScale(0, 0, 0); caustics.setMatrixAt(b, m4); return; }
    const t = yMid / -L.y;
    qY.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, shadowYaw);
    m4.compose(v3.set(x + L.x * t, 0.025, z + L.z * t), qY, s3.set(w * 0.75, 1, Math.min(4, 0.6 + h * 0.55)));
    caustics.setMatrixAt(b, m4);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) clock += dt;
    // 太慢就降畫質
    frames++;
    if (frames > 30 && frames < 200 && dt > 0.034) slowFrames++;
    if (!quality.low && slowFrames > 45) lowerQuality();

    // 重播：先把整排收掉再重來
    let shrink = 1;
    if (replayAt > 0) {
      const e = (now - replayAt) / 450;
      shrink = 1 - easeOut(e);
      if (e >= 1) { replayAt = -1; tI = 0; fxDone = false; shrink = 1; replayGlide = 1.4; }
    }
    if (!reduce && !freezeT && replayAt < 0) tI += dt;
    if (!fxDone && tI >= burstT && tI < burstT + 1) { fxDone = true; if (!reduce) { fireBurstFx(); shake = 1; push = 1; } }
    if (tI < burstT) fxDone = false;

    const sT = lockS ?? scrollS();
    sCur += (sT - sCur) * Math.min(1, dt * 6);
    const s = reduce ? sT : sCur;
    const grow = sstep(0.04, 0.5, s);       // 長成城市
    const melt = sstep(0.62, 0.95, s);      // 城市沉下去、回到星雲

    // 開場的壓縮：整排往下壓（漲壓到底），停一下，發抖
    const sc = lerp(1, SC_MIN, sstep(C.squeeze0, C.squeeze1, tI));
    const tremble = (tI > C.squeeze1 && tI < burstT) ? (tI - C.squeeze1) / (burstT - C.squeeze1) : 0;

    // 窗光慢慢移動
    const shift = Math.sin(clock * 0.05) * 2.2;
    floorMat.uniforms.uShift.value = shift;
    floorMat.uniforms.uTime.value = clock;
    sky.material.uniforms.uTime.value = clock;
    placeBeams(shift);
    beamMat.uniforms.uA.value = 1 - melt * 0.6;

    // ---------- 玻璃 K 棒、大樓 ----------
    for (let k = 0; k < M; k++) {
      const c = candles[k];
      const at = appearAt(k);
      let a = k < SQ ? easeOut((tI - at) / 0.35) : (tI >= at ? 1 : 0);   // 突破那幾根一格出現
      a *= shrink * (1 - sstep(0.62, 0.86, s));
      const jx = tremble * 0.035 * Math.sin(clock * 70 + k);
      let b0 = Math.min(c.o, c.c) * sc, b1 = Math.max(c.o, c.c) * sc;
      if (b1 - b0 < 0.08) b1 = b0 + 0.08;
      // 城市：往下長到地面、往上長高，最高的就是突破那根
      const cityTop = (c.hi * sc) * 1.0 + 2.2 + (k >= SQ ? 2.5 : 0);
      b0 = lerp(b0, 0, grow); b1 = lerp(b1, cityTop, grow);
      const w = BW * lerp(1, 1.25, grow) * (0.3 + 0.7 * a), d = BD * lerp(1, 1.25, grow) * (0.3 + 0.7 * a);
      const h = (b1 - b0) * a;
      const y0 = b0 + (b1 - b0) * (1 - a) * 0.5;
      const on = a > 0.004 ? 1 : 0;
      m4.compose(v3.set(c.x + jx, y0, 0), q4, s3.set(w * on, Math.max(0.0001, h) * on, d * on));
      bodies.setMatrixAt(k, m4);
      m4.compose(v3.set(c.x + jx, -y0, 0), q4, s3.set(w * on, -Math.max(0.0001, h) * on, d * on));
      mirror.setMatrixAt(k, m4);
      setEdges(k, c.x + jx, 0, w, d, y0, y0 + (h > 0.0002 ? h : 0));
      setOutline(k, c.x + jx, 0, w * on, d * on, y0, y0 + (h > 0.0002 && on ? h : 0));
      setCaustic(k, c.x + jx, 0, w * on, y0 + h * 0.5, h * on);
      boxBot[k] = y0; boxTop[k] = y0 + h;
      // 影線：城市時縮成樓頂的一小段光
      const wl0 = lerp(c.lo * sc, b1 - 0.02, grow), wl1 = lerp(c.hi * sc, b1 + 0.5, grow);
      m4.compose(v3.set(c.x + jx, wl0, 0), q4, s3.set(a > 0.01 ? 1 : 0.0001, Math.max(0.0001, (wl1 - wl0) * a), a > 0.01 ? 1 : 0.0001));
      wicks.setMatrixAt(k, m4);
      m4.compose(v3.set(c.x + jx, -wl0, 0), q4, s3.set(a > 0.01 ? 1 : 0.0001, -Math.max(0.0001, (wl1 - wl0) * a), a > 0.01 ? 1 : 0.0001));
      wickMirror.setMatrixAt(k, m4);
    }
    for (let j = 0; j < towers.length; j++) {
      const o = towers[j], b = M + j;
      const g = sstep(o.t0, o.t0 + 0.32, grow) * (1 - sstep(0.62 + o.t0 * 0.1, 0.84, s)) * shrink;
      const h = o.h * g;
      const on = h > 0.01 ? 1 : 0;
      m4.compose(v3.set(o.x, 0, o.z), q4, s3.set(o.w * on, Math.max(0.0001, h) * on, o.d * on));
      bodies.setMatrixAt(b, m4);
      m4.compose(v3.set(o.x, 0, o.z), q4, s3.set(o.w * on, -Math.max(0.0001, h) * on, o.d * on));
      mirror.setMatrixAt(b, m4);
      setEdges(b, o.x, o.z, o.w, o.d, 0, h > 0.001 ? h : 0);
      setOutline(b, o.x, o.z, o.w, o.d, 0, h > 0.01 ? h : 0);
      setCaustic(b, o.x, o.z, o.w * on, h * 0.5, h * on * 0.6);
      boxBot[b] = 0; boxTop[b] = h;
    }
    bodies.instanceMatrix.needsUpdate = true;
    mirror.instanceMatrix.needsUpdate = true;
    wicks.instanceMatrix.needsUpdate = true;
    wickMirror.instanceMatrix.needsUpdate = true;
    edgeGeo.attributes.position.needsUpdate = true;
    outGeo.attributes.position.needsUpdate = true;
    caustics.instanceMatrix.needsUpdate = true;

    // 突破那一下：玻璃一閃
    const since = tI - burstT;
    const glint = since > 0 && since < 1.2 ? Math.exp(-since * 3.2) : 0;
    glass.envMapIntensity = 1.25 + glint * 2.6;
    edges.visible = false;
    ripple.visible = since > 0 && since < 1.6;
    if (ripple.visible) {
      const e = since / 1.6;
      ripple.position.x = candles[SQ].x;
      ripple.scale.setScalar(0.5 + easeOut(e) * 22);
      ripple.material.opacity = (1 - e) * 0.75;
    }

    // ---------- 鏡頭 ----------
    const intro = sstep(0.3, C.condense1, tI);
    let yaw = lerp(0.32, 0.06, intro), pitch = lerp(0.42, 0.13, intro), dd = dist * lerp(1.25, 1, intro);
    let tx = 0, ty = lerp(7.5, 4.8, intro), tz = 0;
    // 城市：拉高、轉到斜前方
    yaw = lerp(yaw, -0.42, grow); pitch = lerp(pitch, 0.36, grow); dd *= lerp(1, 1.18, grow); ty = lerp(ty, 5.5, grow); tz = lerp(tz, -4.5, grow);
    // 滑到底：抬頭看星雲
    yaw = lerp(yaw, -0.15, melt); pitch = lerp(pitch, -0.05, melt); ty = lerp(ty, 9.5, melt); dd *= lerp(1, 0.95, melt);
    // 呼吸
    yaw += Math.sin(clock * 0.13) * 0.035; pitch += Math.sin(clock * 0.11) * 0.015;
    // 突破：推近、震
    push = Math.max(0, push - dt * 1.1); shake = Math.max(0, shake - dt * 2.2);
    dd *= 1 - 0.1 * easeOut(push);
    orbit(yaw, pitch, dd, tx, ty, tz);
    if (shake > 0) { camPos.x += Math.sin(clock * 61) * 0.35 * shake; camPos.y += Math.cos(clock * 53) * 0.3 * shake; }
    camera.position.copy(camPos);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    // 影子跟著光
    sun.target.position.set(0, 0, -2);
    sun.position.copy(sun.target.position).addScaledVector(L, -70);

    // ---------- 金塵 ----------
    PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = PM.elements;
    right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
    const active = now - ptr.at < 900;
    ptr.holdOn = ptr.down && now - ptr.still > 280;
    const R = Math.min(W, H) * 0.2;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(17.5));
    const nebC = [0, lerp(7.5, 15, melt), lerp(0, -5, melt)];
    const nebW = Math.max(1 - sstep(C.nebEnd - 0.2, C.condense1, tI), melt);

    for (let i = 0; i < ND; i++) {
      const i3 = i * 3, i4 = i * 4;
      // 星雲
      const r = D.neb[i4], th = D.neb[i4 + 1] + clock * D.neb[i4 + 3];
      const nx = Math.cos(th) * r, nzz = Math.sin(th) * r, nh = D.neb[i4 + 2];
      const tilt = -0.9, ct = Math.cos(tilt), st = Math.sin(tilt);
      const px0 = nebC[0] + nx, py0 = nebC[1] + nh * ct - nzz * st, pz0 = nebC[2] + nh * st + nzz * ct;
      // 平常飄在光裡
      const hx = D.home[i3] + Math.sin(clock * 0.12 + D.ph[i]) * 0.9;
      const hy = D.home[i3 + 1] + Math.sin(clock * 0.17 + D.ph[i] * 1.3) * 0.7;
      const hz = D.home[i3 + 2] + Math.cos(clock * 0.1 + D.ph[i]) * 0.8;

      let x, y, z, alpha = 1;
      const kk = D.barK[i];
      if (kk >= 0 && tI < C.condense1 + 0.6 && melt < 0.01) {
        // 飛進玻璃裡，然後消失
        const c = candles[kk];
        const fy = lerp(Math.min(c.o, c.c), Math.max(c.o, c.c), D.bar[i3 + 1]);
        const go = sstep(C.nebEnd + D.delay[i] * 0.6, appearAt(kk) + 0.15, tI);
        x = lerp(px0, D.bar[i3], go); y = lerp(py0, fy, go); z = lerp(pz0, D.bar[i3 + 2], go);
        alpha = 1 - sstep(appearAt(kk) + 0.05, appearAt(kk) + 0.3, tI);
      } else {
        const back = kk >= 0 ? sstep(burstT - 0.4, burstT + 1.2, tI) : 1;     // 被吸進去的，突破後從光裡回來
        const w = nebW;
        x = lerp(hx, px0, w); y = lerp(hy, py0, w); z = lerp(hz, pz0, w);
        if (kk >= 0 && melt < 0.01) alpha = back;
      }

      // 位置平滑
      if (!baseInit) { BASE[i3] = x; BASE[i3 + 1] = y; BASE[i3 + 2] = z; }
      const kS = replayGlide > 0 ? Math.min(1, dt * 2.2) : Math.min(1, dt * 12);
      BASE[i3] += (x - BASE[i3]) * kS; BASE[i3 + 1] += (y - BASE[i3 + 1]) * kS; BASE[i3 + 2] += (z - BASE[i3 + 2]) * kS;
      x = BASE[i3]; y = BASE[i3 + 1]; z = BASE[i3 + 2];

      // 手指：推開／吸過去
      let ox = D.o[i3], oy = D.o[i3 + 1], oz = D.o[i3 + 2];
      let vx = D.v[i3], vy = D.v[i3 + 1], vz = D.v[i3 + 2];
      const wx = x + ox, wy = y + oy, wz = z + oz;
      if (active || tapQueue) {
        const ww = e[3] * wx + e[7] * wy + e[11] * wz + e[15];
        if (ww > 0.1) {
          const sx = ((e[0] * wx + e[4] * wy + e[8] * wz + e[12]) / ww * 0.5 + 0.5) * W - (tapQueue ? tapQueue.x : ptr.x);
          const sy = (0.5 - (e[1] * wx + e[5] * wy + e[9] * wz + e[13]) / ww * 0.5) * H - (tapQueue ? tapQueue.y : ptr.y);
          const dpx = Math.hypot(sx, sy);
          const wpp = 2 * ww * tanHalf / H;
          if (tapQueue && dpx < R * 1.4) {
            const f = (1 - dpx / (R * 1.4)) * 26 * wpp / (dpx + 1);
            vx += (right.x * sx - up.x * sy) * f; vy += (right.y * sx - up.y * sy) * f; vz += (right.z * sx - up.z * sy) * f;
          } else if (active && dpx < R && dpx > 0.5) {
            if (ptr.holdOn) {
              // 吸過去、繞著轉
              const f = (1 - dpx / R) * 0.9 * wpp;
              const tx2 = -sx / dpx, ty2 = -sy / dpx;
              vx += (right.x * (tx2 - ty2 * 0.8) - up.x * (ty2 + tx2 * 0.8)) * f;
              vy += (right.y * (tx2 - ty2 * 0.8) - up.y * (ty2 + tx2 * 0.8)) * f;
              vz += (right.z * (tx2 - ty2 * 0.8) - up.z * (ty2 + tx2 * 0.8)) * f;
            } else {
              const f = Math.pow(1 - dpx / R, 2) * 1.6 * wpp / dpx;
              vx += (right.x * sx - up.x * sy) * f; vy += (right.y * sx - up.y * sy) * f; vz += (right.z * sx - up.z * sy) * f;
            }
          }
        }
      }
      // 彈回原位
      vx = vx * 0.9 - ox * 0.012; vy = vy * 0.9 - oy * 0.012; vz = vz * 0.9 - oz * 0.012;
      ox += vx; oy += vy; oz += vz;
      D.o[i3] = ox; D.o[i3 + 1] = oy; D.o[i3 + 2] = oz; D.v[i3] = vx; D.v[i3 + 1] = vy; D.v[i3 + 2] = vz;
      x += ox; y += oy; z += oz;
      if (y < 0.05) y = 0.05 + (0.05 - y) * 0.3;

      pPos[i3] = x; pPos[i3 + 1] = y; pPos[i3 + 2] = z;
      // 在窗光裡的比較亮
      const tt = y / -L.y, fx = x + L.x * tt - shift, fz = z + L.z * tt;
      const qx = (fx - WIN.x0) / (WIN.x1 - WIN.x0) + ((fz - WIN.z0) / (WIN.z1 - WIN.z0)) * 0.32, qz = (fz - WIN.z0) / (WIN.z1 - WIN.z0);
      const inBeam = qx > 0 && qx < 1 && qz > 0 && qz < 1 ? 1 : 0;
      const tw = 0.6 + 0.4 * Math.sin(clock * (1.5 + (i % 7) * 0.2) + D.ph[i]);
      const col = inBeam ? SUNNY : (i % 3 ? GOLD : GOLD_LT);
      pCol[i3] = col[0]; pCol[i3 + 1] = col[1]; pCol[i3 + 2] = col[2];
      pSize[i] = D.size[i] * (inBeam ? 1.5 : 0.9) * (0.85 + 0.25 * tw);
      pAlpha[i] = alpha * (inBeam ? 1 : lerp(0.16, 0.85, nebW)) * tw * (D.size[i] > 2 ? 0.6 : 1);
    }
    tapQueue = null;
    baseInit = true;
    replayGlide = Math.max(0, replayGlide - dt);

    // 光痕
    if (ptr.holdOn && !reduce) sparkVortex(ptr.x, ptr.y, dt);
    const drag = Math.pow(0.06, dt);
    for (let j = 0; j < NT; j++) {
      const p = ND + j, p3 = p * 3;
      if (T.life[j] > 0) {
        T.life[j] = Math.max(0, T.life[j] - dt / T.span[j]);
        T.x[j] += T.vx[j] * dt; T.y[j] += T.vy[j] * dt; T.z[j] += T.vz[j] * dt;
        T.vx[j] *= drag; T.vy[j] *= drag; T.vz[j] *= drag;
      }
      const lf = T.life[j];
      pPos[p3] = T.x[j]; pPos[p3 + 1] = T.y[j]; pPos[p3 + 2] = T.z[j];
      pCol[p3] = 0.96; pCol[p3 + 1] = lerp(0.70, 0.86, lf); pCol[p3 + 2] = lerp(0.30, 0.52, lf);
      pSize[p] = (2.2 * lf + 0.3) * T.big[j];
      pAlpha[p] = Math.pow(lf, 1.3);
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aColor.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function lowerQuality() {
    quality.low = true; quality.dpr = 1;
    renderer.shadowMap.enabled = false;
    sun.castShadow = false;
    glass.transmission = 0; glass.transparent = true; glass.opacity = 0.42; glass.roughness = 0.1;
    glass.needsUpdate = true;
    resize();
  }

  resize();
  addEventListener("resize", resize);
  requestAnimationFrame(frame);
}
