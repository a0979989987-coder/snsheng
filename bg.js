// 背景：深藍底上一張慢慢往左走的 K 線，加均線、極光和浮點。
(function () {
  function rng(seed) {
    let s = seed >>> 0;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }

  window.startBg = function (canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    const still = !!opts.still || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = rng(opts.seed || 20051);

    const STEP = 16, BODY = 9, SPEED = 9;      // 每根間距、實體寬、每秒往左幾 px
    const UP = "45, 212, 191", DOWN = "244, 63, 120";
    let W = 0, H = 0, dpr = 1;
    let candles = [], p = 0.5, ema = null, scroll = 0, base = 0, n = 0;
    const dots = [];

    function next() {
      const o = p;
      // 大波段＋小波段，看起來像真的有漲有跌
      n++;
      const target = 0.5 + 0.30 * Math.sin(n * 0.045) + 0.12 * Math.sin(n * 0.13 + 1.7);
      p += (target - p) * 0.12 + (rand() - 0.5) * 0.075;
      p = Math.min(0.95, Math.max(0.05, p));
      const c = p;
      ema = ema == null ? c : ema + (c - ema) * 0.18;
      candles.push({
        o, c, ema,
        hi: Math.max(o, c) + rand() * 0.035,
        lo: Math.min(o, c) - rand() * 0.035
      });
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const need = Math.ceil(W / STEP) + 3;
      while (candles.length < need) next();
      if (!dots.length) {
        for (let i = 0; i < 46; i++) {
          dots.push({ x: rand(), y: rand(), r: 0.5 + rand() * 1.3, v: 0.004 + rand() * 0.012, ph: rand() * 6.28 });
        }
      }
    }

    function glow(x, y, r, rgb, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb}, ${a})`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);

      const top = H * 0.44, bot = H * 0.88;
      const Y = v => top + (1 - v) * (bot - top);
      const X = i => i * STEP - scroll - STEP;

      // 圖表格線：橫線固定，直線跟著 K 線走
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(241, 234, 220, 0.045)";
      ctx.beginPath();
      for (let y = top - 64; y < bot + 64; y += 64) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
      for (let i = 0; i < candles.length; i++) {
        if ((base + i) % 6 === 0) { const x = Math.round(X(i) + BODY / 2) + 0.5; ctx.moveTo(x, top - 64); ctx.lineTo(x, bot + 64); }
      }
      ctx.stroke();

      // 均線下的金色光區
      ctx.beginPath();
      candles.forEach((k, i) => { const x = X(i) + BODY / 2, y = Y(k.ema); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.lineTo(X(candles.length - 1) + BODY / 2, bot + 40);
      ctx.lineTo(X(0) + BODY / 2, bot + 40);
      ctx.closePath();
      const area = ctx.createLinearGradient(0, top, 0, bot + 40);
      area.addColorStop(0, "rgba(255, 205, 80, 0.10)");
      area.addColorStop(1, "rgba(255, 205, 80, 0)");
      ctx.fillStyle = area;
      ctx.fill();

      // K 棒
      candles.forEach((k, i) => {
        const x = X(i), rgb = k.c >= k.o ? UP : DOWN;
        const cx = Math.round(x + BODY / 2) + 0.5;
        ctx.strokeStyle = `rgba(${rgb}, 0.40)`;
        ctx.beginPath(); ctx.moveTo(cx, Y(k.hi)); ctx.lineTo(cx, Y(k.lo)); ctx.stroke();
        const y1 = Y(Math.max(k.o, k.c)), h = Math.max(1.5, Y(Math.min(k.o, k.c)) - y1);
        ctx.fillStyle = `rgba(${rgb}, 0.28)`;
        ctx.fillRect(x, y1, BODY, h);
        ctx.strokeStyle = `rgba(${rgb}, 0.50)`;
        ctx.strokeRect(x + 0.5, y1 + 0.5, BODY - 1, h - 1);
      });

      // 均線
      ctx.save();
      ctx.shadowColor = "rgba(255, 210, 90, 0.6)";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "rgba(255, 226, 150, 0.45)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      candles.forEach((k, i) => { const x = X(i) + BODY / 2, y = Y(k.ema); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.restore();

      // 上下淡出，頭像那一塊保持乾淨
      const fade = ctx.createLinearGradient(0, 0, 0, H);
      fade.addColorStop(0, "rgba(8, 16, 26, 0.92)");
      fade.addColorStop(0.36, "rgba(8, 16, 26, 0.55)");
      fade.addColorStop(0.50, "rgba(8, 16, 26, 0)");
      fade.addColorStop(0.86, "rgba(8, 16, 26, 0)");
      fade.addColorStop(1, "rgba(8, 16, 26, 0.85)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, W, H);

      // 極光
      const R = Math.max(W, H);
      ctx.globalCompositeOperation = "screen";
      glow(W * (0.15 + 0.08 * Math.sin(t * 0.05)), H * (0.08 + 0.05 * Math.cos(t * 0.04)), R * 0.62, "52, 110, 170", 0.42);
      glow(W * (0.92 + 0.05 * Math.sin(t * 0.03 + 1)), H * (0.70 + 0.06 * Math.cos(t * 0.05)), R * 0.50, "30, 170, 160", 0.16);
      glow(W * (0.08 + 0.06 * Math.cos(t * 0.04)), H * (0.98 + 0.03 * Math.sin(t * 0.06)), R * 0.45, "190, 60, 130", 0.12);
      glow(W * 0.5, H * 0.04, R * 0.32, "255, 200, 70", 0.10);

      // 浮點
      ctx.globalCompositeOperation = "source-over";
      dots.forEach(d => {
        const y = ((d.y - d.v * t) % 1 + 1) % 1;
        const x = d.x + 0.01 * Math.sin(t * 0.3 + d.ph);
        const a = 0.12 + 0.33 * (0.5 + 0.5 * Math.sin(t * 1.3 + d.ph));
        ctx.fillStyle = `rgba(241, 234, 220, ${a})`;
        ctx.beginPath(); ctx.arc(x * W, y * H, d.r, 0, 6.283); ctx.fill();
      });

      // 四角壓暗
      const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, R * 0.85);
      v.addColorStop(0, "rgba(0, 0, 0, 0)");
      v.addColorStop(1, "rgba(0, 0, 0, 0.45)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }

    resize();
    window.addEventListener("resize", () => { resize(); if (still) draw(0); });

    if (still) { draw(0); return; }

    let last = performance.now(), t = 0, acc = 0;
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc >= 1 / 30) {           // 30 張一秒就夠，省電
        t += acc;
        scroll += SPEED * acc;
        while (scroll >= STEP) { scroll -= STEP; candles.shift(); base++; next(); }
        acc = 0;
        draw(t);
      }
      requestAnimationFrame(frame);
    }
    draw(0);
    requestAnimationFrame(frame);
  };
})();
