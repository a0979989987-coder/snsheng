// 四個小工具：盈虧比、倉位、結構小測驗、假突破練習（全部在手機裡算，不送出任何資料）
(() => {
  const $ = id => document.getElementById(id);
  const num = el => parseFloat(String(el.value).replace(/,/g, ""));
  const fmt = (v, d = 2) => isFinite(v) ? (+v.toFixed(d)).toLocaleString("en-US", { maximumFractionDigits: d }) : "—";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 數字從舊的值跳到新的值
  function tween(el, to, d = 2, pre = "", post = "") {
    const from = el._v ?? to;
    el._v = to;
    if (!isFinite(to)) { el.textContent = "—"; return; }
    if (reduce || from === to) { el.textContent = pre + fmt(to, d) + post; return; }
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const step = now => { const u = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - u, 3); el.textContent = pre + fmt(from + (to - from) * e, d) + post; if (u < 1) el._raf = requestAnimationFrame(step); };
    el._raf = requestAnimationFrame(step);
  }

  // ---------- 盈虧比 ----------
  let dir = "long";
  const rrE = $("rrE"), rrS = $("rrS"), rrT = $("rrT");
  document.querySelectorAll("#rr .seg button").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.dir === dir) return;
    const e = num(rrE), s = num(rrS), t = num(rrT);
    dir = b.dataset.dir;
    document.querySelectorAll("#rr .seg button").forEach(x => x.classList.toggle("on", x === b));
    if (isFinite(e) && isFinite(s) && isFinite(t)) { rrS.value = +(2 * e - s).toFixed(6); rrT.value = +(2 * e - t).toFixed(6); }   // 距離不變，方向翻過來
    calcRR();
  }));
  function setY(el, attr, v) { el.setAttribute(attr, v.toFixed(1)); }
  function calcRR() {
    const e = num(rrE), s = num(rrS), t = num(rrT), W = $("rrW");
    const ok = dir === "long" ? s < e && e < t : t < e && e < s;
    W.textContent = !(e > 0 && s > 0 && t > 0) ? "請輸入大於 0 的價格。" : ok ? "" : dir === "long" ? "做多時：止損要在進場下面，止盈要在進場上面。" : "做空時：止損要在進場上面，止盈要在進場下面。";
    const r = ok ? Math.abs(t - e) / Math.abs(e - s) : NaN;
    tween($("rrR"), r, 2);
    $("rrTp").textContent = ok ? (dir === "long" ? "+" : "-") + fmt(Math.abs(t - e) / e * 100) + "%" : "—";
    $("rrSp").textContent = ok ? (dir === "long" ? "-" : "+") + fmt(Math.abs(e - s) / e * 100) + "%" : "—";
    // 尺：價格換成高度
    const lo = Math.min(e, s, t), hi = Math.max(e, s, t), pad = (hi - lo) * 0.08 || 1;
    const Y = v => ok ? 210 - (v - lo + pad) / (hi - lo + 2 * pad) * 200 : 110;
    const yE = Y(e), yS = Y(s), yT = Y(t);
    const up = $("rrUp"), dn = $("rrDn");
    setY(up, "y", Math.min(yE, yT)); setY(up, "height", Math.abs(yT - yE));
    setY(dn, "y", Math.min(yE, yS)); setY(dn, "height", Math.abs(yS - yE));
    for (const [id, y] of [["rrEl", yE]]) { setY($(id), "y1", y); setY($(id), "y2", y); }
    setY($("rrLE"), "y", yE); setY($("rrLT"), "y", yT); setY($("rrLS"), "y", yS);
  }
  [rrE, rrS, rrT].forEach(i => i.addEventListener("input", calcRR));
  calcRR();

  // ---------- 倉位 ----------
  const szC = $("szC"), szR = $("szR"), szD = $("szD"), szL = $("szL");
  function calcSize() {
    const c = num(szC), r = num(szR), d = num(szD), L = +szL.value;
    $("szLv").textContent = L + " 倍";
    const ok = c > 0 && r > 0 && r <= 100 && d > 0;
    const pos = ok ? c * r / d : NaN, m = pos / L, x = ok ? c * r / 100 : NaN;
    tween($("szP"), pos); tween($("szM"), m); tween($("szX"), x);
    $("szBm").style.width = ok ? Math.min(100, m / c * 100) + "%" : "0";
    $("szBx").style.width = ok ? Math.min(100, x / c * 100) + "%" : "0";
    $("szW").textContent = !ok ? "請輸入本金、虧損 %（1～100）和止損距離。" : m > c ? "保證金超過本金了：止損放太近，或這筆風險設太大。" : "";
  }
  [szC, szR, szD, szL].forEach(i => i.addEventListener("input", calcSize));
  calcSize();

  // ---------- 畫 K 線（紙上的藍白 K） ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  function chartSVG(ks, marks = [], hl = []) {
    const Wd = 340, Ht = 200, padL = 10, padR = 58, padT = 14, padB = 14;
    let lo = Math.min(...ks.map(k => k.l)), hi = Math.max(...ks.map(k => k.h));
    marks.forEach(m => { lo = Math.min(lo, m.y); hi = Math.max(hi, m.y); });
    const span = hi - lo || 1; lo -= span * 0.06; hi += span * 0.06;
    const dx = (Wd - padL - padR) / ks.length, bw = Math.max(4, dx * 0.56);
    const X = i => padL + (i + 0.5) * dx, Y = v => padT + (hi - v) / (hi - lo) * (Ht - padT - padB);
    let s = `<svg viewBox="0 0 ${Wd} ${Ht}" xmlns="http://www.w3.org/2000/svg">`;
    ks.forEach((k, i) => {
      const up = k.c >= k.o, y0 = Y(Math.max(k.o, k.c)), y1 = Y(Math.min(k.o, k.c)), h = Math.max(1.4, y1 - y0);
      const col = up ? "#6D98D4" : "#24221F";
      s += `<g class="k" style="animation-delay:${(i * (reduce ? 0 : 0.07)).toFixed(2)}s"><line x1="${X(i)}" x2="${X(i)}" y1="${Y(k.h)}" y2="${Y(k.l)}" stroke="${col}" stroke-width="1.4"/><rect x="${X(i) - bw / 2}" y="${y0}" width="${bw}" height="${h}" rx="1" fill="${up ? "#6D98D4" : "#fffdf8"}" stroke="${col}" stroke-width="1.3"/></g>`;
    });
    marks.forEach(m => {
      const y = Y(m.y), x0 = m.from != null ? X(m.from) - dx / 2 : padL;
      s += `<g class="${m.always ? "" : "mark"}"><line x1="${x0}" x2="${Wd - padR + 4}" y1="${y}" y2="${y}" stroke="${m.col}" stroke-width="1.4" stroke-dasharray="5 4"/><text class="lbl" x="${Wd - padR + 8}" y="${y + 4}" fill="${m.col}">${m.t}</text></g>`;
    });
    hl.forEach(h => { s += `<circle class="mark" cx="${X(h.i)}" cy="${Y(h.y)}" r="${Math.max(9, dx * 0.9)}" fill="none" stroke="${h.col}" stroke-width="2"/>`; });
    return s + "</svg>";
  }
  const K = (o, c, h, l) => ({ o, c, h: Math.max(h, o, c), l: Math.min(l, o, c) });

  // ---------- 結構小測驗：極陽、平衡、極陰（照他的定義產生示意 K 線） ----------
  function genYang(n, start = 100) {
    const ks = []; let pc = start, ph = start, pl = start - 2;
    for (let i = 0; i < n; i++) {
      const o = pc + rnd(-0.3, 0.4), c = o + rnd(0.8, 2.6) * (Math.random() < 0.15 ? -0.3 : 1);
      const h = Math.max(o, c, ph + rnd(0.3, 1.2)) + rnd(0.1, 0.5), l = Math.max(Math.min(o, c) - rnd(0.2, 0.8), pl + rnd(0.15, 0.6));
      ks.push(K(o, c, h, l)); pc = c; ph = ks[i].h; pl = ks[i].l;
    }
    return ks;
  }
  function genYin(n, start = 120) {
    return genYang(n, 100).map(k => ({ o: 220 - k.o, c: 220 - k.c, h: 220 - k.l, l: 220 - k.h }));
  }
  function genBal() {
    const ks = genYang(7), top = ks[ks.length - 1], brk = top.l - rnd(0.6, 1.6);
    const floor = brk - rnd(0.5, 1.5);
    ks.push(K(top.c, brk + rnd(0.2, 0.6), top.c + 0.2, brk));
    for (let i = 0; i < 5; i++) {
      const p = ks[ks.length - 1].c, c = Math.min(top.h - 0.6, Math.max(floor + 0.4, p + rnd(-1.6, 1.6)));
      ks.push(K(p, c, Math.min(top.h - 0.3, Math.max(p, c) + rnd(0.2, 0.7)), Math.max(floor, Math.min(p, c) - rnd(0.2, 0.7))));
    }
    return { ks, line: top.l, topI: 6 };
  }
  const DEF = {
    yang: { t: "極陽", d: "每根 K 都突破前一根高點，低點從來沒被跌破。" },
    bal: { t: "平衡", d: "最高那根 K 的低點第一次被跌破，之後在區間裡回撤盤整。" },
    yin: { t: "極陰", d: "空方完全主導。這段每一根都跌破前一根的低點，反彈也沒突破前一根的高點。" }
  };
  const qz = { right: 0, total: 0, ans: "", lock: false };
  function newQuiz() {
    const types = ["yang", "bal", "yin"], t = types[Math.floor(Math.random() * 3)];
    qz.ans = t; qz.lock = false;
    let svg;
    if (t === "bal") { const b = genBal(); svg = chartSVG(b.ks, [{ y: b.line, t: "最高那根的低點", col: "#A3362B", from: b.topI }]); }
    else svg = chartSVG(t === "yang" ? genYang(12) : genYin(12));
    const ch = $("qzChart"); ch.classList.remove("show"); ch.innerHTML = svg;
    $("qzOut").hidden = true;
    document.querySelectorAll("#qzBtns button").forEach(b => { b.disabled = false; b.className = ""; });
  }
  document.querySelectorAll("#qzBtns button").forEach(b => b.addEventListener("click", () => {
    if (qz.lock) return;
    qz.lock = true; qz.total++;
    const ok = b.dataset.a === qz.ans;
    if (ok) qz.right++;
    document.querySelectorAll("#qzBtns button").forEach(x => { x.disabled = true; if (x === b) x.classList.add("pick"); if (x.dataset.a === qz.ans && !ok) x.classList.add("right"); });
    $("qzChart").classList.add("show");
    const st = $("qzStamp"); st.textContent = ok ? "答對" : "再想想"; st.classList.toggle("no", !ok); st.classList.remove("hit"); void st.offsetWidth; st.classList.add("hit");
    $("qzTitle").textContent = (ok ? "" : "答案是") + DEF[qz.ans].t;
    $("qzWhy").textContent = DEF[qz.ans].d;
    $("qzOut").hidden = false;
    $("qzScore").textContent = `${qz.right} / ${qz.total}`;
  }));
  $("qzNext").addEventListener("click", newQuiz);
  newQuiz();

  // ---------- 假突破練習：突破頂之後，有沒有跌破結構的底 ----------
  function genFake() {
    const ks = genYang(4, 100);
    let p = ks[3].c;
    const c1 = K(p, p + rnd(1, 1.8), p + rnd(1.9, 2.4), p - 0.4); ks.push(c1);                         // 頂分型 1
    const c2 = K(c1.c, c1.c + rnd(0.6, 1.2), c1.h + rnd(0.8, 1.4), c1.c - rnd(0.2, 0.5)); ks.push(c2);  // 2：突破前高，這根的高點就是頂
    const top = c2.h;
    const c3 = K(c2.c, c2.l - rnd(0.6, 1.2), c2.c + 0.2, c2.l - rnd(1.3, 1.9)); ks.push(c3);            // 3：跌破第 2 根低點，頂出現
    let c = c3.c;
    for (let i = 0; i < 3; i++) { const n = c - rnd(-0.4, 1.4); ks.push(K(c, n, Math.max(c, n) + rnd(0.2, 0.6), Math.min(c, n) - rnd(0.2, 0.7))); c = n; }   // 回撤
    const bottomI = ks.reduce((bi, k, i) => i > 5 && k.l < ks[bi].l ? i : bi, 6), bottom = ks[bottomI].l;
    for (let i = 0; i < 2; i++) { const n = c + rnd(0.8, 1.8); ks.push(K(c, Math.min(n, top - 0.3), Math.min(top - 0.2, Math.max(c, n) + 0.3), Math.max(bottom + 0.3, Math.min(c, n) - 0.4))); c = Math.min(n, top - 0.3); }
    const wickOnly = Math.random() < 0.5;
    const br = K(c, wickOnly ? top - rnd(0.1, 0.5) : top + rnd(0.4, 1.2), top + rnd(0.15, 1.6), c - 0.3); ks.push(br);   // 突破（影線碰到就算）
    const brI = ks.length - 1;
    const fake = Math.random() < 0.5, tricky = Math.random() < 0.5;
    c = br.c;
    let hit = -1;
    if (fake) {
      const steps = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < steps; i++) {
        const last = i === steps - 1, target = last ? (tricky ? bottom + rnd(0.2, 0.6) : bottom - rnd(0.4, 1.2)) : c - (c - bottom) * rnd(0.3, 0.5);
        const lo = last ? bottom - rnd(0.25, 0.8) : Math.min(c, target) - rnd(0.2, 0.5);
        ks.push(K(c, target, Math.max(c, target) + rnd(0.2, 0.5), lo)); c = target;
        if (last) hit = ks.length - 1;
      }
    } else {
      const dip = bottom + (top - bottom) * (tricky ? rnd(0.06, 0.18) : rnd(0.35, 0.6));
      ks.push(K(c, c - (c - dip) * 0.6, c + 0.4, c - (c - dip) * 0.7)); c = ks[ks.length - 1].c;
      ks.push(K(c, dip + rnd(0.3, 0.7), c + 0.3, dip)); c = ks[ks.length - 1].c;
      for (let i = 0; i < 2; i++) { const n = c + rnd(1, 2); ks.push(K(c, n, n + rnd(0.2, 0.6), c - rnd(0.2, 0.5))); c = n; }
    }
    const postLow = Math.min(...ks.slice(brI + 1).map(k => k.l));
    return { ks, top, bottom, bottomI, brI, fake, hit, wickOnly, postLow, tricky };
  }
  const fk = { right: 0, total: 0, cur: null, lock: false };
  function newFake() {
    const f = fk.cur = genFake(); fk.lock = false;
    const marks = [{ y: f.top, t: "頂", col: "#24221F", from: 3, always: true }, { y: f.bottom, t: "結構的底", col: "#A3362B", from: f.bottomI, always: true }];
    const hl = [{ i: f.brI, y: f.ks[f.brI].h, col: "#b0842f" }];
    if (f.fake) hl.push({ i: f.hit, y: f.ks[f.hit].l, col: "#A3362B" });
    const ch = $("fkChart"); ch.classList.remove("show"); ch.innerHTML = chartSVG(f.ks, marks, hl);
    $("fkOut").hidden = true;
    document.querySelectorAll("#fkBtns button").forEach(b => { b.disabled = false; b.className = ""; });
  }
  document.querySelectorAll("#fkBtns button").forEach(b => b.addEventListener("click", () => {
    if (fk.lock) return;
    fk.lock = true; fk.total++;
    const f = fk.cur, ans = f.fake ? "fake" : "ok", ok = b.dataset.a === ans;
    if (ok) fk.right++;
    document.querySelectorAll("#fkBtns button").forEach(x => { x.disabled = true; if (x === b) x.classList.add("pick"); if (x.dataset.a === ans && !ok) x.classList.add("right"); });
    $("fkChart").classList.add("show");
    const st = $("fkStamp"); st.textContent = ok ? "答對" : "再想想"; st.classList.toggle("no", !ok); st.classList.remove("hit"); void st.offsetWidth; st.classList.add("hit");
    $("fkTitle").textContent = f.fake ? "假突破" : "突破成立";
    const brNote = f.wickOnly ? "金圈那根只有影線碰到頂，影線碰到就算突破。" : "金圈那根突破了頂。";
    $("fkWhy").textContent = f.fake
      ? `${brNote}之後紅圈那根${f.tricky ? "只有下影線" : ""}跌破了結構的底，突破後又跌破結構的底，就是假突破。${f.tricky ? "收盤收回來也一樣，影線碰到就算。" : ""}`
      : `${brNote}之後回落最低到 ${fmt(f.postLow)}，結構的底在 ${fmt(f.bottom)}，${f.tricky ? "很接近但" : ""}沒有跌破。守住結構底，突破成立。`;
    $("fkOut").hidden = false;
    $("fkScore").textContent = `${fk.right} / ${fk.total}`;
  }));
  $("fkNext").addEventListener("click", newFake);
  newFake();
})();
