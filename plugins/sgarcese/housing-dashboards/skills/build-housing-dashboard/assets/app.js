const D = JSON.parse(document.getElementById('data').textContent);
const $ = s => document.querySelector(s);
const f0 = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});
const f1 = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1, minimumFractionDigits: 1});
const n0 = v => v == null ? '–' : f0.format(v);
const usd = v => v == null ? '–' : '$' + f0.format(v);
const usdk = v => v == null ? '–' : v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e4 ? '$' + f1.format(v / 1000).replace('.0', '') + 'K' : usd(v);
const pct = (v, d = 1) => v == null ? '–' : (d ? f1.format(v) : f0.format(v)) + '%';
const chg = (a, b) => (a == null || !b) ? null : (a / b - 1) * 100;
const sgn = v => v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + f1.format(Math.abs(v)) + '%';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const G = Object.fromEntries(D.geos.map(g => [g.id, g]));
const dm = id => D.demand[id].now, dp = id => D.demand[id].prev;
const FOCUS = D.focus, HOME = D.home, STATE = D.state, NATION = D.nation;
const ORDER = D.order;
const GEO_COLOR = {[FOCUS]: 'var(--s1)', [STATE]: 'var(--s3)', [NATION]: 'var(--bench)'};
if (HOME && HOME !== FOCUS) GEO_COLOR[HOME] = 'var(--s2)';
const gcol = id => GEO_COLOR[id] || 'var(--other)';
const isHL = id => id === FOCUS || id === HOME;
const firstCounty = ORDER.find(id => G[id].kind === 'county');
const isSep = id => id === firstCounty || id === STATE;
const E = D.econ || {}, H = D.hud || {};
const has = {trend: Object.keys(D.trend || {}).length > 0, bls: !!(E.ppi && E.ppi.length), qcew: !!E.qcew, oews: !!E.oews,
  hud: Object.keys(H.counties || {}).length > 0, map: !!D.geo && Object.keys(H.counties || {}).length > 0, hwage: (H.fmr || []).length > 0};
document.querySelectorAll('[data-need]').forEach(el => { if (!has[el.dataset.need]) el.hidden = true; });
const monthName = d => { const [y, m] = d.split('-'); return new Date(+y, +m - 1, 1).toLocaleString('en-US', {month: 'long'}) + ' ' + y; };
/* ---------- tooltip ---------- */
const tip = $('#tip');
function showTip(e, html) { tip.innerHTML = html; tip.style.opacity = 1; moveTip(e); }
function moveTip(e) {
  const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}
function hideTip() { tip.style.opacity = 0; }
function bindTips(root) {
  root.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mouseenter', e => showTip(e, el.dataset.tip));
    el.addEventListener('mousemove', moveTip); el.addEventListener('mouseleave', hideTip);
  });
}

/* ---------- findings & KPIs ---------- */

/* ---------- scope chips, findings, KPIs ---------- */
(() => {
  const peers = ORDER.filter(id => !isHL(id) && id !== STATE && id !== NATION).map(id => G[id].name);
  const chips = [[FOCUS, 'var(--s1)', G[FOCUS].name]];
  if (HOME && HOME !== FOCUS) chips.push([HOME, 'var(--s2)', G[HOME].name]);
  chips.push(['', 'var(--other)', 'Region: ' + peers.join(', ')], [STATE, 'var(--s3)', G[STATE].name], [NATION, 'var(--bench)', 'United States']);
  $('#scope').innerHTML = chips.map(([, c, n]) => `<span class="chip"><i style="background:${c}"></i>${esc(n)}</span>`).join('');
})();
function findings(sel, items) {
  const el = $(sel); if (!el) return;
  if (!items || !items.length) { el.hidden = true; return; }
  el.innerHTML = items.map(f => `<div class="finding"><b>${esc(f.head)}</b><span>${esc(f.body)}</span></div>`).join('');
}
function kpi(l, v, d) { return `<div class="kpi"><div class="l">${esc(l)}</div><div class="v num">${v}</div><div class="d">${d}</div></div>`; }
const F = D.findings || {};
findings('#topfind', F.overview); findings('#find-demand', F.demand); findings('#find-econ', F.economy); findings('#find-hud', F.assisted);
(() => {
  const f = dm(FOCUS), fp = dp(FOCUS), s = dm(STATE), us = dm(NATION), h = HOME ? dm(HOME) : null;
  const ref = (h && HOME !== FOCUS) ? ['county', h] : ['state', s];
  const k = [
    kpi(`Households, ${G[FOCUS].name}`, n0(f.hh), `<em>${sgn(chg(f.hh, fp.hh))}</em> since ${esc(D.acs.prior5 - 4)}–${esc(String(D.acs.prior5).slice(2))}; population ${sgn(chg(f.pop, fp.pop))}`),
    kpi('Median gross rent', usd(f.med_rent), `<em>${sgn(chg(f.med_rent, fp.med_rent))}</em> · ${ref[0]} ${usd(ref[1].med_rent)} · U.S. ${usd(us.med_rent)}`),
    kpi('Median home value', usdk(f.med_value), `<em>${sgn(chg(f.med_value, fp.med_value))}</em> · ${ref[0]} ${usdk(ref[1].med_value)} · state ${usdk(s.med_value)}`),
    kpi('Renters cost-burdened', pct(f.rent_burden30, 0), `±${esc(f.rent_burden30_moe ?? '–')} pts · ${pct(f.rent_burden50, 0)} pay half or more`)];
  const ppi = has.bls && E.ppi.find(p => p.id === 'WPUIP231100');
  if (ppi) k.push(kpi('Residential input prices', sgn(ppi.since2020), `since Jan 2020 (U.S. PPI) · ${sgn(ppi.yoy)} in the past year`));
  const hc = has.hud && H.counties[HOME || firstCounty];
  if (hc) k.push(kpi(`Assisted rentals, ${hc.name}`, n0(hc.federal_rental_assist), `about ${f0.format(hc.share_renters_assisted)} per 100 renter households`));
  $('#kpis').innerHTML = k.join('');
})();
/* ---------- HTML bar helpers ---------- */
function barRows(el, rows, {max, fmt, stack, axis, moe} = {}) {
  const M = max ?? Math.max(...rows.map(r => r.segs.reduce((s, x) => s + (x.v || 0), 0)));
  el.innerHTML = rows.map(r => {
    const tot = r.segs.reduce((s, x) => s + (x.v || 0), 0);
    const segs = r.segs.map(s => `<div class="seg" style="width:calc(${(s.v || 0) / M * 100}% - 2px);background:${s.c}" data-tip="${esc(s.tip || '')}"></div>`).join('');
    const mo = moe && r.moe ? `<div class="moe" style="left:${(tot - r.moe) / M * 100}%;width:${2 * r.moe / M * 100}%"></div>` : '';
    return `<div class="brow${r.hl ? ' hl' : ''}${r.sep ? ' sep' : ''}"><div class="lab" title="${esc(r.label)}">${esc(r.label)}</div><div class="track">${segs}${mo}</div><div class="val">${r.val ?? fmt(tot)}</div></div>`;
  }).join('') + (axis ? `<div class="axisnote"><div></div><div>${axis.map(a => `<span>${a}</span>`).join('')}</div><div></div></div>` : '');
  bindTips(el);
}
function dumbbell(el, rows, {min, max, fmt, ticks}) {
  const X = v => (v - min) / (max - min) * 100;
  el.innerHTML = rows.map(r => {
    const pts = r.pts.filter(p => p.v != null);
    const lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
    const grid = ticks.map(t => `<div class="gridl" style="left:${X(t)}%"></div>`).join('');
    const dots = pts.map(p => `<div class="pt" style="left:${X(p.v)}%;background:${p.c};${p.ring ? `background:var(--surface);box-shadow:inset 0 0 0 2px ${p.ring},0 0 0 2px var(--surface)` : ''}" data-tip="${esc(p.tip)}"></div>`).join('');
    return `<div class="brow${r.hl ? ' hl' : ''}${r.sep ? ' sep' : ''}"><div class="lab">${esc(r.label)}</div><div class="track">${grid}<div class="line" style="left:${X(lo)}%;width:${X(hi) - X(lo)}%"></div>${dots}</div><div class="val">${r.val}</div></div>`;
  }).join('') + `<div class="axisnote"><div></div><div style="position:relative;display:block;height:14px">${ticks.map(t => `<span style="position:absolute;left:${X(t)}%;transform:translateX(-50%)">${fmt(t)}</span>`).join('')}</div><div></div></div>`;
  bindTips(el);
}

/* ---------- SVG line chart ---------- */
function niceTicks(lo, hi, n = 5) {
  const span = hi - lo, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(6));
  return out;
}
function lineChart(el, series, {height = 280, yFmt = n0, xFmt = x => x, xTicks, baseline, tipX = x => x, yZero = false} = {}) {
  const W = Math.max(300, el.clientWidth || 600), H = height, m = {t: 12, r: 70, b: 26, l: 52};
  const all = series.flatMap(s => s.pts.filter(p => p[1] != null));
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let yt = niceTicks(yZero ? 0 : Math.min(...ys, baseline ?? Infinity), Math.max(...ys, baseline ?? -Infinity));
  const y0 = yt[0], y1 = yt.at(-1);
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r), Y = y => m.t + (1 - (y - y0) / (y1 - y0)) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  yt.forEach(t => s += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${yFmt(t)}</text>`);
  if (baseline != null) s += `<line class="base" x1="${m.l}" x2="${W - m.r}" y1="${Y(baseline)}" y2="${Y(baseline)}" style="stroke:var(--ink-3)"/>`;
  (xTicks || niceTicks(x0, x1, 6)).filter(t => t >= x0 && t <= x1).forEach(t => s += `<text x="${X(t)}" y="${H - 6}" text-anchor="middle">${xFmt(t)}</text>`);
  const ordered = [...series].sort((a, b) => (a.bg ? 0 : 1) - (b.bg ? 0 : 1));
  ordered.forEach(se => {
    let d = '', pen = false;
    se.pts.forEach(p => { if (p[1] == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); pen = true; });
    s += `<path d="${d}" fill="none" stroke="${se.c}" stroke-width="${se.bg ? 1.25 : 2}" stroke-linejoin="round" stroke-linecap="round" ${se.bg ? 'opacity=".9"' : ''}/>`;
  });
  // end labels for foreground series, de-collided
  const ends = series.filter(se => !se.bg).map(se => { const p = [...se.pts].reverse().find(p => p[1] != null); return {se, x: X(p[0]), y: Y(p[1]), v: p[1]}; }).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].ly = (ends[i - 1].ly ?? ends[i - 1].y) + 13;
  ends.forEach(e => { const ly = e.ly ?? e.y; s += `<circle cx="${e.x}" cy="${e.y}" r="4" fill="${e.se.c}" stroke="var(--surface)" stroke-width="2"/>`;
    if (Math.abs(ly - e.y) > 1) s += `<line x1="${e.x + 5}" y1="${e.y}" x2="${e.x + 9}" y2="${ly}" stroke="var(--ink-3)" stroke-width="1"/>`;
    s += `<text x="${e.x + 10}" y="${ly + 4}" style="fill:var(--ink);font-weight:600">${yFmt(e.v)}</text>`; });
  s += `<line class="xh" id="xh" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="opacity:0"/><g id="xd"></g><rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent" id="hit"/></svg>`;
  el.innerHTML = s;
  const svg = el.querySelector('svg'), xh = svg.querySelector('#xh'), xd = svg.querySelector('#xd'), hit = svg.querySelector('#hit');
  const xsU = [...new Set(xs)].sort((a, b) => a - b);
  hit.addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width;
    const xv = xsU.reduce((a, b) => Math.abs(X(b) - mx) < Math.abs(X(a) - mx) ? b : a);
    xh.setAttribute('x1', X(xv)); xh.setAttribute('x2', X(xv)); xh.style.opacity = 1;
    const rows = series.map(se => ({se, p: se.pts.find(p => p[0] === xv)})).filter(o => o.p && o.p[1] != null).sort((a, b) => b.p[1] - a.p[1]);
    xd.innerHTML = rows.filter(o => !o.se.bg).map(o => `<circle cx="${X(xv)}" cy="${Y(o.p[1])}" r="4" fill="${o.se.c}" stroke="var(--surface)" stroke-width="2"/>`).join('');
    showTip(e, `<b>${tipX(xv)}</b>` + rows.map(o => `<div class="r"><i style="background:${o.se.c}"></i>${esc(o.se.name)}: ${o.se.tipFmt ? o.se.tipFmt(o.p) : yFmt(o.p[1])}</div>`).join(''));
  });
  hit.addEventListener('mouseleave', () => { xh.style.opacity = 0; xd.innerHTML = ''; hideTip(); });
}
const legend = (el, items) => el.innerHTML = items.map(([c, l, t]) => `<span><i class="${t ?? 'ln'}" style="background:${c}"></i>${esc(l)}</span>`).join('');
const dnum = d => { const [y, m] = d.split('-'); return +y + (+m - 1) / 12; };
const dlab = x => { const y = Math.floor(x + 1e-6), m = Math.round((x - y) * 12); return new Date(y, m, 1).toLocaleString('en-US', {month: 'short'}) + ' ' + y; };

function spark(el, pts, p) {
  const W = 200, H = 64, m = {t: 6, b: 12, l: 2, r: 2};
  const ys = pts.map(q => q[1]), lo = Math.min(...ys, 100), hi = Math.max(...ys, 100);
  const x0 = pts[0][0], x1 = pts.at(-1)[0];
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r), Y = y => m.t + (1 - (y - lo) / (hi - lo)) * (H - m.t - m.b);
  const d = pts.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1)).join('');
  const area = d + `L${X(x1)},${Y(lo)}L${X(x0)},${Y(lo)}Z`;
  const last = pts.at(-1);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}"><path d="${area}" fill="var(--s1)" opacity=".1"/><line class="base" x1="0" x2="${W}" y1="${Y(100)}" y2="${Y(100)}" style="stroke:var(--ink-3);stroke-width:.75;opacity:.6"/><path d="${d}" fill="none" stroke="var(--s1)" stroke-width="1.75" stroke-linejoin="round"/><circle cx="${X(last[0])}" cy="${Y(last[1])}" r="3.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="1.5"/><text x="0" y="${H - 1}" style="font-size:9.5px">2016</text><text x="${W}" y="${H - 1}" text-anchor="end" style="font-size:9.5px">${esc(p.last_date.slice(0, 4))}</text><rect width="${W}" height="${H}" fill="transparent"/></svg>`;
  const svg = el.querySelector('svg');
  svg.addEventListener('mousemove', e => { const r = svg.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width;
    const q = pts.reduce((a, b) => Math.abs(X(b[0]) - mx) < Math.abs(X(a[0]) - mx) ? b : a);
    showTip(e, `<b>${esc(p.label)}</b><br>${dlab(q[0])}: ${f1.format(q[1])} (Jan 2020 = 100)<br><span style="opacity:.75">Peak ${esc(p.peak_date)}; ${sgn(p.from_peak)} from peak</span>`); });
  svg.addEventListener('mouseleave', hideTip);
}
function columns(el, data, {fmt = n0, color, hlFn, tipFn}) {
  const M = Math.max(...data.map(d => d.v));
  el.innerHTML = `<div class="cols">${data.map(d => `<div class="col" data-tip="${esc(tipFn(d))}"><div class="cv">${d.v && (!hlFn || hlFn(d) || d.v === M) ? fmt(d.v) : ''}</div><div class="bar" style="height:${d.v / M * 82}%;background:${hlFn && hlFn(d) ? color[0] : color[1]}"></div></div>`).join('')}</div><div class="colx">${data.map(d => `<div>${esc(d.lab)}</div>`).join('')}</div>`;
  bindTips(el);
}

/* ---------- 1. Demand ---------- */
let trMeasure = 'rent';
function drawTrend() {
  if (!has.trend) return;
  const cfg = {rent: ['rent', usd], value: ['value', usdk], income: ['income', usdk]}[trMeasure];
  const ids = [FOCUS, HOME, STATE, NATION].filter((id, i, a) => id && a.indexOf(id) === i && D.trend[id]);
  const ys = [...new Set(ids.flatMap(id => D.trend[id].map(r => r.y)))].sort((a, b) => a - b);
  const years = []; for (let y = ys[0]; y <= ys.at(-1); y++) years.push(y);
  const series = ids.map(id => ({name: G[id].name, c: gcol(id), pts: years.map(y => { const r = D.trend[id].find(r => r.y === y); return [y, r ? r[cfg[0]] : null]; })}));
  legend($('#tr-leg'), ids.map(id => [gcol(id), G[id].name]));
  lineChart($('#ch-trend'), series, {yFmt: cfg[1], xTicks: years.filter(y => (y - years[0]) % 2 === 0), height: 280});
}
['rent', 'value', 'income'].forEach(k => $('#tr-' + k).addEventListener('click', () => {
  trMeasure = k; ['rent', 'value', 'income'].forEach(j => $('#tr-' + j).setAttribute('aria-pressed', j === k)); drawTrend();
}));
function drawTenure() {
  const vals = ORDER.flatMap(id => [dm(id).renter_share, dp(id).renter_share]).filter(v => v != null);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 3) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...vals) + 3) / 10) * 10);
  const ticks = []; for (let t = lo; t <= hi; t += 10) ticks.push(t);
  dumbbell($('#ch-tenure'), ORDER.map(id => ({label: G[id].name, hl: isHL(id), sep: isSep(id), val: pct(dm(id).renter_share, 0),
    pts: [{v: dp(id).renter_share, ring: 'var(--ink-3)', tip: `<b>${esc(G[id].name)}</b><br>${esc(D.acs.prior5 - 4)}–${esc(D.acs.prior5)}: ${pct(dp(id).renter_share)} renters`},
          {v: dm(id).renter_share, c: gcol(id) === 'var(--other)' ? 'var(--s1)' : gcol(id), tip: `<b>${esc(G[id].name)}</b><br>${esc(D.acs.latest5 - 4)}–${esc(D.acs.latest5)}: ${pct(dm(id).renter_share)} ± ${esc(dm(id).renter_share_moe)} pts<br>${n0(dm(id).renters)} renter households`}]})),
    {min: lo, max: hi, fmt: v => v + '%', ticks});
}
function drawPyr() {
  const ages = ['15–24', '25–34', '35–44', '45–54', '55–59', '60–64', '65–74', '75–84', '85+'];
  const f = dm(FOCUS), R = f.age_renter, O = f.age_owner, M = Math.max(...R, ...O);
  $('#ch-pyr').innerHTML = ages.map((a, i) => `<div class="prow"><div class="l"><div class="seg" style="width:${R[i] / M * 100}%;background:var(--s2)" data-tip="<b>Age ${a}</b><br>${n0(R[i])} renter households (${pct(R[i] / (R[i] + O[i]) * 100, 0)})"></div></div><div class="age">${a}</div><div class="r"><div class="seg" style="width:${O[i] / M * 100}%;background:var(--s1)" data-tip="<b>Age ${a}</b><br>${n0(O[i])} owner households (${pct(O[i] / (R[i] + O[i]) * 100, 0)})"></div></div></div>`).join('');
  bindTips($('#ch-pyr'));
}
function drawBurden() {
  barRows($('#ch-burden'), ORDER.map(id => { const d = dm(id); const mod = d.rent_burden30 - d.rent_burden50;
    return {label: G[id].name, hl: isHL(id), sep: isSep(id), moe: d.rent_burden30_moe,
      segs: [{v: mod, c: 'var(--seq-lo)', tip: `<b>${esc(G[id].name)}</b><br>30–49.9%: ${pct(mod)}`}, {v: d.rent_burden50, c: 'var(--seq-hi)', tip: `<b>${esc(G[id].name)}</b><br>50% or more: ${pct(d.rent_burden50)}<br>${n0(d.rent_burdened_hh)} burdened renter households`}]}; }),
    {max: 70, fmt: v => pct(v, 0), moe: true, axis: ['0%', '35%', '70%']});
}
function drawRace() {
  const ids = ORDER.filter(id => dm(id).own_rate_black != null || dm(id).own_rate_hisp != null);
  dumbbell($('#ch-race'), ids.map(id => { const d = dm(id);
    const gap = d.own_rate_black != null ? `${Math.round(d.own_rate_white_nh - d.own_rate_black)} pts` : '';
    return {label: G[id].name, hl: isHL(id), sep: isSep(id), val: gap,
      pts: [{v: d.own_rate_white_nh, c: 'var(--s1)', tip: `<b>${esc(G[id].name)}</b><br>White non-Hispanic: ${pct(d.own_rate_white_nh)}`},
            {v: d.own_rate_black, c: 'var(--s2)', tip: `<b>${esc(G[id].name)}</b><br>Black: ${pct(d.own_rate_black)} of ${n0(d.black_hh)} householders`},
            {v: d.own_rate_hisp, c: 'var(--s3)', tip: `<b>${esc(G[id].name)}</b><br>Hispanic: ${pct(d.own_rate_hisp)} of ${n0(d.hisp_hh)} householders`}]}; }),
    {min: 0, max: 100, fmt: v => v + '%', ticks: [0, 25, 50, 75, 100]});
}
function stack100(el, legEl, key, labels, colors) {
  legend(legEl, labels.map((l, i) => [colors[i], l, '']));
  barRows(el, ORDER.map(id => { const arr = dm(id)[key], tot = arr.reduce((a, b) => a + b, 0);
    return {label: G[id].name, hl: isHL(id), sep: isSep(id), val: '',
      segs: arr.map((v, i) => ({v: v / tot * 100, c: colors[i], tip: `<b>${esc(G[id].name)}</b><br>${labels[i]}: ${pct(v / tot * 100)} (${n0(v)} units)`}))}; }),
    {max: 100, fmt: () => ''});
  el.querySelectorAll('.brow').forEach(r => r.style.gridTemplateColumns = 'minmax(92px,128px) minmax(0,1fr)');
  el.querySelectorAll('.val').forEach(v => v.remove());
}

/* ---------- 2. Economy ---------- */
function drawCostWage() {
  if (!has.bls) return;
  const cw = E.cost_vs_wage;
  const S = [['ppi_inputs', 'Residential construction inputs (PPI)', 'var(--s2)'], ['ahe_construction', 'Construction hourly earnings', 'var(--s1)'], ['cpi_all', 'Consumer prices (CPI-U)', 'var(--bench)']].filter(s => cw[s[0]].length);
  legend($('#cw-leg'), S.map(s => [s[2], s[1]]));
  const y1 = +cw.ppi_inputs.at(-1)[0].slice(0, 4);
  lineChart($('#ch-costwage'), S.map(([k, n, c]) => ({name: n, c, pts: cw[k].map(p => [dnum(p[0]), p[1]])})),
    {yFmt: v => f0.format(v), baseline: 100, xTicks: [2016, 2018, 2020, 2022, 2024, 2026, 2028].filter(y => y <= y1), tipX: dlab, height: 290});
}
function drawPPI() {
  if (!has.bls) return;
  const el = $('#ch-ppi');
  el.innerHTML = E.ppi.map((p, i) => `<div class="smc"><div class="t">${esc(p.label)}</div><div class="n"><span><b>${sgn(p.since2020)}</b></span><span>${sgn(p.yoy)} y/y</span></div><div class="chart" id="spk${i}"></div></div>`).join('');
  E.ppi.forEach((p, i) => spark($('#spk' + i), p.idx.map(d => [dnum(d[0]), d[1]]), p));
}
function drawQcew() {
  if (!has.qcew) return;
  const Q = E.qcew, yrs = Q.years, homeQ = HOME || firstCounty;
  const fg = {[homeQ]: 'var(--s2)', [STATE + '000']: 'var(--s3)', 'US000': 'var(--bench)'};
  const series = Q.areas.map(a => ({name: a.name, c: fg[a.id] || 'var(--other)', bg: !fg[a.id],
    pts: yrs.map((y, i) => [y, a.emp236[i] != null && a.emp236[0] ? a.emp236[i] / a.emp236[0] * 100 : null]),
    tipFmt: p => `${f0.format(p[1])} (${n0(a.emp236[yrs.indexOf(p[0])])} jobs)`}));
  legend($('#qc-leg'), [[fg[homeQ], G[homeQ].name], ['var(--s3)', G[STATE].name], ['var(--bench)', 'United States'], ['var(--other)', 'Other counties in the region']]);
  lineChart($('#ch-qcew'), series, {yFmt: v => f0.format(v), baseline: 100, xTicks: yrs.filter((y, i) => i % 2 === 0), height: 280});
}
function drawQwage() {
  if (!has.qcew) return;
  const A = E.qcew.areas, M = Math.max(...A.map(a => Math.max(a.latest.wage236 || 0, a.latest.wage_private || 0))) * 1.05;
  barRows($('#ch-qwage'), A.map(a => ({label: a.name, hl: a.id === (HOME || firstCounty), sep: a.id === STATE + '000', val: usd(a.latest.wage236),
    segs: [{v: a.latest.wage236, c: 'var(--s2)', tip: `<b>${esc(a.name)}</b><br>Construction of buildings: ${usd(a.latest.wage236)}/wk (${sgn(a.wage236_chg)} since ${esc(E.qcew.years[0])})<br>${n0(a.latest.emp236)} jobs, ${n0(a.latest.estabs236)} establishments`}]})), {max: M, fmt: usd});
  const rows = $('#ch-qwage').querySelectorAll('.brow');
  A.forEach((a, i) => { const t = rows[i].querySelector('.track'); t.style.flexDirection = 'column'; t.style.height = '24px';
    const s0 = t.querySelector('.seg'); s0.style.height = '12px'; s0.style.borderRadius = '0 4px 4px 0';
    t.insertAdjacentHTML('beforeend', `<div class="seg" style="height:8px;width:${(a.latest.wage_private || 0) / M * 100}%;background:var(--bench);border-radius:0 3px 3px 0" data-tip="<b>${esc(a.name)}</b><br>All private: ${usd(a.latest.wage_private)}/wk (${sgn(a.wage_private_chg)} since ${esc(E.qcew.years[0])})"></div>`); });
  bindTips($('#ch-qwage'));
}
function drawHwage() {
  if (!has.hwage) return;
  const withW = H.fmr.filter(f => f.median_wage).sort((a, b) => b.housing_wage - a.housing_wage);
  const M = Math.max(...H.fmr.map(f => Math.max(f.housing_wage, f.median_wage || 0))) * 1.08;
  barRows($('#ch-hwage'), withW.flatMap(f => [
    {label: G[f.county].name, hl: f.county === (HOME || firstCounty), val: '$' + f.housing_wage.toFixed(2), segs: [{v: f.housing_wage, c: 'var(--s2)', tip: `<b>${esc(f.area)}</b><br>2BR FMR ${usd(f.fmr[2])}/mo → $${f.housing_wage.toFixed(2)}/hr`}]},
    {label: '', val: '$' + f.median_wage.toFixed(2), segs: [{v: f.median_wage, c: 'var(--s1)', tip: `<b>${esc(f.area)}</b><br>Median hourly wage, all occupations: $${f.median_wage.toFixed(2)}${f.laborer_wage ? `<br>Construction laborers: $${f.laborer_wage.toFixed(2)}` : ''}`}]}]), {max: M});
  const rest = H.fmr.filter(f => !f.median_wage);
  if (rest.length) $('#ch-hwage').insertAdjacentHTML('beforeend', `<div class="axisnote" style="margin-top:6px"><div></div><div style="display:block">${rest.map(f => `${esc(G[f.county].name)} housing wage: $${f.housing_wage.toFixed(2)} (2BR FMR ${usd(f.fmr[2])})`).join('<br>')}</div><div></div></div>`);
}
function drawOews() {
  if (!has.oews) return;
  const A = E.oews.areas;
  let h = `<thead><tr><th>Occupation</th>${A.map(a => `<th class="n">${esc(a.name)}</th>`).join('')}</tr></thead><tbody>`;
  E.oews.occs.forEach(o => {
    h += `<tr${o.code === '47-0000' ? ' class="hl"' : ''}><td>${esc(o.label)} <span class="m">${esc(o.code)}</span></td>` + o.vals.map(v => v.a_median ? `<td class="n">${usd(v.a_median)} <span class="m">${sgn(v.chg)}</span><br><span class="m">${n0(v.emp)} jobs</span></td>` : `<td class="n dim">–</td>`).join('') + '</tr>';
  });
  $('#tb-oews').innerHTML = h + '</tbody>';
}
function drawLabor() {
  if (!has.bls) return;
  const la = E.laus || {};
  let h = `<thead><tr><th>Area</th><th class="n">Construction jobs, latest (thousands)</th><th class="n">Change over year</th><th class="n">12-mo avg vs 2019</th><th>Unemployment for</th><th class="n">Unemployment, latest</th><th class="n">12-mo avg</th><th class="n">2019 avg</th></tr></thead><tbody>`;
  const lausCell = id => { const l = la[id]; return l ? `<td>${esc(G[id].name)}</td><td class="n">${pct(l.last)} <span class="m">${esc(l.last_date)}</span></td><td class="n">${pct(l.avg12)}</td><td class="n">${pct(l.avg2019)}</td>` : '<td class="dim">–</td><td></td><td></td><td></td>'; };
  (E.ces || []).forEach(c => { const lid = c.counties ? c.counties.find(x => la[x]) : (c.name === 'United States' ? NATION : STATE);
    h += `<tr${c.counties && c.counties.includes(HOME || firstCounty) ? ' class="hl"' : ''}><td>${esc(c.name)}</td><td class="n">${f1.format(c.last)} <span class="m">${esc(c.last_date)}</span></td><td class="n">${sgn(c.yoy)}</td><td class="n">${sgn(c.vs2019)}</td>${lausCell(lid)}</tr>`; });
  ORDER.filter(id => G[id].kind === 'place' && la[id]).forEach(id => h += `<tr><td>${esc(G[id].name)}</td><td class="dim n">–</td><td class="dim n">–</td><td class="dim n">–</td>${lausCell(id)}</tr>`);
  $('#tb-labor').innerHTML = h + '</tbody>';
  const cy = E.cpi || {};
  const bits = [];
  if (cy.shelter_region && cy.shelter_us) bits.push(`shelter ${sgn(cy.shelter_region[1])} ${esc(cy.region)} vs ${sgn(cy.shelter_us[1])} U.S.`);
  if (cy.rent_region && cy.rent_us) bits.push(`rent of primary residence ${sgn(cy.rent_region[1])} ${esc(cy.region)} vs ${sgn(cy.rent_us[1])} U.S.`);
  if (cy.all_us) bits.push(`all items ${sgn(cy.all_us[1])} U.S.`);
  if (bits.length) $('#cpi-note').innerHTML = `<b>Consumer prices</b>, CPI-U, change over the year to ${esc(cy.all_us[0])}: ${bits.join('; ').replace(/\.$/, '')}.`;
}

/* ---------- 3. Assisted housing ---------- */
const PROG = [['hcv', 'Housing Choice Vouchers', 'var(--s1)'], ['sec8', 'Project-based Section 8', 'var(--s2)'], ['prac', 'Section 202 / 811', 'var(--s3)'], ['ph', 'Public housing', 'var(--s4)']];
const HC = HOME || firstCounty;
function drawHud() {
  if (!has.hud) return;
  legend($('#leg-hud'), [...PROG.map(p => [p[2], p[1], '']), ['var(--other)', 'LIHTC units (separate row)', '']]);
  const ids = Object.keys(H.counties).sort((a, b) => (a === HC ? -1 : b === HC ? 1 : 0));
  const tot = c => PROG.reduce((s, p) => s + (c.per1000[p[0]] || 0), 0);
  const M = Math.max(...ids.map(id => Math.max(tot(H.counties[id]), H.counties[id].per1000.lihtc || 0))) * 1.05;
  barRows($('#ch-hud'), ids.flatMap(id => { const c = H.counties[id]; return [
    {label: c.name, hl: id === HC, sep: id !== HC, val: f0.format(tot(c)),
      segs: PROG.map(p => ({v: c.per1000[p[0]], c: p[2], tip: `<b>${esc(c.name)}</b><br>${p[1]}: ${n0(c[p[0]])} units (${f1.format(c.per1000[p[0]] || 0)} per 1,000 renters)${p[0] === 'hcv' ? `<br>Floor: ${esc(c.hcv_tracts_reported)} of ${esc(c.tracts)} tracts reported; local PHAs report ${n0(c.hcv_pha)} vouchers` : ''}`}))},
    {label: 'LIHTC', lihtc: true, val: f0.format(c.per1000.lihtc || 0), segs: [{v: c.per1000.lihtc, c: 'var(--other)', tip: `<b>${esc(c.name)}</b><br>LIHTC: ${n0(c.lihtc)} low-income units in ${esc(c.lihtc_projects)} projects`}]}]; }), {max: M});
  $('#ch-hud').querySelectorAll('.brow').forEach(r => { if (r.querySelector('.lab').textContent === 'LIHTC') { r.querySelector('.lab').style.paddingLeft = '14px'; r.querySelector('.lab').style.color = 'var(--ink-3)'; r.querySelector('.track').style.height = '10px'; } });
}
function drawExp() {
  if (!has.hud) return;
  const now = new Date().getFullYear();
  const mf = H.mf.filter(m => m.county === HC && m.exp_year && m.exp_year >= now);
  if (!mf.length) { $('#ch-exp').innerHTML = '<p class="sub">No active HUD multifamily contracts recorded in this county.</p>'; return; }
  const y1 = Math.max(...mf.map(m => m.exp_year)); const data = [];
  for (let y = now; y <= y1; y++) { const ps = mf.filter(m => m.exp_year === y); data.push({y, v: ps.reduce((s, m) => s + (m.units || 0), 0), ps, lab: (y - now) % 2 === 0 ? "'" + String(y).slice(2) : ''}); }
  columns($('#ch-exp'), data, {color: ['var(--s2)', 'var(--s1)'], hlFn: d => d.y <= now + 4, tipFn: d => `<b>${esc(d.y)}</b><br>${n0(d.v)} assisted units` + d.ps.map(p => `<br>${esc(p.name)} (${esc(p.units)})`).join('')});
  $('#ch-exp').insertAdjacentHTML('beforeend', `<div class="legend" style="margin-top:10px"><span><i style="background:var(--s2)"></i>Expires ${now}–${now + 4}</span><span><i style="background:var(--s1)"></i>Later</span></div>`);
}
function drawLihtc() {
  if (!has.hud) return;
  const li = H.lihtc.filter(l => l.county === HC && l.yr);
  if (!li.length) { $('#ch-lihtc').innerHTML = '<p class="sub">No LIHTC properties recorded in this county.</p>'; return; }
  const y0 = Math.floor(Math.min(...li.map(l => l.yr)) / 5) * 5, y1 = Math.floor(new Date().getFullYear() / 5) * 5 - 5; const data = [];
  for (let y = y0; y <= Math.max(y1, y0); y += 5) { const ps = li.filter(l => l.yr >= y && l.yr < y + 5); data.push({y, v: ps.reduce((s, l) => s + (l.li || 0), 0), ps, lab: String(y)}); }
  columns($('#ch-lihtc'), data, {color: ['var(--s3)', 'var(--s3)'], tipFn: d => `<b>${esc(d.y)}–${esc(d.y + 4)}</b><br>${n0(d.v)} low-income units` + d.ps.map(p => `<br>${esc(p.name)}, ${esc(p.city)} (${esc(p.li ?? '?')})`).join('')});
}
function drawMap() {
  if (!has.map) return;
  const g = D.geo, el = $('#ch-map');
  const rOf = u => 2.5 + Math.sqrt(u || 1) * 0.55;
  let s = `<svg viewBox="0 0 ${g.W} ${g.H}" role="img" aria-label="Map of assisted housing properties">`;
  g.counties.forEach(c => s += `<path class="cty${c.ring ? ' ring' : ''}${c.focus ? ' focus' : ''}" d="${c.d}"/>`);
  s += `<path class="stl" d="${g.stateLine}"/>`;
  g.counties.filter(c => c.ring).forEach(c => s += `<text class="clab" x="${c.c[0]}" y="${c.c[1] + 18}" text-anchor="middle">${esc(c.name)}</text>`);
  const pts = [...H.lihtc.map(p => ({...p, k: 'li', u: p.li || p.units})), ...H.mf.map(p => ({...p, k: 'mf', u: p.units})), ...H.ph.map(p => ({...p, k: 'ph', u: p.units}))]
    .filter(p => p.x != null && p.x >= 0 && p.x <= g.W && p.y >= 0 && p.y <= g.H).sort((a, b) => b.u - a.u);
  const col = {mf: 'var(--s1)', ph: 'var(--s2)', li: 'var(--s3)'};
  pts.forEach((p, i) => s += `<circle class="p" data-i="${i}" cx="${p.x}" cy="${p.y}" r="${rOf(p.u).toFixed(1)}" fill="${col[p.k]}" fill-opacity=".85"/>`);
  (g.labels || []).forEach(c => s += `<circle cx="${c.x}" cy="${c.y}" r="2" fill="var(--ink)"/><text class="city" x="${c.x + 5}" y="${c.y - 5}">${esc(c.name)}</text>`);
  el.innerHTML = s + '</svg>';
  el.querySelectorAll('circle.p').forEach(ci => { const p = pts[+ci.dataset.i];
    const t = p.k === 'mf' ? `<b>${esc(p.name)}</b><br>${esc(p.city)} · HUD multifamily<br>${n0(p.units)} assisted units · ${esc(p.group)}<br>${esc(p.program || '')}${p.exp ? ' · expires ' + esc(p.exp) : ''}`
      : p.k === 'ph' ? `<b>${esc(p.name)}</b><br>${esc(p.city)} · Public housing<br>${n0(p.units)} units · ${esc(p.pha)}`
      : `<b>${esc(p.name)}</b><br>${esc(p.city)} · LIHTC${p.yr ? ', placed in service ' + esc(p.yr) : ''}<br>${n0(p.li)} low-income of ${n0(p.units)} units`;
    ci.addEventListener('mouseenter', e => showTip(e, t)); ci.addEventListener('mousemove', moveTip); ci.addEventListener('mouseleave', hideTip); });
}
function drawPha() {
  if (!has.hud) return;
  const cls = d => !d ? 'neu' : /High/.test(d) ? 'good' : /Troubled/.test(d) ? 'crit' : /Substandard/.test(d) ? 'warn' : 'neu';
  const rows = [...H.phas].sort((a, b) => (a.county === HC ? 0 : 1) - (b.county === HC ? 0 : 1) || (b.ph + b.hcv) - (a.ph + a.hcv));
  $('#tb-pha').innerHTML = `<thead><tr><th>Housing authority</th><th>Code</th><th>County</th><th class="n">Public housing units</th><th class="n">Vouchers</th><th class="n">Occupancy</th><th>PHAS designation</th></tr></thead><tbody>` +
    rows.map(p => `<tr${p.county === HC ? ' class="hl"' : ''}><td>${esc(p.name)}</td><td>${esc(p.code)}</td><td>${esc(G[p.county] ? G[p.county].name : p.county)}</td><td class="n">${n0(p.ph)}</td><td class="n">${n0(p.hcv)}</td><td class="n">${p.occ != null ? pct(p.occ, 0) : '–'}</td><td><span class="pill ${cls(p.phas)}">${esc(p.phas || 'Not rated (vouchers only)')}</span></td></tr>`).join('') + '</tbody>';
}
function drawMf() {
  if (!has.hud) return;
  const now = new Date().getFullYear();
  const rows = H.mf.filter(m => m.county === HC).sort((a, b) => (a.exp_year || 9999) - (b.exp_year || 9999));
  const reacCls = s => { const v = parseInt(s); return isNaN(v) ? 'neu' : v < 60 ? 'crit' : v < 80 ? 'warn' : 'good'; };
  $('#tb-mf').innerHTML = `<thead><tr><th>Property</th><th>City</th><th>Serves</th><th>Program</th><th class="n">Assisted / total units</th><th class="n">Contract expires</th><th class="n">REAC score</th><th class="n">Avg. resident income</th><th class="n">Avg. tenant rent</th></tr></thead><tbody>` +
    rows.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.city)}</td><td>${esc(m.group)}</td><td>${esc(m.program || '')}</td><td class="n">${n0(m.units)} / ${n0(m.total)}</td><td class="n">${m.exp_year && m.exp_year <= now + 4 ? `<span class="pill warn">${esc(m.exp)}</span>` : esc(m.exp || '–')}</td><td class="n">${m.reac ? `<span class="pill ${reacCls(m.reac)}">${esc(String(m.reac).trim())}</span>` : '–'}</td><td class="n">${usd(m.income)}</td><td class="n">${usd(m.rent)}</td></tr>`).join('') + '</tbody>';
}

/* ---------- Compare table ---------- */
function drawCompare() {
  const moe = (d, v) => d.kind === 'place' && v != null ? ` <span class="m">±${typeof v === 'number' && v > 50 ? n0(v) : esc(v)}</span>` : '';
  const cols = [
    ['Population', d => n0(d.now.pop), d => sgn(chg(d.now.pop, d.prev.pop))],
    ['Households', d => n0(d.now.hh), d => sgn(chg(d.now.hh, d.prev.hh))],
    ['Renter share', d => pct(d.now.renter_share) + moe(d, d.now.renter_share_moe), d => d.prev.renter_share == null ? '' : sgn(d.now.renter_share - d.prev.renter_share).replace('%', ' pts')],
    ['Median HH income', d => usd(d.now.med_income) + moe(d, d.now.med_income_moe), d => sgn(chg(d.now.med_income, d.prev.med_income))],
    ['Renter median income', d => usd(d.now.renter_income), d => sgn(chg(d.now.renter_income, d.prev.renter_income))],
    ['Median gross rent', d => usd(d.now.med_rent) + moe(d, d.now.med_rent_moe), d => sgn(chg(d.now.med_rent, d.prev.med_rent))],
    ['Median home value', d => usd(d.now.med_value) + moe(d, d.now.med_value_moe), d => sgn(chg(d.now.med_value, d.prev.med_value))],
    ['Renters 30%+ burdened', d => pct(d.now.rent_burden30) + moe(d, d.now.rent_burden30_moe), d => d.prev.rent_burden30 == null ? '' : sgn(d.now.rent_burden30 - d.prev.rent_burden30).replace('%', ' pts')],
    ['Owners 30%+ burdened', d => pct(d.now.owner_burden30), null],
    ['Rental vacancy', d => pct(d.now.rental_vacancy), null],
    ['Homeowner vacancy', d => pct(d.now.owner_vacancy), null],
    ['"Other" vacant, % of units', d => pct(d.now.other_vacant_share), null],
    ['Poverty rate', d => pct(d.now.poverty), null],
    ['Crowded renter HHs', d => pct(d.now.crowded_renter), null]];
  let h = `<thead><tr><th>Place</th>${cols.map(c => `<th class="n">${c[0]}</th>`).join('')}</tr></thead><tbody>`;
  ORDER.forEach(id => { const d = D.demand[id];
    h += `<tr${isHL(id) ? ' class="hl"' : ''}><td><b>${esc(d.name)}</b></td>` + cols.map(c => `<td class="n">${c[1](d)}${c[2] ? `<br><span class="m">${c[2](d)}</span>` : ''}</td>`).join('') + '</tr>'; });
  $('#tb-compare').innerHTML = h + '</tbody>';
}

/* ---------- Methods ---------- */
function drawMethods() {
  const src = Object.values(D.sources).map(s => `<li>${esc(s)}</li>`).join('');
  const notes = (D.notes || []).map(n => `<li>${esc(n)}</li>`).join('');
  $('#methods-body').innerHTML = `
  <div><h4>Sources</h4><ul>${src}</ul></div>
  <div><h4>Geography</h4>${esc(G[FOCUS].name)} is the focus${HOME && HOME !== FOCUS ? `, inside ${esc(G[HOME].name)}` : ''}. The comparison region is ${esc(ORDER.filter(id => !isHL(id) && id !== STATE && id !== NATION).map(id => G[id].name).join(', '))}. BLS metro series use metropolitan statistical areas, which can include counties outside this region. The Producer Price Index is national only.</div>
  <div><h4>ACS estimates</h4>Snapshot figures use 5-year estimates so cities and counties are compared on the same basis; ${esc(D.acs.latest5 - 4)}–${esc(D.acs.latest5)} is compared with ${esc(D.acs.prior5 - 4)}–${esc(D.acs.prior5)}, which do not overlap. Margins of error are at 90% confidence; margins for derived shares use the Census Bureau's approximation for proportions. Cost burden excludes households for which it is not computed. The 1-year trend covers only places of 65,000 or more and has no 2020 release.</div>
  <div><h4>Construction economy</h4>PPI indexes are rebased to January 2020 = 100. QCEW figures are private-ownership annual averages. The housing wage is the 2-bedroom Fair Market Rent × 12 ÷ 30% ÷ 2,080 hours, compared with the OEWS median hourly wage for the matching metro.</div>
  <div><h4>Assisted housing</h4>Project-based counts are assisted units in HUD's multifamily portfolio; 202/811 includes PRAC and 811 PRA properties and the rest are Section 8 contracts. Public housing units are ACC units by development. Voucher counts sum HUD's tract-level data, which suppresses tracts with fewer than 11 vouchers, so totals are minimums (PHA-reported vouchers appear in the tooltip). LIHTC duplicates (same project name and city) are merged; LIHTC is shown separately because tax-credit units often carry other assistance.</div>
  ${notes ? `<div><h4>Notes for this edition</h4><ul>${notes}</ul></div>` : ''}`;
}

/* ---------- boot ---------- */
function drawAll() {
  drawTrend(); drawTenure(); drawPyr(); drawBurden(); drawRace();
  stack100($('#ch-yb'), $('#leg-yb'), 'year_built', ['Before 1940', '1940–59', '1960–79', '1980–99', '2000 or later'], ['var(--seq-hi)', 'var(--seq-mid)', 'var(--seq-lo)', 'var(--seq-pale)', 'var(--s2)']);
  stack100($('#ch-st'), $('#leg-st'), 'structure', ['Single-family detached', 'Single-family attached', '2–4 units', '5–19 units', '20+ units', 'Mobile home / other'], ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s7)', 'var(--bench)']);
  drawCostWage(); drawPPI(); drawQcew(); drawQwage(); drawHwage(); drawOews(); drawLabor();
  drawHud(); drawExp(); drawLihtc(); drawMap(); drawPha(); drawMf(); drawCompare(); drawMethods();
}
drawAll();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { drawTrend(); drawCostWage(); drawQcew(); }, 150); });
const links = [...document.querySelectorAll('nav.sect a')];
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), {rootMargin: '-45% 0px -50% 0px'});
document.querySelectorAll('section.part').forEach(s => io.observe(s));
