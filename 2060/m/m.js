/* 2060 생활 자료실 — 휴대폰 화면 보조 (화면 그리기와 기록은 ../app.js 가 그대로 맡아요)
   - 고른 탭과 주제가 한 줄 목록의 가운데에 오게 밀어 줘요.
   - 아래로 많이 내려가면 '맨 위로' 단추를 보여 줘요. */
(function () {
  "use strict";
  const tabs = document.getElementById("tabs"), main = document.getElementById("main"), toTop = document.getElementById("toTop");

  const center = (box, item) => {
    if (!box || !item) return;
    box.scrollLeft = item.offsetLeft - box.offsetLeft - (box.clientWidth - item.offsetWidth) / 2;
  };
  const centerAll = () => {
    center(tabs, tabs.querySelector('[aria-selected="true"]'));
    main.querySelectorAll(".pills").forEach((p) => center(p, p.querySelector('[aria-pressed="true"]')));
  };
  new MutationObserver(centerAll).observe(tabs, { childList: true });
  centerAll();

  const showTop = () => { toTop.hidden = window.scrollY < 700; };
  window.addEventListener("scroll", showTop, { passive: true });
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  showTop();
})();
