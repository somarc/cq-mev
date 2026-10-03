/*
 * The facts file: one fetch per page, shared by the blocks and templates that need it.
 */
export const FACTS_PATH = '/data/cq-mev-facts.json';
let facts;

export function loadFacts() {
  if (!facts) {
    const base = (window.hlx && window.hlx.codeBasePath) || '';
    facts = fetch(`${base}${FACTS_PATH}`).then((resp) => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.json();
    });
  }
  return facts;
}

/*
 * Facts strings carry a little Markdown: `code` and **strong**.
 * Returns DOM nodes made from text only.
 */
export function inlineNodes(text) {
  const out = [];
  String(text || '').split(/(`[^`]+`|\*\*[^*]+\*\*)/).forEach((part) => {
    if (!part) return;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      const c = document.createElement('code');
      c.textContent = part.slice(1, -1);
      out.push(c);
    } else if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
      const s = document.createElement('strong');
      s.textContent = part.slice(2, -2);
      out.push(s);
    } else {
      out.push(document.createTextNode(part));
    }
  });
  return out;
}
