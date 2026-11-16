// 加 LINE 官方／LINE 社群的按鈕（有 data-key="lineoa" 或 data-key="line" 的連結都走這裡），點下去要直接跳到 LINE 的加好友畫面
// lin.ee 會先轉到 LINE 的「Open LINE」過渡頁，靠 line:// 叫醒 App；Threads、IG、FB 的內建瀏覽器會擋掉，過渡頁又自己退回上一頁，看起來就是點了沒反應。
// 所以每種地方各用一條能走通的路，而且都要在手指點下去的那一刻發出去（晚一點發會被擋）：
//   LINE App 裡、手機 Safari／Chrome → 直接開 https://line.me/R/... 加好友網址（同一個視窗，系統才會交給 LINE）
//   iPhone 的 Threads → barcelona://extbrowser/?url=加好友網址（Threads 自己的「用外部開啟」，系統直接交給 LINE）
//   iPhone 的 IG       → instagram://extbrowser/?url=加好友網址（IG 會問一次要不要離開）
//   iPhone 的 FB、Messenger、其他 App → x-safari-https://加好友網址（轉到 Safari，再由 Safari 交給 LINE）
//   Android 的任何 App 內建瀏覽器 → intent://...;package=LINE（直接叫 LINE App，沒裝的話開網頁）
//   電腦 → 直接跳 QR 面板
// 點完 1.8 秒還留在這頁（代表沒跳走），下面會冒出「沒有跳到 LINE？」，點了是 QR、複製 ID、用瀏覽器開的面板。
(() => {
  const ROOT = (document.body && document.body.dataset.root) || "";
  const ITEMS = {
    lineoa: { name: "LINE 官方", url: "https://line.me/R/ti/p/@963zmrfw", path: "ti/p/@963zmrfw", id: "@963zmrfw", qr: "media/qr-lineoa.svg" },
    line: { name: "LINE 社群", url: "https://line.me/ti/g2/FXj0yahd04U4JecSoC4uPInXiqhLulqdCl54Ag", path: "ti/g2/FXj0yahd04U4JecSoC4uPInXiqhLulqdCl54Ag", qr: "media/qr-line.svg" }
  };
  window.SN_LINE = ITEMS;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const mobile = ios || android;
  const inLine = /\bLine\//i.test(ua);
  const inThreads = !inLine && /Barcelona/i.test(ua);
  const inIG = !inLine && !inThreads && /Instagram/i.test(ua);
  const inOtherApp = !inLine && (inThreads || inIG || /FBAN|FBAV|FB_IAB|FBIOS|Messenger|TikTok|musical_ly|BytedanceWebview|Twitter|MicroMessenger|Snapchat|Pinterest|; wv\)/i.test(ua));
  const enc = encodeURIComponent;

  // 這次要走哪一條路
  function route(it) {
    if (!mobile) return "";
    if (inLine || !inOtherApp) return it.url;
    if (android) return `intent://${it.path}#Intent;scheme=line;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=jp.naver.line.android;S.browser_fallback_url=${enc(it.url)};end`;
    if (inThreads) return "barcelona://extbrowser/?url=" + enc(it.url);
    if (inIG) return "instagram://extbrowser/?url=" + enc(it.url);
    return "x-safari-" + it.url;
  }

  // 先把所有按鈕的網址換成直接的加好友網址，拿掉開新視窗（長按複製到的也是對的網址）
  const fix = () => document.querySelectorAll("a[data-key='lineoa'], a[data-key='line']").forEach(a => {
    a.href = ITEMS[a.dataset.key].url; a.removeAttribute("target");
  });
  fix(); document.addEventListener("DOMContentLoaded", fix);

  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[data-key='lineoa'], a[data-key='line']");
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    go(a.dataset.key);
  }, true);

  function go(key) {
    const it = ITEMS[key], u = route(it);
    window.__lineLast = u;
    if (!u) { open(key); return; }
    if (u.startsWith("x-safari-")) { if (!window.open(u, "_blank")) location.href = u; }
    else location.href = u;
    watch(key);
  }

  // 有跳走的話頁面會被藏起來或離開；1.8 秒後還看得到這頁，就給備援
  let left = false, watchT;
  const gone = () => { left = true; };
  document.addEventListener("visibilitychange", () => { if (document.hidden) gone(); });
  addEventListener("pagehide", gone); addEventListener("blur", gone);
  function watch(key) {
    left = false; clearTimeout(watchT);
    watchT = setTimeout(() => { if (!left && !document.hidden) hint(key); }, 1800);
  }

  let sheet, bar, barT;
  function hint(key) {
    if (!sheet) build();
    bar.onclick = () => { bar.classList.remove("on"); open(key); };
    bar.classList.add("on");
    clearTimeout(barT); barT = setTimeout(() => bar.classList.remove("on"), 9000);
  }
  function open(key) {
    const it = ITEMS[key];
    if (!sheet) build();
    if (bar) bar.classList.remove("on");
    const how = mobile
      ? `<li>截圖這個 QR code，打開 LINE 的「掃描」，從相簿選這張圖。</li>
         <li>${it.id ? `複製 ID，到 LINE 的「加入好友」搜尋 <b>${it.id}</b>。` : "複製連結，貼到 LINE 任何一個聊天室（自己的 Keep 筆記也可以），再點那個連結。"}</li>
         ${inOtherApp ? "<li>點右上角的 ⋯，選「用瀏覽器開啟」，再按一次加入。</li>" : ""}`
      : `<li>用手機的 LINE 掃這個 QR code。</li>
         <li>${it.id ? `或在 LINE 的「加入好友」搜尋 <b>${it.id}</b>。` : "或把連結傳到手機，在 LINE 裡點開。"}</li>`;
    sheet.querySelector(".lx-title").textContent = "加入 " + it.name;
    sheet.querySelector(".lx-why").textContent = mobile ? "沒有跳到 LINE 的話，用下面任何一個方法加：" : "電腦打不開手機的 LINE，用手機加：";
    sheet.querySelector(".lx-qr img").src = ROOT + it.qr;
    sheet.querySelector(".lx-how").innerHTML = how;
    const cp = sheet.querySelector(".lx-copy");
    cp.textContent = it.id ? "複製 ID " + it.id : "複製社群連結";
    cp.onclick = () => copy(it.id || it.url, cp, it.id ? "ID 已複製" : "連結已複製");
    const tr = sheet.querySelector(".lx-try"); tr.hidden = !mobile; tr.onclick = ev => { ev.preventDefault(); close(); go(key); };
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("on"));
  }
  function close() { sheet.classList.remove("on"); setTimeout(() => { sheet.hidden = true; }, 300); }
  async function copy(text, btn, ok) {
    let done = false;
    try { await navigator.clipboard.writeText(text); done = true; } catch (e) {
      const t = document.createElement("textarea"); t.value = text; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select();
      try { done = document.execCommand("copy"); } catch (e2) {} t.remove();
    }
    const old = btn.textContent; btn.textContent = done ? ok : text; btn.classList.add("ok");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("ok"); }, 1800);
  }
  function build() {
    const st = document.createElement("style");
    st.textContent = `
.lx { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: flex-end; justify-content: center; background: rgba(8, 10, 14, 0); transition: background .3s; font-family: "Noto Sans TC", system-ui, sans-serif; }
.lx[hidden] { display: none; }
.lx.on { background: rgba(8, 10, 14, .55); }
.lx-box { position: relative; width: min(420px, 100%); max-height: 92svh; overflow: auto; padding: 22px 20px calc(18px + env(safe-area-inset-bottom)); border-radius: 22px 22px 0 0; background: #15171c; color: #efe7d6; box-shadow: 0 -10px 40px rgba(0, 0, 0, .4); transform: translateY(100%); transition: transform .32s cubic-bezier(.2, .9, .3, 1); }
.lx.on .lx-box { transform: none; }
@media (min-width: 600px) { .lx { align-items: center; } .lx-box { border-radius: 22px; } }
.lx-x { position: absolute; right: 12px; top: 12px; width: 34px; height: 34px; border: 0; border-radius: 50%; background: rgba(255, 255, 255, .08); color: #efe7d6; font-size: 18px; line-height: 34px; cursor: pointer; }
.lx .lx-title { margin: 0; font: 700 20px/1.3 "Noto Serif TC", serif; letter-spacing: .5px; color: #f5efe2 !important; }
.lx .lx-why { margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: #b9b2a3 !important; }
.lx-qr { display: block; width: 180px; margin: 16px auto 0; padding: 10px; border-radius: 16px; background: #fff; box-shadow: 0 0 0 1px rgba(224, 190, 116, .5), 0 10px 26px rgba(0, 0, 0, .35); }
.lx-qr img { display: block; width: 100%; height: auto; image-rendering: pixelated; }
.lx .lx-how { margin: 16px 0 0; padding-left: 20px; font-size: 14.5px; line-height: 1.7; color: #d9d2c2 !important; }
.lx .lx-how li { color: #d9d2c2 !important; font-size: 14.5px; line-height: 1.7; }
.lx .lx-how li + li { margin-top: 6px; }
.lx .lx-how b { color: #fff !important; letter-spacing: .5px; white-space: nowrap; }
.lx-copy, .lx-try { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; margin-top: 12px; border-radius: 14px; font: 500 16px/1 "Noto Sans TC", sans-serif; letter-spacing: .5px; text-decoration: none; cursor: pointer; }
.lx-copy { margin-top: 16px; border: 0; background: linear-gradient(180deg, #2bd96b, #06b847); color: #fff; box-shadow: 0 6px 18px rgba(6, 184, 71, .3); }
.lx-copy.ok { background: #e9e2d0; color: #15171c; box-shadow: none; }
.lx-try { border: 1px solid rgba(255, 255, 255, .16); color: #cfc8b8; font-size: 14px; height: 42px; }
.lx-try[hidden] { display: none; }
.lx-bar { position: fixed; left: 50%; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 9998; display: flex; align-items: center; gap: 8px; padding: 12px 18px; border: 0; border-radius: 99px; background: #15171c; color: #efe7d6; font: 500 15px/1 "Noto Sans TC", sans-serif; letter-spacing: .5px; white-space: nowrap; box-shadow: 0 0 0 1px rgba(6, 199, 85, .55), 0 10px 30px rgba(0, 0, 0, .45); transform: translate(-50%, 140%); opacity: 0; transition: transform .35s cubic-bezier(.2, .9, .3, 1), opacity .25s; cursor: pointer; }
.lx-bar.on { transform: translate(-50%, 0); opacity: 1; }
.lx-bar b { color: #2bd96b; font-weight: 500; }`;
    document.head.appendChild(st);
    sheet = document.createElement("div");
    sheet.className = "lx"; sheet.hidden = true;
    sheet.innerHTML = `<div class="lx-box" role="dialog" aria-modal="true">
      <button class="lx-x" type="button" aria-label="關閉">✕</button>
      <p class="lx-title"></p><p class="lx-why"></p>
      <span class="lx-qr"><img alt="QR code"></span>
      <ol class="lx-how"></ol>
      <button class="lx-copy" type="button"></button>
      <a class="lx-try" href="#">還是試試直接開 LINE</a>
    </div>`;
    document.body.appendChild(sheet);
    bar = document.createElement("button");
    bar.type = "button"; bar.className = "lx-bar";
    bar.innerHTML = "沒有跳到 LINE？<b>換個方式加入 ›</b>";
    document.body.appendChild(bar);
    sheet.addEventListener("click", e => { if (e.target === sheet || e.target.closest(".lx-x")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) close(); });
  }
})();
