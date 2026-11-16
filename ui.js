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
    const rn = null;   // 原本官方按鈕的跑光拿掉了（他說看起來廉價）
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

  // ---------- 簽名：光筆一筆一筆寫出 Snsheng ----------
  const SIG = ["M2.20 22.00C2.57 21.83 3.63 21.50 4.40 21.00C5.17 20.50 5.77 20.00 6.80 19.00C7.83 18.00 9.53 16.17 10.60 15.00C11.67 13.83 12.30 13.17 13.20 12.00C14.10 10.83 15.27 9.17 16.00 8.00C16.73 6.83 17.23 6.00 17.60 5.00C17.97 4.00 18.23 2.67 18.20 2.00C18.17 1.33 17.70 1.17 17.40 1.00C17.10 0.83 16.77 0.83 16.40 1.00C16.03 1.17 15.63 1.50 15.20 2.00C14.77 2.50 14.10 3.33 13.80 4.00C13.50 4.67 13.37 5.33 13.40 6.00C13.43 6.67 13.63 7.33 14.00 8.00C14.37 8.67 14.90 9.33 15.60 10.00C16.30 10.67 17.50 11.33 18.20 12.00C18.90 12.67 19.43 13.33 19.80 14.00C20.17 14.67 20.37 15.33 20.40 16.00C20.43 16.67 20.30 17.33 20.00 18.00C19.70 18.67 19.03 19.50 18.60 20.00C18.17 20.50 18.13 20.67 17.40 21.00C16.67 21.33 15.40 21.83 14.20 22.00C13.00 22.17 11.33 22.17 10.20 22.00C9.07 21.83 8.13 21.50 7.40 21.00C6.67 20.50 6.17 19.67 5.80 19.00C5.43 18.33 5.23 17.67 5.20 17.00C5.17 16.33 5.53 15.33 5.60 15.00", "M23.20 17.00C23.63 16.50 25.00 14.67 25.80 14.00C26.60 13.33 27.50 13.00 28.00 13.00C28.50 13.00 28.70 13.67 28.80 14.00C28.90 14.33 28.93 14.17 28.60 15.00C28.27 15.83 27.37 17.83 26.80 19.00C26.23 20.17 25.47 21.50 25.20 22.00", "M26.80 19.00C27.03 18.67 27.53 17.83 28.20 17.00C28.87 16.17 30.00 14.67 30.80 14.00C31.60 13.33 32.30 13.17 33.00 13.00C33.70 12.83 34.53 12.83 35.00 13.00C35.47 13.17 35.73 13.50 35.80 14.00C35.87 14.50 35.73 15.17 35.40 16.00C35.07 16.83 34.13 18.17 33.80 19.00C33.47 19.83 33.33 20.50 33.40 21.00C33.47 21.50 33.90 21.83 34.20 22.00C34.50 22.17 34.67 22.17 35.20 22.00C35.73 21.83 36.83 21.33 37.40 21.00C37.97 20.67 37.97 20.67 38.60 20.00C39.23 19.33 40.77 17.50 41.20 17.00", "M41.20 17.00C41.63 16.50 43.13 14.83 43.80 14.00C44.47 13.17 45.03 12.00 45.20 12.00C45.37 12.00 44.63 13.17 44.80 14.00C44.97 14.83 45.87 16.17 46.20 17.00C46.53 17.83 46.77 18.33 46.80 19.00C46.83 19.67 46.83 20.50 46.40 21.00C45.97 21.50 44.57 21.83 44.20 22.00", "M40.40 21.00C40.70 21.17 41.23 21.83 42.20 22.00C43.17 22.17 45.17 22.17 46.20 22.00C47.23 21.83 47.83 21.33 48.40 21.00C48.97 20.67 48.97 20.67 49.60 20.00C50.23 19.33 51.77 17.50 52.20 17.00", "M52.20 17.00C52.63 16.50 53.70 15.33 54.80 14.00C55.90 12.67 57.90 10.17 58.80 9.00C59.70 7.83 59.70 7.83 60.20 7.00C60.70 6.17 61.47 4.83 61.80 4.00C62.13 3.17 62.27 2.50 62.20 2.00C62.13 1.50 61.90 1.00 61.40 1.00C60.90 1.00 59.80 1.50 59.20 2.00C58.60 2.50 58.33 3.00 57.80 4.00C57.27 5.00 56.67 6.33 56.00 8.00C55.33 9.67 54.60 11.67 53.80 14.00C53.00 16.33 51.63 20.67 51.20 22.00", "M51.20 22.00C51.47 21.50 52.30 19.83 52.80 19.00C53.30 18.17 53.53 17.83 54.20 17.00C54.87 16.17 56.00 14.67 56.80 14.00C57.60 13.33 58.30 13.17 59.00 13.00C59.70 12.83 60.53 12.83 61.00 13.00C61.47 13.17 61.73 13.50 61.80 14.00C61.87 14.50 61.73 15.17 61.40 16.00C61.07 16.83 60.13 18.17 59.80 19.00C59.47 19.83 59.33 20.50 59.40 21.00C59.47 21.50 59.90 21.83 60.20 22.00C60.50 22.17 60.67 22.17 61.20 22.00C61.73 21.83 62.83 21.33 63.40 21.00C63.97 20.67 63.97 20.67 64.60 20.00C65.23 19.33 66.77 17.50 67.20 17.00", "M67.60 20.00C67.97 19.83 69.23 19.33 69.80 19.00C70.37 18.67 70.57 18.50 71.00 18.00C71.43 17.50 72.10 16.67 72.40 16.00C72.70 15.33 72.87 14.50 72.80 14.00C72.73 13.50 72.30 13.17 72.00 13.00C71.70 12.83 71.53 12.83 71.00 13.00C70.47 13.17 69.40 13.50 68.80 14.00C68.20 14.50 67.73 15.17 67.40 16.00C67.07 16.83 66.80 18.17 66.80 19.00C66.80 19.83 67.00 20.50 67.40 21.00C67.80 21.50 68.57 21.83 69.20 22.00C69.83 22.17 70.50 22.17 71.20 22.00C71.90 21.83 72.83 21.33 73.40 21.00C73.97 20.67 73.97 20.67 74.60 20.00C75.23 19.33 76.77 17.50 77.20 17.00", "M77.20 17.00C77.63 16.50 79.00 14.67 79.80 14.00C80.60 13.33 81.50 13.00 82.00 13.00C82.50 13.00 82.70 13.67 82.80 14.00C82.90 14.33 82.93 14.17 82.60 15.00C82.27 15.83 81.37 17.83 80.80 19.00C80.23 20.17 79.47 21.50 79.20 22.00", "M80.80 19.00C81.03 18.67 81.53 17.83 82.20 17.00C82.87 16.17 84.00 14.67 84.80 14.00C85.60 13.33 86.30 13.17 87.00 13.00C87.70 12.83 88.53 12.83 89.00 13.00C89.47 13.17 89.73 13.50 89.80 14.00C89.87 14.50 89.73 15.17 89.40 16.00C89.07 16.83 88.13 18.17 87.80 19.00C87.47 19.83 87.33 20.50 87.40 21.00C87.47 21.50 87.90 21.83 88.20 22.00C88.50 22.17 88.67 22.17 89.20 22.00C89.73 21.83 90.83 21.33 91.40 21.00C91.97 20.67 91.97 20.67 92.60 20.00C93.23 19.33 94.77 17.50 95.20 17.00", "M104.40 16.00C104.30 15.67 104.20 14.50 103.80 14.00C103.40 13.50 102.63 13.17 102.00 13.00C101.37 12.83 100.70 12.83 100.00 13.00C99.30 13.17 98.37 13.67 97.80 14.00C97.23 14.33 97.03 14.50 96.60 15.00C96.17 15.50 95.50 16.33 95.20 17.00C94.90 17.67 94.77 18.33 94.80 19.00C94.83 19.67 95.00 20.50 95.40 21.00C95.80 21.50 96.57 21.83 97.20 22.00C97.83 22.17 98.50 22.17 99.20 22.00C99.90 21.83 100.83 21.33 101.40 21.00C101.97 20.67 102.40 20.17 102.60 20.00", "M106.00 13.00C105.43 14.17 104.20 17.00 102.60 20.00C101.00 23.00 97.67 28.83 96.40 31.00C95.13 33.17 95.60 32.50 95.00 33.00C94.40 33.50 93.30 34.00 92.80 34.00C92.30 34.00 92.07 33.50 92.00 33.00C91.93 32.50 92.07 31.83 92.40 31.00C92.73 30.17 93.13 29.00 94.00 28.00C94.87 27.00 96.43 25.83 97.60 25.00C98.77 24.17 100.07 23.50 101.00 23.00C101.93 22.50 102.27 22.50 103.20 22.00C104.13 21.50 105.43 20.83 106.60 20.00C107.77 19.17 109.60 17.50 110.20 17.00"];
  function fillSig(svg) {
    if (svg._s) return svg._s;
    svg.innerHTML = SIG.map(d => `<path d="${d}"/>`).join("") + '<circle class="pen" r="1.7" cx="-20" cy="-20"/>';
    const paths = [...svg.querySelectorAll("path")], lens = paths.map(p => p.getTotalLength());
    paths.forEach((p, i) => { p.style.strokeDasharray = `${lens[i]} ${lens[i]}`; p.style.strokeDashoffset = lens[i]; });
    svg._s = { paths, lens, total: lens.reduce((a, b) => a + b, 0), raf: 0, pen: svg.querySelector(".pen") };
    return svg._s;
  }
  function writeSig(svg, dur = 1600) {
    const S = fillSig(svg);
    cancelAnimationFrame(S.raf);
    if (reduce) { S.paths.forEach(p => { p.style.strokeDashoffset = "0"; }); return; }
    const t0 = performance.now(), pt = svg.createSVGPoint();
    const step = now => {
      const d = Math.min(1, (now - t0) / dur) * S.total;
      let rest = d, head = null;
      S.paths.forEach((p, i) => {
        const L = S.lens[i], v = Math.max(0, Math.min(L, rest));
        p.style.strokeDashoffset = (L - v).toFixed(2);
        if (rest > 0 && rest < L) head = p.getPointAtLength(v);
        rest -= L;
      });
      if (head) {
        S.pen.setAttribute("cx", head.x.toFixed(2)); S.pen.setAttribute("cy", head.y.toFixed(2)); S.pen.style.opacity = "1";
        const m = svg.getScreenCTM();
        if (m) { pt.x = head.x; pt.y = head.y; const q = pt.matrixTransform(m); emit("sn:spark", { x: q.x, y: q.y, n: 2, v: 1.2, life: 0.5, big: 0.85, kind: "trail" }); }
      } else S.pen.style.opacity = "0";
      if (d < S.total) S.raf = requestAnimationFrame(step); else S.pen.style.opacity = "0";
    };
    S.raf = requestAnimationFrame(step);
  }
  function clearSig(svg) { const S = fillSig(svg); cancelAnimationFrame(S.raf); S.paths.forEach((p, i) => { p.style.strokeDashoffset = S.lens[i]; }); S.pen.style.opacity = "0"; }
  document.querySelectorAll(".sig").forEach(fillSig);

  // ---------- 字卡：換頁時邊框燒成金粒子散掉，新卡由粒子描出邊框再亮起來 ----------
  const pins = [...document.querySelectorAll(".pin")].map(sec => ({ sec, card: sec.querySelector(":scope > .copy"), key: sec.dataset.shape, state: 0, tok: 0 }));
  pins.forEach(P => { if (!P.sec.id) P.sec.id = "s-" + P.key; });
  let VH = innerHeight;
  function measurePins() { VH = innerHeight; for (const P of pins) { P.top = P.sec.offsetTop; P.h = P.sec.offsetHeight; } }
  measurePins();
  const hooks = { show: {}, hide: {} };
  const isGhost = P => P.card.classList.contains("ghost");
  const outAngle = (r, x, y) => Math.atan2(-(y - (r.top + r.height / 2)), x - (r.left + r.width / 2));
  function showCard(P) {
    if (!P.card || P.state === 1 || P.state === 2) return;
    const tok = ++P.tok, c = P.card;
    P.state = 1;
    c.classList.remove("out"); c.classList.add("show");
    if (hooks.show[P.key]) hooks.show[P.key](P);
    if (isGhost(P) || reduce) { c.classList.remove("bare"); c.classList.add("on"); P.state = 2; return; }
    c.classList.add("bare"); c.classList.remove("on");
    if (!P.E) P.E = addEdge(c);
    fit(P.E);
    const E = P.E, t0 = performance.now(), D = 560;
    E.tr.style.transition = "none"; E.tr.style.opacity = "1"; E.tr.style.strokeDasharray = `${E.P} ${E.P}`; E.tr.style.strokeDashoffset = E.P;
    const step = now => {
      if (tok !== P.tok) return;
      const u = sstep((now - t0) / D), r = c.getBoundingClientRect(), p = edgePoint(E.w, E.h, E.r, u);
      E.tr.style.strokeDashoffset = (E.P * (1 - u)).toFixed(1);
      if (u < 1) {
        emit("sn:spark", { x: r.left + p[0], y: r.top + p[1], n: 3, v: 1.8, life: 0.6, big: 1, kind: "trail" });
        requestAnimationFrame(step);
      } else {
        c.classList.remove("bare"); c.classList.add("on"); P.state = 2;
        E.tr.style.transition = "opacity .9s"; E.tr.style.opacity = "0";
      }
    };
    requestAnimationFrame(step);
  }
  function hideCard(P) {
    if (!P.card || P.state === 0 || P.state === 3) return;
    const tok = ++P.tok, c = P.card;
    if (hooks.hide[P.key]) hooks.hide[P.key](P);
    c.classList.add("out"); c.classList.remove("on");
    P.state = 3;
    const done = () => { if (tok !== P.tok) return; c.classList.remove("show", "out", "bare"); P.state = 0; };
    if (isGhost(P) || reduce) { setTimeout(done, 320); return; }
    if (!P.E) P.E = addEdge(c);
    fit(P.E);
    const E = P.E, t0 = performance.now(), D = 480, r0 = c.getBoundingClientRect();
    E.tr.style.transition = "none"; E.tr.style.opacity = "1"; E.tr.style.strokeDasharray = `${E.P} ${E.P}`; E.tr.style.strokeDashoffset = "0";
    for (let k = 0; k < 30; k++) {   // 先沿著邊爆一圈
      const p = edgePoint(E.w, E.h, E.r, k / 30), x = r0.left + p[0], y = r0.top + p[1];
      emit("sn:spark", { x, y, n: 1, v: 4.5, life: 0.95, big: 1.15, kind: "burst", a: outAngle(r0, x, y) });
    }
    setTimeout(() => { if (tok === P.tok) c.classList.add("bare"); }, 110);
    const step = now => {
      if (tok !== P.tok) return;
      const u = sstep((now - t0) / D), r = c.getBoundingClientRect(), p = edgePoint(E.w, E.h, E.r, u);
      E.tr.style.strokeDashoffset = (-E.P * u).toFixed(1);   // 邊從起點一路燒掉
      if (u < 1) {
        const x = r.left + p[0], y = r.top + p[1];
        emit("sn:spark", { x, y, n: 4, v: 3.4, life: 0.85, big: 1.15, kind: "burst", a: outAngle(r, x, y) });
        requestAnimationFrame(step);
      } else { E.tr.style.opacity = "0"; done(); }
    };
    requestAnimationFrame(step);
  }
  function updCards() {
    const y = scrollY;
    for (let i = 0; i < pins.length; i++) {
      const P = pins[i], last = i === pins.length - 1;
      const a = P.top - 0.32 * VH, b = last ? Infinity : P.top + P.h - VH + 0.28 * VH;
      if (y >= a && y < b) showCard(P); else hideCard(P);
    }
  }

  // 我是誰：作品數字跳上去
  hooks.show.smiley = P => {
    const tok = P.tok;
    P.card.querySelectorAll("[data-count]").forEach(el => {
      const to = +el.dataset.count; if (!isFinite(to)) return;
      if (reduce) { el.textContent = to; return; }
      const t0 = performance.now() + 600;
      el.textContent = "0";
      const step = now => { if (tok !== P.tok) return; const u = Math.min(1, Math.max(0, (now - t0) / 1200)); el.textContent = Math.round(to * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };
  // 書：頁數跳上去
  hooks.show.book = P => {
    const el = P.card.querySelector(".count"); if (!el) return;
    const to = +el.dataset.to, t0 = performance.now() + 500, tok = P.tok;
    if (reduce) { el.textContent = to; return; }
    el.textContent = "0";
    const step = now => { if (tok !== P.tok) return; const u = Math.min(1, Math.max(0, (now - t0) / 1400)); el.textContent = Math.round(to * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  // 手機框裡的錄影：出來才播，反光掃過一次
  function gloss(el) {
    if (reduce) return;
    const t0 = performance.now() + 700;
    const step = now => { const u = (now - t0) / 900; if (u < 0) return requestAnimationFrame(step); el.style.setProperty("--gl", u < 1 ? "1" : "0"); el.style.setProperty("--gx", (110 - u * 120).toFixed(1) + "%"); if (u < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const playPhones = P => P.card.querySelectorAll(".phone").forEach(ph => { const v = ph.querySelector("video"); if (v) { if (!v.getAttribute("src")) v.src = v.dataset.src; v.play().catch(() => {}); } gloss(ph); });
  const pausePhones = P => P.card.querySelectorAll(".phone video").forEach(v => v.pause());
  hooks.show.ox = hooks.show.merge = playPhones;
  hooks.hide.ox = hooks.hide.merge = pausePhones;
  // 金句：光筆寫完字，簽名接著寫
  addEventListener("sn:penDone", e => {
    const P = pins.find(q => q.key === (e.detail && e.detail.key));
    if (!P) return;
    P.penDone = true;
    const s = P.card.querySelector(".sig");
    if (s && P.state && P.state < 3) setTimeout(() => writeSig(s, 1500), 150);
  });
  ["q0", "q1", "q2", "q3"].forEach(k => {
    hooks.hide[k] = P => { P.penDone = false; const s = P.card.querySelector(".sig"); if (s) setTimeout(() => { if (!P.state) clearSig(s); }, 500); };
    hooks.show[k] = P => { const s = P.card.querySelector(".sig"); if (s) { clearSig(s); if (P.penDone) setTimeout(() => writeSig(s, 1500), 200); } };
  });
  hooks.show.logo = P => { const s = P.card.querySelector(".sig"); if (s) { clearSig(s); setTimeout(() => { if (P.state === 1 || P.state === 2) writeSig(s, 1700); }, 450); } };

  // ---------- 影片牆：翻牌進場，滑下去整面翻成教學短片 ----------
  const FILMS = [["taiex60", "台股 60 年"], ["btc", "比特幣"], ["tw400", "台灣 400 年"], ["rallies", "台股最強 7 次上漲"], ["musk", "如果馬斯克是一檔股票"], ["gold", "黃金"], ["swan", "台股 5 大黑天鵝"], ["apple", "蘋果的人生 K 線圖"]];
  const SHORTS = [["44y5eVYnUxk", "趨勢結構怎麼畫"], ["ENbT7iBz7Nw", "50 種 K 線形態只問一件事"], ["KiYqDI-4te8", "史上最大跌點，是選出來的"], ["PclbAe8Igvs", "幣安被駭 48 小時"], ["w-2_rdQm02E", "國安基金護盤"], ["_o8fMUqiG_c", "那斯達克選後崩跌"], ["QF-zLId_UOI", "比特幣 16 年週 K"]];   // [影片代號, 片名]
  const wall = document.querySelector(".wall"), tabs = [...document.querySelectorAll(".wall-tabs b")], wallMore = document.querySelector("#films .more");
  const phoneNow = () => innerWidth <= 760;
  // 每張牌只有一面：轉到側面（90 度）的那一刻換內容，再轉回正面，不靠背面隱藏（iPhone 上比較穩）
  const tiles = FILMS.map((f, i) => {
    const el = document.createElement("a");
    el.className = "film"; el.draggable = false; el.target = "_blank"; el.rel = "noopener";
    el.innerHTML = `<span class="fc"></span>`;
    wall.appendChild(el);
    return { el, face: el.querySelector(".fc"), film: f, short: SHORTS[i] || null, angle: 0, tx: 0, ty: 0, kind: "", tok: 0 };
  });
  const shortUrl = T => T.short ? `https://www.youtube.com/shorts/${T.short[0]}` : LINKS.yt + "/shorts";
  function setFace(T, kind) {
    if (T.kind === kind) return;
    T.kind = kind;
    if (kind === "film") T.face.innerHTML = `<img src="media/${T.film[0]}.jpg" alt="" loading="lazy"><span>${T.film[1]}</span>`;
    else if (kind === "short" && T.short) T.face.innerHTML = `<img src="media/short-${T.short[0]}.jpg" alt="" loading="lazy"><span>${T.short[1]}</span>`;
    else if (kind === "short") T.face.innerHTML = `<span class="blank"></span><span>到 YouTube 看更多</span>`;
    else T.face.innerHTML = `<span class="blank"></span>`;
  }
  const applyT = T => { T.el.style.transform = `rotateX(${T.tx.toFixed(2)}deg) rotateY(${(T.angle + T.ty).toFixed(2)}deg)`; };
  function flipTo(T, kind, delay, dir = 1) {
    const tok = ++T.tok;
    if (reduce) { setFace(T, kind); return; }
    setTimeout(() => {
      if (tok !== T.tok) return;
      T.el.style.transition = "transform .3s cubic-bezier(.55, 0, 1, .45)"; T.angle = 90 * dir; applyT(T);
      setTimeout(() => {
        if (tok !== T.tok) return;
        setFace(T, kind);
        T.el.style.transition = "none"; T.angle = -90 * dir; applyT(T); void T.el.offsetWidth;
        T.el.style.transition = "transform .55s cubic-bezier(.2, 1.35, .4, 1)"; T.angle = 0; applyT(T);
      }, 300);
    }, delay);
  }
  tiles.forEach(T => { setFace(T, "blank"); applyT(T); T.el.href = LINKS.ig; });
  let wallPage = 0, wallTimer = 0, wallCycle = 0, wallRot = 0;
  function stopWallVideos() { clearInterval(wallCycle); wall.querySelectorAll("video").forEach(v => { v.pause(); v.remove(); }); }
  function playTile(T) {
    if (T.el.querySelector("video")) return;
    const src = T.kind === "short" ? (T.short ? `media/short-${T.short[0]}.mp4` : "") : T.kind === "film" ? `media/${T.film[0]}.mp4` : "";
    if (!src) return;
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", ""); v.preload = "auto"; v.src = src;
    T.face.insertBefore(v, T.face.firstChild.nextSibling);
    v.play().catch(() => {});
  }
  function startWallVideos() {
    stopWallVideos();
    if (!wallPage || reduce) return;
    const per = phoneNow() ? 4 : 8;
    const run = () => {
      wall.querySelectorAll("video").forEach(v => { v.pause(); v.remove(); });
      const n = tiles.length, start = (wallRot * per) % n;
      for (let k = 0; k < per; k++) playTile(tiles[(start + k) % n]);
      wallRot++;
    };
    wallRot = 0; run();
    if (per < tiles.length) wallCycle = setInterval(run, 5200);
  }
  function setPage(pg, animate = true) {
    if (pg === wallPage) return;
    const back = pg < wallPage;
    wallPage = pg;
    stopWallVideos(); clearTimeout(wallTimer);
    const kind = pg === 0 ? "blank" : pg === 1 ? "film" : "short";
    tiles.forEach((T, i) => {
      if (!animate) { T.tok++; T.el.style.transition = "none"; T.angle = 0; applyT(T); setFace(T, kind); }
      else flipTo(T, kind, i * 75, back ? -1 : 1);
      T.el.href = pg === 2 ? shortUrl(T) : LINKS.ig;
    });
    tabs.forEach((b, i) => b.classList.toggle("cur", (pg === 2) === (i === 1)));
    if (wallMore) { wallMore.href = pg === 2 ? LINKS.yt + "/shorts" : LINKS.ig; wallMore.textContent = pg === 2 ? "到 YouTube 看更多短片 ↗" : "到 Instagram 看完整版 ↗"; }
    if (pg) wallTimer = setTimeout(startWallVideos, animate ? 900 + tiles.length * 75 : 0);
  }
  const filmsP = pins.find(P => P.key === "films");
  const filmsLocal = () => (scrollY - filmsP.top) / Math.max(1, filmsP.h - VH);
  hooks.show.films = () => setTimeout(() => { if (!wallPage && filmsP.state && filmsP.state < 3) setPage(filmsLocal() >= 0.5 ? 2 : 1); }, 380);
  hooks.hide.films = () => { setTimeout(() => { if (!filmsP.state) setPage(0, false); }, 500); };
  function updWall() {
    if (!filmsP || filmsP.state !== 2 || !wallPage) return;
    const p = filmsLocal();
    if (wallPage === 1 && p >= 0.5) setPage(2); else if (wallPage === 2 && p < 0.42) setPage(1);
  }

  // ---------- 卡片跟著手指傾斜、反光 ----------
  function tiltOn(el, e, set) {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    set(-y * 14, x * 16);
    el.style.setProperty("--gl", "1"); el.style.setProperty("--gx", (50 - x * 120).toFixed(1) + "%");
  }
  document.querySelectorAll(".tilt").forEach(el => {
    const set = (rx, ry) => { el.style.transition = "transform .12s"; el.style.transform = `perspective(600px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; };
    const on = e => { if (!reduce) tiltOn(el, e, set); };
    const off = () => { el.style.transition = "transform .7s cubic-bezier(.2, 1.4, .4, 1)"; el.style.transform = ""; el.style.setProperty("--gl", "0"); };
    el.addEventListener("pointermove", on); el.addEventListener("pointerdown", on);
    el.addEventListener("pointerleave", off); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off);
  });
  tiles.forEach(T => {
    const set = (rx, ry) => { T.tx = rx * 0.8; T.ty = ry * 0.8; T.el.style.transition = "transform .12s"; applyT(T); };
    const on = e => { if (!reduce && wallPage) tiltOn(T.el, e, set); };
    const off = () => { T.tx = T.ty = 0; T.el.style.transition = "transform .7s cubic-bezier(.2, 1.4, .4, 1)"; applyT(T); T.el.style.setProperty("--gl", "0"); };
    T.el.addEventListener("pointermove", on); T.el.addEventListener("pointerdown", on);
    T.el.addEventListener("pointerleave", off); T.el.addEventListener("pointerup", off); T.el.addEventListener("pointercancel", off);
  });

  // ---------- 右邊的小笑臉：頭像縮小飛過去當進度，點它開章節 ----------
  const prog = document.querySelector(".prog"), meBtn = prog.querySelector(".me"), fillEl = prog.querySelector(".fill");
  const chap = document.querySelector(".chap"), chapList = chap.querySelector(".list"), avatar = document.querySelector(".hero .avatar");
  const chapters = pins.filter(P => P.sec.dataset.title);
  chapters.forEach(P => { const t = document.createElement("span"); t.className = "tick"; prog.insertBefore(t, meBtn); P.tick = t; });
  function layoutProg() {
    const H = prog.clientHeight, max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    chapters.forEach(P => { P.tick.style.top = (Math.min(1, P.top / max) * H).toFixed(1) + "px"; });
  }
  let progOn = false, flying = null;
  function fly(out) {
    if (reduce || !avatar) { prog.classList.toggle("on", out); if (avatar) avatar.style.visibility = out ? "hidden" : ""; return; }
    if (flying) { flying.remove(); flying = null; }
    const a = avatar.getBoundingClientRect(), b = meBtn.getBoundingClientRect();
    const from = out ? a : b, to = out ? b : a;
    const el = document.createElement("div");
    el.className = "flyme"; el.style.width = from.width + "px"; el.style.height = from.height + "px";
    el.style.transform = `translate(${from.left}px, ${from.top}px)`;
    document.body.appendChild(el); flying = el;
    if (out) avatar.style.visibility = "hidden"; else prog.classList.remove("on");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = "transform .62s cubic-bezier(.55, 0, .2, 1)";
      el.style.transform = `translate(${to.left}px, ${to.top}px) scale(${(to.width / from.width).toFixed(4)})`;
    }));
    setTimeout(() => {
      if (flying !== el) return;
      el.remove(); flying = null;
      if (out) prog.classList.add("on"); else avatar.style.visibility = "";
    }, 660);
  }
  function updProg() {
    const y = scrollY, max = Math.max(1, document.documentElement.scrollHeight - innerHeight), H = prog.clientHeight, u = Math.min(1, Math.max(0, y / max));
    meBtn.style.setProperty("--y", (u * H).toFixed(1) + "px"); fillEl.style.height = (u * H).toFixed(1) + "px";
    chapters.forEach(P => P.tick.classList.toggle("done", y >= P.top - 2));
    const want = y > 70;
    if (want !== progOn) { progOn = want; fly(want); }
  }
  setInterval(() => { if (!progOn || reduce) return; meBtn.classList.add("blink"); setTimeout(() => meBtn.classList.remove("blink"), 260); }, 3600);
  let html = "", blk = null;
  chapters.forEach((P, i) => {
    const b = P.sec.dataset.block;
    if (b && b !== blk) { html += `<h3>${b}</h3>`; blk = b; }
    html += `<a href="#${P.sec.id}" data-i="${i}">${P.sec.dataset.title}</a>`;
  });
  html += `<h3>更多</h3><a href="learn/">教學</a><a href="tools/">交易小工具</a><a href="join/" class="dim">註冊成為 Snsheng 會員</a>`;
  chapList.innerHTML = html;
  function openChap(on) {
    if (on) {
      const y = scrollY;
      chapList.querySelectorAll("a").forEach((a, i) => a.classList.toggle("cur", y >= chapters[i].top - 0.4 * VH && (i === chapters.length - 1 || y < chapters[i + 1].top - 0.4 * VH)));
      emit("sn:tick", { strong: false });
    }
    chap.classList.toggle("on", on);
  }
  meBtn.addEventListener("click", () => openChap(!chap.classList.contains("on")));
  chap.querySelector(".bg").addEventListener("click", () => openChap(false));
  chapList.addEventListener("click", e => {
    const a = e.target.closest("a"); if (!a || a.dataset.i == null) return;   // 分頁連結照常打開
    e.preventDefault();
    const P = chapters[+a.dataset.i];
    openChap(false);
    scrollTo({ top: P.top + 2, behavior: reduce ? "auto" : "smooth" });
  });
  addEventListener("keydown", e => { if (e.key === "Escape") openChap(false); });

  // ---------- 底部浮動的 LINE 官方：滑過第一頁才出來，回第一頁或到最後一頁收起來 ----------
  const pill = document.querySelector(".lpill"), hero = document.querySelector(".hero"), endP = pins.find(P => P.key === "logo");
  const updPill = () => { pill.classList.toggle("on", scrollY > hero.offsetHeight * 0.7 && !(endP && endP.state && endP.state < 3)); };

  // ---------- 每次滑動 ----------
  let raf = 0;
  const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; updCards(); updWall(); updProg(); updPill(); }); };
  addEventListener("scroll", onScroll, { passive: true });
  const relayout = () => { measurePins(); layoutProg(); updCards(); updProg(); updPill(); };
  addEventListener("resize", () => setTimeout(relayout, 160));
  addEventListener("load", relayout);
  relayout();
})();
