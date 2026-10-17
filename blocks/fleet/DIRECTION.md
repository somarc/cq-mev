# Fleet: direction lock

Locked 2026-10-17 with `eds-wow-stack`. The operator pointed at plate B of three (artifact
`fleet-plates/contact-sheet.png`, drawn from the mev-fleet simulation: 620 servers, 120 tenants, 26 weeks).

```text
Wow-stack: eds-wow-stack
Scout: 2026-10-17
Heat: one mark per real thing (Paris 122,435 buildings; Nobel 600+ curves; The Pudding's 1,500 people)
      · paper and drafting line, a monospace readout, one red rule (Heron AI)
      · canvas for the mass, SVG for the one (Kabanov)
Anti-heat: KPI card rows, skeleton shimmer, donuts (Cloudflare Radar) · uptime bars and traffic lights (status pages)
      · loader-gated dark WebGL with neon
Mapped: other: unit-visualization strip chart (chart-recorder seismogram)
EDS path: house system for this room only: one block, canvas for the mass, SVG for the one, no WebGL, no dependency
Cite: https://elia.kabanov.org/nobel/ · https://heronaiapp.com/ · https://paris.bogachev.fr/
System: other: unit-visualization strip chart
Depth: house
Forbidden sibling: the first Fleet dashboard (somarc/cq-mev#13) and the cq-mev house palette
Custom object: the fleet seismogram
Loved media job: none (every mark is data)
```

## The five fields

1. **Thesis.** The fleet is a seismograph: every server writes one line, and trouble is a tremor you can watch travel.
2. **System and depth.** Unit-visualization strip chart (chart-recorder seismogram), a house system for this room.
   Nearest neighbours it is not: a ridgeline plot (density per category), a raster heatmap ("stripes"), a horizon chart.
3. **Forbidden sibling.**
   - Palette: `#fafbf7` paper, `#222323` ink, `#bf3324` red, `#346249` green. The room uses chart paper `#f2eee3`,
     grid `#c9d6d2`, trace ink `#20201c` and one red `#d23a1e`.
   - Skeleton: the KPI card row, bordered tables and severity badges of #13 are gone.
   - Type: the readouts are monospace; the page's prose above the room stays in the house sans.
   - Generated stills: none. Every mark is data.
4. **One custom object.** The fleet seismogram: one trace per server on chart-recorder paper.
5. **Sibling glance.** At 1440 px, open `/fleet` and `/how-it-works`. If a stranger could swap them, it fails.

## Law, silence and motion

- **Law:** time runs left to right. One trace is one server. Red belongs to one finding at a time.
- **The legend is the controller.** The finding index selects the red finding. Each row shows its spread over the
  weeks and its distance to the publication gate (at least 10 servers in 5 tenants), as facts, not adjectives.
- **The one:** a pointer or focus on a trace draws that server in SVG with a monospace readout.
- **Silence:** no KPI cards, no donuts, no traffic lights, no dark mode, no loader overture, no scroll-jack, no
  second chroma.
- **Motion:** the pen writes once, left to right, in about 1.2 s on first draw. Never with `prefers-reduced-motion`.
  The still is the poster.
- **Room exception:** the room sits inside the cq-mev house chrome (header, nav, footer and the page intro stay the
  house's). Its field begins at the block and runs full-bleed.
- **Truth:** the live view shows only real digests. The simulated fleet is a separate, labelled view of synthetic
  data and never mixes with live.

## Producer-taste (2026-10-17, on the preview through the operators' address, 1440 px and 390 px)

```text
Subject: the fleet of AEM servers
Object:  the seismogram (one trace per server on chart-recorder paper)
Law:     one trace = one server; red = one finding at a time; a change is a tremor
Silence: cards, donuts, traffic lights, dark mode, loaders, scroll-jack, a second chroma
Veto:    keep
```

- Stranger name: "a seismograph of many machines, with a red disturbance moving through it." Pass.
- One object, one law, silence named, technique hidden (the page never names canvas or SVG). Pass.
- Sibling glance against `/how-it-works` at 1440 px: house paper, sans and grey anatomy boxes there; chart paper,
  drafting grid, monospace and one red here. Pass.
- Honest limit: the live view is one quiet trace (local4502) until more servers enrol. The labelled simulated fleet
  shows the object at 620 servers: a regression arrives as a red staircase, a chronic landmine as steady red threads.

Decisions made on the preview: a change is a tremor (the pen jolts up in a week when findings appear and dips when
they clear, in proportion to their weight); the pen stays on the paper; each sparkline uses its own scale.
