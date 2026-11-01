// 金色粒子一路跟著往下：每到一段，同一群粒子重組成那一段的主角。
// 第一頁星雲 → 笑臉 → 人生 K 線（突破時俯衝再拉起＋Braam）→ 天秤三態 → 道法術（陽轉陰）→ 書 → 金句 → OX → 合成市場 → 影片 → 雙極 logo
import * as THREE from "./vendor/three.module.min.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("gl");
const flashEl = document.getElementById("flash");

// ---------- 小工具 ----------
let seed = 7;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const bump = (x, a, b) => (x <= a || x >= b) ? 0 : Math.sin(Math.PI * (x - a) / (b - a));
const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const GOLD = hex(0xc99e45), GOLD_DK = hex(0x9c7a32), GOLD_LT = hex(0xe3c47e), CREAM = hex(0xf3e2b8);
const BLUE = hex(0x7fa6d6), BLUE_LT = hex(0xa9c4e8);
const UP = hex(0x52b4d1), DOWN = hex(0xeb4779);
const goldish = () => rand() < 0.5 ? mix3(GOLD_DK, GOLD, rand()) : mix3(GOLD, GOLD_LT, rand());

// ---------- 陽→陰 的顏色 ----------
const PAL = {
  light: { bgA: [251, 248, 242], bgB: [238, 242, 247], fg: [48, 52, 59], fg2: [99, 107, 119], fg3: [154, 161, 171], card: [255, 255, 255, 0.7], cardline: [221, 225, 230, 0.9], gold: [141, 113, 46], glow: [255, 255, 255, 0.9] },
  dark: { bgA: [9, 19, 30], bgB: [15, 30, 46], fg: [239, 231, 214], fg2: [168, 182, 198], fg3: [122, 138, 156], card: [16, 30, 46, 0.66], cardline: [241, 234, 220, 0.14], gold: [224, 190, 116], glow: [9, 19, 30, 0.9] }
};
const metaTheme = document.querySelector('meta[name="theme-color"]');
const SLOW = { bgA: 1, bgB: 1 };   // 只有背景慢慢轉，字和卡片在中間一起翻
function applyPalette(d) {
  const st = document.documentElement.style;
  const flip = sstep(0.44, 0.56, d);
  for (const k of Object.keys(PAL.light)) {
    const a = PAL.light[k], b = PAL.dark[k], t = SLOW[k] ? d : flip;
    const v = a.map((x, i) => i < 3 ? Math.round(lerp(x, b[i], t)) : +lerp(x, b[i], t).toFixed(3));
    st.setProperty("--" + k, v.length === 4 ? `rgba(${v.join(",")})` : `rgb(${v.join(",")})`);
  }
  if (metaTheme) { const c = PAL.light.bgA.map((x, i) => Math.round(lerp(x, PAL.dark.bgA[i], d))); metaTheme.content = `rgb(${c.join(",")})`; }
}

// ---------- 聲音：Braam（先收再砸）。點過畫面才會響 ----------
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
function braam(swell = 0.6, level = 1) {
  if (!soundOn || !actx || actx.state !== "running") return;
  const t0 = actx.currentTime + 0.03, th = t0 + swell;
  const master = actx.createGain(); master.gain.value = 0.85 * level;
  const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  const verb = actx.createConvolver(); verb.buffer = getIR();
  const wet = actx.createGain(); wet.gain.value = 0.32;
  master.connect(comp); master.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(actx.destination);
  if (swell > 0.05) {   // 先收：往上吸的風聲
    const n = actx.createBufferSource(); n.buffer = noiseBuf(swell);
    const bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(260, t0); bp.frequency.exponentialRampToValueAtTime(2600, th);
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, th - 0.02); g.gain.linearRampToValueAtTime(0.0001, th);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t0); n.stop(th);
  }
  // 再砸：低音銅管
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 5;
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
function flash(strength = 1) {
  if (!flashEl || reduce) return;
  flashEl.style.transition = "none"; flashEl.style.opacity = String(0.9 * strength);
  requestAnimationFrame(() => requestAnimationFrame(() => { flashEl.style.transition = "opacity 1.3s ease-out"; flashEl.style.opacity = "0"; }));
}

// ---------- 每一段的位置和字幕 ----------
const secs = [...document.querySelectorAll("[data-shape]")].map(el => ({ el, key: el.dataset.shape, sticky: el.classList.contains("story"), caps: [...el.querySelectorAll(".cap")], capOn: -1 }));
const idx = k => secs.findIndex(s => s.key === k);
let VH = innerHeight, darkFrom = 1e9, darkTo = 1e9 + 1;
function measure() {
  VH = innerHeight;
  for (const s of secs) {
    const r = s.el.getBoundingClientRect();
    s.top = r.top + scrollY; s.h = r.height;
    if (s.sticky) { s.h0 = s.top; s.h1 = s.top + s.h - VH; }
    else { const mid = s.top + s.h / 2 - VH / 2; s.h0 = mid - VH * 0.12; s.h1 = mid + VH * 0.12; }
  }
  secs[0].h0 = -1e9; secs[0].h1 = VH * 0.08;
  const dao = secs[idx("dao")], book = secs[idx("book")];
  darkFrom = dao.h0 + (dao.h1 - dao.h0) * 0.15; darkTo = book.h0 - VH * 0.1;
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
measure();
addEventListener("load", measure);

// ---------- WebGL ----------
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" }); } catch (e) { renderer = null; }

let darkCur = -1;
let last = performance.now(), clock = 0;
if (!renderer) {
  const loop = () => { const y = scrollY; updateCaps(y); const d = sstep(darkFrom, darkTo, y); if (Math.abs(d - darkCur) > 0.002) { darkCur = d; applyPalette(d); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
} else start();

function start() {
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const FOV = 40, CAMZ = 60;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 600);
  const isPhoneNow = () => innerWidth <= 760;
  const N = isPhoneNow() ? 3000 : 4600, NT = 360, NP = N + NT;

  // ---------- 版面：粒子要待在哪一塊 ----------
  let W = 1, H = 1, Hw = 1, Ww = 1, phone = true, STAGE, HERO, QUOTE, TOPC;
  function layout() {
    W = innerWidth; H = innerHeight; phone = W <= 760;
    Hw = 2 * CAMZ * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); Ww = Hw * (W / H);
    STAGE = phone ? { cx: 0, cy: Hw * 0.2, hw: Ww * 0.43, hh: Hw * 0.19 } : { cx: Ww * 0.2, cy: Hw * 0.02, hw: Math.min(Ww * 0.23, Hw * 0.42), hh: Hw * 0.33 };
    HERO = phone ? { cx: 0, cy: Hw * 0.3, r: Ww * 0.62 } : { cx: 0, cy: Hw * 0.27, r: Hw * 0.42 };
    QUOTE = phone ? { cx: 0, cy: Hw * 0.12, hw: Ww * 0.44, hh: Hw * 0.27 } : { cx: 0, cy: Hw * 0.08, hw: Ww * 0.36, hh: Hw * 0.27 };
    TOPC = phone ? STAGE : { cx: 0, cy: Hw * 0.3, hw: Ww * 0.16, hh: Hw * 0.14 };
  }
  layout();

  // ---------- 形狀 ----------
  const newShape = () => ({ pos: new Float32Array(N * 3), col: new Float32Array(N * 3), size: new Float32Array(N), alpha: new Float32Array(N), dyn: null });
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
    const n = smp.pts.length / 5; if (!n) return;
    const sc = Math.min(rect.hw / (smp.cw / 2), rect.hh / (smp.ch / 2)) * (o.scale || 1);
    for (let i = i0; i < i1; i++) {
      const j = Math.floor(rand() * n) * 5, px = smp.pts[j], py = smp.pts[j + 1];
      const x = rect.cx + (px - smp.cw / 2 + (rand() - 0.5) * 1.5) * sc;
      const y = rect.cy - (py - smp.ch / 2 + (rand() - 0.5) * 1.5) * sc;
      s.pos[i * 3] = x; s.pos[i * 3 + 1] = y; s.pos[i * 3 + 2] = (rand() - 0.5) * (o.depth ?? 0.6);
      s.col.set(o.color ? o.color(smp.pts[j + 2], smp.pts[j + 3], smp.pts[j + 4], px, py, i) : goldish(), i * 3);
      s.size[i] = (o.size ?? 0.2) * (0.75 + rand() * 0.5);
      s.alpha[i] = o.alpha ?? 0.95;
    }
  }
  function fillDust(s, i0, rect, spread = 1.5) {
    for (let i = i0; i < N; i++) {
      const a = rand() * 6.283, r = Math.sqrt(rand());
      s.pos[i * 3] = rect.cx + Math.cos(a) * r * rect.hw * spread * 1.25;
      s.pos[i * 3 + 1] = rect.cy + Math.sin(a) * r * rect.hh * spread * 1.6;
      s.pos[i * 3 + 2] = -2 - rand() * 10;
      s.col.set(goldish(), i * 3); s.size[i] = 0.1 + rand() * 0.13; s.alpha[i] = 0.16 + rand() * 0.24;
    }
  }
  function textSample(lines, fs = 140) {
    const lh = fs * 1.24, wmax = Math.max(...lines.map(l => [...l].length));
    return sampleCanvas(Math.ceil(wmax * fs + 40), Math.ceil(lines.length * lh + 30), (g, cw) => {
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `700 ${fs}px "Noto Serif TC", "Noto Sans TC", serif`;
      lines.forEach((l, k) => g.fillText(l, cw / 2, 15 + lh * (k + 0.5)));
    }, 3);
  }

  const shapes = {};

  // 第一頁：金色星雲，一直在轉
  function buildNebula() {
    const s = newShape(), P = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const arm = i % 3, rr = Math.pow(rand(), 0.85), r = HERO.r * (0.05 + 0.95 * rr);
      P[i * 4] = r; P[i * 4 + 1] = arm * 2.094 + rr * 4.2 + (rand() - 0.5) * 0.7;
      P[i * 4 + 2] = (rand() - 0.5) * HERO.r * (0.12 - rr * 0.08); P[i * 4 + 3] = 0.16 * (1.25 - rr);
      let c = goldish(); if (rr > 0.55 && rand() < 0.35) c = mix3(BLUE, BLUE_LT, rand());
      s.col.set(c, i * 3); s.size[i] = 0.12 + rand() * 0.18 + (1 - rr) * 0.12; s.alpha[i] = 0.5 + rand() * 0.45;
    }
    const tilt = -1.05, ct = Math.cos(tilt), st = Math.sin(tilt);
    s.dyn = t => {
      for (let i = 0; i < N; i++) {
        const r = P[i * 4], th = P[i * 4 + 1] + t * P[i * 4 + 3], h = P[i * 4 + 2];
        const x = Math.cos(th) * r, z = Math.sin(th) * r;
        s.pos[i * 3] = HERO.cx + x; s.pos[i * 3 + 1] = HERO.cy + (h * ct - z * st) * 0.55; s.pos[i * 3 + 2] = h * st + z * ct;
      }
    };
    s.dyn(0);
    return s;
  }

  // 我是誰：笑臉
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
    const rect = { cx: STAGE.cx, cy: STAGE.cy, hw: Math.min(STAGE.hw, STAGE.hh) * 1.05, hh: Math.min(STAGE.hw, STAGE.hh) * 1.05 };
    const a = Math.floor(N * 0.6), b = Math.floor(N * 0.84);
    placeSample(s, feat, 0, a, rect, { size: 0.22, color: (r, g, bb, px, py) => py > 205 && Math.hypot(px - 200, py - 200) < 160 ? mix3(GOLD, DOWN, 0.3 + rand() * 0.2) : goldish() });
    placeSample(s, fill, a, b, rect, { size: 0.14, alpha: 0.28, color: () => mix3(CREAM, GOLD_LT, rand()) });
    fillDust(s, b, STAGE);
    return s;
  }

  // 人生 K 線（走勢是示意）
  const LIFE = (() => {
    const closes = [10, 10.6, 10.2, 11, 10.7, 11.5, 11.2, 12, 11.6, 12.4, 12.1, 12.8, 12.5, 13.2, 13, 14.6, 17, 16, 20, 24, 23, 28, 33, 31, 26, 20, 22, 16, 18, 17, 18.6, 17.8, 18.4, 24, 32, 41, 48, 56, 55, 59];
    let prev = 9.6;
    return closes.map((c, k) => { const o = prev; prev = c; return { o, c, hi: Math.max(o, c) + 0.35 + (k * 37 % 7) / 10, lo: Math.min(o, c) - 0.35 - (k * 53 % 5) / 10, up: c >= o }; });
  })();
  const LK = LIFE.length, KB = 33, KE = 38;   // 突破那幾根、最後寫書
  const seq = { start: -1, played: false, sfx: false, fl: false };
  let lifeGrow = 0;
  function lifeVisible(p) {   // 依滑動，畫到第幾根
    const A = [[0, 2], [0.17, 15.5], [0.35, 21], [0.52, 28], [0.68, 33]];
    for (let i = 1; i < A.length; i++) if (p <= A[i][0]) return lerp(A[i - 1][1], A[i][1], (p - A[i - 1][0]) / (A[i][0] - A[i - 1][0]));
    return 33;
  }
  let LG = null;   // 人生 K 線的座標（給鏡頭用）
  function buildLife() {
    const s = newShape();
    const x0 = STAGE.cx - STAGE.hw * 0.96, x1 = STAGE.cx + STAGE.hw * 0.96, yb = STAGE.cy - STAGE.hh * 0.92, yt = STAGE.cy + STAGE.hh * 0.92;
    const dx = (x1 - x0) / LK, bw = dx * 0.74, pmin = 8, pmax = 62;
    const Y = v => yb + (v - pmin) / (pmax - pmin) * (yt - yb);
    LG = { x0, x1, yb, yt, dx, xb: x0 + (KB + 2.5) * dx, Y };
    const nc = Math.floor(N * 0.7), ng = Math.floor(N * 0.16);
    const w = LIFE.map(k => (Math.abs(k.c - k.o) * 1.4 + (k.hi - k.lo) * 0.35 + 0.6));
    const ws = w.reduce((a, b) => a + b, 0);
    const K = new Int16Array(N).fill(-1), R = new Float32Array(N * 4);
    let i = 0;
    for (let k = 0; k < LK && i < nc; k++) {
      const cnt = Math.round(w[k] / ws * nc);
      for (let j = 0; j < cnt && i < nc; j++, i++) { K[i] = k; R.set([rand() < 0.82 ? 0 : 1, rand(), rand(), rand()], i * 4); }
    }
    for (; i < nc; i++) { K[i] = LK - 1; R.set([0, rand(), rand(), rand()], i * 4); }
    // 地上的格線（俯衝時才看得出來）
    const gy = yb - STAGE.hh * 0.06, gx0 = x0 - STAGE.hw * 0.2, gx1 = x1 + STAGE.hw * 0.2, gz0 = -STAGE.hh * 2.6, gz1 = STAGE.hh * 0.9;
    for (let j = 0; j < ng; j++, i++) {
      const row = rand() < 0.5;
      const x = row ? lerp(gx0, gx1, rand()) : lerp(gx0, gx1, Math.floor(rand() * 15) / 14);
      const z = row ? lerp(gz0, gz1, Math.floor(rand() * 9) / 8) : lerp(gz0, gz1, rand());
      s.pos[i * 3] = x; s.pos[i * 3 + 1] = gy; s.pos[i * 3 + 2] = z;
      s.col.set(mix3(GOLD_DK, GOLD, rand()), i * 3); s.size[i] = 0.1; s.alpha[i] = 0.3;
    }
    fillDust(s, i, STAGE, 1.4);
    for (let q = 0; q < nc; q++) {
      const c = LIFE[K[q]], body = R[q * 4] === 0;
      s.col.set(mix3(c.up ? UP : DOWN, [1, 1, 1], body ? rand() * 0.12 : 0.25), q * 3);
      s.size[q] = (body ? 0.21 : 0.14) * (phone ? 1.25 : 1); s.alpha[q] = 0.95;
    }
    s.dyn = (t, p) => {
      const kv = lifeVisible(p);
      const g = lifeGrow;
      // 畫到哪，筆尖就在哪
      const kf = Math.min(LK - 1, Math.floor(g >= 1 ? (p >= 0.9 ? LK - 1 : KE - 1) : Math.max(0, kv - 1)));
      const pen = LIFE[kf];
      const penX = x0 + (kf + 1) * dx, penY = Y(pen.c);
      for (let q = 0; q < nc; q++) {
        const k = K[q], c = LIFE[k];
        let v;
        if (k < KB) v = clamp(kv - k, 0, 1);
        else if (k < KE) v = clamp(g * 5 - (k - KB), 0, 1);
        else v = g >= 1 ? clamp((p - 0.9) / 0.025 - (k - KE), 0, 1) : 0;
        const xc = x0 + (k + 0.5) * dx;
        let x, y;
        if (R[q * 4] === 0) { x = xc + (R[q * 4 + 1] - 0.5) * bw; y = lerp(Y(c.o), Y(c.c), R[q * 4 + 2]); }
        else { x = xc + (R[q * 4 + 1] - 0.5) * 0.08; y = lerp(Y(c.lo), Y(c.hi), R[q * 4 + 2]); }
        const z = (R[q * 4 + 3] - 0.5) * 0.9;
        if (v <= 0) {   // 還沒畫到：擠在筆尖
          const a = R[q * 4 + 1] * 6.283, r = 0.25 + R[q * 4 + 2] * 0.6;
          s.pos[q * 3] = penX + Math.cos(a + t * 3) * r; s.pos[q * 3 + 1] = penY + Math.sin(a + t * 3) * r; s.pos[q * 3 + 2] = z;
        } else {
          const yo = Y(c.o);
          s.pos[q * 3] = x; s.pos[q * 3 + 1] = yo + (y - yo) * v; s.pos[q * 3 + 2] = z;
        }
      }
    };
    s.dyn(0, 0);
    return s;
  }

  // 天秤三態：極陽 → 平衡 → 極陰
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
    const x0 = STAGE.cx - STAGE.hw * 0.92, x1 = STAGE.cx + STAGE.hw * 0.92, yb = STAGE.cy - STAGE.hh * 0.85, yt = STAGE.cy + STAGE.hh * 0.85;
    const dx = (x1 - x0) / 12, bw = dx * 0.58;
    const Y = v => yb + v / 20 * (yt - yb);
    const nc = Math.floor(N * 0.72), nl = Math.floor(N * 0.06);
    const K = new Int16Array(N), R = new Float32Array(N * 3);
    for (let i = 0; i < nc; i++) { K[i] = i % 12; R.set([rand() < 0.8 ? 0 : 1, rand(), rand()], i * 3); }
    for (let i = nc; i < nc + nl; i++) { K[i] = -2; R.set([0, rand(), rand()], i * 3); }
    fillDust(s, nc + nl, STAGE, 1.4);
    for (let i = nc; i < nc + nl; i++) { s.col.set(GOLD_LT, i * 3); s.size[i] = 0.12; }
    const cur = new Array(12);
    s.dyn = (t, p) => {
      const a = sstep(0.27, 0.4, p), b = sstep(0.62, 0.75, p);
      for (let k = 0; k < 12; k++) {
        const A = BAL.yang[k], B = BAL.bal[k], C = BAL.yin[k];
        const o = lerp(lerp(A.o, B.o, a), C.o, b), c = lerp(lerp(A.c, B.c, a), C.c, b);
        cur[k] = { o, c, hi: lerp(lerp(A.hi, B.hi, a), C.hi, b), lo: lerp(lerp(A.lo, B.lo, a), C.lo, b) };
      }
      for (let i = 0; i < nc; i++) {
        const k = K[i], c = cur[k], xc = x0 + (k + 0.5) * dx;
        if (R[i * 3] === 0) { s.pos[i * 3] = xc + (R[i * 3 + 1] - 0.5) * bw; s.pos[i * 3 + 1] = lerp(Y(c.o), Y(c.c), R[i * 3 + 2]); }
        else { s.pos[i * 3] = xc + (R[i * 3 + 1] - 0.5) * 0.08; s.pos[i * 3 + 1] = lerp(Y(c.lo), Y(c.hi), R[i * 3 + 2]); }
        s.pos[i * 3 + 2] = (R[i * 3 + 2] - 0.5) * 0.6;
        s.col.set(mix3(c.c >= c.o ? UP : DOWN, [1, 1, 1], R[i * 3] ? 0.25 : 0.06), i * 3);
        s.size[i] = R[i * 3] ? 0.13 : 0.19; s.alpha[i] = 0.95;
      }
      // 平衡：最高那根的低點畫一條虛線
      const la = a * (1 - b);
      for (let i = nc; i < nc + nl; i++) {
        const u = R[i * 3 + 1];
        const x = lerp(x0 + dx * 5.5, x1, u);
        const dash = Math.floor(u * 22) % 2 === 0 ? 1 : 0;
        s.pos[i * 3] = x; s.pos[i * 3 + 1] = Y(BAL.brokenLow); s.pos[i * 3 + 2] = 0;
        s.alpha[i] = la * dash * 0.9;
      }
    };
    s.dyn(0, 0);
    return s;
  }

  // 道、法、術：現在講到哪個字，哪個字就亮
  function buildDao() {
    const s = newShape();
    const smp = textSample(["道　法　術"], 170);
    const n = Math.floor(N * 0.85);
    placeSample(s, smp, 0, n, phone ? STAGE : { ...STAGE, hh: STAGE.hh * 0.7 }, { size: 0.21 });
    const G = new Int8Array(N).fill(-1);
    for (let i = 0; i < n; i++) { const x = (s.pos[i * 3] - (STAGE.cx - STAGE.hw)) / (2 * STAGE.hw); G[i] = clamp(Math.floor(x * 3), 0, 2); }
    fillDust(s, n, STAGE, 1.5);
    const base = s.size.slice(), baseA = s.alpha.slice();
    s.dyn = (t, p) => {
      const e = [1 - sstep(0.28, 0.36, p), sstep(0.28, 0.36, p) * (1 - sstep(0.62, 0.7, p)), sstep(0.62, 0.7, p)];
      for (let i = 0; i < n; i++) { const k = e[G[i]]; s.alpha[i] = baseA[i] * (0.22 + 0.78 * k); s.size[i] = base[i] * (0.75 + 0.4 * k); }
    };
    return s;
  }

  // 書：翻開的一本
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
    const n = Math.floor(N * 0.82);
    placeSample(s, smp, 0, n, STAGE, { size: 0.2, color: (r, g, b, px, py) => (px > 460 && py < 125) ? mix3(DOWN, GOLD, 0.4) : goldish() });
    fillDust(s, n, STAGE, 1.5);
    return s;
  }

  // 金句
  const QUOTES = [
    { p: ["選擇不做什麼", "比做什麼重要"], d: ["選擇不做什麼", "比做什麼重要"] },
    { p: ["是敬畏", "不是預測"], d: ["是敬畏不是預測"] },
    { p: ["像由心生"], d: ["像由心生"] },
    { p: ["這個人，", "讓我開始用", "不同的方式", "思考世界"], d: ["這個人，讓我開始", "用不同的方式思考世界"] }
  ];
  function buildQuote(q) {
    const s = newShape();
    const smp = textSample(phone ? q.p : q.d, 150);
    const n = Math.floor(N * 0.86);
    placeSample(s, smp, 0, n, QUOTE, { size: 0.19, color: () => rand() < 0.15 ? CREAM : goldish() });
    fillDust(s, n, QUOTE, 1.2);
    return s;
  }

  // OX：雷達＋手畫一個 W
  function buildOx() {
    const s = newShape();
    const R0 = Math.min(STAGE.hw, STAGE.hh) * 0.95;
    const nr = Math.floor(N * 0.22), ns = Math.floor(N * 0.05), nw = Math.floor(N * 0.1), np = Math.floor(N * 0.4), nt = Math.floor(N * 0.04);
    const T = new Int8Array(N), R = new Float32Array(N * 2);
    let i = 0;
    for (; i < nr; i++) { T[i] = 0; R[i * 2] = [0.35, 0.65, 0.97][i % 3]; R[i * 2 + 1] = rand() * 6.283; }
    for (; i < nr + ns; i++) { T[i] = 1; R[i * 2] = rand(); R[i * 2 + 1] = Math.floor(rand() * 8) * 0.785; }
    for (; i < nr + ns + nw; i++) { T[i] = 2; R[i * 2] = Math.sqrt(rand()); R[i * 2 + 1] = rand(); }
    for (; i < nr + ns + nw + np; i++) { T[i] = 3; R[i * 2] = rand(); R[i * 2 + 1] = (rand() - 0.5); }
    for (; i < nr + ns + nw + np + nt; i++) { T[i] = 4; R[i * 2] = rand() * 6.283; R[i * 2 + 1] = rand(); }
    const nEnd = i;
    fillDust(s, nEnd, STAGE, 1.4);
    for (let j = 0; j < nEnd; j++) {
      const k = T[j];
      s.col.set(k === 0 || k === 1 ? mix3(BLUE, BLUE_LT, rand()) : k === 2 ? GOLD_LT : k === 3 ? goldish() : CREAM, j * 3);
      s.size[j] = k === 3 ? 0.2 : k === 4 ? 0.26 : 0.13;
      s.alpha[j] = k === 0 ? 0.5 : k === 1 ? 0.22 : 0.95;
    }
    // W 的路徑
    const Wp = [[-0.95, 0.6], [-0.55, -0.55], [-0.1, 0.15], [0.35, -0.55], [0.9, 0.7]];
    const segL = [], tot = (() => { let t = 0; for (let k = 1; k < Wp.length; k++) { const l = Math.hypot(Wp[k][0] - Wp[k - 1][0], Wp[k][1] - Wp[k - 1][1]); segL.push(l); t += l; } return t; })();
    const at = u => { let d = u * tot; for (let k = 0; k < segL.length; k++) { if (d <= segL[k] || k === segL.length - 1) { const f = clamp(d / segL[k], 0, 1); return [lerp(Wp[k][0], Wp[k + 1][0], f), lerp(Wp[k][1], Wp[k + 1][1], f)]; } d -= segL[k]; } return Wp[Wp.length - 1]; };
    s.dyn = t => {
      const cyc = (t % 6.2), draw = clamp(cyc / 2.6, 0, 1), fade = 1 - sstep(4.8, 5.6, cyc);
      const sw = t * 1.3;
      const penP = at(draw), penX = STAGE.cx + penP[0] * STAGE.hw * 0.95, penY = STAGE.cy + penP[1] * STAGE.hh * 0.85;
      for (let j = 0; j < nEnd; j++) {
        const k = T[j], a = R[j * 2], b = R[j * 2 + 1];
        let x, y;
        if (k === 0) { const ang = b + t * 0.05; x = STAGE.cx + Math.cos(ang) * a * R0; y = STAGE.cy + Math.sin(ang) * a * R0; }
        else if (k === 1) { x = STAGE.cx + Math.cos(b) * a * R0; y = STAGE.cy + Math.sin(b) * a * R0; }
        else if (k === 2) { const ang = sw - b * 0.9; x = STAGE.cx + Math.cos(ang) * a * R0; y = STAGE.cy + Math.sin(ang) * a * R0; s.alpha[j] = 0.9 * (1 - b); }
        else if (k === 3) {
          if (a <= draw) { const q = at(a); x = STAGE.cx + q[0] * STAGE.hw * 0.95 + b * 0.18; y = STAGE.cy + q[1] * STAGE.hh * 0.85 + Math.sin(a * 40) * 0.06; s.alpha[j] = 0.95 * fade; }
          else { x = penX + b * 0.3; y = penY + Math.sin(a * 99) * 0.3; s.alpha[j] = 0.0; }
        } else { x = penX + Math.cos(a + t * 6) * b * 0.35; y = penY + Math.sin(a + t * 6) * b * 0.35; s.alpha[j] = draw < 1 ? 1 : 0.5 * fade; }
        s.pos[j * 3] = x; s.pos[j * 3 + 1] = y; s.pos[j * 3 + 2] = k === 3 || k === 4 ? 0.5 : -0.5;
      }
    };
    s.dyn(0);
    return s;
  }

  // 合成市場：四顆 → 兩顆 → 一顆大的 → 炸開重來
  function buildMerge() {
    const s = newShape();
    const nb = Math.floor(N * 0.8), U = new Float32Array(N * 3);
    const cols = [GOLD, BLUE_LT, GOLD_LT, CREAM];
    for (let i = 0; i < nb; i++) {
      const ring = rand() < 0.55, a = rand() * 6.283, r = ring ? 1 : Math.sqrt(rand()) * 0.92;
      U[i * 3] = Math.cos(a) * r; U[i * 3 + 1] = Math.sin(a) * r; U[i * 3 + 2] = ring ? 1 : 0;
      s.col.set(mix3(cols[i % 4], [1, 1, 1], ring ? 0.1 : 0), i * 3);
      s.size[i] = ring ? 0.18 : 0.13; s.alpha[i] = ring ? 0.95 : 0.4;
    }
    fillDust(s, nb, STAGE, 1.4);
    const rA = Math.min(STAGE.hw, STAGE.hh) * 0.3;
    const A = [[-0.5, 0.45], [0.5, 0.45], [-0.5, -0.45], [0.5, -0.45]];
    s.dyn = t => {
      const c = t % 6.2;
      const m1 = sstep(1.6, 2.4, c), m2 = sstep(3.4, 4.2, c), pop = sstep(5.5, 6.1, c);
      for (let i = 0; i < nb; i++) {
        const j = i % 4;
        let x = A[j][0], y = A[j][1];
        x = lerp(x, 0, m1); y = lerp(y, y, m1);
        x = lerp(x, 0, m2); y = lerp(y, 0, m2);
        let r = rA * lerp(lerp(1, 1.45, m1), 2.1, m2);
        if (pop > 0) { x = lerp(x, A[j][0], pop); y = lerp(y, A[j][1], pop); r = lerp(r, rA, pop) * (1 + bump(pop, 0, 1) * 0.8); }
        const spin = t * 0.4 * (m2 > 0.5 ? 1 : 0.4);
        const ux = U[i * 3] * Math.cos(spin) - U[i * 3 + 1] * Math.sin(spin), uy = U[i * 3] * Math.sin(spin) + U[i * 3 + 1] * Math.cos(spin);
        s.pos[i * 3] = STAGE.cx + x * STAGE.hw * 0.7 + ux * r; s.pos[i * 3 + 1] = STAGE.cy + y * STAGE.hh * 0.75 + uy * r; s.pos[i * 3 + 2] = U[i * 3 + 2] ? 0.3 : -0.3;
      }
    };
    s.dyn(0);
    return s;
  }

  // 影片：一個畫框和播放鍵
  function buildFilms() {
    const s = newShape();
    const smp = sampleCanvas(520, 360, g => {
      g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineWidth = 12; g.lineJoin = "round";
      g.beginPath(); g.moveTo(66, 30); g.arcTo(490, 30, 490, 330, 36); g.arcTo(490, 330, 30, 330, 36); g.arcTo(30, 330, 30, 30, 36); g.arcTo(30, 30, 490, 30, 36); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(222, 118); g.lineTo(222, 242); g.lineTo(326, 180); g.closePath(); g.fill();
      for (let k = 0; k < 9; k++) { g.fillRect(62 + k * 46, 48, 20, 14); g.fillRect(62 + k * 46, 298, 20, 14); }
    }, 2);
    const n = Math.floor(N * 0.8);
    placeSample(s, smp, 0, n, TOPC, { size: 0.2, color: (r, g, b, px, py) => (px > 210 && px < 330 && py > 110 && py < 250) ? CREAM : goldish() });
    fillDust(s, n, TOPC, 1.6);
    return s;
  }

  // 結尾：雙極 logo（深藍那半變成淡藍）
  function buildLogo(img) {
    const s = newShape();
    const smp = sampleCanvas(300, 300, g => g.drawImage(img, 0, 0, 300, 300), 2);
    const n = Math.floor(N * 0.8);
    const rect = { cx: STAGE.cx, cy: STAGE.cy, hw: Math.min(STAGE.hw, STAGE.hh) * 1.1, hh: Math.min(STAGE.hw, STAGE.hh) * 1.1 };
    placeSample(s, smp, 0, n, rect, { size: 0.21, color: (r, g, b) => (r + g + b) / 3 < 130 ? mix3(BLUE, BLUE_LT, rand()) : mix3(GOLD_LT, CREAM, rand()) });
    const H0 = new Float32Array(N * 2);
    for (let i = n; i < N; i++) { H0[i * 2] = rand() * 6.283; H0[i * 2 + 1] = 1.25 + rand() * 0.5; s.col.set(goldish(), i * 3); s.size[i] = 0.12 + rand() * 0.1; s.alpha[i] = 0.35 + rand() * 0.4; }
    s.dyn = t => {
      for (let i = n; i < N; i++) {
        const a = H0[i * 2] + t * 0.25, r = rect.hw * H0[i * 2 + 1];
        s.pos[i * 3] = rect.cx + Math.cos(a) * r; s.pos[i * 3 + 1] = rect.cy + Math.sin(a) * r * 0.9; s.pos[i * 3 + 2] = Math.sin(a * 2) * 2;
      }
    };
    s.dyn(0);
    return s;
  }

  let logoImg = null;
  function buildAll(withText) {
    seed = 7;
    shapes.nebula = buildNebula();
    shapes.smiley = buildSmiley();
    shapes.life = buildLife();
    shapes.balance = buildBalance();
    shapes.book = buildBook();
    shapes.ox = buildOx();
    shapes.merge = buildMerge();
    shapes.films = buildFilms();
    if (logoImg) shapes.logo = buildLogo(logoImg);
    if (withText) {
      shapes.dao = buildDao();
      QUOTES.forEach((q, i) => { shapes["q" + i] = buildQuote(q); });
    }
  }
  buildAll(false);
  // 字型和 logo 好了再做「拼字」的形狀
  let textReady = false;
  const allText = "道法術選擇不做什麼比做什麼重要是敬畏不是預測像由心生這個人，讓我開始用不同的方式思考世界　";
  Promise.race([
    Promise.all([document.fonts.load(`700 150px "Noto Serif TC"`, allText), new Promise(r => { const im = new Image(); im.onload = () => { logoImg = im; r(); }; im.onerror = r; im.src = "media/logo.png"; })]),
    new Promise(r => setTimeout(r, 3500))
  ]).then(() => { textReady = true; buildAll(true); measure(); });
  const shapeOf = key => shapes[key] || (key === "logo" ? shapes.book : key[0] === "q" || key === "dao" ? shapes.book : shapes.nebula);

  // ---------- 粒子 ----------
  const P = new Float32Array(NP * 3), V = new Float32Array(N * 3);
  const KS = new Float32Array(N), DL = new Float32Array(N), PH = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = rand() * 6.283, b = Math.acos(2 * rand() - 1), r = Ww * (0.9 + rand() * 0.8);
    P[i * 3] = Math.sin(b) * Math.cos(a) * r; P[i * 3 + 1] = Math.sin(b) * Math.sin(a) * r; P[i * 3 + 2] = Math.cos(b) * r * 0.5;
    if (reduce) { P[i * 3] = shapes.nebula.pos[i * 3]; P[i * 3 + 1] = shapes.nebula.pos[i * 3 + 1]; P[i * 3 + 2] = shapes.nebula.pos[i * 3 + 2]; }
    KS[i] = 0.028 + rand() * 0.05; DL[i] = rand(); PH[i] = rand() * 6.283;
  }
  const col = new Float32Array(NP * 3), size = new Float32Array(NP), alpha = new Float32Array(NP);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 1 }, uDark: { value: 0 }, uBoost: { value: 1 }, uMaxPx: { value: 24 } },
    vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      uniform float uScale, uDark, uBoost, uMaxPx; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * (1.0 + uDark * 0.3) * uScale / -mv.z, 1.0, uMaxPx);
        vC = mix(aColor, min(vec3(1.0), aColor * 1.22 + 0.07), uDark); vA = aAlpha * uBoost; }`,
    fragmentShader: `uniform float uDark; varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5);
        float a = (smoothstep(0.5, 0.12, d) + smoothstep(0.5, 0.0, d) * 0.3 * uDark) * vA;
        if (a < 0.01) discard; gl_FragColor = vec4(vC, min(a, 1.0)); }`
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // 光痕火花
  const T = { x: new Float32Array(NT), y: new Float32Array(NT), z: new Float32Array(NT), vx: new Float32Array(NT), vy: new Float32Array(NT), vz: new Float32Array(NT), life: new Float32Array(NT), span: new Float32Array(NT).fill(1), big: new Float32Array(NT), n: 0 };
  function spark(x, y, z, vx, vy, vz, span, big) { const j = T.n++ % NT; T.x[j] = x; T.y[j] = y; T.z[j] = z; T.vx[j] = vx; T.vy[j] = vy; T.vz[j] = vz; T.life[j] = 1; T.span[j] = span; T.big[j] = big; }

  // ---------- 尺寸 ----------
  function resize(rebuild) {
    layout();
    const dpr = Math.min(devicePixelRatio || 1, phone ? 2 : 1.75);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    mat.uniforms.uScale.value = H * dpr / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    mat.uniforms.uMaxPx.value = 14 * dpr;
    if (rebuild) buildAll(textReady);
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

  // 點頭像：炸開＋Braam
  const av = document.querySelector(".avatar");
  const avatarBurst = () => {
    unlockAudio();
    const r = av.getBoundingClientRect();
    tapQ = { x: r.left + r.width / 2, y: r.top + r.height / 2, s: 2.4 };
    setTimeout(() => braam(0.3, 0.9), 10);
    setTimeout(() => flash(0.8), 330);
  };
  if (av) { av.addEventListener("click", avatarBurst); av.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") avatarBurst(); }); }

  // ---------- 俯衝再拉起（人生 K 線突破時） ----------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function catmull(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
  function seqCamera(st) {
    // 距離都照這張 K 線的大小算：高空俯瞰 → 俯衝到左邊低處 → 貼地掠過 → 突破那根拉起 → 回來
    const g = LG, cx = STAGE.cx, Wc = g.x1 - g.x0, Hc = g.yt - g.yb;
    const K0 = [0, [0, 0, CAMZ], [0, 0, 0]];
    const keys = [
      K0,
      [0.8, [cx - Wc * 0.05, g.yt + Hc * 0.7, Hc * 1.7], [cx, g.yb + Hc * 0.3, 0]],
      [1.5, [g.x0 - Wc * 0.15, g.yb + Hc * 0.05, Hc * 1.15], [cx, g.yb + Hc * 0.25, 0]],
      [2.3, [g.xb - Wc * 0.3, g.yb + Hc * 0.06, Hc * 1.15], [g.xb, g.yb + Hc * 0.3, 0]],
      [3.3, [g.xb + Wc * 0.08, g.yt + Hc * 0.2, Hc * 1.3], [g.xb, g.yt - Hc * 0.2, 0]],
      [4.4, [0, 0, CAMZ], [0, 0, 0]],
      [5.0, [0, 0, CAMZ], [0, 0, 0]]
    ];
    if (st >= keys[keys.length - 2][0]) return null;
    let i = 0; while (i < keys.length - 2 && st > keys[i + 1][0]) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const u = (st - k1[0]) / (k2[0] - k1[0]);
    for (let a = 0; a < 3; a++) {
      camPos.setComponent(a, catmull(k0[1][a], k1[1][a], k2[1][a], k3[1][a], u));
      camLook.setComponent(a, catmull(k0[2][a], k1[2][a], k2[2][a], k3[2][a], u));
    }
    return true;
  }

  // ---------- 每一格 ----------
  const PM = new THREE.Matrix4(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const lifeI = idx("life");
  let shake = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) clock += dt;
    const y = scrollY;
    updateCaps(y);
    const dk = sstep(darkFrom, darkTo, y);
    if (Math.abs(dk - darkCur) > 0.002) { darkCur = dk; applyPalette(dk); }
    mat.uniforms.uDark.value = dk;

    const st = scrollState(y);
    const SA = secs[st.a], SB = secs[st.b];
    const pA = localP(SA, y), pB = localP(SB, y);

    // 人生 K 線：滑到 OX 那根就演一次俯衝
    const lifeP = localP(secs[lifeI], y);
    const lifeOn = (st.a === lifeI || st.b === lifeI);
    if (lifeP < 0.55) { seq.played = false; seq.start = -1; seq.sfx = false; seq.fl = false; }
    if (lifeOn && st.m === 0 && lifeP >= 0.72 && !seq.played) { seq.played = true; seq.start = clock; seq.sfx = false; seq.fl = false; }
    const sT = seq.start >= 0 ? clock - seq.start : -1;
    if (reduce) lifeGrow = lifeP >= 0.72 ? 1 : 0;
    else lifeGrow = Math.max(sT >= 0 ? sstep(2.35, 2.8, sT) : 0, lifeP >= 0.88 ? 1 : 0);
    if (sT >= 1.8 && !seq.sfx) { seq.sfx = true; braam(0.6, 1); }
    if (sT >= 2.4 && !seq.fl) { seq.fl = true; flash(0.55); shake = 1; }
    let boost = 1;
    if (sT > 1.85 && sT < 2.4) boost = lerp(1, 0.45, sstep(1.85, 2.35, sT));   // 先收：暗一下
    else if (sT >= 2.4 && sT < 3.2) boost = lerp(1.6, 1, sstep(2.4, 3.2, sT));  // 再砸：亮起來
    mat.uniforms.uBoost.value = boost;

    const A = shapeOf(SA.key), B = shapeOf(SB.key);
    if (A.dyn) A.dyn(clock, pA);
    if (B !== A && B.dyn) B.dyn(clock, pB);

    // 鏡頭
    camPos.set(0, 0, CAMZ); camLook.set(0, 0, 0);
    if (!reduce && sT >= 0 && lifeOn && seqCamera(sT)) { /* camPos/camLook 已設定 */ }
    else { camPos.set(0, 0, CAMZ); camLook.set(0, 0, 0); }
    camPos.x += Math.sin(clock * 0.21) * 0.35; camPos.y += Math.cos(clock * 0.17) * 0.25;
    shake = Math.max(0, shake - dt * 2.2);
    if (shake > 0) { camPos.x += Math.sin(clock * 61) * 0.3 * shake; camPos.y += Math.cos(clock * 53) * 0.25 * shake; }
    camera.position.copy(camPos); camera.lookAt(camLook); camera.updateMatrixWorld();

    // 粒子
    PM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const e = PM.elements;
    right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
    const active = now - ptr.at < 900 || tapQ;
    ptr.holdOn = ptr.down && now - ptr.still > 280;
    const Rpx = Math.min(W, H) * 0.2, tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const k60 = dt * 60, damp = Math.pow(0.86, k60);
    const m = st.m, swirl = (phone ? 2.2 : 3.2);
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let mi = m;
      if (m > 0 && m < 1) mi = sstep(0, 1, clamp((m - DL[i] * 0.35) / 0.65, 0, 1));
      const ia = 1 - mi;
      let tx = A.pos[i3] * ia + B.pos[i3] * mi, ty = A.pos[i3 + 1] * ia + B.pos[i3 + 1] * mi, tz = A.pos[i3 + 2] * ia + B.pos[i3 + 2] * mi;
      const sw = Math.sin(Math.PI * mi) * swirl;
      if (sw > 0.01) { tx += Math.cos(PH[i] + clock * 0.9) * sw; ty += Math.sin(PH[i] * 1.3 + clock * 0.7) * sw; tz += Math.sin(PH[i] * 0.7 + clock) * sw; }
      tx += Math.sin(clock * 0.6 + PH[i]) * 0.05; ty += Math.cos(clock * 0.5 + PH[i] * 1.7) * 0.05;
      let vx = V[i3], vy = V[i3 + 1], vz = V[i3 + 2];
      const px = P[i3], py = P[i3 + 1], pz = P[i3 + 2];
      const kk = KS[i] * k60;
      vx = vx * damp + (tx - px) * kk; vy = vy * damp + (ty - py) * kk; vz = vz * damp + (tz - pz) * kk;
      // 手指：推開／吸過去／點一下炸開
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
      col[i3] = A.col[i3] * ia + B.col[i3] * mi; col[i3 + 1] = A.col[i3 + 1] * ia + B.col[i3 + 1] * mi; col[i3 + 2] = A.col[i3 + 2] * ia + B.col[i3 + 2] * mi;
      const tw = 0.85 + 0.15 * Math.sin(clock * 2 + PH[i] * 3);
      size[i] = (A.size[i] * ia + B.size[i] * mi) * tw;
      alpha[i] = A.alpha[i] * ia + B.alpha[i] * mi;
    }
    tapQ = null;

    // 按住：火花旋進來
    if (ptr.holdOn && !reduce) {
      const p = worldAt(ptr.x, ptr.y);
      if (p) for (let k = 0; k < Math.max(1, Math.round(dt * 90)); k++) {
        const a = rand() * 6.283, r = 2 + rand() * 1.6, ca = Math.cos(a), sa = Math.sin(a);
        spark(p.x + ca * r, p.y + sa * r, 1, -ca * 3.2 - sa * 3.6, -sa * 3.2 + ca * 3.6, 0, 0.65, 0.9);
      }
    }
    const drag = Math.pow(0.06, dt);
    for (let j = 0; j < NT; j++) {
      const p = N + j, p3 = p * 3;
      if (T.life[j] > 0) {
        T.life[j] = Math.max(0, T.life[j] - dt / T.span[j]);
        T.x[j] += T.vx[j] * dt; T.y[j] += T.vy[j] * dt; T.z[j] += T.vz[j] * dt;
        T.vx[j] *= drag; T.vy[j] *= drag; T.vz[j] *= drag;
      }
      const lf = T.life[j];
      P[p3] = T.x[j]; P[p3 + 1] = T.y[j]; P[p3 + 2] = T.z[j];
      col[p3] = 0.96; col[p3 + 1] = lerp(0.68, 0.86, lf); col[p3 + 2] = lerp(0.3, 0.52, lf);
      size[p] = (0.3 * lf + 0.06) * T.big[j];
      alpha[p] = Math.pow(lf, 1.3);
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true; geo.attributes.aAlpha.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
