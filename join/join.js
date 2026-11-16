// 註冊成為 Snsheng 會員：選交易所 → 用邀請連結註冊 → 填 UID（寫進 Google 試算表） → 等審核
(() => {
  // Google 試算表後台的網址（部署 Apps Script 後拿到的 /exec 網址）。空的時候送出會改成請他到 LINE 說。
  const ENDPOINT = "";
  const EX = {
    bitget: { name: "Bitget", url: "https://partner.bitget.com/bg/naxg9b1r", logo: "../media/ex/bitget.png" },
    bingx: { name: "BingX", url: "https://bingxzone.com/invite/QCM2IQ", logo: "../media/ex/bingx.png" }
  };
  const $ = id => document.getElementById(id);
  const KEY = "sn-join";
  let ex = "";
  // 卡號：每個人進來看到一組自己的號碼（只是好看）
  const no = localStorage.getItem("sn-card-no") || String(Math.floor(1000 + Math.random() * 9000));
  localStorage.setItem("sn-card-no", no);
  $("bcNo").textContent = no;

  function go(n) {
    for (let i = 1; i <= 4; i++) $("p" + i).hidden = i !== n;
    document.querySelectorAll("#steps li").forEach((li, i) => { li.classList.toggle("on", i + 1 === n); li.classList.toggle("done", i + 1 < n || n === 4); });
    const pane = $("p" + n);
    pane.style.animation = "none"; void pane.offsetWidth; pane.style.animation = "";
    if (n !== 1) $("steps").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pick(k) {
    ex = k;
    document.querySelectorAll(".ex").forEach(b => { const on = b.dataset.ex === k; b.classList.toggle("sel", on); const s = b.querySelector(".stamp"); if (on) { s.classList.remove("hit"); void s.offsetWidth; s.classList.add("hit"); } });
    document.querySelectorAll(".exn").forEach(s => { s.textContent = EX[k].name; });
    $("exLink").href = EX[k].url; $("exLogo").src = EX[k].logo;
    $("fEx").value = EX[k].name;
    setTimeout(() => go(2), 420);
  }
  document.querySelectorAll(".ex").forEach(b => b.addEventListener("click", () => pick(b.dataset.ex)));
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(+b.dataset.go)));

  $("form").addEventListener("submit", async e => {
    e.preventDefault();
    const uid = $("fUid").value.replace(/\D/g, ""), mail = $("fMail").value.trim(), line = $("fLine").value.trim();
    $("fUid").classList.toggle("bad", uid.length < 5);
    const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
    $("fMail").classList.toggle("bad", !mailOk);
    if (uid.length < 5 || !mailOk) { $("fErr").textContent = uid.length < 5 ? "UID 是一串數字，請再確認一下。" : "Email 格式好像不對。"; return; }
    $("fErr").textContent = "";
    const btn = $("fBtn"); btn.disabled = true; btn.textContent = "送出中…";
    const data = { ex: EX[ex] ? EX[ex].name : "", uid, email: mail, line, src: "snsheng-site" };
    let ok = false;
    if (ENDPOINT) {
      try { await fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: new URLSearchParams(data) }); ok = true; } catch (err) { ok = false; }
    }
    btn.disabled = false; btn.textContent = "送出";
    if (!ok) { $("fErr").textContent = ENDPOINT ? "送出失敗，網路不穩，請再按一次，或直接到 LINE 告訴我 UID。" : "名單還在設定中，先到下面的 LINE 社群把交易所和 UID 傳給我。"; return; }
    localStorage.setItem(KEY, JSON.stringify({ ...data, at: Date.now() }));
    showDone(data);
  });
  function showDone(d) {
    $("doneInfo").textContent = `${d.ex}｜UID ${d.uid}`;
    go(4);
    const s = document.querySelector(".big-stamp"); s.classList.remove("hit"); void s.offsetWidth; s.classList.add("hit");
  }
  $("again").addEventListener("click", () => { localStorage.removeItem(KEY); go(1); });
  // 送過的人再進來，直接看到審核中
  try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.uid) showDone(d); } catch (e) {}
})();
