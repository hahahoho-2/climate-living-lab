/* 미래 의식주 생활문화 탐구실 — 화면 동작 (내용은 content.js 에서 고쳐요) */
(function () {
  "use strict";
  const F = window.FUTURE;
  const D = window.CLIMATE_DATA || null; // ../data.js (기상청 자료) — 없어도 나머지는 동작
  const main = document.getElementById("main");
  const tabsEl = document.getElementById("tabs");
  const overlay = document.getElementById("overlay");
  const tooltip = document.getElementById("tooltip");
  const toastEl = document.getElementById("toast");

  if (!F) {
    main.innerHTML = '<div class="panel error-box"><h2>내용 파일을 읽지 못했어요</h2><p>content.js 에 오타가 있는지 확인해 주세요.</p></div>';
    return;
  }

  /* ---------- 저장 (이 기기의 브라우저에만) ---------- */
  const STORE = "futureLab.v1.";
  function load(key, fb) { try { const s = localStorage.getItem(STORE + key); return s ? JSON.parse(s) : fb; } catch (e) { return fb; } }
  function save(key, v) { try { localStorage.setItem(STORE + key, JSON.stringify(v)); } catch (e) { /* 저장이 막혀도 화면은 동작 */ } }

  const AREAS = ["food", "clothing", "housing"];
  function blank() {
    return {
      tab: "drivers", area: "food", open: "", region: "", cind: "heat",
      drivers: {}, picks: [], notes: {}, evidence: [], claims: {}, comm: {}, rules: [], mfa: [],
      sensor: { id: "", cond: "", acts: [] },
      design: { persona: "", who: "", period: "2", drivers: [], items: { food: {}, clothing: {}, housing: {} }, day: { morning: "", noon: "", evening: "" }, lenses: {} },
      report: { title: "", name: "", reflect: "" },
    };
  }
  function isObj(o) { return o && typeof o === "object" && !Array.isArray(o); }
  function merge(base, saved) {
    if (!isObj(saved)) return base;
    Object.keys(base).forEach((k) => {
      if (!(k in saved)) return;
      if (isObj(base[k]) && isObj(saved[k]) && Object.keys(base[k]).length) base[k] = merge(base[k], saved[k]);
      else if (Array.isArray(base[k])) { if (Array.isArray(saved[k])) base[k] = saved[k]; }
      else if (isObj(base[k])) { if (isObj(saved[k])) base[k] = saved[k]; }
      else if (typeof saved[k] === typeof base[k]) base[k] = saved[k];
    });
    return base;
  }
  let S = merge(blank(), load("state", null));
  let saveTimer = null;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => save("state", S), 250); }
  function saveNow() { clearTimeout(saveTimer); save("state", S); }
  window.addEventListener("pagehide", saveNow);

  /* ---------- 작은 도구 ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function nl(s) { return esc(s).replace(/\n/g, "<br>"); }
  function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function setPath(obj, path, v) {
    const ks = path.split(".");
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) { if (!isObj(o[ks[i]])) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function val(path) { const v = getPath(S, path); return v == null ? "" : v; }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }
  function today() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmt(n, dec) { return Number(n).toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  const techById = {}; F.techs.forEach((t) => { techById[t.id] = t; });
  const driverById = {}; F.drivers.forEach((d) => { driverById[d.id] = d; });
  function srcList(ids) {
    const items = (ids || []).map((id) => {
      const s = F.sources[id];
      if (!s) return "";
      return "<li>" + (s.u ? '<a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + "</a>" : esc(s.t)) + "</li>";
    }).join("");
    return items ? '<ul class="src-list">' + items + "</ul>" : "";
  }
  function field(label, path, opt) {
    opt = opt || {};
    const id = "f-" + path.replace(/\./g, "-");
    const tag = opt.input
      ? '<input class="text-input" id="' + id + '" data-bind="' + path + '" value="' + esc(val(path)) + '" placeholder="' + esc(opt.ph || "") + '" maxlength="' + (opt.max || 120) + '">'
      : '<textarea class="idea' + (opt.short ? " short" : "") + '" id="' + id + '" data-bind="' + path + '" placeholder="' + esc(opt.ph || "") + '" maxlength="' + (opt.max || 1500) + '">' + esc(val(path)) + "</textarea>";
    return '<label class="field-label" for="' + id + '">' + label + (opt.hint ? " <small>" + esc(opt.hint) + "</small>" : "") + "</label>" + tag;
  }

  /* ---------- 근거 담기 ---------- */
  function hasEvi(k) { return S.evidence.some((e) => e.k === k); }
  function toggleEvi(k, text, from) {
    const i = S.evidence.findIndex((e) => e.k === k);
    if (i >= 0) { S.evidence.splice(i, 1); toast("근거에서 뺐어요"); }
    else { S.evidence.push({ k: k, text: text, from: from }); toast("📌 근거로 담았어요 — ④ 설계에서 쓸 수 있어요"); }
    saveSoon();
  }
  function pinBtn(k) {
    const on = hasEvi(k);
    return '<button type="button" class="pin" data-act="pin" data-arg="' + esc(k) + '" aria-pressed="' + on + '">' + (on ? "📌 담음" : "📌 근거로 담기") + "</button>";
  }
  function eviText(k) {
    const p = k.split("|");
    if (p[0].indexOf("d:") === 0) { const d = driverById[p[0].slice(2)]; return d ? { text: d.facts[+p[1]], from: d.name } : null; }
    const t = techById[p[0]]; return t ? { text: t.now[+p[1]], from: t.name } : null;
  }

  /* ---------- 탭 ---------- */
  const TABS = [
    { id: "drivers", n: "①", name: "변화 읽기" },
    { id: "tech", n: "②", name: "기술 탐색" },
    { id: "claims", n: "③", name: "사실·주장 가려내기" },
    { id: "design", n: "④", name: "미래 생활 설계" },
    { id: "report", n: "⑤", name: "보고서" },
  ];
  function progress(id) {
    if (id === "drivers") return F.drivers.filter((d) => S.drivers[d.id] && String(S.drivers[d.id].note || "").trim()).length + "/" + F.drivers.length;
    if (id === "tech") return S.picks.length ? "⭐" + S.picks.length : "";
    if (id === "claims") return Object.keys(S.claims).filter((k) => F.claims.some((c) => c.id === k)).length + "/" + F.claims.length;
    if (id === "design") return AREAS.filter((a) => S.design.items[a] && S.design.items[a].tech).length + "/3";
    return "";
  }
  function renderTabs() {
    tabsEl.innerHTML = TABS.map((t) => {
      const p = progress(t.id);
      return '<button type="button" class="tab" role="tab" id="tab-' + t.id + '" aria-controls="main" aria-selected="' + (S.tab === t.id) + '" data-act="tab" data-arg="' + t.id + '">' +
        '<span class="tab-n">' + t.n + "</span>" + t.name + (p ? ' <span class="tab-prog">' + p + "</span>" : "") + "</button>";
    }).join("");
  }

  /* ---------- 그래프 공통 ---------- */
  // 막대: 바닥에 붙은 쪽은 각지게, 끝은 4px 둥글게
  function vBar(x, y, w, h, r) {
    if (h <= 0) return "";
    r = Math.min(r, w / 2, h);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function hBar(x, y, w, h, r) {
    if (w <= 0) return "";
    r = Math.min(r, h / 2, w);
    return "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h - r) + "Q" + (x + w) + "," + (y + h) + " " + (x + w - r) + "," + (y + h) + "H" + x + "Z";
  }
  // 눈금 간격을 1·2·2.5·3·5 단위로 맞추고, 최댓값을 그 배수로 올림
  function niceScale(v, n) {
    const raw = v / n;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 3, 5, 10].find((k) => k * p >= raw) * p;
    return { max: Math.ceil(v / step - 1e-9) * step, step: step };
  }

  /* 기후 그래프 (기상청 자료) */
  function climateRegions() { return D && D.regions ? Object.keys(D.regions) : []; }
  function curRegion() {
    const rs = climateRegions();
    if (rs.indexOf(S.region) >= 0) return S.region;
    return rs.indexOf("서울특별시") >= 0 ? "서울특별시" : rs[0] || "";
  }
  function climateChart() {
    const rs = climateRegions();
    if (!rs.length) return '<p class="empty-note">기후 자료(../data.js)를 읽지 못했어요. <a href="../">기후 자료 탐구실</a>에서 확인해요.</p>';
    const region = curRegion();
    const ind = ["heat", "tropical"].indexOf(S.cind) >= 0 ? S.cind : "heat";
    const info = D.indicators[ind];
    const sr = D.regions[region][ind];
    const per = D.periods;
    const vals = [sr.low[0], sr.low[1], sr.high[1], sr.low[2], sr.high[2], sr.low[3], sr.high[3]];
    const sc = niceScale(Math.max.apply(null, vals) * 1.08, 4);
    const max = sc.max;
    const W = 640, H = 270, L = 40, R = 8, T = 22, B = 46;
    const iw = W - L - R, ih = H - T - B;
    const y = (v) => T + ih - (v / max) * ih;
    const gw = iw / 4;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="cc-title cc-desc"><title id="cc-title">' + esc(region + " " + info.name) + '</title><desc id="cc-desc">' +
      esc(per.map((p, i) => p.short + " " + (i === 0 ? sr.low[0] : D.scenarios.low.code + " " + sr.low[i] + ", " + D.scenarios.high.code + " " + sr.high[i])).join(" · ")) + "</desc>";
    for (let k = 0; k * sc.step <= max + 1e-9; k++) {
      const v = sc.step * k, yy = Math.round(y(v)) + 0.5;
      s += '<line class="' + (k === 0 ? "base" : "grid") + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/>';
      s += '<text class="tick" x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + fmt(v, 0) + "</text>";
    }
    const bw = Math.min(46, gw * 0.34);
    per.forEach((p, i) => {
      const cx = L + gw * i + gw / 2;
      const bars = i === 0 ? [{ v: sr.low[0], c: "now", lab: "현재(모델 재현)" }] : [{ v: sr.low[i], c: "s-low", lab: D.scenarios.low.code + " " + D.scenarios.low.name }, { v: sr.high[i], c: "s-high", lab: D.scenarios.high.code + " " + D.scenarios.high.name }];
      const total = bars.length * bw + (bars.length - 1) * 2;
      bars.forEach((b, j) => {
        const x = cx - total / 2 + j * (bw + 2);
        const yy = y(b.v);
        const tip = "<b>" + esc(region) + " · " + esc(p.short) + "(" + esc(p.years) + ")</b><br>" + esc(b.lab) + ": " + fmt(b.v, 1) + esc(info.short);
        s += '<path class="cbar ' + b.c + '" d="' + vBar(x, yy, bw, T + ih - yy, 4) + '"/>';
        s += '<text class="vlab" x="' + (x + bw / 2) + '" y="' + (yy - 6) + '" text-anchor="middle">' + fmt(b.v, 1) + "</text>";
        s += '<rect class="hit" x="' + (x - 2) + '" y="' + T + '" width="' + (bw + 4) + '" height="' + ih + '" data-tip="' + esc(tip) + '"/>';
      });
      s += '<text class="xlab" x="' + cx + '" y="' + (H - B + 20) + '" text-anchor="middle">' + esc(p.short) + "</text>";
      s += '<text class="xsub" x="' + cx + '" y="' + (H - B + 36) + '" text-anchor="middle">' + esc(p.years) + "</text>";
    });
    s += "</svg>";
    const table = '<details class="more"><summary>표로 보기</summary><div class="table-scroll"><table class="dtable"><caption>' + esc(region + " " + info.name + " (" + info.unit + ")") + '</caption><thead><tr><th scope="col">시나리오</th>' +
      per.map((p) => '<th scope="col">' + esc(p.short) + "<br><small>" + esc(p.years) + "</small></th>").join("") + "</tr></thead><tbody>" +
      ["low", "high"].map((sc) => '<tr><th scope="row">' + esc(D.scenarios[sc].code + " " + D.scenarios[sc].name) + "</th>" + sr[sc].map((v) => "<td>" + fmt(v, 1) + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></div></details>";
    return '<div class="ctrl-row">' +
      '<div class="ctrl"><span class="ctrl-label">지역</span><div class="seg small-seg">' + rs.map((r) => '<button type="button" data-act="region" data-arg="' + esc(r) + '" aria-pressed="' + (r === region) + '">' + esc(r) + "</button>").join("") + "</div></div>" +
      '<div class="ctrl"><span class="ctrl-label">지표</span><div class="seg small-seg">' + ["heat", "tropical"].map((k) => '<button type="button" data-act="cind" data-arg="' + k + '" aria-pressed="' + (k === ind) + '">' + esc(D.indicators[k].name) + "</button>").join("") + "</div></div>" +
      "</div>" +
      '<p class="chart-title"><b>' + esc(region) + " " + esc(info.name) + "</b> <small>(" + esc(info.unit) + ", 20년 평균)</small></p>" +
      '<div class="legend"><span><i class="sq now"></i>현재(2000–2019, 모델 재현값)</span><span><i class="sq s-low"></i>' + esc(D.scenarios.low.code + " " + D.scenarios.low.name) + '</span><span><i class="sq s-high"></i>' + esc(D.scenarios.high.code + " " + D.scenarios.high.name) + "</span></div>" +
      '<div class="chart">' + s + "</div>" +
      '<p class="note">' + esc(info.desc) + ". " + esc(info.note) + "</p>" + table +
      '<p class="note">자료: ' + esc(D.sourceDetail || D.source) + ' · <a href="../">기후 자료 탐구실에서 더 깊이 예측해 보기 →</a></p>';
  }

  /* 식품 1kg당 온실가스 그래프 */
  function ghgChart() {
    const rows = F.ghg.slice().sort((a, b) => b.v - a.v);
    const W = 640, rowH = 26, T = 6, L = 112, R = 56;
    const H = T + rows.length * rowH + 26;
    const sc = niceScale(rows[0].v, 4);
    const max = sc.max;
    const iw = W - L - R;
    const x = (v) => L + (v / max) * iw;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="gg-title"><title id="gg-title">식품 1kg당 온실가스 배출량 (kg CO₂ 환산)</title>';
    for (let k = 0; k * sc.step <= max + 1e-9; k++) {
      const v = sc.step * k, xx = Math.round(x(v)) + 0.5;
      s += '<line class="' + (k === 0 ? "base" : "grid") + '" x1="' + xx + '" x2="' + xx + '" y1="' + T + '" y2="' + (T + rows.length * rowH) + '"/>';
      s += '<text class="tick" x="' + xx + '" y="' + (H - 6) + '" text-anchor="middle">' + fmt(v, 0) + "</text>";
    }
    rows.forEach((r, i) => {
      const yy = T + i * rowH + 3, bh = rowH - 8;
      const c = r.animal ? "animal" : "plant";
      const tip = "<b>" + esc(r.name) + "</b><br>" + (r.animal ? "동물성" : "식물성") + " · 1kg당 " + fmt(r.v, 2) + "kg CO₂ 환산";
      s += '<text class="ylab" x="' + (L - 8) + '" y="' + (yy + bh / 2 + 5) + '" text-anchor="end">' + esc(r.name) + "</text>";
      s += '<path class="gbar ' + c + '" d="' + hBar(L, yy, Math.max(1.5, x(r.v) - L), bh, 4) + '"/>';
      s += '<text class="vlab minor" x="' + (x(r.v) + 6) + '" y="' + (yy + bh / 2 + 5) + '">' + fmt(r.v, r.v < 10 ? 2 : 1) + "</text>";
      s += '<rect class="hit" x="0" y="' + (yy - 3) + '" width="' + W + '" height="' + rowH + '" data-tip="' + esc(tip) + '"/>';
    });
    s += "</svg>";
    const table = '<details class="more"><summary>표로 보기</summary><div class="table-scroll"><table class="dtable"><thead><tr><th scope="col">식품</th><th scope="col">구분</th><th scope="col">kg CO₂ 환산 / 식품 1kg</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><th scope="row">' + esc(r.name) + "</th><td>" + (r.animal ? "동물성" : "식물성") + "</td><td>" + fmt(r.v, 2) + "</td></tr>").join("") + "</tbody></table></div></details>";
    return '<div class="lab"><h4>📊 자료로 보기: 식품 1kg을 만들 때 나오는 온실가스</h4>' +
      '<div class="legend"><span><i class="sq animal"></i>동물성 식품</span><span><i class="sq plant"></i>식물성 식품</span></div>' +
      '<div class="chart">' + s + "</div>" +
      '<ul class="plain small"><li><b>단위를 확인해요.</b> 식품 1kg당 값이에요. 단백질 양을 기준으로 비교하면 순서가 달라질 수 있어요.</li>' +
      "<li><b>전 세계 평균값</b>이에요. 같은 식품도 생산 방식·지역에 따라 범위가 넓어요.</li>" +
      "<li><b>곤충·배양육·식물성 고기 제품은 이 자료에 없어요.</b> ‘믿을 만한 자료가 아직 부족하다’는 것도 중요한 발견이에요.</li></ul>" + table +
      '<p class="note">자료: ' + esc(F.sources.owid.t) + ' · <a href="' + esc(F.sources.owid.u) + '" target="_blank" rel="noopener">원자료 보기</a></p></div>';
  }

  /* ---------- 실험실: 센서 규칙 ---------- */
  function sensorLab() {
    const sn = F.sensors.find((x) => x.id === S.sensor.id);
    let h = '<div class="lab"><h4>🧪 실험실: 센서 → 판단 → 작동 규칙 만들기</h4><p class="small muted">센서를 하나 고르고, 어떤 상황에서 무엇을 하게 할지 정해 보세요.</p>' +
      '<div class="chips small-chips" role="group" aria-label="센서">' + F.sensors.map((x) => '<button type="button" class="chip" data-act="sensor" data-arg="' + x.id + '" aria-pressed="' + (x.id === S.sensor.id) + '">' + x.icon + " " + esc(x.name) + "</button>").join("") + "</div>";
    if (sn) {
      h += '<p class="lab-how"><b>' + esc(sn.name) + ":</b> " + esc(sn.how) + "</p>" +
        '<p class="ctrl-label">① 이런 상황을 감지하면 (하나 고르기)</p><div class="chips small-chips">' + sn.conds.map((c) => '<button type="button" class="chip" data-act="scond" data-arg="' + esc(c) + '" aria-pressed="' + (S.sensor.cond === c) + '">' + esc(c) + "</button>").join("") + "</div>" +
        '<p class="ctrl-label">② 이렇게 작동해요 (여러 개 가능)</p><div class="chips small-chips">' + sn.acts.map((a) => '<button type="button" class="chip" data-act="sact" data-arg="' + esc(a) + '" aria-pressed="' + (S.sensor.acts.indexOf(a) >= 0) + '">' + esc(a) + "</button>").join("") + "</div>";
      const ok = S.sensor.cond && S.sensor.acts.length;
      h += '<div class="rule-preview' + (ok ? "" : " empty") + '">' + (ok ? "<b>‘" + esc(S.sensor.cond) + "’</b> → <b>" + esc(S.sensor.acts.join(", ")) + "</b> <small>(" + esc(sn.name) + ")</small>" : "상황과 작동을 고르면 규칙 문장이 만들어져요.") + "</div>" +
        '<p class="think small">🤔 생각할 점: ' + esc(sn.think) + "</p>" +
        '<div class="next-row left"><button type="button" class="btn small primary" data-act="saverule"' + (ok ? "" : " disabled") + ">규칙 저장 → ④ 설계에 들어가요</button></div>";
    }
    if (S.rules.length) {
      h += '<p class="ctrl-label">저장한 규칙</p><ul class="evi-picked">' + S.rules.map((r, i) => "<li><span>" + esc(r) + '</span><button type="button" data-act="delrule" data-arg="' + i + '" aria-label="규칙 지우기">×</button></li>').join("") + "</ul>";
    }
    return h + "</div>";
  }

  /* ---------- 실험실: 무선 통신 ---------- */
  function commLab() {
    const by = {}; F.comm.forEach((c) => { by[c.id] = c; });
    let h = '<div class="lab"><h4>📡 실험실: 어떤 통신 방식이 알맞을까?</h4>' +
      '<div class="table-scroll"><table class="dtable comm-table"><thead><tr><th scope="col">방식</th><th scope="col">주파수</th><th scope="col">거리</th><th scope="col">속도</th><th scope="col">전력</th><th scope="col">특징</th></tr></thead><tbody>' +
      F.comm.map((c) => '<tr><th scope="row">' + esc(c.name) + "</th><td>" + esc(c.freq) + "</td><td>" + esc(c.range) + "</td><td>" + esc(c.speed) + "</td><td>" + esc(c.power) + "</td><td>" + esc(c.note) + "</td></tr>").join("") +
      '</tbody></table></div><p class="note">대표적인 값이에요. 기기의 버전·안테나·벽 같은 환경에 따라 달라져요.</p>';
    F.commQuiz.forEach((q, i) => {
      const a = S.comm[i];
      h += '<div class="quiz-q"><p><b>상황 ' + (i + 1) + ".</b> " + esc(q.q) + '</p><div class="chips small-chips">' +
        F.comm.map((c) => '<button type="button" class="chip" data-act="comm" data-arg="' + i + "|" + c.id + '" aria-pressed="' + (a === c.id) + '">' + esc(c.name) + "</button>").join("") + "</div>";
      if (a) h += '<p class="fb ' + (a === q.a ? "ok" : "no") + '">' + (a === q.a ? "✅ 알맞아요. " : "🤔 다시 생각해 봐요. 더 알맞은 것은 " + esc(by[q.a].name) + ". ") + esc(q.why) + "</p>";
      h += "</div>";
    });
    return h + "</div>";
  }

  /* ---------- 실험실: 다중 인증 판별기 ---------- */
  function mfaLab() {
    const sel = S.mfa.map((id) => F.factors.find((f) => f.id === id)).filter(Boolean);
    let h = '<div class="lab"><h4>🔐 실험실: 진짜 다중 인증(MFA)일까?</h4><p class="small muted">스마트 도어록이나 앱 로그인에 쓸 인증 방법을 2~3개 골라 보세요.</p>' +
      '<div class="chips small-chips">' + F.factors.map((f) => '<button type="button" class="chip" data-act="mfa" data-arg="' + f.id + '" aria-pressed="' + (S.mfa.indexOf(f.id) >= 0) + '">' + esc(f.name) + ' <span class="kind">' + esc(f.kind) + "</span></button>").join("") + "</div>";
    const auth = sel.filter((f) => f.kind !== "식별");
    const kinds = Array.from(new Set(auth.map((f) => f.kind)));
    let res = "";
    if (!sel.length) res = '<p class="empty-note small">인증 방법을 골라 보세요.</p>';
    else {
      if (auth.length >= 2 && kinds.length >= 2) res = '<p class="fb ok">✅ <b>다중 인증이에요.</b> 서로 다른 종류 ' + kinds.length + "가지(" + esc(kinds.join(" + ")) + ")를 조합했어요.</p>";
      else if (auth.length >= 2) res = '<p class="fb no">❌ <b>다중 인증이 아니에요.</b> 모두 ‘' + esc(kinds[0]) + "’ 종류예요. 같은 종류를 여러 번 쓰는 것은 다중 인증이 아니에요.</p>";
      else if (auth.length === 1) res = '<p class="fb">단일 인증이에요(' + esc(auth[0].kind) + "). 다른 종류를 하나 더 골라 보세요.</p>";
      else res = '<p class="fb no">아직 인증 요소가 없어요.</p>';
      if (sel.some((f) => f.kind === "식별")) res += '<p class="fb">ℹ️ ' + esc(F.factors.find((f) => f.id === "id").note) + "</p>";
      res += '<ul class="plain small">' + kinds.map((k) => "<li><b>" + esc(k) + ":</b> " + esc(F.factorKinds[k]) + "</li>").join("") + "</ul>";
      if (kinds.length >= 2) res += '<p class="think small">⚠️ 다중 인증은 위험을 크게 줄이지만 ‘절대 안전’하지는 않아요. 가짜 사이트에 비밀번호와 OTP를 함께 입력하면 둘 다 빼앗길 수 있어요.</p>';
    }
    return h + res + "</div>";
  }

  /* ========== ① 변화 읽기 ========== */
  function viewDrivers() {
    let h = '<div class="section-title"><h2>① 변화 읽기</h2><p>미래 생활문화를 바꾸는 힘은 하나가 아니에요.</p></div>' +
      '<div class="guide"><b>길잡이</b><span>교과서는 의·식·주마다 미래 변화 요소로 <b>소비자 욕구, 가족 구조, 디지털 전환, 환경 변화</b>를 들어요. 여기서는 환경을 ‘기후 변화’와 ‘자원·환경’으로 나누어 다섯 가지로 살펴봐요. <b>기후 변화는 그중 하나</b>예요.</span><span>각 변화가 내 의·식·주 생활을 어떻게 바꿀지 한 문장씩 적어 보세요. 마음에 드는 사실은 📌로 담아 두면 ④ 설계의 근거로 쓸 수 있어요.</span></div>';
    F.drivers.forEach((d) => {
      const st = S.drivers[d.id] || {};
      h += '<section class="panel driver" aria-labelledby="dr-' + d.id + '"><div class="panel-head"><h2 id="dr-' + d.id + '">' + d.icon + " " + esc(d.name) + '</h2><p class="panel-desc">' + esc(d.one) + "</p></div>" +
        '<ul class="facts">' + d.facts.map((f, i) => '<li class="fact"><span>' + esc(f) + "</span>" + pinBtn("d:" + d.id + "|" + i) + "</li>").join("") + "</ul>";
      if (d.chart) h += '<div class="driver-chart">' + climateChart() + "</div>";
      h += '<div class="link-grid">' + AREAS.map((a) => '<div class="link-cell ' + F.domains[a].cls + '"><b>' + F.domains[a].icon + " " + esc(F.domains[a].short) + "</b><span>" + esc(d.links[a]) + "</span></div>").join("") + "</div>" +
        '<p class="ctrl-label" style="margin-top:14px">내 생활에 미칠 영향</p><div class="seg small-seg" role="group" aria-label="영향 정도">' +
        [["1", "조금"], ["2", "보통"], ["3", "크게"]].map((l) => '<button type="button" data-act="level" data-arg="' + d.id + "|" + l[0] + '" aria-pressed="' + (String(st.level) === l[0]) + '">' + l[1] + "</button>").join("") + "</div>" +
        field("이 변화 때문에 나의 의·식·주 생활에서 무엇이 바뀔까?", "drivers." + d.id + ".note", { short: true, ph: "예) 1인 가구가 늘어 ○○이 많아지고, 그래서 ○○ 같은 기술이 필요해질 것이다." }) +
        '<details class="more"><summary>출처</summary>' + srcList(d.src) + "</details></section>";
    });
    h += '<div class="next-row"><button type="button" class="btn primary" data-act="tab" data-arg="tech">② 기술 탐색으로 →</button></div>';
    return h;
  }

  /* ========== ② 기술 탐색 ========== */
  function viewTech() {
    const area = AREAS.indexOf(S.area) >= 0 ? S.area : "food";
    const dom = F.domains[area];
    const list = F.techs.filter((t) => t.area === area);
    let h = '<div class="section-title"><h2>② 기술 탐색</h2><p>미래 기술이 무엇인지, 어디까지 왔는지, 무엇이 아직 불확실한지 따져 봐요.</p></div>' +
      '<div class="area-seg seg" role="group" aria-label="분야">' + AREAS.map((a) => '<button type="button" data-act="area" data-arg="' + a + '" aria-pressed="' + (a === area) + '"><span>' + F.domains[a].icon + " " + esc(F.domains[a].name) + "</span><small>" + F.techs.filter((t) => t.area === a && S.picks.indexOf(t.id) >= 0).length + "개 담음</small></button>").join("") + "</div>" +
      '<div class="group-hero"><div class="g-icon">' + dom.icon + '</div><div><p class="small muted">' + esc(dom.name) + ' 탐구 질문</p><h2>' + esc(dom.q) + "</h2></div></div>" +
      '<div class="guide"><b>길잡이</b><span>카드를 눌러 ‘무엇인가 → 어떻게 작동하나 → 지금 어디까지 → 기대와 한계 → 아직 모르는 것’ 순서로 읽어요. 설계에 쓰고 싶은 기술은 ⭐로 담아요.</span></div>' +
      '<div class="xcards">' + list.map((t) => {
        const picked = S.picks.indexOf(t.id) >= 0;
        return '<article class="xcard' + (picked ? " picked" : "") + (S.open === t.id ? " is-open" : "") + '"><div class="xcard-top"><span class="xe" aria-hidden="true">' + t.icon + "</span><h4>" + esc(t.name) + "</h4></div>" +
          '<div class="tags">' + t.tags.map((g) => "<span>" + esc(g) + "</span>").join("") + "</div>" +
          '<p class="think-line">' + esc(t.what) + "</p>" +
          '<div class="xcard-actions"><button type="button" class="btn small" data-act="open" data-arg="' + t.id + '" aria-expanded="' + (S.open === t.id) + '">' + (S.open === t.id ? "닫기" : "자세히 보기") + '</button><button type="button" class="btn small" data-act="pick" data-arg="' + t.id + '" aria-pressed="' + picked + '">' + (picked ? "⭐ 담음" : "☆ 설계 후보") + "</button></div></article>";
      }).join("") + "</div>";
    const t = techById[S.open];
    if (t && t.area === area) h += techDetail(t);
    h += '<section class="panel tradition"><h3>🏮 ' + esc(dom.tradition.title) + '</h3><ul class="plain">' + dom.tradition.body.map((b) => "<li>" + esc(b) + "</li>").join("") + '</ul><p class="trad-link">➡️ ' + esc(dom.tradition.link) + '</p><details class="more"><summary>출처</summary>' + srcList(dom.tradition.src) + "</details></section>";
    h += '<div class="next-row"><button type="button" class="btn" data-act="tab" data-arg="drivers">← ① 변화 읽기</button><button type="button" class="btn primary" data-act="tab" data-arg="claims">③ 사실·주장 가려내기 →</button></div>';
    return h;
  }
  function techDetail(t) {
    const picked = S.picks.indexOf(t.id) >= 0;
    const labs = t.labs || (t.lab ? [t.lab] : []);
    let h = '<section class="panel tech-detail" id="tech-detail" aria-labelledby="td-title"><div class="panel-head"><h2 id="td-title">' + t.icon + " " + esc(t.name) + '</h2><button type="button" class="btn small" data-act="pick" data-arg="' + t.id + '" aria-pressed="' + picked + '">' + (picked ? "⭐ 설계 후보에 담음" : "☆ 설계 후보로 담기") + "</button></div>" +
      '<h3 class="td-h">무엇인가</h3><p>' + esc(t.what) + "</p>" +
      '<h3 class="td-h">어떻게 작동하나</h3><ol class="plain">' + t.how.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol>" +
      '<h3 class="td-h">지금 어디까지 왔나 <small>확인: ' + esc(F.CHECKED) + "</small></h3>" +
      '<ul class="facts">' + t.now.map((x, i) => '<li class="fact"><span>' + esc(x) + "</span>" + pinBtn(t.id + "|" + i) + "</li>").join("") + "</ul>" +
      '<div class="two pc"><div class="pc-box pros"><h3 class="td-h">👍 기대되는 점</h3><ul class="plain">' + t.pros.map((x) => "<li>" + esc(x) + "</li>").join("") + '</ul></div><div class="pc-box cons"><h3 class="td-h">⚠️ 한계·쟁점</h3><ul class="plain">' + t.cons.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul></div></div>" +
      '<div class="helpbox"><b>❔ 아직 단정할 수 없는 것</b><br>' + esc(t.open) + "</div>" +
      '<p class="ctrl-label">연결된 변화 요소</p><div class="tags drv-tags">' + t.drivers.map((d) => "<span>" + driverById[d].icon + " " + esc(driverById[d].name) + "</span>").join("") + "</div>";
    labs.forEach((l) => { h += l === "ghg" ? ghgChart() : l === "sensor" ? sensorLab() : l === "comm" ? commLab() : l === "mfa" ? mfaLab() : ""; });
    h += '<div class="think"><b>🔎 탐구 질문</b><ul>' + t.ask.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul></div>" +
      field("내 질문·생각 남기기", "notes." + t.id, { short: true, ph: "궁금한 점, 더 찾아볼 것, 내 생각을 적어요. 보고서에 들어가요." }) +
      '<details class="more"><summary>출처</summary>' + srcList(t.src) + "</details></section>";
    return h;
  }

  /* ========== ③ 사실·주장 가려내기 ========== */
  function viewClaims() {
    const answered = F.claims.filter((c) => S.claims[c.id]);
    const right = answered.filter((c) => S.claims[c.id] === c.a).length;
    let h = '<div class="section-title"><h2>③ 사실·주장 가려내기</h2><p>교과서·뉴스·광고 속 문장을 그대로 믿지 말고 따져 봐요.</p></div>' +
      '<div class="guide"><b>길잡이</b><span>‘절대’, ‘완전’, ‘언제나’, ‘해결되었다’ 같은 말이 보이면 근거를 찾아봐요. 미래 기술에는 <b>아직 단정할 수 없는 것</b>도 많아요. 모른다고 인정하는 것도 정확한 판단이에요.</span></div>' +
      '<div class="rep-progress"><b>' + answered.length + " / " + F.claims.length + "</b> 판단함 · 근거와 맞는 판단 <b>" + right + "</b>개" +
      '<div class="bar" aria-hidden="true"><i style="width:' + Math.round((answered.length / F.claims.length) * 100) + '%"></i></div>' +
      (answered.length ? '<button type="button" class="link-btn" data-act="resetclaims">다시 풀기</button>' : "") + "</div>";
    h += '<ol class="claims">' + F.claims.map((c, i) => {
      const a = S.claims[c.id];
      let fb = "";
      if (a) {
        const ok = a === c.a;
        fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><b>' + (ok ? "✅ 근거와 맞아요" : "🤔 근거를 다시 봐요") + " — " + esc(F.claimLabels[c.a]) + "</b><br>" + esc(c.why) + (c.src && c.src.length ? srcList(c.src) : "") + "</div>";
      }
      return '<li class="claim"><p class="claim-s"><span class="claim-n">' + (i + 1) + "</span>" + esc(c.s) + '</p><div class="seg small-seg" role="group" aria-label="판단">' +
        ["fact", "wrong", "open"].map((k) => '<button type="button" data-act="claim" data-arg="' + c.id + "|" + k + '" aria-pressed="' + (a === k) + '">' + esc(F.claimLabels[k]) + "</button>").join("") + "</div>" + fb + "</li>";
    }).join("") + "</ol>";
    h += '<div class="next-row"><button type="button" class="btn" data-act="tab" data-arg="tech">← ② 기술 탐색</button><button type="button" class="btn primary" data-act="tab" data-arg="design">④ 미래 생활 설계 →</button></div>';
    return h;
  }

  /* ========== ④ 미래 생활 설계 ========== */
  function climateHint() {
    if (!climateRegions().length) return "";
    const region = curRegion();
    const p = +S.design.period === 1 ? 1 : 2;
    const per = D.periods[p];
    const sr = D.regions[region].heat;
    return '<p class="climate-hint">🌡️ 참고: ' + esc(region) + " 폭염일수는 현재 " + fmt(sr.low[0], 1) + "일(모델 재현값)에서 " + esc(per.years) + "년에 " + D.scenarios.low.code + " " + fmt(sr.low[p], 1) + "일 ~ " + D.scenarios.high.code + " " + fmt(sr.high[p], 1) + "일로 전망돼요. (기상청, 20년 평균)</p>";
  }
  function viewDesign() {
    const ds = S.design;
    let h = '<div class="section-title"><h2>④ 미래 생활 설계</h2><p>변화 요소와 기술을 엮어 한 사람의 미래 의·식·주 생활을 설계해요.</p></div>' +
      '<div class="guide"><b>길잡이</b><span>기술을 많이 넣는 것이 좋은 설계가 아니에요. <b>누구에게, 왜 필요한지</b> 근거를 대고, <b>걱정되는 점과 대안</b>까지 적어야 좋은 설계예요. 기술 없이 생활 실천이나 전통의 지혜로 해결해도 좋아요.</span></div>';

    // A. 누구의 생활?
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">A</span><div><h3>누구의 미래 생활인가요?</h3><p class="panel-desc">수업을 위해 만든 가상 인물이에요. 직접 정해도 좋아요.</p></div></div>' +
      '<div class="chips">' + F.personas.map((p) => '<button type="button" class="chip" data-act="persona" data-arg="' + p.id + '" aria-pressed="' + (ds.persona === p.id) + '">' + p.icon + " " + esc(p.name) + "</button>").join("") +
      '<button type="button" class="chip" data-act="persona" data-arg="custom" aria-pressed="' + (ds.persona === "custom") + '">✏️ 직접 정하기</button></div>';
    const per = F.personas.find((p) => p.id === ds.persona);
    if (per) h += '<p class="note">이 사람에게 중요한 것: ' + esc(per.need) + "</p>";
    if (ds.persona === "p4" || ds.persona === "custom") h += field("어떤 사람인가요?", "design.who", { input: true, ph: "예) 2045년, 바닷가 도시에서 일하는 30대 중반의 나", max: 80 });
    h += '<p class="ctrl-label" style="margin-top:14px">언제의 생활인가요?</p><div class="seg small-seg">' +
      [["1", "2030년대", "2021–2040"], ["2", "2040~50년대", "2041–2060"]].map((o) => '<button type="button" data-act="period" data-arg="' + o[0] + '" aria-pressed="' + (String(ds.period) === o[0]) + '"><span>' + o[1] + "</span><small>기후 자료 " + o[2] + "</small></button>").join("") + "</div>" + climateHint() + "</section>";

    // B. 변화 요소
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">B</span><div><h3>어떤 변화 요소를 고려했나요?</h3><p class="panel-desc">2개 이상 골라 보세요. 여러 변화를 함께 볼수록 종합적인 설계가 돼요.</p></div></div><div class="chips">' +
      F.drivers.map((d) => {
        const lv = S.drivers[d.id] && S.drivers[d.id].level;
        return '<button type="button" class="chip" data-act="ddriver" data-arg="' + d.id + '" aria-pressed="' + (ds.drivers.indexOf(d.id) >= 0) + '">' + d.icon + " " + esc(d.name) + (lv ? ' <small class="muted">(① ' + ["", "조금", "보통", "크게"][lv] + ")</small>" : "") + "</button>";
      }).join("") + "</div></section>";

    // C. 의·식·주
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">C</span><div><h3>의·식·주 설계</h3><p class="panel-desc">분야마다 기술(또는 생활 실천)을 하나 고르고, 장면·근거·걱정과 대안을 적어요.</p></div></div>';
    const eviChips = S.evidence.length
      ? (k) => '<div class="evi-insert"><span class="small muted">📌 담은 근거 넣기:</span> ' + S.evidence.map((e, i) => '<button type="button" class="chip mini-chip" data-act="insevi" data-arg="' + k + "|" + i + '" title="' + esc(e.text) + '">' + esc(e.from) + " " + (i + 1) + "</button>").join("") + "</div>"
      : () => '<p class="small muted">① · ② 에서 📌로 담은 근거가 있으면 여기서 바로 넣을 수 있어요.</p>';
    AREAS.forEach((a) => {
      const dom = F.domains[a];
      const it = ds.items[a] || {};
      const opts = F.techs.filter((t) => t.area === a);
      h += '<div class="area-box ' + dom.cls + '"><h4>' + dom.icon + " " + esc(dom.name) + "</h4>" +
        '<label class="field-label" for="sel-' + a + '">무엇을 쓸까요?</label><select class="text-input" id="sel-' + a + '" data-bind="design.items.' + a + '.tech"><option value="">— 고르기 —</option>' +
        opts.map((t) => '<option value="' + t.id + '"' + (it.tech === t.id ? " selected" : "") + ">" + (S.picks.indexOf(t.id) >= 0 ? "⭐ " : "") + esc(t.name) + "</option>").join("") +
        '<option value="practice"' + (it.tech === "practice" ? " selected" : "") + ">기술 없이: 생활 실천·전통의 지혜</option></select>" +
        field("어떻게 쓰나요? (장면)", "design.items." + a + ".scene", { short: true, ph: "예) 아침에 ○○이 ○○을 감지해 ○○해 준다." }) +
        field("왜 이 선택인가요? (근거)", "design.items." + a + ".why", { short: true, hint: "사실 + 출처", ph: "변화 요소·기술 카드에서 확인한 사실을 근거로 써요." }) + eviChips(a) +
        field("걱정되는 점과 대안", "design.items." + a + ".risk", { short: true, ph: "예) 해킹 위험 → 다중 인증과 세대 간 망 분리" }) + "</div>";
    });
    if (S.rules.length) h += '<p class="ctrl-label">② 실험실에서 만든 센서 규칙 (보고서에 들어가요)</p><ul class="plain small">' + S.rules.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>";
    h += "</section>";

    // D. 미래의 하루
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">D</span><div><h3>미래의 하루</h3><p class="panel-desc">설계한 의·식·주가 하루 안에서 어떻게 이어지는지 이야기로 써 봐요.</p></div></div><div class="three">' +
      field("🌅 아침", "design.day.morning", { short: true }) + field("☀️ 낮", "design.day.noon", { short: true }) + field("🌙 저녁", "design.day.evening", { short: true }) + "</div></section>";

    // E. 다섯 렌즈
    h += '<section class="panel"><div class="rep-head"><span class="rep-n">E</span><div><h3>다섯 가지 렌즈로 점검하기</h3><p class="panel-desc">내 설계를 다른 사람의 눈으로 다시 봐요. 3개 이상 적어 보세요.</p></div></div>' +
      F.lenses.map((l) => field(l.icon + " " + esc(l.name), "design.lenses." + l.id, { short: true, hint: l.q })).join("") + "</section>";
    h += '<div class="next-row"><button type="button" class="btn" data-act="tab" data-arg="claims">← ③ 사실·주장</button><button type="button" class="btn primary" data-act="tab" data-arg="report">⑤ 보고서로 →</button></div>';
    return h;
  }

  /* ========== ⑤ 보고서 ========== */
  function checks() {
    const ds = S.design;
    return [
      { ok: F.drivers.filter((d) => S.drivers[d.id] && String(S.drivers[d.id].note || "").trim()).length >= 2, t: "① 변화 요소 2개 이상에 내 생각 쓰기", tab: "drivers" },
      { ok: S.picks.length >= 3, t: "② 기술 3개 이상 설계 후보로 담기", tab: "tech" },
      { ok: S.evidence.length >= 2, t: "📌 근거 2개 이상 담기", tab: "tech" },
      { ok: F.claims.filter((c) => S.claims[c.id]).length >= 10, t: "③ 문장 10개 이상 판단하기", tab: "claims" },
      { ok: !!ds.persona && ds.drivers.length >= 2, t: "④-A·B 설계 대상과 변화 요소 2개 이상", tab: "design" },
      { ok: AREAS.every((a) => ds.items[a] && ds.items[a].tech && String(ds.items[a].why || "").trim()), t: "④-C 의·식·주 모두 선택과 근거 쓰기", tab: "design" },
      { ok: F.lenses.filter((l) => String(ds.lenses[l.id] || "").trim()).length >= 3, t: "④-E 렌즈 3개 이상 점검", tab: "design" },
      { ok: !!String(S.report.reflect || "").trim(), t: "⑤ 탐구를 마치며 쓰기", tab: "report" },
    ];
  }
  function viewReport() {
    const cs = checks();
    const done = cs.filter((c) => c.ok).length;
    let h = '<div class="section-title"><h2>⑤ 보고서</h2><p>지금까지의 기록이 보고서로 모여요.</p></div>' +
      '<div class="rep-progress"><b>' + done + " / " + cs.length + '</b> 완료<div class="bar" aria-hidden="true"><i style="width:' + Math.round((done / cs.length) * 100) + '%"></i></div></div>' +
      '<section class="panel"><h3>점검표</h3><ul class="checklist">' + cs.map((c) => '<li class="' + (c.ok ? "ok" : "") + '"><span aria-hidden="true">' + (c.ok ? "✅" : "⬜") + "</span> " + esc(c.t) + (c.ok ? "" : ' <button type="button" class="link-btn inline" data-act="tab" data-arg="' + c.tab + '">하러 가기</button>') + "</li>").join("") + "</ul></section>" +
      '<section class="panel"><h3>보고서 정보</h3><div class="two-fields">' +
      field("보고서 제목", "report.title", { input: true, ph: "예) 2045년, 혼자 사는 할머니의 시원하고 안전한 하루", max: 80 }) +
      field("학번·이름", "report.name", { input: true, hint: "선택 · 인쇄본에만 들어가요", max: 40 }) + "</div>" +
      field("탐구를 마치며", "report.reflect", { hint: "생각이 바뀐 점, 더 알고 싶은 것", ph: "예) 처음에는 배양육이 무조건 친환경이라고 생각했는데, 자료를 보니 아직 단정할 수 없었다. 그래서 …" }) +
      '<div class="export-bar"><button type="button" class="btn primary" data-act="preview">🖨️ 미리보기·인쇄(PDF)</button><button type="button" class="btn" data-act="word">📄 Word로 저장</button><button type="button" class="btn" data-act="copy">📋 글 복사</button></div>' +
      '<p class="note">기록은 이 기기의 브라우저에만 저장돼요. 다른 기기에서 이어 하려면 Word나 PDF로 저장해 두세요.</p></section>' +
      '<section class="panel notice"><h3>처음부터 다시 하기</h3><p class="small">이 기기에 저장된 이 탐구실의 기록을 모두 지워요. (기후 자료 탐구실 기록은 지우지 않아요.)</p><div class="next-row left"><button type="button" class="btn small" data-act="wipe">기록 모두 지우기</button></div></section>';
    return h;
  }

  function reportDoc() {
    const ds = S.design;
    const per = F.personas.find((p) => p.id === ds.persona);
    const who = (ds.persona === "p4" || ds.persona === "custom") && String(ds.who || "").trim() ? ds.who : per ? per.name : "";
    const blank = '<span class="blank">(아직 쓰지 않음)</span>';
    const t = (s) => (String(s || "").trim() ? nl(s) : blank);
    const usedSrc = [];
    const addSrc = (ids) => (ids || []).forEach((id) => { if (usedSrc.indexOf(id) < 0 && F.sources[id]) usedSrc.push(id); });
    const title = String(S.report.title || "").trim();
    let h = "<h1>" + (title ? esc(title) + "<br><small>미래 의식주 생활문화 탐구 보고서</small>" : "미래 의식주 생활문화 탐구 보고서") + "</h1>" +
      '<table><tr><th style="width:18%">학번·이름</th><td>' + (String(S.report.name || "").trim() ? esc(S.report.name) : "") + '</td><th style="width:14%">작성일</th><td>' + today() + "</td></tr>" +
      "<tr><th>설계 대상</th><td>" + (who ? esc(who) : blank) + "</td><th>시기</th><td>" + (+ds.period === 1 ? "2030년대" : "2040~50년대") + "</td></tr></table>";

    h += "<h2>1. 미래 생활을 바꾸는 변화 요소</h2><table><tr><th style=\"width:22%\">변화 요소</th><th style=\"width:12%\">내 생활 영향</th><th>내 생각</th></tr>" +
      F.drivers.map((d) => { const st = S.drivers[d.id] || {}; if (st.note || st.level) addSrc(d.src); return "<tr><td>" + d.icon + " " + esc(d.name) + "</td><td>" + (st.level ? ["", "조금", "보통", "크게"][st.level] : "") + "</td><td>" + t(st.note) + "</td></tr>"; }).join("") + "</table>";

    const picks = S.picks.map((id) => techById[id]).filter(Boolean);
    h += "<h2>2. 탐구한 미래 기술</h2>";
    if (picks.length) {
      h += '<table><tr><th style="width:22%">기술</th><th style="width:8%">분야</th><th>핵심 내용</th><th style="width:28%">내 질문·생각</th></tr>' +
        picks.map((x) => { addSrc(x.src); return "<tr><td>" + x.icon + " " + esc(x.name) + "</td><td>" + esc(F.domains[x.area].short) + "</td><td>" + esc(x.what) + "<br><small>한계: " + esc(x.cons[0]) + "</small></td><td>" + t(S.notes[x.id]) + "</td></tr>"; }).join("") + "</table>";
    } else h += "<p>" + blank + "</p>";
    if (S.evidence.length) h += "<h3>📌 담은 근거</h3><ol>" + S.evidence.map((e) => "<li>" + esc(e.text) + " <small>(" + esc(e.from) + ")</small></li>").join("") + "</ol>";

    const answered = F.claims.filter((c) => S.claims[c.id]);
    const wrong = answered.filter((c) => S.claims[c.id] !== c.a);
    h += "<h2>3. 사실·주장 가려내기</h2><p>" + F.claims.length + "개 중 " + answered.length + "개를 판단했고, 그중 " + (answered.length - wrong.length) + "개가 근거와 맞았다.</p>";
    if (wrong.length) h += "<h3>다시 확인한 문장</h3><ul>" + wrong.map((c) => "<li>‘" + esc(c.s) + "’ → " + esc(F.claimLabels[c.a]) + ": " + esc(c.why) + "</li>").join("") + "</ul>";

    const hint = ds.drivers.indexOf("climate") >= 0 ? climateHint().replace(/<[^>]+>/g, "") : "";
    h += "<h2>4. 나의 미래 생활 설계</h2><p><b>고려한 변화 요소:</b> " + (ds.drivers.length ? ds.drivers.map((d) => driverById[d] ? driverById[d].icon + " " + esc(driverById[d].name) : "").join(", ") : blank) + "</p>" +
      (hint ? "<p>" + esc(hint.replace(/^🌡️ 참고: /, "기후 자료: ")) + "</p>" : "") +
      '<table><tr><th style="width:9%">분야</th><th style="width:17%">선택</th><th>장면</th><th>근거</th><th>걱정되는 점과 대안</th></tr>' +
      AREAS.map((a) => {
        const it = ds.items[a] || {};
        const tc = techById[it.tech];
        if (tc) addSrc(tc.src);
        const name = tc ? tc.icon + " " + esc(tc.name) : it.tech === "practice" ? "생활 실천·전통의 지혜" : blank;
        return "<tr><td>" + F.domains[a].icon + " " + esc(F.domains[a].short) + "</td><td>" + name + "</td><td>" + t(it.scene) + "</td><td>" + t(it.why) + "</td><td>" + t(it.risk) + "</td></tr>";
      }).join("") + "</table>";
    if (S.rules.length) h += "<h3>스마트 홈 센서 규칙</h3><ul>" + S.rules.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>";
    h += "<h3>미래의 하루</h3><table><tr><th style=\"width:12%\">아침</th><td>" + t(ds.day.morning) + "</td></tr><tr><th>낮</th><td>" + t(ds.day.noon) + "</td></tr><tr><th>저녁</th><td>" + t(ds.day.evening) + "</td></tr></table>";

    h += "<h2>5. 다섯 가지 렌즈로 점검</h2><table>" + F.lenses.map((l) => '<tr><th style="width:22%">' + l.icon + " " + esc(l.name) + "</th><td>" + t(ds.lenses[l.id]) + "</td></tr>").join("") + "</table>";
    h += "<h2>6. 탐구를 마치며</h2><p>" + t(S.report.reflect) + "</p>";
    if (ds.drivers.indexOf("climate") >= 0) addSrc(["kma"]);
    h += "<h2>7. 참고 자료</h2>" + (usedSrc.length ? "<ol>" + usedSrc.map((id) => "<li>" + esc(F.sources[id].t) + (F.sources[id].u ? " — " + esc(F.sources[id].u) : "") + "</li>").join("") + "</ol>" : "<p>" + blank + "</p>") +
      '<p class="doc-foot">기술 카드의 사실 자료는 ' + esc(F.CHECKED) + "에 확인한 것이에요. 미래 기술은 빠르게 바뀌므로 최신 자료를 다시 확인해요. 설계 대상은 수업용 가상 인물이에요.</p>";
    return h;
  }
  function openOverlay(inner, bar) {
    overlay.innerHTML = '<div class="overlay-bar">' + bar + '<button type="button" class="btn small" data-act="close">닫기</button></div>' + inner;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    const c = overlay.querySelector("[data-act=close]");
    if (c) c.focus();
  }
  function closeOverlay() { overlay.hidden = true; overlay.innerHTML = ""; document.body.style.overflow = ""; document.body.classList.remove("printing"); }
  function fileName() { return (String(S.report.title || "").trim() || "미래생활_탐구보고서").replace(/[\\/:*?"<>|]/g, "").slice(0, 60); }
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function wordExport() {
    const css = "body{font-family:'Malgun Gothic',sans-serif;font-size:11pt;line-height:1.6}h1{text-align:center;font-size:18pt}h1 small{font-size:12pt;color:#444}h2{font-size:13pt;border-bottom:1.5pt solid #333;margin-top:18pt}h3{font-size:11pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4pt 6pt;vertical-align:top;text-align:left}th{background:#f0f0f0}.blank{color:#999}.doc-foot{font-size:9pt;color:#555}";
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + esc(fileName()) + "</title><style>" + css + "</style></head><body>" + reportDoc() + "</body></html>";
    download(new Blob(["﻿", html], { type: "application/msword" }), fileName() + ".doc");
    toast("Word 파일을 저장했어요");
  }
  function copyText() {
    const tmp = document.createElement("div");
    tmp.style.cssText = "position:fixed;left:-9999px;top:0;width:800px";
    tmp.className = "doc";
    tmp.innerHTML = reportDoc();
    document.body.appendChild(tmp);
    const txt = tmp.innerText;
    tmp.remove();
    const done = () => toast("보고서 글을 복사했어요");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done));
    else fallbackCopy(txt, done);
  }
  function fallbackCopy(txt, done) {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast("복사하지 못했어요. 미리보기에서 직접 복사해 주세요."); }
    ta.remove();
  }

  /* ---------- 그리기 ---------- */
  const VIEWS = { drivers: viewDrivers, tech: viewTech, claims: viewClaims, design: viewDesign, report: viewReport };
  function focusKey(el) {
    if (!el || !el.getAttribute) return null;
    if (el.dataset.act) return '[data-act="' + el.dataset.act + '"][data-arg="' + (el.dataset.arg || "") + '"]';
    return null;
  }
  function render(keepFocus) {
    if (!VIEWS[S.tab]) S.tab = "drivers";
    const fk = keepFocus ? focusKey(document.activeElement) : null;
    renderTabs();
    main.className = "wrap" + (S.tab === "tech" ? " " + F.domains[AREAS.indexOf(S.area) >= 0 ? S.area : "food"].cls : "");
    main.innerHTML = VIEWS[S.tab]();
    if (fk) { const el = main.querySelector(fk) || tabsEl.querySelector(fk); if (el) el.focus({ preventScroll: true }); }
  }

  /* ---------- 동작 ---------- */
  function act(name, arg, el) {
    switch (name) {
      case "tab": S.tab = arg; saveSoon(); render(); window.scrollTo(0, 0); main.focus({ preventScroll: true }); return;
      case "area": S.area = arg; S.open = ""; break;
      case "open": S.open = S.open === arg ? "" : arg; saveSoon(); render(true);
        if (S.open) { const d = document.getElementById("tech-detail"); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" }); }
        return;
      case "pick": { const i = S.picks.indexOf(arg); if (i >= 0) S.picks.splice(i, 1); else { S.picks.push(arg); toast("⭐ 설계 후보에 담았어요"); } break; }
      case "pin": { const e = eviText(arg); if (e) toggleEvi(arg, e.text, e.from); break; }
      case "region": S.region = arg; break;
      case "cind": S.cind = arg; break;
      case "level": { const p = arg.split("|"); S.drivers[p[0]] = S.drivers[p[0]] || {}; S.drivers[p[0]].level = S.drivers[p[0]].level === +p[1] ? 0 : +p[1]; break; }
      case "claim": { const p = arg.split("|"); S.claims[p[0]] = p[1]; break; }
      case "resetclaims": S.claims = {}; break;
      case "comm": { const p = arg.split("|"); S.comm[p[0]] = p[1]; break; }
      case "mfa": { const i = S.mfa.indexOf(arg); if (i >= 0) S.mfa.splice(i, 1); else if (S.mfa.length >= 3) { toast("3개까지 고를 수 있어요"); return; } else S.mfa.push(arg); break; }
      case "sensor": S.sensor = { id: arg, cond: "", acts: [] }; break;
      case "scond": S.sensor.cond = arg; break;
      case "sact": { const i = S.sensor.acts.indexOf(arg); if (i >= 0) S.sensor.acts.splice(i, 1); else S.sensor.acts.push(arg); break; }
      case "saverule": {
        const sn = F.sensors.find((x) => x.id === S.sensor.id);
        if (!sn || !S.sensor.cond || !S.sensor.acts.length) return;
        const r = "‘" + S.sensor.cond + "’ → " + S.sensor.acts.join(", ") + " (" + sn.name + ")";
        if (S.rules.indexOf(r) >= 0) { toast("이미 저장한 규칙이에요"); return; }
        if (S.rules.length >= 8) { toast("규칙은 8개까지 저장할 수 있어요"); return; }
        S.rules.push(r); toast("규칙을 저장했어요"); break;
      }
      case "delrule": S.rules.splice(+arg, 1); break;
      case "persona": S.design.persona = S.design.persona === arg ? "" : arg; break;
      case "period": S.design.period = arg; break;
      case "ddriver": { const l = S.design.drivers, i = l.indexOf(arg); if (i >= 0) l.splice(i, 1); else l.push(arg); break; }
      case "insevi": {
        const p = arg.split("|"), e = S.evidence[+p[1]];
        if (!e) return;
        const path = "design.items." + p[0] + ".why";
        const cur = String(val(path) || "").trim();
        setPath(S, path, (cur ? cur + "\n" : "") + e.text + " (" + e.from + ")");
        saveSoon(); render(true);
        const ta = document.getElementById("f-" + path.replace(/\./g, "-")); if (ta) ta.focus({ preventScroll: true });
        return;
      }
      case "preview":
        openOverlay('<div class="paper"><div class="doc">' + reportDoc() + "</div></div>", '<button type="button" class="btn small primary" data-act="print">🖨️ 인쇄·PDF로 저장</button><button type="button" class="btn small" data-act="word">📄 Word로 저장</button>');
        return;
      case "print": document.body.classList.add("printing"); window.print(); setTimeout(() => document.body.classList.remove("printing"), 500); return;
      case "word": wordExport(); return;
      case "copy": copyText(); return;
      case "close": closeOverlay(); return;
      case "wipe":
        if (!window.confirm("이 기기에 저장된 ‘미래 의식주 생활문화 탐구실’ 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
        S = blank(); saveNow(); render(); window.scrollTo(0, 0); toast("기록을 모두 지웠어요"); return;
      default: return;
    }
    saveSoon();
    render(true);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    if (b.tagName === "A") return;
    act(b.dataset.act, b.dataset.arg || "", b);
  });
  function onField(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    setPath(S, el.dataset.bind, el.value);
    saveSoon();
    if (el.tagName === "SELECT") render(true);
    else if (/^(drivers|design\.items)/.test(el.dataset.bind)) renderTabs();
  }
  main.addEventListener("input", onField);
  main.addEventListener("change", (e) => { if (e.target.tagName === "SELECT") onField(e); });
  overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") closeOverlay(); });
  document.addEventListener("keydown", (e) => {
    if (e.target.getAttribute && e.target.getAttribute("role") === "tab" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const i = TABS.findIndex((t) => t.id === S.tab);
      const n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
      S.tab = n.id; saveSoon(); render(); const tb = document.getElementById("tab-" + n.id); if (tb) tb.focus();
    }
  });

  /* 그래프 툴팁 */
  function showTip(el, x, y) {
    tooltip.innerHTML = el.getAttribute("data-tip");
    tooltip.hidden = false;
    const r = tooltip.getBoundingClientRect();
    let lx = x + 14, ly = y + 14;
    if (lx + r.width > window.innerWidth - 8) lx = x - r.width - 14;
    if (ly + r.height > window.innerHeight - 8) ly = y - r.height - 14;
    tooltip.style.left = Math.max(8, lx) + "px"; tooltip.style.top = Math.max(8, ly) + "px";
  }
  main.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (el) showTip(el, e.clientX, e.clientY); else tooltip.hidden = true;
  });
  main.addEventListener("pointerleave", () => { tooltip.hidden = true; });
  window.addEventListener("scroll", () => { tooltip.hidden = true; }, { passive: true });

  render();
})();
