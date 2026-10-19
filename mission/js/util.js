/* 공통 도구: 저장, 숫자, 데이터 읽기, 그래프, 툴팁 (고칠 필요 없음) */
(function () {
  "use strict";
  const CL = (window.CL = window.CL || {});
  const D = window.CLIMATE_DATA;
  const R = window.LESSON_RULES;
  const X = window.EXPLORE;
  CL.ok = !!(D && R && X);
  if (!CL.ok) return;

  CL.D = D;
  CL.R = R;
  CL.X = X;
  CL.PERIODS = D.periods;
  CL.SCENS = ["low", "high"];
  CL.IND = D.indicators || {};
  CL.AREAS = R.areas || {};
  CL.AREA_IDS = Object.keys(CL.AREAS);
  const MAX_REGIONS = 4;
  CL.MAX_REGIONS = MAX_REGIONS;

  /* ---------- 저장 (이 기기의 브라우저에만) ---------- */
  const STORE = "climateLab.m1."; // 디자인 의뢰소판 전용 (기존 판 기록과 분리)
  CL.load = function (key, fallback) {
    try {
      const s = localStorage.getItem(STORE + key);
      return s ? JSON.parse(s) : fallback;
    } catch (e) {
      return fallback;
    }
  };
  CL.save = function (key, v) {
    try {
      localStorage.setItem(STORE + key, JSON.stringify(v));
    } catch (e) { /* 저장이 막혀도 화면은 동작 */ }
  };

  /* ---------- 글자·숫자 ---------- */
  CL.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };
  CL.num = function (v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
    return null;
  };
  CL.decimals = function (n) {
    if (n == null) return 0;
    const s = String(n);
    const i = s.indexOf(".");
    return i < 0 ? 0 : Math.min(2, s.length - i - 1);
  };
  CL.isZero = function (d, dec) {
    return Math.abs(d) < 0.5 * Math.pow(10, -dec);
  };
  CL.fmtNum = function (n, dec) {
    if (CL.isZero(n, dec)) n = 0;
    return n.toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace("-", "−");
  };
  CL.parseNum = function (s) {
    const t = String(s == null ? "" : s).trim().replace(/[−–]/g, "-").replace(/,/g, "").replace(/[^\d.\-]/g, "");
    if (t === "" || t === "-" || t === ".") return null;
    const v = parseFloat(t);
    return isFinite(v) ? v : null;
  };
  // 받침에 따라 조사 고르기: CL.josa("연평균기온", "을", "를")
  CL.josa = function (word, a, b) {
    const w = String(word);
    const c = w.charCodeAt(w.length - 1);
    if (!(c >= 0xac00 && c <= 0xd7a3)) return a + "(" + b + ")";
    return (c - 0xac00) % 28 ? a : b;
  };
  CL.today = function () {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  /* ---------- 시나리오·기간 ---------- */
  CL.scenCode = (s) => ((D.scenarios || {})[s] || {}).code || s;
  CL.scenName = (s) => ((D.scenarios || {})[s] || {}).name || s;
  CL.scenFull = (s) => CL.scenCode(s) + " " + CL.scenName(s);
  CL.periodLabel = (p) => CL.PERIODS[p].short + "(" + CL.PERIODS[p].years + ")";

  /* ---------- 학생이 추가한 자료 ---------- */
  function normImported(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    Object.keys(raw).forEach((region) => {
      const r = raw[region];
      if (!r || typeof r !== "object") return;
      Object.keys(r).forEach((ind) => {
        if (!CL.IND[ind]) return;
        CL.SCENS.forEach((s) => {
          const arr = r[ind] && r[ind][s];
          if (!Array.isArray(arr)) return;
          const vals = [0, 1, 2, 3].map((i) => CL.num(arr[i]));
          if (vals.every((v) => v == null)) return;
          out[region] = out[region] || {};
          out[region][ind] = out[region][ind] || {};
          out[region][ind][s] = vals;
        });
      });
    });
    return out;
  }
  CL.imported = normImported(CL.load("imported", {}));
  CL.saveImported = () => CL.save("imported", CL.imported);

  CL.regions = function () {
    const list = Object.keys(D.regions || {});
    Object.keys(CL.imported).forEach((r) => { if (list.indexOf(r) < 0) list.push(r); });
    return list;
  };
  CL.isBaseRegion = (r) => Object.prototype.hasOwnProperty.call(D.regions || {}, r);
  CL.series = function (region, ind, scen) {
    const imp = CL.imported[region] && CL.imported[region][ind] && CL.imported[region][ind][scen];
    if (imp) return imp.slice();
    const base = D.regions && D.regions[region] && D.regions[region][ind] && D.regions[region][ind][scen];
    if (!Array.isArray(base)) return [null, null, null, null];
    return [0, 1, 2, 3].map((i) => CL.num(base[i]));
  };
  CL.isImported = (region, ind, scen) => !!(CL.imported[region] && CL.imported[region][ind] && CL.imported[region][ind][scen]);
  CL.val = (region, ind, scen, p) => CL.series(region, ind, scen)[p];
  CL.hasAny = (region, ind) => CL.SCENS.some((s) => CL.series(region, ind, s).some((v) => v != null));
  CL.indsFor = (region) => Object.keys(CL.IND).filter((id) => !CL.IND[id].extra || CL.hasAny(region, id));
  CL.indsAny = () => Object.keys(CL.IND).filter((id) => !CL.IND[id].extra || CL.regions().some((r) => CL.hasAny(r, id)));
  CL.regionColor = function (region) {
    const i = CL.regions().indexOf(region);
    return "rc" + (i < 0 ? 0 : i % MAX_REGIONS);
  };

  const decCache = {};
  CL.decOf = function (ind) {
    if (decCache[ind] != null) return decCache[ind];
    let d = 0;
    CL.regions().forEach((r) => CL.SCENS.forEach((s) => CL.series(r, ind, s).forEach((v) => { d = Math.max(d, CL.decimals(v)); })));
    decCache[ind] = Math.min(d, 1);
    return decCache[ind];
  };
  CL.clearDecCache = () => Object.keys(decCache).forEach((k) => delete decCache[k]);
  CL.indName = (ind) => (CL.IND[ind] && CL.IND[ind].name) || ind;
  CL.unit = (ind) => (CL.IND[ind] && CL.IND[ind].unit) || "";
  CL.unitShort = (ind) => (CL.IND[ind] && (CL.IND[ind].short || CL.IND[ind].unit)) || "";
  CL.fmtVal = (ind, v) => CL.fmtNum(v, CL.decOf(ind));

  // 변화량 문장: +20.3일, 약 3.2배 등
  CL.deltaText = function (ind, from, to) {
    const d = to - from;
    const dec = CL.decOf(ind);
    if (CL.isZero(d, dec)) return "변화 없음";
    return (d > 0 ? "+" : "−") + CL.fmtNum(Math.abs(d), dec) + CL.unitShort(ind);
  };
  CL.ratioText = function (ind, from, to) {
    if (CL.unit(ind).indexOf("℃") >= 0 || !from || from <= 0 || to == null) return "";
    const r = to / from;
    if (r >= 1.95) return "약 " + CL.fmtNum(r, 1) + "배";
    const pct = (to / from - 1) * 100;
    if (Math.abs(pct) < 0.5) return "";
    return (pct > 0 ? "+" : "−") + CL.fmtNum(Math.abs(pct), 0) + "%";
  };

  // 근거 문장 (보고서·발표에 그대로 들어감)
  CL.snapshot = function (region, ind, scen, p) {
    const v = CL.val(region, ind, scen, p);
    const n = CL.val(region, ind, scen, 0);
    let s = region + " · " + CL.scenCode(scen) + " · " + CL.periodLabel(p) + " " + CL.indName(ind) + " ";
    if (v == null) return s + "자료 없음";
    s += CL.fmtVal(ind, v) + CL.unit(ind);
    if (p > 0 && n != null) {
      const ratio = CL.ratioText(ind, n, v);
      s += " (현재 " + CL.fmtVal(ind, n) + CL.unitShort(ind) + "보다 " + CL.deltaText(ind, n, v) + (ratio ? ", " + ratio : "") + ")";
    }
    if (CL.isImported(region, ind, scen)) s += " · 내가 찾은 자료";
    return s;
  };

  /* ---------- 근거 모음 (모든 탭에서 공유) ---------- */
  CL.getEvidence = () => (CL.load("evidence", []) || []).filter((x) => typeof x === "string");
  CL.hasEvidence = (s) => CL.getEvidence().indexOf(s) >= 0;
  CL.toggleEvidence = function (s) {
    const list = CL.getEvidence();
    const k = list.indexOf(s);
    if (k >= 0) list.splice(k, 1); else list.push(s);
    CL.save("evidence", list);
    return k < 0;
  };
  CL.addEvidence = function (s) {
    const list = CL.getEvidence();
    if (list.indexOf(s) >= 0) return false;
    list.push(s);
    CL.save("evidence", list);
    return true;
  };

  /* ---------- 가설 규칙 ---------- */
  const NAME_INDEX = {};
  const norm = (s) => String(s).replace(/\s+/g, "");
  Object.keys(CL.IND).forEach((id) => {
    NAME_INDEX[norm(id)] = id;
    if (CL.IND[id].name) NAME_INDEX[norm(CL.IND[id].name)] = id;
  });
  CL.parseCond = function (text) {
    const t = norm(text).replace(/≥|=>/g, ">=").replace(/≤|=</g, "<=");
    const m = t.match(/^(.+?)(증가율|감소율|증가|감소)?(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/);
    if (!m) return { error: '조건을 읽을 수 없어요: "' + text + '"' };
    const id = NAME_INDEX[m[1]];
    if (!id) return { error: "'" + m[1] + "' 지표를 data.js에서 찾을 수 없어요" };
    return { id: id, mode: m[2] || "", op: m[3], target: Number(m[4]) };
  };
  CL.condsOf = (rule) => (Array.isArray(rule.when) ? rule.when : [rule.when]).map((w) => CL.parseCond(w == null ? "" : w));
  CL.evalRule = function (rule, region, scen, p) {
    const conds = CL.condsOf(rule);
    const bad = conds.filter((c) => c.error)[0];
    if (bad) return { status: "err", error: bad.error, results: [] };
    const results = conds.map((c) => {
      const v = CL.val(region, c.id, scen, p);
      const n = CL.val(region, c.id, scen, 0);
      let x = null;
      if (!c.mode) x = v;
      else if (v != null && n != null) {
        if (c.mode === "증가") x = v - n;
        else if (c.mode === "감소") x = n - v;
        else if (n !== 0) x = ((c.mode === "증가율" ? v - n : n - v) / Math.abs(n)) * 100;
      }
      if (x == null) return { status: "na", c: c };
      x = Math.round(x * 1000) / 1000;
      const ok = c.op === ">=" ? x >= c.target : c.op === "<=" ? x <= c.target : c.op === ">" ? x > c.target : x < c.target;
      return { status: ok ? "on" : "off", c: c };
    });
    let status = "on";
    if (results.some((r) => r.status === "off")) status = "off";
    else if (results.some((r) => r.status === "na")) status = "na";
    return { status: status, results: results };
  };
  CL.criterionText = function (c) {
    const u = CL.unitShort(c.id);
    const t = CL.fmtNum(c.target, CL.decimals(c.target));
    const w = { ">=": "이상", "<=": "이하", ">": "초과", "<": "미만" }[c.op];
    const name = CL.indName(c.id);
    if (!c.mode) return name + " " + t + u + " " + w;
    if (c.mode === "증가") return name + " 현재보다 " + t + u + " " + w + " 증가";
    if (c.mode === "감소") return name + " 현재보다 " + t + u + " " + w + " 감소";
    if (c.mode === "증가율") return name + " 현재보다 " + t + "% " + w + " 증가";
    return name + " 현재보다 " + t + "% " + w + " 감소";
  };

  /* ---------- 툴팁·알림 ---------- */
  CL.showTip = function (rect, html) {
    const tip = document.getElementById("tooltip");
    if (!tip) return;
    tip.innerHTML = html;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    let top = rect.top - th - 8;
    if (top < 8) top = rect.bottom + 8;
    tip.style.transform = "translate(" + Math.round(left) + "px," + Math.round(top) + "px)";
  };
  CL.hideTip = function () {
    const tip = document.getElementById("tooltip");
    if (tip) tip.hidden = true;
  };
  let toastTimer = null;
  CL.toast = function (msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2000);
  };

  /* ---------- 복사·내려받기 ---------- */
  CL.copyText = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  };
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  CL.download = function (filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };

  /* ======================================================================
     선 그래프 (SVG)
     cfg = { unit, dec, zero, band, unknown:[2,3], compact,
             series: [{ cls, label, vals:[4], style:"solid|dash|dot", hollow, labels:"all|end|none", tip }] }
     ====================================================================== */
  function niceStep(range, count) {
    const raw = range / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  }
  function scaleY(vals, zero) {
    let lo = Math.min.apply(null, vals);
    let hi = Math.max.apply(null, vals);
    if (zero) lo = Math.min(0, lo);
    if (hi - lo < 1e-9) {
      const pad = Math.max(Math.abs(hi) * 0.1, 1);
      hi += pad;
      if (!zero) lo -= pad;
    }
    const step = niceStep(hi - lo, 4);
    const t0 = Math.floor(lo / step + 1e-9) * step;
    const t1 = Math.ceil(hi / step - 1e-9) * step;
    const ticks = [];
    const n = Math.round((t1 - t0) / step);
    for (let k = 0; k <= n; k++) ticks.push(+(t0 + k * step).toFixed(6));
    return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks: ticks, dec: CL.decimals(+step.toPrecision(6)) };
  }
  function txt(cls, x, y, anchor, text) {
    return '<text class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + anchor + '">' + CL.esc(text) + "</text>";
  }

  CL.lineChart = function (el, cfg) {
    const series = cfg.series.filter((s) => s.vals.some((v) => v != null));
    const all = [];
    series.forEach((s) => s.vals.forEach((v) => { if (v != null) all.push(v); }));
    if (!all.length) {
      el.innerHTML = '<div class="chart-empty">' + CL.esc(cfg.empty || "아직 자료가 없어요.") + "</div>";
      return;
    }
    const compact = !!cfg.compact;
    const W = Math.max(compact ? 240 : 300, Math.round(el.clientWidth));
    const anyEnd = series.some((s) => s.labels === "end");
    const allLabeled = series.filter((s) => s.labels === "all").length;
    const H = compact ? 190 : W < 520 ? 270 : 300;
    const M = { t: compact ? 26 : 34, r: anyEnd ? (compact ? 70 : 112) : compact ? 16 : 26, b: (compact ? 40 : 52) + (allLabeled >= 2 ? 20 : 0), l: compact ? 44 : 56 };
    const pw = W - M.l - M.r;
    const ph = H - M.t - M.b;
    const sc = scaleY(all, !!cfg.zero && Math.min.apply(null, all) >= 0);
    const mids = CL.PERIODS.map((p) => p.mid);
    const inset = Math.min(compact ? 16 : 34, pw * 0.08);
    const X = (i) => M.l + inset + ((pw - inset * 2) * (mids[i] - mids[0])) / (mids[3] - mids[0]);
    const Y = (v) => M.t + ph - ((v - sc.lo) / (sc.hi - sc.lo)) * ph;
    const unit = cfg.unit || "";

    let s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + CL.esc(cfg.aria || "그래프") + '">';
    if (cfg.band != null) {
      const bw = compact ? 34 : 64;
      s += '<rect class="band" x="' + (X(cfg.band) - bw / 2).toFixed(1) + '" y="' + (M.t - 10) + '" width="' + bw + '" height="' + (ph + 10) + '" rx="10"/>';
    }
    sc.ticks.forEach((t, k) => {
      const y = Y(t).toFixed(1);
      s += '<line class="' + (k === 0 ? "base" : "grid") + '" x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y + '" y2="' + y + '"/>';
      s += txt("tick", M.l - 8, +y + 4, "end", CL.fmtNum(t, sc.dec));
    });
    if (unit) s += txt("tick", M.l - 8, M.t - 16, "end", "(" + unit + ")");
    CL.PERIODS.forEach((p, i) => {
      const sel = cfg.band === i;
      if (compact) {
        s += txt("xlab small" + (sel ? " is-sel" : ""), X(i), H - 14, "middle", i === 0 ? p.short : p.short.replace("기", ""));
      } else {
        s += txt("xlab" + (sel ? " is-sel" : ""), X(i), H - 30, "middle", p.short);
        s += txt("xsub", X(i), H - 13, "middle", p.years);
      }
    });
    (cfg.unknown || []).forEach((i) => {
      s += '<line class="qline" x1="' + X(i).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y1="' + M.t + '" y2="' + (M.t + ph) + '"/>';
      s += '<circle class="qdot" cx="' + X(i).toFixed(1) + '" cy="' + (M.t + ph / 2).toFixed(1) + '" r="15"/>';
      s += txt("qmark", X(i), M.t + ph / 2 + 6, "middle", "?");
    });

    series.forEach((se) => {
      let d = "";
      let pen = false;
      se.vals.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1);
        pen = true;
      });
      if (d.indexOf("L") >= 0) s += '<path class="ln ' + se.cls + " st-" + (se.style || "solid") + '" d="' + d + '"/>';
    });
    series.forEach((se) => {
      if (se.style === "dot") return;
      se.vals.forEach((v, i) => {
        if (v == null || (se.skipDot && se.skipDot.indexOf(i) >= 0)) return;
        s += '<circle class="dot ' + se.cls + (se.hollow ? " hollow" : "") + '" cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (cfg.band === i ? 6.5 : compact ? 4 : 5) + '"/>';
      });
    });

    // 값 표시
    for (let i = 0; i < 4; i++) {
      const marks = [];
      series.forEach((se) => {
        const v = se.vals[i];
        if (se.labels !== "all" || v == null || (se.skipLabel && se.skipLabel.indexOf(i) >= 0)) return;
        marks.push({ y: Y(v), t: (se.prefix || "") + CL.fmtNum(v, cfg.dec) + (compact ? "" : unitShort(unit)), cls: se.minor ? "vlab minor" : "vlab" });
      });
      marks.sort((a, b) => a.y - b.y);
      marks.slice(0, 2).forEach((mk, k) => {
        const below = marks.length >= 2 && k === 1;
        s += txt(mk.cls, X(i), mk.y + (below ? 24 : -13), "middle", mk.t);
      });
    }
    const ends = [];
    series.forEach((se) => {
      if (se.labels !== "end") return;
      let last = -1;
      se.vals.forEach((v, i) => { if (v != null) last = i; });
      if (last < 0) return;
      ends.push({ y: Y(se.vals[last]), x: X(last), t: (se.endName ? se.endName + " " : "") + CL.fmtNum(se.vals[last], cfg.dec) + (compact ? "" : unitShort(unit)) });
    });
    ends.sort((a, b) => a.y - b.y);
    if (!ends.some((e, k) => k > 0 && e.y - ends[k - 1].y < 17)) {
      ends.forEach((e) => { s += txt("vlab", e.x + 10, e.y + 5, "start", e.t); });
    }

    // 누르면 값이 보이는 영역
    series.forEach((se) => {
      if (se.noTip) return;
      se.vals.forEach((v, i) => {
        if (v == null) return;
        let t2 = CL.fmtNum(v, cfg.dec) + unit;
        const v0 = se.vals[0];
        if (i > 0 && v0 != null && !se.noDelta) {
          const d = v - v0;
          t2 += CL.isZero(d, cfg.dec) ? " (현재와 같음)" : " (현재보다 " + (d > 0 ? "+" : "−") + CL.fmtNum(Math.abs(d), cfg.dec) + unitShort(unit) + ")";
        }
        const t1 = CL.PERIODS[i].short + " " + CL.PERIODS[i].years + " · " + (se.tip || se.label);
        s += '<circle class="hit" cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="22" data-t1="' + CL.esc(t1) + '" data-t2="' + CL.esc(t2) + '" data-cls="' + CL.esc(se.cls) + '"/>';
      });
    });
    s += "</svg>";
    el.innerHTML = s;
  };
  function unitShort(unit) {
    return String(unit).split("/")[0];
  }

  CL.legend = function (items) {
    return '<div class="legend">' + items.map((it) => '<span><i class="key ' + it[0] + '"></i>' + CL.esc(it[1]) + "</span>").join("") + "</div>";
  };
})();
