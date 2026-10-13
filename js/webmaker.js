/* ④ 나만의 웹 만들기 — 의·식·주 중 한 주제로 정보 웹페이지를 만들어 공유 (고칠 필요 없음) */
(function () {
  "use strict";
  const CL = window.CL;
  const SG = window.SiteGen;
  if (!CL || !CL.ok || !SG) return;
  const esc = CL.esc;
  CL.views = CL.views || {};
  CL.actions = CL.actions || {};
  CL.inputHandlers = CL.inputHandlers || [];
  CL.afterRender = CL.afterRender || [];
  const A = CL.actions;

  const SEC_LABEL = {
    data: "📊 기후 데이터", question: "❓ 탐구 질문과 답", idea: "💡 설계 아이디어", info: "🔎 더 알아보기 카드",
    quiz: "✅ OX 퀴즈", free: "📝 자유 구역", refs: "📚 참고 자료",
  };
  const SEC_ORDER = ["data", "question", "idea", "info", "quiz", "free", "refs"];
  const TITLE_HINT = { food: "2050 우리 동네 미래 밥상", clothing: "폭염 시대의 옷 이야기", housing: "기후를 견디는 미래의 집" };
  const EMOJI = { food: ["🍚", "🥗", "🍜", "🥭", "🌾", "🍅"], clothing: ["👕", "🧢", "☂️", "🧵", "🕶️", "👟"], housing: ["🏠", "🏡", "🌿", "☀️", "💧", "🪟"] };

  function blank(area) {
    return {
      area: area, title: "", intro: "", author: "", emoji: EMOJI[area][0], theme: "forest", filled: false,
      region: CL.state.region, scen: CL.state.scen,
      sections: {
        data: { on: true, title: "기후 데이터로 본 미래", facts: [] },
        question: { on: true, q: "", answer: "", sources: "" },
        idea: { on: true, name: "", lines: [], desc: "" },
        info: { on: true, cards: [] },
        quiz: { on: true, items: [{ q: "", a: "O", why: "" }, { q: "", a: "O", why: "" }, { q: "", a: "O", why: "" }] },
        free: { on: false, title: "나의 생각", text: "" },
        refs: { on: true, items: [] },
      },
    };
  }
  function getWeb() {
    const area = CL.state.area;
    const raw = CL.load("web", null);
    const w = blank(raw && CL.AREAS[raw.area] ? raw.area : area);
    if (!raw || typeof raw !== "object") return w;
    ["title", "intro", "author", "emoji", "theme", "region", "scen"].forEach((k) => { if (typeof raw[k] === "string") w[k] = raw[k]; });
    w.filled = raw.filled === true;
    if (!SG.THEMES[w.theme]) w.theme = "forest";
    const rs = raw.sections || {};
    SEC_ORDER.forEach((k) => {
      const x = rs[k];
      if (!x || typeof x !== "object") return;
      Object.keys(w.sections[k]).forEach((f) => {
        if (f === "on") w.sections[k].on = x.on === true;
        else if (Array.isArray(w.sections[k][f])) { if (Array.isArray(x[f])) w.sections[k][f] = x[f]; }
        else if (typeof x[f] === "string") w.sections[k][f] = x[f];
      });
    });
    while (w.sections.quiz.items.length < 3) w.sections.quiz.items.push({ q: "", a: "O", why: "" });
    return w;
  }
  function saveWeb(w) {
    CL.save("web", w);
  }
  function region(w) {
    return CL.regions().indexOf(w.region) >= 0 ? w.region : CL.state.region;
  }
  function scen(w) {
    return CL.SCENS.indexOf(w.scen) >= 0 ? w.scen : CL.state.scen;
  }

  /* ---------- 앞 단계 기록에서 가져오기 ---------- */
  function dataFacts(w) {
    const r = region(w);
    const s = scen(w);
    const facts = CL.indsFor(r).map((id) => {
      const v = CL.series(r, id, s);
      if (v[0] == null || v[3] == null) return null;
      const ratio = CL.ratioText(id, v[0], v[3]);
      return CL.indName(id) + ": 현재 " + CL.fmtVal(id, v[0]) + CL.unit(id) + " → 후반기(2081–2100) " + CL.fmtVal(id, v[3]) + CL.unit(id) +
        " (" + CL.deltaText(id, v[0], v[3]) + (ratio ? ", " + ratio : "") + ")";
    }).filter(Boolean);
    return facts;
  }
  function fill(w, what) {
    const area = w.area;
    if (what === "data" || what === "all") {
      w.sections.data.facts = dataFacts(w);
    }
    if (what === "question" || what === "all") {
      const q = CL.getQuestions(area).filter((x) => x.star)[0] || CL.getQuestions(area)[0];
      if (q) { w.sections.question.q = q.q; w.sections.question.answer = q.answer || ""; w.sections.question.sources = q.src || ""; }
    }
    if (what === "idea" || what === "all") {
      const d = CL.designLines(area);
      if (!d.empty) { w.sections.idea.name = d.name; w.sections.idea.lines = d.lines; w.sections.idea.desc = d.desc; }
    }
    if (what === "info" || what === "all") {
      const picks = CL.getBuild(area).picks.map((id) => CL.cardById(area, id)).filter(Boolean);
      w.sections.info.cards = picks.map((c) => ({ emoji: c.emoji || "", name: c.name, text: c.fact || c.how || "" }));
    }
    if (what === "refs" || what === "all") {
      const items = [{ name: CL.D.source, url: "https://www.climate.go.kr/home/CCS/contents_2021/33_2_areapoint_basic_ssp.php" }];
      CL.AREAS[area].research.forEach((x) => { if (x.link && !items.some((i) => i.url === x.link)) items.push({ name: x.site || x.text, url: x.link }); });
      w.sections.refs.items = items;
    }
    if (what === "all") {
      if (!w.title) w.title = TITLE_HINT[area];
      const rep = CL.load("report", {}) || {};
      if (!w.intro && typeof rep.claim === "string" && rep.claim.trim()) w.intro = rep.claim.trim();
      if (!w.intro) w.intro = CL.AREAS[area].question;
      w.filled = true;
    }
    return w;
  }
  function toSite(w) {
    const r = region(w);
    const s = scen(w);
    const sec = JSON.parse(JSON.stringify(w.sections));
    sec.data.meta = r + " · " + CL.scenFull(s) + " · 출처: " + CL.D.source;
    return { area: w.area, title: w.title, intro: w.intro, author: w.author, emoji: w.emoji, theme: w.theme, made: CL.today(), sections: sec };
  }
  CL.webSite = () => toSite(getWeb());

  /* ---------- 화면 ---------- */
  CL.views.web = function () {
    let w = getWeb();
    if (!w.filled) { w = fill(w, "all"); saveWeb(w); }
    const s = w.sections;
    let h = '<div class="section-title"><h2>④ 나만의 탐구 웹 만들기</h2><p>내가 정한 주제(의·식·주 중 하나)로 정보를 알려 주는 웹페이지를 만들어 친구들과 공유해요. 보고서에 쓴 내용이 자동으로 들어가 있어요.</p></div>';

    // 1. 주제와 꾸미기
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">1</span><div><h3>주제 정하고 꾸미기</h3></div></div>';
    h += '<div class="ctrl-row"><div class="ctrl"><span class="ctrl-label">주제 영역</span><div class="seg">' + CL.AREA_IDS.map((id) =>
      '<button data-act="web-area" data-v="' + id + '" aria-pressed="' + (w.area === id) + '"><span>' + esc(CL.AREAS[id].icon + " " + CL.AREAS[id].name) + "</span></button>").join("") + "</div></div></div>";
    h += '<label class="field-label" for="wTitle">웹 제목</label><input class="text-input" id="wTitle" data-web="title" maxlength="60" placeholder="' + esc(TITLE_HINT[w.area]) + '" value="' + esc(w.title) + '">';
    h += '<label class="field-label" for="wIntro">한 줄 소개</label><textarea class="idea short" id="wIntro" data-web="intro" maxlength="240" placeholder="이 웹에서 무엇을 알려 주나요?">' + esc(w.intro) + "</textarea>";
    h += '<label class="field-label" for="wAuthor">만든 사람 <small>별명이나 모둠 이름을 써요. 실명·학번 같은 개인정보는 넣지 마세요.</small></label><input class="text-input" id="wAuthor" data-web="author" maxlength="30" placeholder="예: 3모둠 미래밥상팀" value="' + esc(w.author) + '">';
    h += '<span class="field-label">대표 그림</span><div class="chips">' + EMOJI[w.area].concat(["🌍"]).map((e) =>
      '<button class="chip emoji-chip" data-act="web-emoji" data-v="' + esc(e) + '" aria-pressed="' + (w.emoji === e) + '" aria-label="' + esc(e) + '">' + esc(e) + "</button>").join("") + "</div>";
    h += '<span class="field-label">색 테마</span><div class="chips">' + Object.keys(SG.THEMES).map((k) =>
      '<button class="chip theme-chip" data-act="web-theme" data-v="' + k + '" aria-pressed="' + (w.theme === k) + '"><i style="background:' + SG.THEMES[k].main + '"></i>' + esc(SG.THEMES[k].name) + "</button>").join("") + "</div></section>";

    // 2. 구성과 내용
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">2</span><div><h3>구성 고르고 내용 채우기</h3><p class="panel-desc">켜 둔 구역만 웹에 나와요. ‘가져오기’를 누르면 앞 단계의 기록으로 다시 채워져요.</p></div></div>';
    h += '<div class="chips">' + SEC_ORDER.map((k) => '<button class="chip" data-act="web-sec" data-v="' + k + '" aria-pressed="' + s[k].on + '">' + (s[k].on ? "✓ " : "") + esc(SEC_LABEL[k]) + "</button>").join("") + "</div>";
    h += '<button class="link-btn" data-act="web-fill-all">🔄 보고서·탐구 기록에서 한 번에 다시 가져오기</button>';

    if (s.data.on) {
      h += secBox("data", '<div class="ctrl-row"><div class="ctrl"><span class="ctrl-label">지역</span><div class="seg">' + CL.regions().map((x) =>
        '<button data-act="web-region" data-v="' + esc(x) + '" aria-pressed="' + (x === region(w)) + '"><span>' + esc(x) + "</span></button>").join("") + '</div></div><div class="ctrl"><span class="ctrl-label">시나리오</span><div class="seg">' +
        CL.SCENS.map((x) => '<button data-act="web-scen" data-v="' + x + '" aria-pressed="' + (x === scen(w)) + '"><span>' + esc(CL.scenCode(x)) + "</span></button>").join("") + "</div></div></div>" +
        '<label class="field-label">구역 제목</label><input class="text-input" data-ws="data.title" maxlength="60" value="' + esc(s.data.title) + '">' +
        '<label class="field-label">알려 줄 사실 <small>한 줄에 하나씩 · 자료에 있는 숫자만 써요</small></label><textarea class="idea" data-web-facts="1">' + esc(s.data.facts.join("\n")) + "</textarea>", "data");
    }
    if (s.question.on) {
      h += secBox("question", '<label class="field-label">탐구 질문</label><input class="text-input" data-ws="question.q" maxlength="200" value="' + esc(s.question.q) + '">' +
        '<label class="field-label">우리가 찾은 답</label><textarea class="idea" data-ws="question.answer">' + esc(s.question.answer) + "</textarea>" +
        '<label class="field-label">출처</label><input class="text-input" data-ws="question.sources" maxlength="300" value="' + esc(s.question.sources) + '">', "question");
    }
    if (s.idea.on) {
      h += secBox("idea", '<label class="field-label">아이디어 이름</label><input class="text-input" data-ws="idea.name" maxlength="80" value="' + esc(s.idea.name) + '">' +
        '<label class="field-label">특징 <small>“항목: 내용” 형식으로 한 줄에 하나씩</small></label><textarea class="idea" data-web-lines="1">' + esc(s.idea.lines.map((l) => l.k + ": " + l.v).join("\n")) + "</textarea>" +
        '<label class="field-label">설명</label><textarea class="idea short" data-ws="idea.desc">' + esc(s.idea.desc) + "</textarea>", "idea");
    }
    if (s.info.on) {
      h += secBox("info", (s.info.cards.length ? '<ul class="evi-picked">' + s.info.cards.map((c, i) => "<li><span>" + esc((c.emoji ? c.emoji + " " : "") + c.name) + " — " + esc(c.text) +
        '</span><button data-act="web-info-del" data-i="' + i + '" aria-label="카드 빼기">×</button></li>').join("") + "</ul>" : '<p class="note">② 탐색 카드에서 고른 카드가 여기에 들어가요.</p>') +
        '<div class="two-fields"><input class="text-input" id="wCardName" maxlength="60" placeholder="카드 이름 (예: 쿨루프)"><input class="text-input" id="wCardText" maxlength="300" placeholder="설명"></div>' +
        '<button class="btn small" data-act="web-info-add">＋ 카드 직접 추가</button>', "info");
    }
    if (s.quiz.on) {
      h += secBox("quiz", '<p class="note">방문한 친구가 풀 수 있는 OX 퀴즈예요. 2~3개를 만들어 보세요.</p>' + s.quiz.items.map((q, i) =>
        '<div class="quiz-row"><span class="quiz-n">Q' + (i + 1) + '</span><input class="text-input" data-quiz-q="' + i + '" maxlength="200" placeholder="예: 연강수량을 보면 장마 시작 날짜를 알 수 있다." value="' + esc(q.q) + '">' +
        '<div class="seg small-seg">' + ["O", "X"].map((x) => '<button data-act="web-quiz-ans" data-i="' + i + '" data-v="' + x + '" aria-pressed="' + (q.a === x) + '"><span>정답 ' + x + "</span></button>").join("") + "</div>" +
        '<input class="text-input" data-quiz-why="' + i + '" maxlength="300" placeholder="해설 (예: 연강수량은 1년 총량이라 날짜를 알 수 없어요.)" value="' + esc(q.why) + '"></div>').join(""), "quiz");
    }
    if (s.free.on) {
      h += secBox("free", '<label class="field-label">구역 제목</label><input class="text-input" data-ws="free.title" maxlength="60" value="' + esc(s.free.title) + '">' +
        '<label class="field-label">내용 <small>인터뷰, 설문 결과, 나의 다짐 등 자유롭게</small></label><textarea class="idea" data-ws="free.text">' + esc(s.free.text) + "</textarea>", "free");
    }
    if (s.refs.on) {
      h += secBox("refs", s.refs.items.map((x, i) => '<div class="ref-row"><input class="text-input" data-ref-name="' + i + '" maxlength="100" placeholder="자료 이름" value="' + esc(x.name) + '">' +
        '<input class="text-input" data-ref-url="' + i + '" maxlength="500" inputmode="url" placeholder="https://" value="' + esc(x.url || "") + '"><button class="q-del" data-act="web-ref-del" data-i="' + i + '" aria-label="자료 빼기">×</button></div>').join("") +
        '<button class="btn small" data-act="web-ref-add">＋ 참고 자료 추가</button>', "refs");
    }
    h += "</section>";

    // 3. 미리보기
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">3</span><div><h3>미리 보기</h3><p class="panel-desc">친구가 보게 될 화면이에요. 퀴즈도 눌러 볼 수 있어요.</p></div></div>' +
      '<iframe class="site-frame" id="siteFrame" title="나만의 웹 미리 보기" sandbox="allow-scripts"></iframe></section>';

    // 4. 공유
    const fileMode = location.protocol === "file:";
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">4</span><div><h3>공유하기</h3><p class="panel-desc">링크는 웹 내용이 주소 안에 담긴 방식이라 서버에 저장되지 않아요. 링크를 가진 사람은 누구나 볼 수 있어요.</p></div></div>' +
      '<div class="export-bar"><button class="btn primary" data-act="web-link">🔗 공유 링크 만들기</button><button class="btn" data-act="web-download">⬇️ HTML 파일로 저장</button><button class="btn" data-act="web-code">&lt;/&gt; 코드 보기</button></div>' +
      (fileMode ? '<p class="note">⚠️ 지금은 컴퓨터의 파일로 열려 있어서 공유 링크가 다른 기기에서 열리지 않아요. 배포된 주소에서 링크를 만들거나 HTML 파일로 저장해 주세요.</p>' : "") +
      '<div id="linkBox" hidden><input class="text-input" id="shareLink" readonly aria-label="공유 링크"><div class="next-row left"><button class="btn small" data-act="web-copy-link">📋 링크 복사</button><a class="btn small" id="openLink" target="_blank" rel="noopener">새 창에서 열기 ↗</a></div></div>' +
      '<ul class="plain small"><li>링크를 패들렛·클래스룸 등에 올려 친구들과 공유해요.</li><li>HTML 파일은 인터넷 없이도 열려요. Netlify Drop 같은 무료 호스팅에 올리면 나만의 웹 주소가 생겨요.</li>' +
      "<li>코드 보기를 눌러 웹이 어떤 코드로 만들어지는지 살펴보고, 색이나 글자를 직접 바꿔 보세요.</li></ul></section>";
    return h;
  };
  function secBox(k, inner, fillKey) {
    return '<div class="sec-box"><div class="sec-head"><b>' + esc(SEC_LABEL[k]) + "</b>" +
      (["data", "question", "idea", "info", "refs"].indexOf(fillKey) >= 0 ? '<button class="link-btn inline" data-act="web-fill" data-v="' + fillKey + '">🔄 가져오기</button>' : "") + "</div>" + inner + "</div>";
  }

  /* ---------- 미리보기 ---------- */
  let timer = null;
  function updateFrame() {
    const f = document.getElementById("siteFrame");
    if (f) f.srcdoc = SG.fullHtml(CL.webSite());
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(updateFrame, 450);
  }
  CL.afterRender.push(() => { if (CL.state.tab === "web") updateFrame(); });

  /* ---------- 입력 ---------- */
  CL.inputHandlers.push((e) => {
    const t = e.target;
    const d = t.dataset || {};
    if (!(d.web || d.ws || d.webFacts || d.webLines || d.quizQ || d.quizWhy || d.refName || d.refUrl)) return;
    const w = getWeb();
    if (d.web) w[d.web] = t.value;
    else if (d.ws) { const p = d.ws.split("."); w.sections[p[0]][p[1]] = t.value; }
    else if (d.webFacts) w.sections.data.facts = t.value.split("\n").map((x) => x.trim()).filter(Boolean);
    else if (d.webLines) w.sections.idea.lines = t.value.split("\n").map((x) => { const k = x.indexOf(":"); return k > 0 ? { k: x.slice(0, k).trim(), v: x.slice(k + 1).trim() } : null; }).filter((x) => x && x.k && x.v);
    else if (d.quizQ) w.sections.quiz.items[Number(d.quizQ)].q = t.value;
    else if (d.quizWhy) w.sections.quiz.items[Number(d.quizWhy)].why = t.value;
    else if (d.refName) w.sections.refs.items[Number(d.refName)].name = t.value;
    else if (d.refUrl) w.sections.refs.items[Number(d.refUrl)].url = t.value.trim();
    saveWeb(w);
    schedule();
  });

  /* ---------- 조작 ---------- */
  function edit(fn, rerender) {
    const w = getWeb();
    fn(w);
    saveWeb(w);
    if (rerender !== false) CL.render(); else schedule();
  }
  A["web-area"] = (b) => edit((w) => {
    const old = w.area;
    w.area = b.dataset.v;
    if (!w.title || w.title === TITLE_HINT[old]) w.title = TITLE_HINT[w.area];
    if (EMOJI[old].indexOf(w.emoji) >= 0) w.emoji = EMOJI[w.area][0];
    fill(w, "question"); fill(w, "idea"); fill(w, "info"); fill(w, "refs");
  });
  A["web-emoji"] = (b) => edit((w) => { w.emoji = b.dataset.v; });
  A["web-theme"] = (b) => edit((w) => { w.theme = b.dataset.v; });
  A["web-sec"] = (b) => edit((w) => { w.sections[b.dataset.v].on = !w.sections[b.dataset.v].on; });
  A["web-fill"] = (b) => { edit((w) => fill(w, b.dataset.v)); CL.toast("앞 단계 기록에서 가져왔어요"); };
  A["web-fill-all"] = () => {
    if (!window.confirm("지금 고친 내용 대신 보고서·탐구 기록으로 다시 채울까요?")) return;
    edit((w) => { w.title = ""; w.intro = ""; fill(w, "all"); });
    CL.toast("보고서·탐구 기록으로 다시 채웠어요");
  };
  A["web-region"] = (b) => edit((w) => { w.region = b.dataset.v; fill(w, "data"); });
  A["web-scen"] = (b) => edit((w) => { w.scen = b.dataset.v; fill(w, "data"); });
  A["web-info-del"] = (b) => edit((w) => { w.sections.info.cards.splice(Number(b.dataset.i), 1); });
  A["web-info-add"] = () => {
    const n = (document.getElementById("wCardName") || {}).value || "";
    const t = (document.getElementById("wCardText") || {}).value || "";
    if (!n.trim()) { CL.toast("카드 이름을 써 주세요"); return; }
    edit((w) => { w.sections.info.cards.push({ emoji: "", name: n.trim(), text: t.trim() }); });
  };
  A["web-quiz-ans"] = (b) => edit((w) => { w.sections.quiz.items[Number(b.dataset.i)].a = b.dataset.v; });
  A["web-ref-add"] = () => edit((w) => { w.sections.refs.items.push({ name: "", url: "" }); });
  A["web-ref-del"] = (b) => edit((w) => { w.sections.refs.items.splice(Number(b.dataset.i), 1); });
  A["web-link"] = async () => {
    try {
      const code = await SG.encode(CL.webSite());
      const base = location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
      const url = base + "site.html#" + code;
      const box = document.getElementById("linkBox");
      box.hidden = false;
      document.getElementById("shareLink").value = url;
      document.getElementById("openLink").href = url;
      CL.toast(url.length > 6000 ? "링크가 길어요. 내용을 조금 줄이거나 HTML 파일로 공유해도 좋아요" : "🔗 공유 링크를 만들었어요");
    } catch (e) {
      CL.toast("링크를 만들지 못했어요. HTML 파일로 저장해 주세요");
    }
  };
  A["web-copy-link"] = () => {
    const v = (document.getElementById("shareLink") || {}).value;
    if (!v) return;
    CL.copyText(v).then((ok) => CL.toast(ok ? "📋 링크를 복사했어요" : "복사하지 못했어요. 링크를 길게 눌러 복사해 주세요"));
  };
  A["web-download"] = () => {
    const site = CL.webSite();
    const name = (site.title || "my-web").replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 40) || "my-web";
    CL.download(name + ".html", SG.fullHtml(site), "text/html;charset=utf-8");
    CL.toast("⬇️ HTML 파일을 저장했어요");
  };
  A["web-code"] = () => {
    const code = SG.fullHtml(CL.webSite());
    const o = document.getElementById("overlay");
    o.className = "overlay code-overlay";
    o.innerHTML = '<div class="overlay-bar"><button class="btn primary" data-act="web-copy-code">📋 코드 복사</button><button class="btn" data-act="overlay-close" data-autofocus>닫기</button></div>' +
      '<div class="paper code-paper"><h2>&lt;/&gt; 내 웹은 이런 코드로 만들어져요</h2><ul class="plain small">' +
      "<li><code>&lt;head&gt;</code> 웹의 제목과 <b>&lt;style&gt;</b>(CSS: 색·글꼴·배치)이 들어 있어요. <code>--main:#…</code>의 색 코드를 바꾸면 테마 색이 바뀌어요.</li>" +
      "<li><code>&lt;header&gt;</code>와 <code>&lt;h1&gt;</code>은 맨 위 제목, <code>&lt;section&gt;</code>은 각 구역, <code>&lt;h2&gt;</code>는 구역 제목이에요.</li>" +
      "<li><code>&lt;script&gt;</code>는 OX 퀴즈를 누르면 정답을 알려 주는 JavaScript 코드예요.</li>" +
      "<li>코드를 복사해 메모장에 붙여 넣고 <b>파일이름.html</b>로 저장하면 나만의 웹 파일이 돼요.</li></ul>" +
      '<pre class="code"><code>' + esc(code) + "</code></pre></div>";
    o.hidden = false;
    document.body.style.overflow = "hidden";
    const f = o.querySelector("[data-autofocus]");
    if (f) f.focus();
  };
  A["web-copy-code"] = () => {
    CL.copyText(SG.fullHtml(CL.webSite())).then((ok) => CL.toast(ok ? "📋 코드를 복사했어요" : "복사하지 못했어요"));
  };
})();
