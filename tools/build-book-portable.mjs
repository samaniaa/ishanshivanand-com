/**
 * Build a single self-contained HTML of the book page for sharing.
 *
 *   1. Vite single-file build (tools/vite.portable.config.mjs) inlines all
 *      JS + CSS into dist-portable/practice-of-immortality/index.html.
 *   2. This script folds in every remaining external asset (images, the two
 *      tree videos, the flipbook page scans, fonts) as base64 data-URIs, so
 *      the result is one file that opens in any browser with no server.
 *
 * Usage: npm run build:portable-page   (runs the vite build first)
 * Output: book-page.html at the repo root.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

console.log('· vite single-file build…')
execSync('npx vite build --config tools/vite.portable.config.mjs', { cwd: root, stdio: 'inherit' })

const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

const cache = new Map()
function dataUri(urlPath) {
  // urlPath like ../assets/img/book/foo.jpg or ./assets/... or /assets/...
  const clean = urlPath.split('?')[0].split('#')[0]
  if (cache.has(clean)) return cache.get(clean)
  const idx = clean.indexOf('assets/')
  const rel = idx >= 0 ? clean.slice(idx) : clean.replace(/^\//, '')
  const file = resolve(root, 'public', rel)
  if (!existsSync(file)) {
    console.warn('  ! missing asset, left as-is:', clean)
    cache.set(clean, urlPath)
    return urlPath
  }
  const ext = clean.slice(clean.lastIndexOf('.')).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'
  const uri = `data:${mime};base64,${readFileSync(file).toString('base64')}`
  cache.set(clean, uri)
  return uri
}

const htmlPath = resolve(root, 'dist-portable/practice-of-immortality/index.html')
let html = readFileSync(htmlPath, 'utf8')

// 1. src/href/poster="…assets/…"  (images, videos, brand svgs, font preloads)
html = html.replace(/(src|href|poster)=("|')((?:\.\.?\/)?assets\/[^"']+)\2/g, (m, attr, q, url) => `${attr}=${q}${dataUri(url)}${q}`)

// 2. CSS url(…assets/…) inside the inlined <style> (fonts, bg images)
html = html.replace(/url\((\s*['"]?)((?:\.\.?\/)?assets\/[^)'"]+)(['"]?)\s*\)/g, (m, pre, url, post) => `url(${pre}${dataUri(url)}${post})`)

const out = resolve(root, 'book-page.html')
writeFileSync(out, html)
const mb = (statSync(out).size / 1e6).toFixed(1)
console.log(`\n✓ book-page.html  (${mb} MB, ${cache.size} assets inlined)`)
