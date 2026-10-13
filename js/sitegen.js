/* 학생이 만드는 '나만의 탐구 웹' 생성기 — 웹앱(미리보기·파일 저장)과 site.html(공유 링크)이 함께 씀
   학생이 쓴 글은 모두 이스케이프해서 넣기 때문에, 공유 링크를 조작해도 스크립트가 실행되지 않아요. */
(function (root) {
  "use strict";

  const THEMES = {
    forest: { name: "숲", main: "#1f6f50", soft: "#e5f2ea", deep: "#123f2f" },
    sea:    { name: "바다", main: "#1d5fa8", soft: "#e3eefa", deep: "#123a66" },
    sunset: { name: "노을", main: "#b4501f", soft: "#fbe9de", deep: "#6e2f12" },
    violet: { name: "보라", main: "#5b46c2", soft: "#ece8fb", deep: "#33267a" },
    ink:    { name: "먹", main: "#2d2d2a", soft: "#ecebe6", deep: "#161614" },
  };
  const AREA_NAME = { food: "식생활", clothing: "의생활", housing: "주생활" };
  const SECTION_ORDER = ["data", "question", "idea", "info", "quiz", "free", "refs"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function para(s) {
    return esc(s).replace(/\r?\n/g, "<br>");
  }
  function str(v, max) {
    return typeof v === "string" ? v.slice(0, max) : "";
  }
  function arr(v, max) {
    return Array.isArray(v) ? v.slice(0, max) : [];
  }
  function safeUrl(u) {
    const t = str(u, 500).trim();
    return /^https?:\/\/[^\s"'<>`]+$/i.test(t) ? t : "";
  }

  // 들어온 자료를 허용된 모양으로만 정리 (공유 링크는 누구나 만들 수 있으므로)
  function normalize(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const sec = r.sections && typeof r.sections === "object" ? r.sections : {};
    const g = (k) => (sec[k] && typeof sec[k] === "object" ? sec[k] : {});
    const on = (k) => g(k).on === true;
    return {
      v: 1,
      area: AREA_NAME[r.area] ? r.area : "food",
      title: str(r.title, 60) || "미래 생활 탐구 웹",
      intro: str(r.intro, 240),
      author: str(r.author, 30),
      emoji: Array.from(str(r.emoji, 16)).slice(0, 2).join(""),
      theme: THEMES[r.theme] ? r.theme : "forest",
      made: /^\d{4}-\d{2}-\d{2}$/.test(r.made || "") ? r.made : "",
      sections: {
        data: { on: on("data"), title: str(g("data").title, 60), meta: str(g("data").meta, 120),
          facts: arr(g("data").facts, 10).map((x) => str(x, 200)).filter(Boolean) },
        question: { on: on("question"), q: str(g("question").q, 200), answer: str(g("question").answer, 1200),
          sources: str(g("question").sources, 300) },
        idea: { on: on("idea"), name: str(g("idea").name, 80), desc: str(g("idea").desc, 1200),
          lines: arr(g("idea").lines, 12).map((l) => ({ k: str(l && l.k, 40), v: str(l && l.v, 300) })).filter((l) => l.k && l.v) },
        info: { on: on("info"), cards: arr(g("info").cards, 10).map((c) => ({
          emoji: Array.from(str(c && c.emoji, 16)).slice(0, 2).join(""), name: str(c && c.name, 60), text: str(c && c.text, 400) })).filter((c) => c.name) },
        quiz: { on: on("quiz"), items: arr(g("quiz").items, 3).map((q) => ({
          q: str(q && q.q, 200), a: q && q.a === "X" ? "X" : "O", why: str(q && q.why, 300) })).filter((q) => q.q) },
        free: { on: on("free"), title: str(g("free").title, 60), text: str(g("free").text, 2000) },
        refs: { on: on("refs"), items: arr(g("refs").items, 10).map((x) => ({ name: str(x && x.name, 100), url: safeUrl(x && x.url) })).filter((x) => x.name) },
      },
    };
  }

  function css(site) {
    const t = THEMES[site.theme] || THEMES.forest;
    return [
      ":root{--main:" + t.main + ";--soft:" + t.soft + ";--deep:" + t.deep + ";--ink:#1d1d1b;--ink2:#55544f;--bg:#faf9f6;--card:#fff;--line:rgba(0,0,0,.1)}",
      "*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;font-size:17px;line-height:1.65;word-break:keep-all;overflow-wrap:anywhere}",
      ".hero{background:var(--deep);color:#fff;padding:40px 20px 34px;text-align:center}.hero .em{font-size:52px;line-height:1}.hero .area{margin:10px 0 0;font-weight:700;opacity:.85;font-size:15px;letter-spacing:.04em}",
      ".hero h1{margin:6px auto 10px;font-size:clamp(26px,6vw,40px);line-height:1.25;max-width:760px}.hero .intro{margin:0 auto;max-width:640px;opacity:.92}.hero .by{margin:14px 0 0;font-size:14px;opacity:.75}",
      ".toc{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:14px 16px;background:var(--soft);position:sticky;top:0;z-index:2}",
      ".toc a{color:var(--deep);text-decoration:none;font-weight:700;font-size:15px;padding:8px 14px;border-radius:999px;background:#fff;border:1px solid var(--line)}",
      "main{max-width:820px;margin:0 auto;padding:12px 16px 40px}section{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 20px;margin-top:18px;scroll-margin-top:70px}",
      "h2{margin:0 0 10px;font-size:22px;color:var(--deep)}h3{margin:16px 0 6px;font-size:18px}.meta{color:var(--ink2);font-size:15px;margin:0 0 8px}",
      ".facts{margin:0;padding:0;list-style:none;display:grid;gap:8px}.facts li{background:var(--soft);border-left:5px solid var(--main);padding:10px 14px;border-radius:10px}",
      ".q{font-size:20px;font-weight:800;margin:4px 0}.src{color:var(--ink2);font-size:14px}",
      ".card{border:2px solid var(--main);border-radius:16px;padding:16px 18px}.card h3{margin-top:0;font-size:21px}dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:6px 14px}dt{font-weight:800;color:var(--deep)}dd{margin:0}",
      ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}.grid article{background:var(--soft);border-radius:14px;padding:14px}.grid .e{font-size:28px}.grid h3{margin:4px 0}",
      ".quiz{margin:0;padding-left:22px;display:grid;gap:16px}.quiz .btns{display:flex;gap:10px;margin-top:8px}",
      ".quiz button{min-width:64px;min-height:52px;font-size:22px;font-weight:800;border-radius:14px;border:2px solid var(--main);background:#fff;color:var(--deep);cursor:pointer}",
      ".quiz button[aria-pressed=true]{background:var(--main);color:#fff}.res{margin:8px 0 0;padding:10px 14px;border-radius:10px;background:var(--soft)}",
      ".refs{padding-left:20px}.refs a{color:var(--deep);font-weight:700}",
      "footer{max-width:820px;margin:0 auto;padding:0 20px 40px;color:var(--ink2);font-size:14px;text-align:center}",
    ].join("\n");
  }

  function body(site) {
    const s = site.sections;
    const toc = [];
    const parts = [];
    const add = (id, label, html) => { toc.push('<a href="#' + id + '">' + label + "</a>"); parts.push('<section id="' + id + '">' + html + "</section>"); };

    SECTION_ORDER.forEach((k) => {
      const x = s[k];
      if (!x || !x.on) return;
      if (k === "data" && x.facts.length) {
        add("data", "📊 데이터", "<h2>📊 " + esc(x.title || "기후 데이터로 본 미래") + "</h2>" +
          (x.meta ? '<p class="meta">' + esc(x.meta) + "</p>" : "") +
          '<ul class="facts">' + x.facts.map((f) => "<li>" + esc(f) + "</li>").join("") + "</ul>");
      }
      if (k === "question" && x.q) {
        add("question", "❓ 탐구 질문", "<h2>❓ 우리의 탐구 질문</h2><p class=\"q\">" + esc(x.q) + "</p>" +
          (x.answer ? "<h3>우리가 찾은 답</h3><p>" + para(x.answer) + "</p>" : "") +
          (x.sources ? '<p class="src">출처: ' + esc(x.sources) + "</p>" : ""));
      }
      if (k === "idea" && (x.name || x.lines.length || x.desc)) {
        add("idea", "💡 아이디어", "<h2>💡 우리의 설계 아이디어</h2><div class=\"card\">" +
          (x.name ? "<h3>" + esc(x.name) + "</h3>" : "") +
          (x.lines.length ? "<dl>" + x.lines.map((l) => "<dt>" + esc(l.k) + "</dt><dd>" + esc(l.v) + "</dd>").join("") + "</dl>" : "") +
          (x.desc ? "<p>" + para(x.desc) + "</p>" : "") + "</div>");
      }
      if (k === "info" && x.cards.length) {
        add("info", "🔎 알아보기", "<h2>🔎 더 알아보기</h2><div class=\"grid\">" +
          x.cards.map((c) => "<article>" + (c.emoji ? '<div class="e">' + esc(c.emoji) + "</div>" : "") + "<h3>" + esc(c.name) + "</h3><p>" + esc(c.text) + "</p></article>").join("") + "</div>");
      }
      if (k === "quiz" && x.items.length) {
        add("quiz", "✅ 퀴즈", "<h2>✅ OX 퀴즈</h2><ol class=\"quiz\">" + x.items.map((q, i) =>
          '<li data-answer="' + q.a + '" data-why="' + esc(q.why) + '"><p>' + esc(q.q) + '</p><div class="btns">' +
          '<button type="button" data-pick="O" aria-pressed="false">O</button><button type="button" data-pick="X" aria-pressed="false">X</button></div>' +
          '<p class="res" hidden></p></li>').join("") + "</ol>");
      }
      if (k === "free" && (x.title || x.text)) {
        add("free", "📝 " + esc(x.title || "나의 생각"), "<h2>📝 " + esc(x.title || "나의 생각") + "</h2><p>" + para(x.text) + "</p>");
      }
      if (k === "refs" && x.items.length) {
        add("refs", "📚 자료", "<h2>📚 참고 자료</h2><ul class=\"refs\">" + x.items.map((r) =>
          "<li>" + (r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.name) + "</a>" : esc(r.name)) + "</li>").join("") + "</ul>");
      }
    });

    return '<header class="hero">' + (site.emoji ? '<div class="em" aria-hidden="true">' + esc(site.emoji) + "</div>" : "") +
      '<p class="area">' + esc(AREA_NAME[site.area]) + " 탐구</p><h1>" + esc(site.title) + "</h1>" +
      (site.intro ? '<p class="intro">' + para(site.intro) + "</p>" : "") +
      (site.author || site.made ? '<p class="by">' + (site.author ? "만든 사람: " + esc(site.author) : "") + (site.author && site.made ? " · " : "") + esc(site.made) + "</p>" : "") +
      "</header>" + (toc.length > 1 ? '<nav class="toc" aria-label="차례">' + toc.join("") + "</nav>" : "") +
      "<main>" + (parts.length ? parts.join("") : "<section><p>아직 내용이 없어요.</p></section>") + "</main>" +
      "<footer>‘미래 기후와 의식주 탐구실’에서 학생이 만든 탐구 웹이에요. 기후 값은 기상청 시나리오의 기간 평균 전망이며, 확정된 예보가 아니에요.</footer>";
  }

  // OX 퀴즈 동작 (파일로 저장할 때는 이 함수의 코드가 그대로 들어감)
  function bindQuiz(doc) {
    doc.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-pick]") : null;
      if (!b) return;
      var li = b.closest("li");
      var res = li.querySelector(".res");
      var btns = li.querySelectorAll("[data-pick]");
      for (var i = 0; i < btns.length; i++) btns[i].setAttribute("aria-pressed", btns[i] === b ? "true" : "false");
      var ok = b.getAttribute("data-pick") === li.getAttribute("data-answer");
      res.textContent = (ok ? "정답이에요! " : "다시 생각해 봐요. 정답은 " + li.getAttribute("data-answer") + "예요. ") + (li.getAttribute("data-why") || "");
      res.hidden = false;
    });
  }

  function fullHtml(raw) {
    const site = normalize(raw);
    return "<!doctype html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
      "<title>" + esc(site.title) + "</title>\n<style>\n" + css(site) + "\n</style>\n</head>\n<body>\n" + body(site) +
      "\n<script>(" + bindQuiz.toString() + ")(document);<\/script>\n</body>\n</html>\n";
  }

  /* ---------- 공유 링크 인코딩: #v1.d.<압축> 또는 #v1.u.<원문> ---------- */
  function b64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64url(s) {
    const t = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(t + "===".slice((t.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function pipe(bytes, stream) {
    const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }
  async function encode(raw) {
    const bytes = new TextEncoder().encode(JSON.stringify(normalize(raw)));
    if (typeof CompressionStream === "function") {
      try { return "v1.d." + b64url(await pipe(bytes, new CompressionStream("deflate"))); } catch (e) { /* 압축 실패 시 원문 */ }
    }
    return "v1.u." + b64url(bytes);
  }
  async function decode(code) {
    const m = /^v1\.([du])\.([A-Za-z0-9_-]+)$/.exec(code || "");
    if (!m) throw new Error("bad-link");
    let bytes = unb64url(m[2]);
    if (m[1] === "d") {
      if (typeof DecompressionStream !== "function") throw new Error("old-browser");
      bytes = await pipe(bytes, new DecompressionStream("deflate"));
    }
    return normalize(JSON.parse(new TextDecoder().decode(bytes)));
  }

  root.SiteGen = { THEMES: THEMES, AREA_NAME: AREA_NAME, normalize: normalize, css: css, body: body, bindQuiz: bindQuiz, fullHtml: fullHtml, encode: encode, decode: decode };
})(window);
