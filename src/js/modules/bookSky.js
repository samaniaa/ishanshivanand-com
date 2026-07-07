import { gsap } from '../core/scroll.js'
import { lenis } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

/**
 * The book page's own half-day sky — a bespoke arc (blue midday → haze →
 * golden → dusk → deep evening) with a setting sun, a rising moon, and a
 * dune range whose palette warms then cools. Ported from Aarti's Claude
 * Design `tick()`; the phase math and easings are hers, verbatim.
 *
 * Layers/sun/moon/dunes are authored fully visible-safe: the fixed sky is
 * decorative (aria-hidden) and the page reads without it. Motion lives
 * only inside the motionOK context; reduced motion steps the sky between
 * phases with no travelling light (mirrors modules/day.js).
 *
 * Ink: rather than colour the content directly, we flip body[data-phase]
 * to 'dark' at dusk so the site's shared ink/header system (tokens +
 * day.css) recolours in lockstep.
 */
const c01 = (v) => Math.min(1, Math.max(0, v))

function hexLerp(a, b, t) {
  const c = (h, i) => parseInt(h.slice(i, i + 2), 16)
  const mix = (i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * t)
  return '#' + [1, 3, 5].map((i) => mix(i).toString(16).padStart(2, '0')).join('')
}

export function init(root) {
  root = root || document
  const q = (s) => root.querySelector(s)
  const els = {
    haze: q('[data-sky="haze"]'),
    golden: q('[data-sky="golden"]'),
    dusk: q('[data-sky="dusk"]'),
    deep: q('[data-sky="deep"]'),
    stars: q('[data-stars]'),
    sun: q('[data-sun]'),
    sunSet: q('[data-sun-set]'),
    sunDay: q('[data-sun-day]'),
    moon: q('[data-moon]'),
    range: q('[data-range]'),
    aGolden: q('[data-anchor="golden"]'),
    aDusk: q('[data-anchor="dusk"]'),
    aDeep: q('[data-anchor="deep"]'),
    close: q('[data-anchor="close"]'),
    closeSpans: Array.from(root.querySelectorAll('[data-close-reveal]')),
  }
  if (!els.aGolden || !els.aDusk || !els.aDeep) return

  const setInk = (dark) => {
    if (dark) document.body.dataset.phase = 'dark'
    else delete document.body.dataset.phase
  }

  mm.add(MQ.motionOK, () => {
    const topOf = (el) => el.getBoundingClientRect().top + window.scrollY
    const progK = (el, k) => c01((window.scrollY + window.innerHeight * 0.95 - topOf(el)) / (window.innerHeight * k))

    function tick() {
      const vh = window.innerHeight
      if (!vh) return
      const tg = progK(els.aGolden, 1.4)
      const td = progK(els.aDusk, 1.8)
      const tn = progK(els.aDeep, 1.8)

      // Blue never blends straight into orange (reads grey): a warm haze
      // fades in first, then the hot golden sky over it.
      if (els.haze) els.haze.style.opacity = String(c01(tg * 1.7))
      els.golden.style.opacity = String(c01((tg - 0.3) / 0.7))
      els.dusk.style.opacity = String(td)
      els.deep.style.opacity = String(tn)
      if (els.stars) els.stars.style.opacity = String(0.4 * c01((tn - 0.3) / 0.7))

      const docH = document.documentElement.scrollHeight
      const sf = c01(window.scrollY / Math.max(1, docH - vh))
      const p2 = 0.42 + 0.58 * sf

      if (els.range) {
        els.range.style.opacity = String(0.98 * tg)
        const lerp3 = (g, d, n) => hexLerp(hexLerp(g, d, td), n, tn)
        const P = {
          '--lit-hi': lerp3('#ffd98a', '#e8a670', '#b0787a'),
          '--lit-lo': lerp3('#ec8f3d', '#c17348', '#7c4e5e'),
          '--shadow-hi': lerp3('#c1732f', '#8a5a48', '#5a3a52'),
          '--shadow-lo': lerp3('#7e4a22', '#54352c', '#39263e'),
          '--crest': lerp3('#ffe9b0', '#f2c08a', '#e0a080'),
          '--far': lerp3('#d9974f', '#a06a52', '#6e4a62'),
        }
        for (const [k, v] of Object.entries(P)) els.range.style.setProperty(k, v)
      }

      const vwU = window.innerWidth / 100
      const vhU = vh / 100
      const st = c01((p2 - 0.08) / 0.78)
      const setT = c01(0.55 * tg + 0.6 * td)
      const shrink = 1 - 0.24 * setT
      const sink = 14 * tg + 12 * td
      if (els.sun) {
        // Start further left (78 vs the design's 84) so the hero sun sits
        // clear of the right-column tree stage; it still travels left and
        // sets behind the dunes.
        els.sun.style.transform =
          'translate(' + (78 - 70 * st) * vwU + 'px,' + (100 - 92 * Math.sin(Math.PI * st) + sink) * vhU + 'px) scale(' + shrink + ')'
        const horizonFade = c01(1 - (td - 0.6) / 0.4)
        els.sun.style.opacity = String(horizonFade * (1 - 0.4 * tn))
      }
      if (els.sunSet) els.sunSet.style.opacity = String(setT)
      if (els.sunDay) els.sunDay.style.opacity = String(1 - setT)

      if (els.moon) {
        const rise = c01(0.65 * td + 0.35 * tn)
        els.moon.style.transform = 'translate(' + (80 - 6 * rise) * vwU + 'px,' + (92 - 62 * rise) * vhU + 'px)'
        els.moon.style.opacity = String(0.7 * c01(rise / 0.2))
      }

      if (els.close && els.closeSpans.length) {
        const revealed = window.scrollY + vh * 0.85 >= topOf(els.close) + vh * 0.15
        els.closeSpans.forEach((sp) => (sp.style.opacity = revealed ? '1' : '0.08'))
      }

      setInk(td >= 0.6)
    }

    const onScroll = () => tick()
    lenis.on('scroll', onScroll)
    window.addEventListener('resize', onScroll)
    tick()
    // Settle after fonts/layout shift the anchors.
    const t = setTimeout(tick, 120)
    document.fonts?.ready.then(tick)

    return () => {
      clearTimeout(t)
      lenis.off('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      setInk(false)
    }
  })

  // Reduced motion: no travelling light; step the sky and ink by the
  // section in view (mirrors day.js). Close text shown in full.
  mm.add(MQ.reduced, () => {
    if (els.sun) els.sun.style.display = 'none'
    if (els.moon) els.moon.style.display = 'none'
    els.closeSpans.forEach((sp) => (sp.style.opacity = '1'))
    if (els.range) els.range.style.opacity = '1'

    const layers = [els.haze, els.golden, els.dusk, els.deep]
    const step = (name) => {
      const on = { haze: 1, golden: 2, dusk: 3, deep: 4 }[name] ?? 0
      layers.forEach((l, i) => l && (l.style.opacity = i + 1 <= on ? '1' : '0'))
      if (els.stars) els.stars.style.opacity = name === 'deep' ? '0.4' : '0'
      setInk(name === 'dusk' || name === 'deep')
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && step(e.target.dataset.anchor)),
      { rootMargin: '-45% 0px -45% 0px' }
    )
    ;[els.aGolden, els.aDusk, els.aDeep, els.close].forEach((s) => s && io.observe(s))
    return () => io.disconnect()
  })
}
