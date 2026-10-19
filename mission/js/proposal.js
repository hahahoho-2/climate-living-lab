/* ③ 기후 적응 디자인 제안서 — ② 의뢰소 기록을 모아 C-E-R-D 제안서로 완성 (고칠 필요 없음) */
(function () {
  "use strict";
  const CL = window.CL;
  if (!CL || !CL.ok || !CL.mission) return;
  const esc = CL.esc;
  const M = CL.mission;
  CL.views = CL.views || {};
  CL.actions = CL.actions || {};
  CL.inputHandlers = CL.inputHandlers || [];
  CL.changeHandlers = CL.changeHandlers || [];
  const A = CL.actions;

  const TEXT_KEYS = ["claim", "reasoning", "design", "effect", "peerGood", "peerMore", "changed", "date"];
  const CHECKS = [
    ["자료 해석", "지역·기간·시나리오·단위를 정확히 썼나?"],
    ["근거 추론", "기후 수치가 왜 이 제안으로 이어지는지 설명했나?"],
    ["의뢰 해결", "의뢰인의 조건과 실제 사용 장면을 고려했나?"],
    ["성찰", "한계·비용·환경 영향과 더 조사할 점을 밝혔나?"],
  ];
  const LINKERS = /그래서|때문에|왜냐하면|따라서|므로|그러므로|이유는|(으)?로 인해/;
  const BLANK = /_{3,}/;

  function getRep() {
    const r = CL.load("report", {}) || {};
    const out = { info: { grade: "", name: "", team: "" }, checks: [false, false, false, false] };
    TEXT_KEYS.forEach((k) => { out[k] = typeof r[k] === "string" ? r[k] : ""; });
    if (r.info && typeof r.info === "object") ["grade", "name", "team"].forEach((k) => { out.info[k] = typeof r.info[k] === "string" ? r.info[k] : ""; });
    if (Array.isArray(r.checks)) out.checks = [0, 1, 2, 3].map((i) => r.checks[i] === true);
    if (!out.date) out.date = CL.today();
    return out;
  }
  function saveRep(r) {
    CL.save("report", r);
  }

  /* ---------- 품질 코치 ---------- */
  // 형식만 확인해요. 내용이 맞는지는 친구·선생님과 함께 확인해요.
  function coach() {
    const r = getRep();
    const m = M.get();
    const st = M.status(m);
    const filled = (s, n) => String(s || "").trim().length >= (n || 4);
    const texts = [r.claim, r.reasoning, r.design];
    return [
      { k: "표지 정보", ok: !!(r.info.name.trim() || r.info.team.trim()), tip: "이름이나 모둠을 적어요.", go: "p-cover" },
      { k: "기후 단서 2개", ok: st.climate >= 2, tip: "기상청 수치 2개 이상이 근거가 돼요.", stage: 2 },
      { k: "출처 있는 조사", ok: st.research >= 1, tip: "조사한 사실에 출처를 적어야 믿을 수 있어요.", stage: 2 },
      { k: "탐구 질문", ok: st.question, tip: "의뢰를 풀기 위해 알아본 질문이 있어야 해요.", stage: 2 },
      { k: "아이디어 3개 비교", ok: st.rated, tip: "세 아이디어를 모든 기준으로 평가해요.", stage: 3 },
      { k: "선택 이유", ok: m.winner >= 0 && filled(m.why, 5), tip: "왜 이 아이디어를 골랐는지 써요.", stage: 3 },
      { k: "도전장 2개 답변", ok: st.d4, tip: "도전장 질문에 근거를 들어 답해요.", stage: 4 },
      { k: "주장(C)", ok: filled(r.claim, 10), tip: "무엇을 제안하는지 한 문장으로 써요.", go: "p-claim" },
      { k: "추론에 수치", ok: /\d/.test(r.reasoning), tip: "추론(R)에 기후 수치를 하나 이상 넣어요. 예: 폭염일수 35.6일", go: "p-reasoning" },
      { k: "추론에 연결어", ok: LINKERS.test(r.reasoning), tip: "‘그래서, 때문에, 따라서’처럼 원인과 결과를 잇는 말을 써요.", go: "p-reasoning" },
      { k: "빈칸 없음", ok: texts.some((t) => t.trim()) && !texts.some((t) => BLANK.test(t)), tip: "문장 틀의 빈칸(____)을 내 말로 채워요.", go: "p-claim" },
      { k: "제안(D)", ok: filled(r.design, 10), tip: "제안할 모습과 사용 방법을 써요.", go: "p-design" },
      { k: "효과와 한계", ok: filled(r.effect, 10), tip: "좋은 점만이 아니라 한계·비용·환경 영향도 써요.", go: "p-effect" },
      { k: "피드백·성찰", ok: filled(r.peerGood) || filled(r.peerMore) || filled(r.changed), tip: "발표 뒤 친구의 의견과 내 생각의 변화를 적어요.", go: "p-peerGood" },
      { k: "자기 점검", ok: r.checks.every(Boolean), tip: "네 가지 기준으로 스스로 점검해요.", go: "p-checks" },
    ];
  }
  CL.reportProgress = function () {
    const list = coach();
    return Math.round((list.filter((x) => x.ok).length / list.length) * 100);
  };
  function level(p) {
    return p >= 100 ? "🏆 제안서 완성" : p >= 80 ? "🥇 거의 다 왔어요" : p >= 50 ? "🥈 절반을 넘었어요" : p >= 20 ? "🥉 시작이 좋아요" : "📝 시작해 볼까요";
  }

  /* ---------- 자동으로 모이는 내용 ---------- */
  function predLines(region, scen) {
    const all = CL.getPreds ? CL.getPreds() : {};
    return CL.indsFor(region).map((id) => {
      const p = all[region + "|" + id + "|" + scen];
      if (!p || (CL.num(p.p2) == null && CL.num(p.p3) == null)) return null;
      const s = CL.series(region, id, scen);
      const f = (v) => (CL.num(v) == null ? "–" : CL.fmtNum(CL.num(v), Math.max(CL.decOf(id), 1)));
      return CL.indName(id) + ": 내 예측 중반기 " + f(p.p2) + " · 후반기 " + f(p.p3) + CL.unitShort(id) + " → 전망 " + f(s[2]) + " · " + f(s[3]) + CL.unitShort(id);
    }).filter(Boolean);
  }
  function dataTable(region, scen, period) {
    return '<div class="table-scroll"><table class="dtable"><caption>' + esc(region + " · " + CL.scenFull(scen)) + '</caption><thead><tr><th>기후 지표</th><th>단위</th>' +
      CL.PERIODS.map((p, i) => "<th" + (i === period ? ' class="col-sel"' : "") + ">" + esc(p.short) + "<br><small>" + esc(p.years) + "</small></th>").join("") + "</tr></thead><tbody>" +
      CL.indsFor(region).map((id) => "<tr><th>" + esc(CL.indName(id)) + "</th><td>" + esc(CL.unit(id)) + "</td>" +
        CL.series(region, id, scen).map((v, i) => "<td" + (i === period ? ' class="col-sel"' : "") + ">" + (v == null ? "–" : CL.fmtVal(id, v)) + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></div>";
  }
  function collect() {
    const m = M.get();
    const r = getRep();
    const c = M.client(m);
    const a = CL.AREAS[m.area];
    const w = m.winner >= 0 ? m.ideas[m.winner] : null;
    const research = m.clues.research.filter((x) => x.text.trim());
    const conds = m.clues.client.concat(m.clues.clientNote.trim() ? [m.clues.clientNote.trim()] : []);
    return { m: m, r: r, c: c, a: a, w: w, research: research, conds: conds, preds: predLines(m.region, m.scen) };
  }

  /* ---------- 화면 ---------- */
  function ta(key, val, ph, short) {
    return '<textarea class="idea' + (short ? " short" : "") + '" data-prop="' + key + '" id="p-' + key + '" placeholder="' + esc(ph) + '">' + esc(val) + "</textarea>";
  }
  function head(n, title, desc, done) {
    return '<div class="rep-head"><span class="rep-n' + (done ? " done" : "") + '">' + (done ? "✓" : n) + "</span><div><h3>" + esc(title) + "</h3>" + (desc ? '<p class="panel-desc">' + esc(desc) + "</p>" : "") + "</div></div>";
  }
  function goStage(n, label) {
    return '<button class="link-btn inline" data-act="p-stage" data-v="' + n + '">' + esc(label || "② 미션 " + n + "에서 고치기") + "</button>";
  }
  function coachHtml() {
    const list = coach();
    const p = Math.round((list.filter((x) => x.ok).length / list.length) * 100);
    const todo = list.filter((x) => !x.ok);
    return '<section class="panel coach" id="pCoach"><div class="coach-top"><div><b class="coach-level">' + level(p) + "</b>" +
      '<span class="small muted">품질 코치 · ' + list.filter((x) => x.ok).length + "/" + list.length + " 통과</span></div><b class=\"coach-pct\">" + p + "%</b></div>" +
      '<div class="rep-progress-bar"><i style="width:' + p + '%"></i></div>' +
      '<ul class="coach-list">' + list.map((x) =>
        '<li class="' + (x.ok ? "ok" : "") + '"><button class="coach-item" data-act="p-coach" data-go="' + esc(x.go || "") + '" data-stage="' + (x.stage || "") + '" title="' + esc(x.tip) + '">' +
        (x.ok ? "✅" : "⬜") + " " + esc(x.k) + "</button></li>").join("") + "</ul>" +
      (todo.length ? '<p class="coach-tip">💡 <b>다음 할 일 · ' + esc(todo[0].k) + "</b> — " + esc(todo[0].tip) + "</p>" : '<p class="coach-tip">🎉 모든 항목을 통과했어요! 미리보기로 확인하고 저장해요.</p>') +
      '<p class="note">품질 코치는 빠진 것이 없는지만 확인해요. 내용이 맞는지는 친구·선생님과 함께 확인해요.</p></section>';
  }

  CL.views.proposal = function () {
    const x = collect();
    const m = x.m;
    const r = x.r;
    const st = M.status(m);
    CL.state.area = m.area;
    let h = '<div class="section-title"><h2>③ 기후 적응 디자인 제안서</h2><p>② 의뢰소에서 모은 기록이 자동으로 들어가요. 빈칸을 채워 제안서를 완성해요.</p></div>';
    h += coachHtml();
    h += exportBar();

    if (!m.accepted) {
      h += '<p class="empty-note">아직 받은 의뢰가 없어요. ② 디자인 의뢰소에서 의뢰를 먼저 받아 주세요. <button class="link-btn inline" data-act="p-stage" data-v="1">📨 의뢰 받으러 가기</button></p>';
    }
    h += '<div class="g-' + esc(m.area) + ' area-body">';

    // 0 표지
    h += '<section class="panel" id="p-cover">' + head("0", "표지", "이 기기에만 저장돼요. 함께 쓰는 태블릿이면 수업 뒤 ‘모두 지우기’를 눌러 주세요.", !!(r.info.name.trim() || r.info.team.trim())) +
      '<div class="three">' + [["grade", "학년·반·번호", "예: 1학년 3반 12번"], ["name", "이름", ""], ["team", "모둠", "예: 3모둠"]].map((f) =>
        '<label><span class="field-label">' + f[1] + '</span><input class="text-input" data-prop-info="' + f[0] + '" maxlength="30" placeholder="' + esc(f[2]) + '" value="' + esc(r.info[f[0]]) + '"></label>').join("") + "</div>" +
      '<label><span class="field-label">작성일</span><input class="text-input" type="date" data-prop="date" value="' + esc(r.date) + '"></label></section>';

    // 1 의뢰 개요
    h += '<section class="panel">' + head("1", "의뢰 개요", "", st.d1);
    h += x.c ? '<div class="quote"><p><b>' + esc(x.c.emoji + " " + x.c.name) + "</b> " + esc(x.c.role) + ' <small class="muted">(가상 인물)</small></p><p>“' + esc(x.c.request) + "”</p>" +
      (x.conds.length ? "<p><b>꼭 지킬 조건</b> " + esc(x.conds.join(" · ")) + "</p>" : '<p class="muted">의뢰인 단서를 아직 고르지 않았어요.</p>') + "</div>" : '<p class="note">의뢰인을 아직 정하지 않았어요.</p>';
    h += '<p class="small">' + goStage(1, "② 의뢰 다시 보기") + "</p></section>";

    // 2 기후 브리핑
    h += '<section class="panel">' + head("2", "기후 브리핑", "대비한 기간을 표에 표시했어요. " + (CL.isBaseRegion(m.region) ? "현재(2000–2019)는 기후모델이 재현한 값이에요." : "이 지역 값은 ⑤ 자료 찾기에서 직접 넣은 자료예요."), st.climate >= 2);
    h += dataTable(m.region, m.scen, m.period);
    h += '<span class="field-label">📊 내가 고른 기후 단서</span>' + (m.clues.climate.length
      ? '<ul class="plain small">' + m.clues.climate.map((e) => "<li>" + esc(e) + "</li>").join("") + "</ul>"
      : '<p class="note">기후 단서가 없어요. ' + goStage(2, "② 단서 보드에서 담기") + "</p>");
    if (x.preds.length) h += '<span class="field-label">🔮 ① 내 예측과 전망</span><ul class="plain small">' + x.preds.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ul>";
    h += "</section>";

    // 3 탐구 질문과 조사
    h += '<section class="panel">' + head("3", "탐구 질문과 조사", "", st.question && st.research >= 1);
    h += '<span class="field-label">❓ 탐구 질문</span>' + (m.clues.question.trim() ? '<p class="q-text">' + esc(m.clues.question) + "</p>" : '<p class="note">아직 없어요.</p>');
    h += '<span class="field-label">🔎 조사한 사실</span>' + (x.research.length
      ? '<ul class="plain small">' + x.research.map((e) => "<li>" + esc(e.text) + (e.src.trim() ? ' <span class="muted">— 출처: ' + esc(e.src) + "</span>" : ' <b class="warn-text">출처 필요</b>') + "</li>").join("") + "</ul>"
      : '<p class="note">아직 없어요.</p>');
    h += '<p class="small">' + goStage(2, "② 단서 보드에서 고치기") + "</p></section>";

    // 4 아이디어 비교
    h += '<section class="panel">' + head("4", "아이디어 비교와 선택", "점수는 내가 판단한 값이에요.", st.d3);
    h += matrixTable(m);
    h += x.w ? '<div class="quote"><p><b>👑 최종 선택: ' + esc(M.letters[m.winner] + ". " + x.w.name) + "</b></p>" + (m.why.trim() ? "<p>" + esc(m.why) + "</p>" : '<p class="muted">선택 이유를 아직 쓰지 않았어요.</p>') + "</div>" : '<p class="note">최종 아이디어를 아직 고르지 않았어요.</p>';
    h += '<p class="small">' + goStage(3, "② 아이디어 대결에서 고치기") + "</p></section>";

    // 5 C-E-R-D
    h += '<section class="panel">' + head("5", "최종 제안 (주장 → 근거 → 추론 → 제안)", "기후 수치(사실)와 나의 추론을 구분해서 써요.", r.claim.trim().length >= 10 && /\d/.test(r.reasoning) && r.design.trim().length >= 10);
    h += '<div class="guide"><b>🧭 길잡이</b><span><b>근거(사실)</b>: 기상청 수치 그대로 — “후반기 폭염일수 35.6일(현재 11.3일)”</span>' +
      "<span><b>추론</b>: 가능성을 나타내는 말로 — “그래서 한낮 야외 작업이 어려운 날이 늘 수 있어요.”</span></div>";
    h += '<div class="cerd"><span class="cerd-k">C</span><div><label class="field-label" for="p-claim">주장 — 무엇을 제안하나요?</label>' +
      ta("claim", r.claim, "예: 용인시의 21세기 후반 여름에 대비해 급식실에 ______을(를) 제안한다.", true) +
      (x.w ? '<button class="link-btn" data-act="p-fill" data-k="claim">✏️ 문장 틀 넣기</button>' : "") + "</div></div>";
    h += '<div class="cerd"><span class="cerd-k">E</span><div><span class="field-label">근거 — ② 단서 보드에서 자동으로 들어가요</span>' +
      (m.clues.climate.length || x.research.length ? '<ul class="plain small">' + m.clues.climate.map((e) => "<li>📊 " + esc(e) + "</li>").join("") +
        x.research.map((e) => "<li>🔎 " + esc(e.text) + (e.src.trim() ? " (출처: " + esc(e.src) + ")" : "") + "</li>").join("") + "</ul>" : '<p class="note">단서를 모으면 여기에 들어가요.</p>') + "</div></div>";
    h += '<div class="cerd"><span class="cerd-k">R</span><div><label class="field-label" for="p-reasoning">추론 — 이 기후 변화가 왜 이 제안으로 이어지나요?</label>' +
      ta("reasoning", r.reasoning, "예: 폭염일수가 현재 11.3일에서 35.6일로 늘어날 것으로 전망돼요. 그래서 ______할 수 있어요. 따라서 ______이(가) 필요해요.", true) +
      (m.clues.climate.length ? '<span class="field-label"><small>✏️ 어떤 기후 단서로 추론할까요? 누르면 문장 틀이 들어가요</small></span><div class="chips small-chips">' +
        m.clues.climate.map((e, i) => '<button class="chip" data-act="p-fill" data-k="reasoning" data-i="' + i + '">📊 ' + esc(clueShort(e)) + "</button>").join("") + "</div>" : "") + "</div></div>";
    h += '<div class="cerd"><span class="cerd-k">D</span><div><label class="field-label" for="p-design">제안 — 어떤 모습이고, 누가 어떻게 쓰나요?</label>' +
      ta("design", r.design, "그래서 ______을(를) 제안한다. 사용 장면: ______.", true) +
      (x.w ? '<button class="link-btn" data-act="p-fill" data-k="design">✏️ 최종 아이디어 내용 넣기</button>' : "") + "</div></div></section>";

    // 6 도전과 보완
    h += '<section class="panel">' + head("6", "도전과 보완", "", st.d4 && r.effect.trim().length >= 10);
    h += m.challenges.length ? '<ul class="plain small">' + m.challenges.map((c) => "<li><b>🥊 " + esc(c.text) + "</b><br>→ " + (c.answer.trim() ? esc(c.answer) : '<span class="muted">(아직 답하지 않았어요)</span>') +
      (c.fix.trim() ? "<br>🔧 보완: " + esc(c.fix) : "") + "</li>").join("") + "</ul>" : '<p class="note">도전장을 아직 받지 않았어요. ' + goStage(4, "② 도전장 받으러 가기") + "</p>";
    h += '<label class="field-label" for="p-effect">기대 효과와 한계 (비용·환경 영향·더 조사할 점)</label>' +
      ta("effect", r.effect, "예: 냉방 전기를 줄일 수 있지만 설치 비용이 들고, 실제 온도 효과는 측정으로 확인해야 해요.", true) + "</section>";

    // 7 피드백과 성찰
    h += '<section class="panel" id="p-peer">' + head("7", "동료 피드백과 성찰", "발표 뒤에 적어요.", false) +
      '<label class="field-label" for="p-peerGood">친구가 말해 준 좋은 점</label>' + ta("peerGood", r.peerGood, "", true) +
      '<label class="field-label" for="p-peerMore">친구가 더 확인해 보라고 한 점</label>' + ta("peerMore", r.peerMore, "", true) +
      '<label class="field-label" for="p-changed">내가 고친 생각 또는 새롭게 알게 된 점</label>' + ta("changed", r.changed, "", true) + "</section>";

    // 8 자기 점검
    h += '<section class="panel" id="p-checks">' + head("8", "자기 점검", "", r.checks.every(Boolean)) + '<ul class="checks">' + CHECKS.map((c, i) =>
      '<li><label><input type="checkbox" data-prop-check="' + i + '"' + (r.checks[i] ? " checked" : "") + "><span><b>" + esc(c[0]) + "</b> " + esc(c[1]) + "</span></label></li>").join("") + "</ul></section>";
    h += "</div>";
    h += exportBar();
    h += '<div class="next-row"><button class="btn" data-act="tab" data-v="mission">← ② 디자인 의뢰소</button><button class="btn primary" data-act="tab" data-v="web">④ 나만의 웹 만들기 →</button></div>';
    return h;
  };

  function matrixTable(m) {
    const named = [0, 1, 2].filter((i) => m.ideas[i].name.trim());
    if (!named.length) return '<p class="note">아이디어를 아직 쓰지 않았어요.</p>';
    return '<div class="table-scroll"><table class="dtable matrix-doc"><thead><tr><th>기준</th>' + named.map((i) =>
      "<th>" + (m.winner === i ? "👑 " : "") + esc(M.letters[i] + ". " + m.ideas[i].name) + "</th>").join("") + "</tr></thead><tbody>" +
      M.criteria.map((c, k) => "<tr><th>" + esc(c.label) + "</th>" + named.map((i) => "<td>" + (m.scores[i][k] ? "★".repeat(m.scores[i][k]) + " (" + m.scores[i][k] + ")" : "–") + "</td>").join("") + "</tr>").join("") +
      "<tr><th>합계</th>" + named.map((i) => "<td><b>" + M.total(m, i) + "점</b></td>").join("") + "</tr></tbody></table></div>";
  }
  function exportBar() {
    return '<div class="export-bar"><button class="btn primary" data-act="p-preview">👀 미리보기·인쇄(PDF)</button><button class="btn" data-act="p-word">💾 Word 파일(.doc)</button>' +
      '<button class="btn" data-act="p-copy">📋 글 복사</button><button class="btn" data-act="p-present">🎤 3분 발표 화면</button><button class="btn ghost" data-act="p-clear">🗑 모두 지우기</button></div>';
  }

  /* ---------- 완성본 ---------- */
  function para(s) {
    const t = String(s || "").trim();
    return t ? esc(t).replace(/\n/g, "<br>") : '<span class="blank">(아직 쓰지 않았어요)</span>';
  }
  function docHtml() {
    const x = collect();
    const m = x.m;
    const r = x.r;
    let h = '<div class="doc"><h1>기후 적응 디자인 제안서<br><small>' + esc(x.a.icon + " " + x.a.name) + (x.w ? " — " + esc(x.w.name) : "") + "</small></h1>";
    h += '<table class="doc-info"><tr><th>학년·반·번호</th><td>' + esc(r.info.grade) + "</td><th>이름</th><td>" + esc(r.info.name) + "</td><th>모둠</th><td>" + esc(r.info.team) + "</td></tr></table>";
    h += "<h2>1. 의뢰 개요</h2>" + (x.c ? "<p><b>의뢰인</b> " + esc(x.c.name + " · " + x.c.role) + " (가상 인물)</p><p><b>의뢰 내용</b> " + esc(x.c.request) + "</p>" +
      "<p><b>꼭 지킬 조건</b> " + (x.conds.length ? esc(x.conds.join(" · ")) : para("")) + "</p>" : "<p>" + para("") + "</p>");
    h += "<h2>2. 기후 브리핑</h2><p><b>대비한 기후</b> " + esc(m.region + " · " + CL.scenFull(m.scen) + " · " + CL.periodLabel(m.period)) + "<br><b>출처</b> " +
      esc(CL.isBaseRegion(m.region) ? CL.D.source : "⑤ 자료 찾기에서 직접 넣은 자료") + " (작성일 " + esc(r.date) + ")</p>" +
      dataTable(m.region, m.scen, m.period);
    h += "<h3>기후 단서</h3>" + (m.clues.climate.length ? "<ul>" + m.clues.climate.map((e) => "<li>" + esc(e) + "</li>").join("") + "</ul>" : "<p>" + para("") + "</p>");
    if (x.preds.length) h += "<h3>내 예측과 전망</h3><ul>" + x.preds.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ul>";
    h += "<h2>3. 탐구 질문과 조사</h2><p><b>탐구 질문</b> " + para(m.clues.question) + "</p>" +
      (x.research.length ? "<ul>" + x.research.map((e) => "<li>" + esc(e.text) + (e.src.trim() ? " (출처: " + esc(e.src) + ")" : "") + "</li>").join("") + "</ul>" : "<p>" + para("") + "</p>");
    h += "<h2>4. 아이디어 비교와 선택</h2>" + matrixTable(m).replace(/<p class="note">.*?<\/p>/, "<p>" + para("") + "</p>") +
      "<p><b>최종 선택</b> " + (x.w ? esc(M.letters[m.winner] + ". " + x.w.name) : para("")) + "</p><p><b>선택 이유</b> " + para(m.why) + "</p>";
    h += '<h2>5. 최종 제안</h2><table class="doc-cerd"><tr><th>주장(C)</th><td>' + para(r.claim) + "</td></tr><tr><th>근거(E)</th><td>" +
      (m.clues.climate.concat(x.research.map((e) => e.text + (e.src.trim() ? " (출처: " + e.src + ")" : ""))).map(esc).join("<br>") || para("")) + "</td></tr>" +
      "<tr><th>추론(R)</th><td>" + para(r.reasoning) + "</td></tr><tr><th>제안(D)</th><td>" + para(r.design) + "</td></tr></table>";
    h += "<h2>6. 도전과 보완</h2>" + (m.challenges.length ? "<ul>" + m.challenges.map((c) => "<li><b>" + esc(c.text) + "</b><br>답: " + para(c.answer) + (c.fix.trim() ? "<br>보완: " + esc(c.fix) : "") + "</li>").join("") + "</ul>" : "<p>" + para("") + "</p>") +
      "<h3>기대 효과와 한계</h3><p>" + para(r.effect) + "</p>";
    h += "<h2>7. 동료 피드백과 성찰</h2><h3>친구가 말해 준 좋은 점</h3><p>" + para(r.peerGood) + "</p><h3>더 확인할 점</h3><p>" + para(r.peerMore) +
      "</p><h3>내가 고친 생각 또는 새롭게 알게 된 점</h3><p>" + para(r.changed) + "</p>";
    h += '<h2>8. 자기 점검</h2><table class="doc-check"><tr><th>평가 기준</th><th>확인 내용</th><th>자기 점검</th></tr>' + CHECKS.map((c, i) =>
      "<tr><td>" + esc(c[0]) + "</td><td>" + esc(c[1]) + "</td><td>" + (r.checks[i] ? "☑" : "☐") + "</td></tr>").join("") + "</table>";
    h += '<p class="doc-foot">기후 값: ' + esc(CL.D.source) + " · SSP 시나리오별 20년 기간 평균 전망이며 확정된 예보가 아닙니다. 현재(2000–2019)는 모델 재현값입니다. 의뢰인은 수업용 가상 인물입니다.</p></div>";
    return h;
  }
  function plainText() {
    const x = collect();
    const m = x.m;
    const r = x.r;
    const t = (s) => String(s || "").trim() || "(아직 쓰지 않았어요)";
    const L = ["[기후 적응 디자인 제안서] " + x.a.name + (x.w ? " — " + x.w.name : ""), "학년·반·번호: " + r.info.grade + " / 이름: " + r.info.name + " / 모둠: " + r.info.team, ""];
    L.push("1. 의뢰 개요", x.c ? "의뢰인: " + x.c.name + " · " + x.c.role + " (가상 인물)" : "의뢰인: (아직 정하지 않았어요)", x.c ? "의뢰 내용: " + x.c.request : "", "조건: " + (x.conds.join(" · ") || "(없음)"), "");
    L.push("2. 기후 브리핑", "대비한 기후: " + m.region + " · " + CL.scenFull(m.scen) + " · " + CL.periodLabel(m.period), "출처: " + CL.D.source);
    CL.indsFor(m.region).forEach((id) => L.push("- " + CL.indName(id) + "(" + CL.unit(id) + "): " + CL.series(m.region, id, m.scen).map((v, i) => CL.PERIODS[i].short + " " + (v == null ? "–" : CL.fmtVal(id, v))).join(", ")));
    L.push("기후 단서:");
    (m.clues.climate.length ? m.clues.climate : ["(없음)"]).forEach((e) => L.push("- " + e));
    x.preds.forEach((p) => L.push("- " + p));
    L.push("", "3. 탐구 질문과 조사", "질문: " + t(m.clues.question));
    x.research.forEach((e) => L.push("- " + e.text + (e.src.trim() ? " (출처: " + e.src + ")" : "")));
    L.push("", "4. 아이디어 비교와 선택");
    [0, 1, 2].filter((i) => m.ideas[i].name.trim()).forEach((i) => L.push("- " + M.letters[i] + ". " + m.ideas[i].name + ": " + M.criteria.map((c, k) => c.label + " " + (m.scores[i][k] || "–")).join(", ") + " (합계 " + M.total(m, i) + "점)"));
    L.push("최종 선택: " + (x.w ? M.letters[m.winner] + ". " + x.w.name : "(아직)"), "선택 이유: " + t(m.why), "");
    L.push("5. 최종 제안", "주장: " + t(r.claim), "근거: " + (m.clues.climate.concat(x.research.map((e) => e.text)).join(" / ") || "(없음)"), "추론: " + t(r.reasoning), "제안: " + t(r.design), "");
    L.push("6. 도전과 보완");
    m.challenges.forEach((c) => L.push("- " + c.text, "  답: " + t(c.answer) + (c.fix.trim() ? " / 보완: " + c.fix : "")));
    L.push("기대 효과와 한계: " + t(r.effect), "");
    L.push("7. 동료 피드백과 성찰", "좋은 점: " + t(r.peerGood), "더 확인할 점: " + t(r.peerMore), "새롭게 알게 된 점: " + t(r.changed), "");
    L.push("8. 자기 점검: " + CHECKS.map((c, i) => c[0] + (r.checks[i] ? " ☑" : " ☐")).join(", "));
    return L.filter((s, i, arr) => !(s === "" && arr[i - 1] === "")).join("\n");
  }
  const DOC_CSS = "body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:11pt;line-height:1.6;color:#111}h1{font-size:18pt;text-align:center}h1 small{font-size:12pt;color:#444}" +
    "h2{font-size:13pt;border-bottom:2px solid #333;padding-bottom:2pt;margin-top:18pt}h3{font-size:11pt;margin:10pt 0 2pt}table{border-collapse:collapse;width:100%;margin:6pt 0}" +
    "th,td{border:1px solid #888;padding:4pt 6pt;vertical-align:top;text-align:left}th{background:#eee}.col-sel{background:#fff3d6}.blank{color:#999}caption{font-weight:bold;text-align:left}small{font-weight:normal}.doc-foot{font-size:9pt;color:#555;margin-top:16pt}";

  /* ---------- 겹쳐 보이는 화면 (미리보기·발표) ---------- */
  let presentIdx = 0;
  function overlay(html, cls) {
    const o = document.getElementById("overlay");
    o.className = "overlay " + (cls || "");
    o.innerHTML = html;
    o.hidden = false;
    document.body.style.overflow = "hidden";
    const f = o.querySelector("[data-autofocus]");
    if (f) f.focus();
  }
  CL.closeOverlay = function () {
    const o = document.getElementById("overlay");
    if (!o || o.hidden) return;
    o.hidden = true;
    o.innerHTML = "";
    document.body.style.overflow = "";
    document.body.classList.remove("printing");
  };
  function presentHtml() {
    const x = collect();
    const m = x.m;
    const r = x.r;
    const slides = [
      { t: "① 의뢰와 기후 단서", b: (x.c ? '<p class="present-q">' + esc(x.c.emoji + " " + x.c.name) + " (" + esc(x.c.role) + ", 가상 인물): “" + esc(x.c.request) + "”</p>" : "") +
        (m.clues.climate.length ? "<ul>" + m.clues.climate.slice(0, 3).map((e) => "<li>📊 " + esc(e) + "</li>").join("") + "</ul>" : '<p class="muted">기후 단서를 담으면 여기에 나타나요.</p>') },
      { t: "② 아이디어 대결", b: matrixTable(m) + (x.w ? '<p class="present-claim"><b>👑 ' + esc(x.w.name) + "</b> — " + para(m.why) + "</p>" : "") },
      { t: "③ 최종 제안", b: (r.claim.trim() ? '<p class="present-claim"><b>주장</b> ' + para(r.claim) + "</p>" : "") + (r.reasoning.trim() ? "<p><b>추론</b> " + para(r.reasoning) + "</p>" : "") +
        (m.challenges.some((c) => c.answer.trim()) ? "<ul>" + m.challenges.filter((c) => c.answer.trim()).map((c) => "<li>🥊 " + esc(c.text) + "<br>→ " + esc(c.answer) + "</li>").join("") + "</ul>" : "") +
        (r.effect.trim() ? "<p><b>효과와 한계</b> " + para(r.effect) + "</p>" : "") },
    ];
    presentIdx = Math.max(0, Math.min(2, presentIdx));
    const s = slides[presentIdx];
    return '<div class="present-card g-' + esc(m.area) + '"><div class="present-top"><p class="eyebrow">' + esc(x.a.icon + " " + x.a.name + " · " + m.region + " · " + CL.scenCode(m.scen) + " · " + CL.PERIODS[m.period].short) +
      (r.info.team ? " · " + esc(r.info.team) : "") + '</p><button class="btn" data-act="overlay-close" data-autofocus>닫기</button></div>' +
      "<h2>" + esc(s.t) + '</h2><div class="present-body">' + s.b + "</div>" +
      '<div class="present-nav"><button class="btn" data-act="p-present-go" data-d="-1"' + (presentIdx === 0 ? " disabled" : "") + '>← 이전</button><span>' + (presentIdx + 1) + " / 3</span>" +
      '<button class="btn primary" data-act="p-present-go" data-d="1"' + (presentIdx === 2 ? " disabled" : "") + ">다음 →</button></div></div>";
  }

  /* ---------- 조작 ---------- */
  function updateCoach() {
    const el = document.getElementById("pCoach");
    if (el) el.outerHTML = coachHtml();
    if (CL.renderTabs) CL.renderTabs();
  }
  CL.inputHandlers.push((e) => {
    const d = e.target.dataset || {};
    if (d.prop) { const r = getRep(); r[d.prop] = e.target.value; saveRep(r); updateCoach(); }
    else if (d.propInfo) { const r = getRep(); r.info[d.propInfo] = e.target.value; saveRep(r); updateCoach(); }
  });
  CL.changeHandlers.push((e) => {
    const d = e.target.dataset || {};
    if (d.propCheck != null) { const r = getRep(); r.checks[Number(d.propCheck)] = e.target.checked; saveRep(r); CL.render(); }
  });
  // ‘깊은 처마·외부 차양(루버)’처럼 끝에 괄호가 있으면 괄호 앞 낱말로 조사를 골라요
  function objJosa(name) {
    return CL.josa(String(name).replace(/\s*\([^)]*\)\s*$/, "") || name, "을", "를");
  }
  function clueShort(s) {
    return String(s).replace(/^.*?\d{4}–\d{4}\)\s*/, "").replace(/\s*\(현재.*$/, "");
  }
  function goStageNow(n) {
    const m = M.get();
    m.stage = m.accepted ? n : 1;
    M.save(m);
    CL.state.tab = "mission";
    CL.persist();
    CL.render({ top: true });
  }
  A["p-stage"] = (b) => goStageNow(Number(b.dataset.v));
  A["p-coach"] = (b) => {
    if (b.dataset.stage) { goStageNow(Number(b.dataset.stage)); return; }
    const el = document.getElementById(b.dataset.go);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el.matches("textarea, input")) el.focus({ preventScroll: true });
  };
  A["p-fill"] = (b) => {
    const k = b.dataset.k;
    const r = getRep();
    const x = collect();
    const m = x.m;
    let add = "";
    if (k === "claim" && x.w) {
      const who = x.c ? x.c.role + "에게" : "";
      add = m.region + "의 " + CL.PERIODS[m.period].short + "(" + CL.PERIODS[m.period].years + ") 기후에 대비해 " + who + " ‘" + x.w.name + "’" + objJosa(x.w.name) + " 제안한다.";
    } else if (k === "reasoning" && m.clues.climate.length) {
      const clue = m.clues.climate[Number(b.dataset.i) || 0] || m.clues.climate[0];
      add = "근거: " + clue + "\n→ 이 변화로 ______할 수 있다. 그래서 ______이(가) 필요하다.";
    } else if (k === "design" && x.w) {
      add = "그래서 ‘" + x.w.name + "’" + objJosa(x.w.name) + " 제안한다." + (x.w.desc.trim() ? " " + x.w.desc.trim() : "") + " 사용 장면: ______." +
        m.challenges.filter((c) => c.fix.trim()).map((c) => " 보완: " + c.fix.trim() + ".").join("");
    }
    if (!add) return;
    if (r[k].indexOf(add) >= 0) { CL.toast("이미 들어 있어요"); return; }
    r[k] = (r[k].trim() ? r[k].replace(/\s+$/, "") + "\n" : "") + add;
    saveRep(r);
    CL.render();
    const el = document.getElementById("p-" + k);
    if (el) {
      el.focus();
      const i = el.value.indexOf("______");
      if (i >= 0) el.setSelectionRange(i, i + 6); else el.setSelectionRange(el.value.length, el.value.length);
    }
  };
  A["p-preview"] = () => {
    overlay('<div class="overlay-bar"><button class="btn primary" data-act="p-print">🖨 인쇄 / PDF로 저장</button><button class="btn" data-act="overlay-close" data-autofocus>닫기</button></div>' +
      '<div class="paper">' + docHtml() + "</div>", "doc-overlay");
  };
  A["p-print"] = () => {
    document.body.classList.add("printing");
    window.print();
  };
  window.addEventListener("afterprint", () => document.body.classList.remove("printing"));
  A["p-word"] = () => {
    const html = "﻿<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\"><head><meta charset=\"utf-8\"><title>기후 적응 디자인 제안서</title><style>" +
      DOC_CSS + "</style></head><body>" + docHtml() + "</body></html>";
    CL.download("기후적응_디자인_제안서.doc", html, "application/msword");
    CL.toast("Word 파일을 저장했어요");
  };
  A["p-copy"] = () => {
    CL.copyText(plainText()).then((ok) => CL.toast(ok ? "📋 제안서 글을 복사했어요" : "복사하지 못했어요. 미리보기에서 직접 선택해 주세요"));
  };
  A["p-present"] = () => { presentIdx = 0; overlay(presentHtml(), "present-overlay"); };
  A["p-present-go"] = (b) => { presentIdx += Number(b.dataset.d); overlay(presentHtml(), "present-overlay"); };
  A["overlay-close"] = () => CL.closeOverlay();
  A["p-clear"] = () => {
    if (!window.confirm("이 기기에 저장된 의뢰·단서·아이디어·제안서·예측·근거·나만의 웹 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    ["mission", "report", "preds", "evidence", "web"].forEach((k) => CL.save(k, null));
    CL.toast("모든 기록을 지웠어요");
    CL.render({ top: true });
  };
})();
