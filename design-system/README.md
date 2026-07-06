# Design system — Claude Design bundle

Self-contained HTML preview cards for the site's design system, generated
from the REAL site CSS so the design system cannot drift from the code.
Built for a [Claude Design](https://claude.ai/design) design-system project.

## Regenerate

```sh
npm run build:ds        # → dist-ds/ (gitignored)
```

The generator (`tools/build-design-system.mjs`):

1. Resolves `src/styles/main.css` imports into one CSS string (layer order intact)
   and inlines it into **every** card — templates contain markup only.
2. Rewrites `body[data-phase='dark']` → `:is(body[data-phase='dark'], [data-ds-phase='dark'])`
   so dark-phase rules can be shown in a pane div.
3. Subsets the brand fonts (`subset-font`) and embeds them as data URIs.
   Cards flagged `<!-- @italic <the italic copy> -->` get a per-card italic
   subset pinned at wght 425 (~10 KB). `<!-- @nofonts -->` keeps metric
   fallbacks only (used by the heavy coat-of-arms card).
4. Parses `tokens.css` and the range palette in `src/js/modules/day.js`
   (build fails loudly if the palette shape changes), expanding directives:
   - `<!-- @tokens colors|semantic|gradients|scale|display|rhythm|motion -->` → generated spec markup
   - `<!-- @tokens-json scale -->` → raw JSON for card scripts
   - `<!-- @asset brand/is-seal.svg -->` → data URI from `public/assets/`
   - `<!-- @include range.html -->` → partial from `partials/`
5. Wraps each template in `harness.html` and enforces gates: first-line
   `<!-- @dsCard group="…" -->` marker, ≤ 240 KB/file, no `/assets/` or
   external refs. Emits `dist-ds/manifest.json` (path, group, size, sha256)
   for incremental re-sync diffs.

New tokens appear in the token cards automatically on rebuild.

## Card inventory

24 cards in 7 groups: Colors (3) · Type (4) · Spacing (2) · Buttons (2) ·
Components (6) · Sky & Motion (3, incl. the scrubbable day) · Brand (4,
incl. the locked design rules).

## Upload to Claude Design

One-time: authorize with `/design-login` from an interactive `claude`
terminal (or seed via "Send to Claude Code" on claude.ai/design). Then ask
Claude Code to sync: it lists/creates the design-system project, finalizes
a plan with the `dist-ds` paths, and uploads via `write_files`. On later
changes, rebuild and re-upload only the cards whose `manifest.json` hash
changed.
