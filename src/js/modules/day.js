import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

/**
 * The day engine. One scrubbed timeline drives:
 *   1. the sky layer cross-fades (compositor-only opacity),
 *   2. the traveling light (crescent moon → sun → moon),
 *   3. the ink phase flips (body[data-phase]),
 * so sky, light, and text can never fall out of step.
 *
 * Phase map (page progress):
 *   predawn 0 → sunrise .10 → morning .20 → midday .34 →
 *   golden .56 → dusk .70 → night .86
 */
const FADE = 0.07

/* Sky phases are anchored to the chapters themselves: each phase begins
   fading in as its first [data-sky-phase] section approaches the
   viewport. Ink flips sit at the midpoint of the morning and dusk
   fades, which land inside the .sky-breath spacers, so the text only
   changes color over empty sky. */
const PHASE_ORDER = ['sunrise', 'morning', 'midday', 'golden', 'dusk', 'night']

function computePhasePositions() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  const positions = {}
  PHASE_ORDER.forEach((key) => {
    const el = document.querySelector(`[data-sky-phase='${key}']`)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    positions[key] = gsap.utils.clamp(
      0.02,
      0.98 - FADE,
      (top - window.innerHeight * 0.72) / max
    )
  })
  return positions
}

/* Two travelers, one circle. The moon arcs down-LEFT and sets behind
   the range as the sun rises from behind the range on the RIGHT; the
   sun arcs over the day and sets LEFT as night lands, and the moon
   returns from the right. Every segment is monotonic in x and y: no
   bounce, no hovering. x in vw, y in vh, o = opacity. */
function buildLightPaths(at) {
  const sunriseAt = at.sunrise ?? 0.08
  const sunriseEnd = (at.morning ?? 0.2) + FADE
  const crossover = (sunriseAt + sunriseEnd) / 2
  const dayApex = ((at.midday ?? 0.35) + (at.golden ?? 0.58)) / 2
  const duskAt = at.dusk ?? 0.72
  const nightAt = at.night ?? 0.86
  const nightEnd = Math.min(nightAt + FADE, 0.985)
  // The range is solid again by here (it re-fades in ahead of the dusk
  // chapter); the sun must not dip below the ridgeline before this.
  const duskSolid = Math.min(duskAt + FADE, nightAt - 0.03)

  return {
    moon: [
      { p: 0, x: 72, y: 16, o: 1 },
      { p: sunriseAt, x: 58, y: 34, o: 1 },
      { p: crossover, x: 36, y: 62, o: 1 },
      { p: sunriseEnd, x: 16, y: 96, o: 1 },
      { p: Math.min(sunriseEnd + 0.02, nightAt - 0.02), x: 15, y: 102, o: 0 },
      { p: nightAt, x: 82, y: 92, o: 0 },
      { p: Math.min(nightAt + 0.02, 0.99), x: 80, y: 84, o: 1 },
      { p: nightEnd, x: 74, y: 34, o: 1 },
      { p: 1, x: 72, y: 18, o: 1 },
    ],
    sun: [
      { p: 0, x: 84, y: 102, o: 0 },
      { p: sunriseAt, x: 84, y: 96, o: 0.9 },
      { p: crossover, x: 76, y: 68, o: 1 },
      { p: sunriseEnd, x: 66, y: 40, o: 1 },
      { p: dayApex, x: 48, y: 10, o: 1 },
      { p: duskAt, x: 34, y: 40, o: 1 },
      // hold above the ridge until the range is solid...
      { p: duskSolid, x: 27, y: 54, o: 1 },
      // ...then dive, so the disc sets BEHIND the mountains
      { p: nightAt, x: 14, y: 100, o: 1 },
      { p: Math.min(nightAt + 0.03, 0.99), x: 12, y: 106, o: 0 },
      { p: 1, x: 12, y: 106, o: 0 },
    ],
  }
}

/* The range's light palette, keyframed on the same progress axis as the
   sky. Snow catches the moon before dawn, gold-rose alpenglow as the
   day breaks, lilac at dusk, and silver again at night. */
const RANGE_VARS = ['alpenglow', 'snowShade', 'far', 'mid', 'near', 'haze']

function buildRangePalette(at) {
  const sunriseMid = (at.sunrise ?? 0.08) + FADE * 0.6
  const morningIn = (at.morning ?? 0.2) + FADE
  const duskIn = (at.dusk ?? 0.72) + FADE
  const nightIn = (at.night ?? 0.86) + FADE
  return [
    { p: 0, alpenglow: '#cdd8ee', snowShade: '#46527d', far: '#2a3560', mid: '#1a2348', near: '#0d1330', haze: '#4a5285' },
    { p: sunriseMid, alpenglow: '#ffd489', snowShade: '#7d6a92', far: '#5a4f80', mid: '#382a50', near: '#1b1533', haze: '#a06a88' },
    { p: morningIn, alpenglow: '#fff3dc', snowShade: '#9db3d8', far: '#c9d4e8', mid: '#93a5c8', near: '#5e7099', haze: '#e8eef8' },
    { p: duskIn, alpenglow: '#efc4d3', snowShade: '#8f86b0', far: '#8a82b0', mid: '#6b6494', near: '#4a4470', haze: '#b7a8cc' },
    // Post-dusk: brand-navy range catching the silver-blue afterglow —
    // lifted off near-black so the close keeps a sign of light (Sky Law 1).
    { p: nightIn, alpenglow: '#b3bcdd', snowShade: '#5a6690', far: '#2f4171', mid: '#1c2b54', near: '#0d2354', haze: '#46527f' },
  ]
}

function sampleRangePalette(palette, p) {
  let a = palette[0]
  let b = palette[palette.length - 1]
  for (let i = 0; i < palette.length - 1; i++) {
    if (p >= palette[i].p && p <= palette[i + 1].p) {
      a = palette[i]
      b = palette[i + 1]
      break
    }
  }
  if (p < palette[0].p) b = a
  if (p > b.p) a = b
  const span = b.p - a.p || 1
  const t = gsap.utils.clamp(0, 1, (p - a.p) / span)
  const out = {}
  RANGE_VARS.forEach((k) => {
    out[k] = gsap.utils.interpolate(a[k], b[k], t)
  })
  return out
}

function sampleLightPath(path, p) {
  let a = path[0]
  let b = path[path.length - 1]
  for (let i = 0; i < path.length - 1; i++) {
    if (p >= path[i].p && p <= path[i + 1].p) {
      a = path[i]
      b = path[i + 1]
      break
    }
  }
  const span = b.p - a.p || 1
  const t = gsap.utils.clamp(0, 1, (p - a.p) / span)
  const ease = t * t * (3 - 2 * t) // smoothstep between keyframes
  return {
    x: a.x + (b.x - a.x) * ease,
    y: a.y + (b.y - a.y) * ease,
    o: a.o + (b.o - a.o) * ease,
  }
}

const RANGE_VAR_NAMES = {
  alpenglow: '--alpenglow',
  snowShade: '--snow-shade',
  far: '--range-far',
  mid: '--range-mid',
  near: '--range-near',
  haze: '--haze',
}

/* The sun's disc colour + size along its arc (tokens-sun.css). Colours
   cross-fade between three stacked discs; size is a scale on the sun
   container. On the homepage's 7-phase slice the disc is soft-peach at
   the horizon bookends (sunrise / dusk) and warm-gold through the day,
   largest at the horizon and smallest at midday. The orange fire disc is
   reserved for daybreak / sundown, which the homepage has no section for. */
const SUN_SIZES = { small: 1.9, medium: 2.4, large: 3.0 }
const SUN_FIELDS = ['peach', 'gold', 'orange', 'scale']

function buildSunLook(at) {
  const S = SUN_SIZES
  return [
    { p: at.sunrise ?? 0.08, peach: 1, gold: 0, orange: 0, scale: S.large },
    { p: at.morning ?? 0.2, peach: 0, gold: 1, orange: 0, scale: S.medium },
    { p: at.midday ?? 0.35, peach: 0, gold: 1, orange: 0, scale: S.small },
    { p: at.golden ?? 0.58, peach: 0, gold: 1, orange: 0, scale: S.medium },
    { p: at.dusk ?? 0.72, peach: 1, gold: 0, orange: 0, scale: S.large },
  ]
}

/* The moon's face + size along its arc (tokens-moon.css). Two crescents
   cross-fade: the SILVER waning hero at the pre-dawn open, the CREAM
   waxing companion at the post-dusk close. The swap happens through the
   day, while the moon is below the horizon (container opacity 0), so it is
   never seen popping between faces. Full size in the morning, ~65% at the
   close. */
const MOON_SIZES = { large: 1.0, small: 0.66 }
const MOON_FIELDS = ['waning', 'waxing', 'scale']

function buildMoonLook(at) {
  const { large: L, small: S } = MOON_SIZES
  return [
    { p: 0, waning: 1, waxing: 0, scale: L },
    { p: at.morning ?? 0.2, waning: 1, waxing: 0, scale: L },
    { p: at.midday ?? 0.35, waning: 0, waxing: 0, scale: (L + S) / 2 },
    { p: at.dusk ?? 0.72, waning: 0, waxing: 1, scale: S },
    { p: 1, waning: 0, waxing: 1, scale: S },
  ]
}

function sampleLook(look, p, fields) {
  let a = look[0]
  let b = look[look.length - 1]
  for (let i = 0; i < look.length - 1; i++) {
    if (p >= look[i].p && p <= look[i + 1].p) {
      a = look[i]
      b = look[i + 1]
      break
    }
  }
  if (p < look[0].p) b = a
  if (p > look[look.length - 1].p) a = b
  const span = b.p - a.p || 1
  const t = gsap.utils.clamp(0, 1, (p - a.p) / span)
  const out = {}
  fields.forEach((k) => (out[k] = a[k] + (b[k] - a[k]) * t))
  return out
}

function sampleSunLook(look, p) {
  return sampleLook(look, p, SUN_FIELDS)
}

function sampleMoonLook(look, p) {
  return sampleLook(look, p, MOON_FIELDS)
}

export function init() {
  const sky = document.querySelector('.day-sky')
  const moonEl = document.querySelector('.celestial--moon')
  const sunEl = document.querySelector('.celestial--sun')
  const range = document.querySelector('.day-range')
  if (!sky) return

  const sunDiscs = {
    peach: sunEl?.querySelector("[data-sun='soft-peach']"),
    gold: sunEl?.querySelector("[data-sun='warm-gold']"),
    orange: sunEl?.querySelector("[data-sun='orange']"),
  }
  const moonDiscs = {
    waning: moonEl?.querySelector("[data-moon='waning']"),
    waxing: moonEl?.querySelector("[data-moon='waxing']"),
  }

  const applyLight = (paths, p) => {
    if (!moonEl || !sunEl) return
    const w = window.innerWidth
    const h = window.innerHeight
    const mp = sampleLightPath(paths.moon, p)
    const sp = sampleLightPath(paths.sun, p)
    gsap.set(moonEl, { x: (mp.x / 100) * w, y: (mp.y / 100) * h, opacity: mp.o })
    gsap.set(sunEl, { x: (sp.x / 100) * w, y: (sp.y / 100) * h, opacity: sp.o })
  }

  // The sun's disc colour (cross-fade of the three stacked discs) and its
  // size (a scale on the container) as it climbs and sets.
  const applySun = (look, p) => {
    if (!sunEl) return
    const s = sampleSunLook(look, p)
    if (sunDiscs.peach) sunDiscs.peach.style.opacity = s.peach
    if (sunDiscs.gold) sunDiscs.gold.style.opacity = s.gold
    if (sunDiscs.orange) sunDiscs.orange.style.opacity = s.orange
    sunEl.style.scale = String(s.scale)
  }

  // The moon's face (waning silver ↔ waxing cream cross-fade) and its size.
  const applyMoon = (look, p) => {
    if (!moonEl) return
    const m = sampleMoonLook(look, p)
    if (moonDiscs.waning) moonDiscs.waning.style.opacity = m.waning
    if (moonDiscs.waxing) moonDiscs.waxing.style.opacity = m.waxing
    moonEl.style.scale = String(m.scale)
  }

  const applyRangePalette = (pal) => {
    if (!range) return
    RANGE_VARS.forEach((k) => {
      range.style.setProperty(RANGE_VAR_NAMES[k], pal[k])
    })
  }

  const layers = Object.fromEntries(
    [...sky.querySelectorAll('.day-sky__layer')].map((l) => [l.dataset.sky, l])
  )
  const stars = sky.querySelector('.day-sky__stars')

  mm.add(MQ.motionOK, () => {
    let tl = null
    let inkToDay = 0.25
    let inkToDark = 0.75
    let lightPaths = buildLightPaths({})
    let rangePalette = buildRangePalette({})
    let sunLook = buildSunLook({})
    let moonLook = buildMoonLook({})

    const setPhase = (p) => {
      const dark = p < inkToDay || p >= inkToDark
      if (dark) document.body.dataset.phase = 'dark'
      else delete document.body.dataset.phase
    }

    function build() {
      tl?.scrollTrigger?.kill()
      tl?.kill()

      const at = computePhasePositions()
      // Pull the whole night landing earlier: the sky fade, the moonrise,
      // and the ink flip must all finish just BEFORE Work with Ishan's
      // text enters the viewport, so they play out over the long
      // sky-breath — and the sun has already set behind the solid range
      // while there is still dusk light.
      if (at.night != null) {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const vhP = window.innerHeight / max
        at.night = Math.max(at.night - FADE - 0.18 * vhP, (at.dusk ?? 0) + FADE + 0.02)
      }
      inkToDay = (at.morning ?? 0.2) + FADE / 2
      // Flip to light-on-dark only once the night sky has fully landed
      // (end of the fade, not its midpoint).
      inkToDark = (at.night ?? 0.86) + FADE
      lightPaths = buildLightPaths(at)
      rangePalette = buildRangePalette(at)
      sunLook = buildSunLook(at)
      moonLook = buildMoonLook(at)

      tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: document.body,
          start: 0,
          end: 'max',
          scrub: 0.5,
          onUpdate(self) {
            setPhase(self.progress)
            applyRangePalette(sampleRangePalette(rangePalette, self.progress))
            applyLight(lightPaths, self.progress)
            applySun(sunLook, self.progress)
            applyMoon(moonLook, self.progress)
          },
        },
      })

      // Pin the timeline's duration to exactly 1 so tween positions and
      // ScrollTrigger progress share one axis. Without this the duration
      // equals the last tween's end (<1) and every positioned tween
      // fires LATE relative to setPhase/applyLight, which read raw
      // progress — the range stayed hazy through the sunset.
      tl.to({}, { duration: 0 }, 1)

      // Later layers sit above earlier ones in the DOM, so fading each
      // one IN is a complete cross-fade.
      PHASE_ORDER.forEach((key) => {
        if (layers[key] && at[key] != null) {
          tl.to(layers[key], { opacity: 1, duration: FADE }, at[key])
        }
      })

      // Stars live in the dark phases only
      if (stars) {
        tl.set(stars, { opacity: 1 }, 0)
          .to(stars, { opacity: 0, duration: 0.05 }, (at.sunrise ?? 0.06) + 0.02)
          .to(stars, { opacity: 1, duration: 0.06 }, at.night ?? 0.86)
      }

      // The range holds through pre-dawn and sunrise, dissolves as the
      // morning arrives, and returns with the dusk. Layers drift apart
      // slightly for depth while the scene is on stage.
      if (range) {
        const morningIn = (at.morning ?? 0.2) + FADE * 0.4
        // Solidify with the dusk fade itself: the range must be opaque
        // BEFORE the sun dives, so the disc sets behind the peaks
        // instead of shining through the daytime haze.
        const duskIn = Math.max(at.dusk ?? 0.72, morningIn + FADE + 0.05)
        tl.set(range, { opacity: 1 }, 0)
          .to(range, { opacity: 0.16, duration: FADE }, morningIn)
          .to(range, { opacity: 1, duration: FADE }, duskIn)

        // gentle settle as the day begins
        tl.fromTo(range, { y: 0 }, { y: 16, duration: morningIn, ease: 'none' }, 0)
      }

      // Apply state for the current position immediately: without this
      // the travelers sit at the viewport origin until the first
      // scroll event.
      const p = tl.scrollTrigger.progress
      setPhase(p)
      applyRangePalette(sampleRangePalette(rangePalette, p))
      applyLight(lightPaths, p)
      applySun(sunLook, p)
      applyMoon(moonLook, p)
    }

    // Build after layout settles (fonts can reflow chapter positions),
    // and rebuild when the viewport changes.
    build()
    document.fonts?.ready.then(() => build())
    let resizeT
    const onResize = () => {
      clearTimeout(resizeT)
      resizeT = setTimeout(build, 200)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      tl?.scrollTrigger?.kill()
      tl?.kill()
      delete document.body.dataset.phase
    }
  })

  // Reduced motion: no scrub, no traveling light. Sky, ink, and the
  // range palette still step between phases (color changes, not
  // movement) so every chapter stays readable.
  mm.add(MQ.reduced, () => {
    if (moonEl) moonEl.style.display = 'none'
    if (sunEl) sunEl.style.display = 'none'
    if (stars) stars.style.opacity = '1'

    const REDUCED_RANGE = {
      predawn: { visible: true, pal: { alpenglow: '#cdd8ee', snowShade: '#46527d', far: '#2a3560', mid: '#1a2348', near: '#0d1330', haze: '#4a5285' } },
      sunrise: { visible: true, pal: { alpenglow: '#ffd489', snowShade: '#7d6a92', far: '#5a4f80', mid: '#382a50', near: '#1b1533', haze: '#a06a88' } },
      morning: { visible: 'haze', pal: { alpenglow: '#fff3dc', snowShade: '#9db3d8', far: '#c9d4e8', mid: '#93a5c8', near: '#5e7099', haze: '#e8eef8' } },
      midday: { visible: 'haze', pal: { alpenglow: '#fff6e8', snowShade: '#a9bcd9', far: '#d4dce9', mid: '#9fb0cc', near: '#6b7da3', haze: '#eef2f8' } },
      golden: { visible: 'haze', pal: { alpenglow: '#ffe9c2', snowShade: '#b09ab8', far: '#c3b2cc', mid: '#a390b0', near: '#71618c', haze: '#f4e4d0' } },
      dusk: { visible: true, pal: { alpenglow: '#efc4d3', snowShade: '#8f86b0', far: '#8a82b0', mid: '#6b6494', near: '#4a4470', haze: '#b7a8cc' } },
      night: { visible: true, pal: { alpenglow: '#b3bcdd', snowShade: '#5a6690', far: '#2f4171', mid: '#1c2b54', near: '#0d2354', haze: '#46527f' } },
    }

    const chapters = document.querySelectorAll('[data-sky-phase]')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const key = entry.target.dataset.skyPhase
          Object.entries(layers).forEach(([k, l]) => {
            l.style.opacity = k === key || k === 'predawn' ? '1' : '0'
          })
          const dark = entry.target.dataset.ink === 'dark' && key !== 'dusk'
          if (dark) document.body.dataset.phase = 'dark'
          else delete document.body.dataset.phase
          const r = REDUCED_RANGE[key]
          if (range && r) {
            range.style.opacity = r.visible === 'haze' ? '0.16' : r.visible ? '1' : '0'
            if (r.pal) applyRangePalette(r.pal)
          }
        })
      },
      { rootMargin: '-40% 0px -40% 0px' }
    )
    chapters.forEach((c) => io.observe(c))
    return () => io.disconnect()
  })
}
