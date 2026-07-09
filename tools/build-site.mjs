/* =====================================================================
   build-site.mjs — turn the built design-system cards (dist-ds/) into a
   shareable, self-contained STATIC SITE + a portable token package.

   Produces, into dist-ds/ (run AFTER `npm run build:ds`):
     index.html                     browsable gallery over manifest.json
     package/design-system.css      all tokens + reusable components, one file
     package/fonts/*.woff2          the bundled webfonts (relative paths)
     package/tokens/*.css           the font-independent token/component files
     package/README.md              how to use the package
     package/SKY.md                 the sky / sun / moon / stars rules

   The cards themselves are already 100% self-contained (inline CSS +
   data-URI fonts), so the gallery just iframes them — no server logic.
   Everything uses relative ./ paths so it hosts fine under a GitHub Pages
   project sub-path.
   ===================================================================== */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist-ds')
const PKG_DIR = 'design-system' // extracts to ./design-system/
const pkg = join(dist, PKG_DIR)

const die = (m) => { console.error('build-site: ' + m); process.exit(1) }

if (!existsSync(join(dist, 'manifest.json'))) die('dist-ds/manifest.json missing — run `npm run build:ds` first.')
const cards = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf-8'))

/* ---- helpers -------------------------------------------------------- */
const PROJECT = 'Ishan Shivanand — Design System'
// Group display order (unknown groups appended alphabetically)
const GROUP_ORDER = ['Brand', 'Colors', 'Type', 'Spacing', 'Buttons', 'Components', 'Sky & Motion']

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const titleFromPath = (p) => {
  const name = p.split('/').slice(-2, -1)[0] || p // '<group>/<card>/index.html' → '<card>'
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
const groupsSorted = () => {
  const present = [...new Set(cards.map((c) => c.group))]
  return present.sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b)
  })
}
const slug = (g) => g.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/* ---- 1 · the gallery index.html ------------------------------------- */
function buildGallery() {
  const groups = groupsSorted()
  const byGroup = (g) => cards.filter((c) => c.group === g)

  const nav = groups
    .map((g) => `<a href="#${slug(g)}">${esc(g)} <span>${byGroup(g).length}</span></a>`)
    .join('\n      ')

  const sections = groups
    .map((g) => {
      const tiles = byGroup(g)
        .sort((a, b) => a.path.localeCompare(b.path))
        .map(
          (c) => `
        <figure class="tile">
          <div class="frame"><iframe src="./${c.path}" loading="lazy" title="${esc(titleFromPath(c.path))}"></iframe></div>
          <figcaption>
            <span class="tile__name">${esc(titleFromPath(c.path))}</span>
            <a class="tile__open" href="./${c.path}" target="_blank" rel="noopener">Open&nbsp;&#8599;</a>
          </figcaption>
        </figure>`
        )
        .join('')
      return `
    <section id="${slug(g)}" class="group">
      <h2>${esc(g)} <span class="group__count">${byGroup(g).length}</span></h2>
      <div class="tiles">${tiles}
      </div>
    </section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(PROJECT)}</title>
<style>
  :root {
    --navy: #071938; --navy-lift: #0d2354; --cream: #fffcf6; --gold: #f59700; --coral: #e2513c;
    --ink: #071938; --ink-soft: rgb(7 25 56 / 0.62); --rule: rgb(7 25 56 / 0.12);
    --serif: 'Source Serif 4', Georgia, serif;
    --sans: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 5.5rem; }
  body { margin: 0; font-family: var(--sans); color: var(--ink); background: #f4f1ea; -webkit-font-smoothing: antialiased; }
  a { color: inherit; }

  header.top {
    position: sticky; top: 0; z-index: 10;
    background: linear-gradient(180deg, #fffdf8, #fff8f2);
    border-bottom: 1px solid var(--rule);
    padding: 1.1rem clamp(1.2rem, 4vw, 2.6rem);
    display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .top__title { margin: 0; font-family: var(--serif); font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em; }
  .top__title span { color: var(--ink-soft); font-weight: 400; }
  .top__actions { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; }
  .btn-dl {
    display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; font-weight: 550;
    color: var(--cream); background: linear-gradient(180deg, #1c2d54, #0a1730);
    padding: 0.6em 1.15em; border-radius: 999px; text-decoration: none;
    box-shadow: 0 1px 2px rgb(7 25 56 / 0.3), 0 8px 20px rgb(7 25 56 / 0.18);
  }
  .btn-dl:hover { transform: translateY(-1px); }
  .top__count { font-size: 0.78rem; color: var(--ink-soft); }

  .layout { display: grid; grid-template-columns: 220px 1fr; gap: 0; align-items: start; }
  nav.side {
    position: sticky; top: 5.4rem; align-self: start;
    padding: 1.6rem 0.6rem 2rem 1.4rem; display: grid; gap: 0.15rem;
    max-height: calc(100vh - 5.4rem); overflow-y: auto;
  }
  nav.side a {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 0.86rem; font-weight: 500; text-decoration: none; color: var(--ink-soft);
    padding: 0.45em 0.7em; border-radius: 7px;
  }
  nav.side a:hover { background: rgb(7 25 56 / 0.05); color: var(--ink); }
  nav.side a span { font-size: 0.72rem; color: var(--ink-soft); background: rgb(7 25 56 / 0.07); border-radius: 999px; padding: 0.05em 0.55em; }

  main { padding: 1.6rem clamp(1rem, 3vw, 2.4rem) 5rem; min-width: 0; }
  .intro { max-width: 60ch; margin: 0.6rem 0 2.2rem; color: var(--ink-soft); font-size: 0.95rem; line-height: 1.6; }
  .intro strong { color: var(--ink); }

  .group { margin-bottom: 3rem; scroll-margin-top: 5.5rem; }
  .group > h2 { font-family: var(--serif); font-size: 1.5rem; margin: 0 0 1.1rem; display: flex; align-items: baseline; gap: 0.6rem; }
  .group__count { font-family: var(--sans); font-size: 0.8rem; font-weight: 500; color: var(--ink-soft); }

  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.2rem; }
  .tile { margin: 0; background: #fff; border: 1px solid var(--rule); border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgb(7 25 56 / 0.06); }
  .tile .frame { height: 300px; overflow: hidden; background: #f4f1ea; border-bottom: 1px solid var(--rule); position: relative; }
  .tile iframe { width: 200%; height: 600px; border: 0; transform: scale(0.5); transform-origin: top left; pointer-events: none; }
  figcaption { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.7rem 0.95rem; }
  .tile__name { font-size: 0.9rem; font-weight: 560; }
  .tile__open { font-size: 0.78rem; font-weight: 550; text-decoration: none; color: var(--coral); white-space: nowrap; }
  .tile__open:hover { text-decoration: underline; }

  footer { border-top: 1px solid var(--rule); padding: 2rem clamp(1rem, 3vw, 2.4rem) 3rem; color: var(--ink-soft); font-size: 0.85rem; line-height: 1.6; max-width: 70ch; }
  footer code { font-family: ui-monospace, Menlo, monospace; font-size: 0.85em; background: rgb(7 25 56 / 0.06); padding: 0.1em 0.4em; border-radius: 4px; }

  @media (max-width: 720px) {
    .layout { grid-template-columns: 1fr; }
    nav.side { position: static; max-height: none; flex-flow: row wrap; display: flex; padding: 0.8rem 1rem; border-bottom: 1px solid var(--rule); }
    .tile iframe { width: 200%; transform: scale(0.5); }
  }
</style>
</head>
<body>
  <header class="top">
    <h1 class="top__title">Ishan Shivanand <span>· Design System</span></h1>
    <div class="top__actions">
      <span class="top__count">${cards.length} components · ${groups.length} groups</span>
      <a class="btn-dl" href="./design-system-package.zip" download>&#8595;&nbsp; Download tokens</a>
    </div>
  </header>
  <div class="layout">
    <nav class="side">
      ${nav}
    </nav>
    <main>
      <p class="intro">The living reference for the Ishan Shivanand website. Every tile below is the <strong>real component</strong>, rendered from the design tokens — open any one to see it full-size. To build with the system, <strong>download the token package</strong> (top right): one <code>design-system.css</code> with all colours, type, spacing, the sky/sun/moon/stars language, and the glass / testimonial / logo-strip / button components.</p>
${sections}
    </main>
  </div>
  <footer>
    <p><strong>Using the tokens.</strong> Import <code>design-system.css</code>, then reference tokens like <code>var(--sky-midday)</code>, <code>var(--glass)</code>, <code>var(--ink)</code>, or the component classes <code>.glass</code>, <code>.testimonial</code>, <code>.logo-strip</code>, <code>.btn</code>. Full usage in the package <code>README.md</code>; the sky / sun / moon / stars rules in <code>SKY.md</code>.</p>
    <p>Generated from the canonical <code>ishanshivanand-com</code> repo. This page and every card are self-contained static HTML — host anywhere, no account needed.</p>
  </footer>
</body>
</html>
`
}

/* ---- 2 · the portable token package --------------------------------- */
const FONTS = ['inter.woff2', 'source-serif-4.woff2', 'source-serif-4-italic.woff2']
// Combined into design-system.css, in @layer order. tokens.css first (its
// @font-face url()s get rewritten to ./fonts/); the rest are font-independent.
const COMBINE = [
  ['src/styles/tokens.css', true],
  ['src/styles/tokens-sky.css', false],
  ['src/styles/tokens-sun.css', false],
  ['src/styles/tokens-moon.css', false],
  ['src/styles/components/surfaces.css', false],
  ['src/styles/components/buttons.css', false],
]
// Font-independent files shipped individually for granular use.
const GRANULAR = [
  'src/styles/tokens-sky.css',
  'src/styles/tokens-sun.css',
  'src/styles/tokens-moon.css',
  'src/styles/components/surfaces.css',
  'src/styles/components/buttons.css',
]

function buildPackage() {
  rmSync(pkg, { recursive: true, force: true })
  mkdirSync(join(pkg, 'fonts'), { recursive: true })
  mkdirSync(join(pkg, 'tokens'), { recursive: true })

  // combined stylesheet
  const rewriteFonts = (css) => css.replace(/url\(['"]?\/assets\/fonts\/([^'")]+)['"]?\)/g, "url('./fonts/$1')")
  let combined = `/* ${PROJECT} — combined tokens + components.
   Import this one file, then use var(--…) tokens and the component classes.
   Cascade layers: reset < tokens < components (define your own reset outside). */
@layer tokens, components;

`
  for (const [rel, hasFonts] of COMBINE) {
    let css = readFileSync(join(root, rel), 'utf-8')
    if (hasFonts) css = rewriteFonts(css)
    combined += `/* ── ${rel.split('/').pop()} ─────────────────────────────── */\n${css}\n`
  }
  writeFileSync(join(pkg, 'design-system.css'), combined)

  // fonts
  for (const f of FONTS) copyFileSync(join(root, 'public/assets/fonts', f), join(pkg, 'fonts', f))

  // granular files
  for (const rel of GRANULAR) copyFileSync(join(root, rel), join(pkg, 'tokens', rel.split('/').pop()))

  // docs
  copyFileSync(join(root, 'design-system/SKY.md'), join(pkg, 'SKY.md'))
  writeFileSync(join(pkg, 'README.md'), PACKAGE_README)

  // zip for one-click download (best-effort; CI always has `zip`)
  const zipName = 'design-system-package.zip'
  try {
    rmSync(join(dist, zipName), { force: true })
    execFileSync('zip', ['-qr', zipName, PKG_DIR], { cwd: dist, stdio: 'ignore' })
  } catch {
    console.warn(`build-site: could not create ${zipName} (\`zip\` not available) — the folder is still at dist-ds/${PKG_DIR}/`)
  }
}

const PACKAGE_README = `# ${PROJECT} — token package

The reusable design tokens and components of the Ishan Shivanand website,
as plain CSS you can drop into any project. No build step, no framework.

## Install

Copy this folder in and import the one stylesheet:

\`\`\`css
@import './design-system/design-system.css';
\`\`\`

or in HTML:

\`\`\`html
<link rel="stylesheet" href="./design-system/design-system.css">
\`\`\`

The bundled fonts load from \`./fonts/\` (relative to \`design-system.css\`),
so keep the \`fonts/\` folder next to it.

## Use the tokens

Everything is a CSS custom property — reference with \`var(--…)\`:

- **Colour** — \`--c-dark-anchor\` (#071938 brand navy), \`--c-gold\`, \`--c-coral\`, \`--c-white\`; semantic \`--ink\`, \`--ink-soft\`, \`--surface\`, \`--accent\`, \`--rule\`.
- **Type** — \`--font-display\` (Source Serif 4), \`--font-body\` (Inter); fluid sizes \`--step--1\` … \`--step-7\`; \`--display-hero\`, \`--display-huge\`.
- **Rhythm** — \`--space-section\`, \`--space-block\`, \`--container\`, \`--gutter\`.
- **Sky / sun / moon** — \`--sky-predawn\` … \`--sky-post-dusk\` (13 phases), \`--sun-warm-gold\`/\`--sun-orange\`, \`--moon-silver\`/\`--moon-cream\` + masks + glows. See **SKY.md** for the laws and the stars treatment.
- **Glass** — \`--glass\`, \`--glass-border\`, \`--glass-shadow\`, \`--glass-radius\`, \`--glass-blur\` (theme-aware; re-point under a dark context).

## Use the components

Plain classes (in \`@layer components\`):

- \`.glass\` — a frosted surface. \`.testimonial\` (on \`.glass\`) + \`.testimonials\` grid — endorsement cards. \`.logo-strip\` + \`.logo-strip__logo\` (\`--tall\`/\`--wide\`, \`--invert\`) — a press/partner row.
- \`.btn\` / \`.btn--light\` and \`.tlink\` — the locked link pair.

Theme flip: components read the semantic tokens, so setting
\`[data-theme='dusk']\` (or your own dark scope) re-points \`--ink\`, \`--glass\`,
etc. to their dark values.

## What's inside

- \`design-system.css\` — everything combined (import this).
- \`fonts/\` — the three bundled woff2 files.
- \`tokens/\` — the individual token/component files (font-independent), for granular use.
- \`SKY.md\` — the sky / sun / moon / stars rules.

Canonical source: the \`ishanshivanand-com\` repo (\`src/styles/\`). Reference the
tokens, never hard-code the raw values.
`

/* ---- run ------------------------------------------------------------ */
writeFileSync(join(dist, 'index.html'), buildGallery())
buildPackage()

console.log(`build-site: wrote dist-ds/index.html (${cards.length} cards, ${groupsSorted().length} groups)`)
console.log(`build-site: assembled dist-ds/${PKG_DIR}/ (design-system.css + ${FONTS.length} fonts + ${GRANULAR.length} granular files + README + SKY.md)`)
