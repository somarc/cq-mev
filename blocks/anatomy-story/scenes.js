/* Known beat ids and their diagram states. Prose lives in the authored document, not here.
   Each scene has a short text equivalent of the drawing (alt),
   because the code draws the picture. */

const BASE_WIDE = ['frame', 'band:*', 'bandsub'];
const CAP = [['p:console'], ['p:routes', 'g:access', 'stop:access'], ['g:conditions', 'stop:conditions', 'p:pulse'],
  ['p:jobs', 'stop:single'], ['p:recipe', 'p:read'], ['p:store', 'p:write'], ['p:catalogs'], ['p:runview'],
  ['p:diffs'], ['p:exit', 'p:person']];
const CAPHI = { 4: ['p:jobs', 'p:recipe', 'p:read', 'band:oak'], 6: ['p:store', 'p:catalogs'] };
const QUESTIONS = { 'slow-after-deploy': 'slow', 'package-uninstall': 'uninstall', 'async-indexing': 'indexing' };
const Q6 = ['frame', 'band:*', 'bandsub', 'chip:*', 'r:pulse', 'r:console', 'r:catalogs', 'r:diffs'];
const X_ALL = ['x:*'];

// eslint-disable-next-line import/prefer-default-export
export function buildScenes(F, labelsOf) {
  const S = {};
  S.problem = {
    ch: 1,
    alt: 'One AEM author as six layers, from Content at the top to the JVM at the bottom. Four notes point at the place where each lesson hides: the persisted Sling jobs, Declarative Services, the maintenance windows and /etc/packages.',
    scene: {
      strata: 'wide', on: BASE_WIDE.concat(['lesson:*']), quiet: ['area:*'], hi: (F.lessons || []).map((l) => `area:${l.area}`),
    },
  };
  S.boundary = {
    ch: 2,
    alt: 'A cross-section of one AEM author, with the cq-mev column on the right. Each recipe is a line from the column into the layer it reads, with a mark on each area it reads. The mark shape tells the session.',
    scene: { view: 'boundary', on: X_ALL, hi: ['x:row:*', 'x:tile:*'] },
  };
  S['never-reads'] = {
    ch: 2,
    alt: 'The same cross-section. Each recipe line now shows, struck through, what the recipe never reads.',
    scene: {
      view: 'boundary', on: X_ALL, quiet: ['x:tile:*'], never: true,
    },
  };
  S.writes = {
    ch: 2,
    alt: 'The same cross-section, with the reads quiet. One red line goes from the helper into /var/cq-mev-helper/jobs, in the Oak layer. It is the only red line.',
    scene: {
      view: 'boundary', on: X_ALL, quiet: ['x:row:*', 'x:tile:*', 'x:gate'], hi: ['x:store', 'x:strip:helper'],
    },
  };
  S.outbound = {
    ch: 2,
    alt: 'The same cross-section. One line leaves through the connectors package and stops at a closed gate outside the author. The model provider sits past the gate, and no line reaches it.',
    scene: {
      view: 'boundary', on: X_ALL, quiet: ['x:row:*', 'x:tile:*', 'x:store'], hi: ['x:gate', 'x:strip:connectors', 'x:row:bundle-publisher-inference@2'],
    },
  };

  const flow = ((F.flows || [])[0] || { steps: [] }).steps;
  flow.forEach((st, i) => {
    const on = [];
    const quiet = [];
    CAP.forEach((keys, j) => (j <= i ? on : quiet).push(...keys));
    const hi = CAPHI[i] || CAP[i] || [];
    S[`capture-${i + 1}`] = {
      ch: 3,
      group: 'capture',
      step: i + 1,
      last: !st.blocks.length,
      alt: `The capture path inside cq-mev, top to bottom: console, routes, access gate, run conditions, job service, recipe, sealed store, catalogs, run view, diffs, and a person outside. Highlighted: ${labelsOf(hi)}.`,
      scene: {
        strata: 'narrow', on: ['frame'].concat(on), quiet: ['band:*'].concat(quiet), hi,
      },
    };
  });

  S.finding = {
    ch: 4,
    alt: 'The sealed store feeds the catalogs. One finding opens beside them, with four parts: evidence and subjects, why, not proven, next check.',
    scene: {
      strata: 'narrow', on: ['frame', 'p:store'], quiet: ['band:*', 'p:console', 'p:routes', 'g:access', 'g:conditions', 'p:pulse', 'p:jobs', 'p:recipe', 'p:read'], hi: ['p:catalogs', 'finding'],
    },
  };
  S.unknown = {
    ch: 4,
    alt: 'Five rows pair what cq-mev says with what it never says: not-registered is never zero, not-readable is never empty, notChecked is never a pass, at least N is never a full count, none found is never a clean bill of health.',
    scene: {
      strata: 'narrow', on: ['frame'], quiet: ['band:*'], hi: ['unknown'],
    },
  };
  S.compare = {
    ch: 5,
    alt: 'Two sealed runs side by side, matched row by row by subject key. Five outcomes: new, gone, still, changed, not comparable. Below: the three diffs that are built, and the catalogs that have no diff yet (#314).',
    scene: {
      strata: 'narrow', on: ['frame', 'cmp:*'], quiet: ['band:*'], hi: [],
    },
  };

  (F.flows || []).slice(1).forEach((fl) => {
    const prefix = QUESTIONS[fl.id];
    if (!prefix) return;
    fl.steps.forEach((st, i) => {
      const hi = [];
      st.blocks.forEach((b) => {
        const map = {
          pulse: 'r:pulse', diffs: 'r:diffs', catalogs: 'r:catalogs', 'console-ui': 'r:console',
        };
        if (map[b]) hi.push(map[b]);
        else if (b.startsWith('recipes-')) {
          const layer = b.replace('recipes-', '');
          const named = (st.text.match(/[a-z-]+@\d/g) || [])
            .filter((id) => F.recipes.some((r) => r.id === id && r.layer === layer));
          const ids = named.length ? named
            : F.recipes.filter((r) => r.layer === layer).map((r) => r.id);
          ids.forEach((id) => hi.push(`chip:${id}`));
          hi.push(`band:${layer}`);
        }
      });
      const stop = !st.blocks.length;
      if (stop) hi.push('p:person', 'q:stop');
      S[`${prefix}-${i + 1}`] = {
        ch: 6,
        group: prefix,
        step: i + 1,
        last: stop,
        alt: `The recipes, placed in their layers, with the pulse, console, catalogs and diffs on the right. ${stop ? 'cq-mev stops here. A person decides, outside cq-mev.' : `Highlighted: ${labelsOf(hi.filter((k) => !k.startsWith('band:')))}.`}`,
        scene: {
          strata: 'full', on: Q6.concat(stop ? [] : ['p:person']), quiet: stop ? ['chip:*', 'r:*'] : ['p:person'], hi,
        },
      };
    });
  });

  S.releases = {
    ch: 7,
    scrubber: true,
    alt: 'The recipe map by layer. The slider shows only the recipes that exist at the chosen release. The recipes that the chosen release added are highlighted.',
    scene: {
      strata: 'full', on: ['frame', 'band:*', 'bandsub', 'chip:*', 'rel'], release: true,
    },
  };
  S.places = {
    ch: 7,
    alt: 'One recipe in the middle, with lines to the ten places where it is written by hand today: six in the Java bundle, four in the console, tests and docs.',
    scene: {
      strata: 'narrow', on: ['frame', 'place:*'], quiet: ['band:*'], hi: ['onerecipe'],
    },
  };
  S.descriptor = {
    ch: 7,
    alt: 'The ten places fold into one recipe descriptor (#315, on main since PR #345, not yet released). Five readers take it from there: Java, recipes.json, the UI test, check_repository.py and the anatomy map.',
    scene: {
      strata: 'narrow', on: ['frame', 'reader:*'], quiet: ['band:*', 'place:*'], hi: ['descriptor'], collapse: true,
    },
  };
  S.designed = {
    ch: 7,
    alt: 'The recipe map again, quiet. Three outlined blocks are designed, not built: health checks (#190), pinned baselines (#188) and scheduled captures (#189). launches@1 (#191) is faint in the Content layer: deferred.',
    scene: {
      strata: 'full', on: ['frame', 'band:*', 'bandsub', 'd:191'], quiet: ['chip:*', 'r:*'], hi: ['d:188', 'd:189', 'd:190'],
    },
  };

  const DIR = ['frame', 'band:*', 'dir:*'];
  S.direction = {
    ch: 8,
    alt: 'Inside the author: captures, the sealed store, and the catalogs and diffs, all built. Below them, a dashed path that is designed, not built, goes through the exact-payload consent gate and stops at a closed gate in the wall of the author: no key on any instance. Outside, a trusted, authorized AI agent is drawn as an outline: designed (#325).',
    scene: {
      strata: 'narrow', on: DIR, quiet: ['band:*'], hi: ['dir:key', 'dir:agent'],
    },
  };
  S.adviser = {
    ch: 8,
    alt: 'The adviser side: the agent outside the author, the consent gate, and an advice record that is stored apart from the sealed evidence. All three are outlines: designed, not built.',
    scene: {
      strata: 'narrow', on: DIR, quiet: ['band:*', 'dir:health', 'dir:alert'], hi: ['dir:agent', 'dir:advice', 'dir:consent'],
    },
  };
  S['health-checks'] = {
    ch: 8,
    alt: 'The health checks cq-mev-live and cq-mev-evidence (#190), drawn as an outline: designed, not built. Upstream alerting outside the author reads them. OK never means healthy.',
    scene: {
      strata: 'narrow', on: DIR, quiet: ['band:*', 'dir:agent', 'dir:advice', 'dir:consent', 'dir:key'], hi: ['dir:health', 'dir:alert'],
    },
  };
  S.rules = {
    ch: 9,
    alt: 'The whole boundary again: cq-mev reads the six layers, writes only its own records in one place, and its one outbound path stops at the closed gate.',
    scene: { view: 'boundary', on: X_ALL, hi: ['x:store', 'x:gate'] },
  };
  return S;
}
