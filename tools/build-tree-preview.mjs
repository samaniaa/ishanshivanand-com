/**
 * Regenerate tree-preview.html: the self-contained review page for the
 * living cover tree (both clips + the still embedded as data URIs, so
 * the file opens from anywhere — Desktop, mail, anywhere).
 *
 * Mirrors the sequencing in src/js/modules/bookTree.js: slowed grow,
 * early-overlap dissolve into the loop, double-buffered loop crossfade.
 * Keep the constants in sync with the module.
 *
 * Usage: npm run build:tree-preview
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs'

const b64 = (p) => readFileSync(p).toString('base64')
const grow = b64('public/assets/video/book/grow-in.mp4')
const loop = b64('public/assets/video/book/sway-loop.mp4')
const still = b64('public/assets/img/book/frame-tree.webp')

const html = `<!doctype html>
<html lang="en">
<!-- Self-contained review page for the living cover tree. Everything is
     embedded; regenerate with: npm run build:tree-preview -->
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>The Living Tree</title>
<style>
  html, body { margin: 0; height: 100%; }
  body {
    display: grid; place-items: center;
    background: linear-gradient(180deg, #6ca0df 0%, #a1c6ee 50%, #deeaf7 100%);
    font: 13px system-ui; color: rgb(23 36 69 / 0.55);
  }
  .stage { position: relative; aspect-ratio: 3 / 4; height: min(92svh, 52rem); max-width: 96vw; }
  video, img.still {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: contain; opacity: 0;
  }
  .ui { position: fixed; bottom: 14px; left: 0; right: 0; text-align: center; letter-spacing: 0.06em; }
  button {
    font: 13px system-ui; letter-spacing: 0.06em; cursor: pointer;
    border: 1px solid rgb(23 36 69 / 0.25); border-radius: 999px;
    background: rgb(255 255 255 / 0.7); color: #172445; padding: 8px 18px;
  }
</style>
</head>
<body>
  <div class="stage">
    <img class="still" id="still" src="data:image/webp;base64,${still}" alt="" />
    <video id="grow" muted playsinline preload="auto" src="data:video/mp4;base64,${grow}"></video>
    <video id="loopA" muted playsinline preload="auto" src="data:video/mp4;base64,${loop}"></video>
    <video id="loopB" muted playsinline preload="auto" src="data:video/mp4;base64,${loop}"></video>
  </div>
  <p class="ui"><button id="btn">&#8635;&nbsp; Grow the tree</button></p>
  <script>
    // Keep in sync with src/js/modules/bookTree.js
    const GROW_RATE = 0.8
    const HANDOFF_EARLY = 0.7
    const HANDOFF_FADE = 1.2
    const LOOP_FADE = 0.9
    const LOOP_MARGIN = 0.35

    const grow = document.getElementById('grow')
    const still = document.getElementById('still')
    const loops = [document.getElementById('loopA'), document.getElementById('loopB')]
    const btn = document.getElementById('btn')

    grow.playbackRate = GROW_RATE

    const fade = (el, to, dur) => {
      el.style.transition = 'opacity ' + dur + 's linear'
      requestAnimationFrame(() => { el.style.opacity = to })
    }
    const snap = (el, to) => {
      el.style.transition = 'none'
      el.style.opacity = to
    }

    let handed = false
    let active = 0
    let switching = false

    function start() {
      handed = false; active = 0; switching = false
      loops.forEach((v) => { v.pause(); snap(v, 0) })
      snap(grow, 0)
      grow.currentTime = 0
      grow.play().then(() => { fade(grow, 1, 0.35) })
        .catch(() => { snap(still, 1); btn.textContent = 'Tap to play' })
    }

    function handoff() {
      if (handed) return
      handed = true
      const first = loops[0]
      first.currentTime = 0
      first.play().then(() => {
        fade(first, 1, HANDOFF_FADE)
        setTimeout(() => snap(grow, 0), (HANDOFF_FADE + 0.1) * 1000)
      }).catch(() => {})
    }
    grow.addEventListener('timeupdate', () => {
      if (grow.duration && grow.duration - grow.currentTime <= HANDOFF_EARLY) handoff()
    })
    grow.addEventListener('ended', handoff)

    function onLoopTime() {
      const cur = loops[active]
      if (switching || !cur.duration) return
      if (cur.duration - cur.currentTime > LOOP_FADE + LOOP_MARGIN) return
      switching = true
      const next = loops[1 - active]
      next.currentTime = 0
      next.play().then(() => {
        fade(next, 1, LOOP_FADE)
        setTimeout(() => {
          snap(cur, 0)
          cur.pause()
          active = 1 - active
          switching = false
        }, (LOOP_FADE + 0.05) * 1000)
      }).catch(() => { switching = false })
    }
    loops.forEach((v) => v.addEventListener('timeupdate', onLoopTime))

    btn.addEventListener('click', start)
    start()
  </script>
</body>
</html>`

writeFileSync('tree-preview.html', html)
console.log('tree-preview.html', (statSync('tree-preview.html').size / 1e6).toFixed(1), 'MB')
