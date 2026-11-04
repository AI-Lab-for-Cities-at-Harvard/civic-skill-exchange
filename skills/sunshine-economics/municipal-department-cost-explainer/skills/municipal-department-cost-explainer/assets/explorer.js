/* Reviewed data is embedded by render_explorer.py. No network or storage access. */
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('budget-data').textContent);
  const byId = id => document.getElementById(id);
  const dollars = value => value === null ? 'Unknown' : new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(value);
  const names = {
    headline: 'Starting figure', component: 'Already included',
    allocation_out: 'Reverse allocation out', addition: 'Add distinct expense',
    duplicate: 'Remove verified duplicate', revenue: 'Funding only',
    transfer: 'Financing only', excluded: 'Excluded', unresolved: 'Unresolved'
  };
  let current;
  function node(tag, value, className) {
    const el = document.createElement(tag);
    if (value !== undefined) el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function append(parent, ...children) { parent.append(...children); return parent; }
  function setText(id, value) { byId(id).textContent = value; }
  function adjustments(c) {
    return c.rows.filter(r => ['allocation_out', 'addition', 'duplicate'].includes(r.treatment))
      .map(r => ({...r, delta: r.treatment === 'addition' ? r.amount : -r.amount}));
  }
  function total(c) {
    return adjustments(c).reduce((sum, r) => sum + r.delta,
      c.rows.find(r => r.treatment === 'headline').amount);
  }
  function sourceLink(c, row) {
    const source = c.sources.find(s => s.id === row.sourceId);
    const label = `${row.sourceId} · ${row.location} · ${row.column}`;
    if (!source.url) return node('small', label);
    const link = node('a', label);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }
  function metric(label, value, note, emphasis = false) {
    return append(node('div', undefined, `metric${emphasis ? ' emphasis' : ''}`),
      node('span', label), node('strong', value), node('div', note, 'small'));
  }
  function bridgeRow(label, value, max, className) {
    const track = node('div', undefined, 'bridge-track');
    track.setAttribute('aria-hidden', 'true');
    const fill = node('div', undefined, `bridge-fill ${className}`);
    fill.style.width = `${max ? Math.abs(value) / max * 100 : 0}%`;
    track.append(fill);
    return append(node('div', undefined, 'bridge-row'), node('span', label), track,
      node('strong', dollars(value)));
  }
  function render(c) {
    current = c;
    const headline = c.rows.find(r => r.treatment === 'headline');
    const result = total(c);
    setText('headline-heading', `${c.city} · ${c.department}`);
    setText('period', `${c.period} · ${c.status.charAt(0).toUpperCase() + c.status.slice(1)} budget${c.synthetic ? ' · Fictional learning case' : ' · Fixed source snapshot'}`);
    setText('headline-label', c.headlineLabel);
    setText('headline-value', dollars(headline.amount));
    const headlineScale = Math.max(Math.abs(headline.amount), Math.abs(result));
    byId('headline-bar').style.width = `${headlineScale ? Math.abs(headline.amount) / headlineScale * 100 : 0}%`;
    setText('scope', `${c.scope} Fiscal dates: ${c.startDate} to ${c.endDate}. Basis: ${c.basis}. USD whole dollars.`);
    setText('summary', c.summary);
    byId('metrics').replaceChildren(
      metric(c.headlineLabel, dollars(headline.amount), 'Reported in the source'),
      metric(c.resultLabel, dollars(result), 'Calculated for the stated scope only', true),
      metric('Full-cost coverage', 'Not established', 'Review the missing evidence below')
    );
    const changes = adjustments(c);
    const scale = Math.max(Math.abs(headline.amount), Math.abs(result), ...changes.map(r => Math.abs(r.delta)));
    const bridge = byId('bridge');
    bridge.replaceChildren(bridgeRow('Reported starting figure', headline.amount, scale, ''));
    for (const change of changes) bridge.append(bridgeRow(names[change.treatment] + ': ' + change.label, change.delta, scale, 'adjustment'));
    bridge.append(bridgeRow(c.resultLabel, result, scale, 'total'));
    setText('equation', dollars(headline.amount) + changes.map(r => `${r.delta < 0 ? ' − ' : ' + '}${dollars(Math.abs(r.delta))}`).join('') + ' = ' + dollars(result));
    const ledger = byId('ledger');
    ledger.replaceChildren();
    for (const row of c.rows) {
      const item = append(node('td'), node('strong', row.label), node('small', row.fund));
      const treatment = node('span', names[row.treatment], 'badge' + (row.treatment === 'unresolved' ? ' unresolved' : ''));
      const reason = append(node('td'), node('div', row.reason), sourceLink(c, row));
      if (!row.verified) reason.append(node('small', 'Extraction / attribution not verified; excluded from calculations.'));
      ledger.append(append(node('tr'), item, node('td', dollars(row.amount)), append(node('td'), treatment), reason));
    }
    const funding = byId('funding');
    funding.replaceChildren();
    const fundingRows = c.rows.filter(r => ['revenue', 'transfer'].includes(r.treatment));
    if (!fundingRows.length) funding.append(node('p', 'These records do not establish a complete funding breakdown. Fund names and allocations are not a verified revenue mix. No funding pie chart or net funding estimate is shown.'));
    for (const row of fundingRows) {
      funding.append(append(node('div', undefined, 'funding-row'), node('strong', dollars(row.amount)),
        node('div', row.label), node('small', `${names[row.treatment]}. ${row.reason}`), sourceLink(c, row)));
    }
    if (c.netFunding) {
      const revenue = c.netFunding.revenueIds.reduce((sum, id) => sum + c.rows.find(r => r.id === id).amount, 0);
      funding.append(append(node('div', undefined, 'check'), node('strong', `${c.netFunding.label}: ${dollars(result - revenue)}`),
        node('p', `${dollars(result)} − ${dollars(revenue)} = ${dollars(result - revenue)}. ${c.netFunding.reason}`)));
    } else if (fundingRows.length) funding.append(node('p', 'No net funding calculation: the records do not establish eligible offsets for this cost scope.'));
    const checks = byId('checks');
    checks.replaceChildren();
    for (const check of c.checks || []) {
      const calculated = check.rowIds.reduce((sum, id) => sum + c.rows.find(r => r.id === id).amount, 0);
      const difference = calculated - check.reported;
      checks.append(append(node('div', undefined, `check${difference ? ' discrepancy' : ''}`),
        node('strong', `${difference ? 'Discrepancy' : 'Arithmetic matches'} · ${check.label}`),
        node('p', `Components: ${dollars(calculated)}. Reported: ${dollars(check.reported)}. Difference (components minus reported): ${dollars(difference)}. ${check.location}`)));
    }
    checks.append(node('p', 'Arithmetic agreement is a separate check from evidence coverage. Figures may reconcile while costs elsewhere remain unknown.'));
    byId('limits').replaceChildren(...c.limits.map(item => node('li', item)));
    byId('questions').replaceChildren(...c.questions.map(item => node('li', item)));
    setText('provenance', `Snapshot: ${c.snapshotDate}. ${c.provenance}`);
    byId('sources').replaceChildren(...c.sources.map(source => {
      const li = node('li', `${source.id} · ${source.publisher}. `);
      if (source.url) {
        const link = node('a', source.title);
        link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        li.append(link);
      } else li.append(node('span', source.title + ' — synthetic; no municipal source.'));
      return li;
    }));
    setText('selection-status', `Selected ${c.city}, ${c.department}, ${c.period}. Activate the reported budget to open its evidence.`);
  }
  function openDetail(open, focus = false) {
    byId('detail').hidden = !open;
    byId('headline').setAttribute('aria-expanded', String(open));
    setText('headline-action', open ? 'Close the cost and funding detail ↑' : 'Open the cost and funding detail ↓');
    if (open && focus) byId('detail-heading').focus();
  }
  function csvCell(value, numeric = false) {
    let valueText = value === null || value === undefined ? '' : String(value);
    // Spreadsheet programs can execute formula-like text even inside quotes.
    if (!numeric && /^[\s]*[=+\-@\t\r\n]/.test(valueText)) valueText = "'" + valueText;
    return '"' + valueText.replace(/"/g, '""') + '"';
  }
  function csv(c) {
    const header = ['city', 'department', 'period', 'status', 'basis', 'scope', 'currency', 'unit', 'snapshot', 'synthetic',
      'item_id', 'item', 'fund', 'reported_amount', 'treatment', 'reason', 'verified', 'source_id', 'publisher', 'source_title', 'source_url', 'location', 'column', 'limitations'];
    const rows = c.rows.map(row => {
      const source = c.sources.find(s => s.id === row.sourceId);
      return [c.city, c.department, c.period, c.status, c.basis, c.scope, c.currency, c.unit, c.snapshotDate, c.synthetic,
        row.id, row.label, row.fund, row.amount, row.treatment, row.reason, row.verified, source.id, source.publisher,
        source.title, source.url, row.location, row.column, c.limits.join(' | ')];
    });
    return '\uFEFF' + [header.map(v => csvCell(v)).join(','), ...rows.map(row => row.map((v, i) => csvCell(v, i === 13)).join(','))].join('\r\n');
  }
  const select = byId('case-select');
  for (const c of data.cases) { const option = node('option', `${c.city} — ${c.department} · ${c.period}`); option.value = c.id; select.append(option); }
  select.addEventListener('change', () => { render(data.cases.find(c => c.id === select.value)); openDetail(false); });
  byId('headline').addEventListener('click', () => openDetail(byId('detail').hidden, byId('detail').hidden));
  byId('skip-details').addEventListener('click', event => { event.preventDefault(); openDetail(true, true); });
  byId('download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([csv(current)], {type: 'text/csv;charset=utf-8'}));
    const link = node('a'); link.href = url;
    link.download = 'budget-evidence-' + current.id.replace(/[^a-zA-Z0-9_-]/g, '-') + '.csv';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  byId('print').addEventListener('click', () => window.print());
  render(data.cases[0]);
})();
