# The guide document contract

This file is for maintainers. `.hlxignore` keeps it off the site.

The operator's guide at `/guide` has one prose source: `docs/GUIDE.md` in the private cq-mev repository.
The real converter is `tools/site_export.py` in the private cq-mev repo (PR #346). It turns GUIDE.md at one
commit into DA documents. Its output replaces the hand-made samples; the site code must not need a change.

The samples (fixtures for this contract) are in the Studio artifact folder `site-content/guide.html` and
`site-content/guide/*.html`. Local copies for `aem up --html-folder drafts` go to `drafts/` (ignored).

## Pages

One DA document for each page. Order = header order = previous/next order.

| DA path | File | GUIDE.md part | h1 |
|---|---|---|---|
| `/guide` | `guide.html` | `#` title, preamble, section 1, index | `cq-mev: a guide for someone who wasn't there` |
| `/guide/install` | `guide/install.html` | section 2 | `Install, access and uninstall` |
| `/guide/pulse` | `guide/pulse.html` | section 3 | `The pulse, and what pauses captures` |
| `/guide/captures` | `guide/captures.html` | section 4 | `Choosing a capture by symptom` |
| `/guide/findings` | `guide/findings.html` | section 5 | `Reading a finding` |
| `/guide/compare` | `guide/compare.html` | section 6 | `Comparing runs, baselines and purge` |
| `/guide/questions` | `guide/questions.html` | section 7 | `A day in the life: three questions` |
| `/guide/glossary` | `guide/glossary.html` | section 8 | `Glossary` |

The landing is `guide.html` (DA path `/guide`), not `guide/index.html`.
The unnumbered "Where to read next" section is not exported.

## Document shape

DA source HTML, as in the other site documents: `<body><header></header><main>` with one `<div>` for each
section, then `</main><footer></footer></body>`.

- **First section (topic pages):** `<h1>` = the GUIDE `##` title without its number, then the intro: everything
  before the section's first `###`. The intro can be empty (sections 2, 6 and 8 have none), and it can hold
  tables and lists (section 3, section 4).
- **Each GUIDE `###`** becomes an `<h2>` that starts a new section. A GUIDE `####` would be an `<h3>`.
- **Landing:** `<h1>` = the GUIDE `#` title. Its first section holds the preamble paragraphs and the
  "Draft status" note as `<blockquote>`. Then section 1's three `###` as `<h2>` sections. Then a last section:
  `<h2>In this guide</h2>` and a `<ul>`, one `<li>` for each topic page:
  `<li><a href="/guide/install">Install, access and uninstall</a>: first sentence of that page's lead</li>`
  (no colon and no sentence when the page has no lead).
- **Lists** stay `ul`/`ol`; nested lists and paragraphs inside items are kept.
  A table inside a list item ends the list; the table block follows; the list goes on as `<ol start="N">`.
- **Code blocks** become `<pre><code>`. Inline code stays `<code>`. Emphasis stays `<strong>`/`<em>`.
- **Mermaid:** the section 1 flywheel becomes an `<ol>` of its node labels, in edge order:
  Capture (one recipe, bounded) / Sealed snapshot + SHA-256 / Findings: evidence · why · not proven · next check /
  Compare with an earlier run / A person acts (outside cq-mev), then capture again.

## Blocks

Every block cell wraps its content in `<p>` (`<div><p>…</p></div>`), as DA does. The site also accepts a cell
without the `<p>`, because the EDS pipeline can unwrap a single paragraph.

### `table`

A Markdown table becomes `<div class="table">`: one row `<div>` for each table row, one cell `<div>` for each
column. The first row is the header row. Cells keep inline code, emphasis and links. The block renders a real
`<table>` with `<thead>`, scrolls horizontally on narrow screens, and lets long `code` break.

### `capture-finder` (on `/guide/captures` only)

It replaces the section 4 table; there is no separate table. One row for each GUIDE table row, in order,
no header row:

1. the symptom (inline HTML, can hold `<code>` and `<strong>`);
2. the recipe id as plain text, for example `osgi-settings@1`: no †, no "(service-user mappings)" note.

The block joins each id with `recipes[].id` in `/data/cq-mev-facts.json` and shows the name, question, layer,
`cost`, `readsFrom`, `neverReads`, `findings`, and whether the recipe reads with the operator's session
(`callerSession`, the †; the explanation text comes from `sessions`). Layer chips follow
`layers.consoleOrder`. The Cost and Never reads columns of GUIDE.md are therefore not in the document: they come
from the facts file, which takes them from the same recipe descriptors (#315).

### `metadata` (last block of each page, in the last section)

Rows in this order:

| Key | Value |
|---|---|
| Title | `cq-mev guide` (landing); `<h1 text> · cq-mev guide` (topic pages) |
| Description | first sentence of the lead, plain text (empty when the page has no lead) |
| Template | `guide` |
| Guide-Source | the short GUIDE.md commit, for example `b859c1e` |

`Template: guide` loads `templates/guide/` (layout, table of contents, previous/next, source stamp).
`Guide-Source` is shown at the end of the page, with a note if the facts file comes from another commit.

## Links

- Only mapped links stay links:
  - House rules (`../README.md#house-rules`) → `/#rules`;
  - the story-beat links that the converter adds in section 7 (below).
- Every other link keeps only its text. That includes links into the private repository and any `https` link.
- A parenthetical that holds only private links is removed whole, for example
  "([Run conditions](../cq-mev-helper/README.md#run-conditions))". In a mixed parenthetical, the links go and
  the other text stays: "([CONTRIBUTING](…), #225, #322)" → "(#225, #322)".
- Guide-internal links, if GUIDE.md gets any, point to `/guide/<page>#<anchor>`. The anchor is the heading id
  that the EDS pipeline makes (github-slugger: lowercase, punctuation removed, spaces → `-`). The guide template
  makes the same ids when a heading has none.
- Issue numbers stay plain text (`#317`).

### Section 7: story links

Right after each question's `<h2>`, one paragraph:
`<p><a href="/#slow-1">Follow this question in the story</a></p>`.

| Question | Story beat |
|---|---|
| "The author got slow after this morning's deploy. Why?" | `/#slow-1` |
| "Is this package safe to uninstall?" | `/#uninstall-1` |
| "Is async indexing healthy?" | `/#indexing-1` |

## Public content: scrub rules

The site covers only `cq-mev-helper`, its model connectors and the direction.

1. **Preflight:** drop every sentence that names preflight or pre-flight. Today that removes "Authoring
   pre-flight has its own README, and model connectors have theirs." (preamble) and "Preflight is a separate
   package." (section 2, Install, step 2).
2. **Test instances:** "one AMS clone (Oak 1.88.0, the oldest target)" → "a second AEM 6.5 author on Oak 1.88.0,
   the oldest tested target". Any other parenthetical that only names that instance ("(the AMS clone)") is
   removed. Links to instance runbooks or evaluations go by the link rule above.
3. **No client names, no instance names or hosts, no private records.** The output must not
   contain `AMS`, a client name, `clone runbook` or a host name. "A declared clone" stays: it is the helper's
   instance-role vocabulary (blob-store@1, recipe grades), not an instance.
4. **No mermaid source, no raw Markdown** in the output.

## Site files that depend on this contract

- `templates/guide/guide.js`, `guide.css`: layout, ids, table of contents, previous/next, `Guide-Source` stamp.
- `blocks/table/`, `blocks/capture-finder/`.
- `blocks/header/`: reads the nav document's second section as two levels (Story, Guide). The Guide level's list
  is the page order for previous/next.
- `scripts/facts.js`: the shared facts loader.
