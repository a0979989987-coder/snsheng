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
const OXBLUE = hex(0x23a6ea), OXBLUE_LT = hex(0x8fd3ff), LINEG = hex(0x06c755), LINEG_LT = hex(0x5cf09a);
const SEAL = hex(0xa3362b), BOOKPAPER = hex(0xf5f0e6), FLAME = hex(0xff9a3c);
const easeOutBack = x => { const c = 1.9; x = clamp(x, 0, 1) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const easeOutBounce = x => {
  x = clamp(x, 0, 1);
  if (x < 1 / 2.75) return 7.5625 * x * x;
  if (x < 2 / 2.75) { x -= 1.5 / 2.75; return 7.5625 * x * x + 0.75; }
  if (x < 2.5 / 2.75) { x -= 2.25 / 2.75; return 7.5625 * x * x + 0.9375; }
  x -= 2.625 / 2.75; return 7.5625 * x * x + 0.984375;
};
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
  if (amb && actx) amb.out.gain.setTargetAtTime(soundOn ? 0.03 : 0, actx.currentTime, 0.05);
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
function tick(strong) {   // 按鈕的觸感音：短短喀一聲，官方按鈕多一點低音
  if (!soundOn || !actx || actx.state !== "running") return;
  const t = actx.currentTime + 0.005, out = actx.createGain(); out.gain.value = strong ? 0.42 : 0.3; out.connect(actx.destination);
  const o = actx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(strong ? 700 : 940, t); o.frequency.exponentialRampToValueAtTime(strong ? 360 : 560, t + 0.07);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.14);
  if (strong) {
    const s = actx.createOscillator(); s.type = "sine"; s.frequency.setValueAtTime(110, t); s.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    const sg = actx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.7, t + 0.008); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    s.connect(sg); sg.connect(out); s.start(t); s.stop(t + 0.26);
  }
}
addEventListener("sn:tick", e => setTimeout(() => tick(e.detail && e.detail.strong), 15));
function whoosh(level = 0.6) {   // 轉場：一陣風聲掃過去
  if (!soundOn || !actx || actx.state !== "running") return;
  const t = actx.currentTime + 0.01, dur = 0.7, out = actx.createGain(); out.gain.value = 0.22 * level; out.connect(actx.destination);
  const n = actx.createBufferSource(); n.buffer = noiseBuf(dur);
  const bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(320, t); bp.frequency.exponentialRampToValueAtTime(2200, t + dur * 0.55); bp.frequency.exponentialRampToValueAtTime(700, t + dur);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(bp); bp.connect(g); g.connect(out); n.start(t); n.stop(t + dur);
}
// 低音鋪底：很小聲、一直在，滑到突破那段變大
let amb = null;
function ambient(level) {
  if (!actx || actx.state !== "running") return;
  if (!amb) {
    const out = actx.createGain(); out.gain.value = 0; out.connect(actx.destination);
    const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260; lp.Q.value = 0.7; lp.connect(out);
    [[55, 0, 0.5], [55, 7, 0.4], [82.4, -5, 0.28], [110, 3, 0.16]].forEach(([f, d, v]) => {
      const o = actx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = d;
      const g = actx.createGain(); g.gain.value = v; o.connect(g); g.connect(lp); o.start();
    });
    const lfo = actx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = actx.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    amb = { out };
  }
  amb.out.gain.setTargetAtTime(soundOn && !document.hidden ? level : 0, actx.currentTime, 0.6);
}
document.addEventListener("visibilitychange", () => { if (amb && actx) amb.out.gain.setTargetAtTime(document.hidden || !soundOn ? 0 : 0.03, actx.currentTime, 0.05); });
function flash(strength = 1) {
  if (!flashEl || reduce) return;
  flashEl.style.transition = "none"; flashEl.style.opacity = String(0.9 * strength);
  requestAnimationFrame(() => requestAnimationFrame(() => { flashEl.style.transition = "opacity 1.3s ease-out"; flashEl.style.opacity = "0"; }));
}

// ---------- 每一段的位置和字幕 ----------
const secs = [...document.querySelectorAll("[data-shape]")].map(el => ({ el, key: el.dataset.shape, sticky: el.classList.contains("pin"), caps: [...el.querySelectorAll(".cap")], capOn: -1 }));
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
  const me = secs[idx("smiley")], rk = secs[idx("rocket")], bk = secs[idx("breakout")];
  RNG.t1 = [secs[0].h1, me.h0];
  RNG.t2 = [rk.h1, bk.h0];
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
    const avEl = document.querySelector(".avatar"), avY = avEl ? avEl.offsetTop + avEl.offsetHeight / 2 : H * 0.135;   // 星系的核心放在頭像正後面
    HERO = phone ? { cx: 0, cy: (H / 2 - avY) * Hw / H, r: Ww * 1.2 } : { cx: 0, cy: (H / 2 - avY) * Hw / H, r: Hw * 0.9 };
    QUOTE = phone ? { cx: -Ww * 0.02, cy: Hw * 0.1, hw: Ww * 0.41, hh: Hw * 0.3 } : { cx: 0, cy: Hw * 0.06, hw: Ww * 0.38, hh: Hw * 0.3 };
    TOPC = phone ? { cx: -Ww * 0.03, cy: Hw * 0.285, hw: Ww * 0.4, hh: Hw * 0.15 } : { cx: 0, cy: Hw * 0.3, hw: Ww * 0.17, hh: Hw * 0.15 };
  }
  layout();
  const mainStage = () => STAGE, topcAt = () => TOPC;
  // 手機：卡片上面實際空出來的地方（卡片固定在底部，量它的上緣），主角就放在這裡，不會被卡片蓋住
  function freeStage(key, fallback) {
    if (!phone) return fallback;
    const c = document.querySelector(`[data-shape="${key}"] > .copy`);
    const top = c ? c.getBoundingClientRect().top : 0;
    if (!(top > 120)) return fallback;
    const yTop = 66, yBot = Math.max(yTop + 90, top - 16);
    const wTop = (H / 2 - yTop) * Hw / H, wBot = (H / 2 - yBot) * Hw / H;
    return { cx: -Ww * 0.03, cy: (wTop + wBot) / 2, hw: Ww * 0.42, hh: (wTop - wBot) / 2 };
  }

  // ---------- 形狀 ----------
  const newShape = () => ({ pos: new Float32Array(N * 3), col: new Float32Array(N * 3), colD: new Float32Array(N * 3), size: new Float32Array(N), alpha: new Float32Array(N), dyn: null, perm: null });
  const setC = (s, i, c, cd) => { s.col.set(c, i * 3); s.colD.set(cd || bright(c), i * 3); };
  function finish(s) {   // 依位置排好：轉場時粒子照順序滑過去，不會亂飛
    const key = new Float32Array(N), ord = new Int32Array(N);
    for (let i = 0; i < N; i++) { key[i] = s.pos[i * 3] + s.pos[i * 3 + 1] * 0.08; ord[i] = i; }
    s.perm = ord.sort((a, b) => key[a] - key[b]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;   // 主角的範圍（不算淡淡的星塵）
    for (let i = 0; i < N; i++) if (s.alpha[i] >= 0.45) { const x = s.pos[i * 3], y = s.pos[i * 3 + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x0 > x1) { x0 = -1; x1 = 1; y0 = -1; y1 = 1; }
    s.box = { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
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
    const SG = phone ? freeStage("smiley", STAGE) : STAGE;   // 手機：放在卡片上面的空位
    const R = Math.min(SG.hw, SG.hh) * 1.0, rect = { cx: SG.cx, cy: SG.cy, hw: R, hh: R };
    const a = Math.floor(N * 0.6), b = Math.floor(N * 0.84);
    const TAG = new Int8Array(N), BASE = new Float32Array(N * 2);
    const sph = (px, py) => { const dx = (px - 200) / 185, dy = (py - 200) / 185; return Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)) * R * 0.55; };
    placeSample(s, feat, 0, a, rect, { size: 0.24, z: sph, color: (r, g, bb, px, py) => py > 205 && Math.hypot(px - 200, py - 200) < 160 ? mix3(GOLD, DOWN, 0.3 + rand() * 0.2) : goldish(),
      tag: (i, px, py) => { const d = Math.hypot(px - 200, py - 200); TAG[i] = d > 170 ? 0 : py < 195 ? (px < 200 ? 1 : 2) : 3; } });
    placeSample(s, fill, a, b, rect, { size: 0.15, alpha: 0.3, z: sph, color: () => mix3(CREAM, GOLD_LT, rand()), tag: i => { TAG[i] = 4; } });
    fillDust(s, b, STAGE);
    for (let i = b; i < N; i++) TAG[i] = -1;
    s.grp = TAG;
    for (let i = 0; i < N; i++) { BASE[i * 2] = s.pos[i * 3]; BASE[i * 2 + 1] = s.pos[i * 3 + 1]; }
    const eyeY = rect.cy - (151 - 200) * (R / 200);
    const mouthY = rect.cy - (270 - 200) * (R / 200);
    const eye = [0, 0];
    s.center = [rect.cx, rect.cy, R];
    s.dyn = (t, p, ta = 99) => {
      const blink = Math.max(bump(t % 3.4, 0, 0.22), bump(ta, 0.15, 0.4));   // 眨眼；到的時候先眨一下
      const kick = Math.max(0, 1 - (clock - smileKick) / 1.5), arr = ta < 2.2 ? bump(ta, 0.2, 2.2) : 0;
      const amp = 0.06 + 0.24 * Math.max(kick, arr);
      const laugh = 1 + amp * Math.sin(t * 9) * (0.55 + 0.45 * Math.sin(t * 0.9 + 1));   // 笑得一抖一抖；點它笑更大
      let lx = 0, ly = 0;                                                     // 眼睛看手指
      if (look.on) { const dx = look.x - rect.cx, dy = look.y - rect.cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / (R * 1.6)) * R * 0.1; lx = dx / d * k; ly = dy / d * k; }
      eye[0] += (lx - eye[0]) * 0.12; eye[1] += (ly - eye[1]) * 0.12;
      for (let i = 0; i < b; i++) {
        const tg = TAG[i];
        if (tg === 1 || tg === 2) { s.pos[i * 3] = BASE[i * 2] + eye[0]; s.pos[i * 3 + 1] = eyeY + eye[1] + (BASE[i * 2 + 1] - eyeY) * (1 - 0.85 * blink); }
        else if (tg === 3) { s.pos[i * 3] = BASE[i * 2] + eye[0] * 0.35; s.pos[i * 3 + 1] = mouthY + eye[1] * 0.35 + (BASE[i * 2 + 1] - mouthY) * laugh; }
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
  // 上面一座天秤（多方在左、空方在右，重的那邊往下沉），下面 12 根 K 棒演三種狀態
  function buildBalance() {
    const s = newShape(), G = new Int8Array(N).fill(-1);
    const x0 = STAGE.cx - STAGE.hw * 0.9, x1 = STAGE.cx + STAGE.hw * 0.86, yb = STAGE.cy - STAGE.hh * 0.95, yt = STAGE.cy + STAGE.hh * 0.1;
    const dx = (x1 - x0) / 12, bw = dx * 0.62, Y = v => yb + v / 20 * (yt - yb);
    const piv = [STAGE.cx - STAGE.hw * 0.03, STAGE.cy + STAGE.hh * 0.62], Lb = STAGE.hw * 0.56, hang = STAGE.hh * 0.2, rp = STAGE.hw * 0.16, foot = STAGE.cy + STAGE.hh * 0.2;
    const nc = Math.floor(N * 0.62), nl = Math.floor(N * 0.04), nb = Math.floor(N * 0.06), np = Math.floor(N * 0.05), nq = Math.floor(N * 0.04);
    const i1 = nc + nl, i2 = i1 + nb, i3 = i2 + np, i4 = i3 + np, i5 = i4 + nq;
    const { K, U } = candleParams(nc, new Array(12).fill(1));
    for (let i = 0; i < nc; i++) G[i] = 0;
    for (let i = i1; i < i2; i++) { G[i] = 3; setC(s, i, goldish()); s.size[i] = 0.17; s.alpha[i] = 0.95; }
    for (let i = i2; i < i3; i++) { G[i] = 1; setC(s, i, mix3(UP, GOLD, 0.25)); s.size[i] = 0.17; s.alpha[i] = 0.95; }
    for (let i = i3; i < i4; i++) { G[i] = 2; setC(s, i, mix3(DOWN, GOLD, 0.25)); s.size[i] = 0.17; s.alpha[i] = 0.95; }
    for (let i = i4; i < i5; i++) { G[i] = 4; setC(s, i, goldish()); s.size[i] = 0.16; s.alpha[i] = 0.9; }
    fillDust(s, i5, STAGE, 1.3);
    for (let i = nc; i < i1; i++) { setC(s, i, GOLD); s.size[i] = 0.13; }
    s.grp = G;
    const cur = new Array(12), R = Array.from({ length: N }, () => rand());
    const pan = (i, ex, ey, side) => {   // 秤盤：兩條吊繩＋一個淺碗
      const u = R[i];
      if (u < 0.36) { const f = u / 0.36, sx = f < 0.5 ? -1 : 1, g = (f % 0.5) * 2; s.pos[i * 3] = ex + sx * rp * 0.92 * g; s.pos[i * 3 + 1] = ey - hang * g; }
      else { const a = Math.PI + 0.32 + (u - 0.36) / 0.64 * (Math.PI - 0.64); s.pos[i * 3] = ex + Math.cos(a) * rp; s.pos[i * 3 + 1] = ey - hang + Math.sin(a) * rp * 0.42 + rp * 0.1; }
      s.pos[i * 3 + 2] = side * 0.1 + (R[(i + 7) % N] - 0.5) * 0.4;
    };
    s.dyn = (t, p, ta = 99) => {
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
      for (let i = nc; i < i1; i++) {
        const u = (i - nc) / nl;
        s.pos[i * 3] = lerp(x0 + dx * 5.5, x1, u); s.pos[i * 3 + 1] = Y(BAL.brokenLow); s.pos[i * 3 + 2] = 0;
        s.alpha[i] = la * (Math.floor(u * 26) % 2 === 0 ? 0.95 : 0);
      }
      // 天秤：極陽多方那邊沉、平衡擺平、極陰空方那邊沉；到的時候先晃一下
      const swing = ta < 3 ? Math.sin(ta * 5.2) * 0.32 * Math.exp(-ta * 1.3) : 0;
      const phi = lerp(lerp(0.24, 0, a), -0.24, b) + swing + Math.sin(t * 1.3) * 0.02;
      const cs = Math.cos(phi), sn = Math.sin(phi);
      const eL = [piv[0] - Lb * cs, piv[1] - Lb * sn], eR = [piv[0] + Lb * cs, piv[1] + Lb * sn];
      s._eL = eL; s._eR = eR;
      for (let i = i1; i < i2; i++) { const u = R[i] * 2 - 1; s.pos[i * 3] = piv[0] + u * Lb * cs; s.pos[i * 3 + 1] = piv[1] + u * Lb * sn + (R[(i + 3) % N] - 0.5) * 0.12; s.pos[i * 3 + 2] = (R[(i + 5) % N] - 0.5) * 0.3; }
      for (let i = i2; i < i3; i++) pan(i, eL[0], eL[1], -1);
      for (let i = i3; i < i4; i++) pan(i, eR[0], eR[1], 1);
      for (let i = i4; i < i5; i++) {   // 柱子和底座
        const u = R[i];
        if (u < 0.7) { s.pos[i * 3] = piv[0] + (R[(i + 3) % N] - 0.5) * 0.12; s.pos[i * 3 + 1] = lerp(foot, piv[1], u / 0.7); }
        else { s.pos[i * 3] = piv[0] + ((u - 0.7) / 0.3 - 0.5) * rp * 1.4; s.pos[i * 3 + 1] = foot; }
        s.pos[i * 3 + 2] = (R[(i + 5) % N] - 0.5) * 0.3;
      }
    };
    s.dyn(0, 0);
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.24, 0.4, -0.06);
    s.labels = [   // 秤盤下面寫多、空，跟著秤盤走
      { t: "多方", f: o => { o[0] = s._eL[0]; o[1] = s._eL[1] - hang - rp * 0.62; o[2] = 0; return 1; } },
      { t: "空方", f: o => { o[0] = s._eR[0]; o[1] = s._eR[1] - hang - rp * 0.62; o[2] = 0; return 1; } }
    ];
    return finish(s);
  }

  // 一圈長方形的邊（粒子排成框）
  function rectEdge(u, x0, y0, x1, y1, out) {
    const w = x1 - x0, h = y1 - y0, d = u * 2 * (w + h);
    if (d < w) { out[0] = x0 + d; out[1] = y0; }
    else if (d < w + h) { out[0] = x1; out[1] = y0 + d - w; }
    else if (d < 2 * w + h) { out[0] = x1 - (d - w - h); out[1] = y1; }
    else { out[0] = x0; out[1] = y1 - (d - 2 * w - h); }
  }
  // 把一段 K 棒放進某個範圍（K、U 來自 candleParams）
  function drawCandles(s, i0, i1, K, U, ks, x0, x1, Y, bwK = 0.62, vis = null) {
    const dx = (x1 - x0) / ks.length, bw = dx * bwK;
    for (let i = i0; i < i1; i++) {
      const j = i - i0, k = K[j], c = ks[k], xc = x0 + (k + 0.5) * dx, up = c.c >= c.o;
      onCandle(s.pos, i * 3, xc, bw, Y(c.o), Y(c.c), Y(c.lo), Y(c.hi), U[j * 3], U[j * 3 + 1], U[j * 3 + 2], false);
      s.pos[i * 3 + 2] = (U[j * 3 + 1] - 0.5) * bw * 0.8;
      setC(s, i, mix3(up ? UP : DOWN, [0, 0, 0], U[j * 3] ? 0.1 : 0), mix3(up ? UP : DOWN, [1, 1, 1], U[j * 3] ? 0.3 : 0.12));
      s.size[i] = U[j * 3] ? 0.12 : 0.16;
      s.alpha[i] = vis ? 0.95 * vis(k) : 0.95;
    }
    return dx;
  }

  // ---- 時間級別：三層 K 線疊起來，同一段走勢（上面日週月、中間 4H／1H、下面 1／5／15 分） ----
  const TF = (() => {
    let sd = 41;
    const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    const g = () => { const u = Math.max(1e-6, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
    const small = []; let c = 100;
    for (let k = 0; k < 48; k++) {
      const drift = k < 14 ? 0.62 : k < 22 ? -0.42 : k < 36 ? 0.8 : k < 41 ? -0.34 : 0.62;
      const o = c; c = o + drift + g() * 0.85;
      small.push({ o, c, hi: Math.max(o, c) + Math.abs(g()) * 0.42 + 0.1, lo: Math.min(o, c) - Math.abs(g()) * 0.42 - 0.1 });
    }
    const agg = n => { const out = []; for (let k = 0; k < small.length; k += n) { const sg = small.slice(k, k + n); out.push({ o: sg[0].o, c: sg[sg.length - 1].c, hi: Math.max(...sg.map(x => x.hi)), lo: Math.min(...sg.map(x => x.lo)) }); } return out; };
    const L = [agg(8), agg(3), small];
    // 中級別的移動止損：創新高時，止損拉到前一根的低點，一階一階往上
    const mid = L[1], stair = []; let hiMax = -1e9, stop = null;
    mid.forEach((k, i) => { if (i > 0 && k.hi > hiMax && i > 4) stop = Math.max(stop ?? -1e9, mid[i - 1].lo); hiMax = Math.max(hiMax, k.hi); stair.push(stop); });
    return { L, stair };
  })();
  function buildTf() {
    const s = newShape(), G = new Int8Array(N).fill(-1);
    const x0 = STAGE.cx - STAGE.hw * 0.84, x1 = STAGE.cx + STAGE.hw * 0.84, bh = STAGE.hh * 0.42;
    const yc = [STAGE.cy + STAGE.hh * 0.58, STAGE.cy - STAGE.hh * 0.02, STAGE.cy - STAGE.hh * 0.62];
    const share = [0.15, 0.18, 0.23], nf = Math.floor(N * 0.03);
    const layers = [];
    let i = 0;
    for (let j = 0; j < 3; j++) {
      const ks = TF.L[j], n = Math.floor(N * share[j]), lo = Math.min(...ks.map(k => k.lo)), hi = Math.max(...ks.map(k => k.hi));
      const { K, U } = candleParams(n, ks.map(k => Math.abs(k.c - k.o) + 0.6));
      layers.push({ i0: i, i1: i + n, K, U, ks, Y: v => yc[j] - bh / 2 + (v - lo) / (hi - lo) * bh, f0: i + n, f1: i + n + nf });
      for (let q = i; q < i + n; q++) G[q] = j;
      for (let q = i + n; q < i + n + nf; q++) { G[q] = j; setC(s, q, GOLD_DK, GOLD_LT); s.size[q] = 0.1; }
      i += n + nf;
    }
    const ns0 = i, ns = Math.floor(N * 0.03), nk0 = ns0 + ns, nk = Math.floor(N * 0.04);
    for (let q = ns0; q < ns0 + ns; q++) { G[q] = 1; setC(s, q, DOWN, bright(DOWN)); s.size[q] = 0.13; }
    for (let q = nk0; q < nk0 + nk; q++) { G[q] = 3; setC(s, q, GOLD_DK, GOLD_LT); s.size[q] = 0.11; }
    fillDust(s, nk0 + nk, STAGE, 1.3);
    s.grp = G;
    const R = Array.from({ length: N }, () => rand()), o3 = [0, 0, 0];
    const dxMid = (x1 - x0) / TF.L[1].length;
    // 大級別最後一根，往下對到中級別、小級別的哪一段
    const coneX = j => j === 0 ? [x0 + 5 / 6 * (x1 - x0), x1] : j === 1 ? [x0 + 40 / 48 * (x1 - x0), x1] : [x0 + 40 / 48 * (x1 - x0), x1];
    s.dyn = (t, p, ta = -1) => {
      const e = [sstep(0.52, 0.6, p) * (1 - sstep(0.8, 0.86, p)), sstep(0.24, 0.32, p) * (1 - sstep(0.52, 0.6, p)), 1 - sstep(0.24, 0.32, p)];
      const all = sstep(0.8, 0.88, p);
      const sweep = all > 0 ? (t * 0.5) % 1.4 : -1;   // 最後由大看到小：一道光由上往下掃
      const spread = ta >= 0 && ta < 2.4 ? bump(ta, 0, 2.4) * STAGE.hh * 0.18 : 0;   // 到的時候三層先拉開再收回
      for (let j = 0; j < 3; j++) {
        const Lr = layers[j], off = (1 - j) * spread, Yj = v => Lr.Y(v) + off;
        const em = Math.max(e[j], all), sw = sweep >= 0 ? bump(sweep, j * 0.35, j * 0.35 + 0.6) : 0;
        drawCandles(s, Lr.i0, Lr.i1, Lr.K, Lr.U, Lr.ks, x0, x1, Yj, j === 0 ? 0.46 : j === 1 ? 0.56 : 0.66);
        for (let q = Lr.i0; q < Lr.i1; q++) { s.alpha[q] = 0.95 * (0.28 + 0.72 * em); s.size[q] *= 0.85 + 0.3 * em + 0.4 * sw; }
        for (let q = Lr.f0; q < Lr.f1; q++) {
          rectEdge(R[q], x0 - 0.5, yc[j] - bh / 2 - 0.5 + off, x1 + 0.5, yc[j] + bh / 2 + 0.5 + off, o3);
          s.pos[q * 3] = o3[0]; s.pos[q * 3 + 1] = o3[1]; s.pos[q * 3 + 2] = 0;
          s.alpha[q] = Math.min(1, 0.3 + 0.55 * em + 0.5 * sw);
        }
      }
      // 中級別的移動止損（樓梯）
      const Lm = layers[1], st = TF.stair;
      for (let q = ns0; q < ns0 + ns; q++) {
        const u = R[q] * st.length, k = Math.floor(u), v = st[k];
        s.pos[q * 3] = x0 + u * dxMid; s.pos[q * 3 + 1] = (v == null ? Lm.Y(Lm.ks[0].lo) : Lm.Y(v)) - spread * 0; s.pos[q * 3 + 2] = 0.2;
        s.alpha[q] = v == null ? 0 : 0.95 * Math.max(e[1], all * 0.6);
      }
      // 大級別一根 K，往下對到小級別一整段
      for (let q = nk0; q < nk0 + nk; q++) {
        const u = R[q], seg = u < 0.5 ? 0 : 1, f = (u % 0.5) * 2, side = R[(q + 11) % N] < 0.5 ? 0 : 1;
        const a = coneX(seg), b = coneX(seg + 1), ya = yc[seg] - bh / 2 - 0.5 + (1 - seg) * spread, yb2 = yc[seg + 1] + bh / 2 + 0.5 + (1 - seg - 1) * spread;
        s.pos[q * 3] = lerp(a[side], b[side], f); s.pos[q * 3 + 1] = lerp(ya, yb2, f); s.pos[q * 3 + 2] = 0;
        s.alpha[q] = (0.12 + 0.75 * all) * (Math.floor(f * 16) % 2 ? 0 : 1);
      }
      s._e = e; s._all = all; s._sp = spread;
    };
    s.dyn(0, 0);
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.2, 0.35, -0.1);
    const names = ["日／週／月", "4H／1H", "1／5／15 分"];
    s.labels = names.map((t, j) => ({ t, cls: "l", f: o => { o[0] = x0 - 0.3; o[1] = yc[j] + bh / 2 + 1.0 + (1 - j) * (s._sp || 0); o[2] = 0; return 0.45 + 0.55 * Math.max(s._e ? s._e[j] : 0, s._all || 0); } }));
    return finish(s);
  }

  // ---- 火箭模型：強跌起點留下一道牆 → 下面盤整累積燃料 → 突破帶缺口靠慣性往上 → 停在牆下 ----
  const RK = (() => {
    const k = [
      { o: 88, c: 91, hi: 92.5, lo: 87 }, { o: 91, c: 82, hi: 92, lo: 80.5 }, { o: 82, c: 58, hi: 82.5, lo: 57 }, { o: 58, c: 44, hi: 60, lo: 43 }
    ];
    const fz = [[44, 36], [36, 39], [39, 35], [35, 38.5], [38.5, 34.5], [34.5, 38], [38, 35.5], [35.5, 39], [39, 36], [36, 38.5], [38.5, 35], [35, 38]];
    fz.forEach(([o, c], i) => k.push({ o, c, hi: (i % 3 === 1) ? 40 : Math.max(o, c) + 0.7, lo: Math.min(o, c) - 0.8, touch: i % 3 === 1 }));
    const b0 = k.length;
    k.push({ o: 38, c: 47, hi: 47.5, lo: 37.6 }, { o: 47, c: 60, hi: 61, lo: 46.5 }, { o: 60, c: 69, hi: 70, lo: 58 }, { o: 69, c: 75, hi: 76.5, lo: 68.5 }, { o: 75, c: 77.5, hi: 79.6, lo: 74.4 }, { o: 77.5, c: 76, hi: 79, lo: 75 });
    return { k, b0, line: 40, gap: [47.5, 58], wall: [80.5, 87], top: 79.6, pmin: 30, pmax: 94 };
  })();
  function buildRocket() {
    const s = newShape(), G = new Int8Array(N).fill(-1), L = RK.k.length;
    const x0 = STAGE.cx - STAGE.hw * 0.92, x1 = STAGE.cx + STAGE.hw * 0.66, yb = STAGE.cy - STAGE.hh * 0.95, yt = STAGE.cy + STAGE.hh * 0.8;
    const Y = v => yb + (v - RK.pmin) / (RK.pmax - RK.pmin) * (yt - yb), dx = (x1 - x0) / L, X = k => x0 + (k + 0.5) * dx;
    const nc = Math.floor(N * 0.3), nl = Math.floor(N * 0.03), nt = Math.floor(N * 0.02), ng = Math.floor(N * 0.05), nw = Math.floor(N * 0.13), nr = Math.floor(N * 0.15), nfl = Math.floor(N * 0.06);
    const iL = nc, iT = iL + nl, iG = iT + nt, iW = iG + ng, iR = iW + nw, iF = iR + nr, iD = iF + nfl;
    const { K, U } = candleParams(nc, RK.k.map(c => Math.abs(c.c - c.o) + 1.2));
    for (let i = 0; i < nc; i++) G[i] = RK.k[K[i]].touch !== undefined || (K[i] >= 4 && K[i] < RK.b0) ? 0 : K[i] < 4 ? 2 : 1;
    for (let i = iL; i < iT; i++) { G[i] = 0; setC(s, i, GOLD_DK, GOLD_LT); s.size[i] = 0.13; }
    for (let i = iT; i < iG; i++) { G[i] = 0; setC(s, i, GOLD, CREAM); s.size[i] = 0.2; }
    for (let i = iG; i < iW; i++) { G[i] = 1; setC(s, i, mix3(GOLD, OXBLUE, 0.4), OXBLUE_LT); s.size[i] = 0.12; }
    for (let i = iW; i < iR; i++) { G[i] = 2; setC(s, i, mix3(DOWN, INK, 0.12), bright(DOWN)); s.size[i] = 0.19; }
    // 火箭：畫在畫布上取點（機身、鼻錐、兩片尾翼、圓窗）
    const body = sampleCanvas(120, 240, g => {
      g.fillStyle = "#fff";
      g.beginPath(); g.moveTo(60, 8); g.bezierCurveTo(92, 40, 94, 120, 86, 186); g.lineTo(34, 186); g.bezierCurveTo(26, 120, 28, 40, 60, 8); g.fill();
      g.beginPath(); g.moveTo(34, 140); g.lineTo(10, 206); g.lineTo(38, 192); g.fill();
      g.beginPath(); g.moveTo(86, 140); g.lineTo(110, 206); g.lineTo(82, 192); g.fill();
      g.fillRect(44, 186, 32, 12);
      g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(60, 84, 13, 0, 6.283); g.fill();
      g.globalCompositeOperation = "source-over"; g.fillStyle = "rgb(80,160,255)"; g.beginPath(); g.arc(60, 84, 8, 0, 6.283); g.fill();
    }, 2);
    const Hr = STAGE.hh * 0.42, RB = new Float32Array(N * 2);
    { const n = body.pts.length / 5; for (let i = iR; i < iF; i++) {
      const j = Math.floor((i - iR) / nr * n) * 5, px = body.pts[j], py = body.pts[j + 1], win = body.pts[j + 2] < 200;
      RB[i * 2] = (px - 60) / 240 * Hr; RB[i * 2 + 1] = -(py - 120) / 240 * Hr;
      G[i] = 3; setC(s, i, win ? OXBLUE : mix3(INK, GOLD_DK, 0.55), win ? OXBLUE_LT : CREAM); s.size[i] = win ? 0.2 : 0.17;
    } }
    for (let i = iF; i < iD; i++) { G[i] = 4; setC(s, i, FLAME, [1, 0.78, 0.4]); }
    fillDust(s, iD, STAGE, 1.3);
    s.grp = G;
    const R = Array.from({ length: N }, () => rand()), o3 = [0, 0, 0];
    // 火箭走的路：從燃料區的線起飛，沿著突破那幾根往上，停在牆下
    const path = [[X(RK.b0 - 1) + dx * 0.3, Y(RK.line) - Hr * 0.5]];   // 火箭的鼻尖就是價格的頭
    for (let k = RK.b0; k < L - 1; k++) path.push([X(k), Y(RK.k[k].hi) - Hr * 0.5]);
    path.push([X(L - 2) + dx * 0.3, Y(RK.top) - Hr * 0.5]);
    const seg = []; let tot = 0;
    for (let k = 1; k < path.length; k++) { const l = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]); seg.push(l); tot += l; }
    const along = u => { let d = u * tot; for (let k = 0; k < seg.length; k++) { if (d <= seg[k] || k === seg.length - 1) { const f = clamp(d / seg[k], 0, 1); return [lerp(path[k][0], path[k + 1][0], f), lerp(path[k][1], path[k + 1][1], f), Math.atan2(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1])]; } d -= seg[k]; } return [...path[path.length - 1], 0]; };
    let hitAt = -9, wasUp = false;
    s.dyn = (t, p, ta = -1) => {
      const e = [1 - sstep(0.26, 0.32, p), sstep(0.26, 0.32, p) * (1 - sstep(0.52, 0.58, p)), sstep(0.52, 0.58, p)], all = sstep(0.78, 0.84, p);
      const fly = sstep(0.3, 0.55, p);                       // 照字幕：燃料時待在線上、慣性時往上衝、牆的時候停下來
      const up = fly >= 0.999;
      if (up && !wasUp) hitAt = t;
      wasUp = up;
      const bump2 = up ? Math.sin(Math.min(1, (t - hitAt) / 0.6) * Math.PI) * Math.exp(-(t - hitAt) * 3) * Hr * 0.35 : 0;
      const ign = ta >= 0 ? Math.min(1, ta / 0.8) : 0;     // 到的時候點火
      const pos = along(fly), ang = lerp(0, pos[2], bump(fly, 0, 1) * 0.9);
      const rx = pos[0], ry = pos[1] - bump2 + (fly <= 0.001 ? Math.sin(t * 40) * 0.04 * ign : Math.sin(t * 2) * 0.12 * (up ? 1 : 0));
      const reveal = fly <= 0 ? RK.b0 : RK.b0 + (L - RK.b0) * fly + 0.4;
      // K 棒
      const dxx = drawCandles(s, 0, nc, K, U, RK.k, x0, x1, Y, 0.62);
      for (let i = 0; i < nc; i++) {
        const k = K[i], g = G[i], em = Math.max(e[g] ?? 0, all);
        const v = k < RK.b0 ? 1 : clamp(reveal - k, 0, 1);
        if (v < 1) { const kk = RK.k[k]; onCandle(s.pos, i * 3, X(k), dxx * 0.62, Y(kk.o), Y(kk.o + (kk.c - kk.o) * v), Y(Math.min(kk.o, kk.c)), Y(lerp(Math.max(kk.o, kk.c), kk.hi, v)), U[i * 3], U[i * 3 + 1], U[i * 3 + 2], false); }
        s.alpha[i] = 0.95 * Math.min(1, v * 2) * (0.3 + 0.7 * em);
      }
      // 燃料的線＋多次測試的點
      for (let i = iL; i < iT; i++) { const u = R[i]; s.pos[i * 3] = lerp(X(4) - dx * 0.5, X(RK.b0) + dx * 0.4, u); s.pos[i * 3 + 1] = Y(RK.line); s.pos[i * 3 + 2] = 0.1; s.alpha[i] = (0.3 + 0.7 * Math.max(e[0], all)) * (Math.floor(u * 50) % 2 ? 0.25 : 1); }
      const touches = RK.k.map((c, k) => c.touch ? k : -1).filter(k => k >= 0);
      for (let i = iT; i < iG; i++) { const k = touches[i % touches.length], a = R[i] * 6.283 + t * 1.5, rr = dx * (0.55 + 0.25 * Math.sin(t * 4 + k)); s.pos[i * 3] = X(k) + Math.cos(a) * rr; s.pos[i * 3 + 1] = Y(RK.line) + Math.sin(a) * rr; s.pos[i * 3 + 2] = 0.2; s.alpha[i] = 0.85 * Math.max(e[0], all * 0.5); }
      // 缺口：突破那幾根中間沒被碰過的空白
      for (let i = iG; i < iW; i++) {
        const u = R[i], w = R[(i + 13) % N], xa = X(RK.b0) - dx * 0.3, xb = x1 + dx * 0.3, edge = w < 0.5;
        s.pos[i * 3] = lerp(xa, xb, u); s.pos[i * 3 + 1] = edge ? Y(w < 0.25 ? RK.gap[0] : RK.gap[1]) : lerp(Y(RK.gap[0]), Y(RK.gap[1]), (w - 0.5) * 2); s.pos[i * 3 + 2] = 0;
        s.alpha[i] = (edge ? (Math.floor(u * 40) % 2 ? 0 : 0.9) : 0.18) * Math.min(1, reveal - RK.b0 - 1.5) * (0.3 + 0.7 * Math.max(e[1], all));
      }
      // 牆：強跌起點那根的範圍，往右延伸
      const wallGlow = up ? 1 + 1.2 * Math.exp(-(t - hitAt) * 2) : 1;
      for (let i = iW; i < iR; i++) {
        const u = R[i], w = R[(i + 17) % N], edge = w < 0.3;   // 牆是一整塊實心的帶子
        s.pos[i * 3] = lerp(X(1) - dx * 0.45, x1 + dx * 0.5, u); s.pos[i * 3 + 1] = edge ? Y(w < 0.15 ? RK.wall[0] : RK.wall[1]) : lerp(Y(RK.wall[0]), Y(RK.wall[1]), (w - 0.3) / 0.7); s.pos[i * 3 + 2] = (w - 0.5) * 0.4;
        s.alpha[i] = Math.min(1, (edge ? 0.95 : 0.62) * (0.55 + 0.45 * Math.max(e[2], all)) * (edge && w < 0.22 ? wallGlow : 1));
      }
      // 火箭本體（往飛的方向傾斜）
      const ca = Math.cos(-ang), sa = Math.sin(-ang);
      for (let i = iR; i < iF; i++) { const bx = RB[i * 2], by = RB[i * 2 + 1]; s.pos[i * 3] = rx + bx * ca - by * sa; s.pos[i * 3 + 1] = ry + bx * sa + by * ca; s.pos[i * 3 + 2] = 0.5 + (R[i] - 0.5) * 0.5; s.alpha[i] = 0.95; }
      // 火焰：點火後變長，往上衝時最長
      const thrust = (0.25 + 0.75 * ign) * (fly > 0 && fly < 1 ? 1.6 : up ? 0.7 : 1);
      for (let i = iF; i < iD; i++) {
        const life = (R[i] + t * (2.2 + R[(i + 5) % N])) % 1, spread = (R[(i + 9) % N] - 0.5) * Hr * 0.22 * (0.4 + life);
        const by = -Hr * 0.36 - life * Hr * 0.7 * thrust, bx = spread;
        s.pos[i * 3] = rx + bx * ca - by * sa; s.pos[i * 3 + 1] = ry + bx * sa + by * ca; s.pos[i * 3 + 2] = 0.4;
        s.size[i] = (0.28 - life * 0.2) * (0.6 + 0.6 * thrust); s.alpha[i] = (1 - life) * 0.9 * (ign > 0 || fly > 0 ? 1 : 0.35);
      }
      s._rk = { e, all, rx, ry };
    };
    s.dyn(0, 0);
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.16, 0.3, -0.05);
    s.labels = [
      { t: "燃料", f: o => { o[0] = X(9); o[1] = Y(31.5); o[2] = 0; return 0.4 + 0.6 * Math.max(s._rk ? s._rk.e[0] : 1, s._rk ? s._rk.all : 0); } },
      { t: "慣性", f: o => { o[0] = X(RK.b0 + 3.4); o[1] = Y((RK.gap[0] + RK.gap[1]) / 2); o[2] = 0; return s._rk ? (0.15 + 0.85 * Math.max(s._rk.e[1], s._rk.all)) : 0; } },
      { t: "牆", f: o => { o[0] = X(L - 1) + dx * 1.2; o[1] = Y((RK.wall[0] + RK.wall[1]) / 2); o[2] = 0; return s._rk ? (0.3 + 0.7 * Math.max(s._rk.e[2], s._rk.all)) : 0; } }
    ];
    s.rocketHead = () => s._rk ? [s._rk.rx, s._rk.ry] : [0, 0];
    return finish(s);
  }

  // ---- 突破進場：真的比特幣週線（2022/8/29 到 2024/12/9，電腦 120 根、手機最後 64 根） ----
  // 頂分型：2024/3/4、3/11（73,777）、3/18 跌破；回撤盤整到 8/5 的 49,000；11/4 那週突破
  const BTCW = [[19556,20576,19540,20000],[20000,21860,18511,21827],[21827,22799,19320,19416],[19417,19956,18126,18807],[18809,20386,18471,19057],[19058,20475,18960,19439],[19440,19952,18190,19263],[19263,19707,18650,19570],[19570,21085,19157,20627],[20627,21481,20031,20906],[20906,21070,15588,16330],[16332,17190,15815,16280],[16280,16813,15476,16429],[16429,17324,15995,17106],[17107,17424,16679,17085],[17085,18388,16527,16738],[16739,17061,16256,16832],[16832,16973,16333,16617],[16617,17177,16549,17128],[17128,21258,17105,20872],[20873,23372,20407,22708],[22706,23961,22300,23742],[23743,24255,22500,22933],[22933,23452,21451,21784],[21782,25250,21351,24272],[24273,25250,22722,23555],[23555,24000,21971,22430],[22430,22602,19549,21997],[21998,28390,21814,27973],[27973,28868,26602,27968],[27968,29185,26508,28172],[28172,28775,27200,28324],[28324,31000,28170,30305],[30305,30485,27125,27591],[27591,30036,26943,29233],[29233,29820,27667,28430],[28430,28631,25811,26918],[26918,27664,26361,26748],[26748,28261,25872,28065],[28065,28447,26505,27115],[27115,27392,25351,25926],[25926,26840,24800,26340],[26340,31432,26257,30463],[30463,31282,29500,30617],[30617,31500,29701,30161],[30161,31804,29900,30232],[30232,30417,29512,30084],[30084,30100,28862,29281],[29281,30048,28586,29088],[29088,30244,28701,29304],[29304,29695,25166,26190],[26190,26819,25300,26102],[26102,28143,25334,25971],[25971,26446,25373,25842],[25842,26888,24901,26528],[26528,27484,26122,26248],[26248,28066,25990,27993],[27993,28580,27160,27917],[27917,27988,26539,27154],[27154,30380,27113,29992],[29992,35280,29884,34526],[34526,35985,34025,35012],[35012,37972,34523,37064],[37064,37980,34800,37360],[37360,38414,35632,37447],[37447,40250,36707,39972],[39972,44700,39972,43790],[43790,43804,40222,41375],[41375,44398,40543,42992],[42992,43802,41300,42284],[42284,45880,40750,43929],[43929,48969,41500,41732],[41732,43578,40280,41580],[41580,42843,38555,42031],[42031,43882,41805,42583],[42583,48593,42258,48300],[48300,52817,47710,52138],[52138,52985,50521,51729],[51729,64000,50901,63114],[63114,69990,59005,68956],[68956,73777,64533,68393],[68393,68956,60775,67210],[67210,71770,66385,71280],[71280,71288,64493,69360],[69360,72798,60661,65662],[65662,66867,59600,64941],[64941,67232,62391,63119],[63119,64734,56553,64012],[64012,65500,60187,61484],[61484,67700,60749,66274],[66274,71979,66060,68508],[68508,70688,66670,67766],[67766,71997,67612,69648],[69648,70196,65078,66677],[66677,67299,63178,63210],[63210,63370,58402,62772],[62772,63862,53486,55858],[55858,61421,54260,60798],[60798,68367,60632,68165],[68165,69400,63457,68250],[68250,70080,57123,58161],[58161,62745,49000,58713],[58713,61800,56079,58427],[58427,65000,57787,64220],[64220,64481,57201,57302],[57302,59810,52550,54870],[54870,60625,54592,59132],[59132,64133,57493,63579],[63579,66498,62539,65602],[65602,65619,59828,62820],[62820,64478,58946,62870],[62870,69400,62458,69032],[69032,69520,65260,68022],[68022,73620,67479,68776],[68776,81500,66835,80370],[80370,93266,80216,89856],[89856,99588,89377,97900],[97900,98872,90791,97185],[97185,104088,90500,101110],[101110,105250,94150,104464]];
  const BK = (() => {
    const L = phoneNow ? 64 : 120, all = BTCW.slice(BTCW.length - L);
    const out = all.map(([o, h, l, c]) => ({ o: o / 1000, hi: h / 1000, lo: l / 1000, c: c / 1000 }));   // 用千美元當單位
    const topI = L - 1 - (BTCW.length - 1 - 80), r0 = topI + 2, r1 = L - 6;   // 頂分型第 2 根、回撤從第 3 根之後算、突破那根
    out.forEach((k, i) => { k.up = k.c >= k.o; if (i >= r1) k.run = true; });
    out[topI].top = true;
    const TOP = out[topI].hi;
    const stop = Math.min(...out.slice(r0, r1).map(k => k.lo));
    const pmin = Math.min(...out.map(k => k.lo)) * 0.96;
    return { k: out, L, TOP, stop, pmin, pmax0: TOP * 1.035, pmaxAll: Math.max(...out.map(k => k.hi)) * 1.015, br: r1, run0: r1, topI, r0, r1, RUN: L - r1 };
  })();
  const RUN_T0 = 2.2, RUN_DT = 0.62, RUN_GROW = 0.3;
  const runAt = j => RUN_T0 + j * RUN_DT;          // 第 j 根噴發 K 棒出現的時間
  const RUN_END = runAt(BK.RUN - 1) + RUN_GROW;
  const SEQ_END = RUN_END + 2.6;
  const FLIPS = [RUN_T0, RUN_T0 + 0.1, RUN_T0 + 0.2, ...Array.from({ length: BK.RUN - 1 }, (_, j) => runAt(j + 1)), RUN_END + 0.35];   // 黑白切換跟重擊對拍，最後切回來
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
    const xk = k => x0 + (k + 0.5) * dx;
    s.labels = [   // 真行情的日期和止損
      { t: "2024 年 3 月", f: o => { o[0] = xk(BK.topI); o[1] = BG.Y(BK.k[BK.topI].hi, bkState.scale) + 1.3; o[2] = 0; return clamp(bkState.reveal - BK.topI - 1.5, 0, 1); } },
      { t: "止損", f: o => { o[0] = xk(BK.r0 + 3); o[1] = BG.Y(BK.stop, bkState.scale) - 1.1; o[2] = 0; return bkState.marks; } },
      { t: "2024 年 11 月", f: o => { const k = BK.k[BK.br], v = bkState.vis ? bkState.vis[BK.br] : 0; o[0] = xk(BK.br); o[1] = BG.Y(Math.min(k.lo, k.o), bkState.scale) - 1.3; o[2] = 0; return clamp(v * 3, 0, 1); } }
    ];
    return finish(s);
  }

  // ---- 書：立體翻開，右邊的書頁會翻過去 ----
  function buildBook() {   // 書稿的紙：米色紙、墨色字行、紅色印章和書籤
    const s = newShape();
    const pageL = g => { g.beginPath(); g.moveTo(300, 80); g.quadraticCurveTo(170, 40, 40, 78); g.lineTo(40, 352); g.quadraticCurveTo(170, 318, 300, 360); g.closePath(); };
    const pageR = g => { g.beginPath(); g.moveTo(300, 80); g.quadraticCurveTo(430, 40, 560, 78); g.lineTo(560, 352); g.quadraticCurveTo(430, 318, 300, 360); g.closePath(); };
    const smp = sampleCanvas(600, 420, g => {
      g.lineCap = "round"; g.lineJoin = "round";
      g.strokeStyle = "rgb(255,255,255)"; g.lineWidth = 9; pageL(g); g.stroke(); pageR(g); g.stroke();
      g.strokeStyle = "rgb(0,255,0)"; g.lineWidth = 5;
      for (let k = 0; k < 7; k++) {
        const y = 118 + k * 30;
        g.beginPath(); g.moveTo(78, y); g.quadraticCurveTo(170, y - 22, 268, y + 4); g.stroke();
        g.beginPath(); g.moveTo(332, y + 4); g.quadraticCurveTo(430, y - 22, k === 6 ? 450 : 522, y); g.stroke();
      }
      g.fillStyle = "rgb(255,0,0)"; g.fillRect(470, 268, 50, 50);                                   // 印章
      g.strokeStyle = "rgb(255,0,0)"; g.lineWidth = 9; g.beginPath(); g.moveTo(470, 60); g.lineTo(470, 120); g.lineTo(485, 106); g.lineTo(500, 120); g.lineTo(500, 60); g.stroke();   // 書籤
    }, 2);
    const fill = sampleCanvas(600, 420, g => { g.fillStyle = "#fff"; pageL(g); g.fill(); pageR(g); g.fill(); }, 5);
    const n = Math.floor(N * 0.6), nfill = Math.floor(N * 0.24), PX = new Float32Array(N);
    const zf = px => -Math.abs(px - 300) / 260 * STAGE.hw * 0.35;
    const sc = placeSample(s, smp, 0, n, STAGE, { size: 0.18, jitter: 0.4, z: zf, tag: (i, px) => { PX[i] = px; },
      color: (r, g, b) => r > 200 && g < 100 ? SEAL : g > 200 && r < 100 ? mix3(INK, GOLD_DK, 0.35) : mix3(GOLD_DK, BOOKPAPER, 0.25),
      colorD: c => c === SEAL ? [0.85, 0.3, 0.24] : c[0] < 0.5 ? mix3(GOLD_DK, GOLD, 0.6) : BOOKPAPER });
    placeSample(s, fill, n, n + nfill, STAGE, { size: 0.24, alpha: 0.22, jitter: 2, z: zf, color: () => mix3(BOOKPAPER, GOLD_LT, 0.25), colorD: () => mix3(BOOKPAPER, GOLD_LT, 0.15), tag: (i, px) => { PX[i] = px; } });
    fillDust(s, n + nfill, STAGE, 1.5);
    const BASE = s.pos.slice(0, (n + nfill) * 3);
    // 翻頁：右邊一部分粒子組成一張書頁，繞書脊翻到左邊（到的時候翻一次）
    const F = [];
    for (let i = 0; i < n + nfill; i++) if (PX[i] > 320 && PX[i] < 540 && (i >= n || rand() < 0.25)) F.push(i);
    s.dyn = (t, p, ta = -1) => {
      const c = ta >= 0 ? ta : 99, back = c >= 2.5, ang = back ? 0 : Math.PI * sstep(0.4, 1.9, c);
      const vis = back ? sstep(2.5, 3.3, c) : 1 - sstep(2.0, 2.5, c);   // 翻到左邊後淡掉，右邊再長回來
      for (const i of F) {
        const bx = BASE[i * 3] - STAGE.cx, bz = BASE[i * 3 + 2];
        s.pos[i * 3] = STAGE.cx + bx * Math.cos(ang); s.pos[i * 3 + 2] = bz + bx * Math.sin(ang) * 0.9; s.pos[i * 3 + 1] = BASE[i * 3 + 1] + Math.sin(ang) * 0.6;
        s.alpha[i] = (i >= n ? 0.22 : 0.95) * vis;
      }
    };
    s.spin = spinOf(STAGE.cx, STAGE.cy, 0.3, 0.42, -0.32);
    s.bright = 1.1;
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
  // ---- OX：傾斜的雷達＋手畫一個 W ----
  function buildOx() {
    const STAGE = phone ? freeStage("ox", TOPC) : mainStage();   // 手機卡片比較高，主角放在上面
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
      setC(s, j, k === 0 || k === 1 ? mix3(OXBLUE, OXBLUE_LT, rand() * 0.6) : k === 2 ? mix3(OXBLUE_LT, GOLD_LT, 0.5) : k === 3 ? goldish() : CREAM);
      s.size[j] = k === 3 ? 0.21 : k === 4 ? 0.26 : 0.13;
      s.alpha[j] = k === 0 ? 0.55 : k === 1 ? 0.25 : 0.95;
    }
    const Wp = [[-0.95, 0.6], [-0.55, -0.55], [-0.1, 0.15], [0.35, -0.55], [0.9, 0.7]];
    const segL = []; let tot = 0;
    for (let k = 1; k < Wp.length; k++) { const l = Math.hypot(Wp[k][0] - Wp[k - 1][0], Wp[k][1] - Wp[k - 1][1]); segL.push(l); tot += l; }
    const at = u => { let d = u * tot; for (let k = 0; k < segL.length; k++) { if (d <= segL[k] || k === segL.length - 1) { const f = clamp(d / segL[k], 0, 1); return [lerp(Wp[k][0], Wp[k + 1][0], f), lerp(Wp[k][1], Wp[k + 1][1], f)]; } d -= segL[k]; } return Wp[Wp.length - 1]; };
    const disc = (x, y) => [STAGE.cx + x, STAGE.cy - STAGE.hh * 0.18 + y * ct, y * st];   // 雷達平躺、往後傾
    s.dyn = (t, p, ta = -1) => {   // 到的時候手畫一次 W，雷達一直慢慢掃
      const draw = ta >= 0 ? clamp((ta - 0.3) / 2.4, 0, 1) : 0, fade = 1, sw = t * 1.3;
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
    const STAGE = phone ? freeStage("merge", TOPC) : mainStage();   // 手機卡片比較高，主角放在上面
    const s = newShape();
    const nb = Math.floor(N * 0.8), U = new Float32Array(N * 3), cols = [GOLD, BLUE_LT, GOLD_LT, CREAM];
    for (let i = 0; i < nb; i++) {
      const zz = rand() * 2 - 1, a = rand() * 6.283, rr = Math.sqrt(1 - zz * zz);
      U[i * 3] = Math.cos(a) * rr; U[i * 3 + 1] = Math.sin(a) * rr; U[i * 3 + 2] = zz;
      setC(s, i, mix3(cols[i % 4], [1, 1, 1], 0.1)); s.size[i] = 0.16; s.alpha[i] = 0.4 + 0.55 * Math.max(0, zz);
    }
    fillDust(s, nb, STAGE, 1.4);
    const rA = Math.min(STAGE.hw, STAGE.hh) * 0.3, A = [[-0.5, 0.45], [0.5, 0.45], [-0.5, -0.45], [0.5, -0.45]];
    s.dyn = (t, p, ta = -1) => {   // 到的時候四顆合成兩顆、再合成一顆大的，之後停在一顆
      const c = ta >= 0 ? ta : 0, m1 = sstep(0.5, 1.3, c), m2 = sstep(1.9, 2.7, c), pop = 0;
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
    const s = newShape(), TOPC = freeStage("films", topcAt());
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
    s.dyn = (t, p, ta = -1) => {   // 到的時候播放鍵跳幾下
      const k = 1 + (ta >= 0 ? 0.16 * Math.max(0, Math.sin(ta * 7)) * Math.exp(-ta * 1.1) : 0);
      for (let i = 0; i < n; i++) if (PL[i]) { s.pos[i * 3] = TOPC.cx + (BASE[i * 2] - TOPC.cx) * k; s.pos[i * 3 + 1] = TOPC.cy + (BASE[i * 2 + 1] - TOPC.cy) * k; s.pos[i * 3 + 2] = 1.5 * (k - 1) * 8; }
    };
    s.spin = spinOf(TOPC.cx, TOPC.cy, 0.3, 0.4, -0.1);
    s.bright = 1.12;
    return finish(s);
  }

  // ---- 金句：光筆照筆順一筆一筆寫（楷書筆順資料，Make Me a Hanzi） ----
  let STROKES = null;
  const penState = { q0: { t0: -1, done: false }, q1: { t0: -1, done: false }, q2: { t0: -1, done: false }, q3: { t0: -1, done: false } };
  function buildPenQuote(q, qi) {
    const key = "q" + qi, lines = phone ? q.p : q.d, s = newShape();
    const maxC = Math.max(...lines.map(l => [...l].length));
    const cell = Math.min(QUOTE.hw * 2 / maxC, QUOTE.hh * 2 / (lines.length * 1.16)), lh = cell * 1.16;
    const RES = 96, cv = document.createElement("canvas"); cv.width = cv.height = RES;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const pts = [], strokes = [], svgParts = [];
    let gs = 0;
    lines.forEach((l, li) => {
      const cs = [...l], top = QUOTE.cy + lines.length * lh / 2 - li * lh - (lh - cell) / 2;
      cs.forEach((ch, ci) => {
        const d = STROKES && STROKES[ch]; if (!d) return;
        const left = QUOTE.cx - cs.length * cell / 2 + ci * cell;
        const W = (X, Yv) => [left + X / 1024 * cell, top - (900 - Yv) / 1024 * cell];   // 筆順資料的座標（y 往上）換成世界座標
        const occ = new Uint8Array(RES * RES);
        svgParts.push(`<g transform="translate(${left.toFixed(3)} ${(-top).toFixed(3)}) scale(${(cell / 1024).toFixed(5)} ${(-cell / 1024).toFixed(5)}) translate(0 -900)">${d.s.map(p => `<path d="${p}"/>`).join("")}</g>`);
        d.s.forEach((path, k) => {
          g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, RES, RES);
          g.setTransform(RES / 1024, 0, 0, -RES / 1024, 0, 900 * RES / 1024);
          g.fillStyle = "#fff"; g.fill(new Path2D(path));
          const px = g.getImageData(0, 0, RES, RES).data;
          const med = d.m[k].map(([X, Yv]) => [X * RES / 1024, (900 - Yv) * RES / 1024]);
          const cum = [0]; for (let m = 1; m < med.length; m++) cum.push(cum[m - 1] + Math.hypot(med[m][0] - med[m - 1][0], med[m][1] - med[m - 1][1]));
          const tot = cum[cum.length - 1] || 1;
          for (let y = 0; y < RES; y += 2) for (let x = 0; x < RES; x += 2) {
            const o = y * RES + x;
            if (px[o * 4 + 3] < 120 || occ[o]) continue;
            occ[o] = 1;
            let best = 1e9, bu = 0;   // 這一點在這一筆的哪裡（投影到中心線）
            for (let m = 1; m < med.length; m++) {
              const ax = med[m - 1][0], ay = med[m - 1][1], bx = med[m][0] - ax, by = med[m][1] - ay, L2 = bx * bx + by * by || 1;
              const f = clamp(((x - ax) * bx + (y - ay) * by) / L2, 0, 1), dd = (x - ax - bx * f) ** 2 + (y - ay - by * f) ** 2;
              if (dd < best) { best = dd; bu = (cum[m - 1] + f * Math.sqrt(L2)) / tot; }
            }
            const wp = W(x / RES * 1024, 900 - y / RES * 1024);
            pts.push(wp[0], wp[1], gs + bu * 0.999);
          }
          strokes.push(d.m[k].map(([X, Yv]) => W(X, Yv)));
          gs++;
        });
      });
    });
    const n = Math.floor(N * 0.86), np = Math.floor(N * 0.025), K = new Float32Array(N).fill(1e9), TG = new Float32Array(N * 2);
    const cnt = Math.max(1, pts.length / 3);
    for (let i = 0; i < n; i++) {
      const j = Math.min(cnt - 1, Math.floor(i * cnt / n + rand() * cnt / n)) * 3;
      TG[i * 2] = (pts[j] ?? QUOTE.cx) + (rand() - 0.5) * cell * 0.012; TG[i * 2 + 1] = (pts[j + 1] ?? QUOTE.cy) + (rand() - 0.5) * cell * 0.012; K[i] = pts[j + 2] ?? 0;
      s.pos[i * 3] = TG[i * 2]; s.pos[i * 3 + 1] = TG[i * 2 + 1]; s.pos[i * 3 + 2] = (rand() - 0.5) * 0.4;
      setC(s, i, rand() < 0.15 ? CREAM : goldish()); s.size[i] = 0.15 * (0.8 + rand() * 0.4); s.alpha[i] = 0.95;
    }
    for (let i = n; i < n + np; i++) { setC(s, i, [1, 0.97, 0.88], [1, 0.97, 0.88]); s.size[i] = 0.2 + rand() * 0.16; s.alpha[i] = 0; }
    fillDust(s, n + np, QUOTE, 1.2);
    // 筆的時間表：每一筆照長度寫，筆畫之間提筆移過去
    const slen = strokes.map(m => { let l = 0; for (let k = 1; k < m.length; k++) l += Math.hypot(m[k][0] - m[k - 1][0], m[k][1] - m[k - 1][1]); return l || 0.01; });
    const nChars = lines.join("").length, totalLen = slen.reduce((a, b) => a + b, 0) || 1;
    const T = 1.1 + 0.17 * nChars, gap = 0.05, speed = totalLen / Math.max(0.5, T - gap * strokes.length);
    const st0 = []; let acc = 0;
    slen.forEach(l => { st0.push(acc); acc += l / speed + gap; });
    const total = acc;
    const tipAt = (k, f, o) => {   // 第 k 筆、走到 f 的位置
      const m = strokes[k]; if (!m) return; let d = f * slen[k];
      for (let q = 1; q < m.length; q++) { const l = Math.hypot(m[q][0] - m[q - 1][0], m[q][1] - m[q - 1][1]); if (d <= l || q === m.length - 1) { const u = clamp(d / (l || 1), 0, 1); o[0] = lerp(m[q - 1][0], m[q][0], u); o[1] = lerp(m[q - 1][1], m[q][1], u); return; } d -= l; }
    };
    const tip = [0, 0], R = Array.from({ length: np }, () => [rand() * 6.283, rand()]);
    const P0 = strokes.length ? strokes[0][0] : [QUOTE.cx, QUOTE.cy];
    const ps = penState[key];
    s.pen = true;
    s.dyn = (t) => {
      const el = ps.t0 < 0 ? -1 : clock - ps.t0;
      let W = -1;
      if (el < 0) { tip[0] = P0[0]; tip[1] = P0[1]; }
      else if (el >= total) { W = 1e8; tipAt(strokes.length - 1, 1, tip); }
      else {
        let k = 0; while (k < strokes.length - 1 && el >= st0[k + 1]) k++;
        const f = clamp((el - st0[k]) / (slen[k] / speed), 0, 1);
        W = k + f * 0.999; tipAt(k, f, tip);
      }
      for (let i = 0; i < n; i++) {
        if (K[i] <= W) { s.pos[i * 3] = TG[i * 2]; s.pos[i * 3 + 1] = TG[i * 2 + 1]; s.alpha[i] = 0.95; }
        else { s.pos[i * 3] = tip[0]; s.pos[i * 3 + 1] = tip[1]; s.alpha[i] = 0; }
      }
      const writing = el >= 0 && el < total, glow = writing ? 1 : el < 0 ? 0.6 : Math.max(0, 1 - (el - total) / 0.6);
      for (let i = n; i < n + np; i++) {   // 筆尖的光
        const r = R[i - n], a = r[0] + t * (5 + r[1] * 4), rr = cell * 0.05 * (0.3 + r[1]);
        s.pos[i * 3] = tip[0] + Math.cos(a) * rr; s.pos[i * 3 + 1] = tip[1] + Math.sin(a) * rr; s.pos[i * 3 + 2] = 0.6;
        s.alpha[i] = glow * (0.5 + 0.5 * r[1]);
      }
      s._tip = writing ? tip : null;
      if (el >= total && !ps.done) { ps.done = true; ps.doneAt = clock; dispatchEvent(new CustomEvent("sn:penDone", { detail: { key } })); }
    };
    s.dyn(0);
    // 寫完之後浮出清楚的字（同一套筆畫的向量圖）
    const minX = QUOTE.cx - maxC * cell / 2, topY = QUOTE.cy + lines.length * lh / 2, wv = maxC * cell, hv = lines.length * lh;
    TEXT[key] = { svg: `<svg viewBox="${minX.toFixed(3)} ${(-topY).toFixed(3)} ${wv.toFixed(3)} ${hv.toFixed(3)}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pg${qi}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3cf"/><stop offset=".55" stop-color="#e9c46f"/><stop offset="1" stop-color="#b8862e"/></linearGradient></defs><g fill="url(#pg${qi})">${svgParts.join("")}</g></svg>`,
      rect: { cx: minX + wv / 2, cy: topY - hv / 2 }, w: wv, h: hv, n };
    s.text = true;
    return finish(s);
  }

  // ---- 結尾：新 logo（炭黑＋亮藍兩半），兩半合起來；粒子一路流進 LINE 官方按鈕變綠 ----
  const LOGO_D = "M534 16L503 8L476 8L461 11L434 22L93 221L78 232L64 246L57 255L45 277L38 301L36 332L36 663L41 693L53 719L74 745L93 759L180 812L190 812L196 809L202 802L207 788L207 557L211 532L216 515L232 481L251 454L272 431L326 378L361 353L394 337L432 326L468 322L501 324L524 329L545 337L564 347L582 360L619 397L634 405L647 408L668 407L690 398L703 388L711 379L722 359L727 335L727 187L724 163L715 140L701 120L687 107L584 44Z";
  const LOGO_B = "M800 168L789 168L782 172L774 185L772 196L773 399L770 428L762 458L746 494L729 521L680 576L652 602L625 622L590 641L556 652L518 657L481 655L459 650L433 640L410 627L398 618L371 590L362 583L351 577L338 573L312 574L291 583L277 594L269 603L259 621L253 644L253 796L257 816L266 838L278 855L298 873L444 961L460 967L480 971L512 969L536 961L885 760L903 747L912 738L925 721L934 704L940 686L943 663L943 317L941 299L936 281L928 264L919 250L905 234L887 220Z";
  let endBtn = null;
  const endOAEl = document.querySelector("#end .lbtn.oa"), endCardEl = document.querySelector("#end > .copy");
  function buildLogo() {
    const s = newShape();
    const smp = sampleCanvas(300, 300, g => {
      g.setTransform(300 / 980, 0, 0, 300 / 980, 0, 0);
      g.fillStyle = "rgb(255,255,255)"; g.fill(new Path2D(LOGO_D));
      g.fillStyle = "rgb(0,0,255)"; g.fill(new Path2D(LOGO_B));
    }, 2);
    const ST = phone ? freeStage("logo", STAGE) : { cx: 0, cy: Hw * 0.22, hw: Ww * 0.2, hh: Hw * 0.2 };   // 電腦版卡片在下面正中間，logo 放上面
    const n = Math.floor(N * 0.74), R = Math.min(ST.hw, ST.hh) * 0.95, rect = { cx: ST.cx, cy: ST.cy + ST.hh * 0.12, hw: R, hh: R };
    const HALF = new Int8Array(N);
    placeSample(s, smp, 0, n, rect, { size: 0.21, jitter: 0.4, depth: 1.2,
      color: (r, g, b) => b > 200 && r < 100 ? mix3(OXBLUE, OXBLUE_LT, rand() * 0.4) : mix3(hex(0x2c2f36), GOLD_DK, 0.35 + rand() * 0.3),
      colorD: c => c[2] > 0.6 ? c : mix3(GOLD_LT, CREAM, rand()),
      tag: (i, px, py) => { HALF[i] = 0; } });
    for (let i = 0; i < n; i++) HALF[i] = s.col[i * 3 + 2] > 0.6 ? 1 : 0;
    const BASE = s.pos.slice(0, n * 3);
    const nf = N - n, F = new Float32Array(nf * 3);
    for (let k = 0; k < nf; k++) { F[k * 3] = rand(); F[k * 3 + 1] = rand(); F[k * 3 + 2] = rand(); }
    const btn = [rect.cx, rect.cy - R * 1.8];
    s.dyn = (t, p, ta = -1) => {
      const c = ta >= 0 ? ta : 99;
      const gap = 0.2 * R * (1 - sstep(0.3, 1.5, c));   // 到的時候兩半從分開慢慢合起來
      for (let i = 0; i < n; i++) { const d = HALF[i] ? 1 : -1; s.pos[i * 3] = BASE[i * 3] + d * gap * 0.75; s.pos[i * 3 + 1] = BASE[i * 3 + 1] - d * gap * 0.75; }
      // 粒子流進 LINE 官方按鈕（按鈕在畫面上的位置換成世界座標）
      const on = endBtn && endBtn.on;
      const bx = on ? endBtn.x : btn[0], by = on ? endBtn.y : btn[1], bwid = on ? endBtn.w : R;
      for (let k = 0; k < nf; k++) {
        const i = n + k, u = (F[k * 3] + t * (0.16 + F[k * 3 + 1] * 0.1)) % 1, side = F[k * 3 + 2] - 0.5;
        const sx = rect.cx + side * R * 1.4, sy = rect.cy + (F[k * 3 + 1] - 0.5) * R * 1.2;
        const ex = bx + side * bwid * 0.9, ey = by;
        const mx = lerp(sx, ex, 0.5) + side * R * 1.2, my = lerp(sy, ey, 0.5) + R * 0.2;
        const a = 1 - u, x = a * a * sx + 2 * a * u * mx + u * u * ex, y = a * a * sy + 2 * a * u * my + u * u * ey;
        s.pos[i * 3] = x; s.pos[i * 3 + 1] = y; s.pos[i * 3 + 2] = Math.sin(u * 3.14) * 2 * side;
        const gr = sstep(0.45, 0.9, u);
        setC(s, i, mix3(GOLD, LINEG, gr), mix3(GOLD_LT, LINEG_LT, gr));
        s.size[i] = 0.13 + 0.08 * Math.sin(u * 3.14); s.alpha[i] = on ? 0.85 * bump(u, 0, 1) : 0.25 * bump(u, 0, 0.5);
      }
    };
    s.dyn(0);
    s.spin = spinOf(rect.cx, rect.cy, 0.5, 0.32, 0);
    s.spinN = n;   // 流向按鈕的粒子不跟著轉
    s.bright = 1.15;
    return finish(s);
  }

  let textReady = false;
  function buildAll() {
    layout();
    seed = 7;
    shapes.nebula = buildCosmos();
    shapes.smiley = buildSmiley();
    shapes.balance = buildBalance();
    shapes.tf = buildTf();
    shapes.rocket = buildRocket();
    shapes.breakout = buildBreakout();
    shapes.book = buildBook();
    shapes.ox = buildOx();
    shapes.merge = buildMerge();
    shapes.films = buildFilms();
    shapes.logo = buildLogo();
    if (textReady) { shapes.dao = buildDao(); if (STROKES) QUOTES.forEach((q, i) => { shapes["q" + i] = buildPenQuote(q, i); }); }
    buildCandleMeshes();
    buildIdx();
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

  const shapeOf = key => shapes[key] || shapes.book;
  // ---------- 每一段怎麼轉到下一段 ----------
  // 專長之間（交易→寫書→做工具→做影片→結尾）用大轉場；同一塊裡面用小轉場
  const TRANS = { smiley: "taiji", balance: "part", dao: "sand", tf: "stretch", rocket: "gather", breakout: "launch", book: "fall", q0: "pen", q1: "pen", q2: "pen", q3: "pen", ox: "vortex", merge: "drop", films: "implode", logo: "implode" };
  const BIG = { smiley: 1, book: 1, ox: 1, films: 1, logo: 1 };
  // 形狀接形狀：笑臉的眼睛變成兩個秤盤、嘴巴變成橫樑和柱子、臉的圓圈變成 K 棒
  const PAIRS = { "smiley>balance": [[1, 1], [2, 2], [3, 3], [3, 4], [0, 0], [4, 0]] };
  const look = { x: 0, y: 0, on: false };
  let smileKick = -9, curKey = "nebula", IDX = [];
  function mapGroups(A, B, pairs) {
    const map = new Int32Array(N).fill(-1), usedB = new Uint8Array(N);
    const byX = (S, L) => L.sort((p, q) => S.pos[p * 3] - S.pos[q * 3] || S.pos[p * 3 + 1] - S.pos[q * 3 + 1]);
    for (const [ga, gb] of pairs) {
      const LA = [], LB = [];
      for (let i = 0; i < N; i++) { if (A.grp[i] === ga && map[i] < 0) LA.push(i); if (B.grp[i] === gb && !usedB[i]) LB.push(i); }
      byX(A, LA); byX(B, LB);
      const n = Math.min(LA.length, LB.length);
      for (let k = 0; k < n; k++) { const ia = LA[Math.floor(k * LA.length / n)], ib = LB[Math.floor(k * LB.length / n)]; if (map[ia] < 0 && !usedB[ib]) { map[ia] = ib; usedB[ib] = 1; } }
    }
    const RA = Array.prototype.filter.call(A.perm, i => map[i] < 0), RB = Array.prototype.filter.call(B.perm, i => !usedB[i]);
    for (let k = 0; k < RA.length; k++) map[RA[k]] = RB[k];
    return map;
  }
  // 每一段裡，第 i 顆粒子對應到那個形狀的第幾個點（同一顆粒子一路接下去，不會跳）
  function buildIdx() {
    IDX = [];
    let prev = null, prevS = null;
    for (let k = 0; k < secs.length; k++) {
      const S = shapeOf(secs[k].key), cur = new Int32Array(N);
      if (!prev) cur.set(S.perm);
      else {
        const pr = PAIRS[secs[k - 1].key + ">" + secs[k].key];
        if (pr && prevS.grp && S.grp) { const map = mapGroups(prevS, S, pr); for (let i = 0; i < N; i++) cur[i] = map[prev[i]]; }
        else { const rank = new Int32Array(N); for (let r = 0; r < N; r++) rank[prevS.perm[r]] = r; for (let i = 0; i < N; i++) cur[i] = S.perm[rank[prev[i]]]; }
      }
      IDX.push(cur); prev = cur; prevS = S;
    }
  }

  // ---------- 主角旁邊的小標籤 ----------
  const plEl = document.createElement("div");
  plEl.id = "plabels"; plEl.setAttribute("aria-hidden", "true");
  document.body.appendChild(plEl);
  const lblSpans = new Map(), lo3 = [0, 0, 0], lr3 = [0, 0, 0];
  function updLabels(A, RA, va, B, RB, vb) {
    const seen = new Set();
    const one = (S, R, vis) => {
      if (!S.labels || vis <= 0.01) return;
      for (const L of S.labels) {
        const a = L.f(lo3) * vis;
        let el = lblSpans.get(L);
        if (!el) { el = document.createElement("span"); el.className = "pl" + (L.cls ? " " + L.cls : ""); el.textContent = L.t; plEl.appendChild(el); lblSpans.set(L, el); }
        seen.add(L);
        let x = lo3[0], y = lo3[1], z = lo3[2];
        if (R) { const dx = x - R.cx, dy = y - R.cy; const x1 = dx * R.cyw + z * R.syw, z1 = -dx * R.syw + z * R.cyw; x = R.cx + x1; y = R.cy + dy * R.cp - z1 * R.sp; z = dy * R.sp + z1 * R.cp; }
        const e = PM.elements, w = e[3] * x + e[7] * y + e[11] * z + e[15];
        if (w <= 0.1) { el.style.opacity = "0"; continue; }
        const sx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w * 0.5 + 0.5) * W, sy = (0.5 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w * 0.5) * H;
        el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
        el.style.opacity = clamp(a, 0, 1).toFixed(3);
      }
    };
    one(A, RA, va); if (B !== A) one(B, RB, vb);
    for (const [L, el] of lblSpans) if (!seen.has(L) && el.style.opacity !== "0") el.style.opacity = "0";
  }

  // ---------- 粒子 ----------
  const P = new Float32Array(NP * 3), V = new Float32Array(N * 3);
  const KS = new Float32Array(N), DL = new Float32Array(N), PH = new Float32Array(N), TJ = new Float32Array(N * 2);
  const col = new Float32Array(NP * 3), colD = new Float32Array(NP * 3), size = new Float32Array(NP), alpha = new Float32Array(NP), lightA = new Float32Array(NP).fill(1);
  buildAll();
  const allText = "道法術　";
  Promise.race([   // 道法術的字型、金句的筆順資料都到了再組（最多等 3.5 秒）
    Promise.all([
      document.fonts.load(`700 150px "Noto Serif TC"`, allText),
      fetch("media/strokes.json").then(r => r.json()).then(j => { STROKES = j; }).catch(() => {})
    ]),
    new Promise(r => setTimeout(r, 3500))
  ]).then(() => { textReady = true; buildAll(); measure(); });

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
  // 景深：離焦點越遠越大、越淡、越糊；光暈：同一批粒子再畫一次大而淡的光；拖尾：動得快的粒子拉出一條光
  const pointVS = halo => `attribute vec3 aColor; attribute vec3 aColorD; attribute float aSize; attribute float aAlpha; attribute float aLight;
      uniform float uScale, uBoost, uMaxPx, uFocus, uDof; varying vec3 vC; varying vec3 vCD; varying float vA; varying float vL; varying float vB;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float bl = clamp(abs(-mv.z - uFocus) * uDof - 0.06, 0.0, 1.0);
        gl_PointSize = clamp(aSize * uScale / -mv.z * (1.0 + bl * 2.2) * ${halo ? "3.6" : "1.0"}, 1.0, uMaxPx * ${halo ? "2.4" : "1.0"});
        vC = aColor; vCD = aColorD; vA = aAlpha * uBoost * mix(1.0, 0.32, bl) * ${halo ? "0.1" : "1.0"}; vL = aLight; vB = bl; }`;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { ...shared, uScale: { value: 1 }, uBoost: { value: 1 }, uMaxPx: { value: 24 }, uFocus: { value: CAMZ }, uDof: { value: 0.012 } },
    vertexShader: pointVS(false),
    fragmentShader: `precision highp float;
      ${MASK}
      varying vec3 vC; varying vec3 vCD; varying float vA; varying float vL; varying float vB;
      void main(){ float d = length(gl_PointCoord - 0.5); float m = maskAt(gl_FragCoord.xy);
        float core = mix(smoothstep(0.5, 0.1, d), 1.0 - smoothstep(0.0, 0.5, d), vB);
        float a = (core + smoothstep(0.5, 0.0, d) * 0.35 * m) * vA * mix(vL, 1.0, m);
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(vC, vCD, m), min(a, 1.0)); }`
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; points.renderOrder = 1;
  scene.add(points);
  const haloMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: mat.uniforms,
    vertexShader: pointVS(true),
    fragmentShader: `precision highp float;
      ${MASK}
      varying vec3 vC; varying vec3 vCD; varying float vA; varying float vL; varying float vB;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d2 = dot(q, q); float m = maskAt(gl_FragCoord.xy);
        float a = exp(-d2 * 16.0) * vA * mix(vL, 1.0, m) * mix(0.5, 1.0, m);
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(vC, vCD, m), a); }`
  });
  const haloPts = new THREE.Points(geo, haloMat);
  haloPts.frustumCulled = false; haloPts.renderOrder = 0;
  scene.add(haloPts);
  const TP = new Float32Array(N * 6), TC = new Float32Array(N * 6), TCD = new Float32Array(N * 6), TA = new Float32Array(N * 2);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", attr(TP, 3)); trailGeo.setAttribute("aColor", attr(TC, 3)); trailGeo.setAttribute("aColorD", attr(TCD, 3)); trailGeo.setAttribute("aA", attr(TA, 1));
  const trailMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { ...shared },
    vertexShader: `attribute vec3 aColor; attribute vec3 aColorD; attribute float aA; varying vec3 vC; varying vec3 vCD; varying float vA;
      void main(){ vC = aColor; vCD = aColorD; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `precision highp float; ${MASK} varying vec3 vC; varying vec3 vCD; varying float vA;
      void main(){ float m = maskAt(gl_FragCoord.xy); if (vA < 0.01) discard; gl_FragColor = vec4(mix(vC, vCD, m), vA); }`
  });
  const trails = new THREE.LineSegments(trailGeo, trailMat);
  trails.frustumCulled = false; trails.renderOrder = 1;
  scene.add(trails);
  let fxOn = true;   // 手機跑太慢時關掉光暈和拖尾

  const T = { x: new Float32Array(NT), y: new Float32Array(NT), z: new Float32Array(NT), vx: new Float32Array(NT), vy: new Float32Array(NT), vz: new Float32Array(NT), life: new Float32Array(NT), span: new Float32Array(NT).fill(1), big: new Float32Array(NT), hue: new Uint8Array(NT), n: 0 };
  function spark(x, y, z, vx, vy, vz, span, big, hue = 0) { const j = T.n++ % NT; T.x[j] = x; T.y[j] = y; T.z[j] = z; T.vx[j] = vx; T.vy[j] = vy; T.vz[j] = vz; T.life[j] = 1; T.span[j] = span; T.big[j] = big; T.hue[j] = hue; }

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
      if (curKey === "smiley") smileKick = clock;   // 點笑臉，它笑得更大
      const p = worldAt(e.clientX, e.clientY);
      if (p) for (let k = 0; k < 40; k++) { const a = (k / 40) * 6.283; spark(p.x, p.y, 1, Math.cos(a) * 9, Math.sin(a) * 9, 0, 0.75, 1.3); }
    }
    ptr.down = false; ptr.holdOn = false;
  }, { passive: true });
  addEventListener("pointercancel", () => { ptr.down = false; ptr.holdOn = false; }, { passive: true });
  // 按鈕那邊（ui.js）要粒子：描邊的光點、按下去噴出來
  addEventListener("sn:spark", ev => {
    if (reduce) return;
    const d = ev.detail || {}, p = worldAt(d.x, d.y);
    if (!p) return;
    const n = d.n || 1, sp = d.v ?? 6;
    for (let k = 0; k < n; k++) {
      const a = d.a != null ? d.a + (rand() - 0.5) * (d.spread ?? 0.9) : d.kind === "burst" ? (k / n) * 6.283 + rand() * 0.25 : rand() * 6.283, v = sp * (0.45 + rand() * 0.8);
      spark(p.x + (rand() - 0.5) * 0.08, p.y + (rand() - 0.5) * 0.08, 1, Math.cos(a) * v, Math.sin(a) * v + (d.kind === "trail" ? 0.3 : 0), (rand() - 0.5) * v * 0.3, d.life ?? 0.7, d.big ?? 1.1, d.hue || 0);
    }
  });
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
      ptextEl.innerHTML = T0.svg ? T0.svg : key === "dao" ? "<span>道</span>　<span>法</span>　<span>術</span>" : T0.lines.join("<br>");
      ptextEl.classList.toggle("svg", !!T0.svg);
    }
    const k = H / Hw;
    if (T0.svg) { ptextEl.style.width = (T0.w * k).toFixed(1) + "px"; ptextEl.style.height = (T0.h * k).toFixed(1) + "px"; }
    else { ptextEl.style.width = ptextEl.style.height = ""; ptextEl.style.fontSize = (T0.fs * T0.sc * k).toFixed(2) + "px"; }
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
  const arrive = {}, lastPair = { a: -1, b: -1, m: 0 }, imp = { key: null, t0: 0, hit: false };
  let lastHold = null, lastWhoosh = -9, lastAmb = -9;
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
    if (slowN > 90 && slowEma > 0.028 && dprCap <= 1.2 && fxOn) { fxOn = false; haloPts.visible = trails.visible = false; }   // 還是太慢：關掉光暈和拖尾
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
    if (running) { for (let j = 1; j < BK.RUN; j++) if (sT >= runAt(j) && bseq.hits < j) {
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
    if (clock - lastAmb > 0.3) { lastAmb = clock; ambient(bkOn ? 0.08 : 0.03); }   // 低音鋪底，突破那段大一點

    // ----- 背景、陰陽 -----
    shared.uBase.value = yy.base; shared.uTr.value = yy.tr; shared.uFrom.value = yy.from; shared.uAng.value = taijiAng(yy.tr);
    shared.uSplit.value = yy.split; shared.uInv.value = inv;
    bgMat.uniforms.uTime.value = clock; bgMat.uniforms.uHero.value = 1 - sstep(0.0, 0.5, yy.t1); bgMat.uniforms.uGlow.value = bump(yy.tr, 0, 1) * 0.95;
    const glow = yy.dark > 0.999 && yy.tr === 0 && yy.split < 0.001 && inv === 0;
    const wantBlend = glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (mat.blending !== wantBlend) { mat.blending = wantBlend; haloMat.blending = wantBlend; trailMat.blending = wantBlend; mat.needsUpdate = haloMat.needsUpdate = trailMat.needsUpdate = true; }

    const A = shapeOf(SA.key), B = shapeOf(SB.key);
    // 到站：停在某一段時，主角演一次動作（ta＝到站後幾秒；還沒到過是 -1）
    const holdKey = st.m === 0 ? SA.key : null;
    if (holdKey && holdKey !== lastHold) { arrive[holdKey] = clock; lastHold = holdKey; }
    for (const k in arrive) if (k !== SA.key && k !== SB.key) { delete arrive[k]; if (lastHold === k) lastHold = null; }
    const taOf = k => arrive[k] != null ? clock - arrive[k] : -1;
    curKey = st.m < 0.5 ? SA.key : SB.key;
    // 金句：轉進來一半時光筆開始寫；往回滑就重來
    for (const k in penState) {
      const ps = penState[k], inA = SA.key === k, inB = SB.key === k;
      if (!inA && !inB) { ps.t0 = -1; ps.done = false; continue; }
      const prog = inA ? 1 : st.m;
      if (ps.t0 < 0 && prog >= 0.38 && !reduce) ps.t0 = clock;
      if (reduce && ps.t0 < 0 && prog >= 0.38) ps.t0 = clock - 99;
      if (!inA && st.m < 0.2 && ps.t0 >= 0) { ps.t0 = -1; ps.done = false; }
    }
    if (look.on || now - ptr.at < 2500) { const p = worldAt(ptr.x, ptr.y); look.on = !!p && now - ptr.at < 2500; if (p) { look.x = p.x; look.y = p.y; } }
    if (A.dyn) A.dyn(clock, pA, taOf(SA.key));
    if (B !== A && B.dyn) B.dyn(clock, pB, taOf(SB.key));
    // 這一段轉場用哪一種
    const tmode = st.m > 0 && st.m < 1 ? (TRANS[SB.key] || "sweep") : null;
    const samePair = lastPair.a === st.a && lastPair.b === st.b;
    if (tmode === "implode") {   // 先收再砸：收到 0.42 就自己砸開（跟著時間，不跟著手指）
      if (imp.key !== SB.key && st.m >= 0.42 && ((samePair && lastPair.m < 0.42) || (lastPair.a === st.a && lastPair.m === 0))) {
        imp.key = SB.key; imp.t0 = clock; imp.hit = false;
        braam(0.45, 1);
      }
      if (imp.key === SB.key && st.m < 0.38) imp.key = null;
    } else if (st.m === 0) imp.key = null;
    const impT = imp.key === SB.key && tmode === "implode" ? clock - imp.t0 : -1;
    if (impT >= 0.45 && !imp.hit) {
      imp.hit = true; shake = 1.1;
      const C = [(A.box.cx + B.box.cx) / 2, (A.box.cy + B.box.cy) / 2];
      for (let k = 0; k < 120; k++) { const a = rand() * 6.283, v = 8 + rand() * 16; spark(C[0], C[1], 0.8, Math.cos(a) * v, Math.sin(a) * v, (rand() - 0.5) * 8, 1.0, 1.5); }
    }
    // 轉場音效：每一段轉過一半輕輕一聲（先收再砸那幾段用 Braam）
    if (tmode && tmode !== "implode" && samePair && (lastPair.m - 0.5) * (st.m - 0.5) < 0 && clock - lastWhoosh > 0.5) { lastWhoosh = clock; whoosh(BIG[SB.key] ? 0.9 : 0.55); }
    lastPair.a = st.a; lastPair.b = st.b; lastPair.m = st.m;

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
    mat.uniforms.uFocus.value = camPos.distanceTo(camLook);   // 景深的焦點對在主角
    if ((SA.key === "logo" || SB.key === "logo") && endOAEl) {   // 結尾：LINE 官方按鈕在哪裡，粒子就流到哪裡
      const r = endOAEl.getBoundingClientRect(), c = worldAt(r.left + r.width / 2, r.top + r.height / 2), l = worldAt(r.left + 8, r.top + r.height / 2);
      endBtn = { on: endCardEl.classList.contains("on") && !!c && !!l, x: c ? c.x : 0, y: c ? c.y : 0, w: c && l ? Math.abs(c.x - l.x) : 1 };
    }

    // ----- 浮出來的真字（金句要等光筆寫完） -----
    let tk = null, tv = 0;
    if (st.m < 0.5 && A.text) { tk = SA.key; tv = 1 - sstep(0.03, 0.25, st.m); }
    else if (st.m >= 0.5 && B.text) { tk = SB.key; tv = sstep(0.75, 0.97, st.m); }
    if (tk && penState[tk]) { const ps = penState[tk]; tv *= ps.done ? sstep(0, 0.7, clock - ps.doneAt) : 0; }
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
    const IA = IDX[st.a] || A.perm, IB = IDX[st.b] || B.perm, sA = A.stiff || 1, sB = B.stiff || 1;
    const RA = spinCS(A), RB = spinCS(B), brA = A.bright || 1, brB = B.bright || 1;
    const tjW = yy.tr > 0 ? sstep(0.04, 0.28, yy.tr) * (1 - sstep(0.5, 0.78, yy.tr)) : 0;   // 轉場時粒子先繞太極
    const rot = (R, pos, j, o, spun = true) => {
      let x = pos[j], y = pos[j + 1], z = pos[j + 2];
      if (R && spun) { const dx = x - R.cx, dy2 = y - R.cy; const x1 = dx * R.cyw + z * R.syw, z1 = -dx * R.syw + z * R.cyw; const y1 = dy2 * R.cp - z1 * R.sp, z2 = dy2 * R.sp + z1 * R.cp; x = R.cx + x1; y = R.cy + y1; z = z2; }
      o[0] = x; o[1] = y; o[2] = z;
    };
    // 轉場要用到的中心點
    const Cx = (A.box.cx + B.box.cx) / 2, Cy = (A.box.cy + B.box.cy) / 2;
    const Bh = Math.max(1e-3, B.box.y1 - B.box.y0), skyY = Hw * 0.62;
    const gC = tmode === "gather" ? (B.rocketHead ? B.rocketHead() : [B.box.cx, B.box.cy]) : null;
    const pivY = A.candles ? BG.yb : A.box.y0;
    const impSq = impT >= 0 ? (impT < 0.45 ? 1 : 1 - sstep(0.45, 0.7, impT)) : (tmode === "implode" ? sstep(0.25, 0.42, m) : 0);   // 收成一點時粒子變亮
    const oa = [0, 0, 0], ob = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      const i3 = i * 3, ja1 = IA[i], jb1 = IB[i], ja = ja1 * 3, jb = jb1 * 3;
      let mi = m;
      if (m > 0 && m < 1) mi = sstep(0, 1, clamp((m - DL[i] * 0.4) / 0.6, 0, 1));
      let ia = 1 - mi;
      rot(RA, A.pos, ja, oa, ja1 < (A.spinN ?? N)); rot(RB, B.pos, jb, ob, jb1 < (B.spinN ?? N));
      let tx, ty, tz, aMul = 1, sMul = 1, swOn = 1;
      switch (tmode) {
        case "implode": {
          swOn = 0;
          const ph = PH[i];
          if (impT >= 0) {
            if (impT < 0.45) { const j = 0.25 + 0.15 * Math.sin(clock * 30 + ph * 5); tx = Cx + Math.cos(ph) * j; ty = Cy + Math.sin(ph * 1.7) * j; tz = Math.sin(ph * 2.3) * j; mi = 0.5; }
            else { const bt = easeOutBack((impT - 0.45) / 0.9); tx = Cx + (ob[0] - Cx) * bt; ty = Cy + (ob[1] - Cy) * bt; tz = ob[2] * bt; mi = clamp((impT - 0.45) / 0.5, 0, 1); }
          } else if (m < 0.42) {
            const c = Math.pow(sstep(0, 0.42, m), 1.4), ang = c * 2.6 + ph * 0.1, rx = (oa[0] - Cx) * (1 - c), ry = (oa[1] - Cy) * (1 - c), ca = Math.cos(ang), sa = Math.sin(ang);
            tx = Cx + rx * ca - ry * sa; ty = Cy + rx * sa + ry * ca; tz = oa[2] * (1 - c); mi = 0;
          } else { tx = ob[0]; ty = ob[1]; tz = ob[2]; mi = 1; }
          ia = 1 - mi; sMul = 1 + 0.5 * impSq;
          break;
        }
        case "sand": {   // 先被吹上天，再從下面一層一層落下來堆成字
          swOn = 0;
          const ky = clamp((ob[1] - B.box.y0) / Bh, 0, 1), sT = 0.34 + ky * 0.4, rise = sstep(0, 0.3, m), fall = clamp((m - sT) / 0.24, 0, 1);
          const sx = ob[0] + Math.sin(PH[i] * 3) * 0.9, sy = skyY + (PH[i] / 6.283) * Hw * 0.18;
          if (fall <= 0) { tx = lerp(oa[0], sx, rise); ty = lerp(oa[1], sy, rise); tz = lerp(oa[2], ob[2], rise); mi = rise * 0.5; }
          else { tx = lerp(sx, ob[0], fall); ty = lerp(sy, ob[1], fall * fall); tz = ob[2]; mi = 0.5 + fall * 0.5; }
          ia = 1 - mi;
          break;
        }
        case "stretch": {   // 筆畫先壓成一條條橫線，再拉開成三層 K 線
          const mx = sstep(0, 1, clamp((m - DL[i] * 0.35) / 0.65, 0, 1)), my = sstep(0, 1, clamp(m * 1.7, 0, 1));
          tx = lerp(oa[0], ob[0], mx); ty = lerp(oa[1], ob[1], my); tz = lerp(oa[2], ob[2], mx);
          break;
        }
        case "gather": {   // 三層 K 線收進火箭裡，再散開成火箭模型
          const sph = 1.4 * (0.4 + 0.6 * (PH[i] / 6.283));
          const gx = gC[0] + Math.cos(PH[i]) * sph, gy = gC[1] + Math.sin(PH[i] * 1.3) * sph;
          if (m < 0.5) { const u = sstep(0, 0.5, m); tx = lerp(oa[0], gx, u); ty = lerp(oa[1], gy, u); tz = oa[2] * (1 - u); }
          else { const u = sstep(0.5, 1, m); tx = lerp(gx, ob[0], u); ty = lerp(gy, ob[1], u); tz = ob[2] * u; }
          swOn = 0.4;
          break;
        }
        case "launch": {   // 火箭往上飛走，太極轉成陰，再拉成 K 線
          const up2 = Math.pow(sstep(0, 0.2, m), 2) * Hw * 1.3;
          tx = lerp(oa[0], ob[0], mi); ty = lerp(oa[1] + up2, ob[1], mi); tz = lerp(oa[2], ob[2], mi);
          break;
        }
        case "fall": {   // K 棒像骨牌一根根往右倒，倒下去變成書頁
          swOn = 0;
          const u = clamp((m - DL[i] * 0.3) / 0.7, 0, 1), th = -Math.PI / 2 * sstep(0, 0.5, u), ct = Math.cos(th), stt = Math.sin(th);
          const rx = 0, ry = oa[1] - pivY;
          const fx = oa[0] + rx * ct - ry * stt, fy = pivY + rx * stt + ry * ct;
          const w = sstep(0.45, 1, u);
          tx = lerp(fx, ob[0], w); ty = lerp(fy, ob[1], w); tz = lerp(oa[2], ob[2], w); mi = w; ia = 1 - mi;
          break;
        }
        case "pen": {   // 舊的字往上飄散，粒子收進筆尖，光筆把新的字寫出來
          swOn = 0;
          const fl = sstep(0, 0.4, m), w = sstep(0.3, 0.5, m);
          const dxo = oa[0] - A.box.cx, dyo = oa[1] - A.box.cy, dl = Math.hypot(dxo, dyo) || 1;
          const fx = oa[0] + (A.pen ? Math.sin(PH[i] * 2) * 0.8 : dxo / dl * Hw * 0.5) * fl, fy = oa[1] + (A.pen ? Hw * 0.5 : dyo / dl * Hw * 0.5 + Hw * 0.2) * fl;
          tx = lerp(fx, ob[0], w); ty = lerp(fy, ob[1], w); tz = lerp(oa[2], ob[2], w);
          mi = w; ia = 1 - mi; aMul = 1;
          if (w < 1) aMul = lerp(1 - sstep(0.05, 0.38, m), 1, w);
          break;
        }
        case "vortex": {   // 捲成漩渦，捲進雷達
          const ang = Math.sin(Math.PI * m) * (4.5 + PH[i] * 0.25), shrink = 1 - 0.55 * Math.sin(Math.PI * m);
          const px0 = lerp(oa[0], ob[0], mi) - Cx, py0 = lerp(oa[1], ob[1], mi) - Cy, ca = Math.cos(ang), sa = Math.sin(ang);
          tx = Cx + (px0 * ca - py0 * sa) * shrink; ty = Cy + (px0 * sa + py0 * ca) * shrink; tz = lerp(oa[2], ob[2], mi) + Math.sin(Math.PI * m) * Math.sin(PH[i]) * 3;
          swOn = 0;
          break;
        }
        case "drop": {   // 雷達上的光點往下掉，彈幾下變成合成球
          tx = lerp(oa[0], ob[0], sstep(0, 1, mi)); ty = ob[1] < oa[1] ? lerp(oa[1], ob[1], easeOutBounce(mi)) : lerp(oa[1], ob[1], mi); tz = lerp(oa[2], ob[2], mi);
          swOn = 0.3;
          break;
        }
        default:
          tx = oa[0] * ia + ob[0] * mi; ty = oa[1] * ia + ob[1] * mi; tz = oa[2] * ia + ob[2] * mi;
      }
      if (tjW > 0.001) { taijiPoint(i, yy.tr, yy.from, tj); tx = lerp(tx, tj[0], tjW); ty = lerp(ty, tj[1], tjW); tz = lerp(tz, tj[2], tjW); }
      const sw = Math.sin(Math.PI * mi) * swirl * (1 - tjW) * swOn;
      if (sw > 0.01) { tx += Math.cos(PH[i] + clock * 0.9) * sw; ty += Math.sin(PH[i] * 1.3 + clock * 0.7) * sw; tz += Math.sin(PH[i] * 0.7 + clock) * sw; }
      if (!A.text || mi > 0.5) { tx += Math.sin(clock * 0.6 + PH[i]) * 0.04; ty += Math.cos(clock * 0.5 + PH[i] * 1.7) * 0.04; }
      let vx = V[i3], vy = V[i3 + 1], vz = V[i3 + 2];
      const px = P[i3], py = P[i3 + 1], pz = P[i3 + 2];
      const kk = KS[i] * k60 * (sA * ia + sB * mi) * (1 + tjW) * (impT >= 0.45 && impT < 1.4 ? 1.8 : 1);
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
      const g = tjW > 0.3 ? (tjW - 0.3) / 0.7 : impSq * 0.6;   // 繞太極、收成一點時偏金色
      col[i3] = lerp(A.col[ja] * ia + B.col[jb] * mi, GOLD[0], g); col[i3 + 1] = lerp(A.col[ja + 1] * ia + B.col[jb + 1] * mi, GOLD[1], g); col[i3 + 2] = lerp(A.col[ja + 2] * ia + B.col[jb + 2] * mi, GOLD[2], g);
      colD[i3] = lerp(A.colD[ja] * ia + B.colD[jb] * mi, GOLD_LT[0], g); colD[i3 + 1] = lerp(A.colD[ja + 1] * ia + B.colD[jb + 1] * mi, GOLD_LT[1], g); colD[i3 + 2] = lerp(A.colD[ja + 2] * ia + B.colD[jb + 2] * mi, GOLD_LT[2], g);
      const tw = 0.86 + 0.14 * Math.sin(clock * 2 + PH[i] * 3);
      size[i] = (A.size[ja1] * ia * brA + B.size[jb1] * mi * brB) * tw * (1 + tjW * 0.3) * sMul;
      alpha[i] = Math.max((A.alpha[ja1] * ia * hA + B.alpha[jb1] * mi * hB) * aMul, tjW * 0.9, impSq * 0.8);
    }
    tapQ = null;
    // 拖尾：動得快的粒子後面拉一條光
    const trailK = yy.tr > 0 && yy.tr < 1 ? 0 : 1;   // 太極轉場時不拉拖尾
    if (fxOn) {
      for (let i = 0; i < N; i++) {
        const i3 = i * 3, i6 = i * 6, vx = V[i3], vy = V[i3 + 1], vz = V[i3 + 2], sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const a = clamp(sp * 5 - 0.05, 0, 1) * alpha[i] * 0.6 * trailK;
        TA[i * 2] = a; TA[i * 2 + 1] = 0;
        if (a <= 0) { TP[i6] = TP[i6 + 3] = P[i3]; TP[i6 + 1] = TP[i6 + 4] = P[i3 + 1]; TP[i6 + 2] = TP[i6 + 5] = P[i3 + 2]; continue; }
        TP[i6] = P[i3]; TP[i6 + 1] = P[i3 + 1]; TP[i6 + 2] = P[i3 + 2];
        const tl = 7 * Math.min(1, 2.2 / (sp * 7));   // 拖尾最長 2.2 單位
        TP[i6 + 3] = P[i3] - vx * tl; TP[i6 + 4] = P[i3 + 1] - vy * tl; TP[i6 + 5] = P[i3 + 2] - vz * tl;
        TC[i6] = TC[i6 + 3] = col[i3]; TC[i6 + 1] = TC[i6 + 4] = col[i3 + 1]; TC[i6 + 2] = TC[i6 + 5] = col[i3 + 2];
        TCD[i6] = TCD[i6 + 3] = colD[i3]; TCD[i6 + 1] = TCD[i6 + 4] = colD[i3 + 1]; TCD[i6 + 2] = TCD[i6 + 5] = colD[i3 + 2];
      }
      for (const k of ["position", "aColor", "aColorD", "aA"]) trailGeo.attributes[k].needsUpdate = true;
    }
    // 筆尖一路噴小火花
    for (const S of [A, B]) if (S.pen && S._tip && !reduce) { const tp = S._tip; for (let q = 0; q < 2; q++) spark(tp[0], tp[1], 1, (rand() - 0.5) * 1.5, (rand() - 0.2) * 1.5, 0, 0.5, 0.9); }
    // 主角旁邊的小標籤（多方、空方、燃料、慣性、牆、日週月……）
    updLabels(A, RA, 1 - sstep(0, 0.25, m), B, RB, sstep(0.75, 1, m));

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
      const rt = sT - RUN_T0, j = clamp(Math.floor(rt / RUN_DT), 0, BK.RUN - 1), kk = BK.k[BK.run0 + j];
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
      if (T.hue[j] === 1) {   // 流進 LINE 的綠色
        col[p3] = lerp(0.1, 0.45, lf); col[p3 + 1] = 0.78; col[p3 + 2] = lerp(0.3, 0.5, lf);
        colD[p3] = lerp(0.2, 0.62, lf); colD[p3 + 1] = 0.95; colD[p3 + 2] = lerp(0.45, 0.66, lf);
      } else {
        col[p3] = 0.9; col[p3 + 1] = lerp(0.62, 0.78, lf); col[p3 + 2] = lerp(0.24, 0.42, lf);
        colD[p3] = 0.98; colD[p3 + 1] = lerp(0.72, 0.9, lf); colD[p3 + 2] = lerp(0.35, 0.6, lf);
      }
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
  dispatchEvent(new Event("sn:ready"));
}
