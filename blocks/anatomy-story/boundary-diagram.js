/* The boundary view (probe A's cross-section): what cq-mev reads, writes and sends. */
import { s, byId, plain } from './util.js';
import { SESSION_KIND } from './story-diagram-more.js';

const W = 900;
const G = {
  frameX: 8,
  frameR: 752,
  frameTop: 58,
  bandLabelX: 18,
  tileRight: 528,
  slot: 84,
  labelRight: 700,
  helper: { x: 706, w: 22 },
  con: { x: 734, w: 12 },
  rightX: 764,
  rowH: 17,
  neverX: 118,
  neverR: 524,
};
const TAP = { helper: 717, con: 740 };

/* Hand placement. Slot 0 is next to the column. */
const BAND_SPEC = {
  content: { slots: ['conf', { id: 'content-root', span: 4 }], rows: [{ recipe: 'content-architecture@1' }], padBottom: 8 },
  packages: { slots: [{ id: 'etc-packages', span: 5 }], rows: [{ recipe: 'packages@1' }], padBottom: 8 },
  sling: {
    slots: ['replication', 'scheduler', 'job-queues', 'eventing-jobs', 'workflow'],
    rows: [{ recipe: 'scheduler-threads@1' }, { recipe: 'sling-jobs@1' }, { recipe: 'workflow-instances@1' },
      { recipe: 'osgi-settings@1', extra: true }, { recipe: 'replication-agents@1' }],
  },
  osgi: {
    slots: ['osgi-framework', 'configadmin', 'scr', 'service-users', 'htl-apps'],
    rows: [{ recipe: 'replication-agents@1', extra: true }, { recipe: 'osgi-settings@1' },
      { recipe: 'osgi-relationships@1' }, { recipe: 'htl-use-classes@1' }, { recipe: 'bundle-provenance@1' },
      { recipe: 'local-bundle-runtime-evidence@1' }, { recipe: 'bundle-publisher-inference@2', outbound: true }],
    padBottom: 6,
  },
  oak: {
    slots: ['oak-jmx', 'observation', 'oak-index', 'blob-store', 'maintenance'],
    store: true,
    rows: [{ recipe: 'repository-vitals@1' }, { recipe: 'index-complexity@1' }, { recipe: 'blob-store@1' }],
  },
  runtime: { slots: [{ id: 'jvm', span: 5 }], thin: true, rows: [{ kind: 'pulse' }] },
};

/* The pulse tiles (facts.blocks.pulse.parts) mapped to the areas they sample. My mapping. */
const PULSE_TILES = {
  'tile-jobs': 'job-queues', 'tile-indexing': 'oak-jmx', 'tile-observation': 'observation', 'tile-jvm': 'jvm',
};

const SESSION_TEXT = {
  job: 'in the Sling job',
  'caller@submit': 'the operator’s own session, at submission',
  split: 'split: part at submission, part in the job',
  'sealed at consent': 'sealed at consent: no live read',
  pulse: 'live pulse sample',
};

let measureLayer = null;
function measure(text, cls) {
  const t = s('text', { class: cls, x: 0, y: -100 }, measureLayer, text);
  const w = t.getComputedTextLength();
  t.remove();
  return w;
}
function wrapPx(text, cls, maxW) {
  const words = [];
  text.split(' ').forEach((w) => {
    if (measure(w, cls) <= maxW) {
      words.push(w);
      return;
    }
    let cur = '';
    w.split(/(?=\/)|(?<=[a-z])(?=[A-Z])/).forEach((p) => {
      if (cur && measure(cur + p, cls) > maxW) {
        words.push(cur);
        cur = p;
      } else cur += p;
    });
    if (cur) words.push(cur);
  });
  const out = [];
  let cur = '';
  words.forEach((w) => {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next, cls) > maxW) {
      out.push(cur);
      cur = w;
    } else cur = next;
  });
  if (cur) out.push(cur);
  return out;
}
function fitText(t, maxW) {
  const w = t.getComputedTextLength();
  if (w <= maxW) return;
  if (w <= maxW * 1.12) {
    t.setAttribute('textLength', maxW);
    t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    return;
  }
  const full = t.textContent;
  let lo = 0;
  let hi = full.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    t.textContent = `${full.slice(0, mid)}…`;
    if (t.getComputedTextLength() <= maxW) lo = mid; else hi = mid - 1;
  }
  t.textContent = `${full.slice(0, lo).replace(/[\s,;]+$/, '')}…`;
}

export function mark(parent, session, x, y) {
  const g = s('g', { class: 'mark' }, parent);
  if (session === 'job') {
    s('rect', {
      class: 'mark-job', x: x - 3.6, y: y - 3.6, width: 7.2, height: 7.2,
    }, g);
  } else if (session === 'caller@submit') {
    s('circle', {
      class: 'mark-caller', cx: x, cy: y, r: 3.7,
    }, g);
  } else if (session === 'split') {
    s('circle', {
      class: 'mark-caller', cx: x, cy: y, r: 3.7,
    }, g);
    s('path', { class: 'mark-half', d: `M ${x} ${y - 3.7} A 3.7 3.7 0 0 0 ${x} ${y + 3.7} Z` }, g);
  } else if (session === 'sealed at consent') {
    s('path', { class: 'mark-caller', d: `M ${x} ${y - 4.6} L ${x + 4.6} ${y} L ${x} ${y + 4.6} L ${x - 4.6} ${y} Z` }, g);
  } else {
    s('circle', {
      class: 'mark-pulse', cx: x, cy: y, r: 2.8,
    }, g);
  }
  return g;
}

export function buildBoundary(svg, F, R) {
  measureLayer = s('g', { 'aria-hidden': 'true' }, svg);
  const area = Object.fromEntries(F.aemAreas.map((a) => [a.id, a]));
  const recipe = Object.fromEntries(F.recipes.map((r) => [r.id, r]));
  const layer = Object.fromEntries(F.layers.items.map((l) => [l.id, l]));
  const bp = byId(F.blocks, 'pulse') || { parts: [] };
  const pulseAreas = (bp.parts || []).map((p) => PULSE_TILES[p]).filter((a) => area[a]);
  const lit = {};
  const L = (key, label, parent) => R.reg(key, s('g', { role: 'group', 'aria-label': label, 'data-label': label }, parent || svg));

  const readers = {};
  F.aemAreas.forEach((a) => { readers[a.id] = []; });
  F.recipes.forEach((r) => (r.areas || []).forEach((a) => readers[a] && readers[a].push(r.id)));
  pulseAreas.forEach((a) => readers[a].push('live pulse'));
  const nRead = F.aemAreas.filter((a) => readers[a.id].length).length;
  const nWrite = F.writes.filter((w) => w.kind === 'repository').length;

  /* Band layout. */
  const bands = [];
  let y = G.frameTop;
  F.layers.stackOrder.forEach((lid, bi) => {
    const spec = BAND_SPEC[lid];
    if (!spec || !layer[lid]) return;
    let slotAt = 0;
    const tiles = spec.slots.map((x) => x.id || x).filter((aid) => area[aid]).map((aid, i) => {
      const span = spec.slots[i].span || 1;
      const right = G.tileRight - slotAt * G.slot;
      slotAt += span;
      const wide = span > 1;
      return {
        id: aid,
        wide,
        x: right - span * G.slot + 3,
        w: span * G.slot - 6,
        cx: right - G.slot / 2,
        lines: (spec.thin || wide) ? [area[aid].label] : wrapPx(area[aid].label, 'tile-measure', G.slot - 14),
      };
    });
    const nLines = Math.max(1, ...tiles.map((t) => t.lines.length));
    const rows = spec.rows.filter((r) => !r.recipe || recipe[r.recipe]).map((r) => ({ ...r }));
    let height;
    if (spec.thin) {
      height = 36;
      rows.forEach((r) => { r.y = y + 20; });
    } else {
      const headH = 12 + nLines * 12 + 6;
      rows.forEach((r, i) => { r.y = y + headH + 10 + i * G.rowH; });
      const last = rows.length ? rows[rows.length - 1].y : y + headH;
      height = Math.max(50, last - y + 10 + (spec.padBottom || 0) + (spec.store ? 66 : 0));
    }
    bands.push({
      id: lid, idx: bi, y, height, tiles, rows, spec, layer: layer[lid],
    });
    y += height;
  });
  const frameBottom = y;
  svg.setAttribute('viewBox', `0 0 ${W} ${frameBottom + 14}`);

  const rowsByKey = {};
  bands.forEach((b) => b.rows.forEach((r) => {
    r.band = b.id;
    if (r.recipe) {
      const rc = recipe[r.recipe];
      r.key = `x:row:${rc.id}`;
      r.session = SESSION_KIND(rc);
      r.reads = (rc.areas || []).filter((a) => area[a] && area[a].layer === b.id);
      r.proof = 'test';
    } else {
      r.key = 'x:row:pulse';
      r.session = 'pulse';
      r.reads = pulseAreas.filter((a) => area[a].layer === b.id);
      r.proof = 'docs';
    }
    (rowsByKey[r.key] = rowsByKey[r.key] || []).push(r);
  }));
  const tileOf = (aid) => bands.flatMap((b) => b.tiles).find((t) => t.id === aid);

  /* Background: title, bands, frame. */
  const bg = L('x:frame', 'One AEM author, cut through its layers');
  s('text', { class: 'x-title', x: G.frameX, y: 20 }, bg, 'AEM author');
  s('text', { class: 'x-sum', x: G.frameX, y: 38 }, bg, `Reads ${nRead} areas · writes ${nWrite} place · sends nothing by default`);
  bands.forEach((b) => {
    s('rect', {
      class: `x-band ${b.spec.thin ? 'base' : `b${b.idx % 2}`}`, x: G.frameX, y: b.y, width: G.frameR - G.frameX, height: b.height,
    }, bg);
    if (b.idx > 0) {
      s('line', {
        class: 'x-rule', x1: G.frameX, x2: G.frameR, y1: b.y, y2: b.y,
      }, bg);
    }
  });
  s('rect', {
    class: 'frame', x: G.frameX, y: G.frameTop, width: G.frameR - G.frameX, height: frameBottom - G.frameTop, rx: 4,
  }, bg);

  /* The cq-mev column: two packages. */
  const strips = [
    {
      id: 'pkg-connectors', key: 'x:strip:connectors', geo: G.con, top: 10, cls: 'disabled', sub: 'optional · installs disabled',
    },
    {
      id: 'pkg-helper', key: 'x:strip:helper', geo: G.helper, top: 26, cls: 'required', sub: 'required',
    },
  ];
  strips.forEach((st) => {
    const p = byId(F.packages, st.id);
    if (!p) return;
    const g = L(st.key, p.name);
    s('line', {
      class: 'leader', x1: G.labelRight + 4, x2: st.geo.x, y1: st.top + 1, y2: st.top + 1,
    }, g);
    const tx = s('text', {
      class: 'strip-label', x: G.labelRight, y: st.top + 5, 'text-anchor': 'end',
    }, g);
    s('tspan', { class: 'mono' }, tx, p.name.replace('adobe/mev:', ''));
    s('tspan', { class: 'strip-sub', dx: 6 }, tx, st.sub);
    s('rect', {
      class: `strip ${st.cls}`, x: st.geo.x, y: st.top, width: st.geo.w, height: frameBottom - st.top,
    }, g);
    const bundles = F.bundles.filter((x) => x.package === st.id).map((x) => x.bsn);
    R.focusable(g, {
      title: `${p.name} (${p.required ? 'required' : 'optional'})`,
      lines: [p.note, `Bundles: ${bundles.join(', ')}.`, `Filter roots: ${p.filterRoots.join(', ')}.`].filter(Boolean),
      evidence: 'cq-mev-helper/tools/package.py; connectors/tools/package.py',
      proof: 'docs',
    });
  });

  /* Bands: head, tiles, rows. */
  bands.forEach((b) => {
    const hd = L(`x:band:${b.id}`, `${b.layer.label} band`);
    s('rect', {
      class: 'x-hit', x: G.frameX + 3, y: b.y + 3, width: 96, height: b.height - 6, rx: 3,
    }, hd);
    if (b.spec.thin) {
      s('text', { class: 'x-band-name', x: G.bandLabelX, y: b.rows[0].y + 4.5 }, hd, b.layer.label);
    } else {
      s('text', { class: 'x-band-name', x: G.bandLabelX, y: b.y + 19 }, hd, b.layer.label);
      if (b.layer.consoleGroup) s('text', { class: 'x-band-group', x: G.bandLabelX, y: b.y + 32 }, hd, b.layer.consoleGroup);
    }
    R.focusable(hd, {
      title: `${b.layer.label} band${b.layer.consoleGroup ? ` (console group “${b.layer.consoleGroup}”)` : ''}`,
      lines: b.tiles.map((t) => `${area[t.id].label}: ${area[t.id].detail}.`),
      evidence: 'data/cq-mev-facts.json layers, aemAreas',
    });
    lit[`x:band:${b.id}`] = [`x:band:${b.id}`, ...b.tiles.map((t) => `x:tile:${t.id}`),
      ...F.recipes.filter((r) => r.layer === b.id).map((r) => `x:row:${r.id}`)];

    b.tiles.forEach((t) => {
      const a = area[t.id];
      const tg = L(`x:tile:${t.id}`, a.label);
      tg.classList.add('xd');
      const top = b.y + (b.spec.thin ? 5 : 6);
      const bottom = b.y + b.height - (b.spec.thin ? 5 : 6);
      s('rect', {
        class: 'x-tile', x: t.x, y: top, width: t.w, height: bottom - top, rx: 3,
      }, tg);
      if (b.spec.thin) {
        const tt = s('text', { x: t.x + 7, y: b.rows[0].y + 4 }, tg);
        s('tspan', { class: 'tile-name' }, tt, t.lines[0]);
        s('tspan', { class: 'tile-detail', dx: 8 }, tt, a.detail);
      } else {
        t.lines.forEach((ln, i) => s('text', { x: t.x + 7, y: top + 14 + i * 12, class: `tile-text${t.wide ? ' tile-name' : ''}` }, tg, ln));
      }
      if (t.wide && !b.spec.thin) {
        wrapPx(a.detail, 'tile-detail', t.cx - 24 - (t.x + 7)).forEach((ln, i) => s('text', {
          class: 'tile-detail', x: t.x + 7, y: top + 30 + i * 12,
        }, tg, ln));
      }
      if (pulseAreas.includes(t.id) && !b.spec.thin) {
        s('circle', {
          class: 'mark-pulse', cx: t.x + t.w - 7, cy: top + 9, r: 2.6,
        }, tg);
      }
      R.focusable(tg, {
        title: a.label,
        lines: [`${a.detail}.`, `Read by: ${readers[t.id].join(', ') || 'nothing'}.`],
        evidence: 'data/cq-mev-facts.json aemAreas, recipes[].areas',
      });
      lit[`x:tile:${t.id}`] = [`x:tile:${t.id}`, ...F.recipes.filter((r) => (r.areas || []).includes(t.id)).map((r) => `x:row:${r.id}`)]
        .concat(pulseAreas.includes(t.id) ? ['x:row:pulse'] : []);
    });

    b.rows.forEach((r) => {
      const rc = recipe[r.recipe];
      const label = rc ? rc.id : 'live pulse and run conditions';
      const g = L(r.key, label);
      g.classList.add('xd');
      s('rect', {
        class: 'x-hit', x: G.neverX - 6, y: r.y - 12, width: G.con.x + G.con.w + 2 - (G.neverX - 6), height: 16, rx: 2,
      }, g);
      if (r.outbound) {
        s('line', {
          class: 'outbound', x1: TAP.helper, x2: G.rightX + 12, y1: r.y, y2: r.y,
        }, g);
        s('circle', {
          class: 'tap', cx: TAP.con, cy: r.y, r: 3,
        }, g);
        const note = s('text', {
          class: 'row-note', x: G.tileRight - 4, y: r.y + 3.5, 'text-anchor': 'end',
        }, g, `reads no live area: ${plain((rc.readsFrom || [''])[0])}`);
        fitText(note, G.tileRight - G.neverX - 4);
      }
      if (r.reads.length) {
        const minX = Math.min(...r.reads.map((a) => tileOf(a).cx));
        s('line', {
          class: `rail ${r.proof}`, x1: minX, x2: TAP.helper, y1: r.y, y2: r.y,
        }, g);
        r.reads.forEach((a) => mark(g, r.session, tileOf(a).cx, r.y));
      }
      if (r.extra) {
        const home = rowsByKey[r.key].find((x) => !x.extra);
        if (home && home.y < r.y) {
          s('line', {
            class: 'jog', x1: TAP.helper, x2: TAP.helper, y1: home.y, y2: r.y,
          }, g);
        } else if (home) {
          s('path', { class: 'jog', d: `M ${TAP.helper} ${home.y} H ${TAP.helper + 8} V ${r.y} H ${TAP.helper}` }, g);
        }
      }
      if (r.outbound) mark(g, 'sealed at consent', TAP.helper, r.y);
      else {
        s('circle', {
          class: 'tap', cx: TAP.helper, cy: r.y, r: 3,
        }, g);
      }
      const lt = s('text', {
        class: `row-label${rc ? ' mono' : ''}${r.extra ? ' extra' : ''}`, x: G.labelRight, y: r.y - 4, 'text-anchor': 'end',
      }, g, label);
      fitText(lt, G.labelRight - G.tileRight - 6);
      if (rc && !r.extra && !r.outbound) {
        const nt = s('text', { class: 'never-text', x: G.neverX, y: r.y + 3.5 }, g, plain(rc.neverReads));
        r.neverEl = nt;
      }
      if (r.extra) return;
      const readNames = (rc ? rc.areas || [] : pulseAreas).map((a) => area[a].label).join(', ');
      R.focusable(g, rc ? {
        title: `${rc.id}: ${rc.name}`,
        lines: [`Reads: ${readNames || 'no live area'}. Session: ${SESSION_TEXT[r.session]}.`,
          `Cost: ${plain(rc.cost)}.`, `Never reads: ${plain(rc.neverReads)}.`],
        evidence: (rc.guard || []).join(', '),
        proof: 'test',
      } : {
        title: 'Live pulse and run conditions',
        lines: [bp.summary, `Samples: ${readNames}.`, ((byId(F.gates, 'conditions') || {}).rule || '')].filter(Boolean),
        evidence: 'RunConditionsTest; pulse tiles mapped to areas by this page',
        proof: 'docs',
      });
      lit[r.key] = [r.key, ...(rc ? rc.areas || [] : pulseAreas).map((a) => `x:tile:${a}`)]
        .concat(r.outbound ? ['x:gate', 'x:strip:connectors'] : []);
    });
  });
  /* Fit never-reads text while it is displayed. */
  svg.classList.add('show-never');
  bands.forEach((b) => b.rows.forEach((r) => {
    if (r.neverEl) fitText(r.neverEl, G.neverR - G.neverX);
  }));
  svg.classList.remove('show-never');

  /* The sealed store: the one red write. */
  const oak = bands.find((b) => b.id === 'oak');
  const wj = byId(F.writes, 'w-jobs');
  if (oak && wj) {
    const sTop = (oak.rows.length ? oak.rows[oak.rows.length - 1].y : oak.y + 40) + 14;
    const sx = 540;
    const sw = 150;
    const sh = 50;
    const st = L('x:store', `Write: ${wj.to}`);
    st.classList.add('xd');
    s('rect', {
      class: 'x-store', x: sx, y: sTop, width: sw, height: sh, rx: 3,
    }, st);
    s('text', { class: 'x-path mono', x: sx + 7, y: sTop + 15 }, st, wj.to);
    s('text', { class: 'x-sub', x: sx + 7, y: sTop + 29 }, st, 'sealed: SHA-256, one save');
    s('text', { class: 'x-test mono', x: sx + 7, y: sTop + 42 }, st, wj.enforcedBy.split('.')[0]);
    const my = sTop + sh / 2;
    s('line', {
      class: 'write heavy', x1: TAP.helper, x2: sx + sw + 8, y1: my, y2: my,
    }, st);
    s('path', { class: 'write-head', d: `M ${sx + sw} ${my} l 10 -6 l 0 12 Z` }, st);
    s('circle', {
      class: 'write-tap', cx: TAP.helper, cy: my, r: 3.6,
    }, st);
    const others = F.writes.filter((w) => w.kind !== 'repository')
      .map((w) => `Also written, not by cq-mev’s own code at run time: ${w.what} (${w.who}; ${w.proof}).`);
    R.focusable(st, {
      title: `Write: ${wj.to}`,
      lines: [`${wj.what}. Who: ${wj.who}.`, ...others],
      evidence: wj.enforcedBy,
      proof: 'test',
    });
    lit['x:store'] = ['x:store', 'x:strip:helper'];
  }

  /* The closed gate on the one outbound path. */
  const outRow = bands.flatMap((b) => b.rows).find((r) => r.outbound);
  if (outRow) {
    const gy = outRow.y;
    const gx = G.rightX + 12;
    const gate = L('x:gate', 'The one outbound path, stopped at a closed gate');
    gate.classList.add('xd');
    s('text', { class: 'zone-title', x: G.rightX, y: gy - 36 }, gate, 'OUTBOUND · 1 PATH');
    s('text', { class: 'gate-closed', x: gx - 2, y: gy - 17 }, gate, 'CLOSED');
    s('rect', {
      class: 'x-post', x: gx, y: gy - 11, width: 3, height: 22,
    }, gate);
    s('rect', {
      class: 'x-bar', x: gx, y: gy - 3, width: 21, height: 6,
    }, gate);
    s('rect', {
      class: 'x-post', x: gx + 18, y: gy - 11, width: 3, height: 22,
    }, gate);
    s('line', {
      class: 'provider', x1: gx + 26, x2: gx + 40, y1: gy, y2: gy,
    }, gate);
    s('text', { class: 'provider-t', x: gx + 44, y: gy + 3.5 }, gate, 'model provider');
    ['off: installs disabled', 'no keys on any instance', 'consent to the exact bytes'].forEach((t, i) => {
      s('rect', {
        class: 'x-bar', x: G.rightX, y: gy + 18 + i * 14, width: 5, height: 5,
      }, gate);
      s('text', { class: 'gate-why', x: G.rightX + 10, y: gy + 24 + i * 14 }, gate, t);
    });
    const consent = byId(F.gates, 'consent') || {};
    R.focusable(gate, {
      title: `Outbound: ${F.outbound.to} (${F.outbound.state})`,
      lines: F.outbound.why.map((w) => `${w}.`).concat(consent.rule ? [consent.rule] : []),
      evidence: consent.evidence,
      proof: 'test',
    });
    lit['x:gate'] = ['x:gate', 'x:strip:connectors', 'x:row:bundle-publisher-inference@2'];
  }
  lit['x:strip:helper'] = ['x:strip:helper', 'x:store', ...Object.keys(rowsByKey)];
  lit['x:strip:connectors'] = ['x:strip:connectors', 'x:gate', 'x:row:bundle-publisher-inference@2'];
  return lit;
}
