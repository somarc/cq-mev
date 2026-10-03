/* Small DOM and SVG helpers for anatomy-story. textContent and createElement(NS) only. */
export const NS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, parent, text) {
  const e = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v != null) e.setAttribute(k, v);
    });
  }
  if (text != null) e.textContent = text;
  if (parent) parent.append(e);
  return e;
}

export function s(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v != null) e.setAttribute(k, String(v));
    });
  }
  if (text != null) e.textContent = text;
  if (parent) parent.append(e);
  return e;
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
}

export function byId(list, id) {
  return (list || []).find((x) => x.id === id) || null;
}

/* Remove Markdown marks that some fact strings carry. */
export function plain(t) {
  return String(t == null ? '' : t).replace(/[`*]/g, '');
}

/* Wrap words into lines of at most n characters. */
export function wrapWords(text, n) {
  const out = [];
  let line = '';
  String(text).split(' ').forEach((w) => {
    if (line && `${line} ${w}`.length > n) {
      out.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  });
  if (line) out.push(line);
  return out;
}

export function norm(t) {
  return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/*
 * The registry: diagram groups by key, with their detail info.
 * A key can hold several groups. A wildcard key ends in '*'.
 */
export function createRegistry() {
  const K = {};
  const INFO = new WeakMap();
  const FOCUSABLE = [];
  return {
    K,
    INFO,
    FOCUSABLE,
    reg(key, g) {
      g.classList.add('k', 'is-off');
      g.setAttribute('data-key', key);
      (K[key] = K[key] || []).push(g);
      return g;
    },
    focusable(g, info) {
      g.setAttribute('tabindex', '-1');
      g.setAttribute('role', 'button');
      const first = info.lines && info.lines.length ? `. ${info.lines[0]}` : '';
      g.setAttribute('aria-label', `${info.title}${first}`);
      g.classList.add('f');
      INFO.set(g, info);
      FOCUSABLE.push(g);
      return g;
    },
    expand(list) {
      const out = [];
      (list || []).forEach((k) => {
        if (k.endsWith('*')) {
          const p = k.slice(0, -1);
          Object.keys(K).forEach((x) => {
            if (x.startsWith(p)) out.push(x);
          });
        } else {
          out.push(k);
        }
      });
      return out;
    },
  };
}
