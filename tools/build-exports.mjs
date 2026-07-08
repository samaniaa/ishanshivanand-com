/**
 * Design-system exports: render the sky / sun / moon light system as
 * high-resolution JPEGs the whole team can share.
 *
 * The visuals are built as HTML+CSS from the REAL token files
 * (tokens-sky/sun/moon.css) — the sun/moon discs are CSS-native
 * radial-gradient alpha stops, drop-shadow, and gradient masks, so
 * rendering them as CSS (via headless Chrome) is pixel-faithful to the
 * live site. Chrome → PNG (supersampled) → sips → JPEG.
 *
 *   npm run build:exports   →  design-system/exports/*.jpg  (+ ~/Desktop)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, copyFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { homedir } from 'node:os'

const root = resolve(import.meta.dirname, '..')
const outDir = join(root, 'design-system', 'exports')
const tmpDir = join(root, 'design-system', 'exports', '.tmp')
const desktop = join(homedir(), 'Desktop')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// The token custom properties, inlined into every export page.
const tokenCss = ['tokens-sky.css', 'tokens-sun.css', 'tokens-moon.css']
  .map((f) => readFileSync(join(root, 'src', 'styles', f), 'utf8'))
  .join('\n')

/* ---- element builders (reuse the real token idiom) ------------------- */

// left/top are fractions of the panel; discs are centred on that point.
const sun = (color, size, leftFrac, topFrac, opacity = 1) =>
  `<div class="sun" style="background:var(--sun-${color});width:${size}px;height:${size}px;` +
  `left:${leftFrac * 100}%;top:${topFrac * 100}%;opacity:${opacity}"></div>`

const moon = (tint, orient, size, leftFrac, topFrac, opacity = 1) =>
  `<div class="moon" style="background:var(--moon-${tint});` +
  `-webkit-mask-image:var(--moon-mask-${orient});mask-image:var(--moon-mask-${orient});` +
  `filter:var(--moon-glow-${tint === 'silver' ? 'silver' : 'cream'});` +
  `width:${size}px;height:${size}px;left:${leftFrac * 100}%;top:${topFrac * 100}%;opacity:${opacity}"></div>`

const card = (skyVar, w, h, label, sub, inner = '') =>
  `<div class="card"><div class="panel" style="width:${w}px;height:${h}px;background:var(--sky-${skyVar})">${inner}</div>` +
  `<div class="plabel">${label}</div>${sub ? `<div class="psub">${sub}</div>` : ''}</div>`

const page = (W, H, title, subtitle, rowHtml, rowStyle = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
${tokenCss}
*{margin:0;box-sizing:border-box}
html,body{background:#fdf8ec}
.wrap{width:${W}px;height:${H}px;padding:34px 40px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a3550}
.title{font-size:23px;font-weight:600;letter-spacing:-0.015em;color:#0d2354}
.subtitle{font-size:13px;color:#6b7a9c;margin-top:3px}
.row{display:flex;gap:12px;align-items:flex-end;margin-top:22px;${rowStyle}}
.card{display:flex;flex-direction:column;align-items:center}
.panel{position:relative;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(13,35,84,.08)}
.plabel{font-size:12.5px;font-weight:600;margin-top:9px;color:#2a3550;text-align:center}
.psub{font-size:10.5px;color:#8390ad;margin-top:1px;text-align:center}
.tag{font-weight:400;color:#a0708a}
.sun,.moon{position:absolute;border-radius:50%;transform:translate(-50%,-50%)}
</style></head><body><div class="wrap">
<div class="title">${title}</div><div class="subtitle">${subtitle}</div>
<div class="row">${rowHtml}</div>
</div></body></html>`

/* ---- the five visuals ------------------------------------------------ */

const SKY_ORDER = [
  ['predawn', 'pre-dawn'], ['blue-hour', 'blue hour'], ['sunrise', 'sunrise'],
  ['daybreak', 'daybreak', 'fire'], ['morning-gold', 'morning gold'], ['morning', 'morning'],
  ['midday', 'midday', 'apex'], ['afternoon', 'afternoon'], ['evening-gold', 'evening gold'],
  ['sundown', 'sundown', 'fire'], ['dusk', 'dusk'], ['twilight', 'twilight'], ['post-dusk', 'post-dusk'],
]

const S = { small: 54, medium: 78, large: 106 }

// [skyVar, label, sunColour, size, topFrac] — sun climbs then sets
const SUN_ARC = [
  ['sunrise', 'sunrise', 'soft-peach', S.large, 0.64],
  ['daybreak', 'daybreak', 'orange', S.large, 0.64],
  ['morning-gold', 'morning gold', 'warm-gold', S.medium, 0.46],
  ['morning', 'morning', 'warm-gold', S.medium, 0.32],
  ['midday', 'midday', 'warm-gold', S.small, 0.2],
  ['afternoon', 'afternoon', 'warm-gold', S.medium, 0.32],
  ['evening-gold', 'evening gold', 'warm-gold', S.medium, 0.46],
  ['sundown', 'sundown', 'orange', S.large, 0.64],
  ['dusk', 'dusk', 'soft-peach', S.large, 0.64],
]

// [skyVar, label, sub, sunColour]
const SUN_DISCS = [
  ['midday', 'warm-gold', 'the day sun — never white', 'warm-gold'],
  ['sunrise', 'soft-peach', 'sunrise / dusk', 'soft-peach'],
  ['daybreak', 'orange', 'the fire ball — daybreak / sundown', 'orange'],
]

// [skyVar, label, sub, tint, orient, size, topFrac, opacity]
const MOON_STATES = [
  ['predawn', 'pre-dawn', 'bright silver, full glow', 'silver', 'waning', 108, 0.3, 1],
  ['blue-hour', 'blue hour', 'silver, setting', 'silver', 'waning', 96, 0.6, 0.72],
  ['twilight', 'twilight', 'cream, rising', 'cream', 'waxing', 88, 0.6, 0.92],
  ['post-dusk', 'post-dusk', 'quiet cream companion', 'cream', 'waxing', 74, 0.42, 1],
]

function buildPages() {
  const pages = []

  // 1 — Sky scale (13 phases)
  {
    const w = 100, h = 250
    const cards = SKY_ORDER.map(([v, label, tag]) =>
      card(v, w, h, tag ? `${label} <span class="tag">· ${tag}</span>` : label, '')).join('')
    const W = 40 * 2 + SKY_ORDER.length * w + (SKY_ORDER.length - 1) * 12
    pages.push({ name: 'sky-scale', W, H: 420,
      html: page(W, 420, 'The Sky Scale — 13 phases', 'One continuous day, symmetric around midday. Never black; blue carries the day, blush edges every rising and setting sun.', cards) })
  }

  // 2 — Sun arc
  {
    const w = 128, h = 262
    const cards = SUN_ARC.map(([v, label, col, size, top]) =>
      card(v, w, h, label, '', sun(col, size, 0.5, top))).join('')
    const W = 40 * 2 + SUN_ARC.length * w + (SUN_ARC.length - 1) * 12
    pages.push({ name: 'sun-arc', W, H: 430,
      html: page(W, 430, 'The sun across the day', 'The disc recolours and resizes as it arcs — soft-peach and orange at the horizon, warm-gold and small at noon. Never white, so it holds on the blue.', cards) })
  }

  // 3 — Sun disc states
  {
    const w = 280, h = 280
    const cards = SUN_DISCS.map(([v, label, sub, col]) =>
      card(v, w, h, label, sub, sun(col, 196, 0.5, 0.46))).join('')
    const W = 40 * 2 + SUN_DISCS.length * w + (SUN_DISCS.length - 1) * 16
    pages.push({ name: 'sun-disc-states', W, H: 470,
      html: page(W, 470, 'Sun disc states', 'Crisp discs — a bright hot core, a solid body, and a glow that blends to nothing. Three colours: warm-gold, soft-peach, and the orange fire ball.', cards, 'gap:16px') })
  }

  // 4 — Moon states
  {
    const w = 210, h = 258
    const cards = MOON_STATES.map(([v, label, sub, tint, orient, size, top, op]) =>
      card(v, w, h, label, sub, moon(tint, orient, size, 0.5, top, op))).join('')
    const W = 40 * 2 + MOON_STATES.length * w + (MOON_STATES.length - 1) * 14
    pages.push({ name: 'moon-states', W, H: 430,
      html: page(W, 430, 'Moon states', 'A thin crescent whose glow follows its shape. Cool silver waning (lit toward the rising sun) at dawn; warm cream waxing (lit toward the set sun), a quiet companion at the close.', cards, 'gap:14px') })
  }

  // 5 — Sun + moon transition / handover
  {
    const w = 470, h = 300
    const dawn = card('sunrise', w, h, 'dawn handover',
      'moon setting (left) as the sun rises (right)',
      moon('silver', 'waning', 78, 0.24, 0.52, 0.6) + sun('soft-peach', S.large, 0.78, 0.62, 0.9))
    const dusk = card('dusk', w, h, 'dusk handover',
      'sun setting (left) as the moon rises (right)',
      sun('warm-gold', S.medium, 0.22, 0.6, 0.75) + moon('cream', 'waxing', 74, 0.78, 0.5, 0.8))
    const W = 40 * 2 + 2 * w + 18
    pages.push({ name: 'sun-moon-transition', W, H: 470,
      html: page(W, 470, 'Sun & moon — the handover', 'The moon never just appears. At dawn and at dusk both are briefly on screen together, cross-fading as one light hands the sky to the other.', dawn + dusk, 'gap:18px') })
  }

  return pages
}

/* ---- render: Chrome → PNG → sips → JPEG ------------------------------ */

// Chrome takes the screenshot but (in both headless modes) does not exit —
// its updater/keep-alive processes hold the tree open. So spawn it
// detached, poll until the PNG is fully written (size stable), then kill
// the process group.
function chromeShot(name, htmlPath, pngPath, W, H) {
  return new Promise((ok, fail) => {
    rmSync(pngPath, { force: true })
    const child = spawn(CHROME, [
      '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--no-default-browser-check', '--disable-background-networking',
      '--disable-component-update', '--force-color-profile=srgb',
      '--force-device-scale-factor=3', `--user-data-dir=${join(tmpDir, 'prof-' + name)}`,
      `--window-size=${W},${H}`, `--screenshot=${pngPath}`, pathToFileURL(htmlPath).href,
    ], { stdio: 'ignore', detached: true })
    let done = false, waited = 0, last = -1, stable = 0
    const iv = setInterval(() => {
      waited += 200
      if (existsSync(pngPath)) {
        const sz = statSync(pngPath).size
        stable = sz > 0 && sz === last ? stable + 1 : 0
        last = sz
        if (stable >= 2) return finish()
      }
      if (waited >= 30000) return finish(new Error(`chrome timeout: ${name}`))
    }, 200)
    const finish = (err) => {
      if (done) return
      done = true
      clearInterval(iv)
      try { process.kill(-child.pid, 'SIGKILL') } catch { /* group gone */ }
      try { child.kill('SIGKILL') } catch { /* already dead */ }
      err ? fail(err) : ok()
    }
  })
}

async function render(p) {
  const htmlPath = join(tmpDir, `${p.name}.html`)
  const pngPath = join(tmpDir, `${p.name}.png`)
  const jpgPath = join(outDir, `${p.name}.jpg`)
  writeFileSync(htmlPath, p.html)
  await chromeShot(p.name, htmlPath, pngPath, p.W, p.H)
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', pngPath, '--out', jpgPath], { stdio: 'ignore' })
  copyFileSync(jpgPath, join(desktop, `${p.name}.jpg`))
  return statSync(jpgPath).size
}

rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(tmpDir, { recursive: true })
mkdirSync(outDir, { recursive: true })

const rows = []
for (const p of buildPages()) {
  const bytes = await render(p)
  rows.push([`${p.name}.jpg`, `${p.W}×${p.H} @3x`, `${(bytes / 1024).toFixed(0)} KB`])
}
rmSync(tmpDir, { recursive: true, force: true })

const pad = (s, n) => String(s).padEnd(n)
console.log('')
console.log(pad('EXPORT', 30) + pad('CANVAS', 16) + 'SIZE')
rows.forEach((r) => console.log(pad(r[0], 30) + pad(r[1], 16) + r[2]))
console.log(`\n${rows.length} JPEGs → design-system/exports/  (copies on ~/Desktop)`)
