import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/*
 * The nav document has up to three sections: brand (link and tagline), chapters, tools.
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

/* The links of one nav section, as a plain list. */
function linkList(section, cls, label) {
  const links = section ? [...section.querySelectorAll('a[href]')] : [];
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
  const chapters = linkList(sections[1], 'nav-chapters', 'Chapters');
  const tools = linkList(sections[2], 'nav-tools', 'Tools');
  if (chapters) {
    [...chapters.querySelectorAll('a')].forEach((a, i) => {
      a.prepend(el('span', { class: 'nav-n', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')));
    });
  }
  menu.append(...[chapters, tools].filter(Boolean));

  const toggle = el('button', {
    type: 'button', class: 'nav-toggle', 'aria-controls': 'nav-menu', 'aria-expanded': 'false',
  }, el('span', { class: 'nav-toggle-icon', 'aria-hidden': 'true' }), el('span', { class: 'nav-toggle-label' }, chapters ? 'Chapters' : 'Menu'));
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
    toggle.setAttribute('aria-label', o ? 'Close the chapter menu' : 'Open the chapter menu');
    nav.classList.toggle('is-open', o);
    document.body.style.overflowY = o ? 'hidden' : '';
    if (focusToggle) toggle.focus();
  }
  setOpen(false);
  toggle.addEventListener('click', () => {
    setOpen(!isOpen());
    if (isOpen()) {
      const first = menu.querySelector('[aria-current] , a');
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
  const chapterLinks = chapters ? [...chapters.querySelectorAll('a')] : [];
  document.addEventListener(CHAPTER_EVENT, (e) => {
    const { id, active } = e.detail || {};
    chapterLinks.forEach((a) => {
      if (active && id && hashOf(a) === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  });
  document.dispatchEvent(new CustomEvent(QUERY_EVENT));
}
