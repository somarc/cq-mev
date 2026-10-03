/*
 * anatomy-story: a guided story with one sticky diagram.
 * Authored table: one row per beat.
 * Cell 1 = beat id (for example capture-6). Cell 2 = the beat's text.
 * Known beat ids change the diagram. An unknown id shows its text and leaves the diagram as it is.
 */
import { toClassName } from '../../scripts/aem.js';
import {
  h, s, clear, norm, createRegistry,
} from './util.js';
import { buildStoryPart1, BW } from './story-diagram.js';
import { buildStoryPart2 } from './story-diagram-more.js';
import { buildBoundary, mark } from './boundary-diagram.js';
import { buildScenes } from './scenes.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
/* One column: the diagram sits on top, and the text reads below it. */
const NARROW = window.matchMedia('(width <= 820px)');
const FACTS_PATH = '/data/cq-mev-facts.json';
/* The header (or any listener) learns the current chapter from these document events. */
const CHAPTER_EVENT = 'anatomy-story:chapter';
const QUERY_EVENT = 'anatomy-story:query';

async function loadFacts() {
  const base = (window.hlx && window.hlx.codeBasePath) || '';
  const resp = await fetch(`${base}${FACTS_PATH}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function readBeats(block) {
  const seen = {};
  return [...block.children].map((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return null;
    let id = toClassName(cells[0].textContent.trim().replace(/^#/, ''));
    if (!id) return null;
    if (seen[id]) id = `${id}-${(seen[id] += 1)}`; else seen[id] = 1;
    return { id, body: cells[1] };
  }).filter(Boolean);
}

/* Visible once the plate has a size, so SVG text can be measured. */
function whenVisible(el) {
  return new Promise((resolve) => {
    const check = () => {
      if (el.getBoundingClientRect().width > 0) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
}

export default async function decorate(block) {
  const beats = readBeats(block);
  clear(block);
  const story = h('div', { class: 'as-story' }, block);
  const narrative = h('div', { class: 'as-narrative', 'aria-label': 'Story' }, story);
  const stage = h('aside', { class: 'as-stage', 'aria-label': 'Diagram' }, story);
  const bar = h('nav', { class: 'as-bar', 'aria-label': 'Story navigation' }, stage);
  const prev = h('button', { type: 'button', class: 'as-nav', 'aria-label': 'Previous step' }, bar, '‹');
  const next = h('button', { type: 'button', class: 'as-nav', 'aria-label': 'Next step' }, bar, '›');
  const whereEl = h('p', { class: 'as-where', 'aria-live': 'polite' }, bar);
  const plate = h('div', { class: 'as-plate' }, stage);
  const capEl = h('div', { class: 'as-caption' }, stage);
  const legendEl = h('div', { class: 'as-legend' }, stage);

  let F = null;
  try {
    F = await loadFacts();
  } catch (e) {
    h('p', { class: 'as-error' }, plate, `The diagram could not load its facts (${e.message}). The text is complete without it.`);
  }

  /* ---------- beats: chapter, step and text ---------- */
  const pre = F ? buildScenes(F, () => '') : {};
  let lastCh = 0;
  const groupCount = {};
  beats.forEach((b) => {
    const k = pre[b.id];
    b.known = !!k;
    b.ch = k ? k.ch : (lastCh || 1);
    b.group = k && k.group;
    b.last = k && k.last;
    b.opens = b.ch !== lastCh;
    lastCh = b.ch;
    if (b.group) {
      groupCount[b.group] = (groupCount[b.group] || 0) + 1;
      b.stepIx = groupCount[b.group];
    }
  });
  const chapterTitle = {};
  const groupTitle = {};
  const beatEls = [];
  beats.forEach((b, i) => {
    const sec = h('section', { class: 'beat', id: b.id, 'data-i': String(i) });
    if (b.group) sec.classList.add('step');
    if (b.last) sec.classList.add('last');
    if (b.opens) {
      sec.classList.add('opens');
      h('p', { class: 'kicker' }, sec, `Chapter ${b.ch}`);
    }
    const body = [...b.body.childNodes];
    const heads = b.body.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const h2 = b.body.querySelector('h2');
    const h3 = b.body.querySelector('h3');
    if (h2 && !chapterTitle[b.ch]) chapterTitle[b.ch] = h2.textContent.trim();
    if (b.group && h3 && !groupTitle[b.group]) groupTitle[b.group] = h3.textContent.trim();
    let stepEl = null;
    if (b.group) {
      const n = groupCount[b.group];
      stepEl = h('p', { class: 'stepno', id: `${b.id}-step` }, null, b.last ? `Where it stops · ${b.stepIx} of ${n}` : `Step ${b.stepIx} of ${n}`);
    }
    if (stepEl && heads.length) {
      body.forEach((nd) => sec.append(nd));
      heads[heads.length - 1].after(stepEl);
    } else {
      if (stepEl) sec.append(stepEl);
      body.forEach((nd) => sec.append(nd));
    }
    const hd = sec.querySelector('h2, h3, h4');
    if (hd) {
      if (!hd.id || document.getElementById(hd.id)) hd.id = `${b.id}-h`;
      sec.setAttribute('aria-labelledby', hd.id);
    } else if (stepEl) sec.setAttribute('aria-labelledby', stepEl.id);
    else sec.setAttribute('aria-label', b.id);
    sec.querySelectorAll('p').forEach((p) => {
      if (/^(Evidence|Source)s?:/.test(p.textContent.trim())) p.classList.add('ev');
    });
    if (F) {
      sec.querySelectorAll('li').forEach((li) => {
        const t = norm(li.textContent);
        const ls = (F.lessons || []).find((l) => t.startsWith(norm(l.title)));
        if (ls) {
          li.setAttribute('data-peek', `lesson:${ls.id}`);
          li.setAttribute('tabindex', '0');
        }
      });
    }
    b.altEl = h('p', { class: 'beat-alt' }, sec);
    h('a', { class: 'deeplink', href: `#${b.id}`, 'aria-label': `Link to ${b.id}` }, sec, '#');
    narrative.append(sec);
    beatEls.push(sec);
  });
  h('div', { class: 'as-tail', 'aria-hidden': 'true' }, narrative);
  if (!beats.length) return;

  /* ---------- state and navigation ---------- */
  const R = createRegistry();
  const ctx = {
    bandRects: {}, arrFrom: {}, places: [], rel: {}, addedIn: {},
  };
  const state = {
    beat: -1, pinned: null, scene: null, release: 0, built: false, inView: false, reading: false,
  };
  let scenes = pre;
  let storySvg = null;
  let boundSvg = null;
  const legends = {};
  let lit = {};
  const rafs = new Map();
  if (F) {
    (F.releases || []).forEach((r, i) => r.added.forEach((id) => { ctx.addedIn[id] = i; }));
    state.release = Math.max(0, (F.releases || []).length - 1);
  }

  function tween(key, from, to, apply) {
    if (rafs.has(key)) cancelAnimationFrame(rafs.get(key));
    if (REDUCED.matches || from === to) {
      apply(to);
      return;
    }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 340);
      apply(from + (to - from) * (1 - (1 - p) ** 3));
      if (p < 1) rafs.set(key, requestAnimationFrame(step)); else rafs.delete(key);
    };
    rafs.set(key, requestAnimationFrame(step));
  }

  function applyScene(sc) {
    if (!state.built || !sc) return;
    state.scene = sc;
    const st = {};
    R.expand(sc.on).forEach((k) => { st[k] = 'on'; });
    R.expand(sc.quiet).forEach((k) => { st[k] = 'quiet'; });
    R.expand(sc.hi).forEach((k) => { st[k] = 'hi'; });
    const RANK = {
      off: 0, quiet: 1, on: 2, hi: 3,
    };
    Object.keys(ctx.arrFrom).forEach((ak) => {
      const a = st[ctx.arrFrom[ak][0]] || 'off';
      const b = st[ctx.arrFrom[ak][1]] || 'off';
      const lo = RANK[a] < RANK[b] ? a : b;
      if (lo === 'off' || lo === 'hi') st[ak] = lo;
      else st[ak] = RANK[a] >= 2 && RANK[b] >= 2 ? 'on' : lo;
    });
    if (sc.release) {
      Object.keys(R.K).filter((k) => k.startsWith('chip:')).forEach((k) => {
        const ix = ctx.addedIn[k.slice(5)];
        if (ix > state.release) st[k] = 'off';
        else st[k] = ix === state.release ? 'hi' : 'on';
      });
    }
    Object.keys(R.K).forEach((k) => {
      const v = st[k] || 'off';
      R.K[k].forEach((g) => {
        g.classList.remove('is-off', 'is-on', 'is-quiet', 'is-hi');
        g.classList.add(`is-${v}`);
        if (g.classList.contains('f')) {
          g.setAttribute('tabindex', v === 'off' ? '-1' : '0');
          if (v === 'off') g.setAttribute('aria-hidden', 'true'); else g.removeAttribute('aria-hidden');
        }
      });
    });
    const boundary = sc.view === 'boundary';
    storySvg.classList.toggle('is-shown', !boundary);
    boundSvg.classList.toggle('is-shown', boundary);
    storySvg.setAttribute('aria-hidden', String(boundary));
    boundSvg.setAttribute('aria-hidden', String(!boundary));
    boundSvg.classList.toggle('show-never', !!sc.never);
    legends.marks.classList.toggle('is-shown', boundary);
    const mode = sc.strata || 'wide';
    Object.keys(ctx.bandRects).forEach((id) => {
      const r = ctx.bandRects[id];
      tween(`band:${id}`, +r.getAttribute('width'), BW[mode], (v) => r.setAttribute('width', v.toFixed(1)));
    });
    ctx.places.forEach((p, i) => {
      tween(`place:${i}`, p.s, sc.collapse ? 1 : 0, (x) => {
        p.s = x;
        p.g.setAttribute('transform', `translate(${(p.dx * x).toFixed(1)},${(p.dy * x).toFixed(1)})`);
      });
    });
  }

  function showInfo(info) {
    clear(capEl);
    if (!info) {
      const sc = state.scene;
      h('p', { class: 'cap-k' }, capEl, 'In the diagram');
      h('p', { class: 'cap-p' }, capEl, (sc && sc.alt) || '');
      h('p', { class: 'cap-hint' }, capEl, 'Point at or focus a part of the diagram to see its evidence. Esc goes up a level.');
      return;
    }
    h('p', { class: 'cap-k' }, capEl, state.pinned ? 'Pinned · Esc releases it' : 'Detail');
    h('p', { class: 'cap-t' }, capEl, info.title);
    (info.lines || []).forEach((l) => { if (l) h('p', { class: 'cap-p' }, capEl, l); });
    if (info.evidence) {
      const e = h('p', { class: 'cap-ev' }, capEl);
      h('span', { class: `proof proof-${info.proof === 'test' ? 'test' : 'docs'}` }, e, info.proof === 'test' ? 'test' : 'docs');
      h('code', null, e, info.evidence);
    }
  }

  let navigating = false;
  let navTimer = 0;
  const chapterStart = (ch) => beats.findIndex((b) => b.ch === ch);
  let told = '';

  /* Tell listeners the current chapter (its first beat) and if the reader is in the story. */
  function announce() {
    const b = beats[state.beat];
    if (!b) return;
    const detail = {
      ch: b.ch,
      id: beats[chapterStart(b.ch)].id,
      title: chapterTitle[b.ch] || `Chapter ${b.ch}`,
      active: state.reading,
    };
    const key = `${detail.id}|${detail.active}`;
    if (key === told) return;
    told = key;
    document.dispatchEvent(new CustomEvent(CHAPTER_EVENT, { detail }));
  }
  document.addEventListener(QUERY_EVENT, () => {
    told = '';
    announce();
  });

  function activate(i, scroll) {
    const ix = Math.max(0, Math.min(beats.length - 1, i));
    state.beat = ix;
    beatEls.forEach((el, j) => el.classList.toggle('is-active', j === ix));
    const b = beats[ix];
    const k = scenes[b.id];
    if (state.pinned) state.pinned.classList.remove('pinned');
    state.pinned = null;
    // An unknown beat keeps the current diagram.
    // With no diagram yet, it takes the nearest known one.
    const near = k || (state.scene ? null : scenes[(beats.slice(0, ix).reverse()
      .concat(beats.slice(ix)).find((x) => scenes[x.id]) || {}).id]);
    if (near) state.scene = { ...near.scene, alt: near.alt };
    applyScene(state.scene);
    showInfo(null);
    let where = `${b.ch} · ${(b.group && groupTitle[b.group]) || chapterTitle[b.ch] || `Chapter ${b.ch}`}`;
    if (b.group) where += b.last ? ' · where it stops' : ` · step ${b.stepIx} of ${groupCount[b.group]}`;
    whereEl.textContent = where;
    prev.disabled = ix === 0;
    next.disabled = ix === beats.length - 1;
    // Write the deep link only while the reader is in the story, so a first load keeps the hero.
    if ((scroll || state.inView) && window.location.hash !== `#${b.id}`) {
      window.history.replaceState(null, '', `#${b.id}`);
    }
    announce();
    if (scroll) {
      navigating = true;
      clearTimeout(navTimer);
      beatEls[ix].scrollIntoView({ block: NARROW.matches ? 'start' : 'center', behavior: REDUCED.matches ? 'auto' : 'smooth' });
      navTimer = setTimeout(() => { navigating = false; }, REDUCED.matches ? 300 : 2500);
    }
  }

  prev.addEventListener('click', () => activate(state.beat - 1, true));
  next.addEventListener('click', () => activate(state.beat + 1, true));

  /* The active beat crosses the middle of the reading area (below the diagram when narrow). */
  const onBeats = (entries) => {
    if (navigating) return;
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const i = +en.target.getAttribute('data-i');
      if (i !== state.beat) activate(i, false);
    });
  };
  let io;
  const observeBeats = () => {
    if (io) io.disconnect();
    const rootMargin = NARROW.matches ? '-77% 0px -21% 0px' : '-48% 0px -48% 0px';
    io = new IntersectionObserver(onBeats, { rootMargin, threshold: 0 });
    beatEls.forEach((el) => io.observe(el));
  };
  observeBeats();
  NARROW.addEventListener('change', observeBeats);
  new IntersectionObserver((entries) => {
    entries.forEach((en) => { state.inView = en.isIntersecting; });
  }).observe(narrative);
  /* Reading: the middle of the viewport is inside the beats (first top to last end). */
  const middle = new IntersectionObserver((entries) => {
    const mid = window.innerHeight / 2;
    entries.forEach((en) => {
      const i = +en.target.getAttribute('data-i');
      const r = en.boundingClientRect;
      const above = i === 0 && r.top > mid;
      const past = i === beats.length - 1 && r.bottom < mid;
      if (en.isIntersecting) state.reading = true;
      else if (above || past) state.reading = false;
    });
    announce();
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  beatEls.forEach((el) => middle.observe(el));
  window.addEventListener('scrollend', () => { navigating = false; });
  /* A jump (the End key, a footer link) can skip every beat, so no beat crosses the
     reading line. When scrolling stops, settle on the beat at the line, the last one past
     the end, or the first one above the start. A timer, because not every browser sends
     scrollend. */
  let settleTimer = 0;
  window.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (navigating) return;
      const line = window.innerHeight * (NARROW.matches ? 0.78 : 0.5);
      const rects = beatEls.map((el) => el.getBoundingClientRect());
      let i = rects.findIndex((r) => r.top <= line && r.bottom >= line);
      if (i < 0 && rects[rects.length - 1].bottom < line) i = beats.length - 1;
      const above = i < 0 && rects[0].top > line;
      if (above) i = 0;
      if (i >= 0 && i !== state.beat) activate(i, false);
      // Above the story the hero shows, so the URL keeps no beat: a reload starts at the hero.
      if (above && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }, 160);
  }, { passive: true });
  window.addEventListener('hashchange', () => {
    const i = beats.findIndex((b) => `#${b.id}` === window.location.hash);
    if (i >= 0 && i !== state.beat) activate(i, true);
  });

  document.addEventListener('keydown', (ev) => {
    if (!state.inView) return;
    const t = ev.target;
    if (t && t.closest && t.closest('header, footer')) return;
    if (ev.key === 'Escape') {
      if (state.pinned) {
        state.pinned.classList.remove('pinned');
        state.pinned = null;
        showInfo(null);
        return;
      }
      if (t && t.closest && t.closest('.as-plate svg')) {
        next.focus();
        return;
      }
      const b = beats[state.beat];
      const cs = chapterStart(b.ch);
      if (state.beat !== cs) activate(cs, true);
      else if (state.beat !== 0) activate(0, true);
      return;
    }
    if (ev.altKey || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    if (t && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      activate(state.beat + 1, true);
    }
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      activate(state.beat - 1, true);
    }
  });

  /* ---------- the release slider ---------- */
  let scrubIn = null;
  let scrubOut = null;
  function updateScrub() {
    const rels = F.releases || [];
    const r = rels[state.release];
    if (!r) return;
    const total = rels.slice(0, state.release + 1).reduce((n, x) => n + x.added.length, 0);
    const txt = `${r.version} · ${r.date} · ${total} of ${F.counts.recipes} recipes · `
      + `${r.added.length ? `added: ${r.added.join(', ')}` : 'no recipe added'}`;
    scrubOut.textContent = txt;
    scrubIn.setAttribute('aria-valuetext', txt);
    if (ctx.rel.v) {
      ctx.rel.v.textContent = r.version;
      ctx.rel.d.textContent = r.date;
      ctx.rel.n.textContent = `${total} of ${F.counts.recipes} recipes`;
      ctx.rel.a.textContent = r.added.length ? `+${r.added.length} in this release` : 'no recipe added';
    }
  }
  const relBeat = beats.findIndex((b) => scenes[b.id] && scenes[b.id].scrubber);
  if (F && relBeat >= 0 && (F.releases || []).length) {
    const sec = beatEls[relBeat];
    const box = h('div', { class: 'scrub' });
    const ev = sec.querySelector('p.ev');
    if (ev) ev.before(box); else sec.querySelector('.beat-alt').before(box);
    h('label', { for: `${block.id || 'as'}-release` }, box, 'Release');
    scrubIn = h('input', {
      type: 'range', id: `${block.id || 'as'}-release`, min: '0', max: String(F.releases.length - 1), step: '1', value: String(state.release),
    }, box);
    const ticks = h('div', { class: 'ticks', 'aria-hidden': 'true' }, box);
    F.releases.forEach((r) => h('span', { class: r.added.length ? 'tick has' : 'tick' }, ticks, r.version.replace('v0.5', '')));
    scrubOut = h('output', { for: scrubIn.id, class: 'scrub-out' }, box);
    scrubIn.addEventListener('input', () => {
      state.release = +scrubIn.value;
      updateScrub();
      if (state.beat !== relBeat) activate(relBeat, false); else applyScene(state.scene);
    });
    updateScrub();
  }

  const start = Math.max(0, beats.findIndex((b) => `#${b.id}` === window.location.hash));
  activate(start, false);
  if (!F) return;

  /* ---------- the diagrams, built when the plate can be measured ---------- */
  whenVisible(plate).then(() => {
    storySvg = s('svg', {
      viewBox: '0 0 600 640', class: 'as-svg as-story-svg', role: 'group', 'aria-label': 'cq-mev inside one AEM author: the story diagram', preserveAspectRatio: 'xMidYMid meet',
    }, plate);
    boundSvg = s('svg', {
      class: 'as-svg as-boundary-svg', role: 'group', 'aria-label': 'Cross-section of one AEM author: what cq-mev reads, writes and sends', preserveAspectRatio: 'xMidYMid meet',
    }, plate);
    const L = buildStoryPart1(storySvg, F, R, ctx);
    buildStoryPart2(F, R, L, ctx);
    lit = buildBoundary(boundSvg, F, R);
    R.FOCUSABLE.forEach((g) => {
      if (g.closest('.as-boundary-svg') || /^band:/.test(g.getAttribute('data-key'))) return;
      const bb = g.getBBox();
      g.insertBefore(s('rect', {
        class: 'ring', x: (bb.x - 3).toFixed(1), y: (bb.y - 3).toFixed(1), width: (bb.width + 6).toFixed(1), height: (bb.height + 6).toFixed(1), rx: 4,
      }, null), g.firstChild);
    });
    const labelsOf = (keys) => [...new Set(R.expand(keys).map((k) => (R.K[k] || [])[0])
      .filter(Boolean).map((g) => g.getAttribute('data-label')))].join('; ');
    scenes = buildScenes(F, labelsOf);
    beats.forEach((b) => {
      const k = scenes[b.id];
      if (!k) return;
      clear(b.altEl);
      h('span', { class: 'ev-l' }, b.altEl, 'In the diagram: ');
      b.altEl.append(k.alt);
    });

    /* Detail on hover and focus; Enter or click pins it. Boundary parts light what they touch. */
    const setLit = (g, on) => {
      const key = g.getAttribute('data-key');
      if (!lit[key]) return;
      boundSvg.classList.toggle('x-focus', on);
      R.expand(lit[key]).forEach((k) => (R.K[k] || []).forEach((x) => x.classList.toggle('is-lit', on)));
    };
    R.FOCUSABLE.forEach((g) => {
      const info = R.INFO.get(g);
      const show = () => {
        if (state.pinned) return;
        showInfo(info);
        setLit(g, true);
      };
      const hide = () => {
        if (state.pinned) return;
        showInfo(null);
        setLit(g, false);
      };
      const pin = () => {
        if (state.pinned) state.pinned.classList.remove('pinned');
        state.pinned = state.pinned === g ? null : g;
        if (state.pinned) g.classList.add('pinned');
        showInfo(state.pinned ? info : null);
      };
      g.addEventListener('focus', show);
      g.addEventListener('blur', hide);
      g.addEventListener('mouseenter', show);
      g.addEventListener('mouseleave', hide);
      g.addEventListener('click', pin);
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          pin();
        }
      });
    });
    narrative.querySelectorAll('[data-peek]').forEach((li) => {
      const keys = R.expand([li.getAttribute('data-peek')]);
      const set = (on) => keys.forEach((k) => (R.K[k] || []).forEach((g) => g.classList.toggle('peek', on)));
      li.addEventListener('mouseenter', () => set(true));
      li.addEventListener('mouseleave', () => set(false));
      li.addEventListener('focus', () => set(true));
      li.addEventListener('blur', () => set(false));
    });

    /* Legends: one for the whole story, one for the session marks of the boundary view. */
    const legend = (label, items) => {
      const v = s('svg', {
        viewBox: '0 0 600 18', class: 'legend-svg', role: 'img', 'aria-label': label,
      }, legendEl);
      let lx = 0;
      items.forEach(([draw, text]) => {
        draw(v, lx);
        const t = s('text', { class: 'lg-t', x: lx + 26, y: 13 }, v, text);
        lx += 26 + t.getComputedTextLength() + 14;
      });
      v.setAttribute('viewBox', `0 0 ${Math.ceil(lx)} 18`);
      return v;
    };
    const ln = (cls) => (v, x) => s('line', {
      class: `wire ${cls}`, x1: x, y1: 9, x2: x + 20, y2: 9,
    }, v);
    const bx = (cls) => (v, x) => s('rect', {
      class: cls, x: x + 2, y: 3, width: 16, height: 12, rx: 2,
    }, v);
    legends.main = legend('Legend: solid line, a named test enforces it. Dashed line, docs only. Red, a write. Filled block, built. Outlined block, designed. Faint block, deferred.', [
      [ln('w-ink'), 'test'], [ln('w-ink docs'), 'docs only'], [ln('w-write'), 'write'],
      [bx('shape st-built'), 'built'], [bx('shape st-designed'), 'designed'], [bx('chip-r c-deferred'), 'deferred'],
    ]);
    const mk = (kind) => (v, x) => {
      s('line', {
        class: 'rail', x1: x, y1: 9, x2: x + 20, y2: 9,
      }, v);
      mark(v, kind, x + 10, 9);
    };
    legends.marks = legend('Session marks: square, read in the Sling job. Circle, read with the operator’s own session at submission. Half circle, split. Diamond, sealed at consent. Dot, live pulse.', [
      [mk('job'), 'in the job'], [mk('caller@submit'), 'operator’s session'], [mk('split'), 'split'],
      [mk('sealed at consent'), 'sealed at consent'], [mk('pulse'), 'live pulse'],
    ]);
    legends.marks.classList.add('lg-marks');

    state.built = true;
    state.scene = null;
    if (scrubIn) updateScrub();
    activate(state.beat, false);
    REDUCED.addEventListener('change', () => applyScene(state.scene));
  });
}
