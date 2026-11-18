// 背景：跟首頁第一屏一樣的深色宇宙（星雲雲霧＋金色旋臂星系＋滿天星塵），星系核心放在 QR 正後面
// 規則從 ../site.js 的 buildCosmos 和背景 shader 抄過來，只留第一屏要用的部分
import * as THREE from "../vendor/three.module.min.js";

const canvas = document.getElementById("gl");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
if (renderer) start();

function start() {
  let seed = 7;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const gauss = () => { const u = Math.max(1e-6, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  renderer.autoClear = false;
  const FOV = 40, CAMZ = 60;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 900);
  camera.position.set(0, 0, CAMZ);
  const phone = innerWidth <= 760;
  const N = phone ? 3600 : 5600, NS = phone ? 1100 : 1800, NP = N + NS;

  // ---- 背景 shader（深色那一半） ----
  const bgScene = new THREE.Scene(), bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uGal: { value: new THREE.Vector2() }, uGalR: { value: 1 } },
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `precision highp float;
      uniform vec2 uRes; uniform float uTime; uniform vec2 uGal; uniform float uGalR;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
      vec3 nebula(vec2 g, float amt) {
        vec2 q = g * 1.35 + vec2(uTime * 0.012, -uTime * 0.008);
        float n1 = fbm(q * 1.2), n2 = fbm(q * 2.1 + 5.0), n3 = fbm(q * 0.7 - 3.0);
        vec3 c1 = mix(vec3(0.05, 0.12, 0.38), vec3(0.42, 0.12, 0.5), smoothstep(0.35, 0.75, n1));
        vec3 c2 = mix(c1, vec3(0.85, 0.3, 0.5), smoothstep(0.55, 0.85, n2) * 0.8);
        vec3 c3 = mix(c2, vec3(0.95, 0.72, 0.35), smoothstep(0.62, 0.9, n3) * 0.7);
        vec3 add = c3 * smoothstep(0.3, 0.85, n1 * 0.6 + n2 * 0.4) * amt;
        return add * (1.0 - smoothstep(0.55, 0.8, fbm(q * 3.0 + 11.0)) * 0.65);
      }
      void main(){
        vec2 fc = gl_FragCoord.xy; float vy = fc.y / uRes.y;
        vec3 col = mix(vec3(0.016, 0.031, 0.063), vec3(0.047, 0.086, 0.145), vy);
        vec2 g = (fc - uGal) / uGalR;
        col += nebula(g * 0.8, 0.75 * exp(-dot(g, g) * 0.18));
        float rg = length(vec2(g.x, g.y / 0.46));
        col += vec3(1.0, 0.88, 0.72) * (exp(-rg * rg * 9.0) * 0.6 + exp(-rg * 2.4) * 0.14);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

  // ---- 版面：星系中心＝QR 中心 ----
  let W = 1, H = 1, Hw = 1, Ww = 1, HERO = { cx: 0, cy: 0, r: 1 }, dpr = 1;
  function layout() {
    W = innerWidth; H = innerHeight;
    Hw = 2 * CAMZ * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); Ww = Hw * (W / H);
    const el = document.querySelector(".qr"), r = el ? el.getBoundingClientRect() : null;
    const cy = r ? r.top + r.height / 2 : H * 0.42;
    HERO = { cx: 0, cy: (H / 2 - cy) * Hw / H, r: W <= 760 ? Ww * 1.2 : Hw * 0.9 };
  }
  layout();

  // ---- 粒子：星系（COSMOS 4：14% 彩色雲＋核心＋兩條旋臂＋粉紅星團＋散星）和星塵 ----
  const P = new Float32Array(NP * 3), col = new Float32Array(NP * 3), size = new Float32Array(NP), alpha = new Float32Array(NP);
  const G = new Float32Array(N * 4);
  const pal = { core: [[1, 0.97, 0.88], [1, 0.88, 0.66]], inner: [[1, 0.92, 0.76], [0.9, 0.9, 0.95]], outer: [[0.7, 0.8, 1], [0.6, 0.72, 1], [0.85, 0.9, 1]], hii: [1, 0.42, 0.68] };
  function buildGalaxy() {
    seed = 7;
    const Rg = HERO.r, pitch = 0.27;
    for (let i = 0; i < N; i++) {
      const u = rand(); let r, th, h, cd, sz, al, w;
      if (u < 0.14) {
        const b = Math.floor(rand() * 5), bc = [[-0.25, 0.1], [0.3, -0.05], [0.05, 0.25], [-0.1, -0.25], [0.4, 0.3]][b], k = 1.6;
        const x = (bc[0] * k + gauss() * 0.16 * k) * Rg, y = (bc[1] * k + gauss() * 0.12 * k) * Rg;
        r = Math.hypot(x, y); th = Math.atan2(y, x); h = gauss() * Rg * 0.05;
        cd = [[0.25, 0.4, 1], [0.6, 0.3, 0.95], [1, 0.4, 0.65], [1, 0.75, 0.4], [0.35, 0.75, 1]][b];
        sz = 0.9 + rand() * 1.8; al = 0.05 + rand() * 0.08; w = 0.012 + rand() * 0.01;
      } else {
        const v = (u - 0.14) / 0.86;
        if (v < 0.2) { r = Rg * 0.15 * Math.abs(gauss()); th = rand() * 6.283; h = gauss() * Rg * 0.05; cd = mix3(pal.core[0], pal.core[1], rand()); sz = 0.2 + rand() * 0.3; al = 0.22 + rand() * 0.35; }
        else if (v < 0.82) {
          const arm = rand() < 0.5 ? 0 : Math.PI;
          r = Rg * (0.08 + 0.92 * Math.pow(rand(), 0.85));
          th = arm + Math.log(r / (Rg * 0.08)) / pitch * 0.42 + gauss() * (0.2 + 0.15 * r / Rg); h = gauss() * Rg * 0.012;
          const list = r / Rg < 0.4 ? pal.inner : pal.outer; cd = list[Math.floor(rand() * list.length)];
          sz = 0.09 + rand() * 0.16 + (rand() < 0.03 ? 0.22 : 0); al = 0.35 + rand() * 0.55;
        } else if (v < 0.88) {
          const arm = rand() < 0.5 ? 0 : Math.PI, rr = Rg * (0.35 + rand() * 0.55);
          r = rr + gauss() * Rg * 0.02; th = arm + Math.log(rr / (Rg * 0.08)) / pitch * 0.42 + gauss() * 0.05; h = gauss() * Rg * 0.01;
          cd = mix3(pal.hii, [1, 1, 1], rand() * 0.25); sz = 0.16 + rand() * 0.18; al = 0.55 + rand() * 0.4;
        } else { r = Rg * Math.pow(rand(), 0.6); th = rand() * 6.283; h = gauss() * Rg * 0.03; cd = [[1, 1, 1], [0.78, 0.86, 1], [1, 0.9, 0.7]][Math.floor(rand() * 3)]; sz = 0.07 + rand() * 0.12; al = 0.45 + rand() * 0.5; }
        w = 0.06 * (1.25 - r / Rg);
      }
      G.set([r, th, h, w], i * 4); col.set(cd, i * 3); size[i] = sz; alpha[i] = al;
    }
    for (let j = 0; j < NS; j++) {
      const p = N + j, p3 = p * 3;
      P[p3] = (rand() - 0.5) * Ww * 2.6; P[p3 + 1] = (rand() - 0.5) * Hw * 2.6; P[p3 + 2] = lerp(-170, 45, rand());
      col.set([[1, 1, 1], [0.78, 0.86, 1], [1, 0.9, 0.7], [0.9, 0.8, 1]][Math.floor(rand() * 4)], p3);
      size[p] = 0.08 + rand() * 0.15 + (rand() < 0.04 ? 0.2 : 0); alpha[p] = 0.5 + rand() * 0.5;
    }
  }
  buildGalaxy();
  const incl = 1.12, roll = phone ? -0.62 : -0.38, ci = Math.cos(incl), si = Math.sin(incl), cr = Math.cos(roll), sr = Math.sin(roll);
  const target = new Float32Array(N * 3);
  function galaxyAt(t) {
    for (let i = 0; i < N; i++) {
      const r = G[i * 4], th = G[i * 4 + 1] + t * G[i * 4 + 3], h = G[i * 4 + 2];
      const x = Math.cos(th) * r, z = Math.sin(th) * r, y1 = h * ci - z * si, z1 = h * si + z * ci;
      target[i * 3] = HERO.cx + x * cr - y1 * sr; target[i * 3 + 1] = HERO.cy + x * sr + y1 * cr; target[i * 3 + 2] = z1;
    }
  }
  // 開場：從 QR 中心爆開，再旋成星系
  const V = new Float32Array(N * 3), KS = new Float32Array(N);
  galaxyAt(0);
  for (let i = 0; i < N; i++) {
    const a = rand() * 6.283, b = Math.acos(2 * rand() - 1), sp = reduce ? 0 : 0.5 + rand() * 1.4;
    if (reduce) { P[i * 3] = target[i * 3]; P[i * 3 + 1] = target[i * 3 + 1]; P[i * 3 + 2] = target[i * 3 + 2]; }
    else { P[i * 3] = HERO.cx + (rand() - 0.5) * 0.6; P[i * 3 + 1] = HERO.cy + (rand() - 0.5) * 0.6; P[i * 3 + 2] = (rand() - 0.5) * 0.6; }
    V[i * 3] = Math.sin(b) * Math.cos(a) * sp; V[i * 3 + 1] = Math.sin(b) * Math.sin(a) * sp; V[i * 3 + 2] = Math.cos(b) * sp;
    KS[i] = 0.03 + rand() * 0.045;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3)); geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1)); geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const uni = { uScale: { value: 1 }, uMaxPx: { value: 24 }, uFocus: { value: CAMZ }, uDof: { value: 0.012 }, uTime: { value: 0 } };
  const pointVS = halo => `attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      uniform float uScale, uMaxPx, uFocus, uDof, uTime; varying vec3 vC; varying float vA; varying float vB;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float bl = clamp(abs(-mv.z - uFocus) * uDof - 0.06, 0.0, 1.0);
        float tw = 0.82 + 0.18 * sin(uTime * 1.7 + position.x * 3.1 + position.y * 2.3);
        gl_PointSize = clamp(aSize * uScale / -mv.z * (1.0 + bl * 2.2) * ${halo ? "3.6" : "1.0"}, 1.0, uMaxPx * ${halo ? "2.4" : "1.0"});
        vC = aColor; vA = aAlpha * tw * mix(1.0, 0.32, bl) * ${halo ? "0.1" : "1.0"}; vB = bl; }`;
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms: uni, vertexShader: pointVS(false),
    fragmentShader: `precision highp float; varying vec3 vC; varying float vA; varying float vB;
      void main(){ float d = length(gl_PointCoord - 0.5);
        float core = mix(smoothstep(0.5, 0.1, d), 1.0 - smoothstep(0.0, 0.5, d), vB);
        float a = (core + smoothstep(0.5, 0.0, d) * 0.35) * vA; if (a < 0.01) discard;
        gl_FragColor = vec4(vC, min(a, 1.0)); }` });
  const haloMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms: uni, vertexShader: pointVS(true),
    fragmentShader: `precision highp float; varying vec3 vC; varying float vA; varying float vB;
      void main(){ vec2 q = gl_PointCoord - 0.5; float a = exp(-dot(q, q) * 16.0) * vA; if (a < 0.003) discard; gl_FragColor = vec4(vC, a); }` });
  const pts = new THREE.Points(geo, mat), halo = new THREE.Points(geo, haloMat);
  pts.frustumCulled = halo.frustumCulled = false; halo.renderOrder = 0; pts.renderOrder = 1;
  scene.add(halo); scene.add(pts);

  function resize() {
    layout();
    dpr = Math.min(devicePixelRatio || 1, phone ? 2 : 1.75);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    uni.uScale.value = H * dpr / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    uni.uMaxPx.value = 16 * dpr;
    bgMat.uniforms.uRes.value.set(W * dpr, H * dpr);
    const k = H / Hw * dpr;
    bgMat.uniforms.uGal.value.set(W * dpr / 2 + HERO.cx * k, H * dpr / 2 + HERO.cy * k);
    bgMat.uniforms.uGalR.value = HERO.r * k;
  }
  resize();
  let rt = 0, lastW = innerWidth;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { const big = Math.abs(innerWidth - lastW) > 2; lastW = innerWidth; if (big) { layout(); buildGalaxy(); geo.attributes.aColor.needsUpdate = geo.attributes.aSize.needsUpdate = geo.attributes.aAlpha.needsUpdate = true; } resize(); }, 180); });

  // 手指或滑鼠移動：鏡頭跟著微微偏一點（跟首頁一樣有景深感）；點 QR 時星系閃一下
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", e => { look.tx = (e.clientX / W - 0.5) * 2; look.ty = (e.clientY / H - 0.5) * 2; }, { passive: true });
  let kick = 0;
  window.SN_COSMOS_KICK = () => { kick = 1; };

  let last = performance.now(), clock = 0, t0 = last;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    const age = (now - t0) / 1000;
    galaxyAt(clock * (1 + kick * 3));
    const pull = reduce ? 1 : Math.min(1, Math.max(0, (age - 0.25) / 2.2));
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      if (!reduce && age < 3.2) { P[j] += V[j] * dt * 18 * (1 - pull); P[j + 1] += V[j + 1] * dt * 18 * (1 - pull); P[j + 2] += V[j + 2] * dt * 18 * (1 - pull); }
      const k = reduce ? 1 : Math.min(1, KS[i] * (0.4 + pull * 2.4) * dt * 60);
      P[j] += (target[j] - P[j]) * k; P[j + 1] += (target[j + 1] - P[j + 1]) * k; P[j + 2] += (target[j + 2] - P[j + 2]) * k;
    }
    for (let j = N * 3; j < NP * 3; j += 3) { P[j + 2] += dt * 1.2; if (P[j + 2] > 45) P[j + 2] -= 215; }
    geo.attributes.position.needsUpdate = true;
    kick *= Math.pow(0.04, dt);
    look.x += (look.tx - look.x) * 0.04; look.y += (look.ty - look.y) * 0.04;
    camera.position.set(look.x * 2.2, -look.y * 1.6, CAMZ); camera.lookAt(look.x * 0.6, -look.y * 0.4, 0);
    uni.uTime.value = clock; bgMat.uniforms.uTime.value = clock;
    renderer.clear(); renderer.render(bgScene, bgCam); renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
