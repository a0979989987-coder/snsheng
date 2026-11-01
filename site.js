// 金色粒子一路跟著往下：每到一段，同一群粒子重組成那一段的主角。
// 開場深色宇宙（陰）→ 太極轉場 → 笑臉、天秤三態、道法術（陽）→ 太極轉回陰 → 突破進場（黑白分割、真 K 棒、撞穿玻璃、一路往上衝）→ 書 → 金句 → OX → 合成市場 → 影片 → 雙極 logo
import * as THREE from "./vendor/three.module.min.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("gl");
const flashEl = document.getElementById("flash");
const ptextEl = document.getElementById("ptext");
const qs = new URLSearchParams(location.search);
const COSMOS = Math.min(4, Math.max(1, parseInt(qs.get("cosmos") || "4", 10) || 4));   // 4＝真實星系＋星雲雲霧（他選的）

// ---------- 小工具 ----------
let seed = 7;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const gauss = () => { const u = Math.max(1e-6, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (x, a, b) => (x <= a || x >= b) ? 0 : Math.sin(Math.PI * (x - a) / (b - a));
const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const bright = c => [Math.min(1, c[0] * 1.2 + 0.08), Math.min(1, c[1] * 1.2 + 0.08), Math.min(1, c[2] * 1.2 + 0.08)];

const GOLD = hex(0xc99e45), GOLD_DK = hex(0x9c7a32), GOLD_LT = hex(0xe3c47e), CREAM = hex(0xf3e2b8);
const BLUE = hex(0x7fa6d6), BLUE_LT = hex(0xa9c4e8);
const UP = hex(0x52b4d1), DOWN = hex(0xeb4779);
const INK = hex(0x1b1f27), PAPER = [0.97, 0.95, 0.9];
const goldish = () => rand() < 0.5 ? mix3(GOLD_DK, GOLD, rand()) : mix3(GOLD, GOLD_LT, rand());

// ---------- 字和卡片的顏色（陰陽在中間一起翻） ----------
const PAL = {
  light: { bgA: [251, 248, 242], bgB: [238, 242, 247], fg: [48, 52, 59], fg2: [99, 107, 119], fg3: [154, 161, 171], card: [255, 255, 255, 0.7], cardline: [221, 225, 230, 0.9], gold: [141, 113, 46], glow: [255, 255, 255, 0.9] },
  dark: { bgA: [9, 19, 30], bgB: [15, 30, 46], fg: [239, 231, 214], fg2: [168, 182, 198], fg3: [122, 138, 156], card: [16, 30, 46, 0.66], cardline: [241, 234, 220, 0.14], gold: [224, 190, 116], glow: [9, 19, 30, 0.9] }
};
const metaTheme = document.querySelector('meta[name="theme-color"]');
function applyPalette(d) {
  const st = document.documentElement.style, flip = sstep(0.44, 0.56, d);
  for (const k of Object.keys(PAL.light)) {
    const a = PAL.light[k], b = PAL.dark[k], t = (k === "bgA" || k === "bgB") ? d : flip;
    const v = a.map((x, i) => i < 3 ? Math.round(lerp(x, b[i], t)) : +lerp(x, b[i], t).toFixed(3));
    st.setProperty("--" + k, v.length === 4 ? `rgba(${v.join(",")})` : `rgb(${v.join(",")})`);
  }
  if (metaTheme) { const c = PAL.light.bgA.map((x, i) => Math.round(lerp(x, PAL.dark.bgA[i], d))); metaTheme.content = `rgb(${c.join(",")})`; }
}

// ---------- 聲音：Braam（先收再砸）和短重擊。點過畫面才會響 ----------
let actx = null;
let soundOn = localStorage.getItem("snsheng-sound") !== "off";
const soundBtn = document.getElementById("soundBtn");
function syncSoundBtn() { soundBtn.classList.toggle("muted", !soundOn); soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false"); }
syncSoundBtn();
function unlockAudio() {
  if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
  if (actx && actx.state === "suspended") actx.resume();
}
addEventListener("pointerdown", unlockAudio, { passive: true });
addEventListener("touchend", unlockAudio, { passive: true });
addEventListener("keydown", unlockAudio);
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn; localStorage.setItem("snsheng-sound", soundOn ? "on" : "off"); syncSoundBtn();
  unlockAudio();
  if (soundOn) setTimeout(() => braam(0.25, 0.55), 60);
});
let irBuf = null;
function noiseBuf(sec) {
  const b = actx.createBuffer(1, Math.max(1, Math.floor(actx.sampleRate * sec)), actx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function getIR() {
  if (irBuf) return irBuf;
  const len = Math.floor(actx.sampleRate * 2.8);
  irBuf = actx.createBuffer(2, len, actx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = irBuf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  return irBuf;
}
function shaperCurve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }
function outChain(level) {
  const master = actx.createGain(); master.gain.value = level;
  const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  const verb = actx.createConvolver(); verb.buffer = getIR();
  const wet = actx.createGain(); wet.gain.value = 0.3;
  master.connect(comp); master.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(actx.destination);
  return master;
}
function braam(swell = 0.6, level = 1) {
  if (!soundOn || !actx || actx.state !== "running") return;
  const t0 = actx.currentTime + 0.03, th = t0 + swell, master = outChain(0.85 * level);
  if (swell > 0.05) {   // 先收：往上吸的風聲
    const n = actx.createBufferSource(); n.buffer = noiseBuf(swell);
    const bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(260, t0); bp.frequency.exponentialRampToValueAtTime(2600, th);
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, th - 0.02); g.gain.linearRampToValueAtTime(0.0001, th);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t0); n.stop(th);
  }
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 5;   // 再砸：低音銅管
  lp.frequency.setValueAtTime(160, th); lp.frequency.exponentialRampToValueAtTime(1500, th + 0.08); lp.frequency.exponentialRampToValueAtTime(240, th + 2.8);
  const sh = actx.createWaveShaper(); sh.curve = shaperCurve(14);
  const hg = actx.createGain(); hg.gain.setValueAtTime(0.0001, th); hg.gain.exponentialRampToValueAtTime(0.55, th + 0.025); hg.gain.exponentialRampToValueAtTime(0.0001, th + 3.4);
  lp.connect(sh); sh.connect(hg); hg.connect(master);
  [[49, 0, 0.3], [49, -10, 0.3], [73.4, 7, 0.22], [98, -6, 0.18], [98, 9, 0.18], [146.8, 0, 0.12], [196, 4, 0.08]].forEach(([f, det, v]) => {
    const o = actx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det;
    const g = actx.createGain(); g.gain.value = v; o.connect(g); g.connect(lp); o.start(th); o.stop(th + 3.5);
  });
  const sub = actx.createOscillator(); sub.type = "sine"; sub.frequency.setValueAtTime(58, th); sub.frequency.exponentialRampToValueAtTime(40, th + 1.6);
  const sg = actx.createGain(); sg.gain.setValueAtTime(0.0001, th); sg.gain.exponentialRampToValueAtTime(0.7, th + 0.02); sg.gain.exponentialRampToValueAtTime(0.0001, th + 2.4);
  sub.connect(sg); sg.connect(master); sub.start(th); sub.stop(th + 2.5);
  const imp = actx.createBufferSource(); imp.buffer = noiseBuf(0.35);
  const ilp = actx.createBiquadFilter(); ilp.type = "lowpass"; ilp.frequency.value = 1100;
  const ig = actx.createGain(); ig.gain.setValueAtTime(0.45, th); ig.gain.exponentialRampToValueAtTime(0.0001, th + 0.3);
  imp.connect(ilp); ilp.connect(ig); ig.connect(master); imp.start(th);
}
function thump(level = 0.6) {   // 往上衝時每一段的短重擊
  if (!soundOn || !actx || actx.state !== "running") return;
  const t = actx.currentTime + 0.01, master = outChain(level);
  const o = actx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.4);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.6);
  const s = actx.createOscillator(); s.type = "sawtooth"; s.frequency.value = 98;
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(1300, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.35);
  const sg = actx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.25, t + 0.01); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  s.connect(lp); lp.connect(sg); sg.connect(master); s.start(t); s.stop(t + 0.45);
  const n = actx.createBufferSource(); n.buffer = noiseBuf(0.2);
  const nl = actx.createBiquadFilter(); nl.type = "lowpass"; nl.frequency.value = 900;
  const ng = actx.createGain(); ng.gain.setValueAtTime(0.35, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  n.connect(nl); nl.connect(ng); ng.connect(master); n.start(t);
}
function flash(strength = 1) {
  if (!flashEl || reduce) return;
  flashEl.style.transition = "none"; flashEl.style.opacity = String(0.9 * strength);
  requestAnimationFrame(() => requestAnimationFrame(() => { flashEl.style.transition = "opacity 1.3s ease-out"; flashEl.style.opacity = "0"; }));
}

// ---------- 每一段的位置和字幕 ----------
const secs = [...document.querySelectorAll("[data-shape]")].map(el => ({ el, key: el.dataset.shape, sticky: el.classList.contains("story"), caps: [...el.querySelectorAll(".cap")], capOn: -1 }));
const idx = k => secs.findIndex(s => s.key === k);
let VH = innerHeight;
const RNG = { t1: [0, 1], t2: [0, 1], sp: [0, 1, 2, 3] };   // 陰→陽、陽→陰（太極）、黑白分割
function measure() {
  VH = innerHeight;
  for (const s of secs) {
    const r = s.el.getBoundingClientRect();
    s.top = r.top + scrollY; s.h = r.height;
    if (s.sticky) { s.h0 = s.top; s.h1 = s.top + s.h - VH; }
    else { const mid = s.top + s.h / 2 - VH / 2; s.h0 = mid - VH * 0.12; s.h1 = mid + VH * 0.12; }
  }
  secs[0].h0 = -1e9; secs[0].h1 = VH * 0.08;
  const me = secs[idx("smiley")], dao = secs[idx("dao")], bk = secs[idx("breakout")];
  RNG.t1 = [secs[0].h1, me.h0];
  RNG.t2 = [dao.h1, bk.h0];
  RNG.sp = [bk.h0, bk.h0 + VH * 0.3, bk.h1, bk.h1 + VH * 0.35];
}
function localP(s, y) { return s.sticky ? clamp((y - s.top) / Math.max(1, s.h - VH), 0, 1) : 0.5; }
function scrollState(y) {
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    if (y <= s.h1 || i === secs.length - 1) {
      if (y >= s.h0 || i === 0) return { a: i, b: i, m: 0 };
      const prev = secs[i - 1];
      return { a: i - 1, b: i, m: clamp((y - prev.h1) / Math.max(1, s.h0 - prev.h1), 0, 1) };
    }
  }
  return { a: 0, b: 0, m: 0 };
}
function updateCaps(y) {
  for (const s of secs) {
    if (!s.caps.length) continue;
    const p = localP(s, y);
    let on = 0;
    s.caps.forEach((c, i) => { if (p >= parseFloat(c.dataset.at)) on = i; });
    if (on !== s.capOn) { s.caps.forEach((c, i) => c.classList.toggle("on", i === on)); s.capOn = on; }
  }
}
// 陰陽狀態：base＝沒在轉場時的底色；tr＝太極轉場進度；from＝從哪一色轉出去
const yinYang = y => {
  const t1 = clamp((y - RNG.t1[0]) / Math.max(1, RNG.t1[1] - RNG.t1[0]), 0, 1), t2 = clamp((y - RNG.t2[0]) / Math.max(1, RNG.t2[1] - RNG.t2[0]), 0, 1);
  let tr = 0, from = 1, base = 1;
  if (t1 > 0 && t1 < 1) { tr = t1; from = 1; }
  else if (t2 > 0 && t2 < 1) { tr = t2; from = 0; }
  base = t1 >= 1 && t2 <= 0 ? 0 : 1;
  const dark = clamp(1 - sstep(0.4, 0.75, t1) + sstep(0.4, 0.75, t2), 0, 1);
  return { t1, t2, tr, from, base, dark, split: sstep(RNG.sp[0], RNG.sp[1], y) * (1 - sstep(RNG.sp[2], RNG.sp[3], y)) };
};
measure();
addEventListener("load", measure);

// 太極遮罩：0＝陽（白），1＝陰（黑）。背景、粒子、K 棒都用同一個，才會一起反色
const MASK = `
  uniform vec2 uRes; uniform float uBase, uTr, uFrom, uAng, uSplit, uInv;
  float glowG;
  float yyUnit(vec2 q, float e) {
    float m = smoothstep(e, -e, q.x);
    float dt = length(q - vec2(0.0, 0.5)), db = length(q - vec2(0.0, -0.5));
    m = mix(m, 0.0, smoothstep(0.5 + e, 0.5 - e, dt));
    m = mix(m, 1.0, smoothstep(0.5 + e, 0.5 - e, db));
    m = mix(m, 1.0, smoothstep(0.13 + e, 0.13 - e, dt));
    m = mix(m, 0.0, smoothstep(0.13 + e, 0.13 - e, db));
    return m;
  }
  float taiji(vec2 p) {
    float a = uRes.x / uRes.y, s0 = 0.82 * min(a, 1.0);
    float grow = smoothstep(0.0, 0.36, uTr), zoom = smoothstep(0.46, 1.0, uTr);
    float s = s0 * (0.02 + 0.98 * grow) * exp(zoom * 4.8);
    vec2 A = vec2(uFrom > 0.5 ? 0.62 : -0.62, 0.0);
    float c = cos(uAng), sn = sin(uAng);
    vec2 q = A * zoom + vec2(c * p.x + sn * p.y, -sn * p.x + c * p.y) / s;
    float px = 1.0 / (0.5 * uRes.y);
    float e = 1.5 * px / s, r = length(q);
    float inside = smoothstep(1.0 + e, 1.0 - e, r);
    float m = mix(uFrom, yyUnit(q, e), inside);
    float ew = 10.0 * px / s;
    float sG = (1.0 - abs(yyUnit(q, ew) - 0.5) * 2.0) * inside;
    float rG = smoothstep(ew * 1.6, 0.0, abs(r - 1.0));
    glowG = max(sG, rG) * (1.0 - zoom * 0.8);
    return m;
  }
  float maskAt(vec2 fc) {
    vec2 p = (fc - 0.5 * uRes) / (0.5 * uRes.y);
    glowG = 0.0;
    float m = uBase;
    if (uTr > 0.0 && uTr < 1.0) m = taiji(p);
    float e = 1.5 / (0.5 * uRes.y);
    m = mix(m, smoothstep(-e, e, p.x), uSplit);
    return mix(m, 1.0 - m, uInv);
  }`;
const taijiAng = tr => 0.6 + tr * Math.PI * 2.2;

// ---------- WebGL ----------
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
let darkCur = -1, last = performance.now(), clock = 0;
if (!renderer) {
  const loop = () => { const y = scrollY; updateCaps(y); const d = yinYang(y).dark; if (Math.abs(d - darkCur) > 0.002) { darkCur = d; applyPalette(d); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
} else start();

function start() {
  renderer.autoClear = false;
  const scene = new THREE.Scene();
  const FOV = 40, CAMZ = 60;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 900);
  const phoneNow = innerWidth <= 760;
  const N = phoneNow ? 3600 : 5600, NS = phoneNow ? 1100 : 1800, NT = 420, NP = N + NS + NT;

  // ---------- 背景 ----------
  const bgScene = new THREE.Scene(), bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const shared = { uRes: { value: new THREE.Vector2(1, 1) }, uBase: { value: 1 }, uTr: { value: 0 }, uFrom: { value: 1 }, uAng: { value: 0 }, uSplit: { value: 0 }, uInv: { value: 0 } };
  const bgMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { ...shared, uTime: { value: 0 }, uHero: { value: 1 }, uCosmos: { value: COSMOS }, uGal: { value: new THREE.Vector2() }, uGalR: { value: 1 }, uGlow: { value: 0 } },
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `precision highp float;
      ${MASK}
      uniform float uTime, uHero, uGlow; uniform int uCosmos; uniform vec2 uGal; uniform float uGalR;
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
        vec2 fc = gl_FragCoord.xy;
        float m = maskAt(fc), vy = fc.y / uRes.y;
        vec3 L = mix(vec3(0.933, 0.949, 0.969), vec3(0.984, 0.973, 0.949), vy);
        vec3 D = mix(vec3(0.016, 0.031, 0.063), vec3(0.047, 0.086, 0.145), vy);
        vec3 col = mix(L, D, m);
        col += vec3(1.0, 0.78, 0.36) * glowG * uGlow;   // 太極的金邊
        if (uHero > 0.001) {
          vec2 g = (fc - uGal) / uGalR;
          vec3 add = vec3(0.0);
          if (uCosmos == 3 || uCosmos == 4) add += nebula(g * (uCosmos == 4 ? 0.8 : 1.0), uCosmos == 4 ? 0.75 * exp(-dot(g, g) * 0.18) : 0.95 * exp(-dot(g, g) * 0.5));
          if (uCosmos != 3) {
            float rg = length(vec2(g.x, g.y / 0.46));
            vec3 gc = uCosmos == 2 ? vec3(1.0, 0.78, 0.42) : vec3(1.0, 0.88, 0.72);
            add += gc * (exp(-rg * rg * 9.0) * 0.6 + exp(-rg * 2.4) * 0.14);
            if (uCosmos != 4) { float n = fbm(g * 2.4 + vec2(uTime * 0.01, 0.0)); add += (uCosmos == 2 ? vec3(0.32, 0.22, 0.07) : vec3(0.1, 0.14, 0.32)) * smoothstep(0.45, 0.85, n) * exp(-rg * 1.2) * 0.7; }
          }
          col += add * uHero * m;
        }
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

  // ---------- 版面 ----------
  let W = 1, H = 1, Hw = 1, Ww = 1, phone = true, STAGE, HERO, QUOTE, TOPC, CHART;
  function layout() {
    W = innerWidth; H = innerHeight; phone = W <= 760;
    Hw = 2 * CAMZ * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); Ww = Hw * (W / H);
    STAGE = phone ? { cx: 0, cy: Hw * 0.19, hw: Ww * 0.47, hh: Hw * 0.27 } : { cx: Ww * 0.21, cy: Hw * 0.0, hw: Math.min(Ww * 0.27, Hw * 0.52), hh: Hw * 0.42 };
    CHART = phone ? { cx: 0, cy: Hw * 0.19, hw: Ww * 0.48, hh: Hw * 0.25 } : { cx: Ww * 0.14, cy: Hw * 0.02, hw: Ww * 0.33, hh: Hw * 0.38 };
    HERO = phone ? { cx: 0, cy: Hw * 0.365, r: Ww * 1.2 } : { cx: 0, cy: Hw * 0.36, r: Hw * 0.9 };
    QUOTE = phone ? { cx: 0, cy: Hw * 0.1, hw: Ww * 0.46, hh: Hw * 0.3 } : { cx: 0, cy: Hw * 0.06, hw: Ww * 0.38, hh: Hw * 0.3 };
    TOPC = phone ? STAGE : { cx: 0, cy: Hw * 0.3, hw: Ww * 0.17, hh: Hw * 0.15 };
  }
  layout();

  // ---------- 形狀 ----------
  const newShape = () => ({ pos: new Float32Array(N * 3), col: new Float32Array(N * 3), colD: new Float32Array(N * 3), size: new Float32Array(N), alpha: new Float32Array(N), dyn: null, perm: null });
  const setC = (s, i, c, cd) => { s.col.set(c, i * 3); s.colD.set(cd || bright(c), i * 3); };
  function finish(s) {   // 依位置排好：轉場時粒子照順序滑過去，不會亂飛
    const key = new Float32Array(N), ord = new Int32Array(N);
    for (let i = 0; i < N; i++) { key[i] = s.pos[i * 3] + s.pos[i * 3 + 1] * 0.08; ord[i] = i; }
    s.perm = ord.sort((a, b) => key[a] - key[b]);
    return s;
  }
  function sampleCanvas(cw, ch, draw, step = 2) {
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const g = c.getContext("2d", { willReadFrequently: true });
    draw(g, cw, ch);
    const d = g.getImageData(0, 0, cw, ch).data, pts = [];
    for (let y = 0; y < ch; y += step) for (let x = 0; x < cw; x += step) {
      const k = (y * cw + x) * 4;
      if (d[k + 3] > 120) pts.push(x, y, d[k], d[k + 1], d[k + 2]);
    }
    return { pts, cw, ch };
  }
  function placeSample(s, smp, i0, i1, rect, o = {}) {
    const n = smp.pts.length / 5; if (!n) return 1;
    const sc = Math.min(rect.hw / (smp.cw / 2), rect.hh / (smp.ch / 2)) * (o.scale || 1);
    const cnt = i1 - i0, stride = n / cnt;
    for (let i = i0; i < i1; i++) {
      const j = Math.min(n - 1, Math.floor((i - i0) * stride + rand() * stride)) * 5, px = smp.pts[j], py = smp.pts[j + 1];
      const jit = o.jitter ?? 0.6;
      s.pos[i * 3] = rect.cx + (px - smp.cw / 2 + (rand() - 0.5) * jit) * sc;
      s.pos[i * 3 + 1] = rect.cy - (py - smp.ch / 2 + (rand() - 0.5) * jit) * sc;
      s.pos[i * 3 + 2] = o.z ? o.z(px, py) : (rand() - 0.5) * (o.depth ?? 0.5);
      const c = o.color ? o.color(smp.pts[j + 2], smp.pts[j + 3], smp.pts[j + 4], px, py, i) : goldish();
      setC(s, i, c, o.colorD ? o.colorD(c) : null);
      s.size[i] = (o.size ?? 0.2) * (0.8 + rand() * 0.4);
      s.alpha[i] = o.alpha ?? 0.95;
      if (o.tag) o.tag(i, px, py);
    }
    return sc;
  }
  function fillDust(s, i0, rect, spread = 1.5) {
    for (let i = i0; i < N; i++) {
      const a = rand() * 6.283, r = Math.sqrt(rand());
      s.pos[i * 3] = rect.cx + Math.cos(a) * r * Math.max(rect.hw * spread * 1.3, Ww * 0.6);
      s.pos[i * 3 + 1] = rect.cy + Math.sin(a) * r * Math.max(rect.hh * spread * 1.6, Hw * 0.55);
      s.pos[i * 3 + 2] = -2 - rand() * 14;
      setC(s, i, goldish()); s.size[i] = 0.09 + rand() * 0.12; s.alpha[i] = 0.14 + rand() * 0.24;
    }
  }
  const TEXT = {};
  function textShape(key, lines, rect, fs, n0, sizeMul = 1) {
    const s = newShape(), lh = fs * 1.24, wmax = Math.max(...lines.map(l => [...l].length));
    const smp = sampleCanvas(Math.ceil(wmax * fs + 40), Math.ceil(lines.length * lh + 30), (g, cw) => {
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `700 ${fs}px "Noto Serif TC", "Noto Sans TC", serif`;
      lines.forEach((l, k) => g.fillText(l, cw / 2, 15 + lh * (k + 0.5)));
    }, 2);
    const n = Math.floor(N * n0);
    const sc = placeSample(s, smp, 0, n, rect, { size: 0.15 * sizeMul, jitter: 0.4, color: () => rand() < 0.15 ? CREAM : goldish() });
    fillDust(s, n, rect, 1.2);
    TEXT[key] = { lines, rect, fs, sc, n };
    s.text = true;
    return s;
  }
  // 讓主角立體、慢慢轉：yaw 左右擺、pitch 往後仰
  const spinOf = (cx, cy, yawA, yawW, pitch = 0, yaw0 = 0, cont = 0) => ({ cx, cy, yawA, yawW, pitch, yaw0, cont });

  const shapes = {};

  // ---- 開場的宇宙 ----
  function buildCosmos() {
    const s = newShape(), P = new Float32Array(N * 4), Rg = HERO.r;
    const pitch = 0.27, incl = 1.12, roll = phone ? -0.62 : -0.38;
    const ci = Math.cos(incl), si = Math.sin(incl), cr = Math.cos(roll), sr = Math.sin(roll);
    const pal = COSMOS === 2
      ? { core: [[1, 0.96, 0.84], [1, 0.86, 0.6]], inner: [[1, 0.86, 0.55], [0.95, 0.76, 0.4]], outer: [[0.96, 0.8, 0.45], [0.85, 0.66, 0.32], [0.75, 0.85, 1], [0.8, 0.72, 1]], hii: [1, 0.66, 0.35] }
      : { core: [[1, 0.97, 0.88], [1, 0.88, 0.66]], inner: [[1, 0.92, 0.76], [0.9, 0.9, 0.95]], outer: [[0.7, 0.8, 1], [0.6, 0.72, 1], [0.85, 0.9, 1]], hii: [1, 0.42, 0.68] };
    const cloudShare = COSMOS === 4 ? 0.14 : 0;
    for (let i = 0; i < N; i++) {
      const u = rand();
      let r, th, h, cd, sz, al, w;
      if (COSMOS === 3 || (COSMOS === 4 && u < cloudShare)) {
        // 星雲的雲：大顆、很淡、彩色
        const b = Math.floor(rand() * 5), bc = [[-0.25, 0.1], [0.3, -0.05], [0.05, 0.25], [-0.1, -0.25], [0.4, 0.3]][b];
        const k = COSMOS === 4 ? 1.6 : 1;
        const x = (bc[0] * k + gauss() * 0.16 * k) * Rg, y = (bc[1] * k + gauss() * 0.12 * k) * Rg;
        r = Math.hypot(x, y); th = Math.atan2(y, x); h = gauss() * Rg * 0.05;
        cd = [[0.25, 0.4, 1], [0.6, 0.3, 0.95], [1, 0.4, 0.65], [1, 0.75, 0.4], [0.35, 0.75, 1]][b];
        sz = 0.9 + rand() * 1.8; al = 0.05 + rand() * 0.08; w = 0.012 + rand() * 0.01;
        if (COSMOS === 3 && u > 0.34) {
          const cl = rand() < 0.5 ? [-0.12, 0.05] : [0.28, 0.12], wide = rand() < 0.4;
          const x2 = (wide ? (rand() - 0.5) * 1.6 : cl[0] + gauss() * 0.08) * Rg, y2 = (wide ? (rand() - 0.5) * 1.1 : cl[1] + gauss() * 0.06) * Rg;
          r = Math.hypot(x2, y2); th = Math.atan2(y2, x2);
          cd = [[1, 1, 1], [0.8, 0.88, 1], [1, 0.92, 0.75]][Math.floor(rand() * 3)];
          sz = 0.08 + rand() * 0.2 + (rand() < 0.04 ? 0.25 : 0); al = 0.55 + rand() * 0.45;
        }
      } else {
        const v = COSMOS === 4 ? (u - cloudShare) / (1 - cloudShare) : u;
        if (v < 0.2) {
          r = Rg * 0.15 * Math.abs(gauss()); th = rand() * 6.283; h = gauss() * Rg * 0.05;
          cd = mix3(pal.core[0], pal.core[1], rand()); sz = 0.2 + rand() * 0.3; al = 0.22 + rand() * 0.35;
        } else if (v < 0.82) {
          const arm = rand() < 0.5 ? 0 : Math.PI;
          r = Rg * (0.08 + 0.92 * Math.pow(rand(), 0.85));
          th = arm + Math.log(r / (Rg * 0.08)) / pitch * 0.42 + gauss() * (0.2 + 0.15 * r / Rg);
          h = gauss() * Rg * 0.012;
          const list = r / Rg < 0.4 ? pal.inner : pal.outer;
          cd = list[Math.floor(rand() * list.length)];
          sz = 0.09 + rand() * 0.16 + (rand() < 0.03 ? 0.22 : 0); al = 0.35 + rand() * 0.55;
        } else if (v < 0.88) {
          const arm = rand() < 0.5 ? 0 : Math.PI, rr = Rg * (0.35 + rand() * 0.55);
          r = rr + gauss() * Rg * 0.02; th = arm + Math.log(rr / (Rg * 0.08)) / pitch * 0.42 + gauss() * 0.05; h = gauss() * Rg * 0.01;
          cd = mix3(pal.hii, [1, 1, 1], rand() * 0.25); sz = 0.16 + rand() * 0.18; al = 0.55 + rand() * 0.4;
        } else {
          r = Rg * Math.pow(rand(), 0.6); th = rand() * 6.283; h = gauss() * Rg * 0.03;
          cd = [[1, 1, 1], [0.78, 0.86, 1], [1, 0.9, 0.7]][Math.floor(rand() * 3)]; sz = 0.07 + rand() * 0.12; al = 0.45 + rand() * 0.5;
        }
        w = 0.06 * (1.25 - r / Rg);
      }
      P.set([r, th, h, w], i * 4);
      setC(s, i, goldish(), cd); s.size[i] = sz; s.alpha[i] = al;
    }
    s.dyn = t => {
      for (let i = 0; i < N; i++) {
        const r = P[i * 4], th = P[i * 4 + 1] + t * P[i * 4 + 3], h = P[i * 4 + 2];
        const x = Math.cos(th) * r, z = Math.sin(th) * r, y1 = h * ci - z * si, z1 = h * si + z * ci;
        s.pos[i * 3] = HERO.cx + x * cr - y1 * sr; s.pos[i * 3 + 1] = HERO.cy + x * sr + y1 * cr; s.pos[i * 3 + 2] = z1;
      }
    };
    s.dyn(0);
    return finish(s);
  }

  // ---- 我是誰：立體笑臉，會眨眼、會笑 ----
  function buildSmiley() {
    const s = newShape();
    const feat = sampleCanvas(400, 400, g => {
      g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round";
      g.lineWidth = 16; g.beginPath(); g.arc(200, 200, 182, 0, 6.283); g.stroke();
      g.lineWidth = 15; g.beginPath(); g.moveTo(108, 120); g.lineTo(162, 152); g.lineTo(112, 182); g.stroke();
      g.beginPath(); g.moveTo(292, 120); g.lineTo(238, 152); g.lineTo(288, 182); g.stroke();
      g.beginPath(); g.moveTo(90, 212); g.quadraticCurveTo(200, 192, 314, 204); g.quadraticCurveTo(302, 332, 196, 340); g.quadraticCurveTo(102, 336, 90, 212); g.fill();
    }, 2);
    const fill = sampleCanvas(400, 400, g => { g.fillStyle = "#fff"; g.beginPath(); g.arc(200, 200, 168, 0, 6.283); g.fill(); }, 4);
    const R = Math.min(STAGE.hw, STAGE.hh) * 1.0, rect = { cx: STAGE.cx, cy: STAGE.cy, hw: R, hh: R };
    const a = Math.floor(N * 0.6), b = Math.floor(N * 0.84);
    const TAG = new Int8Array(N), BASE = new Float32Array(N * 2);
    const sph = (px, py) => { const dx = (px - 200) / 185, dy = (py - 200) / 185; return Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)) * R * 0.55; };
    placeSample(s, feat, 0, a, rect, { size: 0.24, z: sph, color: (r, g, bb, px, py) => py > 205 && Math.hypot(px - 200, py - 200) < 160 ? mix3(GOLD, DOWN, 0.3 + rand() * 0.2) : goldish(),
      tag: (i, px, py) => { const d = Math.hypot(px - 200, py - 200); TAG[i] = d > 170 ? 0 : py < 195 ? (px < 200 ? 1 : 2) : 3; } });
    placeSample(s, fill, a, b, rect, { size: 0.15, alpha: 0.3, z: sph, color: () => mix3(CREAM, GOLD_LT, rand()), tag: i => { TAG[i] = 4; } });
    fillDust(s, b, STAGE);
    for (let i = 0; i < N; i++) { BASE[i * 2] = s.pos[i * 3]; BASE[i * 2 + 1] = s.pos[i * 3 + 1]; }
    const eyeY = rect.cy - (151 - 200) * (R / 200);
    const mouthY = rect.cy - (270 - 200) * (R / 200);
    s.dyn = t => {
      const blink = bump(t % 3.4, 0, 0.22);                         // 眨眼
      const laugh = 1 + 0.07 * Math.sin(t * 7) * (0.5 + 0.5 * Math.sin(t * 0.9));   // 笑得一抖一抖
      for (let i = 0; i < b; i++) {
        const tg = TAG[i];
        if (tg === 1 || tg === 2) s.pos[i * 3 + 1] = eyeY + (BASE[i * 2 + 1] - eyeY) * (1 - 0.85 * blink);
        else if (tg === 3) s.pos[i * 3 + 1] = mouthY + (BASE[i * 2 + 1] - mouthY) * laugh;
      }
    };
    s.spin = spinOf(rect.cx, rect.cy, 0.45, 0.55, -0.08);
    s.bright = 1.15;
    return finish(s);
  }

  // ---- K 棒：實體用格子排、影線一條線 ----
  function candleParams(count, weights) {
    const ws = weights.reduce((a, b) => a + b, 0), K = new Int16Array(N).fill(-1), U = new Float32Array(N * 3);
    let i = 0;
    weights.forEach((w, k) => {
      const cnt = Math.max(2, Math.round(w / ws * count)), nw = Math.max(1, Math.round(cnt * 0.18)), nb = cnt - nw;
      const cols = Math.max(1, Math.round(Math.sqrt(nb * 0.35)));
      for (let j = 0; j < cnt && i < count; j++, i++) {
        K[i] = k;
        if (j < nb) { U[i * 3] = 0; U[i * 3 + 1] = ((j % cols) + 0.5) / cols; U[i * 3 + 2] = (Math.floor(j / cols) + 0.5) / Math.ceil(nb / cols); }
        else { U[i * 3] = 1; U[i * 3 + 1] = (j - nb + 0.5) / nw; U[i * 3 + 2] = 0; }
      }
    });
    for (; i < count; i++) { K[i] = weights.length - 1; U.set([0, rand(), rand()], i * 3); }
    return { K, U };
  }
  function onCandle(out, i3, xc, bw, yO, yC, yLo, yHi, u0, u1, u2, hollow) {
    if (u0 === 1) { out[i3] = xc; out[i3 + 1] = lerp(yLo, yHi, u1); return; }
    const y0 = Math.min(yO, yC), y1 = Math.max(yO, yC) + 0.0001;
    if (hollow) {
      const w = bw, h = y1 - y0, per = 2 * (w + h), d = ((u1 + u2 * 7.31) % 1) * per;
      if (d < w) { out[i3] = xc - w / 2 + d; out[i3 + 1] = y0; }
      else if (d < w + h) { out[i3] = xc + w / 2; out[i3 + 1] = y0 + (d - w); }
      else if (d < 2 * w + h) { out[i3] = xc + w / 2 - (d - w - h); out[i3 + 1] = y1; }
      else { out[i3] = xc - w / 2; out[i3 + 1] = y1 - (d - 2 * w - h); }
    } else { out[i3] = xc + (u1 - 0.5) * bw; out[i3 + 1] = lerp(y0, y1, u2); }
  }

  // ---- 天秤三態 ----
  const BAL = (() => {
    const yang = [], bal = [], yin = [];
    for (let k = 0; k < 12; k++) { const c = 3.2 + 1.4 * k, o = c - 1.7; yang.push({ o, c, hi: c + 0.4, lo: o - 0.3 }); }
    for (let k = 0; k < 7; k++) bal.push({ ...yang[k] });
    bal.push({ o: 11.3, c: 9.0, hi: 11.5, lo: 8.7 });
    bal.push({ o: 9.0, c: 10.8, hi: 11.2, lo: 8.9 }, { o: 10.8, c: 9.3, hi: 11.1, lo: 9.0 }, { o: 9.3, c: 11.0, hi: 11.4, lo: 9.1 }, { o: 11.0, c: 9.5, hi: 11.3, lo: 9.2 });
    for (let k = 0; k < 12; k++) { const o = 19 - 1.4 * k, c = o - 1.7; yin.push({ o, c, hi: o + 0.35, lo: c - 0.4 }); }
    return { yang, bal, yin, brokenLow: yang[6].lo };
  })();
  function buildBalance() {
    const s = newShape();
    const x0 = STAGE.cx - STAGE.hw * 0.94, x1 = STAGE.cx + STAGE.hw * 0.94, yb = STAGE.cy - STAGE.hh * 0.9, yt = STAGE.cy + STAGE.hh * 0.9;
    const dx = (x1 - x0) / 12, bw = dx * 0.62, Y = v => yb + v / 20 * (yt - yb);
    const nc = Math.floor(N * 0.8), nl = Math.floor(N * 0.05);
    const { K, U } = candleParams(nc, new Array(12).fill(1));
    fillDust(s, nc + nl, STAGE, 1.3);
    for (let i = nc; i < nc + nl; i++) { setC(s, i, GOLD); s.size[i] = 0.13; }
    const cur = new Array(12);
    s.dyn = (t, p) => {
      const a = sstep(0.27, 0.4, p), b = sstep(0.62, 0.75, p);
      for (let k = 0; k < 12; k++) {
        const A = BAL.yang[k], B = BAL.bal[k], C = BAL.yin[k];
        cur[k] = { o: lerp(lerp(A.o, B.o, a), C.o, b), c: lerp(lerp(A.c, B.c, a), C.c, b), hi: lerp(lerp(A.hi, B.hi, a), C.hi, b), lo: lerp(lerp(A.lo, B.lo, a), C.lo, b) };
      }
      for (let i = 0; i < nc; i++) {
        const k = K[i], c = cur[k], xc = x0 + (k + 0.5) * dx, up = c.c >= c.o;
        onCandle(s.pos, i * 3, xc, bw, Y(c.o), Y(c.c), Y(c.lo), Y(c.hi), U[i * 3], U[i * 3 + 1], U[i * 3 + 2], false);
        s.pos[i * 3 + 2] = (U[i * 3 + 1] - 0.5) * bw;   // K 棒有厚度
        setC(s, i, mix3(up ? UP : DOWN, [0, 0, 0], U[i * 3] ? 0.1 : 0), mix3(up ? UP : DOWN, [1, 1, 1], U[i * 3] ? 0.3 : 0.12));
        s.size[i] = U[i * 3] ? 0.13 : 0.18; s.alpha[i] = 0.95;
      }
      const la = a * (1 - b);
      for (let i = nc; i < nc + nl; i++) {
        const u = (i - nc) / nl;
        s.pos[i * 3] = lerp(x0 + dx * 5.5, x1, u); s.pos[i * 3 + 1] = Y(BAL.brokenLow); s.pos[i * 3 + 2] = 0;
        s.alpha[i] = la * (Math.floor(u * 26) % 2 === 0 ? 0.95 : 0);
      }
    };
    s.dyn(0, 0);
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.28, 0.4, -0.06);
    return finish(s);
  }

  // ---- 突破進場：像真的行情（電腦約 120 根、手機約 64 根） ----
  const BK = (() => {
    let sd = 99;
    const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const g = () => { const u = Math.max(1e-6, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
    const L = phoneNow ? 64 : 120, RUN = 9, pre = L - RUN - 1, U = Math.round(pre * 0.52) - 3;
    const out = []; let c = 100;
    const push = (o, cc, extra = {}) => out.push({ o, c: cc, ...extra });
    for (let k = 0; k < U; k++) { const o = c; c = o + 0.32 + g() * 1.05; push(o, c); }                       // 上漲
    { const o = c; c = o + 1.5; push(o, c); }                                                                  // 頂分型 1：漲
    { const o = c; c = o + 1.2; push(o, c, { top: true }); }                                                   // 頂分型 2：突破前高
    { const o = c; c = o - 2.8; push(o, c); }                                                                  // 頂分型 3：跌破前低
    const r0 = out.length;
    out.forEach(k => { k.hi = Math.max(k.o, k.c) + Math.abs(g()) * 0.45 + 0.1; k.lo = Math.min(k.o, k.c) - Math.abs(g()) * 0.45 - 0.1; });
    const topI = out.findIndex(k => k.top), top = out[topI];
    top.hi = Math.max(top.hi, out[topI - 1].hi + 0.5);
    out[topI + 1].lo = Math.min(out[topI + 1].lo, top.lo - 0.4);
    const TOP = top.hi, floor = TOP - 7.5;
    for (let k = r0; k < pre; k++) {                                                                           // 回撤盤整
      const o = c; let cc = o + (TOP - 3.6 - o) * 0.18 + g() * 0.95;
      cc = clamp(cc, floor + 1, TOP - 0.9);
      const hi = Math.min(Math.max(o, cc) + Math.abs(g()) * 0.4 + 0.1, TOP - 0.35), lo = Math.max(Math.min(o, cc) - Math.abs(g()) * 0.4 - 0.1, floor);
      push(o, cc, { hi, lo }); c = cc;
    }
    const r1 = out.length;
    { const o = c; push(o, TOP - 0.3, { br: true, hi: TOP + 0.08, lo: Math.min(o, TOP - 0.3) - 0.3 }); c = TOP - 0.3; }   // 影線碰到頂＝突破
    const inc = [3.2, 4.4, 5.8, 7.6, 9.6, 12, 15, 18.5, 22.5];
    inc.forEach(d => { const o = c; c = o + d; push(o, c, { run: true, hi: c + 0.6 + d * 0.06, lo: o - 0.3 }); });   // 往上噴
    out.forEach(k => { k.up = k.c >= k.o; });
    const stop = Math.min(...out.slice(r0, r1).map(k => k.lo));
    const pmin = Math.min(...out.map(k => k.lo)) - 0.6;
    return { k: out, L, TOP, stop, pmin, pmax0: TOP + 3, pmaxAll: Math.max(...out.map(k => k.hi)) + 1.5, br: r1, run0: r1 + 1, topI, r0, r1 };
  })();
  const RUN_T0 = 2.2, RUN_DT = 0.5, RUN_GROW = 0.24;
  const runAt = j => RUN_T0 + j * RUN_DT;          // 第 j 根噴發 K 棒出現的時間
  const RUN_END = runAt(8) + RUN_GROW;
  const SEQ_END = RUN_END + 2.6;
  const FLIPS = [RUN_T0, RUN_T0 + 0.1, RUN_T0 + 0.2, ...[1, 2, 3, 4, 5, 6, 7, 8].map(runAt), RUN_END + 0.35];   // 黑白切換跟重擊對拍，最後切回來
  const bseq = { start: -1, played: false, sfx: false, fl: false, hits: 0 };
  const bkState = { reveal: 0, runT: -1, scale: 1, marks: 0, glass: 0 };
  let BG = null;
  function buildBreakout() {
    const s = newShape(), L = BK.L;
    const x0 = CHART.cx - CHART.hw, x1 = CHART.cx + CHART.hw, yb = CHART.cy - CHART.hh * 0.92, yt = CHART.cy + CHART.hh * 0.92;
    const dx = (x1 - x0) / L, bw = dx * 0.68;
    const k0 = (yt - yb) / (BK.pmax0 - BK.pmin);
    BG = { x0, x1, yb, yt, dx, bw, xb: x0 + (BK.br + 0.5) * dx, k0, Y: (v, sc) => yb + (v - BK.pmin) * k0 * sc };
    const nc = Math.floor(N * 0.78), nm = Math.floor(N * 0.07);
    const w = BK.k.map(k => (Math.abs(k.c - k.o) + 0.5) * (k.run ? 1.6 : 1) + 0.9);
    const { K, U } = candleParams(nc, w);
    fillDust(s, nc + nm, CHART, 1.25);
    const MK = new Int8Array(N);
    for (let i = nc; i < nc + nm; i++) { const r = (i - nc) / nm; MK[i] = r < 0.42 ? 1 : r < 0.84 ? 2 : 3; setC(s, i, MK[i] === 2 ? DOWN : GOLD, MK[i] === 2 ? bright(DOWN) : GOLD_LT); s.size[i] = MK[i] === 3 ? 0.16 : 0.12; }
    for (let i = 0; i < nc; i++) { setC(s, i, INK, PAPER); s.size[i] = U[i * 3] ? 0.1 : 0.13; }
    const vis = new Float32Array(L);
    s.dyn = (t, p) => {
      const sc = bkState.scale, Y = v => BG.Y(v, sc), kv = bkState.reveal, rt = bkState.runT;
      let fx = x0 + dx * 0.5, fy = Y(BK.k[0].c);
      for (let k = 0; k < L; k++) {
        const kk = BK.k[k];
        const v = !kk.run ? clamp(kv - k, 0, 1) : (rt < 0 ? 0 : clamp((rt - (k - BK.run0) * RUN_DT) / RUN_GROW, 0, 1));
        vis[k] = v;
        if (v > 0) { fx = x0 + (k + 0.5) * dx; fy = Y(kk.o + (kk.c - kk.o) * v); }
      }
      bkState.vis = vis;
      for (let i = 0; i < nc; i++) {
        const k = K[i], kk = BK.k[k], v = vis[k], i3 = i * 3;
        if (v <= 0) { s.pos[i3] = fx; s.pos[i3 + 1] = fy; s.pos[i3 + 2] = 0; s.alpha[i] = 0; continue; }
        const yO = Y(kk.o), yC = Y(kk.o + (kk.c - kk.o) * v), yHi = Y(lerp(Math.max(kk.o, kk.c), kk.hi, v)), yLo = Y(lerp(Math.min(kk.o, kk.c), kk.lo, v));
        onCandle(s.pos, i3, x0 + (k + 0.5) * dx, kk.run ? bw * 1.9 : bw, yO, yC, yLo, yHi, U[i3], U[i3 + 1], U[i3 + 2], kk.up);
        s.pos[i3 + 2] = (U[i3 + 2] - 0.5) * 0.3;
        const solid = kk.run ? clamp(v * 1.4 - 0.2, 0, 1) : clamp((kv - k - 0.7) / 0.8, 0, 1);   // 真 K 棒浮出來後，粒子退成淡淡的光
        s.alpha[i] = 0.9 * Math.min(1, v * 3) * (1 - 0.72 * solid);
      }
      const mk = bkState.marks, xTop = x0 + (BK.topI + 0.5) * dx;
      for (let i = nc; i < nc + nm; i++) {
        const u = ((i - nc) % 97) / 97, i3 = i * 3;
        if (MK[i] === 1) { s.pos[i3] = lerp(xTop, x1, u); s.pos[i3 + 1] = Y(BK.TOP); s.alpha[i] = sstep(0.16, 0.22, p) * (1 - bkState.glass) * (Math.floor(u * 40) % 2 ? 0 : 0.95); }
        else if (MK[i] === 2) { s.pos[i3] = lerp(x0 + dx * BK.r0, x1, u); s.pos[i3 + 1] = Y(BK.stop); s.alpha[i] = mk * (Math.floor(u * 40) % 2 ? 0 : 0.9); }
        else { const a = u * 6.283 + t * 2, rr = Math.max(dx * 1.4, 0.5); s.pos[i3] = BG.xb + Math.cos(a) * rr; s.pos[i3 + 1] = Y(BK.TOP) + Math.sin(a) * rr; s.alpha[i] = mk; }
        s.pos[i3 + 2] = 0.2;
      }
    };
    s.dyn(0, 0);
    s.stiff = 2.4;
    s.candles = true;
    return finish(s);
  }

  // ---- 書：立體翻開，右邊的書頁會翻過去 ----
  function buildBook() {
    const s = newShape();
    const smp = sampleCanvas(600, 420, g => {
      g.strokeStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 10;
      g.beginPath(); g.moveTo(300, 80); g.quadraticCurveTo(170, 40, 40, 78); g.lineTo(40, 352); g.quadraticCurveTo(170, 318, 300, 360); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(300, 80); g.quadraticCurveTo(430, 40, 560, 78); g.lineTo(560, 352); g.quadraticCurveTo(430, 318, 300, 360); g.closePath(); g.stroke();
      g.lineWidth = 6;
      for (let k = 0; k < 7; k++) {
        const y = 118 + k * 30;
        g.beginPath(); g.moveTo(78, y); g.quadraticCurveTo(170, y - 22, 268, y + 4); g.stroke();
        g.beginPath(); g.moveTo(332, y + 4); g.quadraticCurveTo(430, y - 22, k === 6 ? 450 : 522, y); g.stroke();
      }
      g.lineWidth = 9; g.beginPath(); g.moveTo(470, 60); g.lineTo(470, 120); g.lineTo(485, 106); g.lineTo(500, 120); g.lineTo(500, 60); g.stroke();
    }, 2);
    const n = Math.floor(N * 0.82), PX = new Float32Array(N);
    const sc = placeSample(s, smp, 0, n, STAGE, { size: 0.19, jitter: 0.4, color: (r, g, b, px, py) => (px > 460 && py < 125) ? mix3(DOWN, GOLD, 0.4) : goldish(),
      z: px => -Math.abs(px - 300) / 260 * STAGE.hw * 0.35, tag: (i, px) => { PX[i] = px; } });
    fillDust(s, n, STAGE, 1.5);
    const BASE = s.pos.slice(0, n * 3);
    // 翻頁：另外一組粒子組成一張書頁，從右邊繞書脊翻到左邊
    const nf = Math.floor(n * 0.12), F = [];
    for (let i = 0; i < n && F.length < nf; i++) if (PX[i] > 320 && PX[i] < 540) F.push(i);
    s.dyn = t => {
      const c = t % 4.2, ang = Math.PI * sstep(0.6, 2.4, c), fade = 1 - sstep(2.6, 3.2, c);
      for (const i of F) {
        const bx = BASE[i * 3] - STAGE.cx, bz = BASE[i * 3 + 2];
        s.pos[i * 3] = STAGE.cx + bx * Math.cos(ang); s.pos[i * 3 + 2] = bz + bx * Math.sin(ang) * 0.9; s.pos[i * 3 + 1] = BASE[i * 3 + 1];
        s.alpha[i] = 0.95 * (ang > 0.01 ? fade : 1);
      }
    };
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.35, 0.45, -0.32);
    s.bright = 1.15;
    return finish(s);
  }

  // ---- 金句、道法術：拼字 ----
  const QUOTES = [
    { p: ["選擇不做什麼", "比做什麼重要"], d: ["選擇不做什麼", "比做什麼重要"] },
    { p: ["是敬畏", "不是預測"], d: ["是敬畏不是預測"] },
    { p: ["像由心生"], d: ["像由心生"] },
    { p: ["這個人，", "讓我開始用", "不同的方式", "思考世界"], d: ["這個人，讓我開始", "用不同的方式思考世界"] }
  ];
  function buildDao() {
    const rect = phone ? STAGE : { ...STAGE, hh: STAGE.hh * 0.6 };
    const s = textShape("dao", ["道　法　術"], rect, 170, 0.86, 1.15);
    const n = TEXT.dao.n, G = new Int8Array(N).fill(-1);
    for (let i = 0; i < n; i++) G[i] = clamp(Math.floor((s.pos[i * 3] - (rect.cx - rect.hw)) / (2 * rect.hw) * 3), 0, 2);
    const base = s.size.slice(), baseA = s.alpha.slice();
    s.dyn = (t, p) => {
      const e = [1 - sstep(0.28, 0.36, p), sstep(0.28, 0.36, p) * (1 - sstep(0.62, 0.7, p)), sstep(0.62, 0.7, p)];
      TEXT.dao.emph = e;
      for (let i = 0; i < n; i++) { const k = e[G[i]]; s.alpha[i] = baseA[i] * (0.22 + 0.78 * k); s.size[i] = base[i] * (0.75 + 0.4 * k); }
    };
    return finish(s);
  }
  const buildQuote = (q, i) => finish(textShape("q" + i, phone ? q.p : q.d, QUOTE, 150, 0.9));

  // ---- OX：傾斜的雷達＋手畫一個 W ----
  function buildOx() {
    const s = newShape();
    const R0 = Math.min(STAGE.hw, STAGE.hh) * 0.98, tilt = -0.9, ct = Math.cos(tilt), st = Math.sin(tilt);
    const nr = Math.floor(N * 0.22), ns = Math.floor(N * 0.05), nw = Math.floor(N * 0.1), np = Math.floor(N * 0.4), nt = Math.floor(N * 0.04);
    const T = new Int8Array(N), R = new Float32Array(N * 2);
    let i = 0;
    for (; i < nr; i++) { T[i] = 0; R[i * 2] = [0.35, 0.65, 0.97][i % 3]; R[i * 2 + 1] = rand() * 6.283; }
    for (; i < nr + ns; i++) { T[i] = 1; R[i * 2] = rand(); R[i * 2 + 1] = Math.floor(rand() * 8) * 0.785; }
    for (; i < nr + ns + nw; i++) { T[i] = 2; R[i * 2] = Math.sqrt(rand()); R[i * 2 + 1] = rand(); }
    for (; i < nr + ns + nw + np; i++) { T[i] = 3; R[i * 2] = (i - nr - ns - nw) / np; R[i * 2 + 1] = (rand() - 0.5); }
    for (; i < nr + ns + nw + np + nt; i++) { T[i] = 4; R[i * 2] = rand() * 6.283; R[i * 2 + 1] = rand(); }
    const nEnd = i;
    fillDust(s, nEnd, STAGE, 1.4);
    for (let j = 0; j < nEnd; j++) {
      const k = T[j];
      setC(s, j, k === 0 || k === 1 ? mix3(BLUE, BLUE_LT, rand()) : k === 2 ? GOLD_LT : k === 3 ? goldish() : CREAM);
      s.size[j] = k === 3 ? 0.21 : k === 4 ? 0.26 : 0.13;
      s.alpha[j] = k === 0 ? 0.55 : k === 1 ? 0.25 : 0.95;
    }
    const Wp = [[-0.95, 0.6], [-0.55, -0.55], [-0.1, 0.15], [0.35, -0.55], [0.9, 0.7]];
    const segL = []; let tot = 0;
    for (let k = 1; k < Wp.length; k++) { const l = Math.hypot(Wp[k][0] - Wp[k - 1][0], Wp[k][1] - Wp[k - 1][1]); segL.push(l); tot += l; }
    const at = u => { let d = u * tot; for (let k = 0; k < segL.length; k++) { if (d <= segL[k] || k === segL.length - 1) { const f = clamp(d / segL[k], 0, 1); return [lerp(Wp[k][0], Wp[k + 1][0], f), lerp(Wp[k][1], Wp[k + 1][1], f)]; } d -= segL[k]; } return Wp[Wp.length - 1]; };
    const disc = (x, y) => [STAGE.cx + x, STAGE.cy - STAGE.hh * 0.18 + y * ct, y * st];   // 雷達平躺、往後傾
    s.dyn = t => {
      const cyc = t % 6.2, draw = clamp(cyc / 2.6, 0, 1), fade = 1 - sstep(4.8, 5.6, cyc), sw = t * 1.3;
      const pp = at(draw), penX = STAGE.cx + pp[0] * STAGE.hw * 0.95, penY = STAGE.cy + pp[1] * STAGE.hh * 0.75 + STAGE.hh * 0.12;
      for (let j = 0; j < nEnd; j++) {
        const k = T[j], a = R[j * 2], b = R[j * 2 + 1];
        let x, y, z = 0.5;
        if (k === 0) { const ang = b + t * 0.05, q = disc(Math.cos(ang) * a * R0, Math.sin(ang) * a * R0); x = q[0]; y = q[1]; z = q[2]; }
        else if (k === 1) { const q = disc(Math.cos(b) * a * R0, Math.sin(b) * a * R0); x = q[0]; y = q[1]; z = q[2]; }
        else if (k === 2) { const ang = sw - b * 0.9, q = disc(Math.cos(ang) * a * R0, Math.sin(ang) * a * R0); x = q[0]; y = q[1]; z = q[2]; s.alpha[j] = 0.9 * (1 - b); }
        else if (k === 3) {
          if (a <= draw) { const q = at(a); x = STAGE.cx + q[0] * STAGE.hw * 0.95 + b * 0.16; y = STAGE.cy + q[1] * STAGE.hh * 0.75 + STAGE.hh * 0.12 + Math.sin(a * 40) * 0.05; s.alpha[j] = 0.95 * fade; }
          else { x = penX; y = penY; s.alpha[j] = 0; }
        } else { x = penX + Math.cos(a + t * 6) * b * 0.35; y = penY + Math.sin(a + t * 6) * b * 0.35; s.alpha[j] = draw < 1 ? 1 : 0.5 * fade; }
        s.pos[j * 3] = x; s.pos[j * 3 + 1] = y; s.pos[j * 3 + 2] = z;
      }
    };
    s.dyn(0);
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.3, 0.35, 0);
    s.bright = 1.12;
    return finish(s);
  }

  // ---- 合成市場：立體的球 ----
  function buildMerge() {
    const s = newShape();
    const nb = Math.floor(N * 0.8), U = new Float32Array(N * 3), cols = [GOLD, BLUE_LT, GOLD_LT, CREAM];
    for (let i = 0; i < nb; i++) {
      const zz = rand() * 2 - 1, a = rand() * 6.283, rr = Math.sqrt(1 - zz * zz);
      U[i * 3] = Math.cos(a) * rr; U[i * 3 + 1] = Math.sin(a) * rr; U[i * 3 + 2] = zz;
      setC(s, i, mix3(cols[i % 4], [1, 1, 1], 0.1)); s.size[i] = 0.16; s.alpha[i] = 0.4 + 0.55 * Math.max(0, zz);
    }
    fillDust(s, nb, STAGE, 1.4);
    const rA = Math.min(STAGE.hw, STAGE.hh) * 0.3, A = [[-0.5, 0.45], [0.5, 0.45], [-0.5, -0.45], [0.5, -0.45]];
    s.dyn = t => {
      const c = t % 6.2, m1 = sstep(1.6, 2.4, c), m2 = sstep(3.4, 4.2, c), pop = sstep(5.5, 6.1, c);
      const spin = t * 0.7, cs = Math.cos(spin), sn = Math.sin(spin);
      for (let i = 0; i < nb; i++) {
        const j = i % 4;
        let x = lerp(lerp(A[j][0], 0, m1), 0, m2), y = lerp(A[j][1], 0, m2);
        let r = rA * lerp(lerp(1, 1.45, m1), 2.1, m2);
        if (pop > 0) { x = lerp(x, A[j][0], pop); y = lerp(y, A[j][1], pop); r = lerp(r, rA, pop) * (1 + bump(pop, 0, 1) * 0.8); }
        const ux = U[i * 3] * cs + U[i * 3 + 2] * sn, uz = -U[i * 3] * sn + U[i * 3 + 2] * cs;
        s.pos[i * 3] = STAGE.cx + x * STAGE.hw * 0.7 + ux * r; s.pos[i * 3 + 1] = STAGE.cy + y * STAGE.hh * 0.75 + U[i * 3 + 1] * r; s.pos[i * 3 + 2] = uz * r;
        s.alpha[i] = 0.35 + 0.6 * Math.max(0, uz);
      }
    };
    s.dyn(0);
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.2, 0.3, -0.1);
    s.bright = 1.1;
    return finish(s);
  }

  // ---- 影片：畫框＋播放鍵 ----
  function buildFilms() {
    const s = newShape();
    const smp = sampleCanvas(520, 360, g => {
      g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = 12; g.lineJoin = "round";
      g.beginPath(); g.moveTo(66, 30); g.arcTo(490, 30, 490, 330, 36); g.arcTo(490, 330, 30, 330, 36); g.arcTo(30, 330, 30, 30, 36); g.arcTo(30, 30, 490, 30, 36); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(222, 118); g.lineTo(222, 242); g.lineTo(326, 180); g.closePath(); g.fill();
      for (let k = 0; k < 9; k++) { g.fillRect(62 + k * 46, 48, 20, 14); g.fillRect(62 + k * 46, 298, 20, 14); }
    }, 2);
    const n = Math.floor(N * 0.8), PL = new Int8Array(N), BASE = new Float32Array(N * 2);
    placeSample(s, smp, 0, n, TOPC, { size: 0.2, jitter: 0.4, color: (r, g, b, px, py) => (px > 210 && px < 330 && py > 110 && py < 250) ? CREAM : goldish(),
      tag: (i, px, py) => { PL[i] = (px > 210 && px < 330 && py > 110 && py < 250) ? 1 : 0; } });
    fillDust(s, n, TOPC, 1.6);
    for (let i = 0; i < n; i++) { BASE[i * 2] = s.pos[i * 3]; BASE[i * 2 + 1] = s.pos[i * 3 + 1]; }
    s.dyn = t => {   // 播放鍵一跳一跳
      const k = 1 + 0.12 * Math.max(0, Math.sin(t * 3));
      for (let i = 0; i < n; i++) if (PL[i]) { s.pos[i * 3] = TOPC.cx + (BASE[i * 2] - TOPC.cx) * k; s.pos[i * 3 + 1] = TOPC.cy + (BASE[i * 2 + 1] - TOPC.cy) * k; s.pos[i * 3 + 2] = 1.5 * (k - 1) * 8; }
    };
    s.spin = spinOf(TOPC.cx, TOPC.cy, 0.3, 0.4, -0.1);
    s.bright = 1.12;
    return finish(s);
  }

  // ---- 結尾：雙極 logo，兩半分開又合起來、慢慢轉 ----
  function buildLogo(img) {
    const s = newShape();
    const smp = sampleCanvas(300, 300, g => g.drawImage(img, 0, 0, 300, 300), 2);
    const n = Math.floor(N * 0.8), R = Math.min(STAGE.hw, STAGE.hh) * 1.12, rect = { cx: STAGE.cx, cy: STAGE.cy, hw: R, hh: R };
    const HALF = new Int8Array(N);
    placeSample(s, smp, 0, n, rect, { size: 0.21, jitter: 0.4, depth: 1.2, color: (r, g, b) => (r + g + b) / 3 < 130 ? mix3(BLUE, BLUE_LT, rand()) : mix3(GOLD_LT, CREAM, rand()),
      tag: (i, px, py) => { HALF[i] = px + py < 300 ? 0 : 1; } });
    const BASE = s.pos.slice(0, n * 3);
    const H0 = new Float32Array(N * 2);
    for (let i = n; i < N; i++) { H0[i * 2] = rand() * 6.283; H0[i * 2 + 1] = 1.2 + rand() * 0.55; setC(s, i, goldish()); s.size[i] = 0.12 + rand() * 0.1; s.alpha[i] = 0.35 + rand() * 0.4; }
    s.dyn = t => {
      const gap = 0.16 * R * (1 - sstep(0.4, 1.6, t % 5.5)) + 0.16 * R * sstep(4.4, 5.4, t % 5.5);   // 分開 → 合起來
      for (let i = 0; i < n; i++) { const d = HALF[i] ? 1 : -1; s.pos[i * 3] = BASE[i * 3] + d * gap * 0.7; s.pos[i * 3 + 1] = BASE[i * 3 + 1] - d * gap * 0.7; }
      for (let i = n; i < N; i++) {
        const a = H0[i * 2] + t * 0.25, r = R * H0[i * 2 + 1];
        s.pos[i * 3] = rect.cx + Math.cos(a) * r; s.pos[i * 3 + 1] = rect.cy + Math.sin(a) * r * 0.9; s.pos[i * 3 + 2] = Math.sin(a * 2) * 2;
      }
    };
    s.dyn(0);
    s.spin = spinOf(rect.cx, rect.cy, 0.55, 0.32, 0);
    s.bright = 1.15;
    return finish(s);
  }

  let logoImg = null, textReady = false;
  function buildAll() {
    seed = 7;
    shapes.nebula = buildCosmos();
    shapes.smiley = buildSmiley();
    shapes.balance = buildBalance();
    shapes.breakout = buildBreakout();
    shapes.book = buildBook();
    shapes.ox = buildOx();
    shapes.merge = buildMerge();
    shapes.films = buildFilms();
    if (logoImg) shapes.logo = buildLogo(logoImg);
    if (textReady) { shapes.dao = buildDao(); QUOTES.forEach((q, i) => { shapes["q" + i] = buildQuote(q, i); }); }
    buildCandleMeshes();
  }

  // ---------- 真的 K 棒（粒子聚好之後浮出來） ----------
  const candleMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { ...shared, uBorder: { value: 0.06 } },
    vertexShader: `attribute float aUp; attribute float aVis; attribute float aGlow;
      varying vec2 vUv; varying vec2 vSize; varying float vUp; varying float vVis; varying float vGlow;
      void main(){ vUv = uv; vSize = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        vUp = aUp; vVis = aVis; vGlow = aGlow;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `precision highp float;
      ${MASK}
      uniform float uBorder; varying vec2 vUv; varying vec2 vSize; varying float vUp; varying float vVis; varying float vGlow;
      void main(){
        if (vVis < 0.01) discard;
        float bx = uBorder / max(vSize.x, 1e-3), by = uBorder / max(vSize.y, 1e-3);
        if (vUp > 0.5 && vUv.x > bx && vUv.x < 1.0 - bx && vUv.y > by && vUv.y < 1.0 - by) discard;   // 陽線空心
        float m = maskAt(gl_FragCoord.xy);
        vec3 c = mix(vec3(0.106, 0.122, 0.153), vec3(0.97, 0.95, 0.9), m);
        c = mix(c, vec3(1.0, 0.86, 0.5), vGlow * (0.35 + 0.35 * m));
        gl_FragColor = vec4(c, vVis);
      }`
  });
  let bodies = null, wicks = null;
  function buildCandleMeshes() {
    if (bodies) { scene.remove(bodies, wicks); bodies.geometry.dispose(); wicks.geometry.dispose(); }
    const L = BK.L, plane = new THREE.PlaneGeometry(1, 1);
    const mk = (count) => {
      const g = plane.clone();
      g.setAttribute("aUp", new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute("aVis", new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute("aGlow", new THREE.InstancedBufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
      const m = new THREE.InstancedMesh(g, candleMat, count);
      m.frustumCulled = false; m.renderOrder = 3; scene.add(m);
      return m;
    };
    bodies = mk(L); wicks = mk(L * 2);
    candleMat.uniforms.uBorder.value = Math.max(0.045, BG.bw * 0.2);
  }
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  function updateCandleMeshes(on) {
    const L = BK.L, vis = bkState.vis, sc = bkState.scale;
    const bu = bodies.geometry.attributes, wu = wicks.geometry.attributes;
    for (let k = 0; k < L; k++) {
      const kk = BK.k[k], v = vis ? vis[k] : 0;
      const solid = on ? (kk.run ? clamp(v * 1.4 - 0.2, 0, 1) : clamp((bkState.reveal - k - 0.7) / 0.8, 0, 1)) : 0;
      const xc = BG.x0 + (k + 0.5) * BG.dx, w = kk.run ? BG.bw * 1.9 : BG.bw;
      const yO = BG.Y(kk.o, sc), yC = BG.Y(kk.o + (kk.c - kk.o) * Math.max(v, 0.0001), sc);
      const y0 = Math.min(yO, yC), y1 = Math.max(yO, yC), h = Math.max(y1 - y0, 0.04);
      m4.compose(v3.set(xc, (y0 + y1) / 2, 0.3), q4, s3.set(w, h, 1)); bodies.setMatrixAt(k, m4);
      bu.aUp.array[k] = kk.up ? 1 : 0; bu.aVis.array[k] = solid; bu.aGlow.array[k] = kk.run ? 1 : 0;
      const hiY = BG.Y(lerp(Math.max(kk.o, kk.c), kk.hi, v), sc), loY = BG.Y(lerp(Math.min(kk.o, kk.c), kk.lo, v), sc), ww = Math.max(0.035, BG.bw * 0.14);
      m4.compose(v3.set(xc, (y1 + hiY) / 2, 0.29), q4, s3.set(ww, Math.max(hiY - y1, 0.0001), 1)); wicks.setMatrixAt(k * 2, m4);
      m4.compose(v3.set(xc, (loY + y0) / 2, 0.29), q4, s3.set(ww, Math.max(y0 - loY, 0.0001), 1)); wicks.setMatrixAt(k * 2 + 1, m4);
      for (const j of [k * 2, k * 2 + 1]) { wu.aUp.array[j] = 0; wu.aVis.array[j] = solid; wu.aGlow.array[j] = kk.run ? 1 : 0; }
    }
    for (const m of [bodies, wicks]) { m.instanceMatrix.needsUpdate = true; const a = m.geometry.attributes; a.aUp.needsUpdate = a.aVis.needsUpdate = a.aGlow.needsUpdate = true; }
  }

  // ---------- 正在噴的那根外面一圈金光 ----------
  const auraMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uA: { value: 0 }, uAsp: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uA, uAsp; varying vec2 vUv;
      void main(){ vec2 q = (vUv - 0.5) * 2.0;
        float hx = exp(-q.x * q.x * 5.0) * (1.0 - smoothstep(0.7, 1.0, abs(q.x)));   // 四邊都柔和淡出，看不到長方形
        float vy = 1.0 - smoothstep(0.45, 1.0, abs(q.y));
        float a = hx * vy * uA; if (a < 0.004) discard; gl_FragColor = vec4(1.0, 0.8, 0.38, a); }`
  });
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), auraMat);
  aura.renderOrder = 2; aura.frustumCulled = false; aura.visible = false; scene.add(aura);

  // ---------- 玻璃牆、碎片、速度線 ----------
  const glassMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { ...shared, uA: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; ${MASK} uniform float uA; varying vec3 vN; varying vec3 vV;
      void main(){ float m = maskAt(gl_FragCoord.xy); float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        vec3 tint = mix(vec3(0.42, 0.55, 0.68), vec3(0.8, 0.9, 1.0), m);
        gl_FragColor = vec4(mix(tint, vec3(1.0), f), (0.14 + f * 0.6) * uA); }`
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glassMat);
  glass.renderOrder = 4; glass.visible = false; scene.add(glass);
  const NSH = 160;
  const shardGeo = new THREE.BufferGeometry();
  shardGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0.62, 0, -0.5, -0.4, 0, 0.56, -0.3, 0]), 3));
  shardGeo.setAttribute("bary", new THREE.BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), 3));
  shardGeo.setAttribute("aLife", new THREE.InstancedBufferAttribute(new Float32Array(NSH), 1).setUsage(THREE.DynamicDrawUsage));
  const shardMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { ...shared },
    vertexShader: `attribute vec3 bary; attribute float aLife; varying vec3 vB; varying float vL;
      void main(){ vB = bary; vL = aLife; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `precision highp float; ${MASK} varying vec3 vB; varying float vL;
      void main(){ if (vL < 0.01) discard; float m = maskAt(gl_FragCoord.xy); float e = min(vB.x, min(vB.y, vB.z));
        float edge = smoothstep(0.09, 0.0, e);
        vec3 tint = mix(vec3(0.35, 0.47, 0.6), vec3(0.85, 0.93, 1.0), m);
        gl_FragColor = vec4(mix(tint, vec3(1.0), edge), (0.22 + 0.7 * edge) * vL); }`
  });
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, NSH);
  shards.frustumCulled = false; shards.renderOrder = 5; scene.add(shards);
  const SH = { p: new Float32Array(NSH * 3), v: new Float32Array(NSH * 3), r: new Float32Array(NSH * 3), w: new Float32Array(NSH * 3), s: new Float32Array(NSH), life: new Float32Array(NSH) };
  function shatter() {
    const yT = BG.Y(BK.TOP, 1), x0 = BG.x0, x1 = BG.x1, xb = BG.xb;
    for (let i = 0; i < NSH; i++) {
      const near = i < NSH * 0.6, x = near ? xb + gauss() * (x1 - x0) * 0.06 : lerp(x0, x1, rand());
      SH.p.set([x, yT, (rand() - 0.5) * 2.2], i * 3);
      const dx = x - xb, sp = (near ? 9 : 4) * (0.5 + rand());
      SH.v.set([dx * 0.8 + gauss() * 2.5, sp + rand() * 6, gauss() * 4], i * 3);
      SH.r.set([rand() * 6.28, rand() * 6.28, rand() * 6.28], i * 3);
      SH.w.set([gauss() * 6, gauss() * 6, gauss() * 6], i * 3);
      SH.s[i] = (near ? 0.25 : 0.4) + rand() * 0.5; SH.life[i] = 1;
    }
  }
  const eul = new THREE.Euler();
  function updateShards(dt) {
    const la = shards.geometry.attributes.aLife;
    for (let i = 0; i < NSH; i++) {
      if (SH.life[i] <= 0) { la.array[i] = 0; continue; }
      SH.life[i] = Math.max(0, SH.life[i] - dt / 1.5);
      for (let a = 0; a < 3; a++) { SH.p[i * 3 + a] += SH.v[i * 3 + a] * dt; SH.r[i * 3 + a] += SH.w[i * 3 + a] * dt; }
      SH.v[i * 3 + 1] -= 9 * dt;
      eul.set(SH.r[i * 3], SH.r[i * 3 + 1], SH.r[i * 3 + 2]); q4.setFromEuler(eul);
      m4.compose(v3.set(SH.p[i * 3], SH.p[i * 3 + 1], SH.p[i * 3 + 2]), q4, s3.setScalar(SH.s[i])); shards.setMatrixAt(i, m4);
      la.array[i] = SH.life[i];
    }
    q4.identity();
    shards.instanceMatrix.needsUpdate = true; la.needsUpdate = true;
  }
  const NL = 150;
  const lineGeo = new THREE.BufferGeometry();
  const LP = new Float32Array(NL * 6), LA = new Float32Array(NL * 2);
  lineGeo.setAttribute("position", new THREE.BufferAttribute(LP, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute("aA", new THREE.BufferAttribute(LA, 1).setUsage(THREE.DynamicDrawUsage));
  const lineMat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { ...shared, uA: { value: 0 } },
    vertexShader: `attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: `precision highp float; ${MASK} uniform float uA; varying float vA;
      void main(){ float m = maskAt(gl_FragCoord.xy); gl_FragColor = vec4(mix(vec3(0.1, 0.12, 0.16), vec3(1.0, 0.95, 0.85), m), vA * uA); }`
  });
  const speed = new THREE.LineSegments(lineGeo, lineMat);
  speed.frustumCulled = false; speed.renderOrder = 2; scene.add(speed);
  const SL = { x: new Float32Array(NL), y: new Float32Array(NL), z: new Float32Array(NL), len: new Float32Array(NL) };
  for (let i = 0; i < NL; i++) { SL.x[i] = (rand() - 0.5) * 2; SL.y[i] = rand(); SL.z[i] = (rand() - 0.5) * 2; SL.len[i] = 0.6 + rand() * 1.4; }
  function updateSpeed(dt, a, cx, cy, span) {
    lineMat.uniforms.uA.value = a;
    speed.visible = a > 0.01;
    if (!speed.visible) return;
    for (let i = 0; i < NL; i++) {
      SL.y[i] -= dt * 1.6; if (SL.y[i] < 0) SL.y[i] += 1;
      const x = cx + SL.x[i] * span * 0.9, z = SL.z[i] * span * 0.5, y = cy + (SL.y[i] - 0.5) * span * 2.4, l = SL.len[i] * span * 0.35;
      LP.set([x, y, z, x, y + l, z], i * 6); LA[i * 2] = 0.55; LA[i * 2 + 1] = 0;
    }
    lineGeo.attributes.position.needsUpdate = true; lineGeo.attributes.aA.needsUpdate = true;
  }

  // ---------- 粒子 ----------
  const P = new Float32Array(NP * 3), V = new Float32Array(N * 3);
  const KS = new Float32Array(N), DL = new Float32Array(N), PH = new Float32Array(N), TJ = new Float32Array(N * 2);
  const col = new Float32Array(NP * 3), colD = new Float32Array(NP * 3), size = new Float32Array(NP), alpha = new Float32Array(NP), lightA = new Float32Array(NP).fill(1);
  buildAll();
  const allText = "道法術選擇不做什麼比做什麼重要是敬畏不是預測像由心生這個人，讓我開始用不同的方式思考世界　";
  Promise.race([
    Promise.all([document.fonts.load(`700 150px "Noto Serif TC"`, allText), new Promise(r => { const im = new Image(); im.onload = () => { logoImg = im; r(); }; im.onerror = r; im.src = "media/logo.png"; })]),
    new Promise(r => setTimeout(r, 3500))
  ]).then(() => { textReady = true; buildAll(); measure(); });
  const shapeOf = key => shapes[key] || shapes.book;

  for (let i = 0; i < N; i++) {   // 開場：從中心爆開，再旋成宇宙
    const a = rand() * 6.283, b = Math.acos(2 * rand() - 1), sp = reduce ? 0 : 0.5 + rand() * 1.4;
    P[i * 3] = HERO.cx + (rand() - 0.5) * 0.6; P[i * 3 + 1] = HERO.cy + (rand() - 0.5) * 0.6; P[i * 3 + 2] = (rand() - 0.5) * 0.6;
    if (reduce) { const j = i * 3; P[j] = shapes.nebula.pos[j]; P[j + 1] = shapes.nebula.pos[j + 1]; P[j + 2] = shapes.nebula.pos[j + 2]; }
    V[i * 3] = Math.sin(b) * Math.cos(a) * sp; V[i * 3 + 1] = Math.sin(b) * Math.sin(a) * sp; V[i * 3 + 2] = Math.cos(b) * sp;
    KS[i] = 0.03 + rand() * 0.045; DL[i] = i / N; PH[i] = rand() * 6.283;
    TJ[i * 2] = rand() < 0.42 ? 0 : rand() < 0.8 ? 1 : 2; TJ[i * 2 + 1] = rand();   // 太極上的位置：外圈、S 線、兩個小圓
  }
  const SZ = [-170, 45];   // 星塵：滿畫面，滑動時往鏡頭飛
  for (let j = 0; j < NS; j++) {
    const p = N + j, p3 = p * 3;
    P[p3] = (rand() - 0.5) * Ww * 2.6; P[p3 + 1] = (rand() - 0.5) * Hw * 2.6; P[p3 + 2] = lerp(SZ[0], SZ[1], rand());
    const c = [[1, 1, 1], [0.78, 0.86, 1], [1, 0.9, 0.7], [0.9, 0.8, 1]][Math.floor(rand() * 4)];
    col.set(mix3(GOLD_DK, GOLD, rand()), p3); colD.set(c, p3);
    size[p] = 0.08 + rand() * 0.15 + (rand() < 0.04 ? 0.2 : 0); alpha[p] = 0.5 + rand() * 0.5; lightA[p] = 0.3;
  }
  const geo = new THREE.BufferGeometry();
  const attr = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", attr(P, 3)); geo.setAttribute("aColor", attr(col, 3)); geo.setAttribute("aColorD", attr(colD, 3));
  geo.setAttribute("aSize", attr(size, 1)); geo.setAttribute("aAlpha", attr(alpha, 1)); geo.setAttribute("aLight", new THREE.BufferAttribute(lightA, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { ...shared, uScale: { value: 1 }, uBoost: { value: 1 }, uMaxPx: { value: 24 } },
    vertexShader: `attribute vec3 aColor; attribute vec3 aColorD; attribute float aSize; attribute float aAlpha; attribute float aLight;
      uniform float uScale, uBoost, uMaxPx; varying vec3 vC; varying vec3 vCD; varying float vA; varying float vL;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, uMaxPx);
        vC = aColor; vCD = aColorD; vA = aAlpha * uBoost; vL = aLight; }`,
    fragmentShader: `precision highp float;
      ${MASK}
      varying vec3 vC; varying vec3 vCD; varying float vA; varying float vL;
      void main(){ float d = length(gl_PointCoord - 0.5); float m = maskAt(gl_FragCoord.xy);
        float a = (smoothstep(0.5, 0.1, d) + smoothstep(0.5, 0.0, d) * 0.35 * m) * vA * mix(vL, 1.0, m);
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(vC, vCD, m), min(a, 1.0)); }`
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; points.renderOrder = 1;
  scene.add(points);

  const T = { x: new Float32Array(NT), y: new Float32Array(NT), z: new Float32Array(NT), vx: new Float32Array(NT), vy: new Float32Array(NT), vz: new Float32Array(NT), life: new Float32Array(NT), span: new Float32Array(NT).fill(1), big: new Float32Array(NT), n: 0 };
  function spark(x, y, z, vx, vy, vz, span, big) { const j = T.n++ % NT; T.x[j] = x; T.y[j] = y; T.z[j] = z; T.vx[j] = vx; T.vy[j] = vy; T.vz[j] = vz; T.life[j] = 1; T.span[j] = span; T.big[j] = big; }

  // ---------- 尺寸 ----------
  let dpr = 1, dprCap = 2;
  function resize(rebuild) {
    layout();
    dpr = Math.min(devicePixelRatio || 1, phone ? 2 : 1.75, dprCap);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    mat.uniforms.uScale.value = H * dpr / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    mat.uniforms.uMaxPx.value = 16 * dpr;
    shared.uRes.value.set(W * dpr, H * dpr);
    const k = H / Hw * dpr;
    bgMat.uniforms.uGal.value.set(W * dpr / 2 + HERO.cx * k, H * dpr / 2 + HERO.cy * k);
    bgMat.uniforms.uGalR.value = HERO.r * k;
    if (rebuild) buildAll();
    measure();
  }
  resize(false);
  let lastW = innerWidth, lastH = innerHeight, rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const big = Math.abs(innerWidth - lastW) > 2 || Math.abs(innerHeight - lastH) > 140;
      lastW = innerWidth; lastH = innerHeight;
      resize(big);
    }, 180);
  });

  // ---------- 互動 ----------
  const ptr = { x: -1e4, y: -1e4, at: -1e9, down: false, downAt: 0, dx: 0, dy: 0, still: 0, holdOn: false };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  const worldAt = (x, y) => { ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null; };
  let lastTrail = null;
  function onMove(x, y) {
    if (Math.hypot(x - ptr.x, y - ptr.y) > 6) { ptr.still = performance.now(); ptr.holdOn = false; }
    ptr.x = x; ptr.y = y; ptr.at = performance.now();
    if (reduce) return;
    const from = lastTrail && performance.now() - lastTrail.at < 120 ? lastTrail : { x, y };
    const steps = Math.min(24, Math.max(1, Math.round(Math.hypot(x - from.x, y - from.y) / 5)));
    for (let k = 1; k <= steps; k++) {
      const p = worldAt(lerp(from.x, x, k / steps), lerp(from.y, y, k / steps));
      if (p) spark(p.x + (rand() - 0.5) * 0.1, p.y + (rand() - 0.5) * 0.1, 1, (rand() - 0.5) * 0.4, 0.4 + rand() * 0.4, 0, 0.9, 1);
    }
    lastTrail = { x, y, at: performance.now() };
  }
  addEventListener("pointermove", e => onMove(e.clientX, e.clientY), { passive: true });
  addEventListener("touchmove", e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });
  addEventListener("pointerdown", e => { ptr.down = true; ptr.downAt = ptr.still = performance.now(); ptr.dx = e.clientX; ptr.dy = e.clientY; ptr.x = e.clientX; ptr.y = e.clientY; ptr.at = performance.now(); }, { passive: true });
  let tapQ = null;
  addEventListener("pointerup", e => {
    const quick = performance.now() - ptr.downAt < 260 && Math.hypot(e.clientX - ptr.dx, e.clientY - ptr.dy) < 10;
    const onUi = e.target && e.target.closest && e.target.closest("a, button, .avatar, video");
    if (quick && !onUi && !reduce) {
      tapQ = { x: e.clientX, y: e.clientY, s: 1 };
      const p = worldAt(e.clientX, e.clientY);
      if (p) for (let k = 0; k < 40; k++) { const a = (k / 40) * 6.283; spark(p.x, p.y, 1, Math.cos(a) * 9, Math.sin(a) * 9, 0, 0.75, 1.3); }
    }
    ptr.down = false; ptr.holdOn = false;
  }, { passive: true });
  addEventListener("pointercancel", () => { ptr.down = false; ptr.holdOn = false; }, { passive: true });
  const av = document.querySelector(".avatar");
  const avatarBurst = () => {
    unlockAudio();
    const r = av.getBoundingClientRect();
    tapQ = { x: r.left + r.width / 2, y: r.top + r.height / 2, s: 2.4 };
    setTimeout(() => braam(0.3, 0.9), 10);
    setTimeout(() => flash(0.8), 330);
  };
  if (av) { av.addEventListener("click", avatarBurst); av.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") avatarBurst(); }); }

  // ---------- 突破進場的鏡頭：俯衝 → 貼地 → 撞穿玻璃 → 一路往上衝 → 比例尺壓縮 ----------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camFollowY = { v: 0 }, camFollowX = { v: 0 }, camFollowH = { v: 10 };
  function topNow() {   // 現在最新那根噴發 K 棒的頂、位置、高度
    let top = BK.TOP, x = BG.xb, h = 0;
    const rt = bkState.runT;
    if (rt >= 0) BK.k.forEach((k, i) => { if (k.run) { const v = clamp((rt - (i - BK.run0) * RUN_DT) / RUN_GROW, 0, 1); if (v > 0) { top = Math.max(top, k.o + (k.c - k.o) * v); x = BG.x0 + (i + 0.5) * BG.dx; h = (k.c - k.o) * BG.k0; } } });
    return [x, BG.Y(top, 1), h];
  }
  function poseAt(name) {
    const g = BG, cx = CHART.cx, Wc = g.x1 - g.x0, Hc = g.yt - g.yb, topY = g.Y(BK.TOP, 1);
    switch (name) {
      case "def": return [[0, 0, CAMZ], [0, 0, 0]];
      case "hold": return [[cx * 0.6, CHART.cy * 0.6, CAMZ * 0.82], [cx * 0.6, CHART.cy * 0.6, 0]];
      case "high": return [[cx - Wc * 0.05, topY + Hc * 0.75, Hc * 1.9], [cx, g.yb + Hc * 0.35, 0]];
      case "low": return [[g.xb - Wc * 0.42, g.yb + Hc * 0.05, Hc * 1.05], [g.xb - Wc * 0.1, g.yb + Hc * 0.3, 0]];
      case "skim": return [[g.xb - Wc * 0.2, g.yb + Hc * 0.1, Hc * 0.95], [g.xb, topY, 0]];
      case "rise": {
        const ty = camFollowY.v, fx = camFollowX.v, vh = camFollowH.v, vw = vh * W / H, d = vh / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
        return [[fx - vw * 0.04, ty - vh * 0.42, d], [fx - vw * 0.16, ty - vh * 0.16, 0]];   // 最新那根在畫面右上、前面幾根往左下一階一階
      }
    }
    return [[0, 0, CAMZ], [0, 0, 0]];
  }
  const SEG = [[0, "def"], [0.7, "hold"], [1.35, "high"], [1.95, "low"], [RUN_T0, "skim"], [RUN_T0 + 0.45, "rise"], [RUN_END + 0.2, "rise"], [SEQ_END - 0.2, "def"]];
  function seqCamera(st) {
    if (st >= SEG[SEG.length - 1][0]) return false;
    let i = 0; while (i < SEG.length - 2 && st > SEG[i + 1][0]) i++;
    const [t0, a] = SEG[i], [t1, b] = SEG[i + 1], e = sstep(0, 1, (st - t0) / (t1 - t0));
    const A = poseAt(a), B = poseAt(b);
    camPos.set(lerp(A[0][0], B[0][0], e), lerp(A[0][1], B[0][1], e), lerp(A[0][2], B[0][2], e));
    camLook.set(lerp(A[1][0], B[1][0], e), lerp(A[1][1], B[1][1], e), lerp(A[1][2], B[1][2], e));
    return true;
  }

  // ---------- 浮出來的真字 ----------
  let ptKey = null, ptSince = 0;
  function showPText(key, vis) {
    if (!ptextEl) return;
    if (!key || vis <= 0.001 || !TEXT[key]) { ptextEl.style.opacity = "0"; ptKey = null; return; }
    const T0 = TEXT[key];
    if (ptKey !== key) {
      ptKey = key; ptSince = clock;
      ptextEl.innerHTML = key === "dao" ? "<span>道</span>　<span>法</span>　<span>術</span>" : T0.lines.join("<br>");
    }
    const k = H / Hw;
    ptextEl.style.fontSize = (T0.fs * T0.sc * k).toFixed(2) + "px";
    ptextEl.style.left = (W / 2 + T0.rect.cx * k).toFixed(1) + "px";
    ptextEl.style.top = (H / 2 - T0.rect.cy * k).toFixed(1) + "px";
    if (key === "dao" && T0.emph) ptextEl.querySelectorAll("span").forEach((s, i) => { s.style.opacity = (0.25 + 0.75 * T0.emph[i]).toFixed(2); });
    ptextEl.style.opacity = (vis * sstep(0.25, 0.9, clock - ptSince)).toFixed(3);
  }

  // ---------- 太極上的位置（粒子繞著太極轉） ----------
  function taijiPoint(i, tr, from, out) {
    const a = W / H, s0 = 0.82 * Math.min(a, 1), grow = sstep(0, 0.36, tr), zoom = sstep(0.46, 1, tr);
    const s = s0 * (0.02 + 0.98 * grow) * Math.exp(zoom * 4.8), ang = taijiAng(tr), Ax = (from > 0.5 ? 0.62 : -0.62) * zoom;
    const type = TJ[i * 2], u = (TJ[i * 2 + 1] + clock * 0.06) % 1;
    let qx, qy;
    if (type === 0) { const t = u * 6.2832; qx = Math.cos(t); qy = Math.sin(t); }
    else if (type === 1) {
      if (u < 0.5) { const t = Math.PI / 2 + u * 2 * Math.PI; qx = 0.5 * Math.cos(t); qy = 0.5 + 0.5 * Math.sin(t); }
      else { const t = Math.PI / 2 - (u - 0.5) * 2 * Math.PI; qx = 0.5 * Math.cos(t); qy = -0.5 + 0.5 * Math.sin(t); }
    } else { const t = u * 6.2832, top = (i & 1) === 0; qx = 0.13 * Math.cos(t); qy = (top ? 0.5 : -0.5) + 0.13 * Math.sin(t); }
    const lx = (qx - Ax) * s, ly = qy * s, c = Math.cos(ang), sn = Math.sin(ang);
    const px = c * lx - sn * ly, py = sn * lx + c * ly;   // 轉回畫面座標（半個螢幕高＝1）
    out[0] = px * Hw / 2; out[1] = py * Hw / 2; out[2] = 0;
  }

  // ---------- 每一格 ----------
  const PM = new THREE.Matrix4(), right = new THREE.Vector3(), up = new THREE.Vector3(), tj = [0, 0, 0];
  const bkI = idx("breakout");
  let shake = 0, lastY = scrollY, slowEma = 0.016, slowN = 0;
  const spinCS = s => {
    if (!s.spin) return null;
    const sp = s.spin, yaw = sp.yaw0 + sp.yawA * Math.sin(clock * sp.yawW), cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(sp.pitch), spp = Math.sin(sp.pitch);
    return { cx: sp.cx, cy: sp.cy, cyw: cy, syw: sy, cp, sp: spp };
  };
  function frame(now) {
    const rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now;
    if (!reduce) clock += dt;
    if (rawDt < 0.25) { slowEma = slowEma * 0.95 + rawDt * 0.05; slowN++; }
    if (slowN > 90 && slowEma > 0.026 && dprCap > 1.2) { dprCap = dprCap > 1.6 ? 1.5 : 1.2; slowN = 0; slowEma = 0.016; resize(false); }
    const y = scrollY, dy = y - lastY; lastY = y;
    updateCaps(y);
    const yy = yinYang(y);
    if (Math.abs(yy.dark - darkCur) > 0.002) { darkCur = yy.dark; applyPalette(yy.dark); }

    const st = scrollState(y);
    const SA = secs[st.a], SB = secs[st.b];
    const pA = localP(SA, y), pB = localP(SB, y);

    // ----- 突破進場 -----
    const bp = localP(secs[bkI], y), bkOn = st.a === bkI || st.b === bkI;
    if (bp < 0.25) { bseq.played = false; bseq.start = -1; }               // 往回滑很多才會再演
    if (bkOn && st.m === 0 && bp >= 0.6 && !bseq.played && !reduce) { bseq.played = true; bseq.start = clock; bseq.sfx = false; bseq.fl = false; bseq.hits = 0; camFollowY.v = BG.Y(BK.TOP, 1); camFollowX.v = BG.xb; camFollowH.v = (BG.yt - BG.yb) * 0.55; }
    const bkMain = bkOn && (st.a === bkI ? st.m < 0.35 : st.m > 0.65);
    if (bseq.start >= 0 && clock - bseq.start < SEQ_END && !bkMain) bseq.start = clock - SEQ_END - 1;
    const sT = bseq.start >= 0 ? clock - bseq.start : -1;
    const running = sT >= 0 && sT < SEQ_END;
    bkState.reveal = bp < 0.2 ? lerp(3, BK.r0, bp / 0.2) : bp < 0.42 ? lerp(BK.r0, BK.r1, (bp - 0.2) / 0.22) : lerp(BK.r1, BK.r1 + 1, clamp((bp - 0.42) / 0.12, 0, 1));
    bkState.marks = sstep(0.5, 0.56, bp);
    const fit = (BK.pmax0 - BK.pmin) / (BK.pmaxAll - BK.pmin);
    const finalState = sT >= SEQ_END || (!running && bp >= 0.9) || (reduce && bp >= 0.6);
    bkState.runT = finalState ? 99 : sT >= RUN_T0 ? sT - RUN_T0 : -1;
    bkState.scale = finalState ? fit : (sT >= RUN_END + 0.2 ? lerp(1, fit, sstep(RUN_END + 0.2, SEQ_END - 0.3, sT)) : 1);
    bkState.glass = running ? (sT < RUN_T0 ? sstep(0.6, 1.3, sT) : 0) : 0;
    if (sT >= 1.6 && !bseq.sfx) { bseq.sfx = true; braam(0.6, 1); }
    if (sT >= RUN_T0 && !bseq.fl) { bseq.fl = true; flash(0.5); shake = 1.2; shatter(); for (let k = 0; k < 90; k++) { const a = rand() * 6.283, v = 6 + rand() * 10; spark(BG.xb, BG.Y(BK.TOP, 1), 0.5, Math.cos(a) * v, Math.abs(Math.sin(a)) * v + 2, (rand() - 0.5) * 6, 1.1, 1.4); } }
    if (running) { for (let j = 1; j <= 8; j++) if (sT >= runAt(j) && bseq.hits < j) {
      bseq.hits = j; shake = 0.8; thump(0.55 + j * 0.03); flash(0.22);
      const kk = BK.k[BK.run0 + j - 1], bx = BG.x0 + (BK.run0 + j - 1 + 0.5) * BG.dx, by = BG.Y(kk.c, 1), sp = camFollowH.v * 0.5;
      for (let q = 0; q < 46; q++) { const a = (q / 46) * 6.283, v = sp * (0.8 + rand() * 0.6); spark(bx, by, 0.6, Math.cos(a) * v, Math.sin(a) * v, (rand() - 0.5) * v * 0.4, 0.8, 1.6); }
    } }
    let inv = 0;
    if (running) { let n = 0; for (const f of FLIPS) if (sT >= f) n++; inv = n % 2; }
    let boost = 1;
    if (sT > 0.3 && sT < RUN_T0) boost = lerp(1, 0.5, sstep(0.3, RUN_T0 - 0.2, sT));
    else if (sT >= RUN_T0 && sT < RUN_T0 + 0.8) boost = lerp(1.6, 1, sstep(RUN_T0, RUN_T0 + 0.8, sT));
    mat.uniforms.uBoost.value = boost;

    // ----- 背景、陰陽 -----
    shared.uBase.value = yy.base; shared.uTr.value = yy.tr; shared.uFrom.value = yy.from; shared.uAng.value = taijiAng(yy.tr);
    shared.uSplit.value = yy.split; shared.uInv.value = inv;
    bgMat.uniforms.uTime.value = clock; bgMat.uniforms.uHero.value = 1 - sstep(0.0, 0.5, yy.t1); bgMat.uniforms.uGlow.value = bump(yy.tr, 0, 1) * 0.95;
    const glow = yy.dark > 0.999 && yy.tr === 0 && yy.split < 0.001 && inv === 0;
    const wantBlend = glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (mat.blending !== wantBlend) mat.blending = wantBlend;

    const A = shapeOf(SA.key), B = shapeOf(SB.key);
    if (A.dyn) A.dyn(clock, pA);
    if (B !== A && B.dyn) B.dyn(clock, pB);

    // ----- 鏡頭 -----
    camPos.set(0, 0, CAMZ); camLook.set(0, 0, 0);
    if (bkOn && running) {
      const tn = topNow(), kf = Math.min(1, dt * 3);
      camFollowY.v = lerp(camFollowY.v, tn[1], kf); camFollowX.v = lerp(camFollowX.v, tn[0], kf);
      camFollowH.v = lerp(camFollowH.v, Math.max((BG.yt - BG.yb) * 0.45, tn[2] * 2.0), Math.min(1, dt * 2));
      seqCamera(sT);
    }
    const sway = 0.35 + 1.2 * (1 - yy.t1);
    camPos.x += Math.sin(clock * 0.21) * sway; camPos.y += Math.cos(clock * 0.17) * sway * 0.7;
    shake = Math.max(0, shake - dt * 2.4);
    if (shake > 0) { camPos.x += Math.sin(clock * 61) * 0.35 * shake; camPos.y += Math.cos(clock * 53) * 0.3 * shake; }
    camera.position.copy(camPos); camera.lookAt(camLook); camera.updateMatrixWorld();

    // ----- 浮出來的真字 -----
    let tk = null, tv = 0;
    if (st.m < 0.5 && A.text) { tk = SA.key; tv = 1 - sstep(0.03, 0.25, st.m); }
    else if (st.m >= 0.5 && B.text) { tk = SB.key; tv = sstep(0.75, 0.97, st.m); }
    showPText(tk, tv);
    const halo = tk ? 1 - 0.55 * tv * sstep(0.25, 0.9, clock - ptSince) : 1;

    // ----- 主角粒子 -----
    PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = PM.elements;
    right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
    const active = now - ptr.at < 900 || tapQ;
    ptr.holdOn = ptr.down && now - ptr.still > 280;
    const Rpx = Math.min(W, H) * 0.2, tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const k60 = dt * 60, damp = Math.pow(0.86, k60);
    const m = st.m, swirl = phone ? 0.6 : 0.9;
    const hA = A.text && tk === SA.key ? halo : 1, hB = B.text && tk === SB.key ? halo : 1;
    const Ap = A.perm, Bp = B.perm, sA = A.stiff || 1, sB = B.stiff || 1;
    const RA = spinCS(A), RB = spinCS(B), brA = A.bright || 1, brB = B.bright || 1;
    const tjW = yy.tr > 0 ? sstep(0.04, 0.28, yy.tr) * (1 - sstep(0.5, 0.78, yy.tr)) : 0;   // 轉場時粒子先繞太極
    const rot = (R, pos, j, o) => {
      let x = pos[j], y = pos[j + 1], z = pos[j + 2];
      if (R) { const dx = x - R.cx, dy2 = y - R.cy; const x1 = dx * R.cyw + z * R.syw, z1 = -dx * R.syw + z * R.cyw; const y1 = dy2 * R.cp - z1 * R.sp, z2 = dy2 * R.sp + z1 * R.cp; x = R.cx + x1; y = R.cy + y1; z = z2; }
      o[0] = x; o[1] = y; o[2] = z;
    };
    const oa = [0, 0, 0], ob = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      const i3 = i * 3, ja1 = Ap[i], jb1 = Bp[i], ja = ja1 * 3, jb = jb1 * 3;
      let mi = m;
      if (m > 0 && m < 1) mi = sstep(0, 1, clamp((m - DL[i] * 0.4) / 0.6, 0, 1));
      const ia = 1 - mi;
      rot(RA, A.pos, ja, oa); rot(RB, B.pos, jb, ob);
      let tx = oa[0] * ia + ob[0] * mi, ty = oa[1] * ia + ob[1] * mi, tz = oa[2] * ia + ob[2] * mi;
      if (tjW > 0.001) { taijiPoint(i, yy.tr, yy.from, tj); tx = lerp(tx, tj[0], tjW); ty = lerp(ty, tj[1], tjW); tz = lerp(tz, tj[2], tjW); }
      const sw = Math.sin(Math.PI * mi) * swirl * (1 - tjW);
      if (sw > 0.01) { tx += Math.cos(PH[i] + clock * 0.9) * sw; ty += Math.sin(PH[i] * 1.3 + clock * 0.7) * sw; tz += Math.sin(PH[i] * 0.7 + clock) * sw; }
      if (!A.text || mi > 0.5) { tx += Math.sin(clock * 0.6 + PH[i]) * 0.04; ty += Math.cos(clock * 0.5 + PH[i] * 1.7) * 0.04; }
      let vx = V[i3], vy = V[i3 + 1], vz = V[i3 + 2];
      const px = P[i3], py = P[i3 + 1], pz = P[i3 + 2];
      const kk = KS[i] * k60 * (sA * ia + sB * mi) * (1 + tjW);
      vx = vx * damp + (tx - px) * kk; vy = vy * damp + (ty - py) * kk; vz = vz * damp + (tz - pz) * kk;
      if (active) {
        const ww = e[3] * px + e[7] * py + e[11] * pz + e[15];
        if (ww > 0.1) {
          const qx = tapQ ? tapQ.x : ptr.x, qy = tapQ ? tapQ.y : ptr.y;
          const sx = ((e[0] * px + e[4] * py + e[8] * pz + e[12]) / ww * 0.5 + 0.5) * W - qx;
          const sy = (0.5 - (e[1] * px + e[5] * py + e[9] * pz + e[13]) / ww * 0.5) * H - qy;
          const d = Math.hypot(sx, sy), wpp = 2 * ww * tanHalf / H;
          if (tapQ) {
            const RR = Rpx * 1.5 * tapQ.s;
            if (d < RR) { const f = (1 - d / RR) * 30 * wpp / (d + 1) * tapQ.s; vx += (right.x * sx - up.x * sy) * f; vy += (right.y * sx - up.y * sy) * f; vz += (right.z * sx - up.z * sy) * f + (rand() - 0.5) * f * 8; }
          } else if (d < Rpx && d > 0.5) {
            if (ptr.holdOn) {
              const f = (1 - d / Rpx) * 1.1 * wpp, ax = -sx / d, ay = -sy / d;
              vx += (right.x * (ax - ay * 0.8) - up.x * (ay + ax * 0.8)) * f; vy += (right.y * (ax - ay * 0.8) - up.y * (ay + ax * 0.8)) * f; vz += (right.z * (ax - ay * 0.8) - up.z * (ay + ax * 0.8)) * f;
            } else {
              const f = Math.pow(1 - d / Rpx, 2) * 2.2 * wpp / d;
              vx += (right.x * sx - up.x * sy) * f; vy += (right.y * sx - up.y * sy) * f; vz += (right.z * sx - up.z * sy) * f;
            }
          }
        }
      }
      V[i3] = vx; V[i3 + 1] = vy; V[i3 + 2] = vz;
      P[i3] = px + vx * k60; P[i3 + 1] = py + vy * k60; P[i3 + 2] = pz + vz * k60;
      if (tjW > 0.3) {   // 繞太極時是金色
        const g = (tjW - 0.3) / 0.7;
        col[i3] = lerp(A.col[ja] * ia + B.col[jb] * mi, GOLD[0], g); col[i3 + 1] = lerp(A.col[ja + 1] * ia + B.col[jb + 1] * mi, GOLD[1], g); col[i3 + 2] = lerp(A.col[ja + 2] * ia + B.col[jb + 2] * mi, GOLD[2], g);
        colD[i3] = lerp(A.colD[ja] * ia + B.colD[jb] * mi, GOLD_LT[0], g); colD[i3 + 1] = lerp(A.colD[ja + 1] * ia + B.colD[jb + 1] * mi, GOLD_LT[1], g); colD[i3 + 2] = lerp(A.colD[ja + 2] * ia + B.colD[jb + 2] * mi, GOLD_LT[2], g);
      } else {
        col[i3] = A.col[ja] * ia + B.col[jb] * mi; col[i3 + 1] = A.col[ja + 1] * ia + B.col[jb + 1] * mi; col[i3 + 2] = A.col[ja + 2] * ia + B.col[jb + 2] * mi;
        colD[i3] = A.colD[ja] * ia + B.colD[jb] * mi; colD[i3 + 1] = A.colD[ja + 1] * ia + B.colD[jb + 1] * mi; colD[i3 + 2] = A.colD[ja + 2] * ia + B.colD[jb + 2] * mi;
      }
      const tw = 0.86 + 0.14 * Math.sin(clock * 2 + PH[i] * 3);
      size[i] = (A.size[ja1] * ia * brA + B.size[jb1] * mi * brB) * tw * (1 + tjW * 0.3);
      alpha[i] = Math.max(A.alpha[ja1] * ia * hA + B.alpha[jb1] * mi * hB, tjW * 0.9);
    }
    tapQ = null;

    // ----- 真 K 棒、玻璃、碎片、速度線 -----
    const solidShow = bkOn ? (st.a === bkI ? 1 - st.m : st.m) : 0;
    bodies.visible = wicks.visible = solidShow > 0.02;
    if (bodies.visible) {
      updateCandleMeshes(true);
      if (solidShow < 1) for (const mm of [bodies, wicks]) { const a = mm.geometry.attributes.aVis; for (let j = 0; j < a.count; j++) a.array[j] *= solidShow; a.needsUpdate = true; }
    }
    glass.visible = bkState.glass > 0.01 && bkOn;
    if (glass.visible) { const Wc = BG.x1 - BG.x0; glass.position.set((BG.x0 + BG.x1) / 2, BG.Y(BK.TOP, 1), 0); glass.scale.set(Wc * 1.06, Math.max(0.12, BG.dx * 0.5), 2.6); glassMat.uniforms.uA.value = bkState.glass; }
    updateShards(dt);
    const riseA = running ? sstep(RUN_T0 + 0.3, RUN_T0 + 0.9, sT) * (1 - sstep(RUN_END, RUN_END + 0.5, sT)) : 0;
    aura.visible = false;
    if (running && sT >= RUN_T0 && sT < RUN_END + 0.6) {
      const rt = sT - RUN_T0, j = clamp(Math.floor(rt / RUN_DT), 0, 8), kk = BK.k[BK.run0 + j];
      const v = clamp((rt - j * RUN_DT) / RUN_GROW, 0, 1), xc = BG.x0 + (BK.run0 + j + 0.5) * BG.dx;
      const y0 = BG.Y(kk.o, 1), y1 = BG.Y(kk.o + (kk.c - kk.o) * Math.max(v, 0.02), 1), w = BG.bw * 1.9;
      aura.visible = true;
      aura.position.set(xc, (y0 + y1) / 2, 0.25);
      aura.scale.set(w * 9, (y1 - y0) + w * 7, 1);
      auraMat.uniforms.uA.value = 0.6 * (1 - sstep(RUN_END, RUN_END + 0.6, sT));
      if (v < 1 && !reduce) {   // 頂端往下噴火花
        const n = Math.max(1, Math.round(dt * 220)), sp = camFollowH.v * 0.35;
        for (let q = 0; q < n; q++) spark(xc + (rand() - 0.5) * w, y1, 0.6, gauss() * sp * 0.35, -sp * (0.6 + rand() * 0.8), gauss() * sp * 0.2, 0.55 + rand() * 0.3, 1.2);
      }
    }
    updateSpeed(dt, riseA * 0.75, camFollowX.v, camFollowY.v, camFollowH.v * 0.5);

    // ----- 星塵 -----
    const fly = clamp(dy, -400, 400) * 0.03 + dt * 0.9 + riseA * dt * 40;
    for (let j = 0; j < NS; j++) {
      const p3 = (N + j) * 3;
      let z = P[p3 + 2] + fly;
      if (z > SZ[1]) { z -= SZ[1] - SZ[0]; P[p3] = (rand() - 0.5) * Ww * 2.6; P[p3 + 1] = (rand() - 0.5) * Hw * 2.6; }
      else if (z < SZ[0]) z += SZ[1] - SZ[0];
      P[p3 + 2] = z;
    }

    // ----- 光痕 -----
    if (ptr.holdOn && !reduce) {
      const p = worldAt(ptr.x, ptr.y);
      if (p) for (let k = 0; k < Math.max(1, Math.round(dt * 90)); k++) {
        const a = rand() * 6.283, r = 2 + rand() * 1.6, ca = Math.cos(a), sa = Math.sin(a);
        spark(p.x + ca * r, p.y + sa * r, 1, -ca * 3.2 - sa * 3.6, -sa * 3.2 + ca * 3.6, 0, 0.65, 0.9);
      }
    }
    const drag = Math.pow(0.06, dt);
    for (let j = 0; j < NT; j++) {
      const p = N + NS + j, p3 = p * 3;
      if (T.life[j] > 0) {
        T.life[j] = Math.max(0, T.life[j] - dt / T.span[j]);
        T.x[j] += T.vx[j] * dt; T.y[j] += T.vy[j] * dt; T.z[j] += T.vz[j] * dt;
        T.vx[j] *= drag; T.vy[j] *= drag; T.vz[j] *= drag;
      }
      const lf = T.life[j];
      P[p3] = T.x[j]; P[p3 + 1] = T.y[j]; P[p3 + 2] = T.z[j];
      col[p3] = 0.9; col[p3 + 1] = lerp(0.62, 0.78, lf); col[p3 + 2] = lerp(0.24, 0.42, lf);
      colD[p3] = 0.98; colD[p3 + 1] = lerp(0.72, 0.9, lf); colD[p3 + 2] = lerp(0.35, 0.6, lf);
      size[p] = (0.3 * lf + 0.06) * T.big[j];
      alpha[p] = Math.pow(lf, 1.3);
    }
    for (const a of ["position", "aColor", "aColorD", "aSize", "aAlpha"]) geo.attributes[a].needsUpdate = true;

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
