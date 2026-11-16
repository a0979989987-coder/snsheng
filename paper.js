// 分頁共用：頁首頁尾、光筆簽名、捲到才浮出來、金粉、卡片跟著手指傾斜、數字會跳
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body, ROOT = body.dataset.root || "../", CUR = body.dataset.page || "";
  // 網址都在這裡改；空字串＝還沒開放（按鈕先藏起來）
  const LINKS = {
    lineoa: "https://line.me/R/ti/p/@963zmrfw",
    line: "https://line.me/ti/g2/FXj0yahd04U4JecSoC4uPInXiqhLulqdCl54Ag",
    ig: "https://www.instagram.com/btcfly/",
    threads: "https://www.threads.com/@ox.trading.ai",
    yt: "https://www.youtube.com/@snsheng"
  };
  window.SN_LINKS = LINKS;
  const SIG = ["M2.20 22.00C2.57 21.83 3.63 21.50 4.40 21.00C5.17 20.50 5.77 20.00 6.80 19.00C7.83 18.00 9.53 16.17 10.60 15.00C11.67 13.83 12.30 13.17 13.20 12.00C14.10 10.83 15.27 9.17 16.00 8.00C16.73 6.83 17.23 6.00 17.60 5.00C17.97 4.00 18.23 2.67 18.20 2.00C18.17 1.33 17.70 1.17 17.40 1.00C17.10 0.83 16.77 0.83 16.40 1.00C16.03 1.17 15.63 1.50 15.20 2.00C14.77 2.50 14.10 3.33 13.80 4.00C13.50 4.67 13.37 5.33 13.40 6.00C13.43 6.67 13.63 7.33 14.00 8.00C14.37 8.67 14.90 9.33 15.60 10.00C16.30 10.67 17.50 11.33 18.20 12.00C18.90 12.67 19.43 13.33 19.80 14.00C20.17 14.67 20.37 15.33 20.40 16.00C20.43 16.67 20.30 17.33 20.00 18.00C19.70 18.67 19.03 19.50 18.60 20.00C18.17 20.50 18.13 20.67 17.40 21.00C16.67 21.33 15.40 21.83 14.20 22.00C13.00 22.17 11.33 22.17 10.20 22.00C9.07 21.83 8.13 21.50 7.40 21.00C6.67 20.50 6.17 19.67 5.80 19.00C5.43 18.33 5.23 17.67 5.20 17.00C5.17 16.33 5.53 15.33 5.60 15.00", "M23.20 17.00C23.63 16.50 25.00 14.67 25.80 14.00C26.60 13.33 27.50 13.00 28.00 13.00C28.50 13.00 28.70 13.67 28.80 14.00C28.90 14.33 28.93 14.17 28.60 15.00C28.27 15.83 27.37 17.83 26.80 19.00C26.23 20.17 25.47 21.50 25.20 22.00", "M26.80 19.00C27.03 18.67 27.53 17.83 28.20 17.00C28.87 16.17 30.00 14.67 30.80 14.00C31.60 13.33 32.30 13.17 33.00 13.00C33.70 12.83 34.53 12.83 35.00 13.00C35.47 13.17 35.73 13.50 35.80 14.00C35.87 14.50 35.73 15.17 35.40 16.00C35.07 16.83 34.13 18.17 33.80 19.00C33.47 19.83 33.33 20.50 33.40 21.00C33.47 21.50 33.90 21.83 34.20 22.00C34.50 22.17 34.67 22.17 35.20 22.00C35.73 21.83 36.83 21.33 37.40 21.00C37.97 20.67 37.97 20.67 38.60 20.00C39.23 19.33 40.77 17.50 41.20 17.00", "M41.20 17.00C41.63 16.50 43.13 14.83 43.80 14.00C44.47 13.17 45.03 12.00 45.20 12.00C45.37 12.00 44.63 13.17 44.80 14.00C44.97 14.83 45.87 16.17 46.20 17.00C46.53 17.83 46.77 18.33 46.80 19.00C46.83 19.67 46.83 20.50 46.40 21.00C45.97 21.50 44.57 21.83 44.20 22.00", "M40.40 21.00C40.70 21.17 41.23 21.83 42.20 22.00C43.17 22.17 45.17 22.17 46.20 22.00C47.23 21.83 47.83 21.33 48.40 21.00C48.97 20.67 48.97 20.67 49.60 20.00C50.23 19.33 51.77 17.50 52.20 17.00", "M52.20 17.00C52.63 16.50 53.70 15.33 54.80 14.00C55.90 12.67 57.90 10.17 58.80 9.00C59.70 7.83 59.70 7.83 60.20 7.00C60.70 6.17 61.47 4.83 61.80 4.00C62.13 3.17 62.27 2.50 62.20 2.00C62.13 1.50 61.90 1.00 61.40 1.00C60.90 1.00 59.80 1.50 59.20 2.00C58.60 2.50 58.33 3.00 57.80 4.00C57.27 5.00 56.67 6.33 56.00 8.00C55.33 9.67 54.60 11.67 53.80 14.00C53.00 16.33 51.63 20.67 51.20 22.00", "M51.20 22.00C51.47 21.50 52.30 19.83 52.80 19.00C53.30 18.17 53.53 17.83 54.20 17.00C54.87 16.17 56.00 14.67 56.80 14.00C57.60 13.33 58.30 13.17 59.00 13.00C59.70 12.83 60.53 12.83 61.00 13.00C61.47 13.17 61.73 13.50 61.80 14.00C61.87 14.50 61.73 15.17 61.40 16.00C61.07 16.83 60.13 18.17 59.80 19.00C59.47 19.83 59.33 20.50 59.40 21.00C59.47 21.50 59.90 21.83 60.20 22.00C60.50 22.17 60.67 22.17 61.20 22.00C61.73 21.83 62.83 21.33 63.40 21.00C63.97 20.67 63.97 20.67 64.60 20.00C65.23 19.33 66.77 17.50 67.20 17.00", "M67.60 20.00C67.97 19.83 69.23 19.33 69.80 19.00C70.37 18.67 70.57 18.50 71.00 18.00C71.43 17.50 72.10 16.67 72.40 16.00C72.70 15.33 72.87 14.50 72.80 14.00C72.73 13.50 72.30 13.17 72.00 13.00C71.70 12.83 71.53 12.83 71.00 13.00C70.47 13.17 69.40 13.50 68.80 14.00C68.20 14.50 67.73 15.17 67.40 16.00C67.07 16.83 66.80 18.17 66.80 19.00C66.80 19.83 67.00 20.50 67.40 21.00C67.80 21.50 68.57 21.83 69.20 22.00C69.83 22.17 70.50 22.17 71.20 22.00C71.90 21.83 72.83 21.33 73.40 21.00C73.97 20.67 73.97 20.67 74.60 20.00C75.23 19.33 76.77 17.50 77.20 17.00", "M77.20 17.00C77.63 16.50 79.00 14.67 79.80 14.00C80.60 13.33 81.50 13.00 82.00 13.00C82.50 13.00 82.70 13.67 82.80 14.00C82.90 14.33 82.93 14.17 82.60 15.00C82.27 15.83 81.37 17.83 80.80 19.00C80.23 20.17 79.47 21.50 79.20 22.00", "M80.80 19.00C81.03 18.67 81.53 17.83 82.20 17.00C82.87 16.17 84.00 14.67 84.80 14.00C85.60 13.33 86.30 13.17 87.00 13.00C87.70 12.83 88.53 12.83 89.00 13.00C89.47 13.17 89.73 13.50 89.80 14.00C89.87 14.50 89.73 15.17 89.40 16.00C89.07 16.83 88.13 18.17 87.80 19.00C87.47 19.83 87.33 20.50 87.40 21.00C87.47 21.50 87.90 21.83 88.20 22.00C88.50 22.17 88.67 22.17 89.20 22.00C89.73 21.83 90.83 21.33 91.40 21.00C91.97 20.67 91.97 20.67 92.60 20.00C93.23 19.33 94.77 17.50 95.20 17.00", "M104.40 16.00C104.30 15.67 104.20 14.50 103.80 14.00C103.40 13.50 102.63 13.17 102.00 13.00C101.37 12.83 100.70 12.83 100.00 13.00C99.30 13.17 98.37 13.67 97.80 14.00C97.23 14.33 97.03 14.50 96.60 15.00C96.17 15.50 95.50 16.33 95.20 17.00C94.90 17.67 94.77 18.33 94.80 19.00C94.83 19.67 95.00 20.50 95.40 21.00C95.80 21.50 96.57 21.83 97.20 22.00C97.83 22.17 98.50 22.17 99.20 22.00C99.90 21.83 100.83 21.33 101.40 21.00C101.97 20.67 102.40 20.17 102.60 20.00", "M106.00 13.00C105.43 14.17 104.20 17.00 102.60 20.00C101.00 23.00 97.67 28.83 96.40 31.00C95.13 33.17 95.60 32.50 95.00 33.00C94.40 33.50 93.30 34.00 92.80 34.00C92.30 34.00 92.07 33.50 92.00 33.00C91.93 32.50 92.07 31.83 92.40 31.00C92.73 30.17 93.13 29.00 94.00 28.00C94.87 27.00 96.43 25.83 97.60 25.00C98.77 24.17 100.07 23.50 101.00 23.00C101.93 22.50 102.27 22.50 103.20 22.00C104.13 21.50 105.43 20.83 106.60 20.00C107.77 19.17 109.60 17.50 110.20 17.00"];
  const LINE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 3.6c-5 0-9.1 3.3-9.1 7.4 0 3.6 3.2 6.7 7.6 7.3.3.1.7.2.8.5.1.2.1.6 0 .9l-.1.8c0 .2-.2.9.8.5s5.4-3.2 7.4-5.4c1.4-1.5 2-3 2-4.6 0-4.1-4.1-7.4-9.4-7.4Z"/><g fill="none" stroke="#06C755" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 9.2v3.5h2"/><path d="M10.1 9.2v3.5"/><path d="M11.7 12.7V9.2l2.6 3.5V9.2"/><path d="M17.6 9.2h-1.9v3.5h1.9M15.7 10.95h1.8"/></g></svg>';

  // ---------- 頁首、頁尾 ----------
  if (!body.dataset.noChrome) {
    const top = document.createElement("header");
    top.className = "top";
    top.innerHTML = `<a class="brand" href="${ROOT}" aria-label="回首頁"><img src="${ROOT}avatar.jpg" alt=""><svg class="sig" viewBox="0 -1 114 37"></svg></a>
      <nav class="tabs"><a href="${ROOT}learn/" class="${CUR === "learn" ? "cur" : ""}">教學</a><a href="${ROOT}tools/" class="${CUR === "tools" ? "cur" : ""}">小工具</a></nav>`;
    body.insertBefore(top, body.firstChild);
    const end = document.createElement("footer");
    end.className = "end";
    end.innerHTML = `<div class="talk" data-reveal>
        <h3>看不懂、卡住了，直接來問</h3>
        <p>交易的問題、影片裡沒講清楚的地方，在 LINE 社群問，大家一起討論。</p>
        <div class="btns">
          <a class="btn btn-line" data-key="lineoa" href="#">${LINE_ICON}加入 LINE 官方</a>
          <a class="btn btn-line" data-key="line" href="#">${LINE_ICON}加入 LINE 社群</a>
        </div>
      </div>
      ${CUR === "join" ? "" : `<a class="member" href="${ROOT}join/" data-reveal><span class="chip"></span><b>註冊成為 Snsheng 會員</b><small>›</small></a>`}
      <p class="legal">內容是交易觀念的分享，不是投資建議，也不保證獲利。<br>© 2026 Snsheng ・ <a href="${ROOT}">回首頁</a></p>`;
    body.appendChild(end);
  }
  document.querySelectorAll("[data-key]").forEach(a => {
    const u = LINKS[a.dataset.key];
    if (u) { a.href = u; a.target = "_blank"; a.rel = "noopener"; } else a.style.display = "none";
  });
  // 背景：紙紋、墨暈、金粉
  for (const c of ["grain", "wash"]) { const d = document.createElement("div"); d.className = c; d.setAttribute("aria-hidden", "true"); body.insertBefore(d, body.firstChild); }

  // ---------- 光筆簽名 ----------
  function writeSig(svg, dur = 1400, delay = 300) {
    svg.innerHTML = SIG.map(d => `<path d="${d}"/>`).join("") + '<circle class="pen" r="1.8" cx="-20" cy="-20"/>';
    const paths = [...svg.querySelectorAll("path")], lens = paths.map(p => p.getTotalLength()), total = lens.reduce((a, b) => a + b, 0), pen = svg.querySelector(".pen");
    paths.forEach((p, i) => { p.style.strokeDasharray = `${lens[i]} ${lens[i]}`; p.style.strokeDashoffset = reduce ? 0 : lens[i]; });
    if (reduce) return;
    const t0 = performance.now() + delay;
    const step = now => {
      const d = Math.max(0, Math.min(1, (now - t0) / dur)) * total;
      let rest = d, head = null;
      paths.forEach((p, i) => { const L = lens[i], v = Math.max(0, Math.min(L, rest)); p.style.strokeDashoffset = (L - v).toFixed(2); if (rest > 0 && rest < L) head = p.getPointAtLength(v); rest -= L; });
      if (head) { pen.setAttribute("cx", head.x); pen.setAttribute("cy", head.y); pen.style.opacity = 1; } else pen.style.opacity = 0;
      if (d < total) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  window.SN_writeSig = writeSig;
  document.querySelectorAll(".sig").forEach(s => writeSig(s));

  // ---------- 捲到才浮出來（標題的墨線、印章、數字也在這時候動） ----------
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add("in");
    el.querySelectorAll(".stamp").forEach(s => s.classList.add("hit"));
    if (el.classList.contains("stamp")) el.classList.add("hit");
    el.querySelectorAll("[data-count]").forEach(countUp);
    if (el.dataset.count) countUp(el);
    io.unobserve(el);
  }), { rootMargin: "0px 0px -8% 0px" });
  const watch = root => root.querySelectorAll("[data-reveal], .inku").forEach(el => io.observe(el));
  watch(document);
  window.SN_watch = watch;
  function countUp(el) {
    const to = parseFloat(el.dataset.count), dec = (el.dataset.count.split(".")[1] || "").length;
    if (reduce || isNaN(to)) { el.textContent = el.dataset.count; return; }
    const t0 = performance.now();
    const step = now => { const u = Math.min(1, (now - t0) / 1300), v = to * (1 - Math.pow(1 - u, 3)); el.textContent = v.toFixed(dec); if (u < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // ---------- 卡片跟著手指傾斜、反光掃過 ----------
  function tilt(el) {
    const on = e => {
      if (reduce) return;
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform .12s"; el.style.transform = `perspective(700px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
      el.style.setProperty("--gl", "1"); el.style.setProperty("--gx", (50 - x * 120).toFixed(1) + "%");
    };
    const off = () => { el.style.transition = "transform .7s cubic-bezier(.2, 1.4, .4, 1)"; el.style.transform = ""; el.style.setProperty("--gl", "0"); };
    el.addEventListener("pointermove", on); el.addEventListener("pointerdown", on);
    el.addEventListener("pointerleave", off); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off);
  }
  document.querySelectorAll(".tilt").forEach(tilt);
  window.SN_tilt = tilt;

  // ---------- 金粉：慢慢往上飄，手指劃過會被推開，點一下噴一小把 ----------
  if (!reduce) {
    const cv = document.createElement("canvas");
    cv.id = "dust"; cv.setAttribute("aria-hidden", "true");
    body.insertBefore(cv, body.firstChild);
    const g = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit(); addEventListener("resize", fit);
    const P = [];
    const add = (x, y, vx, vy, life, r) => P.push({ x, y, vx, vy, life, max: life, r, tw: Math.random() * 6.28 });
    for (let i = 0; i < 46; i++) add(Math.random() * W, Math.random() * H, (Math.random() - 0.5) * 0.15, -0.1 - Math.random() * 0.25, 1e9, 0.6 + Math.random() * 1.6);
    const ptr = { x: -999, y: -999, at: 0 };
    addEventListener("pointermove", e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.at = performance.now(); }, { passive: true });
    addEventListener("pointerdown", e => {
      if (e.target.closest("a, button, input, select, label")) return;
      for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, v = 0.8 + Math.random() * 2.2; add(e.clientX, e.clientY, Math.cos(a) * v, Math.sin(a) * v, 50 + Math.random() * 30, 0.8 + Math.random() * 1.4); }
    }, { passive: true });
    let lastY = scrollY;
    const loop = now => {
      const dy = scrollY - lastY; lastY = scrollY;
      g.clearRect(0, 0, W, H);
      const near = now - ptr.at < 800;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        if (near) { const dx = p.x - ptr.x, dyp = p.y - ptr.y, d = Math.hypot(dx, dyp); if (d < 90 && d > 0.1) { const f = (1 - d / 90) * 0.6; p.vx += dx / d * f; p.vy += dyp / d * f; } }
        p.x += p.vx; p.y += p.vy - dy * 0.15;
        if (p.max < 1e8) { p.vx *= 0.94; p.vy *= 0.94; p.life--; if (p.life <= 0) { P.splice(i, 1); continue; } }
        else { p.vx = p.vx * 0.96 + (Math.random() - 0.5) * 0.02; p.vy = p.vy * 0.96 + (-0.18 - p.r * 0.03) * 0.04; if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; } if (p.y > H + 12) p.y = -8; if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10; }
        const a = (p.max < 1e8 ? p.life / p.max : 0.45 + 0.35 * Math.sin(now / 700 + p.tw));
        g.fillStyle = `rgba(184, 138, 53, ${(a * 0.75).toFixed(3)})`;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();

// LINE 按鈕：App 內建瀏覽器和電腦改跳 QR 面板（lineadd.js）
(() => { const s = document.createElement("script"); s.src = (document.body.dataset.root || "../") + "lineadd.js"; document.body.appendChild(s); })();
