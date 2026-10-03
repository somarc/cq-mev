/*
 * capture-finder: choose a capture by symptom.
 * Authored: one row per symptom, two cells: the symptom (inline content) and a recipe id.
 * Each id joins the facts file's recipes[]: cost, reads, never reads, findings, and whether
 * the recipe reads with the operator's own session (the †).
 * Text only: authored nodes are moved or cloned; facts strings become text and <code>.
 */
import { loadFacts, inlineNodes } from '../../scripts/facts.js';

let uid = 0;

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
  });
  e.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== ''));
  return e;
}

/* The inline content of a cell, with or without its <p> wrapper. */
function cellNodes(cell) {
  if (!cell) return [];
  const only = cell.children.length === 1 && cell.firstElementChild.tagName === 'P'
    ? cell.firstElementChild : cell;
  return [...only.childNodes].map((n) => n.cloneNode(true));
}

function sessionAnswer(recipe, sessions) {
  const S = sessions || {};
  if (recipe.callerSession) {
    const how = recipe.sealed === 'job' ? S.split : S['caller@submit'];
    return [el('strong', null, 'Yes (†). '), ...inlineNodes(recipe.callerSession), '. ', how || ''];
  }
  const how = recipe.sealed === 'job' ? S.job : S['sealed at consent'];
  return [el('strong', null, 'No. '), how || ''];
}

function findingsText(findings) {
  if (!findings) return ['None'];
  if (findings === 'grades') return ['Recipe grades (', el('code', null, 'code'), ', ', el('code', null, 'message'), ', ', el('code', null, 'severity'), ')'];
  return [el('code', null, findings)];
}

function detail(recipe, F, layerLabel) {
  const dl = el('dl', { class: 'capture-finder-facts' });
  const row = (k, ...v) => dl.append(el('div', null, el('dt', null, k), el('dd', null, ...v)));
  row('Layer', layerLabel);
  row('Cost', ...inlineNodes(recipe.cost));
  const reads = (recipe.readsFrom || []).map((r) => el('li', null, ...inlineNodes(r)));
  row('Reads', reads.length ? el('ul', null, reads) : '—');
  row('Never reads', ...inlineNodes(recipe.neverReads));
  row('Reads with your session', ...sessionAnswer(recipe, F.sessions));
  row('Findings', ...findingsText(recipe.findings));
  const head = el('p', { class: 'capture-finder-recipe' }, el('strong', null, recipe.name || recipe.id));
  if (recipe.question) head.append(el('span', { class: 'capture-finder-question' }, ...inlineNodes(recipe.question)));
  return [head, dl];
}

export default async function decorate(block) {
  const rows = [...block.children].map((row) => {
    const [symptom, id] = [...row.children];
    return { symptom: cellNodes(symptom), id: (id ? id.textContent : '').trim() };
  }).filter((r) => r.id || r.symptom.length);
  block.textContent = '';
  uid += 1;
  const n = `capture-finder-${uid}`;

  let F = {};
  let error = '';
  try {
    F = await loadFacts();
  } catch (e) {
    error = e.message;
  }
  const recipes = new Map((F.recipes || []).map((r) => [r.id, r]));
  const layerItems = new Map(((F.layers && F.layers.items) || []).map((l) => [l.id, l]));
  const order = ((F.layers && F.layers.consoleOrder) || []).filter((id) => layerItems.has(id));

  /* ---------- controls ---------- */
  const input = el('input', {
    id: `${n}-q`, type: 'search', list: `${n}-symptoms`, autocomplete: 'off', spellcheck: 'false', placeholder: 'For example: backlog, uninstall, indexing',
  });
  const datalist = el('datalist', { id: `${n}-symptoms` }, rows.map((r) => el('option', { value: r.symptom.map((x) => x.textContent).join('').trim() })));
  const chips = el('div', { class: 'capture-finder-chips', role: 'group', 'aria-label': 'Layer' });
  const chip = (id, label, sub) => el('button', { type: 'button', 'data-layer': id, 'aria-pressed': id ? 'false' : 'true' }, label, sub ? el('span', null, sub) : null);
  chips.append(chip('', 'All layers'));
  order.forEach((id) => {
    const l = layerItems.get(id);
    chips.append(chip(id, l.label, l.consoleGroup));
  });
  const status = el('p', { class: 'capture-finder-status', 'aria-live': 'polite' });
  block.append(el(
    'div',
    { class: 'capture-finder-controls' },
    el('label', { for: input.id }, 'Type or pick a symptom'),
    input,
    datalist,
    order.length ? chips : null,
  ), status);

  /* ---------- the list ---------- */
  const list = el('ul', { class: 'capture-finder-list' });
  const items = rows.map((r) => {
    const recipe = recipes.get(r.id);
    const layer = recipe ? layerItems.get(recipe.layer) : null;
    const layerLabel = layer ? layer.label : '';
    const meta = el(
      'span',
      { class: 'capture-finder-meta' },
      el('code', null, r.id || '?'),
      layerLabel ? el('span', { class: 'capture-finder-layer' }, layerLabel) : null,
      recipe && recipe.callerSession
        ? el('span', { class: 'capture-finder-dagger', title: 'Reads with your own session' }, el('span', { 'aria-hidden': 'true' }, '†'), el('span', { class: 'capture-finder-sr' }, 'Reads with your own session'))
        : null,
    );
    const summary = el('summary', null, el('span', { class: 'capture-finder-symptom' }, r.symptom), meta);
    let body;
    if (recipe) body = detail(recipe, F, layer ? `${layer.label} (${layer.consoleGroup || layer.label})` : recipe.layer);
    else if (error) body = [el('p', null, 'The recipe facts could not load.')];
    else body = [el('p', null, 'This recipe is not in the facts file.')];
    const details = el('details', null, summary, el('div', { class: 'capture-finder-detail' }, body));
    const li = el('li', { 'data-layer': recipe ? recipe.layer : '' }, details);
    list.append(li);
    const hay = [
      summary.textContent, recipe && recipe.name, recipe && recipe.question, layerLabel,
      layer && layer.consoleGroup,
    ].filter(Boolean).join(' ').toLowerCase();
    return {
      li, details, hay, text: r.symptom.map((x) => x.textContent).join('').trim(),
    };
  });
  block.append(list);
  const empty = el('p', { class: 'capture-finder-empty', hidden: true }, 'No symptom matches. Clear the search or choose All layers.');
  block.append(empty);

  if (F.sessions && F.sessions['caller@submit']) {
    block.append(el('p', { class: 'capture-finder-legend' }, el('span', { class: 'capture-finder-mark', 'aria-hidden': 'true' }, '† '), F.sessions['caller@submit']));
  }
  if (error) {
    const a = el('a', { href: '/data/cq-mev-facts.json' }, 'the facts file');
    block.append(el('p', { class: 'capture-finder-error' }, `The recipe facts could not load (${error}). See `, a, '.'));
  }

  /* ---------- filtering ---------- */
  let layerFilter = '';
  function apply() {
    const q = input.value.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach((it) => {
      const ok = (!layerFilter || it.li.dataset.layer === layerFilter)
        && tokens.every((t) => it.hay.includes(t));
      it.li.hidden = !ok;
      if (ok) shown += 1;
    });
    empty.hidden = shown > 0;
    status.textContent = `${shown} of ${items.length} symptoms`;
    /* a picked symptom (exact text) opens its recipe */
    const exact = items.find((it) => !it.li.hidden && it.text.toLowerCase() === q);
    if (exact) exact.details.open = true;
  }
  input.addEventListener('input', apply);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const first = items.find((it) => !it.li.hidden);
    if (!first) return;
    e.preventDefault();
    first.details.open = true;
    first.details.querySelector('summary').focus();
  });
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    layerFilter = b.dataset.layer;
    chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  });
  apply();

  /* print: every recipe open */
  let wasOpen = [];
  window.addEventListener('beforeprint', () => {
    wasOpen = items.map((it) => it.details.open);
    items.forEach((it) => { it.details.open = true; });
  });
  window.addEventListener('afterprint', () => {
    items.forEach((it, i) => { it.details.open = wasOpen[i]; });
  });
}
