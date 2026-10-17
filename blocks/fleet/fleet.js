/*
 * fleet: the Fleet dashboard. Operators only: the data comes from /api/fleet/* on the
 * operators' address (mev-fleet-site, GitHub sign-in). This repository and its pages hold no
 * fleet data.
 * Authored (all optional): rows of two cells, a label and a value.
 *   Sign-in address | a link to the operators' address
 *   (shown where the API is absent, such as on aem.live)
 * Text only: API values become text nodes, never HTML.
 */

const API = '/api/fleet';

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
  });
  e.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== ''));
  return e;
}

/* label -> the cell, from authored two-cell rows */
function authored(block) {
  const out = {};
  [...block.children].forEach((row) => {
    const [label, value] = row.children;
    if (label && value) out[label.textContent.trim().toLowerCase()] = value;
  });
  return out;
}

const n = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : '–');
const text = (v) => (v === null || v === undefined || v === '' ? '–' : String(v));

function when(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '–';
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/* Only a plain same-site path goes back to the sign-in (the Worker checks it again). */
function returnPath() {
  const p = window.location.pathname;
  return /^\/(?![/\\])[A-Za-z0-9\-._~/]*$/.test(p) ? p : '/fleet';
}

async function getJson(path) {
  const resp = await fetch(`${API}/${path}`, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  let body = null;
  if ((resp.headers.get('content-type') || '').includes('application/json')) {
    body = await resp.json().catch(() => null);
  }
  return { status: resp.status, body };
}

function table(caption, columns, rows, cellFor) {
  const head = el('tr', null, columns.map((c) => el('th', { scope: 'col' }, c.label)));
  const body = rows.map((row) => el('tr', null, columns.map((c) => {
    const value = cellFor(row, c.key);
    return el('td', c.num ? { class: 'fleet-num' } : null, value);
  })));
  const scroll = el(
    'div',
    {
      class: 'fleet-scroll', tabindex: '0', role: 'region', 'aria-label': caption,
    },
    el('table', null, el('thead', null, head), el('tbody', null, body)),
  );
  return el('section', { class: 'fleet-section' }, el('h3', null, caption), scroll);
}

function badge(kind, value) {
  if (!value) return '–';
  return el('span', { class: `fleet-badge fleet-${kind}-${String(value).replace(/[^a-z-]/g, '')}` }, value);
}

function message(block, lines) {
  block.append(el('div', { class: 'fleet-message', role: 'status' }, lines.map((l) => el('p', null, l))));
}

function render(block, data, me) {
  const t = data.totals || {};
  const rule = data.rule || {};
  const who = me && me.login
    ? el(
      'p',
      { class: 'fleet-who' },
      'Signed in as ',
      el('strong', null, me.login),
      ' · ',
      el('a', { href: '/auth/logout' }, 'Sign out'),
    )
    : null;

  const stats = el('dl', { class: 'fleet-stats' }, [
    ['Tenants', n(t.tenants)], ['Instances', n(t.instances)], ['Digests', n(t.digests)],
    ['Weeks', n(t.weeks)], ['Last digest', when(t.lastReceived)],
  ].map(([k, v]) => el('div', null, el('dt', null, k), el('dd', null, v))));

  const note = el(
    'p',
    { class: 'fleet-note' },
    `Findings come from ${text(rule.findingsFrom)}. A finding is publishable to the whole fleet only when at least `
      + `${n(rule.kInstances)} instances in ${n(rule.kTenants)} tenants show it.`,
  );

  const findings = table('Findings', [
    { key: 'id', label: 'Finding' }, { key: 'recipe', label: 'Recipe' },
    { key: 'severity', label: 'Severity' }, { key: 'alert', label: 'Alert' },
    { key: 'instances', label: 'Instances', num: true }, { key: 'tenants', label: 'Tenants', num: true },
    { key: 'subjects', label: 'Subjects', num: true }, { key: 'publishable', label: 'Publishable' },
  ], data.findings || [], (row, key) => {
    if (key === 'id' || key === 'recipe') return el('code', null, text(row[key]));
    if (key === 'severity') return badge('severity', row.severity);
    if (key === 'alert') return badge('alert', row.alert);
    if (key === 'publishable') return row.publishable ? 'yes' : 'not yet';
    return typeof row[key] === 'number' ? n(row[key]) : text(row[key]);
  });

  const tenants = table('Tenants', [
    { key: 'tenant', label: 'Tenant' }, { key: 'estate', label: 'Estate' },
    { key: 'instances', label: 'Instances', num: true }, { key: 'digests', label: 'Digests', num: true },
    { key: 'recipes', label: 'Recipes', num: true }, { key: 'weeks', label: 'Weeks' },
    { key: 'lastReceived', label: 'Last digest' },
  ], data.tenants || [], (row, key) => {
    if (key === 'tenant') return el('code', null, text(row.tenant));
    if (key === 'weeks') return `${text(row.firstWeek)} to ${text(row.lastWeek)}`;
    if (key === 'lastReceived') return when(row.lastReceived);
    return typeof row[key] === 'number' ? n(row[key]) : text(row[key]);
  });

  const weeks = table('Weeks', [
    { key: 'week', label: 'ISO week' }, { key: 'instances', label: 'Instances', num: true },
    { key: 'digests', label: 'Digests', num: true },
  ], data.weeks || [], (row, key) => (key === 'week' ? text(row.week) : n(row[key])));

  const recipes = table('Recipes', [
    { key: 'recipe', label: 'Recipe' }, { key: 'instances', label: 'Instances', num: true },
    { key: 'digests', label: 'Digests', num: true }, { key: 'lastWeek', label: 'Last week' },
  ], data.recipes || [], (row, key) => {
    if (key === 'recipe') return el('code', null, text(row.recipe));
    if (key === 'lastWeek') return text(row.lastWeek);
    return n(row[key]);
  });

  const hidden = data.hiddenTenants
    ? ` ${n(data.hiddenTenants)} test tenant${data.hiddenTenants === 1 ? ' is' : 's are'} hidden.`
    : '';
  const footer = el('p', { class: 'fleet-generated' }, `Generated ${when(data.generatedAt)}.${hidden}`);

  block.append(who, stats, note, findings, tenants, weeks, recipes, footer);
}

export default async function decorate(block) {
  const cells = authored(block);
  const signInCell = cells['sign-in address'];
  const link = signInCell && signInCell.querySelector('a');
  const signInLink = link && link.protocol === 'https:' ? link : null; /* never javascript: or http: */
  block.textContent = '';
  const loading = el('p', { class: 'fleet-loading', role: 'status' }, 'Loading the fleet…');
  block.append(loading);

  let overview;
  try {
    overview = await getJson('overview');
  } catch (e) {
    overview = { status: 0, body: null };
  }
  loading.remove();

  if (overview.status === 200 && overview.body) {
    const me = await getJson('me').then((r) => (r.status === 200 ? r.body : null)).catch(() => null);
    render(block, overview.body, me);
    return;
  }
  if (overview.status === 401) {
    const login = el('a', { class: 'button', href: `/auth/login?return=${encodeURIComponent(returnPath())}` }, 'Sign in with GitHub');
    message(block, ['The Fleet dashboard is for fleet operators. Sign in with an allowed GitHub account.', login]);
    return;
  }
  if (overview.status === 503) {
    message(block, ['The fleet service is not configured yet.']);
    return;
  }
  /* No API here (for example on aem.live): the dashboard opens only at the operators' address. */
  const lines = ['The Fleet dashboard opens only at the operators\' address, after a GitHub sign-in.'];
  if (signInLink) {
    lines.push(el('a', { class: 'button', href: signInLink.href }, 'Open the Fleet dashboard'));
  }
  message(block, lines);
}
