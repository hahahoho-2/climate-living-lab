/* ③ 탐구 보고서 — 활동보고서(docx)와 같은 순서로 앞 단계의 기록을 모아 완성 (고칠 필요 없음) */
(function () {
  "use strict";
  const CL = window.CL;
  if (!CL || !CL.ok) return;
  const esc = CL.esc;
  CL.views = CL.views || {};
  CL.actions = CL.actions || {};
  CL.inputHandlers = CL.inputHandlers || [];
  CL.changeHandlers = CL.changeHandlers || [];
  const A = CL.actions;

  const TEXT_KEYS = ["q1", "q2", "q3", "impact", "why", "effect", "claim", "evidenceExtra", "reasoning", "design", "peerGood", "peerMore", "changed", "date", "source"];
  const CHECKS = [
    ["자료 해석", "지역·기간·시나리오·단위가 정확한가?"],
    ["근거 추론", "자료와 예상 영향의 연결을 설명했나?"],
    ["생활문화 설계", "적응 기능과 사용 장면이 구체적인가?"],
    ["성찰", "한계·추가 자료·환경 영향을 고려했나?"],
  ];
  const Q3_CHIPS = ["장마 시작·끝 날짜", "하루에 쏟아지는 폭우의 양", "폭설과 적설량", "여름·겨울 등 계절별 기온", "작물의 토양·물·병해충 조건", "소재·건물의 실제 성능", "비용과 에너지 사용"];

  function getRep() {
    const r = CL.load("report", {}) || {};
    const out = { info: { grade: "", name: "", team: "" }, region: r.region, scen: r.scen, checks: [false, false, false, false] };
    TEXT_KEYS.forEach((k) => { out[k] = typeof r[k] === "string" ? r[k] : ""; });
    if (r.info && typeof r.info === "object") ["grade", "name", "team"].forEach((k) => { out.info[k] = typeof r.info[k] === "string" ? r.info[k] : ""; });
    if (Array.isArray(r.checks)) out.checks = [0, 1, 2, 3].map((i) => r.checks[i] === true);
    if (!out.date) out.date = CL.today();
    return out;
  }
  function saveRep(r) {
    CL.save("report", r);
  }
  function repRegion(r) {
    return CL.regions().indexOf(r.region) >= 0 ? r.region : CL.state.region;
  }
  function repScen(r) {
    return CL.SCENS.indexOf(r.scen) >= 0 ? r.scen : CL.state.scen;
  }
  function starQ(area) {
    return CL.getQuestions(area).filter((q) => q.star)[0] || null;
  }

  /* ---------- 진행률 ---------- */
  function items() {
    const r = getRep();
    const area = CL.state.area;
    const q = starQ(area);
    const filled = (s) => String(s || "").trim().length >= 4;
    return [
      ["표지 정보", !!(r.info.name.trim() || r.info.team.trim()), "s0"],
      ["가장 크게 달라지는 지표", filled(r.q1), "s1"],
      ["두 시나리오의 차이", filled(r.q2), "s1"],
      ["자료가 말해 주지 않는 것", filled(r.q3), "s1"],
      ["탐구 질문과 찾은 답", !!(q && filled(q.answer)), "s2"],
      ["자료 근거 담기", CL.getEvidence().length > 0, "s2"],
      ["생활 영향 추론", filled(r.impact), "s2"],
      ["아이디어 설계 카드", !CL.designLines(area).empty, "s2"],
      ["적합한 이유", filled(r.why), "s2"],
      ["기대 효과와 한계", filled(r.effect), "s2"],
      ["주장", filled(r.claim), "s3"],
      ["추론", filled(r.reasoning), "s3"],
      ["제안", filled(r.design), "s3"],
      ["피드백과 성찰", filled(r.peerGood) || filled(r.peerMore) || filled(r.changed), "s4"],
      ["자기 점검", r.checks.every(Boolean), "s5"],
    ];
  }
  CL.reportProgress = function () {
    const list = items();
    return Math.round((list.filter((x) => x[1]).length / list.length) * 100);
  };
  function secDone(sec) {
    const list = items().filter((x) => x[2] === sec);
    return list.length && list.every((x) => x[1]);
  }

  /* ---------- 도우미 문장 ---------- */
  function changeLines(region, scen) {
    return CL.indsFor(region).map((id) => {
      const s = CL.series(region, id, scen);
      if (s[0] == null || s[3] == null) return null;
      const ratio = CL.ratioText(id, s[0], s[3]);
      return CL.indName(id) + ": 현재 " + CL.fmtVal(id, s[0]) + " → 후반기 " + CL.fmtVal(id, s[3]) + CL.unit(id) + " (" + CL.deltaText(id, s[0], s[3]) + (ratio ? ", " + ratio : "") + ")";
    }).filter(Boolean);
  }
  function scenLines(region) {
    return CL.indsFor(region).map((id) => {
      const hi = CL.val(region, id, "high", 3);
      const lo = CL.val(region, id, "low", 3);
      if (hi == null || lo == null) return null;
      return CL.indName(id) + " 후반기: " + CL.scenCode("high") + " " + CL.fmtVal(id, hi) + " vs " + CL.scenCode("low") + " " + CL.fmtVal(id, lo) + CL.unit(id) +
        " (차이 " + CL.fmtVal(id, Math.abs(hi - lo)) + CL.unitShort(id) + ")";
    }).filter(Boolean);
  }
  function predLines(region, scen) {
    const all = CL.getPreds();
    return CL.indsFor(region).map((id) => {
      const p = all[region + "|" + id + "|" + scen];
      if (!p || (CL.num(p.p2) == null && CL.num(p.p3) == null)) return null;
      const s = CL.series(region, id, scen);
      const f = (v) => (CL.num(v) == null ? "–" : CL.fmtNum(CL.num(v), Math.max(CL.decOf(id), 1)));
      return CL.indName(id) + ": 내 예측 중반기 " + f(p.p2) + " · 후반기 " + f(p.p3) + CL.unitShort(id) + " → 전망 " + f(s[2]) + " · " + f(s[3]) + CL.unitShort(id) +
        (Array.isArray(p.reasons) && p.reasons.length ? " (근거: " + p.reasons.join(", ") + ")" : "");
    }).filter(Boolean);
  }
  function designSummary(area) {
    const d = CL.designLines(area);
    if (d.empty) return "";
    return (d.name ? d.name + ": " : "") + d.lines.map((l) => l.k + " - " + l.v).join(" / ") + (d.desc ? " / " + d.desc : "");
  }

  /* ---------- 화면 ---------- */
  function ta(key, val, ph, rows) {
    return '<textarea class="idea' + (rows === "short" ? " short" : "") + '" data-rep="' + key + '" id="rep-' + key + '" placeholder="' + esc(ph) + '">' + esc(val) + "</textarea>";
  }
  function head(n, sec, title, desc) {
    return '<div class="rep-head"><span class="rep-n' + (secDone(sec) ? " done" : "") + '">' + (secDone(sec) ? "✓" : n) + "</span><div><h3>" + esc(title) + "</h3>" + (desc ? '<p class="panel-desc">' + esc(desc) + "</p>" : "") + "</div></div>";
  }
  function goBtn(tab, extra, label) {
    return '<button class="link-btn inline" data-act="rep-go" data-tab="' + tab + '" data-extra="' + esc(extra || "") + '">' + esc(label) + "</button>";
  }

  CL.views.report = function () {
    const S = CL.state;
    const r = getRep();
    const region = repRegion(r);
    const scen = repScen(r);
    const area = S.area;
    const a = CL.AREAS[area];
    const prog = CL.reportProgress();
    const todo = items().filter((x) => !x[1]).map((x) => x[0]);

    let h = '<div class="section-title"><h2>③ 미래 기후 대비 의식주 생활문화 탐구 보고서</h2><p>앞에서 한 활동이 자동으로 모여요. 빈칸을 채우면 보고서가 완성돼요.</p></div>';
    h += '<div class="rep-progress" id="repProg"><div class="bar"><i style="width:' + prog + '%"></i></div><b>' + prog + "% 완성</b>" +
      (todo.length ? '<span class="small muted">남은 것: ' + esc(todo.slice(0, 4).join(", ")) + (todo.length > 4 ? " 외 " + (todo.length - 4) + "개" : "") + "</span>" : '<span class="small">🎉 모든 항목을 채웠어요!</span>') + "</div>";
    h += exportBar();

    // 표지
    h += '<section class="panel">' + head("0", "s0", "표지 정보", "이 기기에만 저장돼요. 함께 쓰는 태블릿이면 수업 뒤 '모두 지우기'를 눌러 주세요.") +
      '<div class="three">' + [["grade", "학년·반·번호", "예: 1학년 3반 12번"], ["name", "이름", ""], ["team", "모둠", "예: 3모둠"]].map((f) =>
        '<label><span class="field-label">' + f[1] + '</span><input class="text-input" data-rep-info="' + f[0] + '" maxlength="30" placeholder="' + esc(f[2]) + '" value="' + esc(r.info[f[0]]) + '"></label>').join("") + "</div></section>";

    // 1. 기후 자료 읽기
    h += '<section class="panel" id="sec1">' + head("1", "s1", "기후 자료 읽기", "지역과 시나리오를 고르면 자료표가 자동으로 채워져요.");
    h += '<div class="ctrl-row"><div class="ctrl"><span class="ctrl-label">지역</span><div class="seg">' + CL.regions().map((x) =>
      '<button data-act="rep-region" data-v="' + esc(x) + '" aria-pressed="' + (x === region) + '"><span class="sw ' + CL.regionColor(x) + '"></span><span>' + esc(x) + "</span></button>").join("") + "</div></div>" +
      '<div class="ctrl"><span class="ctrl-label">시나리오</span><div class="seg">' + CL.SCENS.map((s) =>
        '<button data-act="rep-scen" data-v="' + s + '" aria-pressed="' + (s === scen) + '"><span class="sw s-' + s + '"></span><span>' + esc(CL.scenCode(s)) + "</span><small>" + esc(CL.scenName(s)) + "</small></button>").join("") + "</div></div></div>";
    h += '<div class="two-fields"><label><span class="field-label">자료 조회일</span><input class="text-input" type="date" data-rep="date" value="' + esc(r.date) + '"></label>' +
      '<label><span class="field-label">출처</span><input class="text-input" data-rep="source" maxlength="200" placeholder="' + esc(CL.D.source) + '" value="' + esc(r.source) + '"></label></div>';
    h += dataTable(region, scen);
    const preds = predLines(region, scen);
    h += '<span class="field-label">🔮 내 예측과 전망</span>' + (preds.length ? '<ul class="plain small">' + preds.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>"
      : '<p class="note">이 지역·시나리오로 예측한 기록이 없어요. ' + goBtn("predict", "2", "① 기후 예측하러 가기") + "</p>");
    h += '<label class="field-label" for="rep-q1">가장 크게 달라지는 지표와 기간은 무엇인가요?</label>' + ta("q1", r.q1, "예: 폭염일수가 가장 크게 달라져요. 후반기에는 현재보다 …", "short") +
      helper("h1", "변화 요약 보기", changeLines(region, scen), "q1");
    h += '<label class="field-label" for="rep-q2">두 시나리오의 차이가 두드러지는 지표는 무엇인가요?</label>' + ta("q2", r.q2, "예: 후반기 폭염일수는 두 시나리오의 차이가 …", "short") +
      helper("h2", "시나리오 차이 보기", scenLines(region), "q2");
    h += '<label class="field-label" for="rep-q3">자료가 말해 주지 않는 것, 추가로 확인할 정보는 무엇인가요?</label>' + ta("q3", r.q3, "예: 연강수량만으로는 장마가 언제 시작하는지 알 수 없어요.", "short") +
      '<div class="chips small-chips">' + Q3_CHIPS.map((x, i) => '<button class="chip" data-act="rep-q3chip" data-i="' + i + '">＋ ' + esc(x) + "</button>").join("") + "</div></section>";

    // 2. 생활문화로 연결하기
    const q = starQ(area);
    const ev = CL.getEvidence();
    const hyps = CL.getHyps(area);
    h += '<section class="panel" id="sec2">' + head("2", "s2", "생활문화로 연결하기", "자료(사실)와 나의 추론을 구분해서 써요.");
    h += '<div class="ctrl-row"><div class="ctrl"><span class="ctrl-label">우리 모둠 영역</span><div class="seg">' + CL.AREA_IDS.map((id) =>
      '<button data-act="rep-area" data-v="' + id + '" aria-pressed="' + (id === area) + '"><span>' + esc(CL.AREAS[id].icon + " " + CL.AREAS[id].name) + "</span></button>").join("") + "</div></div></div>";
    h += '<span class="field-label">❓ 나의 탐구 질문</span>' + (q
      ? '<div class="quote"><p class="q-text">' + esc(q.q) + "</p>" + (q.answer ? "<p><b>찾은 답:</b> " + esc(q.answer) + "</p>" : '<p class="muted">아직 답을 적지 않았어요.</p>') +
        (q.src ? '<p class="small muted">출처: ' + esc(q.src) + "</p>" : "") + goBtn("explore", "ask", "② 궁금증 질문에서 고치기") + "</div>"
      : '<p class="note">⭐ 탐구 질문을 아직 정하지 않았어요. ' + goBtn("explore", "ask", "② 궁금증 질문 만들기") + "</p>");
    h += '<span class="field-label">📌 자료 근거 <small>' + ev.length + "개 · 어떤 지표의 어느 기간 값을 쓰나요?</small></span>" + (ev.length
      ? '<ul class="evi-picked">' + ev.map((x, i) => "<li><span>📊 " + esc(x) + '</span><button data-act="rep-evi-del" data-i="' + i + '" aria-label="이 근거 빼기">×</button></li>').join("") + "</ul>"
      : '<p class="note">아직 담은 근거가 없어요. ' + goBtn("predict", "3", "① 전망 비교") + " · " + goBtn("explore", "data", "② 데이터 카드") + "에서 📌를 눌러 담아요.</p>");
    if (hyps.length) h += '<span class="field-label">💡 내가 고른 가설</span><ul class="plain small">' + hyps.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>";
    h += '<label class="field-label" for="rep-impact">생활 영향 추론: 사람·농작물·생활공간에 어떤 변화가 생길 수 있나요?</label>' +
      ta("impact", r.impact, "예: (자료) 후반기 폭염일수가 현재의 약 3배 → (추론) 낮에 밖에서 일하거나 운동하기 어려워지고 …");
    h += '<span class="field-label">✏️ 아이디어 설계 카드</span>' + CL.designCardHtml(area) + '<p class="small">' + goBtn("explore", "build", "② 설계 카드에서 고치기") + "</p>";
    h += '<label class="field-label" for="rep-why">왜 이 아이디어가 선택한 지역·기후에 적합한가요?</label>' + ta("why", r.why, "자료의 어떤 수치와 연결되는지 써 보세요.", "short");
    h += '<label class="field-label" for="rep-effect">기대 효과와 함께 살펴야 할 한계·비용·환경 영향은 무엇인가요?</label>' + ta("effect", r.effect, "예: 냉방 에너지를 줄일 수 있지만 처음 짓는 비용이 들어요.", "short");
    h += '<div class="research-mini"><b>🔍 더 조사할 것</b><ul class="plain small">' + a.research.map((x) => "<li>" + esc(x.text) + "</li>").join("") + "</ul></div></section>";

    // 3. CERD
    h += '<section class="panel" id="sec3">' + head("3", "s3", "근거를 갖춘 제안", "주장(C) → 근거(E) → 추론(R) → 제안(D) 순서로 정리해요.");
    h += '<div class="cerd"><span class="cerd-k">C</span><div><label class="field-label" for="rep-claim">주장</label>' + ta("claim", r.claim, "우리 지역의 미래 생활문화에 필요한 변화는 ______이다.", "short") + "</div></div>";
    h += '<div class="cerd"><span class="cerd-k">E</span><div><span class="field-label">근거 — 자료에서 확인한 값·기간·시나리오·출처</span>' +
      (ev.length ? '<ul class="plain small">' + ev.slice(0, 5).map((x) => "<li>" + esc(x) + "</li>").join("") + (ev.length > 5 ? "<li>… 외 " + (ev.length - 5) + "개</li>" : "") + "</ul>" : '<p class="note">위 2번에서 근거를 담으면 여기에 들어가요.</p>') +
      ta("evidenceExtra", r.evidenceExtra, "더 쓰고 싶은 근거가 있다면 적어요 (선택)", "short") + "</div></div>";
    h += '<div class="cerd"><span class="cerd-k">R</span><div><label class="field-label" for="rep-reasoning">추론 — 이 자료가 우리의 제안으로 이어지는 이유</label>' +
      ta("reasoning", r.reasoning, "이 변화는 ______에 영향을 줄 수 있다. 이유는 ______.", "short") + "</div></div>";
    h += '<div class="cerd"><span class="cerd-k">D</span><div><label class="field-label" for="rep-design">제안 — 제품·메뉴·공간의 모습과 사용 방법</label>' +
      ta("design", r.design, "그래서 ______을(를) 제안한다. 기대 효과·한계는 ______.", "short") +
      (CL.designLines(area).empty ? "" : '<button class="link-btn" data-act="rep-design-fill">✏️ 설계 카드 내용을 글상자에 넣기</button>') + "</div></div></section>";

    // 4. 피드백과 성찰
    h += '<section class="panel" id="sec4">' + head("4", "s4", "동료 피드백과 성찰", "3분 발표 뒤에 적어요.") +
      '<label class="field-label" for="rep-peerGood">친구의 발표에서 근거가 잘 연결된 점</label>' + ta("peerGood", r.peerGood, "", "short") +
      '<label class="field-label" for="rep-peerMore">더 확인하면 좋을 점</label>' + ta("peerMore", r.peerMore, "", "short") +
      '<label class="field-label" for="rep-changed">내가 고친 생각 또는 새롭게 알게 된 점</label>' + ta("changed", r.changed, "", "short") + "</section>";

    // 5. 자기 점검
    h += '<section class="panel" id="sec5">' + head("5", "s5", "자기 점검") + '<ul class="checks">' + CHECKS.map((c, i) =>
      '<li><label><input type="checkbox" data-rep-check="' + i + '"' + (r.checks[i] ? " checked" : "") + "><span><b>" + esc(c[0]) + "</b> " + esc(c[1]) + "</span></label></li>").join("") + "</ul></section>";
    h += exportBar();
    return h;
  };

  function dataTable(region, scen) {
    const inds = CL.indsFor(region);
    return '<div class="table-scroll"><table class="dtable"><caption>' + esc(region + " · " + CL.scenFull(scen)) + '</caption><thead><tr><th>기후 지표</th><th>단위</th>' +
      CL.PERIODS.map((p) => "<th>" + esc(p.short) + "<br><small>" + esc(p.years) + "</small></th>").join("") + "</tr></thead><tbody>" +
      inds.map((id) => "<tr><th>" + esc(CL.indName(id)) + "</th><td>" + esc(CL.unit(id)) + "</td>" + CL.series(region, id, scen).map((v) => "<td>" + (v == null ? "–" : CL.fmtVal(id, v)) + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></div><p class=\"note\">열대야일수·5일 최다강수량 같은 지표는 ⑤ 자료 찾기에서 추가하면 표에 나타나요.</p>";
  }
  function helper(key, label, lines, target) {
    const open = CL.state.open[key];
    if (!lines.length) return "";
    return '<details class="helper" data-open-key="' + key + '"' + (open ? " open" : "") + "><summary>📋 " + esc(label) + '</summary><ul class="plain small">' +
      lines.map((x) => "<li>" + esc(x) + "</li>").join("") + '</ul><button class="btn small" data-act="rep-insert" data-k="' + target + '" data-h="' + key + '">이 내용을 글상자에 넣고 고치기</button></details>';
  }
  function exportBar() {
    return '<div class="export-bar"><button class="btn primary" data-act="rep-preview">👀 미리보기·인쇄(PDF)</button><button class="btn" data-act="rep-word">💾 Word 파일(.doc)</button>' +
      '<button class="btn" data-act="rep-copy">📋 글 복사</button><button class="btn" data-act="rep-present">🎤 3분 발표 화면</button><button class="btn ghost" data-act="rep-clear">🗑 모두 지우기</button></div>';
  }

  /* ---------- 완성본 ---------- */
  function reportData() {
    const S = CL.state;
    const r = getRep();
    const region = repRegion(r);
    const scen = repScen(r);
    const area = S.area;
    const q = starQ(area);
    return { r: r, region: region, scen: scen, area: area, a: CL.AREAS[area], q: q, ev: CL.getEvidence(), hyps: CL.getHyps(area), d: CL.designLines(area), preds: predLines(region, scen) };
  }
  function para(s) {
    const t = String(s || "").trim();
    return t ? esc(t).replace(/\n/g, "<br>") : '<span class="blank">(아직 쓰지 않았어요)</span>';
  }
  function docHtml() {
    const x = reportData();
    const r = x.r;
    let h = '<div class="doc"><h1>미래 기후와 의·식·주<br><small>데이터 기반 생활문화 탐구 보고서</small></h1>';
    h += '<table class="doc-info"><tr><th>학년·반·번호</th><td>' + esc(r.info.grade) + "</td><th>이름</th><td>" + esc(r.info.name) + "</td><th>모둠</th><td>" + esc(r.info.team) + "</td></tr></table>";
    h += "<h2>1. 기후 자료 읽기</h2><p><b>지역</b> " + esc(x.region) + " · <b>시나리오</b> " + esc(CL.scenFull(x.scen)) + " · <b>자료 조회일</b> " + esc(r.date) +
      "<br><b>출처</b> " + esc(r.source || CL.D.source) + "</p>" + dataTable(x.region, x.scen).replace(/<p class="note">.*?<\/p>/, "");
    if (x.preds.length) h += "<h3>내 예측과 전망</h3><ul>" + x.preds.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ul>";
    h += "<h3>가장 크게 달라지는 지표와 기간</h3><p>" + para(r.q1) + "</p><h3>두 시나리오의 차이가 두드러지는 지표</h3><p>" + para(r.q2) + "</p>" +
      "<h3>자료가 말해 주지 않는 것 / 추가로 확인할 정보</h3><p>" + para(r.q3) + "</p>";
    h += "<h2>2. 생활문화로 연결하기</h2><p><b>우리 모둠 영역</b> " + esc(x.a.name) + "</p>";
    h += "<h3>나의 탐구 질문</h3><p>" + (x.q ? esc(x.q.q) : para("")) + "</p>" + (x.q && x.q.answer ? "<p><b>찾은 답</b> " + para(x.q.answer) + "</p>" : "") + (x.q && x.q.src ? "<p><b>출처</b> " + esc(x.q.src) + "</p>" : "");
    h += "<h3>자료 근거</h3>" + (x.ev.length ? "<ul>" + x.ev.map((e) => "<li>" + esc(e) + "</li>").join("") + "</ul>" : "<p>" + para("") + "</p>");
    if (x.hyps.length) h += "<h3>데이터로 세운 가설</h3><ul>" + x.hyps.map((e) => "<li>" + esc(e) + "</li>").join("") + "</ul>";
    h += "<h3>생활 영향 추론</h3><p>" + para(r.impact) + "</p>";
    h += "<h3>아이디어 설계 카드" + (x.d.name ? " — " + esc(x.d.name) : "") + "</h3>" + (x.d.empty ? "<p>" + para("") + "</p>"
      : (x.d.lines.length ? '<table class="doc-card">' + x.d.lines.map((l) => "<tr><th>" + esc(l.k) + "</th><td>" + esc(l.v) + "</td></tr>").join("") + "</table>" : "") + (x.d.desc ? "<p>" + para(x.d.desc) + "</p>" : ""));
    h += "<h3>이 아이디어가 지역·기후에 적합한 이유</h3><p>" + para(r.why) + "</p><h3>기대 효과와 한계·비용·환경 영향</h3><p>" + para(r.effect) + "</p>";
    h += "<h2>3. 근거를 갖춘 제안</h2><table class=\"doc-cerd\"><tr><th>주장(C)</th><td>" + para(r.claim) + "</td></tr><tr><th>근거(E)</th><td>" +
      (x.ev.length ? x.ev.slice(0, 5).map(esc).join("<br>") : "") + (r.evidenceExtra.trim() ? (x.ev.length ? "<br>" : "") + para(r.evidenceExtra) : x.ev.length ? "" : para("")) + "</td></tr>" +
      "<tr><th>추론(R)</th><td>" + para(r.reasoning) + "</td></tr><tr><th>제안(D)</th><td>" + para(r.design) + "</td></tr></table>";
    h += "<h2>4. 동료 피드백과 성찰</h2><h3>친구의 발표에서 근거가 잘 연결된 점</h3><p>" + para(r.peerGood) + "</p><h3>더 확인하면 좋을 점</h3><p>" + para(r.peerMore) +
      "</p><h3>내가 고친 생각 또는 새롭게 알게 된 점</h3><p>" + para(r.changed) + "</p>";
    h += '<h2>5. 자기 점검</h2><table class="doc-check"><tr><th>평가 기준</th><th>확인 내용</th><th>자기 점검</th></tr>' + CHECKS.map((c, i) =>
      "<tr><td>" + esc(c[0]) + "</td><td>" + esc(c[1]) + "</td><td>" + (r.checks[i] ? "☑" : "☐") + "</td></tr>").join("") + "</table>";
    h += '<p class="doc-foot">기후 값: ' + esc(CL.D.source) + " 등 · SSP 시나리오별 20년 기간 평균 전망이며 확정된 예보가 아닙니다.</p></div>";
    return h;
  }
  function plainText() {
    const x = reportData();
    const r = x.r;
    const L = [];
    const t = (s) => String(s || "").trim() || "(아직 쓰지 않았어요)";
    L.push("[미래 기후와 의·식·주 — 데이터 기반 생활문화 탐구 보고서]");
    L.push("학년·반·번호: " + r.info.grade + " / 이름: " + r.info.name + " / 모둠: " + r.info.team, "");
    L.push("1. 기후 자료 읽기", "지역: " + x.region + " / 시나리오: " + CL.scenFull(x.scen) + " / 조회일: " + r.date, "출처: " + (r.source || CL.D.source));
    CL.indsFor(x.region).forEach((id) => {
      L.push("- " + CL.indName(id) + "(" + CL.unit(id) + "): " + CL.series(x.region, id, x.scen).map((v, i) => CL.PERIODS[i].short + " " + (v == null ? "–" : CL.fmtVal(id, v))).join(", "));
    });
    x.preds.forEach((p) => L.push("- " + p));
    L.push("가장 크게 달라지는 지표와 기간: " + t(r.q1), "두 시나리오의 차이: " + t(r.q2), "자료가 말해 주지 않는 것: " + t(r.q3), "");
    L.push("2. 생활문화로 연결하기", "영역: " + x.a.name, "탐구 질문: " + (x.q ? x.q.q : "(아직 정하지 않았어요)"));
    if (x.q && x.q.answer) L.push("찾은 답: " + x.q.answer + (x.q.src ? " (출처: " + x.q.src + ")" : ""));
    L.push("자료 근거:");
    (x.ev.length ? x.ev : ["(아직 담지 않았어요)"]).forEach((e) => L.push("- " + e));
    if (x.hyps.length) L.push("가설: " + x.hyps.join(" / "));
    L.push("생활 영향 추론: " + t(r.impact));
    L.push("설계 카드: " + (designSummary(x.area) || "(아직 만들지 않았어요)"));
    L.push("적합한 이유: " + t(r.why), "기대 효과와 한계: " + t(r.effect), "");
    L.push("3. 근거를 갖춘 제안", "주장: " + t(r.claim), "근거: " + (x.ev.slice(0, 5).join(" / ") + (r.evidenceExtra.trim() ? " / " + r.evidenceExtra.trim() : "") || "(아직 쓰지 않았어요)"),
      "추론: " + t(r.reasoning), "제안: " + t(r.design), "");
    L.push("4. 동료 피드백과 성찰", "잘 연결된 점: " + t(r.peerGood), "더 확인할 점: " + t(r.peerMore), "새롭게 알게 된 점: " + t(r.changed), "");
    L.push("5. 자기 점검: " + CHECKS.map((c, i) => c[0] + (r.checks[i] ? " ☑" : " ☐")).join(", "));
    return L.join("\n");
  }
  const DOC_CSS = "body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:11pt;line-height:1.6;color:#111}h1{font-size:18pt;text-align:center}h1 small{font-size:12pt;color:#444}" +
    "h2{font-size:13pt;border-bottom:2px solid #333;padding-bottom:2pt;margin-top:18pt}h3{font-size:11pt;margin:10pt 0 2pt}table{border-collapse:collapse;width:100%;margin:6pt 0}" +
    "th,td{border:1px solid #888;padding:4pt 6pt;vertical-align:top;text-align:left}th{background:#eee}.blank{color:#999}caption{font-weight:bold;text-align:left}small{font-weight:normal}.doc-foot{font-size:9pt;color:#555;margin-top:16pt}";

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
    const x = reportData();
    const r = x.r;
    const slides = [
      { t: "① 기후 변화 자료", b: (x.ev.length ? "<ul>" + x.ev.slice(0, 4).map((e) => "<li>📊 " + esc(e) + "</li>").join("") + "</ul>" : "") +
        (r.q1.trim() ? "<p>" + para(r.q1) + "</p>" : "") + (!x.ev.length && !r.q1.trim() ? '<p class="muted">근거를 담거나 1번 질문에 답하면 여기에 나타나요.</p>' : "") },
      { t: "② 생활 영향", b: (x.q ? '<p class="present-q">❓ ' + esc(x.q.q) + "</p>" : "") + "<p>" + para(r.impact) + "</p>" +
        (x.hyps.length ? "<ul>" + x.hyps.map((e) => "<li>💡 " + esc(e) + "</li>").join("") + "</ul>" : "") },
      { t: "③ 적응 아이디어", b: CL.designCardHtml(x.area) + (r.claim.trim() ? '<p class="present-claim"><b>주장</b> ' + para(r.claim) + "</p>" : "") +
        (r.effect.trim() ? "<p><b>기대 효과와 한계</b> " + para(r.effect) + "</p>" : "") },
    ];
    presentIdx = Math.max(0, Math.min(2, presentIdx));
    const s = slides[presentIdx];
    return '<div class="present-card g-' + x.area + '"><div class="present-top"><p class="eyebrow">' + esc(x.a.icon + " " + x.a.name + " · " + x.region + " · " + CL.scenCode(x.scen)) +
      (r.info.team ? " · " + esc(r.info.team) : "") + '</p><button class="btn" data-act="overlay-close" data-autofocus>닫기</button></div>' +
      "<h2>" + esc(s.t) + '</h2><div class="present-body">' + s.b + "</div>" +
      '<div class="present-nav"><button class="btn" data-act="present-go" data-d="-1"' + (presentIdx === 0 ? " disabled" : "") + '>← 이전</button><span>' + (presentIdx + 1) + " / 3</span>" +
      '<button class="btn primary" data-act="present-go" data-d="1"' + (presentIdx === 2 ? " disabled" : "") + ">다음 →</button></div></div>";
  }

  /* ---------- 조작 ---------- */
  function updateProgress() {
    const el = document.getElementById("repProg");
    const prog = CL.reportProgress();
    if (el) { const i = el.querySelector(".bar i"); const b = el.querySelector("b"); if (i) i.style.width = prog + "%"; if (b) b.textContent = prog + "% 완성"; }
    if (CL.renderTabs) CL.renderTabs();
  }
  CL.inputHandlers.push((e) => {
    const d = e.target.dataset || {};
    if (d.rep) { const r = getRep(); r[d.rep] = e.target.value; saveRep(r); updateProgress(); }
    else if (d.repInfo) { const r = getRep(); r.info[d.repInfo] = e.target.value; saveRep(r); updateProgress(); }
  });
  CL.changeHandlers.push((e) => {
    const d = e.target.dataset || {};
    if (d.repCheck != null) { const r = getRep(); r.checks[Number(d.repCheck)] = e.target.checked; saveRep(r); CL.render(); }
  });
  A["rep-region"] = (b) => { const r = getRep(); r.region = b.dataset.v; saveRep(r); CL.render(); };
  A["rep-scen"] = (b) => { const r = getRep(); r.scen = b.dataset.v; saveRep(r); CL.render(); };
  A["rep-area"] = (b) => { CL.state.area = b.dataset.v; CL.persist(); CL.render(); };
  A["rep-go"] = (b) => {
    const S = CL.state;
    S.tab = b.dataset.tab;
    if (b.dataset.tab === "predict" && b.dataset.extra) S.step = Number(b.dataset.extra);
    if (b.dataset.tab === "explore" && b.dataset.extra) S.sub = b.dataset.extra;
    CL.persist();
    CL.render({ top: true });
  };
  A["rep-insert"] = (b) => {
    const r = getRep();
    const region = repRegion(r);
    const lines = b.dataset.h === "h1" ? changeLines(region, repScen(r)) : scenLines(region);
    const k = b.dataset.k;
    r[k] = (r[k].trim() ? r[k].replace(/\s+$/, "") + "\n" : "") + lines.map((x) => "• " + x).join("\n") + "\n→ ";
    saveRep(r);
    CL.render();
    const el = document.getElementById("rep-" + k);
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  };
  A["rep-q3chip"] = (b) => {
    const r = getRep();
    const x = Q3_CHIPS[Number(b.dataset.i)];
    if (r.q3.indexOf(x) >= 0) return;
    r.q3 = (r.q3.trim() ? r.q3.replace(/\s+$/, "") + "\n" : "") + "• " + x + " — ";
    saveRep(r);
    CL.render();
  };
  A["rep-evi-del"] = (b) => {
    const list = CL.getEvidence();
    list.splice(Number(b.dataset.i), 1);
    CL.save("evidence", list);
    CL.render();
  };
  A["rep-design-fill"] = () => {
    const r = getRep();
    const d = CL.designLines(CL.state.area);
    if (d.empty) return;
    const what = d.name ? "‘" + d.name + "’" + CL.josa(d.name, "을", "를") : "이 설계를";
    const detail = d.lines.length ? " (" + d.lines.map((l) => l.k + ": " + l.v).join(" / ") + ")" : "";
    r.design = (r.design.trim() ? r.design.replace(/\s+$/, "") + "\n" : "") + "그래서 " + what + " 제안한다." + detail + " 기대 효과·한계는 ";
    saveRep(r);
    CL.render();
  };
  A["rep-preview"] = () => {
    overlay('<div class="overlay-bar"><button class="btn primary" data-act="rep-print">🖨 인쇄 / PDF로 저장</button><button class="btn" data-act="overlay-close" data-autofocus>닫기</button></div>' +
      '<div class="paper">' + docHtml() + "</div>", "doc-overlay");
  };
  A["rep-print"] = () => {
    document.body.classList.add("printing");
    window.print();
  };
  window.addEventListener("afterprint", () => document.body.classList.remove("printing"));
  A["rep-word"] = () => {
    const html = "﻿<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:w=\"urn:schemas-microsoft-com:office:word\"><head><meta charset=\"utf-8\"><title>탐구 보고서</title><style>" +
      DOC_CSS + "</style></head><body>" + docHtml() + "</body></html>";
    CL.download("미래기후_의식주_탐구보고서.doc", html, "application/msword");
    CL.toast("Word 파일을 저장했어요");
  };
  A["rep-copy"] = () => {
    CL.copyText(plainText()).then((ok) => CL.toast(ok ? "📋 보고서 글을 복사했어요" : "복사하지 못했어요. 미리보기에서 직접 선택해 주세요"));
  };
  A["rep-present"] = () => { presentIdx = 0; overlay(presentHtml(), "present-overlay"); };
  A["present-go"] = (b) => { presentIdx += Number(b.dataset.d); overlay(presentHtml(), "present-overlay"); };
  A["overlay-close"] = () => CL.closeOverlay();
  A["rep-clear"] = () => {
    if (!window.confirm("이 기기에 저장된 보고서·예측·질문·근거·설계 카드·나만의 웹 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    ["report", "preds", "evidence", "web"].forEach((k) => CL.save(k, null));
    CL.AREA_IDS.forEach((a) => ["questions.", "build.", "hyp."].forEach((p) => CL.save(p + a, null)));
    CL.toast("모든 기록을 지웠어요");
    CL.render({ top: true });
  };
})();
