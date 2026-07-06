import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import subsetFont from 'subset-font'

/**
 * Design-system bundle generator.
 *
 * Compiles design-system/cards/** into dist-ds/**: self-contained HTML
 * preview cards for the Claude Design pane. Every card inlines the
 * site's REAL compiled CSS (single source of truth — templates carry
 * markup only, never copied values) plus subsetted brand fonts as data
 * URIs, wrapped in the shared harness.
 *
 * Template directives (html-partials house style):
 *   <!-- @dsCard group="Colors" -->     required first line, passed through
 *   <!-- @tokens colors -->             generated token markup (see BUCKETS)
 *   <!-- @asset brand/is-seal.svg -->   inline a public/assets file as data URI
 *   <!-- @palette-json -->              range palette keyframes from day.js
 *   <!-- @include range.html -->        inline a partial from partials/
 *   <!-- @italic -->                    flag: include the italic font face
 */
const root = resolve(import.meta.dirname, '..')
const CARDS_DIR = join(root, 'design-system/cards')
const OUT_DIR = join(root, 'dist-ds')
const SIZE_BUDGET = 240 * 1024
const MAX_FILES = 256

const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exitCode = 1
}
const die = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

/* ---- 1. Compile site CSS: resolve main.css imports in order ---------- */
function compileSiteCss() {
  const mainPath = join(root, 'src/styles/main.css')
  const main = readFileSync(mainPath, 'utf-8')
  return main.replace(/@import\s+'([^']+)';/g, (_, rel) =>
    readFileSync(resolve(dirname(mainPath), rel), 'utf-8')
  )
}

/* ---- 2. Dark-phase scope rewrite ------------------------------------- */
/* body[data-phase='dark'] rules must also apply inside a pane div, so a
   card can show the dark variant without owning <body>. :is() keeps any
   following combinator/comma/brace intact. */
function scopeDarkPhase(css) {
  return css.replaceAll(
    "body[data-phase='dark']",
    ":is(body[data-phase='dark'], [data-ds-phase='dark'])"
  )
}

/* ---- 3. Fonts: subset once, swap @font-face srcs to data URIs -------- */
const GLYPHS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
  'abcdefghijklmnopqrstuvwxyz{|}~' +
  '‘’“”–—…°→· é'

// Always kept in per-card italic subsets (space + curly quotes + dashes)
const GLYPHS_MIN = ' ‘’“”–—…'

async function subsetFonts() {
  const specs = [
    { file: 'source-serif-4.woff2', key: 'serif' },
    { file: 'inter.woff2', key: 'inter' },
  ]
  const out = {}
  for (const { file, key } of specs) {
    const buf = readFileSync(join(root, 'public/assets/fonts', file))
    const sub = await subsetFont(buf, GLYPHS, { targetFormat: 'woff2' })
    out[`/assets/fonts/${file}`] = {
      key,
      uri: `data:font/woff2;base64,${sub.toString('base64')}`,
      kb: Math.round(sub.length / 1024),
    }
  }
  return out
}

/* Replace font urls. The italic face is dropped unless the card asks
   for it; when asked, it is re-subset to just that card's own glyphs
   (italic copy is static per card) so it costs ~15 KB, not ~120 KB.
   @nofonts keeps the metric-tuned local fallbacks only. */
const italicCache = new Map()
async function inlineFonts(css, fonts, { wantItalic, noFonts, cardText }) {
  if (noFonts) {
    return css.replace(/@font-face\s*\{[^}]*url\('\/assets\/fonts\/[^}]*\}/g, '/* webfont omitted (@nofonts) */')
  }
  if (!wantItalic) {
    css = css.replace(
      /@font-face\s*\{[^}]*source-serif-4-italic[^}]*\}/,
      '/* italic face omitted (card not flagged @italic) */'
    )
  } else {
    // Subset to the card's italic copy only, with the weight axis pinned
    // at 425 (site italic runs at 420–430) — ~10 KB instead of ~120 KB.
    const chars = [...new Set((cardText.replace(/<[^>]+>/g, '') + GLYPHS_MIN).split(''))].sort().join('')
    if (!italicCache.has(chars)) {
      const buf = readFileSync(join(root, 'public/assets/fonts/source-serif-4-italic.woff2'))
      const sub = await subsetFont(buf, chars, { targetFormat: 'woff2', variationAxes: { wght: 425 } })
      italicCache.set(chars, `data:font/woff2;base64,${sub.toString('base64')}`)
    }
    css = css.replaceAll(`url('/assets/fonts/source-serif-4-italic.woff2')`, `url('${italicCache.get(chars)}')`)
  }
  for (const [url, f] of Object.entries(fonts)) {
    css = css.replaceAll(`url('${url}')`, `url('${f.uri}')`)
  }
  return css
}

/* Inline every remaining url('/assets/…') in CSS (art-flame textures
   etc. — small rasters). Warns if any single file would bloat cards. */
function inlineCssAssets(css) {
  return css.replace(/url\('(\/assets\/[^']+)'\)/g, (m, path) => {
    if (path.includes('/fonts/')) return m // fonts handled separately
    const file = join(root, 'public', path)
    const buf = readFileSync(file)
    if (buf.length > 50 * 1024) console.warn(`⚠ large CSS asset inlined: ${path} (${Math.round(buf.length / 1024)} KB)`)
    const ext = path.split('.').pop().toLowerCase()
    const mime = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[ext] || 'application/octet-stream'
    return `url('data:${mime};base64,${buf.toString('base64')}')`
  })
}

/* ---- 4. Token model --------------------------------------------------- */
function parseBlock(css, selectorRe) {
  const m = css.match(selectorRe)
  if (!m) return {}
  const body = m[1]
  const tokens = {}
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.replace(/\s+/g, ' ').trim()
  }
  return tokens
}

function parseTokens() {
  const css = readFileSync(join(root, 'src/styles/tokens.css'), 'utf-8')
  const rootTokens = parseBlock(css, /:root\s*\{([\s\S]*?)\n {2}\}/)
  const duskTokens = parseBlock(css, /\[data-theme='dusk'\]\s*\{([\s\S]*?)\n {2}\}/)
  if (!Object.keys(rootTokens).length) die('tokens.css: no :root tokens found')
  if (!Object.keys(duskTokens).length) die('tokens.css: no dusk tokens found')

  const bucket = (name) => {
    if (name.startsWith('c-')) return 'colors'
    if (name.startsWith('grad-')) return 'gradients'
    if (name.startsWith('step-')) return 'scale'
    if (name.startsWith('display-')) return 'display'
    if (name.startsWith('font-')) return 'fonts'
    if (name.startsWith('space-') || ['container', 'gutter', 'header-h'].includes(name)) return 'rhythm'
    if (name.startsWith('ease-') || name.startsWith('dur-')) return 'motion'
    return 'semantic'
  }
  const buckets = { colors: {}, gradients: {}, scale: {}, display: {}, fonts: {}, rhythm: {}, motion: {}, semantic: {} }
  for (const [name, value] of Object.entries(rootTokens)) buckets[bucket(name)][name] = value
  return { buckets, dusk: duskTokens }
}

/* ---- 5. Range palette from day.js (validated) ------------------------ */
function extractRangePalette() {
  const js = readFileSync(join(root, 'src/js/modules/day.js'), 'utf-8')
  const fn = js.match(/function buildRangePalette[\s\S]*?return \[([\s\S]*?)\n {2}\]/)
  if (!fn) die('day.js: buildRangePalette() not found')
  const keys = ['alpenglow', 'snowShade', 'far', 'mid', 'near', 'haze']
  const frames = []
  for (const [, body] of fn[1].matchAll(/\{([^}]*)\}/g)) {
    const frame = {}
    for (const [, k, v] of body.matchAll(/(\w+):\s*'(#[0-9a-fA-F]{6})'/g)) frame[k] = v
    if (Object.keys(frame).length) frames.push(frame)
  }
  if (frames.length !== 5 || !frames.every((f) => keys.every((k) => f[k])))
    die(`day.js: expected 5 palette keyframes with keys ${keys.join(',')} — got ${JSON.stringify(frames)}`)
  return frames
}

/* ---- 6. Generated token markup ---------------------------------------- */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function tokensMarkup(kind, model) {
  const { buckets, dusk } = model
  if (kind === 'colors') {
    return Object.entries(buckets.colors)
      .map(
        ([n, v]) => `
      <div class="ds-swatch">
        <div class="ds-swatch__chip" style="background:${v}"></div>
        <code>--${n}</code><span class="ds-swatch__val">${esc(v)}</span>
      </div>`
      )
      .join('')
  }
  if (kind === 'gradients') {
    return Object.entries(buckets.gradients)
      .map(
        ([n, v]) => `
      <div class="ds-gradient">
        <div class="ds-gradient__panel" style="background:${esc(v)}"></div>
        <code>--${n}</code>
        <span class="ds-swatch__val">${esc(v)}</span>
      </div>`
      )
      .join('')
  }
  if (kind === 'semantic') {
    return Object.entries(buckets.semantic)
      .map(([n, v]) => {
        const duskV = dusk[n]
        return `
      <tr>
        <td><code>--${n}</code></td>
        <td><span class="ds-inline-chip" style="background:var(--${n})"></span>${esc(v)}</td>
        <td>${duskV ? `<span class="ds-chipwell" data-theme="dusk"><span class="ds-inline-chip" style="background:var(--${n})"></span></span>${esc(duskV)}` : '<em>unchanged</em>'}</td>
      </tr>`
      })
      .join('')
  }
  if (kind === 'scale' || kind === 'display') {
    return Object.entries(buckets[kind])
      .map(
        ([n, v]) => `
      <div class="ds-spec-row">
        <div class="ds-spec-row__demo" style="font-size:var(--${n})">Rise and lift others</div>
        <div class="ds-spec-row__meta"><code>--${n}</code><span>${esc(v)}</span></div>
      </div>`
      )
      .join('')
  }
  if (kind === 'rhythm') {
    return Object.entries(buckets.rhythm)
      .map(
        ([n, v]) => `
      <div class="ds-bar-row">
        <code>--${n}</code>
        <div class="ds-bar" style="width:var(--${n}); max-width:100%"></div>
        <span class="ds-swatch__val">${esc(v)}</span>
      </div>`
      )
      .join('')
  }
  if (kind === 'motion') {
    return Object.entries(buckets.motion)
      .map(([n, v]) => `<tr><td><code>--${n}</code></td><td>${esc(v)}</td></tr>`)
      .join('')
  }
  die(`unknown @tokens kind: ${kind}`)
}

/* ---- 7. Directive expansion ------------------------------------------- */
function assetDataUri(rel) {
  const file = join(root, 'public/assets', rel)
  const ext = rel.split('.').pop().toLowerCase()
  const mime = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[ext]
  if (!mime) die(`@asset: unsupported type ${rel}`)
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}

function expandDirectives(html, model, palette) {
  html = html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, f) =>
    readFileSync(join(root, 'partials', f), 'utf-8')
  )
  html = html.replace(/<!--\s*@tokens-json\s+(\w+)\s*-->/g, (_, kind) => {
    if (!model.buckets[kind]) die(`unknown @tokens-json kind: ${kind}`)
    return JSON.stringify(model.buckets[kind])
  })
  html = html.replace(/<!--\s*@tokens\s+(\w+)\s*-->/g, (_, kind) => tokensMarkup(kind, model))
  html = html.replace(/<!--\s*@asset\s+([\w./-]+)\s*-->/g, (_, rel) => assetDataUri(rel))
  html = html.replace(/<!--\s*@palette-json\s*-->/g, () => JSON.stringify(palette))
  return html
}

/* ---- 8. Build ---------------------------------------------------------- */
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (name.endsWith('.html')) yield p
  }
}

const MARKER_RE = /^<!--\s*@dsCard\s+group="([^"]+)"(?:\s+[^>]*)?-->/

async function build() {
  const siteCss = inlineCssAssets(scopeDarkPhase(compileSiteCss()))
  const fonts = await subsetFonts()
  const model = parseTokens()
  const palette = extractRangePalette()
  const harness = readFileSync(join(root, 'design-system/harness.html'), 'utf-8')

  const manifest = []
  for (const tplPath of walk(CARDS_DIR)) {
    const relPath = relative(CARDS_DIR, tplPath)
    const tpl = readFileSync(tplPath, 'utf-8')
    const firstLine = tpl.split('\n', 1)[0]
    const marker = firstLine.match(MARKER_RE)
    if (!marker) die(`${relPath}: first line must be <!-- @dsCard group="…" --> (got: ${firstLine.slice(0, 60)})`)
    const group = marker[1]

    // @italic may carry the card's italic copy: subset only those glyphs.
    const italicM = tpl.match(/<!--\s*@italic( [^>]*?)?\s*-->/)
    const noFonts = /<!--\s*@nofonts\s*-->/.test(tpl)
    const body = expandDirectives(
      tpl.replace(/<!--\s*@italic[^>]*?-->\n?/, '').replace(/<!--\s*@nofonts\s*-->\n?/, ''),
      model,
      palette
    )
      .split('\n')
      .slice(1) // drop marker line; re-added verbatim as output line 1
      .join('\n')

    const css = await inlineFonts(siteCss, fonts, {
      wantItalic: !!italicM,
      noFonts,
      cardText: italicM?.[1]?.trim() || body,
    })
    const title = relPath.replace('/index.html', '').replaceAll('/', ' · ')
    const out =
      firstLine +
      '\n' +
      harness
        .replaceAll('{{css}}', () => css)
        .replaceAll('{{title}}', title)
        .replaceAll('{{slot}}', () => body)

    // Gates
    const bytes = Buffer.byteLength(out)
    if (bytes > SIZE_BUDGET) fail(`${relPath}: ${Math.round(bytes / 1024)} KB exceeds ${SIZE_BUDGET / 1024} KB budget`)
    const strayAsset = out.match(/(?:src|href)="\/assets\/[^"]+"|url\('\/assets\/[^']+'\)/)
    if (strayAsset) fail(`${relPath}: unresolved asset ref ${strayAsset[0].slice(0, 60)}`)
    const external = out.match(/(?:src|href)="https?:\/\/[^"]+"/)
    if (external) fail(`${relPath}: external ref ${external[0].slice(0, 60)}`)
    if (!MARKER_RE.test(out)) fail(`${relPath}: output lost its first-line marker`)

    const outPath = join(OUT_DIR, relPath)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, out)
    manifest.push({
      path: relPath,
      group,
      bytes,
      sha256: createHash('sha256').update(out).digest('hex').slice(0, 16),
    })
  }

  if (manifest.length === 0) die('no card templates found')
  if (manifest.length > MAX_FILES) fail(`${manifest.length} files exceeds ${MAX_FILES}`)

  manifest.sort((a, b) => a.path.localeCompare(b.path))
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  const pad = (s, n) => String(s).padEnd(n)
  console.log(pad('CARD', 44) + pad('GROUP', 14) + 'SIZE')
  for (const m of manifest) console.log(pad(m.path, 44) + pad(m.group, 14) + Math.round(m.bytes / 1024) + ' KB')
  console.log(`\n${manifest.length} cards → dist-ds/  (fonts subset: ${Object.values(fonts).map((f) => `${f.key} ${f.kb}KB`).join(', ')})`)
  if (process.exitCode) console.error('\nBUILD FAILED — gate violations above')
}

await build()
