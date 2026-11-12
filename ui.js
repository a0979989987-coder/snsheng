// 按鈕的動態：載入時粒子描邊、官方按鈕金光在跑、按下去 Q 彈＋噴粒子＋沿太極 S 線黑白翻面、底部浮動的 LINE 官方
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const emit = (type, detail) => dispatchEvent(new CustomEvent(type, { detail }));
  const sstep = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

  // ---------- 邊框 ----------
  // 圓角長方形的周長和邊上的一點（u：0～1，從上緣左邊開始順時針，跟 SVG rect 的筆畫順序一樣）
  const perim = (w, h, r) => 2 * (w + h) - (8 - 2 * Math.PI) * r;
  function edgePoint(w, h, r, u) {
    const segs = [w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2, w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2];
    let d = u * perim(w, h, r);
    for (let k = 0; k < 8; k++) {
      const L = segs[k];
      if (d <= L || k === 7) {
        const f = L > 0 ? Math.min(1, d / L) : 0;
        switch (k) {
          case 0: return [r + f * (w - 2 * r), 0];
          case 2: return [w, r + f * (h - 2 * r)];
          case 4: return [w - r - f * (w - 2 * r), h];
          case 6: return [0, h - r - f * (h - 2 * r)];
          default: {
            const c = [[w - r, r], [w - r, h - r], [r, h - r], [r, r]][(k - 1) / 2], a0 = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][(k - 1) / 2], a = a0 + f * Math.PI / 2;
            return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
          }
        }
      }
      d -= L;
    }
    return [0, 0];
  }
  const edges = [];
  function addEdge(el) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "edge"); svg.setAttribute("aria-hidden", "true");
    const tr = document.createElementNS(NS, "rect"); tr.setAttribute("class", "trace"); svg.appendChild(tr);
    let rn = null;
    if (el.classList.contains("oa")) { rn = document.createElementNS(NS, "rect"); rn.setAttribute("class", "run"); svg.appendChild(rn); }
    el.appendChild(svg);
    const E = { el, svg, tr, rn, P: 1, w: 1, h: 1, r: 0, anim: null };
    edges.push(E);
    return E;
  }
  function fit(E) {
    const w = E.el.offsetWidth, h = E.el.offsetHeight;
    if (!w || !h) return;
    const cs = getComputedStyle(E.el).borderTopLeftRadius;
    let r = parseFloat(cs) || 0;
    if (cs.trim().endsWith("%")) r = r / 100 * w;
    r = Math.min(r, w / 2, h / 2);
    const iw = w - 1.5, ih = h - 1.5, ir = Math.max(0, r - 0.75);
    E.w = iw; E.h = ih; E.r = ir; E.P = perim(iw, ih, ir);
    E.svg.setAttribute("width", w); E.svg.setAttribute("height", h); E.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    for (const rc of [E.tr, E.rn]) if (rc) {
      rc.setAttribute("x", 0.75); rc.setAttribute("y", 0.75); rc.setAttribute("width", iw); rc.setAttribute("height", ih);
      rc.setAttribute("rx", ir); rc.setAttribute("ry", ir);
    }
    if (E.rn) {
      E.rn.style.strokeDasharray = `${(E.P * 0.13).toFixed(1)} ${(E.P * 0.87).toFixed(1)}`;
      if (E.anim) E.anim.cancel();
      if (!reduce && E.rn.animate) E.anim = E.rn.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -E.P }], { duration: 3600, iterations: Infinity });
    }
  }

  // 載入時：粒子一顆顆描出邊框，描完再亮起來（按鈕一直都能按）
  function traceAll(list) {
    const t0 = performance.now() + 380, D = 900, GAP = 110;
    list.forEach((E, i) => { E.tr.style.strokeDasharray = `${E.P} ${E.P}`; E.tr.style.strokeDashoffset = E.P; E.tr.style.opacity = "1"; E.start = t0 + i * GAP; });
    const step = now => {
      let left = 0;
      for (const E of list) {
        if (E.done) continue;
        left++;
        const e = (now - E.start) / D;
        if (e < 0) continue;
        const u = sstep(e * 1.04);
        E.tr.style.strokeDasharray = `${E.P} ${E.P}`;
        E.tr.style.strokeDashoffset = (E.P * (1 - u)).toFixed(1);
        if (u < 1) {
          const b = E.el.getBoundingClientRect(), p = edgePoint(E.w, E.h, E.r, u);
          if (b.bottom > 0 && b.top < innerHeight) emit("sn:spark", { x: b.left + 0.75 + p[0], y: b.top + 0.75 + p[1], n: 2, v: 1.4, life: 0.55, big: 0.9, kind: "trail", hue: E.el.classList.contains("oa") ? 1 : 0 });
        }
        if (e >= 1.05) {
          E.done = true;
          E.el.classList.add("lit");
          E.tr.style.transition = "opacity .9s"; E.tr.style.opacity = "0";
        }
      }
      if (left) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- 按下去：沿太極的 S 線黑白翻面 ----------
  function makeFlip(el) {
    const inv = el.querySelector(".inv");
    if (!inv) return null;
    let state = 0, t0 = 0, raf = 0, wantOut = false;   // 0 沒翻、1 翻進來、2 翻好、3 翻回去
    const D = 300;
    const set = v => { inv.style.webkitClipPath = v; inv.style.clipPath = v; };
    function poly(c, right) {
      const w = el.offsetWidth, h = el.offsetHeight, a = h * 0.3, xs = right ? w + 2 : -2, pts = [`${xs}px -2px`];
      for (let k = 0; k <= 18; k++) { const y = -2 + (h + 4) * k / 18; pts.push(`${(c + a * Math.sin(2 * Math.PI * y / h)).toFixed(1)}px ${y.toFixed(1)}px`); }
      pts.push(`${xs}px ${h + 2}px`);
      return `polygon(${pts.join(",")})`;
    }
    function step(now) {
      const w = el.offsetWidth, a = el.offsetHeight * 0.3, e = Math.min(1, (now - t0) / D), c = -a + (w + 2 * a) * sstep(e);
      if (state === 1) { set(poly(c, false)); if (e >= 1) { state = 2; set("none"); if (wantOut) setTimeout(() => start(3), 90); return; } }
      else if (state === 3) { set(poly(c, true)); if (e >= 1) { state = 0; set("inset(0 100% 0 0)"); return; } }
      raf = requestAnimationFrame(step);
    }
    function start(s) { state = s; t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(step); }
    return {
      press() { wantOut = false; if (state === 0) start(1); },
      release() { wantOut = true; if (state === 2) setTimeout(() => start(3), 90); }
    };
  }

  // ---------- 按下去：壓扁、噴金粒子、喀一聲；放開 Q 彈回來 ----------
  // 手指按下 90 毫秒內沒有滑動才算按（不然一滑頁面就一直噴）
  function wirePress(el) {
    const flip = reduce ? null : makeFlip(el);
    let timer = 0, sx = 0, sy = 0, fired = false, down = false;
    const fire = () => {
      timer = 0; fired = true;
      el.classList.remove("jelly"); el.classList.add("press");
      const big = el.matches(".oa, .lpill");   // 噴得夠遠才會從按鈕邊緣噴出來
      emit("sn:spark", { x: sx, y: sy, n: big ? 46 : 26, v: big ? 17 : 12, life: 0.8, big: 1.3, kind: "burst", hue: 0 });
      emit("sn:tick", { strong: el.matches(".oa, .lpill") });
      if (flip) flip.press();
    };
    const release = () => {
      if (!fired) return;
      fired = false;
      el.classList.remove("press"); void el.offsetWidth; el.classList.add("jelly");
      if (flip) flip.release();
    };
    el.addEventListener("pointerdown", e => {
      if (e.button > 0) return;
      down = true; fired = false; sx = e.clientX; sy = e.clientY;
      clearTimeout(timer); timer = setTimeout(fire, 90);
    });
    el.addEventListener("pointermove", e => {
      if (down && timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) { clearTimeout(timer); timer = 0; }
    });
    el.addEventListener("pointerup", () => { down = false; if (timer) { clearTimeout(timer); fire(); } release(); });
    el.addEventListener("pointercancel", () => { down = false; clearTimeout(timer); timer = 0; release(); });
    el.addEventListener("pointerleave", () => { down = false; clearTimeout(timer); timer = 0; release(); });
    el.addEventListener("animationend", e => { if (e.target === el) el.classList.remove("jelly"); });
  }

  document.querySelectorAll(".lbtn, .soc, .tool, .lpill").forEach(wirePress);
  const traced = [...document.querySelectorAll(".trace")].map(addEdge);
  document.querySelectorAll("#end .lbtn.oa").forEach(el => { const E = addEdge(el); E.done = true; el.classList.add("lit"); });
  const fitAll = () => edges.forEach(fit);
  fitAll();
  if (reduce) traced.forEach(E => { E.done = true; E.el.classList.add("lit"); E.tr.style.opacity = "0"; });
  else {   // 等粒子那邊準備好再描（最多等 1.6 秒）
    let go = false;
    const begin = () => { if (go) return; go = true; traceAll(traced); };
    addEventListener("sn:ready", begin);
    setTimeout(begin, 1600);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fitAll, 150); });

  // ---------- 底部浮動的 LINE 官方：滑過第一頁才出來，回第一頁或到最後一頁收起來 ----------
  const pill = document.querySelector(".lpill"), hero = document.querySelector(".hero"), endOA = document.querySelector("#end .lbtn.oa");
  let endVis = false;
  const upd = () => { pill.classList.toggle("on", scrollY > hero.offsetHeight * 0.7 && !endVis); };
  if (endOA && "IntersectionObserver" in window) new IntersectionObserver(es => { endVis = es[es.length - 1].isIntersecting; upd(); }, { rootMargin: "0px 0px 60px 0px" }).observe(endOA);
  addEventListener("scroll", upd, { passive: true });
  upd();
})();
