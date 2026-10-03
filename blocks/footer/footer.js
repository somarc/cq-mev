import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer.
 * Each footer section is a column; with two or more sections, the last one is the base line.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  if (!fragment) return;
  const sections = [...fragment.querySelectorAll(':scope > .section')];
  const columns = document.createElement('div');
  columns.className = 'footer-columns';
  const base = sections.length > 1 ? sections.pop() : null;
  sections.forEach((s) => {
    s.classList.add('footer-column');
    columns.append(s);
  });
  block.append(columns);
  if (base) {
    base.classList.add('footer-base');
    block.append(base);
  }
}
