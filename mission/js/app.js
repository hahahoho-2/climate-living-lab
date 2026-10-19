/* 미래 기후와 의식주 탐구실 — 화면 전환, ① 기후 예측, ⑤ 자료 찾기 (②·③은 mission.js·proposal.js) — 디자인 의뢰소 시험판 (고칠 필요 없음) */
(function () {
  "use strict";
  const CL = window.CL || {};
  const $ = (id) => document.getElementById(id);
  const main = $("main");
  if (!CL.ok) {
    showLoadError();
    return;
  }
  const esc = CL.esc;
  const D = CL.D;

  const TABS = [
    { id: "predict", n: "①", label: "기후 예측" },
    { id: "mission", n: "②", label: "디자인 의뢰소" },
    { id: "proposal", n: "③", label: "제안서" },
    { id: "web", n: "④", label: "나만의 웹" },
    { id: "find", n: "⑤", label: "자료 찾기" },
  ];
  const SUBS = [
    { id: "ask", label: "❓ 궁금증 질문" },
    { id: "data", label: "📊 데이터로 가설" },
    { id: "cards", label: "🔎 탐색 카드" },
    { id: "build", label: "✏️ 설계 카드" },
  ];
  const SCEN_DESC = {
    low: "재생에너지 기술이 발달해 화석연료 사용이 최소화되고, 친환경적으로 경제가 성장한다고 가정한 시나리오예요.",
    high: "산업기술이 빠르게 발전하면서 화석연료를 많이 쓰고, 도시 위주의 개발이 확대된다고 가정한 시나리오예요.",
  };
  const REASONS = ["지금까지 변한 속도대로", "앞으로 더 빨라질 것 같아서", "온실가스를 줄이면 덜 변할 것 같아서", "배출 시나리오를 생각해서", "감으로 골랐어요"];
  const Q_STARTERS = ["왜 ___일까?", "만약 ___라면 어떻게 될까?", "어떻게 하면 ___할 수 있을까?", "앞으로 ___은(는) 어떻게 달라질까?", "___와(과) ___는 무엇이 다를까?"];

  CL.views = CL.views || {};
  CL.actions = CL.actions || {};
  CL.inputHandlers = CL.inputHandlers || [];
  CL.changeHandlers = CL.changeHandlers || [];
  CL.afterRender = CL.afterRender || [];

  /* ---------- 상태 ---------- */
  const saved = CL.load("state", {}) || {};
  const S = (CL.state = {
    tab: TABS.some((t) => t.id === saved.tab) ? saved.tab : "predict",
    step: [1, 2, 3].indexOf(saved.step) >= 0 ? saved.step : 1,
    region: CL.regions().indexOf(saved.region) >= 0 ? saved.region : CL.regions()[0],
    ind: CL.IND[saved.ind] ? saved.ind : "temp",
    scen: CL.SCENS.indexOf(saved.scen) >= 0 ? saved.scen : D.defaultScenario === "high" ? "high" : "low",
    period: [1, 2, 3].indexOf(saved.period) >= 0 ? saved.period : 2,
    area: CL.AREA_IDS.indexOf(saved.area) >= 0 ? saved.area : CL.AREA_IDS[0],
    sub: SUBS.some((x) => x.id === saved.sub) ? saved.sub : "ask",
    filter: {},
    tag: "전체",
    showOther: false,
    showTrend: false,
    help: false,
    fiberTable: false,
    formScen: "low",
    tables: {},
    open: {},
  });
  CL.persist = () => CL.save("state", { tab: S.tab, step: S.step, region: S.region, ind: S.ind, scen: S.scen, period: S.period, area: S.area, sub: S.sub });

  function fixState() {
    const regs = CL.regions();
    if (regs.indexOf(S.region) < 0) S.region = regs[0];
    if (CL.indsFor(S.region).indexOf(S.ind) < 0) S.ind = "temp";
  }

  /* ---------- 공통 조각 ---------- */
  function seg(act, items, current, label) {
    return '<div class="seg" role="group" aria-label="' + esc(label || "") + '">' + items.map((it) =>
      '<button data-act="' + act + '" data-v="' + esc(it.v) + '" data-fk="' + act + "-" + esc(it.v) + '" aria-pressed="' + (String(it.v) === String(current)) + '">' +
      (it.sw ? '<span class="sw ' + it.sw + '"></span>' : "") + "<span>" + esc(it.label) + "</span>" + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "") + "</button>"
    ).join("") + "</div>";
  }
  function regionSeg() {
    return seg("region", CL.regions().map((r) => ({ v: r, label: r, sw: CL.regionColor(r) })), S.region, "지역");
  }
  function scenSeg() {
    return seg("scen", CL.SCENS.map((s) => ({ v: s, label: CL.scenCode(s), sub: CL.scenName(s), sw: "s-" + s })), S.scen, "시나리오");
  }
  function indSeg() {
    return seg("ind", CL.indsFor(S.region).map((id) => ({ v: id, label: CL.indName(id) })), S.ind, "지표");
  }
  function periodSeg() {
    return seg("period", [1, 2, 3].map((p) => ({ v: p, label: CL.PERIODS[p].short, sub: CL.PERIODS[p].years })), S.period, "기간");
  }
  function ctrlRow(parts) {
    return '<div class="ctrl-row">' + parts.map((p) => '<div class="ctrl"><span class="ctrl-label">' + esc(p[0]) + "</span>" + p[1] + "</div>").join("") + "</div>";
  }
  function sectionTitle(title, desc) {
    return '<div class="section-title"><h2>' + esc(title) + "</h2>" + (desc ? "<p>" + esc(desc) + "</p>" : "") + "</div>";
  }
  function thinkBox(qs, title) {
    return '<div class="think"><b>💬 ' + esc(title || "생각해 보기") + "</b><ul>" + qs.map((q) => "<li>" + esc(q) + "</li>").join("") + "</ul></div>";
  }
  function deltaBadge(id, from, to, suffix) {
    if (from == null || to == null) return "";
    const d = to - from;
    const dec = CL.decOf(id);
    if (CL.isZero(d, dec)) return '<span class="delta">= 변화 없음</span>';
    const up = d > 0;
    const ratio = CL.ratioText(id, from, to);
    return '<span class="delta ' + (up ? "up" : "down") + '"><span class="dv"><span aria-hidden="true">' + (up ? "▲" : "▼") + "</span> " +
      CL.fmtNum(Math.abs(d), dec) + esc(CL.unitShort(id)) + "</span>" + (ratio && ratio.indexOf("배") > 0 ? '<span class="dv">' + esc(ratio) + "</span>" : "") +
      '<span class="sr">' + (up ? " 증가" : " 감소") + "</span><em>" + esc(suffix || "현재보다") + "</em></span>";
  }
  function tableToggle(key) {
    return '<button class="link-btn" data-act="table" data-v="' + esc(key) + '">' + (S.tables[key] ? "표 닫기" : "표로 보기") + "</button>";
  }
  function factLine(text) {
    const on = CL.hasEvidence(text);
    return '<li class="fact"><span>' + esc(text) + '</span><button class="pin" data-act="evi-toggle" data-snap="' + esc(text) + '" aria-pressed="' + on + '">' + (on ? "📌 담김" : "📌 근거로 담기") + "</button></li>";
  }
  CL.factLine = factLine;
  // 미션·제안서 모듈이 함께 쓰는 화면 조각
  CL.ui = { seg: seg, regionSeg: regionSeg, scenSeg: scenSeg, periodSeg: periodSeg, ctrlRow: ctrlRow, sectionTitle: sectionTitle, thinkBox: thinkBox, deltaBadge: deltaBadge, tableToggle: tableToggle };
  function evidenceCount() {
    return CL.getEvidence().length;
  }

  /* ======================================================================
     ① 기후 예측
     ====================================================================== */
  function predKey() {
    return S.region + "|" + S.ind + "|" + S.scen;
  }
  function getPreds() {
    return CL.load("preds", {}) || {};
  }
  function getPred(key) {
    const p = getPreds()[key] || {};
    return { p2: CL.num(p.p2), p3: CL.num(p.p3), reasons: Array.isArray(p.reasons) ? p.reasons : [], note: typeof p.note === "string" ? p.note : "" };
  }
  function setPred(key, pr) {
    const all = getPreds();
    all[key] = pr;
    CL.save("preds", all);
  }
  CL.getPreds = getPreds;
  function trendAt(ser, p) {
    if (ser[0] == null || ser[1] == null) return null;
    const m = CL.PERIODS.map((x) => x.mid);
    return ser[0] + ((ser[1] - ser[0]) / (m[1] - m[0])) * (m[p] - m[0]);
  }

  function predictView() {
    fixState();
    const steps = [[1, "자료 확인"], [2, "예측하기"], [3, "전망 비교"]];
    let h = '<nav class="stepnav-wrap" aria-label="예측 단계"><div class="stepnav">' + steps.map((s) =>
      '<button data-act="step" data-v="' + s[0] + '" data-fk="step-' + s[0] + '" aria-current="' + (S.step === s[0] ? "step" : "false") + '"><b>' + s[0] + "</b>" + s[1] + "</button>"
    ).join('<span class="stepnav-line" aria-hidden="true"></span>') + "</div></nav>";
    if (S.step === 1) h += predictStep1();
    else if (S.step === 2) h += predictStep2();
    else h += predictStep3();
    return h;
  }

  function timeline() {
    const year = new Date().getFullYear();
    const pos = Math.max(0, Math.min(100, year - 2000));
    const seg = (p, cls) => '<div class="tl-seg ' + (cls || "") + '"><b>' + esc(CL.PERIODS[p].short) + "</b><small>" + esc(CL.PERIODS[p].years) + "</small></div>";
    return '<section class="panel"><div class="panel-head"><div><h3>기간 한눈에 보기</h3><p class="panel-desc">모든 값은 20년 동안의 평균이에요. 특정 해의 날씨를 말하지 않아요.</p></div></div>' +
      '<div class="timeline"><div class="tl-track">' + seg(0, "now") + seg(1) + seg(2) + '<div class="tl-seg gap"><b>…</b><small>2061–2080</small></div>' + seg(3) + "</div>" +
      '<div class="tl-here" style="left:' + pos + '%"><span>지금 ' + year + "</span></div></div>" +
      '<ul class="plain small tl-notes"><li><b>현재(2000–2019)</b> 값은 실제 관측값이 아니라, 기후모델이 그 시기의 기후를 재현해 계산한 값이에요. 그래서 관측 기록과 조금 다를 수 있어요.</li>' +
      "<li><b>전반기(2021–2040)</b>에는 지금(" + year + "년)이 들어 있지만, 이 기간의 값도 관측이 아니라 시나리오에 따른 전망값이에요.</li></ul></section>";
  }

  function predictStep1() {
    const r = S.region;
    const sc = S.scen;
    const others = CL.regions().filter((x) => x !== r);
    let h = sectionTitle("1. 예측에 필요한 자료 확인하기", r + "의 현재(2000–2019)와 전반기(2021–2040) 자료를 먼저 살펴보세요.");
    h += ctrlRow([["지역", regionSeg()], ["시나리오", scenSeg()]]);
    h += '<div class="two">' + CL.SCENS.map((s) =>
      '<button class="scen-card" data-act="scen" data-v="' + s + '" aria-pressed="' + (s === sc) + '"><span class="scen-line s-' + s + '"></span>' +
      "<b>" + esc(CL.scenFull(s)) + "</b><span>" + esc(SCEN_DESC[s]) + "</span></button>").join("") + "</div>";
    h += '<p class="note">시나리오는 ‘이런 미래라면’을 가정한 전망이에요. 어느 하나가 반드시 일어난다는 예보가 아니에요. ' +
      "이 앱은 차이가 큰 두 시나리오만 담았고, 기상청 포털에는 중간 시나리오(SSP2-4.5, SSP3-7.0)도 있어요.</p>";
    h += '<div class="guide"><b>🧭 길잡이 · 자료를 읽을 때 꼭 확인해요</b><span>① 어느 <b>지역</b>인가요? ② 어떤 <b>시나리오</b>인가요? ③ 어느 <b>기간</b>의 평균인가요? ④ <b>단위</b>는 무엇인가요?</span></div>';
    h += timeline();
    h += sectionTitle("지표별로 살펴보기", CL.scenFull(sc) + " 기준 · 카드를 누르면 그 지표를 예측하러 가요.");
    h += '<div class="tiles">' + CL.indsFor(r).map((id) => {
      const v0 = CL.val(r, id, sc, 0);
      const v1 = CL.val(r, id, sc, 1);
      const m = CL.IND[id];
      return '<button class="tile" data-act="pick-ind" data-v="' + esc(id) + '">' +
        '<span class="tile-name">' + esc(m.name) + '</span><span class="tile-desc">' + esc(m.desc || "") + "</span>" +
        '<span class="tile-vals"><span><small>현재</small><b>' + (v0 == null ? "–" : CL.fmtVal(id, v0)) + '</b></span><span class="arrow" aria-hidden="true">→</span>' +
        "<span><small>전반기</small><b>" + (v1 == null ? "–" : CL.fmtVal(id, v1)) + "</b></span><span class=\"unit\">" + esc(m.unit) + "</span></span>" +
        deltaBadge(id, v0, v1, "20년 사이") + '<span class="tile-go">이 지표 예측하기 →</span></button>';
    }).join("") + "</div>";
    h += thinkBox([
      "20년 사이 가장 크게 달라진 지표는 무엇인가요?",
      "이 속도로 계속 변할까요, 더 빨라질까요, 느려질까요?",
      others.length ? others[0] + "과(와) 비교하면 어떤 차이가 있을까요? 위에서 지역을 바꿔 보세요." : "다른 지역과 비교하면 어떤 차이가 있을까요?",
    ]);
    h += '<div class="next-row"><button class="btn primary" data-act="step" data-v="2">2. 예측하러 가기 →</button></div>';
    return h;
  }

  function predictStep2() {
    const r = S.region;
    const id = S.ind;
    const sc = S.scen;
    const m = CL.IND[id];
    const ser = CL.series(r, id, sc);
    const pr = getPred(predKey());
    let h = sectionTitle("2. " + m.name + " 예측하기", r + " · " + CL.scenFull(sc) + " — 현재와 전반기 값을 보고 중반기·후반기를 예측해 보세요.");
    h += ctrlRow([["지역", regionSeg()], ["지표", indSeg()], ["시나리오", scenSeg()]]);
    if (ser[0] == null || ser[1] == null) {
      return h + '<p class="empty-note">이 지역·시나리오에는 현재와 전반기 자료가 모두 있어야 예측할 수 있어요. ⑤ 자료 찾기에서 자료를 추가해 보세요.</p>';
    }
    const legendItems = [["s-" + sc, CL.scenFull(sc)], ["s-pred", "내 예측"]];
    if (S.help) legendItems.push(["s-trend", "단순 추세"]);
    h += '<section class="panel"><div class="panel-head"><div><h3>내 예측 그래프</h3><p class="panel-desc">' + esc(m.desc || "") + " · 단위 " + esc(m.unit) +
      " · <b>?</b> 자리는 아직 비밀이에요</p></div></div>" + CL.legend(legendItems) + '<div class="chart" data-chart="predict2"></div></section>';

    const step = m.step || 1;
    h += '<section class="panel"><div class="panel-head"><div><h3>중반기·후반기 값을 예측해요</h3><p class="panel-desc">− / + 버튼을 누르면 ' +
      esc(CL.fmtNum(step, CL.decimals(step)) + CL.unitShort(id)) + "씩 바뀌어요. 숫자를 눌러 직접 입력해도 돼요.</p></div></div>";
    h += '<div class="guide"><b>🧭 길잡이 · 예측하기 전에 생각해 봐요</b><span>① 지금까지 얼마나 변했나요? ② 온실가스를 많이 내보내는 미래인가요, 줄이는 미래인가요? ' +
      "③ 앞으로도 같은 속도로 변할까요? — 정답을 맞히는 활동이 아니라, 내 생각과 전망을 비교하며 배우는 활동이에요.</span></div>";
    h += '<div class="pred-rows">' + [2, 3].map((p) => {
      const pv = pr["p" + p];
      const dec = Math.max(CL.decOf(id), CL.decimals(step));
      return '<div class="pred-row"><span class="pred-year">' + esc(CL.PERIODS[p].short) + "<small>" + esc(CL.PERIODS[p].years) + "</small></span>" +
        '<span class="stepper"><button class="step" data-act="pred-step" data-p="' + p + '" data-d="-1" data-fk="ps-' + p + '-m" aria-label="' + esc(CL.PERIODS[p].short) + ' 예측 낮추기">−</button>' +
        '<input class="pred-input" data-pred-p="' + p + '" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="?" value="' + (pv == null ? "" : pv.toFixed(dec)) + '" aria-label="' + esc(CL.PERIODS[p].short) + ' 내 예측값">' +
        '<button class="step" data-act="pred-step" data-p="' + p + '" data-d="1" data-fk="ps-' + p + '-p" aria-label="' + esc(CL.PERIODS[p].short) + ' 예측 높이기">+</button>' +
        '<span class="pred-unit">' + esc(m.unit) + "</span></span>" +
        '<span class="pred-hint">' + (pv == null ? "아직 예측 전이에요" : "전반기보다 " + esc(CL.deltaText(id, ser[1], pv))) + "</span></div>";
    }).join("") + "</div>";

    h += '<button class="link-btn" data-act="toggle-help" aria-expanded="' + S.help + '">💡 ' + (S.help ? "도움 닫기" : "도움 받기: 지금까지의 변화가 그대로 이어진다면?") + "</button>";
    if (S.help) {
      const t2 = trendAt(ser, 2);
      const t3 = trendAt(ser, 3);
      h += '<div class="helpbox">현재 → 전반기, 20년 동안 <b>' + esc(CL.deltaText(id, ser[0], ser[1])) + "</b> 변했어요. 같은 속도로 계속된다면 중반기에는 <b>" +
        esc(CL.fmtVal(id, t2) + CL.unitShort(id)) + "</b>, 후반기에는 <b>" + esc(CL.fmtVal(id, t3) + CL.unitShort(id)) +
        "</b> 정도가 돼요.<br><small>단순 계산이에요. 기상청 전망이 아니에요. 실제 기후는 온실가스 배출에 따라 더 빨라지거나 느려질 수 있어요.</small></div>";
    }
    h += '<span class="field-label">내 예측의 근거 <small>여러 개 골라도 돼요</small></span><div class="chips">' + REASONS.map((x, i) => {
      const on = pr.reasons.indexOf(x) >= 0;
      return '<button class="chip" data-act="pred-reason" data-i="' + i + '" aria-pressed="' + on + '">' + esc(x) + '<span class="plus" aria-hidden="true">' + (on ? "✓" : "＋") + "</span></button>";
    }).join("") + "</div>";
    h += '<label class="field-label" for="predNote">더 적고 싶은 이유 <small>선택</small></label><textarea class="idea short" id="predNote" data-pred-note="1" placeholder="예: 전반기에 이미 많이 올라서 앞으로도 비슷하게 오를 것 같아요.">' + esc(pr.note) + "</textarea>";
    h += "</section>";
    h += '<div class="next-row"><button class="btn" data-act="step" data-v="1">← 자료 다시 보기</button><button class="btn primary" data-act="step" data-v="3">3. 기상청 전망 확인하기 →</button></div>';
    return h;
  }

  function predictStep3() {
    const r = S.region;
    const id = S.ind;
    const sc = S.scen;
    const other = sc === "low" ? "high" : "low";
    const m = CL.IND[id];
    const ser = CL.series(r, id, sc);
    const pr = getPred(predKey());
    const dec = CL.decOf(id);
    let h = sectionTitle("3. 기상청 전망과 비교하기", r + " · " + m.name + " — 내 예측과 실제 시나리오 전망을 비교해 보세요.");
    h += ctrlRow([["지역", regionSeg()], ["지표", indSeg()], ["시나리오", scenSeg()]]);

    // A. 내 예측 vs 전망
    const legendItems = [["s-" + sc, CL.scenFull(sc)]];
    if (S.showOther) legendItems.push(["s-" + other, CL.scenFull(other)]);
    if (pr.p2 != null || pr.p3 != null) legendItems.push(["s-pred", "내 예측"]);
    if (S.showTrend) legendItems.push(["s-trend", "단순 추세"]);
    h += '<section class="panel"><div class="panel-head"><div><h3>내 예측 vs 기상청 전망</h3><p class="panel-desc">' + esc(m.desc || "") + " · 단위 " + esc(m.unit) + "</p></div></div>" +
      CL.legend(legendItems) + '<div class="chart" data-chart="predict3"></div>' +
      '<div class="toggles"><button class="chip" data-act="toggle-other" aria-pressed="' + S.showOther + '">' + esc(CL.scenCode(other)) + " 함께 보기</button>" +
      '<button class="chip" data-act="toggle-trend" aria-pressed="' + S.showTrend + '">단순 추세선 보기</button></div>';
    h += '<div class="cmp-rows">' + [2, 3].map((p) => {
      const v = ser[p];
      const pv = pr["p" + p];
      let tail;
      if (v == null) tail = "전망 자료가 없어요";
      else if (pv == null) tail = '아직 예측하지 않았어요 <button class="link-btn inline" data-act="step" data-v="2">예측하기</button>';
      else {
        const diff = pv - v;
        tail = CL.isZero(diff, dec) ? "<b>거의 같게 예측했어요!</b>" : "내 예측이 <b>" + CL.fmtNum(Math.abs(diff), dec) + esc(CL.unitShort(id)) + " " + (diff > 0 ? "높아요" : "낮아요") + "</b>";
      }
      return '<div class="cmp-row"><span class="cmp-p">' + esc(CL.PERIODS[p].short) + "<small>" + esc(CL.PERIODS[p].years) + "</small></span>" +
        '<span>기상청 <b>' + (v == null ? "–" : CL.fmtVal(id, v) + esc(CL.unitShort(id))) + "</b> · 내 예측 <b>" + (pv == null ? "–" : CL.fmtNum(pv, dec) + esc(CL.unitShort(id))) + "</b></span>" +
        '<span class="cmp-tail">' + tail + "</span></div>";
    }).join("") + "</div>";
    h += '<p class="note">ℹ️ 기상청 값도 ‘정답’이 아니라 ‘이 시나리오라면’ 기후모델로 계산한 결과의 평균(앙상블 평균)이에요. 그래서 실제 미래와 다를 수 있어요.</p>';

    // 숫자 읽기 도우미
    const facts = [];
    [2, 3].forEach((p) => { if (ser[p] != null) facts.push(CL.snapshot(r, id, sc, p)); });
    const vo = CL.val(r, id, other, 3);
    if (vo != null) facts.push(CL.snapshot(r, id, other, 3));
    if (ser[3] != null && vo != null) {
      const hi = sc === "high" ? ser[3] : vo;
      const lo = sc === "high" ? vo : ser[3];
      facts.push(r + " " + m.name + " 후반기(2081–2100): " + CL.scenCode("high") + " " + CL.fmtVal(id, hi) + m.unit + " vs " + CL.scenCode("low") + " " + CL.fmtVal(id, lo) + m.unit +
        " (차이 " + CL.fmtVal(id, Math.abs(hi - lo)) + CL.unitShort(id) + ")");
    }
    let pace = "";
    if (ser[1] != null && ser[2] != null && ser[3] != null) {
      const a = ser[2] - ser[1];
      const b = (ser[3] - ser[2]) / 2; // 중반기→후반기는 40년 차이라 20년 단위로 나눔
      const tiny = 0.5 * Math.pow(10, -dec);
      const sgn = (x) => (x >= 0 ? "+" : "−") + CL.fmtNum(Math.abs(x), dec) + CL.unitShort(id);
      let msg;
      if (Math.abs(a) < tiny && Math.abs(b) < tiny) msg = " — 거의 변하지 않는 전망이에요.";
      else if (a * b < 0 && Math.abs(a) >= tiny && Math.abs(b) >= tiny) msg = a > 0 ? " — 늘어나다가 후반기에는 줄어드는 전망이에요. 늘 같은 방향으로만 변하지는 않아요." : " — 줄어들다가 후반기에는 다시 늘어나는 전망이에요. 늘 같은 방향으로만 변하지는 않아요.";
      else if (Math.abs(b) > Math.abs(a) * 1.3) msg = " — 시간이 갈수록 변화가 빨라지는 전망이에요.";
      else if (Math.abs(b) < Math.abs(a) * 0.7) msg = " — 시간이 갈수록 변화가 느려지는 전망이에요.";
      else msg = " — 비슷한 속도로 변하는 전망이에요.";
      pace = '<p class="pace">📈 ' + esc(CL.scenCode(sc)) + "에서 20년마다 변하는 크기: 전반기→중반기 <b>" + esc(sgn(a)) +
        "</b>, 중반기→후반기 <b>약 " + esc(sgn(b)) + "</b>" + msg + "</p>";
    }
    h += '<div class="facts-box"><b>🔢 숫자 읽기 도우미</b> <small>② 단서 보드에서 쓸 근거는 📌로 담아 두세요 (지금 ' + evidenceCount() + "개)</small>" + pace + '<ul class="facts">' + facts.map(factLine).join("") + "</ul></div>";
    h += thinkBox([
      "내 예측과 가장 많이 다른 기간은 언제인가요? 왜 그렇게 예측했나요?",
      "두 시나리오의 차이는 언제부터 커지나요? 그 이유는 무엇일까요?",
      "이 변화는 누구의 생활에 가장 먼저 영향을 줄까요?",
      "더 탐구하기: 기상청 포털에서 중간 시나리오(SSP2-4.5, SSP3-7.0)나 우리 동네(읍면동) 값을 찾아 비교해 보세요. ⑤ 자료 찾기에서 앱에 넣을 수 있어요.",
    ]);
    h += "</section>";

    // B. 지역 비교
    const regs = CL.regions().filter((x) => CL.series(x, id, sc).some((v) => v != null)).slice(0, CL.MAX_REGIONS);
    h += '<section class="panel"><div class="panel-head"><div><h3>지역 비교 한눈에 보기</h3><p class="panel-desc">' + esc(m.name + " · " + CL.scenFull(sc)) + "</p></div></div>";
    h += ctrlRow([["기간", periodSeg()]]);
    h += '<div class="cards">' + regs.map((x) => {
      const v0 = CL.val(x, id, sc, 0);
      const v = CL.val(x, id, sc, S.period);
      return '<div class="icard static"><span class="icard-name"><span class="sw ' + CL.regionColor(x) + '"></span>' + esc(x) + (CL.isImported(x, id, sc) ? ' <small class="badge">내가 찾은 자료</small>' : "") + "</span>" +
        (v == null ? '<span class="icard-value empty">자료 없음</span>' : '<span class="icard-value">' + CL.fmtVal(id, v) + "<small>" + esc(m.unit) + "</small></span>") +
        deltaBadge(id, v0, v) + '<span class="graph-hint">' + esc(CL.periodLabel(S.period)) + "</span></div>";
    }).join("") + "</div>";
    h += (regs.length > 1 ? CL.legend(regs.map((x) => [CL.regionColor(x), x])) : "") + '<div class="chart" data-chart="regions"></div>';
    h += '<div class="chart-foot"><span class="small muted">점을 누르면 값이 보여요.</span>' + tableToggle("regions") + "</div>";
    if (S.tables.regions) h += regionTable(regs, id, sc);
    const scale = regs.map((x) => (D.regionNotes && D.regionNotes[x] ? x + CL.josa(x, "은", "는") + " " + D.regionNotes[x] : "")).filter(Boolean);
    if (scale.length > 1) h += '<p class="note">📏 ' + esc(scale.join(", ")) + "이에요. 넓이가 다른 지역을 비교한다는 점도 생각해 봐요.</p>";
    if (m.note) h += '<p class="note">ℹ️ ' + esc(m.note) + "</p>";
    h += "</section>";

    // C. 모든 지표
    h += '<section class="panel"><div class="panel-head"><div><h3>' + esc(r) + " 모든 지표 한눈에</h3><p class=\"panel-desc\">두 시나리오를 함께 비교해요. 제목을 누르면 그 지표로 바뀌어요.</p></div></div>" +
      CL.legend(CL.SCENS.map((s) => ["s-" + s, CL.scenFull(s)])) + '<div class="minis">' + CL.indsFor(r).map((x) =>
        '<div class="mini"><button class="mini-title" data-act="ind" data-v="' + esc(x) + '">' + esc(CL.indName(x)) + " <small>" + esc(CL.unit(x)) + "</small></button>" +
        '<div class="chart" data-chart="mini" data-ind="' + esc(x) + '"></div></div>').join("") + "</div></section>";
    h += '<div class="next-row"><button class="btn primary" data-act="tab" data-v="mission">② 디자인 의뢰소로 →</button></div>';
    return h;
  }

  function regionTable(regs, id, sc) {
    const two = regs.length === 2;
    let t = '<div class="table-scroll"><table class="dtable"><thead><tr><th>기간</th>' + regs.map((x) => "<th>" + esc(x) + "</th>").join("") +
      (two ? "<th>" + esc(regs[1] + "−" + regs[0]) + "</th>" : "") + "</tr></thead><tbody>";
    CL.PERIODS.forEach((p, i) => {
      t += "<tr><th>" + esc(p.short + " " + p.years) + "</th>" + regs.map((x) => { const v = CL.val(x, id, sc, i); return "<td>" + (v == null ? "–" : CL.fmtVal(id, v)) + "</td>"; }).join("");
      if (two) {
        const a = CL.val(regs[0], id, sc, i);
        const b = CL.val(regs[1], id, sc, i);
        t += "<td>" + (a == null || b == null ? "–" : (b - a > 0 ? "+" : b - a < 0 ? "−" : "") + CL.fmtVal(id, Math.abs(b - a))) + "</td>";
      }
      t += "</tr>";
    });
    return t + "</tbody></table></div><p class=\"note\">단위: " + esc(CL.unit(id)) + "</p>";
  }

  /* ======================================================================
     ⑤ 자료 찾기
     ====================================================================== */
  const SOURCES = [
    { name: "기상청 기후정보포털 — 행정구역별 기후변화 전망", url: "https://www.climate.go.kr/home/CCS/contents_2021/33_2_areapoint_basic_ssp.php", desc: "이 앱 기본값의 출처예요. 지역·SSP·기후 요소를 골라 기간별 그래프와 표를 볼 수 있어요. (용인시는 ‘기초’, 서울특별시는 ‘광역’으로 조회)" },
    { name: "기상청 기후변화 상황지도", url: "https://www.climate.go.kr/atlas/", desc: "지도에서 지역 차이와 과거부터 미래까지의 변화를 찾아보세요." },
    { name: "기상자료개방포털", url: "https://data.kma.go.kr/", desc: "실제로 관측된 과거 기온·강수량을 찾을 수 있어요." },
    { name: "경기도 기후변화 전망보고서(2023)", url: "https://www.climate.go.kr/home/cc_data/2024/%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EA%B8%B0%ED%9B%84%EB%B3%80%ED%99%94%20%EC%A0%84%EB%A7%9D%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf", desc: "용인시의 연평균기온·연강수량·폭염일수 전망이 실려 있어요(앱 값과 같아요)." },
    { name: "서울특별시 기후변화 전망보고서(2023)", url: "https://www.climate.go.kr/home/cc_data/2024/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C%20%EA%B8%B0%ED%9B%84%EB%B3%80%ED%99%94%20%EC%A0%84%EB%A7%9D%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf", desc: "서울특별시의 연평균기온·연강수량·폭염일수 전망이 실려 있어요(앱 값과 같아요)." },
    { name: "기후변화 시나리오 자료 안내", url: "https://www.climate.go.kr/home/CCS/_image/web_manual/data_information.pdf", desc: "전망 자료의 공간·시간 범위와 기후 요소를 확인해요." },
    { name: "농사로(농촌진흥청 농업기술포털)", url: "https://www.nongsaro.go.kr/", desc: "작물별 재배 환경·재배 시기·재배 기술을 찾아요." },
    { name: "농촌진흥청", url: "https://www.rda.go.kr/", desc: "기후변화와 농업 연구 자료를 찾아요." },
    { name: "과수생육·품질관리시스템", url: "https://fruit.nihhs.go.kr/", desc: "과수 생육 정보와 재배 적지 지도를 찾아요." },
  ];

  function findView() {
    let h = sectionTitle("⑤ 자료 더 찾기", "기상청 포털에서 우리 동네 같은 다른 지역의 값을 찾아 앱에 넣고 비교해 보세요.");
    h += '<section class="panel"><div class="panel-head"><div><h3>🧭 기상청 포털에서 직접 찾기</h3></div></div>' +
      '<ol class="steps-list"><li>기후정보포털 → 기후변화 시나리오 → <b>행정구역</b> 화면 열기 (아래 버튼)</li>' +
      "<li><b>시나리오</b>(SSP1-2.6, SSP5-8.5 등)와 <b>행정구역</b>(광역·기초·읍면동) 고르기</li>" +
      "<li><b>요소</b> 고르기: 기후요소(평균기온·강수량) 또는 극한기후지수(폭염일수·열대야일수·5일 최다강수량 등)</li>" +
      "<li><b>기간</b>을 ‘21세기 전망 – 전/중/후반기’로 고르고 <b>조회</b></li>" +
      "<li>표에서 <b>기간과 단위</b>를 확인하고 값 옮겨 적기 (현재 2000~2019, 전반기 2021~2040, 중반기 2041~2060, 후반기 2081~2100)</li></ol>" +
      '<a class="btn primary" href="' + esc(SOURCES[0].url) + '" target="_blank" rel="noopener">행정구역별 전망 열기 ↗</a></section>';

    // 직접 입력
    const regs = CL.regions();
    h += '<section class="panel"><div class="panel-head"><div><h3>✍️ 찾은 값 직접 넣기</h3><p class="panel-desc">한 번에 지표 1개, 시나리오 1개씩 넣어요. 모르는 칸은 비워 둬도 돼요.</p></div></div>' +
      '<div class="form-grid"><label class="field-label" for="fRegion">지역 이름</label><input class="text-input" id="fRegion" list="regionList" maxlength="20" placeholder="예: 수원시">' +
      '<datalist id="regionList">' + regs.map((x) => '<option value="' + esc(x) + '">').join("") + "</datalist>" +
      '<label class="field-label" for="fInd">지표</label><select class="text-input" id="fInd">' + Object.keys(CL.IND).map((id) =>
        '<option value="' + esc(id) + '">' + esc(CL.indName(id) + " (" + CL.unit(id) + ")") + "</option>").join("") + "</select>" +
      '<span class="field-label">시나리오</span>' + seg("form-scen", CL.SCENS.map((s) => ({ v: s, label: CL.scenCode(s), sub: CL.scenName(s), sw: "s-" + s })), S.formScen, "입력할 시나리오") +
      '<span class="field-label">기간별 값</span><div class="four">' + CL.PERIODS.map((p, i) =>
        '<label><span>' + esc(p.short) + "<small>" + esc(p.years) + '</small></span><input class="text-input" id="fV' + i + '" inputmode="decimal" placeholder="–"></label>').join("") + "</div>" +
      '<div class="next-row left"><button class="btn primary" data-act="manual-add">자료 추가하기</button></div><p class="status" id="manualStatus" role="status"></p></div></section>';

    // CSV
    h += '<section class="panel"><div class="panel-head"><div><h3>📄 CSV 파일로 불러오기</h3><p class="panel-desc">양식에 지역·지표·시나리오와 네 기간 값을 적어 불러와요. 파일은 이 기기에서만 읽고 어디에도 보내지 않아요.</p></div></div>' +
      '<div class="chips"><a class="chip" href="../data/climate-template.csv" download>⬇️ 지역용 CSV 양식</a><a class="chip" href="../data/yongin-seoul-ssp-sample.csv" download>⬇️ 용인·서울 예시 CSV</a></div>' +
      '<label class="file-pick"><span class="btn">📂 CSV 파일 고르기</span><input type="file" id="csvFile" accept=".csv,text/csv"></label><p class="status" id="csvStatus" role="status"></p></section>';

    // 불러온 자료
    const imp = Object.keys(CL.imported);
    h += '<section class="panel"><div class="panel-head"><div><h3>🗂️ 내가 추가한 자료</h3><p class="panel-desc">이 기기에만 저장돼요. 지역은 모두 ' + CL.MAX_REGIONS + "곳까지 비교할 수 있어요.</p></div></div>";
    h += imp.length ? '<ul class="imp-list">' + imp.map((reg) => {
      const parts = [];
      Object.keys(CL.imported[reg]).forEach((ind) => CL.SCENS.forEach((s) => { if (CL.imported[reg][ind][s]) parts.push(CL.indName(ind) + " " + CL.scenCode(s)); }));
      return '<li><span class="sw ' + CL.regionColor(reg) + '"></span><div><b>' + esc(reg) + "</b><small>" + esc(parts.join(" · ")) + '</small></div><button class="btn small" data-act="imp-del" data-v="' + esc(reg) + '">지우기</button></li>';
    }).join("") + "</ul>" : '<p class="empty-note">아직 추가한 자료가 없어요.</p>';
    h += "</section>";

    h += '<section class="panel"><div class="panel-head"><div><h3>📚 공식 자료</h3></div></div><ul class="sources">' + SOURCES.map((x) =>
      '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name) + " ↗</a><span>" + esc(x.desc) + "</span></li>").join("") + "</ul></section>";
    h += '<section class="panel notice"><h3>⚠️ 자료를 해석할 때 기억할 점</h3><ul class="plain">' +
      "<li>미래 기후는 날씨 예보가 아니라 시나리오별 <b>20년 기간 평균</b> 전망이에요. 기후모델 결과의 평균이라 불확실성이 있어요.</li>" +
      "<li><b>현재(2000–2019)</b> 값도 관측값이 아니라 기후모델이 과거를 재현한 값이에요. 실제 관측 기록은 기상자료개방포털에서 찾을 수 있어요.</li>" +
      "<li>폭염일수·열대야일수는 1년 동안의 <b>합계</b>예요. 그만큼 연속으로 이어진다는 뜻이 아니에요.</li>" +
      "<li>연강수량만으로 장마 시작·끝 날짜나 폭우·폭설의 날짜를 알 수 없어요. 큰비의 크기는 5일 최다강수량 같은 극한 지수로, 계절별 변화는 월별 강수량으로 따로 확인해요.</li>" +
      "<li>작물 재배 가능성은 토양·품종·물·병해충·기술도 함께 살펴야 해요.</li>" +
      "<li>소재·건축 장치의 성능은 기후 표만으로 증명되지 않아요. 따로 조사하고 가정을 밝혀요.</li></ul></section>";
    h += '<section class="panel"><h3>🎬 영화 속 기후와 실제 전망</h3><p>영화 《투모로우》(2004)는 갑작스러운 빙하기를 그린 허구의 재난 영화예요. 영화의 극적인 장면과, 수십 년 평균을 보여 주는 기후 시나리오는 무엇이 다를까요?</p>' +
      '<a class="btn" href="https://www.youtube.com/watch?v=HUBDFoMNXzA" target="_blank" rel="noopener">공식 예고편 보기 ↗</a></section>';
    return h;
  }

  function addImported(region, ind, scen, vals) {
    const regs = CL.regions();
    if (regs.indexOf(region) < 0 && regs.length >= CL.MAX_REGIONS) return "full";
    CL.imported[region] = CL.imported[region] || {};
    CL.imported[region][ind] = CL.imported[region][ind] || {};
    CL.imported[region][ind][scen] = vals;
    return "ok";
  }
  function detectInd(t) {
    const s = String(t).replace(/\s/g, "");
    if (s.indexOf("평균기온") >= 0) return "temp";
    if (s.indexOf("폭염") >= 0) return "heat";
    if (s.indexOf("열대야") >= 0) return "tropical";
    if (s.indexOf("최다강수") >= 0 || (s.indexOf("5일") >= 0 && s.indexOf("강수") >= 0)) return "rain5";
    if (s.indexOf("강수량") >= 0) return "precip";
    return null;
  }
  function detectScen(t) {
    const s = String(t);
    if (/SSP5-?8\.?5|SSP585|고배출|고탄소/i.test(s)) return "high";
    if (/SSP1-?2\.?6|SSP126|저배출|저탄소/i.test(s)) return "low";
    return null;
  }
  function parseCsv(text) {
    const out = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
      } else if (c === "," && !quoted) { row.push(cell.trim()); cell = ""; }
      else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell.trim());
        if (row.some((x) => x !== "")) out.push(row);
        row = [];
        cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell.trim()); out.push(row); }
    return out;
  }
  async function importCsv(file) {
    const status = $("csvStatus");
    try {
      const text = (await file.text()).replace(/^﻿/, "");
      let added = 0;
      let full = 0;
      parseCsv(text).forEach((row) => {
        const region = String(row[0] || "").trim().slice(0, 20);
        const ind = detectInd(row[1] || "");
        const scen = detectScen(row[2] || "");
        if (!region || region === "지역명 입력" || !ind || !scen) return;
        const vals = [3, 4, 5, 6].map((i) => CL.parseNum(row[i]));
        if (vals.every((v) => v == null)) return;
        if (addImported(region, ind, scen, vals) === "full") full++; else added++;
      });
      CL.saveImported();
      CL.clearDecCache();
      render();
      const st = $("csvStatus");
      if (st) st.textContent = added ? added + "개 자료를 불러왔어요." + (full ? " 지역이 " + CL.MAX_REGIONS + "곳을 넘어 " + full + "개는 건너뛰었어요." : "") + " ① 기후 예측에서 확인해 보세요."
        : "불러올 자료를 찾지 못했어요. 지역·지표·시나리오·네 기간 값이 들어 있는 CSV인지 확인해 주세요.";
    } catch (e) {
      if (status) status.textContent = "파일을 읽지 못했어요. UTF-8 CSV 또는 내려받은 양식을 사용해 주세요.";
    }
  }

  /* ======================================================================
     화면 그리기
     ====================================================================== */
  function renderTabs() {
    const prog = CL.reportProgress ? CL.reportProgress() : null;
    $("tabs").innerHTML = TABS.map((t) =>
      '<button class="tab" role="tab" data-act="tab" data-v="' + t.id + '" data-fk="tab-' + t.id + '" aria-selected="' + (S.tab === t.id) + '">' +
      '<span class="tab-n" aria-hidden="true">' + t.n + "</span>" + esc(t.label) + (t.id === "proposal" && prog != null ? ' <span class="tab-prog">' + prog + "%</span>" : "") + "</button>"
    ).join("");
  }
  CL.renderTabs = renderTabs;
  function render(opts) {
    CL.hideTip();
    const y = window.scrollY;
    const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk : null;
    try {
      fixState();
      renderTabs();
      const view = S.tab === "predict" ? predictView : S.tab === "find" ? findView : CL.views[S.tab];
      main.innerHTML = view ? view() : "";
      drawCharts();
      CL.afterRender.forEach((fn) => fn());
    } catch (err) {
      main.innerHTML = '<section class="panel error-box"><h2>화면을 그리는 중 문제가 생겼어요</h2><p>data.js·rules.js·explore.js·missions.js의 형식(대괄호, 쉼표, 따옴표)을 확인해 주세요.</p><pre>' + esc(err && err.message) + "</pre></section>";
      if (window.console) console.error(err);
    }
    window.scrollTo(0, opts && opts.top ? 0 : y);
    if (fk) {
      const el = document.querySelector('[data-fk="' + fk + '"]');
      if (el) el.focus({ preventScroll: true });
    }
  }
  CL.render = render;

  function drawCharts() {
    main.querySelectorAll("[data-chart]").forEach((el) => {
      const type = el.dataset.chart;
      const r = S.region;
      const id = type === "mini" ? el.dataset.ind : S.ind;
      const m = CL.IND[id];
      if (!m) return;
      const dec = CL.decOf(id);
      const base = { unit: m.unit, dec: dec, zero: !!m.zero, aria: m.name + " 그래프" };
      if (type === "predict2") {
        const ser = CL.series(r, id, S.scen);
        const pr = getPred(predKey());
        const pdec = Math.max(dec, CL.decimals(m.step || 1));
        const series = [{ cls: "s-" + S.scen, label: CL.scenFull(S.scen), vals: [ser[0], ser[1], null, null], labels: "all" }];
        if (pr.p2 != null || pr.p3 != null) series.push({ cls: "s-pred", label: "내 예측", vals: [null, ser[1], pr.p2, pr.p3], style: "dash", hollow: true, labels: "all", skipLabel: [1], skipDot: [1], prefix: "예측 ", minor: true, noDelta: true });
        if (S.help) series.push({ cls: "s-trend", label: "단순 추세", tip: "단순 추세(계산값)", vals: [null, ser[1], trendAt(ser, 2), trendAt(ser, 3)], style: "dot", labels: "none", noTip: true });
        CL.lineChart(el, Object.assign(base, { dec: pdec, series: series, unknown: [2, 3] }));
      } else if (type === "predict3") {
        const ser = CL.series(r, id, S.scen);
        const other = S.scen === "low" ? "high" : "low";
        const pr = getPred(predKey());
        const series = [{ cls: "s-" + S.scen, label: CL.scenFull(S.scen), vals: ser, labels: "all" }];
        if (S.showOther) series.push({ cls: "s-" + other, label: CL.scenFull(other), vals: CL.series(r, id, other), labels: "none" });
        if (pr.p2 != null || pr.p3 != null) series.push({ cls: "s-pred", label: "내 예측", vals: [null, ser[1], pr.p2, pr.p3], style: "dash", hollow: true, labels: "all", skipLabel: [1], skipDot: [1], prefix: "예측 ", minor: true, noDelta: true });
        if (S.showTrend) series.push({ cls: "s-trend", label: "단순 추세", vals: [null, ser[1], trendAt(ser, 2), trendAt(ser, 3)], style: "dot", labels: "none", noTip: true });
        CL.lineChart(el, Object.assign(base, { series: series }));
      } else if (type === "regions") {
        const regs = CL.regions().filter((x) => CL.series(x, id, S.scen).some((v) => v != null)).slice(0, CL.MAX_REGIONS);
        CL.lineChart(el, Object.assign(base, { band: S.period, series: regs.map((x) => ({ cls: CL.regionColor(x), label: x, endName: regs.length > 1 ? x : "", vals: CL.series(x, id, S.scen), labels: "end" })) }));
      } else if (type === "mini") {
        CL.lineChart(el, Object.assign(base, { compact: true, series: CL.SCENS.map((s) => ({ cls: "s-" + s, label: CL.scenFull(s), vals: CL.series(r, id, s), labels: "end" })) }));
      }
    });
  }
  CL.drawCharts = drawCharts;

  /* ======================================================================
     조작
     ====================================================================== */
  const A = CL.actions;
  A.tab = (b) => { S.tab = b.dataset.v; CL.persist(); render({ top: true }); };
  A.step = (b) => { S.step = Number(b.dataset.v); CL.persist(); render({ top: true }); };
  A.region = (b) => { S.region = b.dataset.v; CL.persist(); render(); };
  A.scen = (b) => { S.scen = b.dataset.v; CL.persist(); render(); };
  A.ind = (b) => { S.ind = b.dataset.v; CL.persist(); render(); };
  A.period = (b) => { S.period = Number(b.dataset.v); CL.persist(); render(); };
  A["pick-ind"] = (b) => { S.ind = b.dataset.v; S.step = 2; CL.persist(); render({ top: true }); };
  A.table = (b) => { S.tables[b.dataset.v] = !S.tables[b.dataset.v]; render(); };
  A["toggle-help"] = () => { S.help = !S.help; render(); };
  A["toggle-other"] = () => { S.showOther = !S.showOther; render(); };
  A["toggle-trend"] = () => { S.showTrend = !S.showTrend; render(); };
  A["pred-step"] = (b) => {
    const key = predKey();
    const pr = getPred(key);
    const m = CL.IND[S.ind];
    const ser = CL.series(S.region, S.ind, S.scen);
    const p = Number(b.dataset.p);
    let cur = pr["p" + p];
    if (cur == null) cur = p === 3 && pr.p2 != null ? pr.p2 : ser[1] != null ? ser[1] : 0;
    pr["p" + p] = Math.round((cur + Number(b.dataset.d) * (m.step || 1)) * 1000) / 1000;
    setPred(key, pr);
    render();
  };
  A["pred-reason"] = (b) => {
    const key = predKey();
    const pr = getPred(key);
    const x = REASONS[Number(b.dataset.i)];
    const k = pr.reasons.indexOf(x);
    if (k >= 0) pr.reasons.splice(k, 1); else pr.reasons.push(x);
    setPred(key, pr);
    render();
  };
  A["evi-toggle"] = (b) => {
    const added = CL.toggleEvidence(b.dataset.snap);
    CL.toast(added ? "📌 근거로 담았어요 (② 단서 보드에서 고를 수 있어요)" : "근거에서 뺐어요");
    render();
  };

  A["form-scen"] = (b) => { S.formScen = b.dataset.v; const keep = readForm(); render(); writeForm(keep); };
  function readForm() {
    return { r: ($("fRegion") || {}).value, i: ($("fInd") || {}).value, v: [0, 1, 2, 3].map((k) => ($("fV" + k) || {}).value) };
  }
  function writeForm(f) {
    if (!f) return;
    if ($("fRegion")) $("fRegion").value = f.r || "";
    if ($("fInd") && f.i) $("fInd").value = f.i;
    f.v.forEach((x, k) => { if ($("fV" + k)) $("fV" + k).value = x || ""; });
  }
  A["manual-add"] = () => {
    const f = readForm();
    const region = String(f.r || "").trim().slice(0, 20);
    const st = $("manualStatus");
    if (!region) { st.textContent = "지역 이름을 적어 주세요."; return; }
    if (!CL.IND[f.i]) { st.textContent = "지표를 골라 주세요."; return; }
    const vals = f.v.map(CL.parseNum);
    if (vals.every((v) => v == null)) { st.textContent = "기간별 값을 하나 이상 적어 주세요."; return; }
    if (addImported(region, f.i, S.formScen, vals) === "full") { st.textContent = "지역은 " + CL.MAX_REGIONS + "곳까지만 비교할 수 있어요. 아래에서 다른 지역을 지운 뒤 넣어 주세요."; return; }
    CL.saveImported();
    CL.clearDecCache();
    render();
    writeForm({ r: region, i: f.i, v: ["", "", "", ""] });
    const st2 = $("manualStatus");
    if (st2) st2.textContent = "✅ " + region + " · " + CL.indName(f.i) + " · " + CL.scenCode(S.formScen) + " 자료를 넣었어요. ① 기후 예측에서 비교해 보세요.";
  };
  A["imp-del"] = (b) => {
    if (!window.confirm(b.dataset.v + "에 추가한 자료를 지울까요?")) return;
    delete CL.imported[b.dataset.v];
    CL.saveImported();
    CL.clearDecCache();
    render();
  };

  /* ---------- 이벤트 연결 ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t.closest) return;
    const tipEl = t.closest("[data-t1]");
    if (tipEl) {
      CL.showTip(tipEl.getBoundingClientRect(), "<b>" + esc(tipEl.dataset.t1) + '</b><br><span class="tsw ' + esc(tipEl.dataset.cls) + '"></span>' + esc(tipEl.dataset.t2));
      return;
    }
    CL.hideTip();
    const b = t.closest("[data-act]");
    if (!b || b.disabled) return;
    const fn = A[b.dataset.act];
    if (fn) { e.preventDefault(); fn(b, e); }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    const d = t.dataset || {};
    if (d.predNote) { const key = predKey(); const pr = getPred(key); pr.note = t.value; setPred(key, pr); return; }
    CL.inputHandlers.forEach((fn) => fn(e));
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    const d = t.dataset || {};
    if (d.predP) {
      const key = predKey();
      const pr = getPred(key);
      pr["p" + d.predP] = CL.parseNum(t.value);
      setPred(key, pr);
      render();
      return;
    }
    if (t.id === "csvFile" && t.files && t.files[0]) { importCsv(t.files[0]); return; }
    CL.changeHandlers.forEach((fn) => fn(e));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { CL.hideTip(); if (CL.closeOverlay) CL.closeOverlay(); }
    if (e.key === "Enter" && e.target && e.target.dataset && e.target.dataset.predP) e.target.blur();
  });
  document.addEventListener("toggle", (e) => {
    const k = e.target.dataset && e.target.dataset.openKey;
    if (k) S.open[k] = e.target.open;
  }, true);
  window.addEventListener("scroll", () => CL.hideTip(), { passive: true });
  let lastW = window.innerWidth;
  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; CL.hideTip(); drawCharts(); } }, 150);
  });

  render();

  function showLoadError() {
    const errs = window.__loadErrors || [];
    if (!CL.esc) CL.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const which = !window.CLIMATE_DATA ? "data.js" : !window.LESSON_RULES ? "rules.js" : "explore.js";
    const e = errs.filter((x) => x.file && x.file.indexOf(which) >= 0)[0] || errs[0];
    main.innerHTML = '<section class="panel error-box"><h2>' + which + " 파일을 읽지 못했어요</h2><p>" + (e && e.line
      ? CL.esc(e.file) + " 파일 <b>" + e.line + "번째 줄</b>이나 그 <b>바로 윗줄</b>에 오타가 있는 것 같아요."
      : which + " 파일이 index.html과 같은 폴더에 있는지 확인하세요.") + "</p>" +
      '<p class="muted">자주 하는 실수: 줄 끝 쉼표(,) 빠짐 · 따옴표(" ") 짝이 안 맞음 · 숫자에 단위를 붙임</p>' +
      (e && e.msg ? "<pre>" + CL.esc(e.msg) + "</pre>" : "") + "</section>";
  }
})();
