/* =====================================================================
   build-contact.mjs — assemble the Contact page (/connect/) into ONE
   self-contained HTML file: `contact-standalone.html` at the repo root.

   Everything is inlined — partials expanded, the site CSS compiled with
   fonts + logos as data URIs, and a trimmed vanilla script (the Contact
   page needs no GSAP/Lenis) — so the file opens in any browser offline
   and shows the real form + "Gathering Light" logo animation.

   Regenerate:  npm run build:contact
   ===================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const P = (...p) => join(root, ...p)
const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

/* ---- Expand build-time partials (@include file {json}, {{key}}) ------ */
const INCLUDE_RE = /<!--\s*@include\s+([\w./-]+)(?:\s+(\{[\s\S]*?\}))?\s*-->/g
function expandPartials(html, vars = {}, depth = 0) {
  if (depth > 4) return html
  const withIncludes = html.replace(INCLUDE_RE, (_, file, json) => {
    const content = readFileSync(P('partials', file), 'utf-8')
    const localVars = { ...vars, ...(json ? JSON.parse(json) : {}) }
    return expandPartials(content, localVars, depth + 1)
  })
  return withIncludes.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in vars ? vars[key] : ''))
}

/* ---- Compile main.css by resolving its @imports in order ------------- */
function compileSiteCss() {
  const mainPath = P('src/styles/main.css')
  const main = readFileSync(mainPath, 'utf-8')
  return main.replace(/@import\s+'([^']+)';/g, (_, rel) =>
    readFileSync(resolve(dirname(mainPath), rel), 'utf-8')
  )
}

/* ---- Inline url('/assets/…') in CSS (fonts handled separately). Any
   missing file (homepage-only textures pulled in via day.css etc.) is
   neutralised to a transparent pixel so nothing stays external. ------- */
const MIME = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }
function assetUri(path) {
  const file = P('public', path)
  if (!existsSync(file)) return TRANSPARENT
  const ext = path.split('.').pop().toLowerCase()
  return `data:${MIME[ext] || 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`
}
function inlineCssAssets(css) {
  return css.replace(/url\('(\/assets\/[^']+)'\)/g, (m, path) =>
    path.includes('/fonts/') ? m : `url('${assetUri(path)}')`
  )
}

/* ---- Fonts: embed the full brand webfonts as data URIs --------------- */
function inlineFonts(css) {
  for (const file of ['source-serif-4.woff2', 'inter.woff2', 'source-serif-4-italic.woff2']) {
    const uri = `data:font/woff2;base64,${readFileSync(P('public/assets/fonts', file)).toString('base64')}`
    css = css.replaceAll(`url('/assets/fonts/${file}')`, `url('${uri}')`)
  }
  return css
}

/* ---- Inline asset refs inside the HTML (favicon, logo masks) --------- */
function inlineHtmlAssets(html) {
  html = html.replace(/(src|href)="(\/assets\/[^"]+)"/g, (_, attr, path) => `${attr}="${assetUri(path)}"`)
  html = html.replace(/url\('(\/assets\/[^']+)'\)/g, (_, path) => `url('${assetUri(path)}')`)
  return html
}

/* ---- Trimmed runtime: the Contact module + a minimal menu toggle ----- */
function buildScript() {
  const contact = readFileSync(P('src/js/modules/contactPage.js'), 'utf-8').replace(
    /export function init/,
    'function contactInit'
  )
  return `
${contact}

(function(){
  // Boot the contact module
  document.querySelectorAll('[data-module="contact"]').forEach(function(el){ contactInit(el); });

  // Minimal glass-drawer menu (no GSAP/Lenis in the standalone build)
  var menu = document.getElementById('site-menu');
  var trigger = document.querySelector('[data-menu-trigger]');
  if (menu && trigger) {
    var label = trigger.querySelector('[data-menu-label]');
    function open(){ menu.dataset.open='true'; menu.removeAttribute('inert'); document.body.dataset.menuOpen='true'; trigger.setAttribute('aria-expanded','true'); if(label) label.textContent='Close'; }
    function close(){ menu.dataset.open='false'; menu.setAttribute('inert',''); delete document.body.dataset.menuOpen; trigger.setAttribute('aria-expanded','false'); if(label) label.textContent='Menu'; }
    trigger.addEventListener('click', function(){ menu.dataset.open==='true' ? close() : open(); });
    menu.querySelectorAll('[data-menu-close]').forEach(function(el){ el.addEventListener('click', close); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape' && menu.dataset.open==='true') close(); });
  }
})();
`
}

/* ---- Standalone-only CSS: force the menu to slide via CSS ------------ */
const MENU_CSS = `
/* standalone menu: CSS-driven slide (no GSAP) */
.menu{ transition: opacity .4s ease !important; }
.menu[data-open="false"]{ opacity:0 !important; visibility:hidden !important; pointer-events:none !important; }
.menu[data-open="true"]{ opacity:1 !important; visibility:visible !important; pointer-events:auto !important; }
.menu__panel{ transition: transform .55s cubic-bezier(.22,1,.36,1) !important; transform: translateX(104%); }
.menu[data-open="true"] .menu__panel{ transform: none; }
.menu__scrim{ transition: opacity .45s ease; opacity:0; }
.menu[data-open="true"] .menu__scrim{ opacity:1; }
`

async function build() {
  let html = readFileSync(P('connect/index.html'), 'utf-8')
  html = expandPartials(html)

  // contact.css lives page-side (a <link>, not a main.css @import), so
  // append it explicitly after the compiled site CSS.
  let css = inlineCssAssets(compileSiteCss())
  css += '\n' + inlineCssAssets(readFileSync(P('src/styles/components/contact.css'), 'utf-8'))
  css = inlineFonts(css)
  css += MENU_CSS

  // Drop dev-only bits, inline assets, then inject compiled CSS + script.
  html = html
    .replace(/<link\s+rel="preload"[^>]*>/g, '')
    .replace(/<link\s+rel="stylesheet"\s+href="\/src\/[^"]*"[^>]*>/g, '')
    .replace(/<script[^>]*src="\/src\/js\/main\.js"[^>]*><\/script>/g, '')
  html = inlineHtmlAssets(html)
  html = html.replace('</head>', `  <style>\n${css}\n  </style>\n  </head>`)
  html = html.replace('</body>', `  <script>\n${buildScript()}\n  </script>\n  </body>`)

  // Self-contained gate: no remaining external refs.
  const stray = html.match(/(?:src|href)="(?:\/assets|\/src|https?:)[^"]*"|url\('\/assets[^']*'\)/)
  if (stray) console.warn('⚠ external ref remains:', stray[0].slice(0, 70))

  const out = P('contact-standalone.html')
  writeFileSync(out, html)
  console.log(`contact-standalone.html  ${Math.round(Buffer.byteLength(html) / 1024)} KB  → ${out}`)
}

await build()
