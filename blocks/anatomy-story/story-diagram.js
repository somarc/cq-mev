/* The story diagram (probe C), part 1: layers, lessons, a capture's path, a finding, compare. */
import {
  s, byId, plain, wrapWords,
} from './util.js';

/* Geometry, viewBox 600 x 640. */
export const FRAME = {
  x: 16, y: 24, w: 568, h: 540,
};
export const BANDS = {
  content: { y: 56, h: 56 },
  packages: { y: 118, h: 48 },
  sling: { y: 172, h: 90 },
  osgi: { y: 268, h: 136 },
  oak: { y: 410, h: 90 },
  runtime: { y: 506, h: 46 },
};
export const BX = 28;
export const BW = { wide: 320, narrow: 92, full: 404 };
export const COL = { x: 148, w: 180 };
export const RCOL = 344;

function head(parent, x, y, ang, cls) {
  const a = 6.5;
  const w = 3.4;
  const c = Math.cos(ang);
  const sn = Math.sin(ang);
  const bx = x - a * c;
  const by = y - a * sn;
  const d = `M${x},${y}L${(bx - w * sn).toFixed(1)},${(by + w * c).toFixed(1)}`
    + `L${(bx + w * sn).toFixed(1)},${(by - w * c).toFixed(1)}Z`;
  return s('path', { d, class: `head ${cls || ''}` }, parent);
}

export function wire(parent, pts, cls, noHead) {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join('');
  s('path', { d, class: 'hit' }, parent);
  const p = s('path', { d, class: `wire ${cls || ''}` }, parent);
  if (!noHead) {
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    head(parent, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), cls);
  }
  return p;
}

export function node(parent, o) {
  const subs = o.subs || [];
  const hh = o.h || (subs.length ? 18 + subs.length * 12 : 24);
  s('rect', {
    class: `shape st-${o.status || 'built'}`, x: o.x, y: o.y, width: o.w, height: hh, rx: 4,
  }, parent);
  s('text', { class: 'n-t', x: o.x + 8, y: o.y + 14 }, parent, o.title);
  subs.forEach((t, i) => s('text', { class: 'n-s', x: o.x + 8, y: o.y + 26 + i * 12 }, parent, t));
  return hh;
}

export function lines(parent, x, y, arr, cls, lh) {
  arr.forEach((t, i) => s('text', { class: cls, x, y: y + i * (lh || 13) }, parent, t));
}

export function chip(parent, x, y, label, cls) {
  const t = s('text', { class: `chip-t ${cls || ''}`, x: x + 6, y: y + 13 }, parent, label);
  const w = Math.ceil(t.getComputedTextLength()) + 12;
  const r = s('rect', {
    class: `chip-r ${cls || ''}`, x, y, width: w, height: 19, rx: 3,
  }, null);
  parent.insertBefore(r, t);
  return w;
}

/* Layers, areas and the four lessons. */
function buildStrata(svg, F, R, L, bandRects) {
  const areaEnds = {};
  const layerById = {};
  F.layers.items.forEach((l) => { layerById[l.id] = l; });
  const fr = L('frame', 'One AEM author');
  s('rect', {
    class: 'frame', x: FRAME.x, y: FRAME.y, width: FRAME.w, height: FRAME.h, rx: 10,
  }, fr);
  s('text', { class: 'frame-t', x: 30, y: 44 }, fr, 'ONE AEM AUTHOR');

  F.layers.stackOrder.forEach((id) => {
    const b = BANDS[id];
    const l = layerById[id];
    if (!b || !l) return;
    const areas = F.aemAreas.filter((a) => a.layer === id);
    const g = L(`band:${id}`, `${l.label} layer`);
    bandRects[id] = s('rect', {
      class: 'band-bg', x: BX, y: b.y, width: BW.wide, height: b.h, rx: 4,
    }, g);
    s('text', { class: 'band-t', x: 38, y: b.y + 17 }, g, l.label);
    const grp = l.consoleGroup ? ` (console group “${l.consoleGroup}”)` : '';
    R.focusable(g, {
      title: `${l.label} layer${grp}`,
      lines: [`${areas.length} ${areas.length === 1 ? 'area' : 'areas'} that cq-mev reads: `
        + `${areas.map((a) => a.label).join(', ')}.`],
      evidence: 'data/cq-mev-facts.json layers, aemAreas',
    });
  });
  const subs = L('bandsub', 'Layer group names');
  F.layers.stackOrder.forEach((id) => {
    const l = layerById[id];
    if (!BANDS[id] || !l) return;
    s('text', { class: 'band-s', x: 38, y: BANDS[id].y + 30 }, subs, l.consoleGroup || 'runtime');
  });

  F.layers.stackOrder.forEach((id) => {
    const b = BANDS[id];
    if (!b) return;
    F.aemAreas.filter((a) => a.layer === id).forEach((a, i) => {
      const g = L(`area:${a.id}`, a.label);
      const y = b.y + 15 + i * 12.6;
      const t = s('text', { class: 'area-t', x: 128, y }, g, a.label);
      areaEnds[a.id] = { x: 128 + t.getComputedTextLength(), y };
      const readers = F.recipes.filter((r) => (r.areas || []).includes(a.id)).map((r) => r.id);
      R.focusable(g, {
        title: a.label,
        lines: [`${a.detail}.`, `Read by: ${readers.join(', ') || 'the live pulse and run conditions'}.`],
        evidence: 'data/cq-mev-facts.json aemAreas, recipes[].areas',
      });
    });
  });

  // Lessons: title and text from facts.lessons, beside the area each one hides in.
  const placed = (F.lessons || []).filter((ls) => areaEnds[ls.area])
    .sort((p, q) => areaEnds[p.area].y - areaEnds[q.area].y);
  let bottom = 0;
  placed.forEach((ls) => {
    const ae = areaEnds[ls.area];
    const ty = Math.max(ae.y - 4, bottom + 24);
    const g = L(`lesson:${ls.id}`, ls.title);
    wire(g, [[ae.x + 6, ae.y - 3], [356, ae.y - 3], [362, ty - 4]], 'w-lesson', true);
    s('circle', {
      class: 'dot', cx: ae.x + 6, cy: ae.y - 3, r: 2.2,
    }, g);
    s('text', { class: 'lesson-t', x: 368, y: ty }, g, `${ls.title}.`);
    const ws = wrapWords(ls.text, 40);
    lines(g, 368, ty + 13, ws, 'lesson-s', 12);
    bottom = ty + 13 + (ws.length - 1) * 12;
    R.focusable(g, {
      title: `${ls.title}.`, lines: [ls.text], evidence: ls.source, proof: 'docs',
    });
  });
}

export const Y = {
  console: 40,
  routes: 88,
  access: 136,
  cond: 180,
  jobs: 226,
  recipe: 280,
  store: 334,
  catalogs: 388,
  runview: 442,
  diffs: 496,
};

/* A capture's life: one vertical path with two gates. */
function buildPipeline(F, R, L, arrFrom) {
  const cx = COL.x + COL.w / 2;
  const flow = ((F.flows || [])[0] || { steps: [] }).steps;
  const ev = (i) => (flow[i] && flow[i].evidence) || '';
  const isTest = (i) => /Test|#327/.test(ev(i));
  let prevKey = null;
  const arrow = (key, fromKey, pts, cls) => {
    const g = L(`arr:${key}`, `flow into ${key}`);
    g.setAttribute('aria-hidden', 'true');
    wire(g, pts, cls);
    arrFrom[`arr:${key}`] = [fromKey, key];
  };
  const P = (key, y, title, sub, blockId, stepIx, arrowFromY) => {
    if (arrowFromY != null) {
      arrow(key, prevKey, [[cx, arrowFromY + 1], [cx, y - 1]], `w-spine${isTest(stepIx) ? '' : ' docs'}`);
    }
    prevKey = key;
    const g = L(key, title);
    node(g, {
      x: COL.x, y, w: COL.w, title, subs: [sub],
    });
    const b = byId(F.blocks, blockId) || { label: title };
    R.focusable(g, {
      title: b.label,
      lines: [b.summary || '', b.parts ? `Parts: ${b.parts.join(', ')}.` : ''].filter(Boolean),
      evidence: ev(stepIx),
      proof: /Test/.test(ev(stepIx)) ? 'test' : 'docs',
    });
    return g;
  };
  const gate = (key, y, label, fromY, g0) => {
    arrow(key, prevKey, [[cx, fromY + 1], [cx, y - 5]], 'w-spine');
    prevKey = key;
    const g = L(key, label);
    s('line', {
      class: 'gate-bar', x1: COL.x, y1: y, x2: COL.x + COL.w, y2: y,
    }, g);
    [COL.x, COL.x + COL.w].forEach((x) => s('line', {
      class: 'gate-post', x1: x, y1: y - 6, x2: x, y2: y + 6,
    }, g));
    s('text', { class: 'gate-t', x: RCOL, y: y + 4 }, g, label);
    R.focusable(g, {
      title: g0.label,
      lines: [g0.rule].concat(g0.answers || []),
      evidence: g0.evidence || (g0.classes || []).join(', '),
      proof: g0.evidence ? 'test' : 'docs',
    });
    return g;
  };

  P('p:console', Y.console, 'Console', '/adobe/mev/ui · Capture', 'console-ui', 0, null);
  P('p:routes', Y.routes, 'Native routes · API v1', '/adobe/mev/api/v1', 'routes', 1, Y.console + 30);
  const ga = byId(F.gates, 'access') || { label: 'Access gate', rule: '' };
  const gc = byId(F.gates, 'conditions') || { label: 'Run conditions', rule: '', states: [] };
  const gs = byId(F.gates, 'single-flight') || { label: 'One capture at a time', rule: '' };
  gate('g:access', Y.access, ga.label, Y.routes + 30, ga);
  const sa = L('stop:access', 'Access gate answers');
  (ga.answers || []).forEach((a, i) => {
    const m = /^(\d+ \S+)\s*(.*)$/.exec(a) || [a, a, ''];
    const t = s('text', { class: 'stop-t', x: RCOL, y: Y.access + 17 + i * 13 }, sa, m[1]);
    if (m[2]) {
      const note = m[2].replace(/[()]/g, '');
      s('text', {
        class: 'stop-n', x: RCOL + t.getComputedTextLength() + 5, y: Y.access + 17 + i * 13,
      }, sa, note);
    }
  });
  gate('g:conditions', Y.cond, gc.label, Y.access, gc);
  const sc = L('stop:conditions', 'Run condition answers');
  (gc.states || []).forEach((st, i) => {
    s('text', { class: 'stop-n', x: RCOL, y: Y.cond + 17 + i * 13 }, sc, st.state);
    const code = st.answer.split(';')[0];
    s('text', {
      class: /^\d/.test(code) ? 'stop-t' : 'stop-n', x: RCOL + 60, y: Y.cond + 17 + i * 13,
    }, sc, code);
  });
  const gpul = L('p:pulse', 'Live pulse');
  const bp = byId(F.blocks, 'pulse') || { label: 'Live pulse', summary: '' };
  node(gpul, {
    x: RCOL, y: 40, w: 168, title: bp.label, subs: [`${F.counts.pulseTiles} tiles, every 5 s`],
  });
  wire(gpul, [[RCOL, 62], [336, 62], [336, Y.cond], [COL.x + COL.w + 1, Y.cond]], 'w-read');
  R.focusable(gpul, {
    title: bp.label,
    lines: [bp.summary, 'Run conditions use the pulse readings.'],
    evidence: 'RunConditionsTest',
    proof: 'test',
  });
  arrow('p:jobs', 'g:conditions', [[cx, Y.cond + 1], [cx, Y.jobs - 1]], 'w-spine docs');
  P('p:jobs', Y.jobs, 'Job service', 'ordered queue, maxparallel 1', 'job-service', 3, null);
  const ss = L('stop:single', gs.label);
  wire(ss, [[COL.x + COL.w + 1, Y.jobs + 22], [RCOL - 4, Y.jobs + 33]], 'w-read', true);
  s('text', { class: 'gate-t', x: RCOL, y: Y.jobs + 36 }, ss, gs.label);
  s('text', { class: 'stop-t', x: RCOL, y: Y.jobs + 49 }, ss, (gs.answers || [''])[0]);
  R.focusable(ss, {
    title: gs.label,
    lines: [gs.rule].concat(gs.answers || []),
    evidence: (gs.classes || []).join(', '),
    proof: 'docs',
  });
  const rg = P('p:recipe', Y.recipe, 'Recipe (here: Oak)', 'reads within a fixed budget', 'recipes-oak', 4, Y.jobs + 30);
  R.INFO.get(rg).lines = F.recipes.filter((r) => r.layer === 'oak')
    .map((r) => `${r.id} never reads: ${plain(r.neverReads)}.`);
  const rr = L('p:read', 'The recipe reads Oak');
  wire(rr, [[BX + BW.narrow + 1, 432], [134, 432], [134, Y.recipe + 15], [COL.x - 1, Y.recipe + 15]], 'w-read');
  P('p:store', Y.store, 'Sealed store', 'snapshot + SHA-256, one save', 'store', 5, Y.recipe + 30);
  const wj = byId(F.writes, 'w-jobs') || { to: '', what: '', who: '' };
  const ws = L('p:write', `The store writes ${wj.to}`);
  chip(ws, 362, Y.store + 5, wj.to, 'c-write');
  wire(ws, [[COL.x + COL.w + 1, Y.store + 15], [360, Y.store + 15]], 'w-write');
  R.focusable(ws, {
    title: `Write: ${wj.to}`, lines: [`${wj.what}.`, `Who: ${wj.who}.`], evidence: wj.enforcedBy, proof: 'test',
  });
  P('p:catalogs', Y.catalogs, 'Catalogs', 'checks over the sealed snapshot', 'catalogs', 6, Y.store + 30);
  P('p:runview', Y.runview, 'Console run view', 'stage timeline and findings', 'api', 7, Y.catalogs + 30);
  P('p:diffs', Y.diffs, 'Diffs', 'new since an earlier run', 'diffs', 8, Y.runview + 30);
  const fb = FRAME.y + FRAME.h;
  ['p:exit', 'q:stop'].forEach((key) => {
    const ex = L(key, 'Where cq-mev stops');
    wire(ex, [[cx, key === 'p:exit' ? Y.diffs + 31 : fb], [cx, 577]], 'w-spine docs');
    s('line', {
      class: 'stop-tick', x1: cx - 9, y1: fb, x2: cx + 9, y2: fb,
    }, ex);
    s('text', { class: 'stop-n', x: cx + 14, y: fb + 13 }, ex, 'cq-mev stops here');
  });
  const pg = L('p:person', 'A person decides');
  node(pg, {
    x: COL.x + 30, y: 580, w: 120, title: 'A person decides', subs: ['outside cq-mev'], status: 'person',
  });
  const last = flow[flow.length - 1] || {};
  R.focusable(pg, {
    title: 'A person decides', lines: [last.text || ''], evidence: last.evidence, proof: 'docs',
  });
}

export function buildStoryPart1(svg, F, R, ctx) {
  const L = (key, label) => R.reg(key, s('g', { role: 'group', 'aria-label': label, 'data-label': label }, svg));
  buildStrata(svg, F, R, L, ctx.bandRects);
  buildPipeline(F, R, L, ctx.arrFrom);
  return L;
}
