// 教學分頁：路徑的墨線跟著捲動畫出來、看過的片打勾、影片點了才載入、章節點了跳到那一秒、閱讀進度條
(() => {
  const SEEN = "sn-learn-seen";
  const seen = new Set(JSON.parse(localStorage.getItem(SEEN) || "[]"));
  const page = document.body.dataset.video;
  if (page) { seen.add(page); localStorage.setItem(SEEN, JSON.stringify([...seen])); }

  // 路徑頁
  const path = document.querySelector(".path");
  if (path) {
    const cards = [...document.querySelectorAll(".vcard")];
    cards.forEach(c => c.classList.toggle("seen", seen.has(c.dataset.id)));
    document.querySelectorAll(".stage").forEach(st => {
      const ids = [...st.querySelectorAll(".vcard")].map(c => c.dataset.id);
      st.classList.toggle("done", ids.length > 0 && ids.every(i => seen.has(i)));
    });
    const n = cards.filter(c => seen.has(c.dataset.id)).length, tot = cards.length;
    const fg = document.querySelector(".ring .fg"), C = 2 * Math.PI * 19;
    if (fg) { fg.style.strokeDasharray = C; fg.style.strokeDashoffset = C; requestAnimationFrame(() => setTimeout(() => { fg.style.strokeDashoffset = C * (1 - n / Math.max(1, tot)); }, 300)); }
    const pn = document.getElementById("pn"); if (pn) pn.textContent = `${n} / ${tot}`;
    const ink = path.querySelector(".ink");
    const upd = () => {
      const r = path.getBoundingClientRect(), h = r.height - 16, v = innerHeight * 0.62 - r.top;
      ink.style.height = Math.max(0, Math.min(h, v)) + "px";
    };
    addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); upd();
  }

  // 單支片：影片點了才載入，章節點了跳到那一秒
  const pl = document.querySelector(".player");
  if (pl) {
    const id = pl.dataset.id;
    const load = (start = 0) => {
      pl.classList.add("on");
      pl.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&start=${start}" title="YouTube 影片" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    };
    pl.querySelector("button").addEventListener("click", () => load(0));
    document.querySelectorAll(".chap .ts").forEach(b => b.addEventListener("click", () => {
      const [m, s] = b.dataset.t.split(":").map(Number);
      load(m * 60 + s);
      pl.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
    const bar = document.querySelector(".readbar");
    const upd = () => { const max = document.documentElement.scrollHeight - innerHeight; bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + "%"; };
    addEventListener("scroll", upd, { passive: true }); upd();
  }
})();
