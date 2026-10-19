/* ② 기후 적응 디자인 의뢰소 — 미션 1 의뢰 받기 · 2 단서 보드 · 3 아이디어 대결 · 4 도전장 (고칠 필요 없음) */
(function () {
  "use strict";
  const CL = window.CL;
  if (!CL || !CL.ok) return;
  const MS = window.MISSIONS;
  const esc = CL.esc;
  CL.views = CL.views || {};
  CL.actions = CL.actions || {};
  CL.inputHandlers = CL.inputHandlers || [];
  const A = CL.actions;

  if (!MS || !MS.areas) {
    CL.views.mission = () => '<section class="panel error-box"><h2>missions.js 파일을 읽지 못했어요</h2><p>mission 폴더의 missions.js 형식(쉼표, 따옴표, 대괄호)을 확인해 주세요.</p></section>';
    return;
  }

  const STAGES = [
    { n: 1, icon: "📨", label: "의뢰 받기" },
    { n: 2, icon: "🧩", label: "단서 보드" },
    { n: 3, icon: "⚔️", label: "아이디어 대결" },
    { n: 4, icon: "🥊", label: "도전장" },
  ];
  const LETTERS = ["A", "B", "C"];
  const Q_STARTERS = ["왜 ___일까?", "어떻게 하면 ___할 수 있을까?", "___은(는) 실제로 얼마나 효과가 있을까?"];
  const CRIT = MS.criteria || [];
  const imgSrc = (p) => (!p ? "" : /^(data:|https?:|\/|\.\.\/)/.test(p) ? p : "../" + p);
  const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

  /* ---------- 저장 ---------- */
  function blank() {
    const S = CL.state || {};
    return {
      area: CL.AREA_IDS.indexOf(S.area) >= 0 ? S.area : CL.AREA_IDS[0], client: "", accepted: false,
      region: S.region || CL.regions()[0], scen: S.scen || "low", period: 2, stage: 1,
      clues: { climate: [], research: [], client: [], clientNote: "", question: "" },
      ideas: [{ name: "", desc: "" }, { name: "", desc: "" }, { name: "", desc: "" }],
      scores: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
      winner: -1, why: "", challenges: [], seen: [], rerolls: 0,
    };
  }
  function getM() {
    const r = CL.load("mission", null);
    const m = blank();
    if (!r || typeof r !== "object") return m;
    if (CL.AREAS[r.area] && MS.areas[r.area]) m.area = r.area;
    const cfg = MS.areas[m.area];
    if (cfg.clients.some((c) => c.id === r.client)) m.client = r.client;
    m.accepted = r.accepted === true && !!m.client;
    if (CL.regions().indexOf(r.region) >= 0) m.region = r.region;
    if (CL.SCENS.indexOf(r.scen) >= 0) m.scen = r.scen;
    if ([1, 2, 3].indexOf(r.period) >= 0) m.period = r.period;
    if ([1, 2, 3, 4].indexOf(r.stage) >= 0) m.stage = r.stage;
    const c = r.clues || {};
    m.clues.climate = Array.isArray(c.climate) ? c.climate.filter((x) => typeof x === "string").slice(0, 4) : [];
    m.clues.research = Array.isArray(c.research) ? c.research.filter((x) => x && typeof x === "object").slice(0, 3)
      .map((x) => ({ text: str(x.text, 600), src: str(x.src, 200), card: str(x.card, 40) })) : [];
    m.clues.client = Array.isArray(c.client) ? c.client.filter((x) => typeof x === "string").slice(0, 2) : [];
    m.clues.clientNote = str(c.clientNote, 200);
    m.clues.question = str(c.question, 200);
    if (Array.isArray(r.ideas)) m.ideas = [0, 1, 2].map((i) => ({ name: str(r.ideas[i] && r.ideas[i].name, 60), desc: str(r.ideas[i] && r.ideas[i].desc, 200) }));
    if (Array.isArray(r.scores)) m.scores = [0, 1, 2].map((i) => CRIT.map((_, k) => { const v = r.scores[i] && r.scores[i][k]; return [1, 2, 3].indexOf(v) >= 0 ? v : 0; }));
    m.winner = [0, 1, 2].indexOf(r.winner) >= 0 ? r.winner : -1;
    m.why = str(r.why, 600);
    m.challenges = Array.isArray(r.challenges) ? r.challenges.filter((x) => x && typeof x.text === "string").slice(0, 2)
      .map((x) => ({ id: str(x.id, 40), text: str(x.text, 300), answer: str(x.answer, 800), fix: str(x.fix, 300) })) : [];
    m.seen = Array.isArray(r.seen) ? r.seen.filter((x) => typeof x === "string") : [];
    m.rerolls = typeof r.rerolls === "number" ? r.rerolls : 0;
    return m;
  }
  function saveM(m) {
    CL.save("mission", m);
  }
  const areaCfg = (m) => MS.areas[m.area];
  const clientOf = (m) => areaCfg(m).clients.filter((c) => c.id === m.client)[0] || null;
  const named = (m) => m.ideas.map((x, i) => (x.name.trim() ? i : -1)).filter((i) => i >= 0);
  const total = (m, i) => m.scores[i].reduce((a, b) => a + b, 0);

  function status(m) {
    const research = m.clues.research.filter((r) => r.text.trim() && r.src.trim()).length;
    const clientClues = m.clues.client.length + (m.clues.clientNote.trim() ? 1 : 0);
    const n = named(m);
    return {
      d1: m.accepted && !!m.client,
      climate: m.clues.climate.length, research: research, clientClues: clientClues, question: !!m.clues.question.trim(),
      d2: m.clues.climate.length >= 2 && research >= 1 && clientClues >= 1 && !!m.clues.question.trim(),
      ideas: n.length, rated: n.length === 3 && n.every((i) => m.scores[i].every((v) => v > 0)),
      d3: n.length === 3 && n.every((i) => m.scores[i].every((v) => v > 0)) && m.winner >= 0 && m.why.trim().length >= 5,
      answered: m.challenges.filter((c) => c.answer.trim().length >= 5).length,
      d4: m.challenges.length >= 2 && m.challenges.every((c) => c.answer.trim().length >= 5),
    };
  }
  function clueCount(st) {
    return Math.min(st.climate, 2) + Math.min(st.research, 1) + Math.min(st.clientClues, 1) + (st.question ? 1 : 0);
  }
  CL.mission = { get: getM, save: saveM, area: areaCfg, client: clientOf, status: status, total: total, criteria: CRIT, letters: LETTERS, imgSrc: imgSrc };

  /* ---------- 숫자 실감 (기상청 수치를 단순 계산으로만 바꿔 보여 줌) ---------- */
  function feel(id, v, n) {
    const out = [];
    if (v == null) return out;
    if (id === "heat" || id === "tropical") {
      out.push("1년 365일 중 약 " + CL.fmtNum((v / 365) * 100, 0) + "%에 해당하는 날 수예요. (1년 합계이고, 연속으로 이어진다는 뜻은 아니에요)");
      if (v >= 30) out.push("30일을 한 달로 치면 약 " + CL.fmtNum(v / 30, 1) + "달 치예요.");
      if (n && v / n >= 1.95) out.push("현재(" + CL.fmtVal(id, n) + "일)의 약 " + CL.fmtNum(v / n, 1) + "배예요.");
    } else if (id === "temp" && n != null) {
      const d = v - n;
      out.push("현재보다 " + CL.fmtNum(Math.abs(d), 1) + "℃ " + (d >= 0 ? "높아요" : "낮아요") + ". 1년 평균이라 계절별 차이는 따로 확인해요.");
    } else if ((id === "precip" || id === "rain5") && n) {
      const d = v - n;
      out.push("현재보다 약 " + CL.fmtNum(Math.abs((d / n) * 100), 0) + "% " + (d >= 0 ? "많아요" : "적어요") + " (" + (d >= 0 ? "+" : "−") + CL.fmtVal(id, Math.abs(d)) + "mm).");
    }
    return out;
  }

  /* ---------- 공통 조각 ---------- */
  function mseg(act, items, cur, label) {
    return CL.ui.seg(act, items, cur, label);
  }
  function climateCtrl(m) {
    return CL.ui.ctrlRow([
      ["지역", mseg("m-region", CL.regions().map((r) => ({ v: r, label: r, sw: CL.regionColor(r) })), m.region, "지역")],
      ["시나리오", mseg("m-scen", CL.SCENS.map((s) => ({ v: s, label: CL.scenCode(s), sub: CL.scenName(s), sw: "s-" + s })), m.scen, "시나리오")],
      ["대비할 기간", mseg("m-period", [1, 2, 3].map((p) => ({ v: p, label: CL.PERIODS[p].short, sub: CL.PERIODS[p].years })), m.period, "기간")],
    ]);
  }
  function stars(st) {
    return [st.d1, st.d2, st.d3, st.d4].filter(Boolean).length;
  }
  function navHtml(m, st) {
    const done = [st.d1, st.d2, st.d3, st.d4];
    return '<div class="mnav" id="mNav">' + STAGES.map((s, i) =>
      '<button class="mnav-step' + (done[i] ? " done" : "") + '" data-act="m-stage" data-v="' + s.n + '" aria-current="' + (m.stage === s.n ? "step" : "false") + '"' +
      (!m.accepted && s.n > 1 ? " disabled" : "") + '><span class="mnav-ic">' + (done[i] ? "⭐" : s.icon) + "</span><b>미션 " + s.n + "</b><span>" + esc(s.label) + "</span></button>"
    ).join("") + '<span class="mnav-stars" aria-label="모은 별">⭐ ' + stars(st) + "/4</span></div>";
  }
  function briefBar(m) {
    const c = clientOf(m);
    if (!c) return "";
    return '<div class="brief-bar"><span class="brief-who">' + esc(c.emoji) + " <b>" + esc(c.name) + "</b> " + esc(c.role) + ' <small>(가상 인물)</small></span>' +
      '<span class="brief-where">' + esc(m.region + " · " + CL.scenCode(m.scen) + " " + CL.scenName(m.scen) + " · " + CL.periodLabel(m.period)) + "</span>" +
      '<button class="link-btn inline" data-act="m-stage" data-v="1">의뢰 다시 보기</button></div>';
  }

  /* ======================================================================
     화면
     ====================================================================== */
  CL.views.mission = function () {
    const m = getM();
    CL.state.area = m.area;
    if (!m.accepted) m.stage = 1;
    const st = status(m);
    let h = '<div class="section-title"><h2>② 기후 적응 디자인 의뢰소</h2><p>의뢰를 받고 → 단서를 모으고 → 아이디어를 겨루고 → 도전장에 답하면 ③ 제안서가 완성돼요.</p></div>';
    h += navHtml(m, st);
    h += '<div class="g-' + esc(m.area) + ' area-body mission-body">';
    if (m.stage === 1) h += stage1(m, st);
    else if (m.stage === 2) h += stage2(m, st);
    else if (m.stage === 3) h += stage3(m, st);
    else h += stage4(m, st);
    h += "</div>";
    return h;
  };

  /* ---------- 미션 1 · 의뢰 받기 ---------- */
  function stage1(m, st) {
    const cfg = areaCfg(m);
    let h = '<section class="panel"><div class="panel-head"><div><h3>📨 미션 1 · 의뢰 받기</h3><p class="panel-desc">어느 분야의 의뢰를 맡을지 고르고, 의뢰인을 정해요.</p></div></div>';
    h += '<div class="area-tiles">' + CL.AREA_IDS.map((id) => {
      const x = CL.AREAS[id];
      return '<button class="area-tile g-' + id + '" data-act="m-area" data-v="' + id + '" aria-pressed="' + (m.area === id) + '">' +
        (x.image ? '<img src="' + esc(imgSrc(x.image)) + '" alt="' + esc(x.imageAlt || "") + '" loading="lazy">' : "") +
        '<span class="area-name"><span aria-hidden="true">' + esc(x.icon) + "</span> " + esc(x.name) + " <small>" + esc(x.hanja || "") + "</small></span></button>";
    }).join("") + "</div>";
    h += '<p class="note center">이미지는 교육용 상상 그림이에요.</p>';
    h += '<div class="clients">' + cfg.clients.map((c) =>
      '<button class="client-card" data-act="m-client" data-v="' + esc(c.id) + '" aria-pressed="' + (m.client === c.id) + '">' +
      '<span class="client-top"><span class="client-emoji" aria-hidden="true">' + esc(c.emoji) + '</span><span><b>' + esc(c.name) + "</b> <small>가상 인물</small><br><span class=\"muted\">" + esc(c.role) + "</span></span></span>" +
      '<span class="client-req">“' + esc(c.request) + '”</span>' +
      '<span class="client-cond">' + c.conditions.map((x) => "<span>✔ " + esc(x) + "</span>").join("") + "</span></button>"
    ).join("") + "</div></section>";

    h += '<section class="panel"><div class="panel-head"><div><h3>🌡️ 기후 브리핑</h3><p class="panel-desc">의뢰인에게 닥칠 미래 기후예요. 대비할 지역·시나리오·기간을 골라요.</p></div></div>';
    h += climateCtrl(m);
    h += '<div class="brief-cards">' + cfg.keyInds.filter((id) => CL.IND[id]).map((id) => {
      const v = CL.val(m.region, id, m.scen, m.period);
      const n = CL.val(m.region, id, m.scen, 0);
      return '<div class="brief-card"><span class="icard-name">' + esc(CL.indName(id)) + "</span>" +
        (v == null ? '<span class="icard-value empty">자료 없음</span>' : '<span class="icard-value">' + CL.fmtVal(id, v) + "<small>" + esc(CL.unit(id)) + "</small></span>") +
        CL.ui.deltaBadge(id, n, v) + '<ul class="feel">' + feel(id, v, n).map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul></div>";
    }).join("") + "</div>";
    h += '<p class="note">ℹ️ ' + (CL.isBaseRegion(m.region) ? "수치는 모두 기상청 기후변화 시나리오 전망(20년 평균)이에요. 현재(2000–2019)는 기후모델이 재현한 값이에요."
      : "이 지역 수치는 ⑤ 자료 찾기에서 내가 넣은 자료예요. 출처를 꼭 함께 밝혀요.") + " ‘숫자 실감’은 같은 수치를 단순 계산으로 바꿔 본 거예요.</p></section>";

    const c = clientOf(m);
    h += '<div class="next-row">' + (m.accepted
      ? '<button class="btn primary" data-act="m-stage" data-v="2">🧩 미션 2 · 단서 모으러 가기 →</button>'
      : '<button class="btn primary" data-act="m-accept"' + (c ? "" : " disabled") + ">📨 " + (c ? esc(c.name) + "님의 의뢰 수락하기" : "의뢰인을 먼저 골라요") + "</button>") + "</div>";
    return h;
  }

  /* ---------- 미션 2 · 단서 보드 ---------- */
  function slotCount(have, need) {
    return (have >= need ? "✓ " : "") + Math.min(have, need) + "/" + need;
  }
  function slotHead(icon, title, have, need, help, id) {
    const ok = have >= need;
    return '<div class="slot-head"><b>' + icon + " " + esc(title) + '</b><span class="slot-count' + (ok ? " ok" : "") + '"' + (id ? ' id="' + id + '"' : "") + ">" + slotCount(have, need) + "</span></div>" +
      (help ? '<p class="slot-help">' + esc(help) + "</p>" : "");
  }
  function setSlot(id, have, need) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = slotCount(have, need);
    el.classList.toggle("ok", have >= need);
  }
  function stage2(m, st) {
    const cfg = areaCfg(m);
    const a = CL.AREAS[m.area];
    const c = clientOf(m);
    const S = CL.state;
    let h = briefBar(m);
    h += '<section class="panel"><div class="panel-head"><div><h3>🧩 미션 2 · 단서 보드</h3><p class="panel-desc">제안서의 근거가 될 단서를 모아요. 칸이 모두 채워지면 별을 받아요.</p></div>' +
      '<span class="board-count" id="mClueCount">단서 ' + clueCount(st) + "/5</span></div>";
    h += '<div class="board">';

    // 기후 단서
    h += '<div class="slot-group">' + slotHead("🌡️", "기후 단서", st.climate, 2, "기상청 수치를 2개 이상 골라요. 지역·시나리오·기간·단위가 함께 들어가요.");
    h += m.clues.climate.length ? '<ul class="evi-picked">' + m.clues.climate.map((x, i) => "<li><span>📊 " + esc(x) + '</span><button data-act="m-clue-del" data-i="' + i + '" aria-label="단서 빼기">×</button></li>').join("") + "</ul>" : "";
    if (m.clues.climate.length < 4) {
      const open = S.mPick === "climate";
      h += '<button class="btn small" data-act="m-pick" data-v="climate" aria-expanded="' + open + '">' + (open ? "닫기" : "＋ 기후 단서 고르기") + "</button>";
      if (open) {
        h += '<div class="picker">' + CL.ui.ctrlRow([["기간", mseg("m-period", [1, 2, 3].map((p) => ({ v: p, label: CL.PERIODS[p].short, sub: CL.PERIODS[p].years })), m.period, "기간")]]) +
          '<div class="cards">' + CL.indsFor(m.region).map((id) => {
            const v = CL.val(m.region, id, m.scen, m.period);
            const n = CL.val(m.region, id, m.scen, 0);
            const snap = CL.snapshot(m.region, id, m.scen, m.period);
            const on = m.clues.climate.indexOf(snap) >= 0;
            return '<button class="icard" data-act="m-clue-add" data-snap="' + esc(snap) + '" aria-pressed="' + on + '"' + (v == null || on ? " disabled" : "") + ">" +
              '<span class="icard-name">' + esc(CL.indName(id)) + "</span>" +
              (v == null ? '<span class="icard-value empty">자료 없음</span>' : '<span class="icard-value">' + CL.fmtVal(id, v) + "<small>" + esc(CL.unit(id)) + "</small></span>") +
              CL.ui.deltaBadge(id, n, v) + '<span class="graph-hint">' + (on ? "✓ 담았어요" : "눌러서 담기") + "</span></button>";
          }).join("") + "</div>";
        const ev = CL.getEvidence().filter((x) => m.clues.climate.indexOf(x) < 0);
        if (ev.length) {
          h += '<span class="field-label">① 기후 예측에서 📌 담아 둔 근거</span><div class="chips">' + ev.map((x) =>
            '<button class="chip" data-act="m-clue-add" data-snap="' + esc(x) + '">＋ ' + esc(x) + "</button>").join("") + "</div>";
        }
        h += "</div>";
      }
    }
    h += "</div>";

    // 조사 단서
    h += '<div class="slot-group">' + slotHead("🔎", "조사 단서", st.research, 1, "믿을 만한 자료에서 확인한 사실을 내 말로 쓰고, 출처를 꼭 적어요. 출처가 있어야 단서가 완성돼요.", "mSlotRes");
    h += m.clues.research.map((r, i) =>
      '<div class="res-item' + (r.text.trim() && r.src.trim() ? " ok" : "") + '"><textarea class="idea short" data-m-res="' + i + '" data-f="text" maxlength="600" placeholder="확인한 사실 (예: ○○ 작물은 … 조건에서 잘 자란다)">' + esc(r.text) + "</textarea>" +
      '<div class="res-src"><input class="text-input" data-m-res="' + i + '" data-f="src" maxlength="200" placeholder="출처 (예: 농사로 누리집, 확인한 날짜)" value="' + esc(r.src) + '">' +
      '<button class="q-del" data-act="m-res-del" data-i="' + i + '" aria-label="조사 단서 빼기">×</button></div></div>').join("");
    if (m.clues.research.length < 3) {
      h += '<button class="btn small" data-act="m-res-add">＋ 조사 단서 직접 쓰기</button>';
      const open = S.mPick === "cards";
      h += ' <button class="btn small ghost" data-act="m-pick" data-v="cards" aria-expanded="' + open + '">' + (open ? "카드 닫기" : "🔎 탐색 카드에서 가져오기") + "</button>";
      if (open) {
        h += '<div class="picker"><p class="note">카드 내용은 출발점이에요. 가져온 뒤 아래 ‘답을 찾을 곳’에서 확인하고 출처를 적어요.</p><div class="chips">' +
          (CL.X[m.area].cards || []).map((cd) => '<button class="chip" data-act="m-res-card" data-v="' + esc(cd.id) + '">' + esc((cd.emoji || "") + " " + cd.name) + "</button>").join("") + "</div></div>";
      }
    }
    h += '<details class="more"><summary>답을 찾을 곳 보기</summary><ul class="research">' + a.research.map((x) =>
      "<li>" + esc(x.text) + (x.link ? ' — <a href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(x.site || "바로가기") + " ↗</a>" : "") + "</li>").join("") + "</ul></details></div>";

    // 의뢰인 단서
    h += '<div class="slot-group">' + slotHead("👤", "의뢰인 단서", st.clientClues, 1, "의뢰인이 꼭 지켜 달라고 한 조건을 1~2개 골라요.", "mSlotClient");
    h += '<div class="chips">' + (c ? c.conditions : []).map((x) => {
      const on = m.clues.client.indexOf(x) >= 0;
      return '<button class="chip" data-act="m-client-clue" data-v="' + esc(x) + '" aria-pressed="' + on + '">' + esc(x) + "</button>";
    }).join("") + "</div>";
    h += '<input class="text-input" data-m-clientnote="1" maxlength="200" placeholder="직접 알아낸 조건이 있다면 (선택)" value="' + esc(m.clues.clientNote) + '"></div>';

    // 탐구 질문
    h += '<div class="slot-group">' + slotHead("❓", "탐구 질문", st.question ? 1 : 0, 1, "의뢰를 해결하려면 무엇을 더 알아야 할까요? 답을 찾아볼 수 있는 질문 하나를 정해요.", "mSlotQ");
    h += '<input class="text-input" id="mQuestion" data-m-question="1" maxlength="200" placeholder="예: 더운 날 급식에서 식중독을 줄이는 방법은 무엇일까?" value="' + esc(m.clues.question) + '">';
    h += '<div class="chips small-chips">' + Q_STARTERS.concat(c ? c.questions : []).map((x) =>
      '<button class="chip" data-act="m-q" data-v="' + esc(x) + '">' + esc(x) + "</button>").join("") + "</div></div>";

    h += "</div></section>";
    h += '<div class="next-row"><button class="btn" data-act="m-stage" data-v="1">← 의뢰 다시 보기</button><button class="btn primary" data-act="m-stage" data-v="3">⚔️ 미션 3 · 아이디어 대결로 →</button></div>';
    return h;
  }

  /* ---------- 미션 3 · 아이디어 대결 ---------- */
  function stage3(m, st) {
    const cfg = CL.X[m.area];
    const rules = (CL.AREAS[m.area].rules || []).map((r) => Object.assign(CL.evalRule(r, m.region, m.scen, m.period), { rule: r })).filter((x) => x.status === "on");
    let h = briefBar(m);
    h += '<section class="panel"><div class="panel-head"><div><h3>⚔️ 미션 3 · 아이디어 대결</h3><p class="panel-desc">아이디어 3개를 내고, 기준별로 1~3점을 매겨 하나를 골라요.</p></div></div>';
    h += '<span class="field-label">💡 아이디어 재료 <small>누르면 빈 칸에 들어가요</small></span><div class="chips small-chips">' +
      rules.map((x) => '<button class="chip" data-act="m-idea-fill" data-name="' + esc(x.rule.idea) + '" data-desc="">📊 ' + esc(x.rule.idea) + "</button>").join("") +
      (cfg.cards || []).map((cd) => '<button class="chip" data-act="m-idea-fill" data-name="' + esc(cd.name) + '" data-desc="' + esc((cd.fact || cd.how || "").slice(0, 120)) + '">' + esc((cd.emoji || "🔎") + " " + cd.name) + "</button>").join("") + "</div>";
    h += '<p class="note">📊 표시는 지금 기후 자료(' + esc(m.region + " · " + CL.scenCode(m.scen) + " · " + CL.periodLabel(m.period)) + ")에서 떠오른 아이디어예요. 내 아이디어를 직접 써도 좋아요.</p>";

    h += '<div class="duel">' + [0, 1, 2].map((i) => {
      const x = m.ideas[i];
      const win = m.winner === i;
      return '<div class="duel-card' + (win ? " win" : "") + '"><span class="duel-letter">' + (win ? "👑 " : "") + LETTERS[i] + "</span>" +
        '<input class="text-input" data-m-idea="' + i + '" data-f="name" maxlength="60" placeholder="아이디어 ' + LETTERS[i] + ' 이름" value="' + esc(x.name) + '">' +
        '<textarea class="idea short" data-m-idea="' + i + '" data-f="desc" maxlength="200" placeholder="어떻게 하는 건지 한두 문장으로">' + esc(x.desc) + "</textarea>" +
        (x.name || x.desc ? '<button class="link-btn inline" data-act="m-idea-clear" data-i="' + i + '">지우기</button>' : "") + "</div>";
    }).join("") + "</div></section>";

    // 의사결정 매트릭스
    const n = [0, 1, 2];
    const totals = n.map((i) => total(m, i));
    const best = Math.max.apply(null, totals);
    h += '<section class="panel"><div class="panel-head"><div><h3>📋 의사결정 매트릭스</h3><p class="panel-desc">칸을 누를 때마다 ★ 1 → 2 → 3점으로 바뀌어요. 점수는 내 판단이에요. 모둠 친구와 근거를 들어 비교해 보세요.</p></div></div>';
    h += '<div class="table-scroll"><table class="dtable matrix"><thead><tr><th>기준</th>' + n.map((i) => "<th>" + LETTERS[i] + '<small id="mTh' + i + '">' + esc(m.ideas[i].name) + "</small></th>").join("") + "</tr></thead><tbody>" +
      CRIT.map((c, k) => "<tr><th>" + esc(c.label) + "<small>" + esc(c.help) + "</small></th>" + n.map((i) => {
        const v = m.scores[i][k];
        const off = !m.ideas[i].name.trim();
        return '<td><button class="mcell" data-act="m-score" data-i="' + i + '" data-k="' + k + '"' + (off ? " disabled" : "") + ' aria-label="' + LETTERS[i] + " " + esc(c.label) + " " + v + '점">' +
          (v ? '<span class="mstars">' + "★".repeat(v) + '<i>' + "★".repeat(3 - v) + "</i></span>" : '<span class="mempty">' + (off ? "–" : "눌러서 점수") + "</span>") + "</button></td>";
      }).join("") + "</tr>").join("") +
      '<tr class="mtotal"><th>합계</th>' + n.map((i) => "<td><b>" + (m.ideas[i].name.trim() ? totals[i] + "점" : "–") + "</b>" + (best > 0 && totals[i] === best && m.ideas[i].name.trim() ? " 🔝" : "") + "</td>").join("") + "</tr></tbody></table></div>";
    h += '<span class="field-label">👑 최종 아이디어 고르기 <small>점수가 가장 높지 않아도 괜찮아요. 이유를 설명할 수 있으면 돼요.</small></span><div class="chips">' +
      n.map((i) => '<button class="chip" data-act="m-winner" data-i="' + i + '" aria-pressed="' + (m.winner === i) + '"' + (m.ideas[i].name.trim() ? "" : " disabled") + ">👑 " + LETTERS[i] + ' <span class="mw-name">' + esc(m.ideas[i].name) + "</span></button>").join("") + "</div>";
    h += '<label class="field-label" for="mWhy">왜 이 아이디어를 골랐나요?</label><textarea class="idea short" id="mWhy" data-m-why="1" maxlength="600" placeholder="예: B는 폭염일수 증가에 가장 잘 대응하고 의뢰인의 예산 조건도 지킬 수 있어서 골랐어요. 다만 비용 점수가 낮은 점은 보완이 필요해요.">' + esc(m.why) + "</textarea>";
    h += "</section>";
    h += '<div class="next-row"><button class="btn" data-act="m-stage" data-v="2">← 단서 보드</button><button class="btn primary" data-act="m-stage" data-v="4">🥊 미션 4 · 도전장 받기 →</button></div>';
    return h;
  }

  /* ---------- 미션 4 · 도전장 ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pickChallenges(m, count, exclude) {
    const w = m.ideas[m.winner] || { name: "", desc: "" };
    const text = w.name + " " + w.desc;
    const bank = areaCfg(m).challenges.filter((c) => exclude.indexOf(c.id) < 0);
    const matched = shuffle(bank.filter((c) => (c.keys || []).some((k) => k && text.indexOf(k) >= 0)));
    const rest = shuffle(bank.filter((c) => matched.indexOf(c) < 0));
    const common = shuffle((MS.common || []).filter((c) => exclude.indexOf(c.id) < 0));
    // 아이디어에 맞는 영역 도전장 1장 + 공통 도전장 1장을 먼저, 모자라면 나머지에서
    const order = matched.slice(0, 1).concat(common.slice(0, 1), matched.slice(1), rest, common.slice(1));
    const out = [];
    order.forEach((c) => { if (out.length < count && !out.some((o) => o.id === c.id)) out.push(c); });
    return out.map((c) => ({ id: c.id, text: c.text, answer: "", fix: "" }));
  }
  function stage4(m, st) {
    let h = briefBar(m);
    h += '<section class="panel"><div class="panel-head"><div><h3>🥊 미션 4 · 도전장</h3><p class="panel-desc">내 아이디어에 날아온 질문이에요. 근거를 들어 답하고, 필요하면 아이디어를 보완해요.</p></div></div>';
    if (m.winner < 0) {
      return h + '<p class="empty-note">미션 3에서 최종 아이디어를 먼저 골라 주세요.</p><div class="next-row left"><button class="btn primary" data-act="m-stage" data-v="3">⚔️ 아이디어 대결로</button></div></section>';
    }
    const w = m.ideas[m.winner];
    h += '<div class="winner-box">👑 내 최종 아이디어 <b>' + LETTERS[m.winner] + ". " + esc(w.name) + "</b>" + (w.desc ? "<span>" + esc(w.desc) + "</span>" : "") + "</div>";
    if (!m.challenges.length) {
      h += '<div class="next-row left"><button class="btn primary" data-act="m-draw">🥊 도전장 2장 받기</button></div>';
    } else {
      h += '<div class="challenges">' + m.challenges.map((c, i) =>
        '<div class="challenge' + (c.answer.trim().length >= 5 ? " cleared" : "") + '"><div class="challenge-head"><b>🥊 도전장 ' + (i + 1) + "</b>" +
        (c.answer.trim().length >= 5 ? '<span class="badge">✓ 답함</span>' : m.rerolls < 2 ? '<button class="link-btn inline" data-act="m-reroll" data-i="' + i + '">🔄 다른 도전장 (남은 기회 ' + (2 - m.rerolls) + ")</button>" : "") + "</div>" +
        '<p class="challenge-q">' + esc(c.text) + "</p>" +
        '<textarea class="idea short" data-m-ch="' + i + '" data-f="answer" maxlength="800" placeholder="내 답변: 자료나 조사 내용을 근거로 들어 써요.">' + esc(c.answer) + "</textarea>" +
        '<input class="text-input" data-m-ch="' + i + '" data-f="fix" maxlength="300" placeholder="보완할 점 (선택) 예: 겨울에는 접을 수 있는 차양으로 바꾼다" value="' + esc(c.fix) + '"></div>').join("") + "</div>";
      h += '<p class="note">도전장은 정답이 정해진 문제가 아니에요. 확인할 수 없는 부분은 “추가 조사가 필요하다”고 솔직하게 쓰는 것도 좋은 답이에요.</p>';
    }
    h += "</section>";
    h += st.d4 ? '<div class="clear-box">🎉 도전장을 모두 이겨 냈어요! 이제 ③ 제안서를 완성해 보세요.</div>' : "";
    h += '<div class="next-row"><button class="btn" data-act="m-stage" data-v="3">← 아이디어 대결</button><button class="btn primary" data-act="tab" data-v="proposal">📄 ③ 제안서 완성하기 →</button></div>';
    return h;
  }

  /* ======================================================================
     조작
     ====================================================================== */
  function edit(fn, opts) {
    const m = getM();
    if (fn(m) === false) return;
    saveM(m);
    CL.render(opts);
  }
  function syncState(m) {
    const S = CL.state;
    S.area = m.area; S.region = m.region; S.scen = m.scen; S.period = m.period;
    CL.persist();
  }
  A["m-stage"] = (b) => edit((m) => { m.stage = Number(b.dataset.v); CL.state.mPick = ""; }, { top: true });
  A["m-area"] = (b) => {
    const m = getM();
    const v = b.dataset.v;
    if (v === m.area) return;
    if (m.accepted && !window.confirm("다른 분야로 바꾸면 지금까지 모은 의뢰·단서·아이디어가 지워져요. 바꿀까요?")) return;
    const fresh = blank();
    fresh.area = v; fresh.region = m.region; fresh.scen = m.scen; fresh.period = m.period;
    saveM(fresh); syncState(fresh); CL.render();
  };
  A["m-client"] = (b) => edit((m) => {
    if (m.client === b.dataset.v) return false;
    if (m.accepted && !window.confirm("의뢰인을 바꾸면 의뢰인 단서와 도전장이 지워져요. 바꿀까요?")) return false;
    m.client = b.dataset.v; m.clues.client = []; m.challenges = []; m.seen = []; m.rerolls = 0;
  });
  A["m-region"] = (b) => edit((m) => { m.region = b.dataset.v; syncState(m); });
  A["m-scen"] = (b) => edit((m) => { m.scen = b.dataset.v; syncState(m); });
  A["m-period"] = (b) => edit((m) => { m.period = Number(b.dataset.v); syncState(m); });
  A["m-accept"] = () => edit((m) => { if (!m.client) return false; m.accepted = true; m.stage = 2; syncState(m); CL.toast("📨 의뢰를 수락했어요! 단서를 모아 봐요"); }, { top: true });
  A["m-pick"] = (b) => { CL.state.mPick = CL.state.mPick === b.dataset.v ? "" : b.dataset.v; CL.render(); };
  A["m-clue-add"] = (b) => edit((m) => {
    if (m.clues.climate.indexOf(b.dataset.snap) >= 0 || m.clues.climate.length >= 4) return false;
    m.clues.climate.push(b.dataset.snap);
    CL.toast("🌡️ 기후 단서를 담았어요");
  });
  A["m-clue-del"] = (b) => edit((m) => { m.clues.climate.splice(Number(b.dataset.i), 1); });
  A["m-res-add"] = () => edit((m) => { if (m.clues.research.length >= 3) return false; m.clues.research.push({ text: "", src: "", card: "" }); });
  A["m-res-card"] = (b) => edit((m) => {
    if (m.clues.research.length >= 3) return false;
    const cd = (CL.X[m.area].cards || []).filter((x) => x.id === b.dataset.v)[0];
    if (!cd) return false;
    m.clues.research.push({ text: cd.name + ": " + (cd.fact || cd.how || ""), src: "", card: cd.id });
    CL.state.mPick = "";
    CL.toast("🔎 카드 내용을 가져왔어요. 확인한 자료의 출처를 적어 주세요");
  });
  A["m-res-del"] = (b) => edit((m) => { m.clues.research.splice(Number(b.dataset.i), 1); });
  A["m-client-clue"] = (b) => edit((m) => {
    const v = b.dataset.v;
    const k = m.clues.client.indexOf(v);
    if (k >= 0) m.clues.client.splice(k, 1);
    else { if (m.clues.client.length >= 2) { CL.toast("의뢰인 단서는 2개까지 고를 수 있어요"); return false; } m.clues.client.push(v); }
  });
  A["m-q"] = (b) => {
    const v = b.dataset.v;
    if (v.indexOf("___") >= 0) {
      const el = document.getElementById("mQuestion");
      if (el) { el.value = v; el.focus(); const k = v.indexOf("___"); el.setSelectionRange(k, k + 3); }
      return;
    }
    edit((m) => { m.clues.question = v; });
  };
  A["m-idea-fill"] = (b) => edit((m) => {
    const i = m.ideas.findIndex((x) => !x.name.trim());
    if (i < 0) { CL.toast("빈 칸이 없어요. 아이디어 하나를 지운 뒤 넣어 주세요"); return false; }
    if (m.ideas.some((x) => x.name === b.dataset.name)) { CL.toast("이미 들어 있는 아이디어예요"); return false; }
    m.ideas[i] = { name: b.dataset.name, desc: b.dataset.desc || "" };
  });
  const answered = (m) => m.challenges.some((c) => c.answer.trim() || c.fix.trim());
  A["m-idea-clear"] = (b) => edit((m) => {
    const i = Number(b.dataset.i);
    if (m.winner === i && answered(m) && !window.confirm("최종 아이디어를 지우면 도전장 답변도 함께 지워져요. 지울까요?")) return false;
    m.ideas[i] = { name: "", desc: "" };
    m.scores[i] = CRIT.map(() => 0);
    if (m.winner === i) { m.winner = -1; m.challenges = []; m.seen = []; m.rerolls = 0; }
  });
  A["m-score"] = (b) => edit((m) => {
    const i = Number(b.dataset.i);
    const k = Number(b.dataset.k);
    m.scores[i][k] = m.scores[i][k] >= 3 ? 1 : m.scores[i][k] + 1;
  });
  A["m-winner"] = (b) => edit((m) => {
    const i = Number(b.dataset.i);
    if (m.winner === i) return false;
    if (answered(m) && !window.confirm("최종 아이디어를 바꾸면 지금까지 쓴 도전장 답변이 지워지고 새 도전장을 받아요. 바꿀까요?")) return false;
    m.winner = i; m.challenges = []; m.seen = []; m.rerolls = 0;
  });
  A["m-draw"] = () => edit((m) => {
    m.challenges = pickChallenges(m, 2, []);
    m.seen = m.challenges.map((c) => c.id);
    CL.toast("🥊 도전장이 도착했어요!");
  });
  A["m-reroll"] = (b) => edit((m) => {
    if (m.rerolls >= 2) return false;
    const i = Number(b.dataset.i);
    const keep = m.challenges.map((c) => c.id);
    const next = pickChallenges(m, 1, m.seen.concat(keep))[0];
    if (!next) { CL.toast("더 받을 수 있는 도전장이 없어요"); return false; }
    m.challenges[i] = next; m.seen.push(next.id); m.rerolls += 1;
  });

  // 글자 입력: 저장만 하고, 눈에 보이는 개수만 고쳐 그려요(입력 중 화면이 바뀌지 않게)
  CL.inputHandlers.push((e) => {
    const t = e.target;
    const d = t.dataset || {};
    if (!(d.mRes || d.mClientnote || d.mQuestion || d.mIdea || d.mWhy || d.mCh)) return;
    const m = getM();
    if (d.mRes) { const r = m.clues.research[Number(d.mRes)]; if (r) r[d.f] = t.value; }
    else if (d.mClientnote) m.clues.clientNote = t.value;
    else if (d.mQuestion) m.clues.question = t.value;
    else if (d.mIdea) { const x = m.ideas[Number(d.mIdea)]; if (x) x[d.f] = t.value; }
    else if (d.mWhy) m.why = t.value;
    else if (d.mCh) { const c = m.challenges[Number(d.mCh)]; if (c) c[d.f] = t.value; }
    saveM(m);
    const st = status(m);
    const cnt = document.getElementById("mClueCount");
    if (cnt) cnt.textContent = "단서 " + clueCount(st) + "/5";
    setSlot("mSlotRes", st.research, 1);
    setSlot("mSlotClient", st.clientClues, 1);
    setSlot("mSlotQ", st.question ? 1 : 0, 1);
    if (d.mRes) { const box = t.closest(".res-item"); const r = m.clues.research[Number(d.mRes)]; if (box && r) box.classList.toggle("ok", !!(r.text.trim() && r.src.trim())); }
    if (d.mIdea && d.f === "name") {
      // 이름을 쓰면 바로 점수 칸과 최종 선택 버튼이 열려요
      const i = Number(d.mIdea);
      const on = !!m.ideas[i].name.trim();
      const th = document.getElementById("mTh" + i);
      if (th) th.textContent = m.ideas[i].name;
      document.querySelectorAll('[data-act="m-score"][data-i="' + i + '"]').forEach((b) => {
        b.disabled = !on;
        const e2 = b.querySelector(".mempty");
        if (e2) e2.textContent = on ? "눌러서 점수" : "–";
      });
      const w = document.querySelector('[data-act="m-winner"][data-i="' + i + '"]');
      if (w) { w.disabled = !on; const s = w.querySelector(".mw-name"); if (s) s.textContent = m.ideas[i].name; }
    }
    if (d.mCh) { const box = t.closest(".challenge"); const c = m.challenges[Number(d.mCh)]; if (box && c) box.classList.toggle("cleared", c.answer.trim().length >= 5); }
    const nav = document.getElementById("mNav");
    if (nav) nav.outerHTML = navHtml(m, st);
    if (CL.renderTabs) CL.renderTabs();
  });

  /* ======================================================================
     나만의 웹(④)이 읽어 가는 정보 — 미션 기록에서 만들어 줌
     ====================================================================== */
  CL.cardById = (area, cid) => ((CL.X[area] || {}).cards || []).filter((c) => c.id === cid)[0] || null;
  CL.getQuestions = function (area) {
    const m = getM();
    if (m.area !== area || !m.clues.question.trim()) return [];
    const done = m.clues.research.filter((r) => r.text.trim());
    return [{ id: "m", q: m.clues.question, answer: done.map((r) => r.text.trim()).join("\n"), src: done.map((r) => r.src.trim()).filter(Boolean).join(", "), star: true }];
  };
  CL.getBuild = function (area) {
    const m = getM();
    return { name: "", picks: m.area === area ? m.clues.research.map((r) => r.card).filter(Boolean) : [], sel: {}, text: {} };
  };
  CL.getHyps = () => [];
  CL.designLines = function (area) {
    const m = getM();
    const w = m.area === area && m.winner >= 0 ? m.ideas[m.winner] : null;
    if (!w || !w.name.trim()) return { name: "", lines: [], desc: "", empty: true };
    const c = clientOf(m);
    const lines = [];
    if (c) lines.push({ k: "의뢰인", v: c.name + " (" + c.role + ", 가상 인물)" });
    if (m.clues.client.length) lines.push({ k: "의뢰 조건", v: m.clues.client.join(", ") });
    lines.push({ k: "대비한 기후", v: m.region + " · " + CL.scenCode(m.scen) + " · " + CL.periodLabel(m.period) });
    if (m.why.trim()) lines.push({ k: "선택 이유", v: m.why.trim() });
    return { name: w.name, lines: lines, desc: w.desc, empty: false };
  };
  CL.designCardHtml = function (area) {
    const d = CL.designLines(area);
    if (d.empty) return '<div class="dcard empty"><p>아직 최종 아이디어가 없어요.</p></div>';
    return '<div class="dcard g-' + esc(area) + '"><p class="dcard-kind">👑 최종 아이디어</p><h4>' + esc(d.name) + "</h4>" +
      "<dl>" + d.lines.map((l) => "<dt>" + esc(l.k) + "</dt><dd>" + esc(l.v) + "</dd>").join("") + "</dl>" +
      (d.desc ? '<p class="dcard-desc">' + esc(d.desc) + "</p>" : "") + "</div>";
  };
})();
