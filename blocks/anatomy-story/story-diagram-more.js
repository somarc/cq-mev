/* The story diagram (probe C), part 2: finding, compare, recipe map, descriptor, direction. */
import {
  s, byId, plain, wrapWords,
} from './util.js';
import {
  BANDS, BX, BW, COL, RCOL, FRAME, Y, wire, node, lines, chip,
} from './story-diagram.js';

const SESSION_KIND = (r) => {
  if (r.callerSession && r.sealed === 'submission') return 'caller@submit';
  if (r.callerSession) return 'split';
  if (r.sealed === 'submission') return 'sealed at consent';
  return 'job';
};
export { SESSION_KIND };

function buildFinding(F, R, L) {
  const fc = L('finding', 'The four parts of a finding');
  wire(fc, [[COL.x + COL.w + 1, Y.catalogs + 15], [RCOL - 1, Y.catalogs + 15]], 'w-ink', true);
  const fy = 296;
  let fyy = fy + 40;
  const card = s('rect', {
    class: 'card', x: RCOL, y: fy, width: 228, height: 10, rx: 6,
  }, fc);
  s('text', { class: 'card-h', x: RCOL + 12, y: fy + 18 }, fc, 'One finding');
  s('text', { class: 'stop-t', x: RCOL + 12, y: fy + 31 }, fc, 'id: persisted-backlog');
  const fcon = F.findingContract || { parts: [], rules: [] };
  fcon.parts.forEach((p, i) => {
    const ws = wrapWords(p.says, 36);
    s('line', {
      class: 'card-rule', x1: RCOL + 12, y1: fyy - 4, x2: RCOL + 216, y2: fyy - 4,
    }, fc);
    s('text', { class: 'part-f', x: RCOL + 12, y: fyy + 9 }, fc, `${i + 1}  ${p.field}`);
    lines(fc, RCOL + 12, fyy + 23, ws, 'part-s');
    fyy += 22 + ws.length * 13 + 6;
  });
  card.setAttribute('height', fyy - fy);
  R.focusable(fc, {
    title: 'The four parts of a finding',
    lines: fcon.rules.concat(fcon.pending ? [`Pending: ${fcon.pending}.`] : []),
    evidence: 'docs/GUIDE.md section 5',
    proof: 'docs',
  });

  const un = L('unknown', 'Unknown is an answer');
  s('text', { class: 'card-h', x: COL.x, y: 58 }, un, 'Unknown is an answer');
  const UN = [
    ['A missing MBean reads', 'not-registered', 'never zero'],
    ['An unreadable root reads', 'not-readable', 'never empty'],
    ['A check that couldn’t run is', 'notChecked', 'never a pass'],
    ['A walk that hits its budget says', 'at least N', 'never a full count'],
    ['When a catalog finds nothing, that is', 'none found', 'never a clean bill of health'],
  ];
  UN.forEach((r, i) => {
    const y = 84 + i * 40;
    s('text', { class: 'un-s', x: COL.x, y }, un, r[0]);
    chip(un, COL.x, y + 6, r[1], i < 3 ? 'c-mono' : 'c-mono c-plain');
    s('text', { class: 'un-n', x: 356, y: y + 19 }, un, r[2]);
    s('line', {
      class: 'card-rule', x1: COL.x, y1: y + 31, x2: 572, y2: y + 31,
    }, un);
  });
  R.focusable(un, {
    title: 'Unknown is an answer',
    lines: fcon.rules.filter((x) => /Unknown|budget|none/.test(x)),
    evidence: 'docs/GUIDE.md section 5 “Unknown is an answer”',
    proof: 'docs',
  });
}

function buildCompare(F, R, L) {
  const ch = L('cmp:head', 'Compare two runs');
  s('text', { class: 'card-h', x: COL.x, y: 58 }, ch, 'Two sealed runs, one subject key');
  s('text', { class: 'un-s', x: COL.x, y: 74 }, ch, 'Both runs are re-assessed with today’s catalog.');
  const cxE = 322;
  const cxN = 420;
  [cxE, cxN].forEach((x) => s('rect', {
    class: 'run-doc', x: x - 42, y: 92, width: 84, height: 232, rx: 5,
  }, ch));
  s('text', {
    class: 'col-h', x: cxE, y: 108, 'text-anchor': 'middle',
  }, ch, 'earlier run');
  s('text', {
    class: 'col-h', x: cxN, y: 108, 'text-anchor': 'middle',
  }, ch, 'this run');
  s('text', { class: 'col-h', x: COL.x, y: 108 }, ch, 'subject key');
  s('text', { class: 'col-h', x: 476, y: 108 }, ch, 'outcome');
  const ROWS = [
    ['symbolic name', 0, 1, 'new', 'The finding is only in this run.'],
    ['PID', 1, 0, 'gone', 'The finding is only in the earlier run.'],
    ['group:name:version', 1, 1, 'still', 'Both runs have it.'],
    ['symbolic name', 1, 2, 'changed', 'Both runs have it, and it differs.'],
    ['PID', 1, 3, 'not comparable', 'A check that one run couldn’t make, or a subject missing from a partial run, is not comparable, never gone.'],
  ];
  ROWS.forEach((r, i) => {
    const y = 140 + i * 38;
    const g = L(`cmp:row:${i}`, r[3]);
    s('text', { class: 'stop-t', x: COL.x, y: y + 4 }, g, r[0]);
    s('line', {
      class: 'match', x1: cxE, y1: y, x2: cxN, y2: y,
    }, g);
    const mark = (x, kind) => {
      if (kind === 0) {
        s('line', {
          class: 'absent', x1: x - 6, y1: y, x2: x + 6, y2: y,
        }, g);
      }
      if (kind >= 1 && kind <= 2) {
        s('circle', {
          class: 'present', cx: x, cy: y, r: 6,
        }, g);
      }
      if (kind === 2) {
        s('circle', {
          class: 'chg', cx: x, cy: y, r: 9.5,
        }, g);
      }
      if (kind === 3) {
        s('circle', {
          class: 'unk', cx: x, cy: y, r: 6.5,
        }, g);
        s('text', {
          class: 'unk-t', x, y: y + 3.5, 'text-anchor': 'middle',
        }, g, '?');
      }
    };
    mark(cxE, r[1]);
    mark(cxN, r[2]);
    s('text', { class: 'out-t', x: 476, y: y + 4 }, g, r[3]);
    if (i === 4) s('text', { class: 'stop-n', x: 476, y: y + 17 }, g, 'absent isn’t gone');
    R.focusable(g, {
      title: `Outcome: ${r[3]}`,
      lines: [r[4], 'Subjects match by a stable subject key, never a runtime id.'],
      evidence: 'docs/GUIDE.md section 6 “New since an earlier run”',
      proof: 'docs',
    });
  });
  const cd = L('cmp:diffs', 'Diffs built today');
  const bd = byId(F.blocks, 'diffs') || { parts: [] };
  s('text', { class: 'col-h', x: COL.x, y: 360 }, cd, `Built: ${F.counts.diffViews} diffs`);
  [['OSGi graph', 'osgi-stinks@5'], ['Content architecture', 'content-stinks@3'], ['Packages', 'package-stinks@3']]
    .forEach((d, i) => node(cd, {
      x: COL.x + i * 142, y: 370, w: 134, title: d[0], subs: [d[1]],
    }));
  R.focusable(cd, {
    title: 'Diffs built today', lines: bd.parts, evidence: 'docs/GUIDE.md section 6', proof: 'docs',
  });
  const cn = L('cmp:none', 'No diff yet');
  s('text', { class: 'col-h', x: COL.x, y: 434 }, cn, 'No diff yet (#314)');
  lines(cn, COL.x, 452, ['sling-job-stinks, htl-use-stinks, workflow-stinks,', 'settings-stinks and the recipe grades'], 'none-t', 14);
  R.focusable(cn, {
    title: 'No diff yet (#314)',
    lines: ['There is no diff yet for these four catalogs or for the recipe grades.'],
    evidence: 'docs/GUIDE.md section 6',
    proof: 'docs',
  });
}

function buildRecipeMap(F, R, L, ctx) {
  const CHIPX = 124;
  const CHIPMAX = BX + BW.full - 6;
  const rels = F.releases || [];
  F.layers.stackOrder.forEach((id) => {
    const b = BANDS[id];
    if (!b) return;
    let x = CHIPX;
    let row = 0;
    const rs = F.recipes.filter((r) => r.layer === id);
    const extra = F.blocks.filter((k) => k.group === 'recipes' && k.layer === id && k.status === 'deferred');
    rs.concat(extra).forEach((r) => {
      const isDef = r.status === 'deferred';
      const name = isDef ? r.label : r.id;
      const g = L(isDef ? `d:${r.issue}` : `chip:${r.id}`, name);
      if (x + name.length * 6.1 + 12 > CHIPMAX) {
        row += 1;
        x = CHIPX;
      }
      const w = chip(g, x, b.y + 8 + row * 24, name, isDef ? 'c-deferred' : '');
      if (isDef) {
        R.focusable(g, {
          title: `${r.label} (deferred, #${r.issue})`, lines: ['Deferred.'], evidence: `issue #${r.issue}`, proof: 'docs',
        });
      } else {
        const rel = rels[ctx.addedIn[r.id]];
        R.focusable(g, {
          title: `${r.id}: ${r.name}`,
          lines: [`Question: ${r.question}`, `Cost: ${plain(r.cost)}.`, `Never reads: ${plain(r.neverReads)}.`,
            `Session: ${F.sessions[SESSION_KIND(r)] || ''}`,
            (r.findings ? `Findings: ${r.findings}. ` : '') + (rel ? `Added in release ${rel.version} (${rel.date}).` : '')],
          evidence: (r.guard || []).join(', '),
          proof: 'test',
        });
      }
      x += w + 6;
    });
  });
  const RX = 444;
  const RW = 132;
  const RN = (key, y, title, subsArr, blockId, status) => {
    const g = L(key, title);
    node(g, {
      x: RX, y, w: RW, title, subs: subsArr, status: status || 'built',
    });
    const b = byId(F.blocks, blockId) || { label: title };
    R.focusable(g, {
      title: b.label + (b.issue ? ` (#${b.issue}, ${b.status})` : ''),
      lines: [b.summary || (b.status === 'designed' ? 'Designed, not built.' : '')]
        .concat(b.parts ? [`Parts: ${b.parts.join(', ')}.`] : []).filter(Boolean),
      evidence: b.issue ? `issue #${b.issue}` : 'data/cq-mev-facts.json blocks',
      proof: 'docs',
    });
  };
  RN('r:pulse', 56, 'Live pulse', [`${F.counts.pulseTiles} tiles, every 5 s`], 'pulse');
  RN('d:190', 100, 'Health checks', ['cq-mev-live', 'cq-mev-evidence', '#190 · designed'], 'health-checks', 'designed');
  RN('r:console', 172, 'Console', ['/adobe/mev/ui'], 'console-ui');
  RN('r:catalogs', 300, 'Catalogs', [`${F.counts.catalogs} catalogs, sealed input`], 'catalogs');
  RN('r:diffs', 344, 'Diffs', [`${F.counts.diffViews} diffs today`], 'diffs');
  RN('d:188', 388, 'Pinned baselines', ['#188 · designed'], 'pinned-baselines', 'designed');
  RN('d:189', 432, 'Scheduled captures', ['weekly, never during', 'compaction · #189'], 'scheduled-captures', 'designed');

  const rl = L('rel', 'Release readout');
  ctx.rel.v = s('text', { class: 'rel-v', x: RX, y: 84 }, rl, '');
  ctx.rel.d = s('text', { class: 'rel-d', x: RX, y: 102 }, rl, '');
  ctx.rel.n = s('text', { class: 'rel-n', x: RX, y: 126 }, rl, '');
  ctx.rel.a = s('text', { class: 'rel-d', x: RX, y: 142 }, rl, '');
}

function buildPlaces(F, R, L, ctx) {
  const CX = 360;
  const CY = 300;
  const rp = F.recipePlacesToday || { places: [] };
  const on = L('onerecipe', 'One recipe, ten places');
  const JAVA = [0, 1, 2, 3, 4, 9];
  const UI = [5, 8, 6, 7];
  s('text', { class: 'col-h', x: COL.x, y: 62 }, on, 'Java, in the bundle');
  s('text', { class: 'col-h', x: 418, y: 142 }, on, 'Console, tests, docs');
  rp.places.forEach((p, i) => {
    const left = !UI.includes(i);
    const row = left ? Math.max(0, JAVA.indexOf(i)) : UI.indexOf(i) + 1;
    const x = left ? COL.x : 418;
    const y = 70 + row * 80;
    const ls = wrapWords(p, 25);
    const hh = 12 + ls.length * 13;
    const g = L(`place:${i}`, p);
    s('rect', {
      class: 'place-r', x, y, width: 154, height: hh, rx: 4,
    }, g);
    lines(g, x + 8, y + 15, ls, 'place-t');
    R.focusable(g, {
      title: `Place ${i + 1} of ${rp.places.length}`, lines: [`${p}.`], evidence: `data/cq-mev-facts.json recipePlacesToday (#${rp.issue})`, proof: 'docs',
    });
    const ix = left ? x + 154 : x;
    wire(on, [[left ? CX - 50 : CX + 50, CY], [ix + (left ? 2 : -2), y + hh / 2]], 'w-fan', true);
    ctx.places.push({
      g, dx: CX - (x + 77), dy: CY - (y + hh / 2), s: 0,
    });
  });
  const ong = s('g', null, on);
  s('rect', {
    class: 'shape st-built', x: CX - 50, y: CY - 16, width: 100, height: 32, rx: 4,
  }, ong);
  s('text', {
    class: 'n-t', x: CX, y: CY - 1, 'text-anchor': 'middle',
  }, ong, 'One recipe');
  s('text', {
    class: 'n-s', x: CX, y: CY + 11, 'text-anchor': 'middle',
  }, ong, `in ${rp.places.length} places`);
  R.focusable(on, {
    title: `One recipe lives in ${rp.places.length} places today`, lines: rp.places, evidence: `issue #${rp.issue}`, proof: 'docs',
  });

  const de = L('descriptor', `Recipe descriptor, #${rp.issue}`);
  s('rect', {
    class: 'shape st-designed desc', x: CX - 90, y: CY - 26, width: 180, height: 52, rx: 6,
  }, de);
  s('text', {
    class: 'n-t big', x: CX, y: CY - 4, 'text-anchor': 'middle',
  }, de, 'Recipe descriptor');
  s('text', {
    class: 'n-s', x: CX, y: CY + 13, 'text-anchor': 'middle',
  }, de, `#${rp.issue} · PR #345, not merged`);
  R.focusable(de, {
    title: `Recipe descriptor (#${rp.issue})`, lines: [rp.after, F.meta.facts], evidence: F.meta.descriptorSchema, proof: 'docs',
  });
  const RD = [['Java', 222, 410], ['recipes.json', 360, 410], ['the UI test', 498, 410],
    ['check_repository.py', 290, 456], ['the anatomy map', 430, 456]];
  RD.forEach((r, i) => {
    const g = L(`reader:${i}`, r[0]);
    wire(g, [[CX, CY + 27], [r[1], r[2] - 2]], 'w-read docs');
    const t = s('text', {
      class: i === 1 || i === 3 ? 'reader-t mono' : 'reader-t', x: r[1], y: r[2] + 13, 'text-anchor': 'middle',
    }, g, r[0]);
    const tw = t.getComputedTextLength();
    g.insertBefore(s('rect', {
      class: 'chip-r', x: r[1] - tw / 2 - 7, y: r[2], width: tw + 14, height: 19, rx: 3,
    }, null), t);
    R.focusable(g, {
      title: `Reads the descriptor: ${r[0]}`, lines: [rp.after], evidence: `issue #${rp.issue}`, proof: 'docs',
    });
  });
}

/* The direction: designed, not built. Sealed evidence, two gates, an adviser outside. */
function buildDirection(F, R, L) {
  const cx = COL.x + COL.w / 2;
  const fb = FRAME.y + FRAME.h;
  const dir = F.direction || { statements: [] };
  const st = dir.statements;
  const ev = L('dir:evidence', 'Sealed evidence, built');
  node(ev, {
    x: COL.x, y: 64, w: COL.w, title: 'Captures', subs: [`${F.counts.recipes} recipes, bounded reads`],
  });
  wire(ev, [[cx, 95], [cx, 119]], 'w-spine');
  node(ev, {
    x: COL.x, y: 120, w: COL.w, title: 'Sealed store', subs: ['snapshot + SHA-256, one save'],
  });
  wire(ev, [[cx, 151], [cx, 175]], 'w-spine');
  node(ev, {
    x: COL.x, y: 176, w: COL.w, title: 'Catalogs and diffs', subs: ['findings: evidence, why,', 'not proven, next check'],
  });
  const bs = byId(F.blocks, 'store') || {};
  const bc = byId(F.blocks, 'catalogs') || {};
  R.focusable(ev, {
    title: 'Sealed evidence (built)', lines: [bs.summary, bc.summary].filter(Boolean), evidence: 'HouseRulesSourceGuardTest.onlyTheJobStoreWritesTheRepository', proof: 'test',
  });

  const consent = byId(F.gates, 'consent') || { label: 'Exact-payload consent', rule: '' };
  const cg = L('dir:consent', consent.label);
  wire(cg, [[cx, 219], [cx, 276]], 'w-ink docs');
  s('line', {
    class: 'gate-bar', x1: COL.x, y1: 282, x2: COL.x + COL.w, y2: 282,
  }, cg);
  [COL.x, COL.x + COL.w].forEach((x) => s('line', {
    class: 'gate-post', x1: x, y1: 276, x2: x, y2: 288,
  }, cg));
  s('text', { class: 'gate-t', x: RCOL, y: 280 }, cg, consent.label);
  s('text', { class: 'stop-n', x: RCOL, y: 293 }, cg, 'review the exact bytes first');
  R.focusable(cg, {
    title: consent.label, lines: [consent.rule, st[2]].filter(Boolean), evidence: consent.evidence, proof: 'test',
  });

  const kg = L('dir:key', 'Closed: no key on any instance');
  wire(kg, [[cx, 289], [cx, fb - 8]], 'w-ink docs', true);
  s('line', {
    class: 'gate-bar', x1: cx - 26, y1: fb, x2: cx + 26, y2: fb,
  }, kg);
  [cx - 26, cx + 26].forEach((x) => s('line', {
    class: 'gate-post', x1: x, y1: fb - 9, x2: x, y2: fb + 9,
  }, kg));
  s('text', { class: 'gate-t', x: cx + 34, y: fb - 20 }, kg, 'Closed');
  s('text', { class: 'stop-n', x: cx + 34, y: fb - 7 }, kg, 'no key on any instance');
  s('text', {
    class: 'stop-n', x: cx - 10, y: 420, transform: `rotate(-90 ${cx - 10} 420)`,
  }, kg, 'designed (#325)');
  R.focusable(kg, {
    title: 'Closed gate', lines: (F.outbound && F.outbound.why) || [st[1]], evidence: 'data/cq-mev-facts.json outbound', proof: 'docs',
  });

  const ag = L('dir:agent', dir.title || 'AI agent');
  node(ag, {
    x: COL.x - 10, y: 582, w: COL.w + 20, title: 'Trusted, authorized AI agent', subs: ['adviser over sealed evidence · #325'], status: 'designed',
  });
  R.focusable(ag, {
    title: dir.title, lines: [st[0], st[3]].filter(Boolean), evidence: dir.source, proof: 'docs',
  });

  const ad = L('dir:advice', 'Advice record');
  node(ad, {
    x: 372, y: 120, w: 180, title: 'Advice record', subs: ['stored apart from the evidence', 'never replaces it'], status: 'designed',
  });
  R.focusable(ad, {
    title: 'Advice record (designed)', lines: [st[3]].filter(Boolean), evidence: dir.source, proof: 'docs',
  });

  const hc = byId(F.blocks, 'health-checks') || { label: 'Health checks', summary: '' };
  const hg = L('dir:health', hc.label);
  node(hg, {
    x: 372, y: 360, w: 180, title: 'Health checks · #190', subs: ['cq-mev-live, cq-mev-evidence', 'OK never means healthy'], status: 'designed',
  });
  R.focusable(hg, {
    title: `${hc.label} (#${hc.issue}, ${hc.status})`, lines: [hc.summary, st[4]].filter(Boolean), evidence: `issue #${hc.issue}`, proof: 'docs',
  });
  const al = L('dir:alert', 'Upstream alerting');
  wire(al, [[462, 582], [462, 403]], 'w-ink docs');
  node(al, {
    x: 400, y: 584, w: 124, title: 'Upstream alerting', subs: ['outside the author'], status: 'ext',
  });
  R.focusable(al, {
    title: 'Upstream alerting (designed)', lines: [hc.summary].filter(Boolean), evidence: `issue #${hc.issue}`, proof: 'docs',
  });
}

export function buildStoryPart2(F, R, L, ctx) {
  buildFinding(F, R, L);
  buildCompare(F, R, L);
  buildRecipeMap(F, R, L, ctx);
  buildPlaces(F, R, L, ctx);
  buildDirection(F, R, L);
}
