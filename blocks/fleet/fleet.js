/*
 * fleet: the fleet seismogram. Direction lock: blocks/fleet/DIRECTION.md.
 * Law: time runs left to right; one trace is one server; red belongs to one finding at a time.
 * Operators only: the data comes from /api/fleet/* on the operators' address (mev-fleet-site,
 * GitHub sign-in). This repository and its pages hold no fleet data.
 * Authored (optional) rows of two cells: Sign-in address | a link to the operators' address (shown
 * where the API is absent, such as on aem.live).
 * Text only: API values become text nodes, never HTML.
 */

const API = '/api/fleet';
const GATE = { servers: 10, tenants: 5 }; /* the Worker's publication rule (FleetRead) */
const WEIGHT = {
  landmine: 4, stink: 3, policy: 2, info: 1,
};
const GLYPH = {
  landmine: '●', stink: '◐', policy: '○', info: '·',
};
const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#20201c';
const RED = '#d23a1e';

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
  });
  e.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== ''));
  return e;
}

function svg(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

const num = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : '–');
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* label -> the cell, from authored two-cell rows */
function authored(block) {
  const out = {};
  [...block.children].forEach((row) => {
    const [label, value] = row.children;
    if (label && value) out[label.textContent.trim().toLowerCase()] = value;
  });
  return out;
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

function message(block, lines) {
  block.append(el('div', { class: 'fleet-message', role: 'status' }, lines.map((l) => el('p', null, l))));
}

/* ---------- the model: each server's findings per week, and each finding's spread ---------- */

function model(t) {
  const W = t.weeks.length;
  const F = t.findings;
  const spread = F.map(() => new Array(W).fill(0));
  const tenantsNow = F.map(() => new Set());
  let maxLoad = 1;
  const servers = t.servers.map((s) => {
    const at = new Array(W).fill(null);
    const cur = new Set();
    let e = 0;
    for (let w = s.first; w < W; w += 1) {
      while (e < s.events.length && s.events[e][0] === w) {
        s.events[e][1].forEach((fi) => cur.add(fi));
        s.events[e][2].forEach((fi) => cur.delete(fi));
        e += 1;
      }
      at[w] = new Set(cur);
      cur.forEach((fi) => {
        spread[fi][w] += 1;
        if (w === W - 1) tenantsNow[fi].add(s.tenant);
      });
    }
    s.load.forEach((l) => { if (typeof l === 'number') maxLoad = Math.max(maxLoad, l); });
    /* a change is a tremor: the weight of what appeared and of what cleared, by week */
    const jolts = new Map();
    s.events.forEach(([w, added, removed]) => {
      if (w === s.first) return;
      const weigh = (list) => list.reduce((sum, fi) => sum + (WEIGHT[F[fi].severity] || 1), 0);
      jolts.set(w, { up: weigh(added), down: weigh(removed) });
    });
    return { ...s, at, jolts };
  });
  const last = W - 1;
  const findings = F.map((f, i) => ({
    ...f,
    i,
    spread: spread[i],
    now: spread[i][last] || 0,
    tenants: tenantsNow[i].size,
    grew: (spread[i][last] || 0) - (spread[i][Math.max(0, last - 4)] || 0),
    ever: spread[i].some((n) => n > 0),
  })).filter((f) => f.ever);
  const rank = [...findings].sort((a, b) => b.grew - a.grew
    || (WEIGHT[b.severity] || 1) - (WEIGHT[a.severity] || 1) || b.now - a.now);
  return {
    t, W, servers, findings, maxLoad, red: rank.length ? rank[0].i : null,
  };
}

/* ---------- the drum: canvas for the mass, SVG for the one ---------- */

function geometry(M, width) {
  const n = Math.max(1, M.servers.length);
  const height = n === 1 ? 240 : Math.round(Math.min(640, Math.max(320, 140 + n * 0.85)));
  const top = 24;
  const bottom = 18;
  const mx = Math.max(20, Math.round(width * 0.025));
  const room = height - top - bottom;
  const lift = n === 1 ? room * 0.72 : Math.min(30, Math.max(10, (room / n) * 20));
  const step = n === 1 ? 0 : (room - lift) / (n - 1);
  const xOf = (w) => (M.W === 1 ? width / 2 : mx + (w / (M.W - 1)) * (width - 2 * mx));
  const yOf = (s, r, w) => {
    const base = top + lift + r * step;
    const load = s.load[w];
    return base - (typeof load === 'number' ? (load / M.maxLoad) * lift : 0);
  };
  return {
    width, height, xOf, yOf, n, lift,
  };
}

/* One week of one trace as cubic curves from week w-1 to week w. A week where findings appear
   overshoots upward, a week where they clear dips: a change is a tremor (see DIRECTION.md). */
function curves(M, G, s, r, w) {
  const x0 = G.xOf(w - 1);
  const y0 = G.yOf(s, r, w - 1);
  const x1 = G.xOf(w);
  const y1 = G.yOf(s, r, w);
  const j = s.jolts.get(w);
  const unit = G.lift / M.maxLoad;
  let swing = 0;
  if (j && j.up) swing = -Math.min(G.lift * 0.9, Math.max(2.5, j.up * unit * 1.6));
  else if (j && j.down) swing = Math.min(G.lift * 0.6, Math.max(2, j.down * unit * 1.1));
  if (!swing) {
    const mx = (x0 + x1) / 2;
    return { x0, y0, c: [[mx, y0, mx, y1, x1, y1]] };
  }
  const xm = x1 - (x1 - x0) * 0.32;
  const ym = (swing < 0 ? Math.min(y0, y1) : Math.max(y0, y1)) + swing;
  return {
    x0,
    y0,
    c: [
      [(x0 + xm) / 2, y0, (x0 + xm) / 2, ym, xm, ym],
      [(xm + x1) / 2, ym, (xm + x1) / 2, y1, x1, y1],
    ],
  };
}

function pathOf(M, G, s, r, from, to) {
  const f = (v) => v.toFixed(1);
  const parts = [];
  for (let w = Math.max(from, s.first); w <= to; w += 1) {
    if (!parts.length) parts.push(`M${f(G.xOf(w))},${f(G.yOf(s, r, w))}`);
    else curves(M, G, s, r, w).c.forEach((k) => parts.push(`C${k.map(f).join(' ')}`));
  }
  return parts.join(' ');
}

function paint(ctx, M, G, red) {
  const { n } = G;
  const inkAlpha = n === 1 ? 0.9 : Math.min(0.9, Math.max(0.18, 5.6 / Math.sqrt(n)));
  let inkWidth = 0.6;
  if (n === 1) inkWidth = 2;
  else if (n < 60) inkWidth = 1.1;
  ctx.clearRect(0, 0, G.width, G.height);
  ctx.lineCap = 'round';
  const segment = (s, r, w) => {
    const k = curves(M, G, s, r, w);
    ctx.beginPath();
    ctx.moveTo(k.x0, k.y0);
    k.c.forEach((c) => ctx.bezierCurveTo(...c));
    ctx.stroke();
  };
  [false, true].forEach((hot) => {
    ctx.strokeStyle = hot ? RED : INK;
    ctx.globalAlpha = hot ? 0.95 : inkAlpha;
    ctx.lineWidth = hot ? inkWidth + 0.4 : inkWidth;
    M.servers.forEach((s, r) => {
      if (M.W === 1 || s.first === M.W - 1) {
        const isHot = red !== null && s.at[M.W - 1] && s.at[M.W - 1].has(red);
        if (isHot !== hot) return;
        ctx.beginPath();
        ctx.arc(G.xOf(M.W - 1), G.yOf(s, r, M.W - 1), Math.max(1.2, inkWidth), 0, 2 * Math.PI);
        ctx.stroke();
        return;
      }
      for (let w = s.first + 1; w < M.W; w += 1) {
        const isHot = red !== null && s.at[w] && s.at[w].has(red);
        if (isHot === hot) segment(s, r, w);
      }
    });
  });
  ctx.globalAlpha = 1;
}

function drum(M, state, onFocus) {
  const wrap = el('div', { class: 'fleet-drum' });
  const canvas = el('canvas', { class: 'fleet-ink', 'aria-hidden': 'true' });
  const overlay = svg('svg', { class: 'fleet-one', 'aria-hidden': 'true' });
  const one = svg('path', { class: 'fleet-one-trace' });
  const oneRed = svg('path', { class: 'fleet-one-red' });
  overlay.append(one, oneRed);
  const tip = el('div', { class: 'fleet-tip', hidden: true });
  const axis = el('div', { class: 'fleet-axis', 'aria-hidden': 'true' });
  const label = el('p', { class: 'fleet-sr' });
  wrap.append(canvas, overlay, tip);
  let G = null;
  let drawnOnce = false;

  function describe() {
    const f = M.findings.find((x) => x.i === state.red);
    label.textContent = `Seismogram of ${plural(M.servers.length, 'server', 'servers')} over `
      + `${plural(M.W, 'week', 'weeks')}.${f ? ` Red: ${f.id}, on ${plural(f.now, 'server', 'servers')} now.` : ''}`;
  }

  function draw(animate) {
    const width = wrap.clientWidth;
    if (!width) return;
    G = geometry(M, width);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(G.height * dpr);
    canvas.style.height = `${G.height}px`;
    overlay.setAttribute('viewBox', `0 0 ${width} ${G.height}`);
    overlay.style.height = `${G.height}px`;
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext('2d');
    octx.scale(dpr, dpr);
    paint(octx, M, G, state.red);
    const ctx = canvas.getContext('2d');
    if (!animate || reduceMotion()) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0);
      return;
    }
    /* the pen writes once, left to right */
    const start = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - start) / 1200);
      const eased = 1 - (1 - k) ** 3;
      const sw = Math.max(1, Math.round(canvas.width * eased));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0, sw, canvas.height, 0, 0, sw, canvas.height);
      if (k < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function weeksAxis() {
    axis.textContent = '';
    const every = Math.max(1, Math.ceil(M.W / 8));
    M.t.weeks.forEach((wk, w) => {
      if (w % every && w !== M.W - 1) return;
      if (w !== M.W - 1 && M.W - 1 - w < every / 2 && w !== 0) return;
      const left = M.W === 1 ? 50 : (w / (M.W - 1)) * 100;
      axis.append(el('span', { style: `left: ${left.toFixed(2)}%` }, wk));
    });
  }

  function focus(clientX, clientY) {
    if (!G) return;
    const box = wrap.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    let w = M.W === 1 ? 0 : Math.round(((x - G.xOf(0)) / (G.xOf(M.W - 1) - G.xOf(0))) * (M.W - 1));
    w = Math.max(0, Math.min(M.W - 1, w));
    let best = null;
    M.servers.forEach((s, r) => {
      if (s.load[w] === null || s.load[w] === undefined) return;
      const d = Math.abs(G.yOf(s, r, w) - y);
      if (!best || d < best.d) best = { s, r, d };
    });
    if (!best || best.d > 24) {
      onFocus(null);
      return;
    }
    const { s, r } = best;
    one.setAttribute('d', pathOf(M, G, s, r, s.first, M.W - 1));
    let redPath = '';
    for (let k = s.first + 1; k < M.W; k += 1) {
      if (state.red !== null && s.at[k] && s.at[k].has(state.red)) {
        redPath += ` ${pathOf(M, G, s, r, k - 1, k)}`;
      }
    }
    oneRed.setAttribute('d', redPath.trim());
    overlay.classList.add('is-on');
    const present = s.at[w] ? s.at[w].size : 0;
    tip.textContent = `${s.key} · ${s.tenant} · ${s.estate || '–'} ${s.aem || ''} · ${M.t.weeks[w]} · `
      + `${plural(present, 'finding', 'findings')}`;
    tip.hidden = false;
    tip.style.left = `${Math.min(Math.max(8, x + 14), G.width - 280)}px`;
    tip.style.top = `${Math.max(4, G.yOf(s, r, w) - 34)}px`;
    onFocus(s);
  }

  function blur() {
    overlay.classList.remove('is-on');
    tip.hidden = true;
    onFocus(null);
  }

  wrap.addEventListener('pointermove', (e) => focus(e.clientX, e.clientY));
  wrap.addEventListener('pointerleave', blur);

  const ro = new ResizeObserver(() => { if (drawnOnce) draw(false); });
  ro.observe(wrap);

  return {
    nodes: [wrap, axis, label],
    first() {
      weeksAxis();
      describe();
      draw(true);
      drawnOnce = true;
    },
    redraw() {
      describe();
      blur();
      draw(false);
    },
  };
}

/* ---------- the index: the legend is the controller ---------- */

function spark(values, max) {
  const w = 72;
  const h = 16;
  const s = svg('svg', {
    class: 'fleet-spark', viewBox: `0 0 ${w} ${h}`, width: w, height: h, 'aria-hidden': 'true',
  });
  const n = values.length;
  const pts = values.map((v, k) => `${n === 1 ? w / 2 : ((k / (n - 1)) * w).toFixed(1)},`
    + `${(h - 1 - (v / Math.max(1, max)) * (h - 2)).toFixed(1)}`);
  s.append(svg('polyline', { points: pts.join(' ') }));
  return s;
}

function gate(f) {
  if (f.now >= GATE.servers && f.tenants >= GATE.tenants) return 'published';
  return `${num(Math.min(f.now, GATE.servers))}/${GATE.servers} servers · `
    + `${num(Math.min(f.tenants, GATE.tenants))}/${GATE.tenants} tenants`;
}

function index(M, state, onPick) {
  const list = el('ol', { class: 'fleet-index' });
  const rows = [...M.findings].sort((a, b) => b.now - a.now
    || (WEIGHT[b.severity] || 1) - (WEIGHT[a.severity] || 1) || a.id.localeCompare(b.id));
  const buttons = rows.map((f) => {
    const b = el(
      'button',
      { type: 'button', class: 'fleet-row', 'aria-pressed': String(f.i === state.red) },
      el('span', { class: 'fleet-glyph', title: f.severity || 'no severity' }, GLYPH[f.severity] || '·'),
      el('span', { class: 'fleet-id' }, f.id),
      el('span', { class: 'fleet-recipe' }, f.recipe),
      spark(f.spread, Math.max(...f.spread)), /* own scale: the count gives the size */
      el('span', { class: 'fleet-now' }, f.now ? plural(f.now, 'server', 'servers') : 'cleared'),
      el('span', { class: 'fleet-gate' }, gate(f)),
    );
    b.addEventListener('click', () => onPick(f.i));
    list.append(el('li', f.now ? null : { class: 'is-cleared' }, b));
    return { b, f };
  });
  return {
    node: list,
    sync() { buttons.forEach(({ b, f }) => b.setAttribute('aria-pressed', String(f.i === state.red))); },
  };
}

/* ---------- the room ---------- */

function caption(M, red) {
  const f = M.findings.find((x) => x.i === red);
  if (!f) return el('p', { class: 'fleet-red' }, 'No finding on any server.');
  const grew = f.grew > 0 ? `, ${num(f.grew)} more than four weeks ago` : '';
  return el(
    'p',
    { class: 'fleet-red' },
    el('span', { class: 'fleet-rule', 'aria-hidden': 'true' }),
    el('strong', null, f.id),
    ` ${f.recipe} · ${f.severity || 'no severity'} · on ${plural(f.now, 'server', 'servers')} in `
      + `${plural(f.tenants, 'tenant', 'tenants')}${grew} · ${gate(f)}`,
  );
}

function readout(t, view, onView, me) {
  const tot = t.totals || {};
  const span = t.weeks.length ? `${t.weeks[0]} to ${t.weeks[t.weeks.length - 1]}` : '–';
  const switcher = el('div', { class: 'fleet-views', role: 'group', 'aria-label': 'View' }, [
    ['live', 'Live'], ['simulation', 'Simulated fleet'],
  ].map(([v, label]) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(v === view) }, label);
    b.addEventListener('click', () => onView(v));
    return b;
  }));
  const who = me && me.login
    ? el('span', { class: 'fleet-who' }, me.login, ' · ', el('a', { href: '/auth/logout' }, 'sign out'))
    : null;
  return el(
    'div',
    { class: 'fleet-readout' },
    el('span', { class: 'fleet-tag' }, view === 'simulation' ? 'SIMULATION' : 'LIVE'),
    el('span', { class: 'fleet-facts' }, `${plural(tot.servers || 0, 'server', 'servers')} · `
      + `${plural(tot.tenants || 0, 'tenant', 'tenants')} · ${plural(t.weeks.length, 'week', 'weeks')} (${span}) · `
      + `${plural(tot.digests || 0, 'digest', 'digests')}`),
    switcher,
    who,
  );
}

function renderRoom(block, data, me, view, onView) {
  block.textContent = '';
  const t = data;
  if (!t.servers || !t.servers.length) {
    block.append(readout(t, view, onView, me));
    message(block, ['No server has sent a digest yet in this view.']);
    return;
  }
  const M = model(t);
  const state = { red: M.red };
  let cap = caption(M, state.red);
  const D = drum(M, state, () => {});
  let I = null;
  const pick = (i) => {
    state.red = i;
    const next = caption(M, state.red);
    cap.replaceWith(next);
    cap = next;
    I.sync();
    D.redraw();
  };
  I = index(M, state, pick);
  const note = t.note ? el('p', { class: 'fleet-note' }, t.note) : null;
  const footer = el('p', { class: 'fleet-generated' }, `Read ${t.generatedAt ? t.generatedAt.slice(0, 16).replace('T', ' ') : '–'} UTC. `
    + 'Each trace is one server. It rises with the weight of its findings (landmine 4, stink 3, policy 2, '
    + 'info 1), jolts up in a week when findings appear and dips when they clear. '
    + `A finding is published to the fleet at ${GATE.servers} servers in ${GATE.tenants} tenants.`);
  const parts = [readout(t, view, onView, me), note, cap, ...D.nodes, I.node, footer];
  block.append(...parts.filter(Boolean));
  D.first();
}

export default async function decorate(block) {
  const cells = authored(block);
  const signInCell = cells['sign-in address'];
  const link = signInCell && signInCell.querySelector('a');
  const signInLink = link && link.protocol === 'https:' ? link : null; /* never javascript: or http: */
  block.textContent = '';
  block.append(el('p', { class: 'fleet-loading', role: 'status' }, 'Reading the fleet…'));

  const cache = {};
  const load = async (view) => {
    if (!cache[view]) cache[view] = getJson(`traces?view=${view}`).catch(() => ({ status: 0, body: null }));
    return cache[view];
  };
  let view = window.location.hash === '#simulation' ? 'simulation' : 'live';
  const first = await load(view);

  if (first.status === 200 && first.body) {
    const me = await getJson('me').then((r) => (r.status === 200 ? r.body : null)).catch(() => null);
    const show = async (v) => {
      const r = await load(v);
      if (r.status !== 200 || !r.body) return;
      view = v;
      window.history.replaceState(null, '', v === 'simulation' ? '#simulation' : window.location.pathname);
      renderRoom(block, r.body, me, view, show);
    };
    renderRoom(block, first.body, me, view, show);
    return;
  }
  block.textContent = '';
  if (first.status === 401) {
    const login = el('a', { class: 'button primary', href: `/auth/login?return=${encodeURIComponent(returnPath())}` }, 'Sign in with GitHub');
    message(block, ['The Fleet dashboard is for fleet operators. Sign in with an allowed GitHub account.', login]);
    return;
  }
  if (first.status === 503) {
    message(block, ['The fleet service is not configured yet.']);
    return;
  }
  /* No API here (for example on aem.live): the dashboard opens only at the operators' address. */
  const lines = ['The Fleet dashboard opens only at the operators\' address, after a GitHub sign-in.'];
  if (signInLink) {
    lines.push(el('a', { class: 'button primary', href: signInLink.href }, 'Open the Fleet dashboard'));
  }
  message(block, lines);
}
