// 加 LINE 官方／LINE 社群的按鈕（有 data-key="lineoa" 或 data-key="line" 的連結都走這裡）
// LINE App 裡、手機的 Safari／Chrome：直接開 LINE 的加好友網址（同一個視窗，LINE 才接得到）。
// Threads、IG、FB 這類 App 的內建瀏覽器會擋掉叫醒 LINE 的動作，點了會閃一下又跳回來；電腦也開不了手機 LINE。
// 這兩種情況改成跳出面板：QR code、複製 ID 或連結、用瀏覽器開的步驟。
(() => {
  const ROOT = (document.body && document.body.dataset.root) || "";
  const ITEMS = {
    lineoa: { name: "LINE 官方", url: "https://line.me/R/ti/p/@963zmrfw", id: "@963zmrfw", qr: "media/qr-lineoa.svg" },
    line: { name: "LINE 社群", url: "https://line.me/ti/g2/FXj0yahd04U4JecSoC4uPInXiqhLulqdCl54Ag", qr: "media/qr-line.svg" }
  };
  window.SN_LINE = ITEMS;
  const ua = navigator.userAgent;
  const inLine = /\bLine\//i.test(ua);
  const inOtherApp = !inLine && /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Barcelona|Threads|Messenger|TikTok|musical_ly|BytedanceWebview|Twitter|MicroMessenger|Snapchat|Pinterest/i.test(ua);
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const direct = inLine || (mobile && !inOtherApp);

  // 先把所有按鈕的網址換成直接的加好友網址，拿掉開新視窗
  const fix = () => document.querySelectorAll("a[data-key='lineoa'], a[data-key='line']").forEach(a => {
    a.href = ITEMS[a.dataset.key].url; a.removeAttribute("target");
  });
  fix(); document.addEventListener("DOMContentLoaded", fix);

  // 點下去的那一刻再確認一次（別的程式可能又加回 target）
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[data-key='lineoa'], a[data-key='line']");
    if (!a) return;
    const it = ITEMS[a.dataset.key];
    a.href = it.url; a.removeAttribute("target");
    if (direct) return;
    e.preventDefault(); e.stopPropagation();
    open(a.dataset.key);
  }, true);

  let sheet;
  function open(key) {
    const it = ITEMS[key];
    if (!sheet) build();
    const how = inOtherApp
      ? `<li>截圖這個 QR code，打開 LINE 的「掃描」，從相簿選這張圖。</li>
         <li>${it.id ? `複製 ID，到 LINE 的「加入好友」搜尋 <b>${it.id}</b>。` : "複製連結，貼到 LINE 任何一個聊天室（自己的 Keep 筆記也可以），再點那個連結。"}</li>
         <li>點右上角的 ⋯，選「用瀏覽器開啟」，再按一次加入。</li>`
      : `<li>用手機的 LINE 掃這個 QR code。</li>
         <li>${it.id ? `或在 LINE 的「加入好友」搜尋 <b>${it.id}</b>。` : "或把連結傳到手機，在 LINE 裡點開。"}</li>`;
    sheet.querySelector(".lx-title").textContent = "加入 " + it.name;
    sheet.querySelector(".lx-why").textContent = inOtherApp ? "這個 App 裡面的瀏覽器打不開 LINE，換個方式加：" : "電腦打不開手機的 LINE，用手機加：";
    sheet.querySelector(".lx-qr img").src = ROOT + it.qr;
    sheet.querySelector(".lx-how").innerHTML = how;
    const cp = sheet.querySelector(".lx-copy");
    cp.textContent = it.id ? "複製 ID " + it.id : "複製社群連結";
    cp.onclick = () => copy(it.id || it.url, cp, it.id ? "ID 已複製" : "連結已複製");
    sheet.querySelector(".lx-try").href = it.url;
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
.lx-try { border: 1px solid rgba(255, 255, 255, .16); color: #cfc8b8; font-size: 14px; height: 42px; }`;
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
    sheet.addEventListener("click", e => { if (e.target === sheet || e.target.closest(".lx-x")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) close(); });
  }
})();
