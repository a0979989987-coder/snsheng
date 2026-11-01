// 背景一鏡到底：往下滑就往前演。
// 金色粒子星雲 → 聚成 K 線、越壓越緊 → 突破、金光炸開 → K 線倒平、K 棒長成 3D 城市 → 拉回宇宙。
import * as THREE from "./vendor/three.module.min.js";

const canvas = document.getElementById("bg");
const flash = document.getElementById("flash");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  document.documentElement.classList.add("no-webgl");
}

if (renderer) start();

function start() {
  renderer.setClearColor(0xffffff, 0);

  // ---------- 小工具 ----------
  let seed = 20251101;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const bump = (x, a, b) => (x <= a || x >= b) ? 0 : Math.sin(Math.PI * (x - a) / (b - a));
  const backOut = t => { const s = 1.6; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
  const rgb = hex => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

  // 白金＋淡藍，K 線用加密片那組青藍漲、桃紅跌
  const GOLD_DK = rgb(0x8d712e), GOLD = rgb(0xb8913f), GOLD_LT = rgb(0xd8bc83);
  const BLUE = rgb(0x7fa6d6), BLUE_LT = rgb(0xa9c4e8);
  const UP = rgb(0x52b4d1), DOWN = rgb(0xeb4779);

  const phone = matchMedia("(max-width: 600px)").matches;
  const N = phone ? 3000 : 4000;
  const GROUND = -15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 80, 220);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 800);

  // ---------- K 線：前段越壓越緊，最後 7 根往上噴 ----------
  const M = 34, SQ = 27, SPAN = 46, DX = SPAN / (M - 1), X0 = -SPAN / 2, BW = DX * 0.72;
  const candles = [];
  {
    let c = 0;
    const burst = [3, 4.2, 5.2, 3.4, 4.6, 2.6, 2.2];
    for (let k = 0; k < M; k++) {
      const o = c;
      if (k < SQ) {
        const amp = 8.5 * (1 - k / (SQ + 3)) + 0.5;
        c = (k % 2 ? 1 : -1) * amp * (0.55 + 0.45 * rand());
      } else {
        c = o + burst[k - SQ];
      }
      const hi = Math.max(o, c) + 0.3 + rand() * 1.2;
      const lo = Math.min(o, c) - 0.3 - rand() * 1.2;
      candles.push({ x: X0 + k * DX, o, c, hi, lo, up: c >= o, k });
    }
    let mn = Infinity, mx = -Infinity;
    candles.forEach(k => { mn = Math.min(mn, k.lo); mx = Math.max(mx, k.hi); });
    const off = -(mn + mx) / 2;
    candles.forEach(k => { k.o += off; k.c += off; k.hi += off; k.lo += off; });
  }
  const chartMin = Math.min(...candles.map(k => k.lo));
  const apex = new THREE.Vector3(candles[SQ].x - DX * 0.5, candles[SQ - 1].c, 0);
  // 每根什麼時候出現：壓縮段慢慢長，突破段一口氣
  const revealAt = k => k < SQ ? 1.05 + 0.85 * (k / SQ) : 2.0 + 0.035 * (k - SQ);

  // ---------- 城市：第一排就是那張 K 線，後面幾排是城市 ----------
  const buildings = [];
  candles.forEach(k => {
    buildings.push({ x: k.x, z: 0, w: BW * 1.3, d: 2.2, h: (k.hi - chartMin) * 0.8 + 2, front: true, up: k.up });
  });
  for (let r = 1; r <= 6; r++) {
    const n = 26;
    for (let j = 0; j < n; j++) {
      const x = -32 + (j + rand() * 0.7) * (64 / n);
      buildings.push({
        x, z: -r * 5.2 - rand() * 1.6,
        w: 1.2 + rand() * 1.3, d: 1.4 + rand() * 1.6,
        h: 3 + rand() * 9 + 8 * sstep(-32, 32, x) + r * 1.6,
        front: false
      });
    }
  }
  const B = buildings.length;
  // 由左往右一棟一棟長起來
  buildings.forEach(b => { b.t0 = 2.62 + 0.3 * (b.x + 32) / 64 + (b.front ? 0 : 0.04 + rand() * 0.08); });

  // ---------- 粒子 ----------
  const NC = Math.floor(N * 0.76);                 // 拿來組 K 線的
  const P = {
    neb: new Float32Array(N * 4),                  // 半徑、角度、高度、轉速
    chart: new Float32Array(N * 3),
    cand: new Int16Array(N).fill(-1),
    city: new Float32Array(N * 4),                 // 第幾棟、x 偏移、高度比例、面
    delay: new Float32Array(N),
    hold: new Float32Array(N * 3),                 // 突破前擠在頂點的位置
    off: new Float32Array(N * 3),                  // 手指推開的位移
    cNeb: new Float32Array(N * 3), cChart: new Float32Array(N * 3), cCity: new Float32Array(N * 3),
    sNeb: new Float32Array(N), aNeb: new Float32Array(N)
  };
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // K 線上每根分到多少顆
  const weights = candles.map(k => (Math.abs(k.c - k.o) * BW * 3 + (k.hi - k.lo) * 0.6 + 1) * (k.k >= SQ ? 1.8 : 1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map(w => Math.round(w / wsum * NC));
  let ci = 0, left = counts[0];

  for (let i = 0; i < N; i++) {
    // 星雲：三條旋臂
    const arm = i % 3;
    const r = 2.5 + Math.pow(rand(), 0.85) * 33;
    const a = arm * 2.094 + r * 0.22 + (rand() - 0.5) * 0.9;
    const h = (rand() - 0.5) * (3.2 - r * 0.06);
    P.neb.set([r, a, h, 0.14 * (10 / (r + 6))], i * 4);
    const core = 1 - sstep(3, 16, r);
    let col = rand() < 0.5 ? mixc(GOLD_DK, GOLD, rand()) : mixc(GOLD, GOLD_LT, rand());
    if (r > 14 && rand() < 0.42) col = mixc(BLUE, BLUE_LT, rand());
    P.cNeb.set(col, i * 3);
    P.sNeb[i] = 0.35 + rand() * 0.6 + core * 0.7;
    P.aNeb[i] = 0.5 + rand() * 0.45;

    // K 線
    if (i < NC) {
      while (left <= 0 && ci < M - 1) { ci++; left = counts[ci]; }
      left--;
      const k = candles[ci];
      P.cand[i] = ci;
      let x, y;
      const bodyH = Math.abs(k.c - k.o);
      if (rand() < 0.8) {
        x = k.x + (rand() - 0.5) * BW * (k.k >= SQ ? 1.25 : 1);
        y = lerp(Math.min(k.o, k.c), Math.max(k.o, k.c), rand());
        if (bodyH < 0.25) y = k.c + (rand() - 0.5) * 0.25;
      } else {
        x = k.x + (rand() - 0.5) * 0.1;
        y = lerp(k.lo, k.hi, rand());
      }
      P.chart.set([x, y, (rand() - 0.5) * 0.9], i * 3);
      P.cChart.set(k.up ? mixc(UP, [0.2, 0.5, 0.6], rand() * 0.3) : mixc(DOWN, [0.6, 0.2, 0.35], rand() * 0.3), i * 3);
    } else {
      // 其他的當背景金粉
      P.chart.set([(rand() - 0.5) * 90, (rand() - 0.5) * 56, -8 - rand() * 30], i * 3);
      P.cChart.set(rand() < 0.6 ? mixc(GOLD, GOLD_LT, rand()) : mixc(BLUE, BLUE_LT, rand()), i * 3);
    }
    // 突破前全部擠在頂點附近
    const u = rand() * 6.283, v = Math.acos(2 * rand() - 1), rr = Math.cbrt(rand());
    P.hold.set([Math.sin(v) * Math.cos(u) * rr, Math.sin(v) * Math.sin(u) * rr, Math.cos(v) * rr], i * 3);

    // 城市：窗戶的燈
    const b = Math.floor(rand() * B);
    P.city.set([b, rand() - 0.5, rand(), rand() < 0.82 ? 0 : 1], i * 4);
    P.cCity.set(rand() < 0.55 ? mixc(GOLD, GOLD_LT, rand()) : mixc(BLUE, BLUE_LT, rand()), i * 3);

    P.delay[i] = rand() * 0.22;
  }

  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  const pmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 1 }, uFogNear: { value: 80 }, uFogFar: { value: 220 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      uniform float uScale, uFogNear, uFogFar;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, aSize * uScale / -mv.z);
        vColor = aColor;
        vAlpha = aAlpha * (1.0 - smoothstep(uFogNear, uFogFar, -mv.z));
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.18, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }`
  });
  const points = new THREE.Points(geo, pmat);
  points.frustumCulled = false;
  scene.add(points);

  // ---------- 大樓 ----------
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d6e6, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-30, 60, 40); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fbde6, 0.9); fill.position.set(40, 10, -20); scene.add(fill);

  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const towers = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), B);
  towers.frustumCulled = false;
  scene.add(towers);
  const caps = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff }), M);
  caps.frustumCulled = false;
  for (let k = 0; k < M; k++) caps.setColorAt(k, new THREE.Color(candles[k].up ? 0x52b4d1 : 0xeb4779));
  scene.add(caps);
  const edgePos = new Float32Array(B * 24 * 3);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3).setUsage(THREE.DynamicDrawUsage));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xb8913f, transparent: true, opacity: 0.85 }));
  edges.frustumCulled = false;
  scene.add(edges);
  const grid = new THREE.GridHelper(260, 65, 0xd8bc83, 0xdfe5ec);
  grid.position.y = GROUND - 0.01;
  grid.material.transparent = true;
  scene.add(grid);

  // 突破的金色衝擊波
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 128), ringMat);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: 0x7fa6d6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  scene.add(ring, ring2);

  const bh = new Float32Array(B);   // 每棟現在長到幾成
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();

  function updateCity(T) {
    let any = false;
    const fall = 1 - sstep(3.45, 3.9, T);
    for (let b = 0; b < B; b++) {
      const g = sstep(buildings[b].t0, buildings[b].t0 + 0.35, T) * fall;
      bh[b] = g;
      if (g > 0.001) any = true;
    }
    towers.visible = caps.visible = edges.visible = any;
    if (!any) return;
    for (let b = 0; b < B; b++) {
      const o = buildings[b], g = bh[b], h = Math.max(0.001, o.h * g);
      m4.compose(v3.set(o.x, GROUND, o.z), q, s3.set(o.w, h, o.d));
      towers.setMatrixAt(b, m4);
      if (o.front) {
        m4.compose(v3.set(o.x, GROUND + h, o.z), q, s3.set(o.w * 1.04, Math.max(0.001, 0.45 * g), o.d * 1.04));
        caps.setMatrixAt(b, m4);
      }
      // 金色邊線
      const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, y0 = GROUND, y1 = GROUND + (g > 0.001 ? h : 0), z0 = o.z - o.d / 2, z1 = o.z + o.d / 2;
      const E = [x0, y0, z0, x1, y0, z0, x1, y0, z0, x1, y0, z1, x1, y0, z1, x0, y0, z1, x0, y0, z1, x0, y0, z0,
        x0, y1, z0, x1, y1, z0, x1, y1, z0, x1, y1, z1, x1, y1, z1, x0, y1, z1, x0, y1, z1, x0, y1, z0,
        x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0, x1, y0, z1, x1, y1, z1, x0, y0, z1, x0, y1, z1];
      edgePos.set(g > 0.001 ? E : new Array(72).fill(0), b * 72);
    }
    towers.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    edgeGeo.attributes.position.needsUpdate = true;
  }

  // ---------- 鏡頭：每一段的位置和看的點 ----------
  const KEYS = [
    [0.00, [0, 4, 64], [0, -9, 0]],
    [0.90, [0, 2, 46], [0, 0, 0]],
    [1.90, [2, 0, 41], [3, 0, 0]],
    [2.02, [2, 0, 41], [3, 0, 0]],
    [2.40, [5, 7, 54], [4, 6, 0]],
    [2.95, [-16, 24, 60], [0, -6, -12]],
    [3.40, [18, 18, 48], [0, -5, -14]],
    [3.75, [0, 34, 88], [0, -6, -6]],
    [4.00, [0, 4, 64], [0, -9, 0]]
  ];
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let fit = 1;
  function cameraAt(T, t) {
    let i = 1;
    while (i < KEYS.length - 1 && T > KEYS[i][0]) i++;
    const [ta, pa, la] = KEYS[i - 1], [tb, pb, lb] = KEYS[i];
    const e = sstep(ta, tb, T);
    const look = [lerp(la[0], lb[0], e), lerp(la[1], lb[1], e), lerp(la[2], lb[2], e)];
    const p = [lerp(pa[0], pb[0], e), lerp(pa[1], pb[1], e), lerp(pa[2], pb[2], e)];
    // 直式手機畫面窄：鏡頭拉遠，讓整張圖塞得進來
    camLook.set(look[0], look[1] * Math.sqrt(fit), look[2]);
    camPos.set(look[0] + (p[0] - look[0]) * fit, camLook.y + (p[1] - look[1]) * fit, look[2] + (p[2] - look[2]) * fit);
    // 一直有一點呼吸
    camPos.x += Math.sin(t * 0.21) * 1.6 * fit;
    camPos.y += Math.cos(t * 0.17) * 1.0 * fit;
    // 突破那一下震
    const shake = bump(T, 2.0, 2.22) * 0.7;
    camPos.x += Math.sin(t * 53) * shake; camPos.y += Math.cos(t * 47) * shake;
  }

  // ---------- 滑到哪、演到哪 ----------
  const sections = document.querySelectorAll("section");
  function storyT() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const s = clamp(scrollY / max, 0, 1);
    const sb = sections[1] ? clamp((sections[1].offsetTop - innerHeight * 0.55) / max, 0.3, 0.72) : 0.5;
    const A = [[0, 0], [sb * 0.35, 1], [sb, 2], [sb + (1 - sb) * 0.16, 2.35], [sb + (1 - sb) * 0.62, 3.4], [1, 4]];
    for (let k = 1; k < A.length; k++) {
      if (s <= A[k][0]) {
        const [s0, t0] = A[k - 1], [s1, t1] = A[k];
        return t0 + (t1 - t0) * (s - s0) / Math.max(1e-6, s1 - s0);
      }
    }
    return 4;
  }

  // ---------- 手指／滑鼠把粒子推開 ----------
  const ptr = { x: 0, y: 0, at: -1e9 };
  const setPtr = (x, y) => { ptr.x = x; ptr.y = y; ptr.at = performance.now(); };
  addEventListener("pointermove", e => setPtr(e.clientX, e.clientY), { passive: true });
  addEventListener("pointerdown", e => setPtr(e.clientX, e.clientY), { passive: true });
  addEventListener("touchmove", e => { const t = e.touches[0]; if (t) setPtr(t.clientX, t.clientY); }, { passive: true });

  // ---------- 尺寸 ----------
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, phone ? 2 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    fit = Math.max(1, 1.05 / camera.aspect);
    pmat.uniforms.uScale.value = H * dpr * 0.26 * fit;
    pmat.uniforms.uFogNear.value = 80 * fit; pmat.uniforms.uFogFar.value = 220 * fit;
    scene.fog.near = 80 * fit; scene.fog.far = 220 * fit;
  }
  resize();
  addEventListener("resize", resize);

  // ---------- 每一格 ----------
  const right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3();
  const PM = new THREE.Matrix4();
  // 檢查用：網址加 ?T=2.1 就停在那一刻
  const qT = new URLSearchParams(location.search).get("T");
  const lockT = qT === null ? null : parseFloat(qT);
  let Tcur = lockT ?? storyT(), t = 0, last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) t += dt;
    const Tt = lockT ?? storyT();
    Tcur += (Tt - Tcur) * (reduce ? 1 : Math.min(1, dt * 5));
    const T = Tcur;

    cameraAt(T, t);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.updateMatrixWorld();
    PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = PM.elements;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    fwd.setFromMatrixColumn(camera.matrixWorld, 2);

    updateCity(T);

    // K 線倒平：沿著最低點那條線往後倒，再沉到地面
    const flat = sstep(2.45, 2.95, T);
    const ang = -Math.PI / 2 * flat, ca = Math.cos(ang), sa = Math.sin(ang);
    const pivot = lerp(chartMin, GROUND, flat);
    const compress = sstep(1.0, 2.0, T);
    const burstE = clamp((T - 2.0) / 0.35, 0, 1);
    const burstAmp = bump(T, 2.0, 2.35);

    const active = performance.now() - ptr.at < 1200;
    const pnx = (ptr.x / W) * 2 - 1, pny = -(ptr.y / H) * 2 + 1;
    const R = Math.min(W, H) * 0.22;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    for (let i = 0; i < N; i++) {
      const Ti = T - P.delay[i];
      let wC = sstep(0.75, 1.15, Ti) * (1 - sstep(2.6, 3.0, Ti));
      let wY = sstep(2.65, 3.05, Ti) * (1 - sstep(3.5, 3.9, Ti));
      const sw = wC + wY; if (sw > 1) { wC /= sw; wY /= sw; }
      const wN = Math.max(0, 1 - wC - wY);

      // 星雲（一直在轉）
      const n4 = i * 4;
      const r = P.neb[n4], th = P.neb[n4 + 1] + t * P.neb[n4 + 3], hh = P.neb[n4 + 2] + Math.sin(t * 0.8 + i) * 0.15;
      const nx = Math.cos(th) * r, nzz = Math.sin(th) * r;
      const tilt = -1.05, ct = Math.cos(tilt), st = Math.sin(tilt);
      const ny = hh * ct - nzz * st, nz = hh * st + nzz * ct;

      // K 線
      const i3 = i * 3;
      let cx = P.chart[i3], cy = P.chart[i3 + 1], cz = P.chart[i3 + 2];
      const kk = P.cand[i];
      if (kk >= 0) {
        const ra = revealAt(kk);
        let rv;
        if (kk < SQ) rv = sstep(ra, ra + 0.12, Ti);
        else rv = backOut(clamp((T - ra) / 0.16, 0, 1));
        // 還沒輪到的，擠在頂點，越接近突破擠越緊、抖越兇
        const hr = lerp(5.5, 0.9, compress), jit = compress * 0.35 * (1 - rv);
        const hx = apex.x + P.hold[i3] * hr + Math.sin(t * 41 + i) * jit;
        const hy = apex.y + P.hold[i3 + 1] * hr + Math.cos(t * 37 + i * 1.3) * jit;
        const hz = P.hold[i3 + 2] * hr;
        cx = lerp(hx, cx, rv); cy = lerp(hy, cy, rv); cz = lerp(hz, cz, rv);
        // 突破時整張圖被震開一下
        if (burstAmp > 0) {
          const dx = cx - apex.x, dy = cy - apex.y, dl = Math.hypot(dx, dy) + 0.5;
          cx += dx / dl * burstAmp * 2.4; cy += dy / dl * burstAmp * 2.4;
        }
        // 倒平
        const yy = cy - pivot;
        const ry = pivot + yy * ca - cz * sa, rz = yy * sa + cz * ca;
        cy = ry; cz = rz;
      } else {
        cx += Math.sin(t * 0.3 + i) * 0.6; cy += Math.cos(t * 0.25 + i * 0.7) * 0.6;
      }

      // 城市的燈
      const c4 = i * 4, bd = buildings[P.city[c4]], g = bh[P.city[c4]] || 0;
      let yx, yy2, yz;
      if (P.city[c4 + 3] === 0) {
        yx = bd.x + P.city[c4 + 1] * bd.w * 0.9; yy2 = GROUND + P.city[c4 + 2] * bd.h * g; yz = bd.z + bd.d / 2 + 0.06;
      } else {
        yx = bd.x + P.city[c4 + 1] * bd.w; yy2 = GROUND + bd.h * g + 0.1; yz = bd.z + (P.city[c4 + 2] - 0.5) * bd.d;
      }

      let x = nx * wN + cx * wC + yx * wY;
      let y = ny * wN + cy * wC + yy2 * wY;
      let z = nz * wN + cz * wC + yz * wY;

      // 手指推開
      if (active) {
        const w = e[3] * x + e[7] * y + e[11] * z + e[15];
        if (w > 0.1) {
          const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w - pnx) * W / 2;
          const sy = ((e[1] * x + e[5] * y + e[9] * z + e[13]) / w - pny) * H / 2;
          const d = Math.hypot(sx, sy);
          if (d < R && d > 0.001) {
            const f = (1 - d / R) * (1 - d / R) * 9;          // 每格推幾 px
            const wpp = 2 * w * tanHalf / H;                    // 這個深度一 px 等於多少
            const k2 = f * wpp / d;
            P.off[i3] += (right.x * sx + up.x * sy) * k2;
            P.off[i3 + 1] += (right.y * sx + up.y * sy) * k2;
            P.off[i3 + 2] += (right.z * sx + up.z * sy) * k2;
          }
        }
      }
      P.off[i3] *= 0.94; P.off[i3 + 1] *= 0.94; P.off[i3 + 2] *= 0.94;
      pos[i3] = x + P.off[i3]; pos[i3 + 1] = y + P.off[i3 + 1]; pos[i3 + 2] = z + P.off[i3 + 2];

      col[i3] = P.cNeb[i3] * wN + P.cChart[i3] * wC + P.cCity[i3] * wY;
      col[i3 + 1] = P.cNeb[i3 + 1] * wN + P.cChart[i3 + 1] * wC + P.cCity[i3 + 1] * wY;
      col[i3 + 2] = P.cNeb[i3 + 2] * wN + P.cChart[i3 + 2] * wC + P.cCity[i3 + 2] * wY;
      const tw = 0.75 + 0.25 * Math.sin(t * 2.2 + i * 1.7);
      size[i] = (P.sNeb[i] * wN + (kk >= 0 ? (phone ? 1.35 : 1.05) * (kk >= SQ ? 1.3 : 1) : 0.6) * wC + 0.6 * wY) * (0.85 + 0.3 * tw);
      alpha[i] = (P.aNeb[i] * tw * wN + (kk >= 0 ? 0.95 : 0.45 * tw) * wC + 0.9 * wY);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;

    // 衝擊波
    const showRing = burstE > 0 && burstE < 1;
    ring.visible = ring2.visible = showRing;
    if (showRing) {
      ring.position.copy(apex); ring2.position.copy(apex);
      ring.quaternion.copy(camera.quaternion); ring2.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(1 + 24 * backOut(burstE) * fit);
      ring2.scale.setScalar(1 + 15 * burstE * fit);
      ring.material.opacity = (1 - burstE) * 0.85;
      ring2.material.opacity = (1 - burstE) * 0.5;
    }
    if (flash) flash.style.opacity = (bump(T, 2.0, 2.3) * 0.9).toFixed(3);
    grid.material.opacity = sstep(2.5, 2.95, T) * (1 - sstep(3.45, 3.85, T)) * 0.8;
    grid.visible = grid.material.opacity > 0.01;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

}
