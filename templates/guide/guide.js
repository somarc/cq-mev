/*
 * The guide template: a long-form reading layout.
 * - Headings get ids where the pipeline gave none (the same slug rule as the pipeline).
 * - A side table of contents from the page's h2s; the current section is marked while scrolling.
 * - Previous and next page links, in the order of the nav document's Guide list.
 * - The Guide-Source stamp: the GUIDE.md commit that the page was converted from.
 */
import { getMetadata } from '../../scripts/aem.js';
import { FACTS_PATH, loadFacts } from '../../scripts/facts.js';

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
  e.append(...kids.filter((k) => k !== null && k !== undefined && k !== ''));
  return e;
}

/* github-slugger, as the EDS pipeline uses it for heading ids */
function slug(text) {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

function ensureIds(main) {
  const seen = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
  main.querySelectorAll('h1, h2, h3, h4').forEach((h) => {
    if (h.id) return;
    const base = slug(h.textContent) || 'section';
    let id = base;
    for (let i = 1; seen.has(id); i += 1) id = `${base}-${i}`;
    seen.add(id);
    h.id = id;
  });
}

function buildToc(main, h2s) {
  const list = el('ol');
  const links = h2s.map((h) => {
    const a = el('a', { href: `#${h.id}`, class: 'guide-toc-link' }, h.textContent.trim());
    list.append(el('li', null, a));
    return a;
  });
  const toc = el(
    'nav',
    { class: 'guide-toc', 'aria-labelledby': 'guide-toc-title' },
    el('div', { class: 'guide-toc-inner' }, el('p', { class: 'guide-toc-title', id: 'guide-toc-title' }, 'On this page'), list),
  );

  /* the current section: the last h2 above a line under the header */
  let ticking = false;
  function mark() {
    ticking = false;
    const line = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 56) + 96;
    let current = -1;
    h2s.forEach((h, i) => {
      if (h.offsetParent && h.getBoundingClientRect().top <= line) current = i;
    });
    const atEnd = window.scrollY > 0
      && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atEnd && h2s.length) current = h2s.length - 1;
    links.forEach((a, i) => {
      if (i === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
  const queue = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(mark);
    }
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
  queue();
  return toc;
}

/* The guide's pages, in order, from the nav document's list whose top link is /guide. */
async function guidePages() {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) return [];
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  const top = [...doc.querySelectorAll('li')].find((li) => {
    const a = [...li.querySelectorAll('a')].find((x) => x.closest('li') === li);
    return a && new URL(a.getAttribute('href'), window.location).pathname === '/guide' && li.querySelector('ul');
  });
  if (!top) return [];
  return [...top.querySelectorAll(':scope > ul > li > a')].map((a) => ({
    path: new URL(a.getAttribute('href'), window.location).pathname.replace(/\/$/, '') || '/',
    label: a.textContent.trim(),
  }));
}

async function fillPager(nav) {
  try {
    const pages = await guidePages();
    const here = window.location.pathname.replace(/\/$/, '');
    const i = pages.findIndex((p) => p.path === here);
    if (i < 0) return;
    const link = (p, rel, label) => el(
      'a',
      { href: p.path, rel, class: `guide-pager-link guide-pager-${rel}` },
      el('span', { class: 'guide-pager-label' }, label),
      el('span', { class: 'guide-pager-title' }, p.label),
    );
    if (pages[i - 1]) nav.append(link(pages[i - 1], 'prev', 'Previous'));
    if (pages[i + 1]) nav.append(link(pages[i + 1], 'next', 'Next'));
  } catch (e) {
    // no pager without the nav document
  }
}

function sourceStamp(commit) {
  const p = el('p', { class: 'guide-source' }, 'Converted from ', el('code', null, 'docs/GUIDE.md'), ' at commit ', el('code', null, commit), '.');
  loadFacts().then((F) => {
    const factsAt = F.meta && F.meta.cqMevCommit;
    if (!factsAt) return;
    const a = el('a', { href: FACTS_PATH }, 'facts file');
    if (factsAt === commit) p.append(' The recipe facts in the ', a, ' come from the same commit.');
    else p.append(' The recipe facts in the ', a, ' come from commit ', el('code', null, factsAt), '.');
  }).catch(() => {});
  return p;
}

export default function decorate(main) {
  ensureIds(main);
  const sections = [...main.querySelectorAll(':scope > .section')];
  const h2s = [...main.querySelectorAll('.default-content-wrapper > h2')];

  if (h2s.length >= 2 && sections.length) {
    const toc = buildToc(main, h2s);
    sections[0].after(toc);
    main.classList.add('guide-has-toc');
  }

  /* the last section: previous and next, and the source stamp */
  const pager = el('nav', { class: 'guide-pager', 'aria-label': 'Guide pages' });
  const end = el('div', { class: 'guide-end' }, pager);
  const commit = getMetadata('guide-source');
  if (commit) end.append(sourceStamp(commit));
  const section = el('div', { class: 'section guide-end-container' }, end);
  main.append(section);
  main.style.setProperty('--guide-rows', String(sections.length + 1));
  fillPager(pager);
}
