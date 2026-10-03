/*
 * facts-stamp: renders the facts behind the page from /data/cq-mev-facts.json,
 * so the stamp cannot drift from the data.
 * Authored: one cell with an optional heading and intro.
 * Default: meta (scope, commit, release, descriptor schema) and a link to the JSON.
 * Variant "rules": the house rules.
 */
import { FACTS_PATH, loadFacts } from '../../scripts/facts.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function factsLink() {
  const a = el('a', 'facts-stamp-json');
  a.href = FACTS_PATH;
  a.append('Facts file ', el('span', 'facts-stamp-tag', 'JSON'));
  return a;
}

function renderMeta(meta) {
  const dl = el('dl', 'facts-stamp-meta');
  [
    ['Scope', meta.scope],
    ['cq-mev commit', meta.cqMevCommit, true],
    ['Release', meta.release, true],
    ['Descriptor schema', meta.descriptorSchema, true],
  ].forEach(([k, v, code]) => {
    if (!v) return;
    const dd = el('dd');
    dd.append(code ? el('code', null, v) : v);
    const row = el('div');
    row.append(el('dt', null, k), dd);
    dl.append(row);
  });
  const out = [dl];
  if (meta.facts) out.push(el('p', 'facts-stamp-note', meta.facts));
  return out;
}

export default async function decorate(block) {
  const intro = el('div', 'facts-stamp-intro');
  block.querySelectorAll(':scope > div > div').forEach((cell) => intro.append(...cell.childNodes));
  block.textContent = '';
  if (intro.textContent.trim()) block.append(intro);

  const body = el('div', 'facts-stamp-body');
  block.append(body);
  const rules = block.classList.contains('rules');
  try {
    const F = await loadFacts();
    if (rules) {
      const ul = el('ul', 'facts-stamp-rules');
      (F.houseRules || []).filter((r) => typeof r === 'string').forEach((r) => ul.append(el('li', null, r)));
      body.append(ul);
    } else {
      body.append(...renderMeta(F.meta || {}));
      const p = el('p', 'facts-stamp-link');
      p.append(factsLink());
      body.append(p);
    }
  } catch (e) {
    const p = el('p', 'facts-stamp-error', `The facts file could not load (${e.message}). `);
    p.append(factsLink());
    body.append(p);
  }
}
