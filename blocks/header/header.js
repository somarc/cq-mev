import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/*
 * The nav document has up to three sections: brand (link and tagline), links, tools.
 * The links are a flat list (the story's chapters) or two levels: Story and Guide, each with
 * its own list. The header shows the top levels and the current level's links.
 * The story block announces its current chapter with a document event; the header marks it.
 */
const DESKTOP = window.matchMedia('(width >= 1000px)');
const CHAPTER_EVENT = 'anatomy-story:chapter';
const QUERY_EVENT = 'anatomy-story:query';

function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
  e.append(...kids);
  return e;
}

/* A list of links, copied as text. */
function linkList(links, cls, label) {
  if (!links.length) return null;
  const ul = el('ul', { class: cls, 'aria-label': label });
  links.forEach((a) => {
    const link = el('a', { href: a.getAttribute('href') });
    link.textContent = a.textContent.trim();
    if (link.host && link.host !== window.location.host) {
      link.setAttribute('rel', 'noopener');
      link.append(el('span', { class: 'nav-ext', 'aria-hidden': 'true' }, '↗'));
    }
    ul.append(el('li', null, link));
  });
  return ul;
}

/* The link that a list item names itself with (not a link of a nested list). */
function ownLink(li) {
  return [...li.querySelectorAll('a[href]')].find((a) => a.closest('li') === li);
}

/*
 * The nav's second section: either a flat list (the story's chapters) or two levels,
 * where each top item (Story, Guide) carries its own list of in-site links.
 */
function readLevels(section) {
  const top = section ? section.querySelector('ul') : null;
  if (!top) return [];
  const items = [...top.children].filter((li) => li.tagName === 'LI');
  if (!items.some((li) => li.querySelector('ul'))) {
    return [{ top: null, links: items.map(ownLink).filter(Boolean) }];
  }
  return items.map((li) => ({
    top: ownLink(li),
    links: [...li.querySelectorAll(':scope > ul > li')].map(ownLink).filter(Boolean),
  })).filter((l) => l.top);
}

const pathOf = (href) => new URL(href, window.location).pathname.replace(/(.)\/$/, '$1');

/* The level that this page belongs to: the longest top path that holds the page. */
function currentLevel(levels) {
  const here = pathOf(window.location.href);
  let best = 0;
  let bestLen = -1;
  levels.forEach((l, i) => {
    if (!l.top) return;
    const p = pathOf(l.top.getAttribute('href'));
    const holds = p === '/' ? here === '/' : (here === p || here.startsWith(`${p}/`));
    if (holds && p.length > bestLen) {
      best = i;
      bestLen = p.length;
    }
  });
  return best;
}

function buildBrand(section) {
  const brand = el('div', { class: 'nav-brand' });
  const src = section && section.querySelector('a[href]');
  const home = el('a', { class: 'nav-home', href: src ? src.getAttribute('href') : '/' });
  const icon = section && section.querySelector('.icon');
  if (icon) home.append(icon);
  const name = (src ? src.textContent : '').trim() || document.title.split(':')[0] || 'Home';
  home.append(el('span', { class: 'nav-wordmark' }, name));
  brand.append(home);
  const tag = section && [...section.querySelectorAll('p')].find((p) => !p.querySelector('a') && p.textContent.trim());
  if (tag) brand.append(el('p', { class: 'nav-tagline' }, tag.textContent.trim()));
  return brand;
}

/* The id that a link points to on this page, or ''. */
function hashOf(a) {
  return a.pathname === window.location.pathname && a.hash ? decodeURIComponent(a.hash.slice(1)) : '';
}

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  block.textContent = '';
  const sections = fragment ? [...fragment.querySelectorAll(':scope > .section')] : [];

  const nav = el('nav', { id: 'nav', 'aria-label': 'Site' });
  nav.append(buildBrand(sections[0]));

  const menu = el('div', { class: 'nav-menu', id: 'nav-menu' });
  const levels = readLevels(sections[1]);
  const cur = currentLevel(levels);
  /* links into this page (the story's chapters) are marked by the story's chapter event */
  const inPage = levels.length > 0 && levels[cur].links.some((a) => {
    const u = new URL(a.getAttribute('href'), window.location);
    return u.pathname === window.location.pathname && u.hash;
  });

  /* top levels (Story, Guide), each a link; the current one is marked */
  let switcher = null;
  if (levels.length > 1) {
    switcher = el('ul', { class: 'nav-levels', 'aria-label': 'Site sections' });
    levels.forEach((l, i) => {
      const a = el('a', { class: 'nav-level', href: l.top.getAttribute('href') });
      a.textContent = l.top.textContent.trim();
      if (i === cur) a.setAttribute('aria-current', pathOf(a.href) === pathOf(window.location.href) ? 'page' : 'true');
      const li = el('li', { class: 'nav-level-item' }, a);
      li.style.setProperty('--nav-order', String(i * 2));
      switcher.append(li);
    });
  }

  /* the current level's links: the story's chapters, or the guide's pages */
  const label = inPage ? 'Chapters' : 'Pages';
  const chapters = levels.length ? linkList(levels[cur].links, 'nav-chapters', label) : null;
  if (chapters) {
    chapters.style.setProperty('--nav-order', String(cur * 2 + 1));
    [...chapters.querySelectorAll('a')].forEach((a, i) => {
      a.prepend(el('span', { class: 'nav-n', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')));
      if (!inPage && pathOf(a.href) === pathOf(window.location.href)) a.setAttribute('aria-current', 'page');
    });
  }
  const toolSection = sections[2];
  const tools = linkList(toolSection ? [...toolSection.querySelectorAll('a[href]')] : [], 'nav-tools', 'Tools');
  menu.append(...[switcher, chapters, tools].filter(Boolean));

  const toggle = el('button', {
    type: 'button', class: 'nav-toggle', 'aria-controls': 'nav-menu', 'aria-expanded': 'false',
  }, el('span', { class: 'nav-toggle-icon', 'aria-hidden': 'true' }), el('span', { class: 'nav-toggle-label' }, chapters ? label : 'Menu'));
  if (menu.children.length) nav.append(toggle, menu);

  /* skip link: to main, which takes focus */
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main';
  if (main) main.setAttribute('tabindex', '-1');
  const skip = el('a', { class: 'nav-skip', href: `#${main ? main.id : ''}` }, 'Skip to content');

  const wrapper = el('div', { class: 'nav-wrapper' }, nav);
  block.append(skip, wrapper);

  /* ---------- the mobile menu ---------- */
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  function setOpen(open, focusToggle) {
    const o = open && !DESKTOP.matches;
    toggle.setAttribute('aria-expanded', String(o));
    nav.classList.toggle('is-open', o);
    document.body.style.overflowY = o ? 'hidden' : '';
    if (focusToggle) toggle.focus();
  }
  setOpen(false);
  toggle.addEventListener('click', () => {
    setOpen(!isOpen());
    if (isOpen()) {
      const first = menu.querySelector('.nav-chapters [aria-current]') || menu.querySelector('a');
      if (first) first.focus();
    }
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.stopPropagation();
      setOpen(false, true);
    }
  });
  nav.addEventListener('focusout', (e) => {
    if (isOpen() && e.relatedTarget && !nav.contains(e.relatedTarget)) setOpen(false);
  });
  DESKTOP.addEventListener('change', () => setOpen(false));

  /* ---------- the current chapter ---------- */
  const chapterLinks = chapters && inPage ? [...chapters.querySelectorAll('a')] : [];
  document.addEventListener(CHAPTER_EVENT, (e) => {
    const { id, active } = e.detail || {};
    chapterLinks.forEach((a) => {
      if (active && id && hashOf(a) === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  });
  document.dispatchEvent(new CustomEvent(QUERY_EVENT));
}
