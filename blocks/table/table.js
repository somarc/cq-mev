/*
 * table: a real <table>. The first row is the header row.
 * Cells keep their inline content (code, links, emphasis). A cell may hold one <p>,
 * several, or bare inline content; a single <p> is unwrapped.
 */
function fillCell(cell, src) {
  const ps = [...src.children].filter((c) => c.tagName === 'P');
  if (ps.length === 1 && src.children.length === 1) cell.append(...ps[0].childNodes);
  else cell.append(...src.childNodes);
}

export default function decorate(block) {
  const rows = [...block.children].filter((r) => r.children.length);
  if (!rows.length) return;
  const width = Math.max(...rows.map((r) => r.children.length));
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const cells = [...row.children];
    for (let c = 0; c < width; c += 1) {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'col';
      if (cells[c]) fillCell(cell, cells[c]);
      tr.append(cell);
    }
    (i === 0 ? thead : tbody).append(tr);
  });
  table.append(thead, tbody);

  /* a focusable, labelled scroll region, so keyboard users can scroll a wide table */
  const scroller = document.createElement('div');
  scroller.className = 'table-scroll';
  scroller.setAttribute('role', 'region');
  scroller.setAttribute('tabindex', '0');
  const heads = [...thead.querySelectorAll('th')].map((th) => th.textContent.trim()).filter(Boolean);
  scroller.setAttribute('aria-label', heads.length ? `Table: ${heads.join(', ')}` : 'Table');
  scroller.append(table);
  block.replaceChildren(scroller);
}
