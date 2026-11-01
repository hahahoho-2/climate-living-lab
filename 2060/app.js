/* 2060 생활 자료실 — 화면 동작 (고칠 필요 없음. 내용은 content.js 에서 고쳐요) */
(function () {
  "use strict";
  const L = window.LAB, C = window.CLIMATE_DATA;
  const KEY = "life2060.v1";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const fmt = (v, d) => (v == null ? "–" : Number(v).toLocaleString("ko-KR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }));
  const byId = {};
  L.topics.forEach((t) => { byId[t.id] = t; });
  const TOPIC_TABS = Object.keys(L.order);
  const tabTopics = (tab) => L.order[tab].map((id) => byId[id]).filter(Boolean);

  /* ---------- 상태 ---------- */
  const fresh = () => ({
    tab: "climate",
    topic: {},
    clim: { region: "용인시", ind: "heat", scen: "high" },
    p: {}, claims: {}, finds: [], draft: {}, scene: { factor: "", change: "", shot: "" }, people: [], peopleText: "",
  });
  let S = fresh();
  let ui = { help: false, clearAsk: false, rr: 0.8, justRevealed: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") S = Object.assign(fresh(), saved);
  } catch (e) { /* 저장소를 못 쓰면 이번 화면에서만 기억해요 */ }
  if (!L.tabs.some((t) => t.id === S.tab)) S.tab = "climate";
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }

  const P = (key) => (S.p[key] = S.p[key] || { v: null, v2: null, v3: null, r: [], own: "", ans: {}, done: false, change: "" });
  const climKey = () => ["climate", S.clim.region, S.clim.ind, S.clim.scen].join("|");
  const topicDone = (t) => (t.kind === "climate"
    ? Object.keys(S.p).some((k) => k.indexOf("climate|") === 0 && S.p[k].done)
    : !!(S.p[t.id] && S.p[t.id].done));

  /* ---------- 공통 조각 ---------- */
  function sources(ids) {
    const items = ids.map((id) => L.src[id]).filter(Boolean).map((s) =>
      "<li>" + (s.u ? '<a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + "</a>" : esc(s.t)) + "</li>").join("");
    return '<div class="src"><b>참고한 자료</b><ul>' + items + "</ul></div>";
  }
  function miniTable(tb) {
    return '<div class="mini-table"><table><thead><tr>' + tb.head.map((x) => "<th>" + esc(x) + "</th>").join("") +
      "</tr></thead><tbody>" + tb.rows.map((r) => "<tr>" + r.map((c, i) => (i === 0 ? '<th scope="row">' : "<td>") + esc(c) + (i === 0 ? "</th>" : "</td>")).join("") + "</tr>").join("") + "</tbody></table></div>";
  }
  function flow(steps) {
    return '<div class="flow">' + steps.map((s) =>
      '<div class="flow-step">' + (s.link ? "<em>" + esc(s.link) + "</em>" : "") + "<b>" + esc(s.t) + "</b><span>" + esc(s.d) + "</span></div>").join("") + "</div>";
  }
  function stepper(key, label, val, unit, dec, fk) {
    return '<div class="predict-row"><span class="lbl">' + esc(label) + '</span><div class="stepper">' +
      '<button class="step" data-act="step" data-key="' + key + '" data-d="-1" data-fk="' + fk + '-m" aria-label="' + esc(label) + ' 낮추기">−</button>' +
      '<input class="pred-input" id="in-' + fk + '" data-in="' + key + '" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="?" aria-label="' + esc(label) + '" value="' + (val == null ? "" : Number(val).toFixed(dec)) + '">' +
      '<button class="step" data-act="step" data-key="' + key + '" data-d="1" data-fk="' + fk + '-p" aria-label="' + esc(label) + ' 높이기">+</button>' +
      '<span class="unit">' + esc(unit) + "</span></div></div>";
  }
  function reasonBlock(p) {
    return '<span class="field-label">내 예측의 근거 <small>하나 이상 고르거나 직접 적어요</small></span><div class="chips">' +
      L.reasons.map((x, i) => '<button class="chip" data-act="reason" data-i="' + i + '" data-fk="r' + i + '" aria-pressed="' + (p.r.indexOf(x) >= 0) + '">' + esc(x) + "</button>").join("") +
      '</div><label class="field-label" for="own">내 생각 한 줄</label><textarea id="own" data-in="own" placeholder="왜 그렇게 예측했나요?">' + esc(p.own) + "</textarea>";
  }
  function compareStats(rows) {
    return '<div class="verdict">' + rows.map((r) => '<div class="stat ' + (r.real ? "real" : "") + '"><span>' + esc(r.k) + "</span><b>" + esc(r.v) + "</b></div>").join("") + "</div>";
  }
  function diffText(pred, real, unit, dec) {
    const d = pred - real;
    if (Math.abs(d) <= Math.max(Math.abs(real) * 0.02, Math.pow(10, -dec))) return "거의 같게 예측했어요";
    return "내 예측이 " + fmt(Math.abs(d), dec) + (/^%/.test(unit) ? "%포인트" : unit) + " " + (d > 0 ? "높아요" : "낮아요");
  }
  function guideBox(t) {
    return '<section class="panel guide-box"><h3>이 주제의 자료 안내</h3><div class="find-box"><span>직접 찾아보기: <a href="' + esc(t.find.url) + '" target="_blank" rel="noopener">' + esc(t.find.site) + "</a></span><span>찾는 길: " + esc(t.find.path) + "</span><span>해 볼 일: " + esc(t.find.try) + "</span></div>" + sources(t.src) + "</section>";
  }
  function revealTail(t, p, key) {
    const list = tabTopics(t.tab);
    const next = list[list.indexOf(t) + 1];
    return '<div class="two"><div class="can"><h4>이 자료로 말할 수 있어요</h4><ul>' + t.can.map((x) => "<li>" + rich(x) + "</li>").join("") + "</ul></div>" +
      '<div class="cannot"><h4>이 자료만으로는 몰라요</h4><ul>' + t.cannot.map((x) => "<li>" + rich(x) + "</li>").join("") + "</ul></div></div>" +
      '<p class="ask">2060년으로 이어 보기: ' + esc(t.life) + "</p>" +
      '<label class="field-label" for="change">바뀐 생각 한 줄 <small>처음에는 ○○라고 생각했는데, □□를 보고 △△라고 생각이 바뀌었어요</small></label>' +
      '<textarea id="change" data-in="change">' + esc(p.change) + "</textarea>" +
      '<p class="ask">누가 빠졌을까요? ' + esc(t.who) + "</p>" +
      '<div class="btn-row"><button class="btn" data-act="retry" data-key="' + esc(key) + '" data-fk="retry">다시 예측하기</button>' +
      (next ? '<button class="btn primary" data-act="topic" data-v="' + next.id + '" data-fk="next">다음 주제: ' + esc(next.name) + " →</button>" : '<button class="btn primary" data-act="tab" data-v="note" data-fk="next">내 예측 노트 보기 →</button>') + "</div>";
  }

  /* ---------- ① 기후 ---------- */
  function climateBody(t) {
    const c = S.clim, m = C.indicators[c.ind], ser = C.regions[c.region][c.ind][c.scen], other = C.regions[c.region][c.ind][c.scen === "low" ? "high" : "low"];
    const p = P(climKey()), dec = m.step < 1 ? 1 : (c.ind === "precip" || c.ind === "rain5" ? 0 : 1), sc = C.scenarios[c.scen];
    const pill = (f, v, label) => '<button class="pill" data-act="clim" data-f="' + f + '" data-v="' + esc(v) + '" data-fk="cl-' + f + v + '" aria-pressed="' + (c[f] === v) + '">' + esc(label) + "</button>";
    let h = '<div class="pickers"><div class="pick-row"><span class="pick-label">지역</span><div class="pills">' + Object.keys(C.regions).map((r) => pill("region", r, r)).join("") +
      '</div></div><div class="pick-row"><span class="pick-label">지표</span><div class="pills">' + Object.keys(C.indicators).map((k) => pill("ind", k, C.indicators[k].name)).join("") +
      '</div></div><div class="pick-row"><span class="pick-label">시나리오</span><div class="pills">' + Object.keys(C.scenarios).map((k) => pill("scen", k, C.scenarios[k].code + " " + C.scenarios[k].name)).join("") + "</div></div></div>";
    h += '<div class="lab-grid"><section class="panel"><h3>내 예측 그래프</h3><p class="panel-desc">' + esc(m.desc) + " · 단위 " + esc(m.unit) + (p.done ? "" : " · ? 자리는 아직 비밀이에요") + '</p><div class="chart" data-chart="climate" role="img" aria-label="' + esc(c.region + " " + m.name + " 그래프") + '"></div>' +
      '<details><summary>표로 보기</summary><div class="mini-table"><table><thead><tr><th>기간</th><th class="num">' + esc(sc.code) + '</th><th class="num">내 예측</th></tr></thead><tbody>' +
      C.periods.map((q, i) => "<tr><td>" + esc(q.short + " " + q.years) + '</td><td class="num">' + (i < 2 || p.done ? fmt(ser[i], dec) : "?") + '</td><td class="num">' + (i === 2 ? fmt(p.v2, dec) : i === 3 ? fmt(p.v3, dec) : "") + "</td></tr>").join("") + "</tbody></table></div></details></section>";
    h += '<section class="panel" id="predictBox"><h3>내 예측</h3><p class="panel-desc">현재 ' + fmt(ser[0], dec) + esc(m.short) + "에서 전반기 " + fmt(ser[1], dec) + esc(m.short) + "로 변해요. − / + 를 누르거나 숫자를 직접 넣어요.</p>";
    if (!p.done) {
      h += stepper("v2", "중반기 2041~2060", p.v2, m.short, dec, "v2") + stepper("v3", "후반기 2081~2100", p.v3, m.short, dec, "v3");
      const rate = (ser[1] - ser[0]) / 20;
      h += '<button class="link-btn" data-act="help" data-fk="help" aria-expanded="' + ui.help + '">' + (ui.help ? "도움 닫기" : "도움 받기: 지금까지의 변화가 그대로 이어진다면?") + "</button>";
      if (ui.help) h += '<p class="hint">현재에서 전반기까지 20년 동안 ' + fmt(ser[1] - ser[0], dec) + esc(m.short) + " 변했어요. 같은 속도라면 중반기 약 " + fmt(ser[1] + rate * 20, dec) + esc(m.short) + ", 후반기 약 " + fmt(ser[1] + rate * 60, dec) + esc(m.short) + "예요. 시나리오를 생각하면 달라질까요?</p>";
      h += reasonBlock(p);
      const ready = p.v2 != null && p.v3 != null && (p.r.length > 0 || p.own.trim());
      h += '<button class="btn primary" data-act="reveal" data-key="' + esc(climKey()) + '" data-fk="reveal"' + (ready ? "" : " disabled") + ">기상청 전망과 비교하기</button>";
      if (!ready) h += '<p class="hint">두 값을 예측하고 근거를 남기면 눌러져요.</p>';
    } else {
      h += compareStats([
        { k: "내 예측 · 중반기", v: fmt(p.v2, dec) + m.short }, { k: "기상청 전망 · 중반기", v: fmt(ser[2], dec) + m.short, real: true },
        { k: "내 예측 · 후반기", v: fmt(p.v3, dec) + m.short }, { k: "기상청 전망 · 후반기", v: fmt(ser[3], dec) + m.short, real: true },
      ]);
    }
    h += "</section></div>";
    if (p.done) {
      const tt = Object.assign({}, t, {
        can: ["같은 시나리오의 20년 평균끼리 비교하면 변화의 방향과 크기를 말할 수 있어요.", "두 시나리오의 차이로 온실가스를 줄이는 일의 효과를 볼 수 있어요."],
        cannot: ["특정한 해의 값은 알 수 없어요. 전망은 20년 평균이에요.", "‘현재’는 관측값이 아니라 기후모델이 2000~2019년을 재현한 값이에요. 실제 관측값은 기상자료개방포털에서 찾아요."],
      });
      h += '<section class="panel reveal" id="reveal"><h3>자료와 비교해요</h3><p>' + esc(diffText(p.v2, ser[2], m.short, dec)) + "(중반기). " + esc(c.region) + " " + esc(m.name) + "은(는) " + esc(sc.code) + " 경로에서 중반기 <b>" + fmt(ser[2], dec) + esc(m.short) + "</b>, 후반기 <b>" + fmt(ser[3], dec) + esc(m.short) + "</b>로 전망돼요. " + esc(C.scenarios[c.scen === "low" ? "high" : "low"].code) + " 경로에서는 중반기 " + fmt(other[2], dec) + esc(m.short) + ", 후반기 " + fmt(other[3], dec) + esc(m.short) + "예요.</p>" +
        '<p class="note">' + esc(m.note) + "</p>" + revealTail(tt, p, climKey()) + "</section>";
    }
    return h;
  }

  /* ---------- 숫자 예측 ---------- */
  function howBlock(t) {
    const before = t.table && t.table.before;
    if (!t.flow && !t.fig && !before) return "";
    let h = '<section class="panel"><h3>어떻게 작동할까요?</h3>';
    if (t.flow) h += flow(t.flow);
    if (t.fig) h += FIG[t.fig]();
    if (before) h += miniTable(t.table);
    return h + "</section>";
  }
  function trendBody(t) {
    const p = P(t.id), real = t.vals[t.hide[0]], key = t.id;
    let h = howBlock(t) + '<div class="lab-grid"><section class="panel"><h3>지금까지의 자료</h3>';
    if (t.note) h += '<p class="warn">' + rich(t.note) + "</p>";
    h += '<ul class="know">' + t.know.map((x) => "<li>" + rich(x) + "</li>").join("") + "</ul>";
    if (!t.noChart) {
      h += '<div class="chart" data-chart="bar" data-topic="' + t.id + '" role="img" aria-label="' + esc(t.name + " 막대그래프") + '"></div>' +
        '<details><summary>표로 보기</summary><div class="mini-table"><table><tbody>' + t.labels.map((l, i) =>
          "<tr><th scope=\"row\">" + esc(l) + '</th><td class="num">' + (t.hide.indexOf(i) >= 0 && !p.done ? "?" : fmt(t.vals[i], t.dec) + esc(t.unit)) + "</td></tr>").join("") + "</tbody></table></div></details>";
    }
    h += '</section><section class="panel" id="predictBox"><h3>내 예측</h3>';
    if (!p.done) {
      h += stepper("v", t.valueName, p.v, t.unit, t.dec, "v");
      if (t.years) {
        const kn = t.vals.map((v, i) => ({ v, y: t.years[i], i })).filter((o) => t.hide.indexOf(o.i) < 0);
        const a = kn[kn.length - 2], b = kn[kn.length - 1], hy = t.years[t.hide[0]];
        h += '<button class="link-btn" data-act="help" data-fk="help" aria-expanded="' + ui.help + '">' + (ui.help ? "도움 닫기" : "도움 받기: 지금까지의 변화가 그대로 이어진다면?") + "</button>";
        if (ui.help) h += '<p class="hint">' + a.y + "년에서 " + b.y + "년 사이의 속도가 이어지면 약 " + fmt(b.v + ((b.v - a.v) / (b.y - a.y)) * (hy - b.y), t.dec) + esc(t.unit) + "예요. 그대로 이어질까요?</p>";
      }
      h += reasonBlock(p);
      const ready = p.v != null && (p.r.length > 0 || p.own.trim());
      h += '<button class="btn primary" data-act="reveal" data-key="' + key + '" data-fk="reveal"' + (ready ? "" : " disabled") + ">자료와 비교하기</button>";
      if (!ready) h += '<p class="hint">값을 예측하고 근거를 남기면 눌러져요.</p>';
    } else {
      h += compareStats([{ k: "내 예측", v: fmt(p.v, t.dec) + t.unit }, { k: "자료", v: fmt(real, t.dec) + t.unit, real: true }]) +
        "<p><b>" + esc(diffText(p.v, real, t.unit, t.dec)) + "</b></p>" + (p.own ? '<p class="note">내가 쓴 근거: ' + esc(p.own) + "</p>" : "");
    }
    h += "</section></div>";
    if (p.done) {
      h += '<section class="panel reveal" id="reveal"><h3>자료와 비교해요</h3><p>' + rich(t.result) + "</p>" + (t.after ? AFTER[t.after]() : "") + (t.table && !t.table.before ? miniTable(t.table) : "") + revealTail(t, p, key) + "</section>";
    }
    return h;
  }

  /* ---------- 문항 예측 ---------- */
  function rowsHtml(rows, opts, ans, done, prefix) {
    return '<div class="rows">' + rows.map((r, i) => {
      const o = r.opts || opts, mine = ans[i];
      return '<div class="q-row"><p class="q">' + rich(r.q) + '</p><div class="chips">' + o.map((x, j) => {
        let cls = "opt";
        if (done) { if (j === r.a) cls += " right"; else if (j === mine) cls += " wrong"; }
        return '<button class="' + cls + '" data-act="' + prefix + '" data-row="' + i + '" data-i="' + j + '" data-fk="' + prefix + i + "-" + j + '" aria-pressed="' + (mine === j) + '"' + (done ? " disabled" : "") + ">" + esc(x) + "</button>";
      }).join("") + "</div>" + (done ? '<p class="why"><span class="mark">' + (mine === r.a ? "예측과 같아요. " : "예측과 달라요. ") + "</span>" + rich(r.why) + "</p>" : "") + "</div>";
    }).join("") + "</div>";
  }
  function rowsBody(t) {
    const p = P(t.id), key = t.id, ansCount = Object.keys(p.ans).length;
    let h = howBlock(t) + '<div class="lab-grid"><section class="panel"><h3>지금까지의 자료</h3><ul class="know">' + t.know.map((x) => "<li>" + rich(x) + "</li>").join("") + "</ul></section>" +
      '<section class="panel" id="predictBox"><h3>내 예측</h3><p class="panel-desc">' + esc(t.prompt) + "</p>" + (t.rows.length > 3 ? "" : rowsHtml(t.rows, t.opts, p.ans, p.done, "opt"));
    if (t.rows.length > 3) h += "</section></div>" + '<section class="panel">' + rowsHtml(t.rows, t.opts, p.ans, p.done, "opt");
    if (!p.done) {
      const ready = ansCount >= t.rows.length;
      h += '<button class="btn primary" data-act="reveal" data-key="' + key + '" data-fk="reveal"' + (ready ? "" : " disabled") + ">자료와 비교하기</button>";
      if (!ready) h += '<p class="hint">' + (t.rows.length - ansCount) + "개 더 고르면 눌러져요.</p>";
    } else {
      const same = t.rows.filter((r, i) => p.ans[i] === r.a).length;
      h += "<p><b>" + t.rows.length + "개 가운데 " + same + "개가 자료와 같아요.</b></p>";
    }
    h += t.rows.length > 3 ? "</section>" : "</section></div>";
    if (p.done) {
      h += '<section class="panel reveal" id="reveal"><h3>자료와 비교해요</h3><p>' + rich(t.result) + "</p>" + (t.after ? AFTER[t.after]() : "") + (t.table && !t.table.before ? miniTable(t.table) : "") + revealTail(t, p, key) + "</section>";
    }
    return h;
  }

  /* ---------- 탭 ---------- */
  function topicTab(tab) {
    const intro = L.tabIntro[tab], list = tabTopics(tab), tf = L.tabFlow[tab];
    const cur = byId[S.topic[tab]] && byId[S.topic[tab]].tab === tab ? byId[S.topic[tab]] : list[0];
    let h = '<div class="intro"><h2>' + esc(intro.h) + "</h2><p>" + esc(intro.p) + "</p>" + (intro.note ? '<p class="note">' + esc(intro.note) + "</p>" : "") + "</div>";
    if (tf) h += '<section class="panel"><h3>' + esc(tf.title) + "</h3>" + (tf.fig ? FIG[tf.fig]() : "") + flow(tf.steps) + "</section>";
    h += '<div class="pickers">' + L.groups[tab].map((g) => {
      const items = list.filter((t) => t.group === g);
      return '<div class="pick-row">' + (L.groups[tab].length > 1 ? '<span class="pick-label">' + esc(g) + "</span>" : "") + '<div class="pills">' + items.map((t) =>
        '<button class="pill" data-act="topic" data-v="' + t.id + '" data-fk="tp-' + t.id + '" aria-pressed="' + (t === cur) + '">' + esc(t.name) + (topicDone(t) ? '<span class="tick" aria-label="예측 완료">✓</span>' : "") + "</button>").join("") + "</div></div>";
    }).join("") + "</div>";
    h += '<div class="topic-head t-' + tab + '"><div class="tags">' + cur.factor.map((f) => '<span class="tag">' + esc(f) + "</span>").join("") + "</div><h2>" + esc(cur.q) + "</h2></div>";
    h += cur.kind === "climate" ? climateBody(cur) : cur.kind === "trend" ? trendBody(cur) : rowsBody(cur);
    return h + guideBox(cur);
  }

  function findTab() {
    const d = S.draft;
    let h = '<div class="intro"><h2>궁금한 숫자를 내가 직접 찾아봐요</h2><p>앞으로의 전망인지, 지나간 기록인지, 생활 자료인지부터 정해요. 그에 따라 찾아갈 곳이 달라져요.</p></div>';
    h += '<section class="panel"><h3>어디서 찾을까요?</h3><div class="mini-table"><table><thead><tr><th>궁금한 것</th><th>가는 곳</th><th>예시 질문</th></tr></thead><tbody>' +
      L.where.map((r) => "<tr><td>" + esc(r[0]) + '</td><td><a href="' + esc(r[2]) + '" target="_blank" rel="noopener">' + esc(r[1]) + "</a></td><td>" + esc(r[3]) + "</td></tr>").join("") + '</tbody></table></div>' +
      '<p class="note">기후정보포털은 2026년 11월 1일 확인했을 때 보안 문제로 임시 중단 중이었어요. 미래 전망은 기후변화 상황지도에서 볼 수 있어요.</p></section>';
    h += '<section class="panel guide"><h3>사이트별 찾는 순서</h3>' + L.guides.map((g, i) =>
      "<details" + (i === 0 ? " open" : "") + "><summary>" + esc(g.t) + '</summary><ol class="guide-steps">' + g.steps.map((s) => "<li>" + rich(s) + "</li>").join("") + '</ol><a href="' + esc(g.url) + '" target="_blank" rel="noopener">사이트 열기</a></details>').join("") + "</section>";
    h += '<section class="panel"><h3>숫자를 믿기 전에 다섯 가지 물어봐요</h3><div class="mini-table"><table><tbody>' + L.checks.map((c) => '<tr><th scope="row">' + esc(c[0]) + "</th><td>" + esc(c[1]) + "</td></tr>").join("") + "</tbody></table></div>" +
      '<p class="note">어느 한 해의 값은 그해 날씨 때문일 수 있어요. 흐름을 말하려면 여러 해를 이어서 봐요. 전망은 정해진 미래가 아니에요. ‘이 시나리오라면 이렇게 될 수 있다’고 적어요.</p></section>';
    const answered = Object.keys(S.claims).length, cdone = answered >= L.claims.rows.length;
    h += '<section class="panel"><h3>해석 연습: 이 문장은 자료로 말할 수 있을까요?</h3>' + rowsHtml(L.claims.rows, L.claims.opts, S.claims, cdone, "claim") + "</section>";
    h += '<section class="panel"><h3>내가 찾은 자료 기록하기</h3><p class="panel-desc">적은 내용은 내 예측 노트에 모여요. 이름과 학번은 적지 않아요.</p><div class="record">' +
      [["q", "내 질문", "최근 10년 동안 수원의 열대야는 늘었을까?", true], ["site", "사이트와 메뉴", "기상자료개방포털 > 기후통계분석 > 열대야일수"], ["cond", "조건", "지점 수원, 2016~2025년"], ["num", "찾은 숫자", "단위와 연도까지"], ["date", "확인한 날짜", "2026. 11. ○."], ["learn", "알게 된 점", "숫자가 보여 주는 것을 한 문장으로", true], ["think", "내 생각", "이 변화가 의·식·주를 어떻게 바꿀까?", true]]
        .map((f) => '<label class="' + (f[3] ? "wide" : "") + '">' + esc(f[1]) + '<input class="text" id="d-' + f[0] + '" data-in="draft.' + f[0] + '" placeholder="' + esc(f[2]) + '" value="' + esc(d[f[0]] || "") + '"></label>').join("") +
      '</div><div class="btn-row"><button class="btn primary" data-act="addFind" data-fk="addFind">기록 담기</button></div>' +
      '<p class="note">출처 쓰는 법: 기관 이름, 자료 이름, 사이트 주소, 확인한 날짜 순서로 적어요. 예: 기상청, 열대야일수(수원, 2016~2025년), 기상자료개방포털(data.kma.go.kr), 2026. 11. 2. 확인</p></section>';
    return h;
  }

  function noteRows() {
    const rows = [];
    L.topics.forEach((t) => {
      if (t.kind === "climate") {
        Object.keys(S.p).filter((k) => k.indexOf("climate|") === 0 && S.p[k].done).forEach((k) => {
          const a = k.split("|"), m = C.indicators[a[2]], ser = C.regions[a[1]][a[2]][a[3]], p = S.p[k];
          rows.push({ name: a[1] + " " + m.name + " 중반기(" + C.scenarios[a[3]].code + ")", mine: fmt(p.v2, m.step < 1 ? 1 : 1) + m.short, real: fmt(ser[2], 1) + m.short, change: p.change });
        });
      } else if (S.p[t.id] && S.p[t.id].done) {
        const p = S.p[t.id];
        if (t.kind === "trend") rows.push({ name: t.name, mine: fmt(p.v, t.dec) + t.unit, real: fmt(t.vals[t.hide[0]], t.dec) + t.unit, change: p.change });
        else {
          const same = t.rows.filter((r, i) => p.ans[i] === r.a).length;
          rows.push({ name: t.name, mine: t.rows.length + "문항", real: same + "개 일치", change: p.change });
        }
      }
    });
    return rows;
  }
  function noteTab() {
    const rows = noteRows(), total = L.topics.length, doneN = L.topics.filter(topicDone).length;
    let h = '<div class="intro"><h2>내 예측이 어떻게 바뀌었나요?</h2><p>4컷 만화의 근거 태그와 보고서에 그대로 옮겨 쓸 수 있어요. 기록은 이 기기에만 저장돼요.</p></div>';
    h += '<section class="panel"><div class="progress"><b>' + doneN + " / " + total + ' 주제</b><div class="bar" role="img" aria-label="진행률"><i style="width:' + Math.round((doneN / total) * 100) + '%"></i></div></div>';
    h += rows.length ? '<div class="mini-table"><table><thead><tr><th>주제</th><th class="num">내 예측</th><th class="num">자료</th><th>바뀐 생각</th></tr></thead><tbody>' + rows.map((r) =>
      "<tr><td>" + esc(r.name) + '</td><td class="num">' + esc(r.mine) + '</td><td class="num">' + esc(r.real) + "</td><td>" + esc(r.change || "") + "</td></tr>").join("") + "</tbody></table></div>"
      : '<p class="panel-desc">아직 비교한 주제가 없어요. ① 기후 예측에서 첫 예측을 남겨 봐요.</p><div class="btn-row"><button class="btn primary" data-act="tab" data-v="climate" data-fk="goClimate">기후 예측 시작하기</button></div>';
    h += "</section>";
    if (S.finds.length) h += '<section class="panel"><h3>내가 찾은 자료</h3><div class="mini-table"><table><thead><tr><th>질문</th><th>사이트와 조건</th><th>숫자</th><th>내 생각</th><th></th></tr></thead><tbody>' + S.finds.map((f, i) =>
      "<tr><td>" + esc(f.q) + "</td><td>" + esc([f.site, f.cond, f.date].filter(Boolean).join(" · ")) + "</td><td>" + esc(f.num) + "</td><td>" + esc([f.learn, f.think].filter(Boolean).join(" ")) + '</td><td><button class="link-btn" data-act="delFind" data-i="' + i + '" data-fk="del' + i + '">지우기</button></td></tr>').join("") + "</tbody></table></div></section>";
    h += '<section class="panel"><h3>변화 사슬로 2060년 한 장면 만들기</h3><div class="record">' +
      [["factor", "요인 (근거 자료)", "예: 2041~2060년 용인 폭염일수 47.2일(SSP5-8.5)"], ["change", "생활 변화", "예: 낮 시간 야외 활동이 줄어요"]].map((f) => '<label>' + esc(f[1]) + '<input class="text" id="s-' + f[0] + '" data-in="scene.' + f[0] + '" placeholder="' + esc(f[2]) + '" value="' + esc(S.scene[f[0]]) + '"></label>').join("") +
      '<label class="wide">2060년 나의 하루 장면<textarea id="s-shot" data-in="scene.shot" placeholder="50세가 된 내가 어디서 무엇을 하고 있나요?">' + esc(S.scene.shot) + "</textarea></label></div></section>";
    h += '<section class="panel"><h3>생각 추가하기: 내 장면에서 빠진 사람은 없을까요?</h3><div class="chips">' + L.people.map((x, i) => '<button class="chip" data-act="person" data-i="' + i + '" data-fk="pe' + i + '" aria-pressed="' + (S.people.indexOf(x) >= 0) + '">' + esc(x) + "</button>").join("") + "</div>" +
      '<label class="field-label" for="peopleText">그 사람의 2060년 하루에는 어떤 따뜻한 기술이나 공간이 필요할까요?</label><textarea id="peopleText" data-in="peopleText">' + esc(S.peopleText) + "</textarea></section>";
    h += '<section class="closing"><p>미래는 오늘의 우리가 만들어요.</p><p>미래 사회는 노력 없이 저절로 좋아지지 않아요. 첨단 기술이 모두에게 행복인 것도 아니에요. 어떤 기술이 지구에 사는 모두를 위한 따뜻한 기술이 될지는 오늘 우리의 생각에 달려 있어요.</p></section>';
    h += '<div class="btn-row"><button class="btn primary" data-act="copy" data-fk="copy">내 노트 글 복사</button>';
    h += ui.clearAsk ? '<span>이 기기의 기록을 모두 지울까요?</span><button class="btn danger" data-act="clearYes" data-fk="clearYes">모두 지우기</button><button class="btn" data-act="clearNo" data-fk="clearNo">그만두기</button>'
      : '<button class="btn" data-act="clearAsk" data-fk="clearAsk">기록 지우기</button>';
    return h + '</div><textarea id="copyBox" aria-label="복사할 글" hidden></textarea>';
  }
  function noteText() {
    const out = ["[2060 생활 자료실 내 노트]", ""];
    noteRows().forEach((r) => { out.push("- " + r.name + ": 내 예측 " + r.mine + " / 자료 " + r.real + (r.change ? " / 바뀐 생각: " + r.change : "")); });
    if (S.finds.length) { out.push("", "[내가 찾은 자료]"); S.finds.forEach((f) => out.push("- " + [f.q, f.site, f.cond, f.num, f.learn, f.think, f.date].filter(Boolean).join(" / "))); }
    out.push("", "[변화 사슬]", "요인: " + S.scene.factor, "생활 변화: " + S.scene.change, "2060년 장면: " + S.scene.shot);
    out.push("", "[생각 추가하기]", "빠진 사람: " + S.people.join(", "), S.peopleText);
    return out.join("\n");
  }

  /* ---------- 그리기 ---------- */
  function arrow(x1, y1, x2, y2, cls) {
    const a = Math.atan2(y2 - y1, x2 - x1), s = 8, px = (t) => [x2 - s * Math.cos(a + t), y2 - s * Math.sin(a + t)];
    const f = cls.replace("-l", ""), p1 = px(0.5), p2 = px(-0.5);
    return '<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/><polygon class="' + f + '" points="' + x2 + "," + y2 + " " + p1[0].toFixed(1) + "," + p1[1].toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1) + '"/>';
  }
  const svg = (w, h, label, body, min) => '<svg class="fg" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label) + '"' + (min ? ' style="min-width:' + min + 'px"' : "") + ">" + body + "</svg>";
  const fig = (s, cap, scroll) => '<figure class="fig">' + (scroll ? '<div class="fig-scroll">' + s + "</div>" : s) + (cap ? "<figcaption>" + rich(cap) + "</figcaption>" : "") + "</figure>";
  const FIG = {
    shirt() {
      return fig(svg(440, 270, "티셔츠의 가슴에 전극 3개, 가슴과 허리에 호흡을 재는 실, 허리에 작은 모듈이 있는 그림",
        '<path class="ln" d="M100 26 L60 42 L24 92 L62 116 L84 92 L84 246 L236 246 L236 92 L258 116 L296 92 L260 42 L220 26 C205 48 115 48 100 26 Z"/>' +
        '<path class="ln-m" d="M125 118 C125 170 150 180 150 204 M195 118 C195 170 170 180 170 204 M160 150 L160 204"/>' +
        '<path class="cool-l" stroke-dasharray="7 6" d="M86 176 L234 176"/>' +
        '<circle class="hot" cx="125" cy="118" r="9"/><circle class="hot" cx="195" cy="118" r="9"/><circle class="hot" cx="160" cy="150" r="9"/>' +
        '<rect class="box" x="130" y="204" width="60" height="30" rx="6"/><text x="160" y="224" text-anchor="middle">모듈</text>' +
        '<line class="ln-m" x1="206" y1="118" x2="304" y2="96"/><text x="310" y="92">섬유 전극</text><text class="small" x="310" y="110">심장의 전기 신호</text>' +
        '<line class="ln-m" x1="236" y1="176" x2="304" y2="166"/><text x="310" y="160">전도성 실</text><text class="small" x="310" y="178">숨 쉴 때 늘어나는 정도</text>' +
        '<line class="ln-m" x1="192" y1="218" x2="304" y2="226"/><text x="310" y="222">분리형 모듈</text><text class="small" x="310" y="240">처리기·가속도·블루투스</text>', 400),
        "한 스마트 셔츠의 구조를 단순하게 그렸어요. 제품마다 센서의 종류와 위치가 달라요.", true);
    },
    ecg() {
      return '<figure class="fig"><div class="chart" data-chart="ecg" role="img" aria-label="R파 사이 간격이 0.8초인 심전도 그래프"></div><figcaption>심전도 모양을 단순하게 그린 그림이에요. 뾰족한 봉우리 하나가 심장이 한 번 뛴 표시예요.</figcaption></figure>';
    },
    print() {
      let layers = "";
      for (let i = 0; i < 7; i++) layers += '<rect class="' + (i === 6 ? "hot" : "sand") + '" x="60" y="' + (150 - i * 13) + '" width="' + (i === 6 ? 96 : 180) + '" height="10" rx="4"/>';
      return fig(svg(300, 175, "노즐이 콘크리트를 한 층씩 쌓아 벽을 만드는 그림",
        '<line class="ln" x1="20" y1="20" x2="280" y2="20"/><line class="ln" x1="156" y1="20" x2="156" y2="50"/><polygon class="ink" points="144,50 168,50 160,68 152,68"/>' + layers +
        '<line class="ln" x1="30" y1="162" x2="270" y2="162"/>', 0), "노즐이 움직이며 재료를 짜내고, 층이 쌓여 벽이 돼요.");
    },
    modular() {
      return '<figure class="fig"><div class="chart" data-chart="modular" role="img" aria-label="기존 공법은 공정이 차례로 이어지고 모듈러는 공장 제작과 현장 공사를 나란히 진행해 전체 기간이 짧은 그림"></div><figcaption>길이는 실제 기간의 비율이 아니라 일하는 순서를 보여 줘요.</figcaption></figure>';
    },
    passive() {
      const n = (x, y, t) => '<circle class="sf" cx="' + x + '" cy="' + y + '" r="13"/><text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle">' + t + "</text>";
      return fig(svg(440, 292, "두꺼운 단열 벽과 지붕, 삼중 창, 틈새 막기, 열교 차단, 열 회수 환기 장치가 있는 집의 단면",
        '<polygon class="sand" points="60,120 220,30 380,120"/><polygon class="sf" points="96,120 220,52 344,120"/>' +
        '<rect class="sand" x="76" y="120" width="288" height="150"/><rect class="sf" x="96" y="120" width="248" height="130"/>' +
        '<rect class="cool" x="344" y="150" width="20" height="56"/><line class="ln" x1="350" y1="150" x2="350" y2="206"/><line class="ln" x1="358" y1="150" x2="358" y2="206"/>' +
        '<rect class="box" x="168" y="204" width="104" height="36" rx="6"/><text x="220" y="227" text-anchor="middle">환기 장치</text>' +
        arrow(168, 214, 40, 214, "hot-l") + arrow(40, 232, 168, 232, "cool-l") +
        '<text class="small" x="8" y="204">나가는 공기</text><text class="small" x="8" y="254">들어오는 공기</text>' +
        n(86, 170, "1") + n(378, 178, "2") + n(220, 100, "3") + n(150, 260, "4") + n(292, 222, "5"), 340),
        "**1** 고품질 단열: 벽, 지붕, 바닥을 두껍게 감싸요. **2** 고성능 창호: 창으로 새는 열을 줄여요. **3** 기밀: 틈새를 막아요. **4** 열교 차단: 벽과 기둥이 만나는 곳처럼 열이 새는 다리를 끊어요. **5** 열 회수 환기: 나가는 공기의 열을 들어오는 공기로 옮겨요.", true);
    },
    roof() {
      const panel = (title, cap, body) => '<figure class="fig">' + svg(240, 170, title, '<circle class="hot" cx="36" cy="30" r="15"/>' + body + '<rect class="box" x="30" y="118" width="180" height="46"/>') + "<figcaption><b>" + esc(title) + "</b> " + esc(cap) + "</figcaption></figure>";
      return '<div class="figs">' +
        panel("어두운 지붕", "햇빛을 많이 흡수해 표면이 뜨거워져요.", arrow(60, 42, 96, 104, "hot-l") + arrow(92, 30, 128, 104, "hot-l") + arrow(124, 22, 160, 104, "hot-l") + '<rect class="ink" x="24" y="106" width="192" height="12"/>' + arrow(120, 124, 120, 156, "hot-l")) +
        panel("밝은 지붕", "햇빛을 많이 되돌려 보내요.", arrow(60, 42, 96, 102, "hot-l") + arrow(92, 30, 128, 102, "hot-l") + arrow(136, 98, 170, 40, "cool-l") + arrow(104, 98, 138, 30, "cool-l") + '<rect class="sf" x="24" y="106" width="192" height="12"/>') +
        "</div>";
    },
    green() {
      let plants = "";
      for (let x = 46; x <= 196; x += 30) plants += '<ellipse class="leaf" cx="' + x + '" cy="92" rx="15" ry="8"/><ellipse class="leaf" cx="' + (x + 12) + '" cy="82" rx="11" ry="6"/>';
      return '<div class="figs"><figure class="fig">' + svg(240, 170, "식물이 그늘을 만들고 물을 증발시키는 옥상 단면",
        '<circle class="hot" cx="36" cy="30" r="15"/>' + arrow(70, 34, 96, 72, "hot-l") + arrow(170, 72, 186, 26, "cool-l") + arrow(136, 72, 150, 26, "cool-l") + plants +
        '<rect class="sand" x="24" y="100" width="192" height="18"/><rect class="box" x="30" y="118" width="180" height="46"/>') +
        "<figcaption><b>옥상정원</b> 잎의 그늘과 물의 증발이 열을 줄이고, 흙층이 열이 들어오는 것을 늦춰요.</figcaption></figure></div>";
    },
  };

  const AFTER = {
    seasons: () => '<div class="chart" data-chart="seasons" role="img" aria-label="시나리오별 계절 길이 막대"></div>',
    lunchAge: () => '<div class="chart" data-chart="lunchAge" role="img" aria-label="2019년과 2023년 1분기 연령대별 도시락 매출 비중"></div>',
    insect: () => '<div class="chart" data-chart="insect" role="img" aria-label="곤충 단백질 1kg당 온실가스 범위"></div>',
    insul: () => '<div class="chart" data-chart="insul" role="img" aria-label="단열재별 열전도율 범위"></div>',
    regions: () => '<div class="chart" data-chart="regions" role="img" aria-label="시도별 영화관 스크린 수"></div>',
    time3d: () => '<div class="chart" data-chart="time3d" role="img" aria-label="전체 공사 5개월 가운데 벽 세우기 18시간의 비율"></div><p class="note">쉬는 날을 포함해 5개월을 약 150일로 잡아 달력 시간으로 그렸어요.</p>',
    ecgLive: () => '<div class="ecg-control"><div class="chart" data-chart="ecg" data-live="1" role="img" aria-label="간격을 바꿀 수 있는 심전도 그래프"></div><label class="field-label" for="rr">R파 간격을 바꿔 봐요: <span id="rrOut"></span></label><input type="range" id="rr" data-in="rr" min="0.4" max="1.5" step="0.05" value="' + ui.rr + '"></div>',
  };

  const REGIONS = [["경기", 849], ["서울", 567], ["부산", 226], ["경남", 194], ["인천", 181], ["대구", 150], ["경북", 146], ["충남", 142], ["충북", 129], ["광주", 129], ["전북", 128], ["강원", 125], ["전남", 106], ["대전", 101], ["울산", 71], ["제주", 45], ["세종", 24]];
  const SEASONS = { labels: ["현재 2000~2019", "2041~2060 저탄소", "2041~2060 고탄소", "2081~2100 고탄소"], rows: [["봄", [90, 83, 84, 79], "s-rest"], ["여름", [97, 116, 131, 170], "hot"], ["가을", [71, 69, 67, 77], "sand"], ["겨울", [107, 97, 83, 39], "cool"]] };
  const INSUL = [["진공단열재", 0, 0.0045, "0.0045 이하"], ["경질 우레탄폼", 0.017, 0.028], ["페놀폼(PF)", 0.019, 0.025], ["압출법 보온판(XPS)", 0.027, 0.035], ["비드법 보온판(EPS)", 0.031, 0.044], ["글라스울", 0.036, 0.05]];

  const T = (x, y, s, o) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (o || "") + ">" + esc(s) + "</text>";
  function drawBar(el) {
    const t = byId[el.dataset.topic], p = P(t.id), W = Math.max(280, el.clientWidth), H = 270, top = 36, bot = 48;
    const hid = (i) => t.hide.indexOf(i) >= 0, pred = p.v, done = p.done;
    const pool = t.vals.filter((v, i) => done || !hid(i)); if (pred != null) pool.push(pred);
    const max = Math.max.apply(null, pool) * 1.12 || 1;
    const y = (v) => H - bot - (H - top - bot) * (v / max), n = t.vals.length, band = W / n, bw = Math.min(band * 0.56, 110);
    let s = '<line class="ln-m" x1="0" y1="' + (H - bot) + '" x2="' + W + '" y2="' + (H - bot) + '"/>';
    t.vals.forEach((v, i) => {
      const cx = band * (i + 0.5), x = cx - bw / 2, base = H - bot;
      s += T(cx, H - bot + 22, t.labels[i], ' text-anchor="middle"');
      if (!hid(i)) {
        s += '<path style="fill:var(--s-rest)" d="M' + x + " " + base + "V" + (y(v) + 4) + "q0 -4 4 -4H" + (x + bw - 4) + "q4 0 4 4V" + base + 'Z"><title>' + esc(t.labels[i] + " " + fmt(v, t.dec) + t.unit) + "</title></path>";
        s += T(cx, y(v) - 8, fmt(v, t.dec), ' text-anchor="middle" font-weight="700"');
      } else if (done) {
        s += '<path class="hot" d="M' + x + " " + base + "V" + (y(v) + 4) + "q0 -4 4 -4H" + (x + bw - 4) + "q4 0 4 4V" + base + 'Z"><title>' + esc("자료 " + fmt(v, t.dec) + t.unit) + "</title></path>";
        const py = y(pred), above = pred > v, close = Math.abs(y(v) - py) < 24;
        s += '<line class="ln" stroke-dasharray="6 5" x1="' + (x - 6) + '" y1="' + py + '" x2="' + (x + bw + 6) + '" y2="' + py + '"/>';
        s += T(cx, above ? py - 8 : py + 18, "내 예측 " + fmt(pred, t.dec), ' text-anchor="middle" font-weight="700" class="halo"');
        s += T(cx, above && close ? y(v) + 20 : y(v) - 8, fmt(v, t.dec), ' text-anchor="middle" font-weight="800"' + (above && close ? ' style="fill:#fff"' : ' class="halo"'));
      } else if (pred != null) {
        s += '<rect x="' + x + '" y="' + y(pred) + '" width="' + bw + '" height="' + (base - y(pred)) + '" rx="4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 5"/>';
        s += T(cx, y(pred) - 8, "내 예측 " + fmt(pred, t.dec), ' text-anchor="middle" font-weight="700"');
      } else {
        const h = (H - top - bot) * 0.62;
        s += '<rect x="' + x + '" y="' + (base - h) + '" width="' + bw + '" height="' + h + '" rx="4" fill="none" stroke="var(--axis)" stroke-width="1.8" stroke-dasharray="6 5"/>';
        s += '<circle class="sf" cx="' + cx + '" cy="' + (base - h / 2) + '" r="18"/>' + T(cx, base - h / 2 + 6, "?", ' text-anchor="middle" font-weight="800" style="font-size:18px"');
      }
    });
    el.innerHTML = svg(W, H, "", s);
  }

  function drawClimate(el) {
    const c = S.clim, m = C.indicators[c.ind], ser = C.regions[c.region][c.ind][c.scen], other = C.regions[c.region][c.ind][c.scen === "low" ? "high" : "low"], p = P(climKey());
    const dec = m.step < 1 ? 1 : (c.ind === "precip" || c.ind === "rain5" ? 0 : 1);
    const W = Math.max(300, el.clientWidth), H = 320, L0 = 44, R0 = 30, top = 30, bot = 56;
    const known = [ser[0], ser[1]], pred = [p.v2, p.v3].filter((v) => v != null);
    const pool = known.concat(pred, p.done ? ser.concat(other) : []);
    let lo = Math.min.apply(null, pool), hi = Math.max.apply(null, pool);
    if (m.zero) lo = 0;
    const pad = (hi - lo) * 0.14 || 1; hi += pad; if (!m.zero) lo -= pad;
    const unit = Math.pow(10, Math.floor(Math.log10((hi - lo) / 3 || 1)));
    const stepY = [1, 2, 5, 10].map((k) => k * unit).find((k) => (hi - lo) / k <= 5) || unit * 10;
    const X = (i) => L0 + ((C.periods[i].mid - 2010) / 80) * (W - L0 - R0), Y = (v) => H - bot - ((v - lo) / (hi - lo)) * (H - top - bot);
    let s = "";
    for (let v = Math.ceil(lo / stepY) * stepY; v <= hi; v += stepY) {
      s += '<line x1="' + L0 + '" x2="' + (W - R0 + 10) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" style="stroke:var(--grid)"/>' + T(L0 - 8, Y(v) + 5, fmt(v, stepY < 1 ? 1 : 0), ' text-anchor="end" class="small"');
    }
    s += '<line class="ln-m" x1="' + L0 + '" x2="' + (W - R0 + 10) + '" y1="' + (H - bot) + '" y2="' + (H - bot) + '"/>';
    C.periods.forEach((q, i) => {
      s += T(X(i), H - bot + 20, q.short, ' text-anchor="middle" font-weight="700"') + T(X(i), H - bot + 38, q.years, ' text-anchor="middle" class="small"');
      if (i >= 2 && !p.done) s += '<line x1="' + X(i) + '" x2="' + X(i) + '" y1="' + top + '" y2="' + (H - bot) + '" stroke-dasharray="3 5" style="stroke:var(--axis)"/>';
    });
    const lineClr = c.scen === "low" ? "var(--s-low)" : "var(--s-high)", othClr = c.scen === "low" ? "var(--s-high)" : "var(--s-low)";
    const path = (arr, n) => arr.slice(0, n).map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
    if (p.done) s += '<path d="' + path(other, 4) + '" fill="none" stroke-width="2" stroke-opacity=".55" style="stroke:' + othClr + '"/>';
    s += '<path d="' + path(ser, p.done ? 4 : 2) + '" fill="none" stroke-width="2.6" style="stroke:' + lineClr + '"/>';
    const dots = p.done ? [0, 1, 2, 3] : [0, 1];
    dots.forEach((i) => {
      s += '<circle cx="' + X(i) + '" cy="' + Y(ser[i]) + '" r="5" style="fill:' + lineClr + ';stroke:var(--surface);stroke-width:2"><title>' + esc(C.periods[i].short + " " + fmt(ser[i], dec) + m.short) + "</title></circle>";
    });
    const predPts = [[2, p.v2], [3, p.v3]].filter((a) => a[1] != null);
    if (predPts.length) {
      s += '<path d="M' + X(1) + " " + Y(ser[1]) + predPts.map((a) => "L" + X(a[0]) + " " + Y(a[1])).join("") + '" fill="none" stroke-width="2" stroke-dasharray="7 5" style="stroke:var(--s-pred)"/>';
      predPts.forEach((a) => { s += '<circle class="sf" cx="' + X(a[0]) + '" cy="' + Y(a[1]) + '" r="5" stroke-width="2" style="stroke:var(--s-pred)"/>'; });
    }
    [0, 1].forEach((i) => { s += T(X(i), Y(ser[i]) - 12, fmt(ser[i], dec) + m.short, ' text-anchor="middle" font-weight="700" class="halo"'); });
    [2, 3].forEach((i) => {
      const mine = i === 2 ? p.v2 : p.v3, anchor = i === 3 ? ' text-anchor="end"' : ' text-anchor="middle"', x = i === 3 ? X(i) + 24 : X(i);
      if (p.done) {
        const up = mine == null || ser[i] >= mine;
        s += T(x, Y(ser[i]) + (up ? -12 : 22), fmt(ser[i], dec) + m.short, anchor + ' font-weight="800" class="halo"');
        if (mine != null) s += T(x, Y(mine) + (up ? 22 : -12), "내 예측 " + fmt(mine, dec), anchor + ' class="small halo"');
      } else if (mine != null) {
        s += T(x, Y(mine) - 12, "내 예측 " + fmt(mine, dec), anchor + ' font-weight="700" class="halo"');
      } else {
        const yq = top + (H - top - bot) * 0.5;
        s += '<circle class="sf" cx="' + X(i) + '" cy="' + yq + '" r="17"/>' + T(X(i), yq + 6, "?", ' text-anchor="middle" font-weight="800" style="font-size:17px"');
      }
    });
    const legend = [[lineClr, C.scenarios[c.scen].code + " " + C.scenarios[c.scen].name]];
    if (p.done) legend.push([othClr, C.scenarios[c.scen === "low" ? "high" : "low"].code]);
    legend.push(["var(--s-pred)", "내 예측"]);
    el.innerHTML = '<p class="note" style="margin-bottom:6px">' + legend.map((l, i) => '<span style="display:inline-block;width:18px;height:3px;vertical-align:middle;margin-right:5px;background:' + l[0] + '"></span>' + esc(l[1]) + (i < legend.length - 1 ? " &nbsp; " : "")).join("") + "</p>" + svg(W, H, "", s);
  }

  function ecgValue(t, rr) {
    const k = Math.min(1, rr / 0.8), g = (c, w, a) => a * Math.exp(-Math.pow((t - c * k) / w, 2));
    return g(0.16, 0.03, 0.14) + g(0.265, 0.01, -0.12) + g(0.29, 0.011, 1) + g(0.318, 0.012, -0.22) + g(0.5, 0.05, 0.26);
  }
  function drawEcg(el) {
    const live = el.dataset.live === "1", rr = live ? ui.rr : 0.8, W = Math.max(280, el.clientWidth), H = 170, secs = 3.4, sx = W / secs, base = H * 0.72, amp = H * 0.5;
    let d = "", peaks = [];
    for (let px = 0; px <= W; px += 1.5) {
      const tt = px / sx, b = Math.floor(tt / rr), loc = tt - b * rr;
      d += (px ? "L" : "M") + px.toFixed(1) + " " + (base - ecgValue(loc, rr) * amp).toFixed(1);
    }
    const peak0 = 0.29 * Math.min(1, rr / 0.8);
    for (let k = 0; peak0 + k * rr < secs; k++) peaks.push((peak0 + k * rr) * sx);
    let s = '<path d="' + d + '" fill="none" stroke-width="2" style="stroke:var(--s-high)"/>';
    if (peaks.length > 1) {
      const a = peaks[0], b = peaks[1], yy = 14;
      s += '<line class="ln-m" x1="' + a + '" x2="' + b + '" y1="' + yy + '" y2="' + yy + '"/><line class="ln-m" x1="' + a + '" x2="' + a + '" y1="' + (yy - 5) + '" y2="' + (yy + 12) + '"/><line class="ln-m" x1="' + b + '" x2="' + b + '" y1="' + (yy - 5) + '" y2="' + (yy + 12) + '"/>';
      s += T((a + b) / 2, yy + 18, rr.toFixed(2).replace(/0$/, "") + "초", ' text-anchor="middle" font-weight="700"');
    }
    el.innerHTML = svg(W, H, "", s);
    const out = $("rrOut");
    if (live && out) out.textContent = rr.toFixed(2).replace(/0$/, "") + "초 → 1분에 " + Math.round(60 / rr) + "회";
  }

  function drawSeasons(el) {
    const W = Math.max(280, el.clientWidth), rowH = 62, H = SEASONS.labels.length * rowH + 30;
    let s = "";
    SEASONS.labels.forEach((lb, i) => {
      const y = i * rowH + 18; let x = 0;
      s += T(0, y, lb, ' font-weight="700"');
      SEASONS.rows.forEach((r) => {
        const w = (r[1][i] / 365) * W, style = r[2] === "s-rest" ? ' style="fill:var(--s-rest)"' : "";
        s += '<rect class="' + r[2] + '"' + style + ' x="' + (x + 1).toFixed(1) + '" y="' + (y + 8) + '" width="' + Math.max(0, w - 2).toFixed(1) + '" height="28"><title>' + esc(lb + " " + r[0] + " " + r[1][i] + "일") + "</title></rect>";
        s += T(x + w / 2, y + 28, String(r[1][i]), ' text-anchor="middle" font-weight="700"' + (r[2] === "hot" || r[2] === "cool" ? ' style="fill:#fff"' : ' style="fill:var(--ink)"'));
        x += w;
      });
    });
    el.innerHTML = '<p class="note" style="margin-bottom:6px">남한 평균 계절 길이(일): 왼쪽부터 봄, 여름, 가을, 겨울</p>' + svg(W, H, "", s);
  }
  function drawLunch(el) {
    const W = Math.max(280, el.clientWidth), H = 150, L0 = 46, R0 = 52, data = [["20대", 30.1, 24.1], ["30대", 27.8, 25.7], ["40대", 20.5, 25.6]];
    const X = (v) => L0 + ((v - 18) / 15) * (W - L0 - R0);
    let s = "";
    data.forEach((d, i) => {
      const y = 26 + i * 46, up = d[2] > d[1];
      s += T(0, y + 5, d[0], ' font-weight="700"') + '<line class="ln-m" x1="' + X(d[1]) + '" x2="' + X(d[2]) + '" y1="' + y + '" y2="' + y + '"/>';
      s += '<circle cx="' + X(d[1]) + '" cy="' + y + '" r="7" style="fill:var(--s-rest)"/><circle class="hot" cx="' + X(d[2]) + '" cy="' + y + '" r="7"/>';
      s += T(X(d[1]) + (up ? -12 : 12), y + 5, fmt(d[1], 1), up ? ' text-anchor="end"' : "") + T(X(d[2]) + (up ? 12 : -12), y + 5, fmt(d[2], 1), up ? ' font-weight="800"' : ' text-anchor="end" font-weight="800"');
    });
    el.innerHTML = '<p class="note" style="margin-bottom:6px">CU 도시락 매출 비중(%): 회색 2019년, 주황 2023년 1분기</p>' + svg(W, H, "", s);
  }
  function drawRange(el, rows, max, title, dec) {
    const W = Math.max(280, el.clientWidth), L0 = Math.min(150, W * 0.42), R0 = 90, rowH = 38, H = rows.length * rowH + 8, X = (v) => L0 + (v / max) * (W - L0 - R0);
    let s = "";
    rows.forEach((r, i) => {
      const y = 22 + i * rowH;
      s += T(L0 - 10, y + 5, r[0], ' text-anchor="end"') + '<line x1="' + L0 + '" x2="' + (W - R0) + '" y1="' + y + '" y2="' + y + '" style="stroke:var(--grid)"/>';
      s += '<rect class="hot" x="' + X(r[1]).toFixed(1) + '" y="' + (y - 7) + '" width="' + Math.max(5, X(r[2]) - X(r[1])).toFixed(1) + '" height="14" rx="4"/>';
      s += T(X(r[2]) + 8, y + 5, r[3] || r[1] + "~" + r[2], ' class="small"');
    });
    el.innerHTML = '<p class="note" style="margin-bottom:6px">' + esc(title) + "</p>" + svg(W, H, "", s);
  }
  function drawRegions(el) {
    const W = Math.max(280, el.clientWidth), rowH = 25, H = REGIONS.length * rowH + 6, L0 = 44, R0 = 50, cap = { 서울: 1, 경기: 1, 인천: 1 };
    let s = "";
    REGIONS.forEach((r, i) => {
      const y = i * rowH + 3, w = (r[1] / 849) * (W - L0 - R0), st = cap[r[0]] ? "" : ' style="fill:var(--s-rest)"';
      s += T(L0 - 8, y + 15, r[0], ' text-anchor="end"') + '<rect class="hot"' + st + ' x="' + L0 + '" y="' + (y + 3) + '" width="' + w.toFixed(1) + '" height="16" rx="3"><title>' + esc(r[0] + " " + r[1] + "개") + "</title></rect>" + T(L0 + w + 6, y + 15, fmt(r[1]), ' class="small"');
    });
    el.innerHTML = '<p class="note" style="margin-bottom:6px">시도별 영화관 스크린 수(개): 주황이 수도권</p>' + svg(W, H, "", s);
  }
  function draw3d(el) {
    const W = Math.max(280, el.clientWidth), H = 96, sl = Math.max(4, W * (18 / (150 * 24)));
    el.innerHTML = svg(W, H, "", T(0, 18, "전체 5개월", ' font-weight="700"') + '<rect x="0" y="26" width="' + W + '" height="20" rx="4" style="fill:var(--s-rest)"/><rect class="hot" x="0" y="26" width="' + sl + '" height="20"/>' + T(0, 70, "주황: 벽 세우기 18시간 (전체의 약 0.5%)"));
  }
  function drawModular(el) {
    const W = Math.max(300, el.clientWidth), H = 186, L0 = 74, u = (W - L0 - 6) / 10, bar = (x, y, w, t, cls) => '<rect class="' + cls + '" x="' + (L0 + x * u + 1).toFixed(1) + '" y="' + y + '" width="' + (w * u - 2).toFixed(1) + '" height="30" rx="5"/>' + T(L0 + (x + w / 2) * u, y + 20, t, ' text-anchor="middle"' + (cls === "hot" ? ' style="fill:#fff"' : ""));
    const s = T(0, 44, "기존 공법", ' font-weight="700"') + bar(0, 24, 2.5, "기초", "box") + bar(2.5, 24, 4.5, "골조", "box") + bar(7, 24, 3, "마감", "box") +
      T(0, 124, "모듈러", ' font-weight="700"') + bar(0, 86, 2.5, "기초", "box") + bar(0, 124, 4.5, "공장 제작", "hot") + bar(4.5, 104, 2.2, "설치", "box");
    el.innerHTML = svg(W, H, "", s + '<line class="ln-m" stroke-dasharray="4 4" x1="' + (L0 + 6.7 * u) + '" x2="' + (L0 + 6.7 * u) + '" y1="76" y2="170"/>' + T(L0 + 6.8 * u, 176, "남은 기간이 줄어요", ' class="small"'));
  }

  function drawCharts() {
    document.querySelectorAll("[data-chart]").forEach((el) => {
      const k = el.dataset.chart;
      if (k === "bar") drawBar(el);
      else if (k === "climate") drawClimate(el);
      else if (k === "ecg") drawEcg(el);
      else if (k === "seasons") drawSeasons(el);
      else if (k === "lunchAge") drawLunch(el);
      else if (k === "insect") drawRange(el, [["곤충 단백질 1kg", 3, 35.5, "3~35.5"]], 40, "단백질 1kg당 온실가스(kg CO₂ 환산), 중간값 약 13.5");
      else if (k === "insul") drawRange(el, INSUL, 0.05, "열전도율(W/m·K): 왼쪽으로 갈수록 열이 덜 이동해요");
      else if (k === "regions") drawRegions(el);
      else if (k === "time3d") draw3d(el);
      else if (k === "modular") drawModular(el);
    });
  }

  /* ---------- 화면 그리기 ---------- */
  function render(fk) {
    $("tabs").innerHTML = L.tabs.map((t) => '<button class="tab" role="tab" data-act="tab" data-v="' + t.id + '" data-fk="tab-' + t.id + '" aria-selected="' + (S.tab === t.id) + '">' + (t.n ? t.n + " " : "") + esc(t.label) + "</button>").join("");
    $("main").innerHTML = S.tab === "find" ? findTab() : S.tab === "note" ? noteTab() : topicTab(S.tab);
    drawCharts();
    if (fk) { const el = document.querySelector('[data-fk="' + fk + '"]'); if (el) el.focus({ preventScroll: true }); }
    if (ui.justRevealed) {
      ui.justRevealed = false;
      const r = $("reveal");
      if (r) r.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }
  function goTop() { const c = document.querySelector(".controls"); window.scrollTo(0, c ? Math.max(0, c.offsetTop - 8) : 0); }
  function setHash(id) { try { history.replaceState(null, "", "#" + id); } catch (e) { /* 무시 */ } }
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200); }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const a = b.dataset.act, v = b.dataset.v, fk = b.dataset.fk;
    const inTab = TOPIC_TABS.indexOf(S.tab) >= 0;
    const curT = () => (byId[S.topic[S.tab]] && byId[S.topic[S.tab]].tab === S.tab ? byId[S.topic[S.tab]] : tabTopics(S.tab)[0]);
    const curKey = () => { const t = curT(); return t.kind === "climate" ? climKey() : t.id; };
    if (a === "tab") { S.tab = v; ui.help = false; ui.clearAsk = false; setHash(v); save(); render(fk); goTop(); return; }
    if (a === "topic") { S.topic[S.tab] = v; ui.help = false; setHash(v); save(); render(fk); return; }
    if (a === "clim") { S.clim[b.dataset.f] = v; ui.help = false; save(); render(fk); return; }
    if (a === "help") { ui.help = !ui.help; render(fk); return; }
    if (a === "step" && inTab) {
      const t = curT(), p = P(curKey()), k = b.dataset.key, d = Number(b.dataset.d);
      let step, start, dec;
      if (t.kind === "climate") {
        const m = C.indicators[S.clim.ind], ser = C.regions[S.clim.region][S.clim.ind][S.clim.scen];
        step = m.step; start = k === "v3" && p.v2 != null ? p.v2 : ser[1]; dec = m.step < 1 ? 1 : 1;
      } else { step = t.step; start = t.start != null ? t.start : t.vals[Math.max(0, t.hide[0] - 1)]; dec = t.dec; }
      const nv = (p[k] == null ? start : p[k]) + d * step;
      p[k] = Math.max(0, Number(nv.toFixed(Math.max(dec, 2))));
      save(); render(fk); return;
    }
    if (a === "reason") {
      const p = P(curKey()), x = L.reasons[Number(b.dataset.i)], i = p.r.indexOf(x);
      if (i >= 0) p.r.splice(i, 1); else p.r.push(x);
      save(); render(fk); return;
    }
    if (a === "opt") { const p = P(curKey()); p.ans[b.dataset.row] = Number(b.dataset.i); save(); render(fk); return; }
    if (a === "claim") { S.claims[b.dataset.row] = Number(b.dataset.i); save(); render(fk); return; }
    if (a === "reveal") { P(b.dataset.key).done = true; ui.justRevealed = true; save(); render(); return; }
    if (a === "retry") { const p = P(b.dataset.key); p.done = false; p.v = p.v2 = p.v3 = null; p.ans = {}; save(); render(); goTop(); return; }
    if (a === "person") { const x = L.people[Number(b.dataset.i)], i = S.people.indexOf(x); if (i >= 0) S.people.splice(i, 1); else S.people.push(x); save(); render(fk); return; }
    if (a === "addFind") {
      if (!Object.values(S.draft).some((x) => String(x || "").trim())) { toast("먼저 한 칸 이상 적어 주세요."); return; }
      S.finds.push(S.draft); S.draft = {}; save(); render(fk); toast("내 예측 노트에 담았어요."); return;
    }
    if (a === "delFind") { S.finds.splice(Number(b.dataset.i), 1); save(); render(); return; }
    if (a === "clearAsk") { ui.clearAsk = true; render("clearNo"); return; }
    if (a === "clearNo") { ui.clearAsk = false; render("clearAsk"); return; }
    if (a === "clearYes") { const tab = S.tab; S = fresh(); S.tab = tab; ui.clearAsk = false; save(); render(); toast("기록을 지웠어요."); return; }
    if (a === "copy") {
      const text = noteText();
      const fallback = () => { const c = $("copyBox"); c.hidden = false; c.value = text; c.focus(); c.select(); toast("글을 선택했어요. 길게 눌러 복사해 주세요."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast("복사했어요. 보고서에 붙여 넣어 보세요."), fallback);
      else fallback();
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target, k = el.dataset && el.dataset.in;
    if (!k) return;
    if (k === "rr") { ui.rr = Number(el.value); document.querySelectorAll('[data-chart="ecg"][data-live="1"]').forEach(drawEcg); return; }
    if (k.indexOf("draft.") === 0) { S.draft[k.slice(6)] = el.value; save(); return; }
    if (k.indexOf("scene.") === 0) { S.scene[k.slice(6)] = el.value; save(); return; }
    if (k === "peopleText") { S.peopleText = el.value; save(); return; }
    const t = byId[S.topic[S.tab]] && byId[S.topic[S.tab]].tab === S.tab ? byId[S.topic[S.tab]] : tabTopics(S.tab)[0], p = P(t.kind === "climate" ? climKey() : t.id);
    if (k === "own" || k === "change") {
      const wasReady = !!p.own.trim();
      p[k] = el.value; save();
      if (k === "own" && wasReady !== !!p.own.trim()) { const btn = document.querySelector('[data-act="reveal"]'); if (btn) { const hasNums = t.kind === "climate" ? p.v2 != null && p.v3 != null : p.v != null; btn.disabled = !(hasNums && (p.r.length > 0 || p.own.trim())); } }
      return;
    }
    const n = el.value.trim() === "" ? null : Number(el.value.replace(/,/g, ""));
    p[k] = n === null || Number.isNaN(n) ? null : Math.max(0, n);
    save();
    document.querySelectorAll('[data-chart="bar"],[data-chart="climate"]').forEach((c) => (c.dataset.chart === "bar" ? drawBar(c) : drawClimate(c)));
    const btn = document.querySelector('[data-act="reveal"]');
    if (btn) { const hasNums = t.kind === "climate" ? p.v2 != null && p.v3 != null : p.v != null; btn.disabled = !(hasNums && (p.r.length > 0 || p.own.trim())); }
  });

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(drawCharts, 120); });

  const h = (location.hash || "").slice(1);
  if (L.tabs.some((t) => t.id === h)) S.tab = h;
  else if (byId[h]) { S.tab = byId[h].tab; S.topic[S.tab] = h; }
  render();
})();
