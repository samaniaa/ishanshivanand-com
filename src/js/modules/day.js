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

/* The traveling light's path is generated from the same computed phase
   positions as the sky, so the sun always sets exactly as dusk lands.
   x in vw, y in vh. */
function buildLightPath(at) {
  const sunriseAt = at.sunrise ?? 0.08
  const dayMid = ((at.midday ?? 0.35) + (at.golden ?? 0.58)) / 2
  const duskAt = (at.dusk ?? 0.72) + FADE
  const nightAt = at.night ?? 0.88
  return [
    { p: 0.0, x: 74, y: 16, moon: 1, sun: 0 },
    { p: sunriseAt, x: 70, y: 30, moon: 1, sun: 0 },
    { p: sunriseAt + 0.05, x: 67, y: 48, moon: 0, sun: 0.2 },
    { p: (at.morning ?? 0.2) + FADE, x: 56, y: 52, moon: 0, sun: 1 },
    { p: dayMid, x: 62, y: 12, moon: 0, sun: 1 },
    { p: at.dusk ?? 0.7, x: 40, y: 44, moon: 0, sun: 1 },
    { p: duskAt, x: 28, y: 78, moon: 0, sun: 0 },
    { p: nightAt, x: 72, y: 38, moon: 0.2, sun: 0 },
    { p: Math.min(nightAt + 0.06, 0.98), x: 74, y: 20, moon: 1, sun: 0 },
    { p: 1.0, x: 75, y: 16, moon: 1, sun: 0 },
  ]
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
    moon: a.moon + (b.moon - a.moon) * ease,
    sun: a.sun + (b.sun - a.sun) * ease,
  }
}

export function init() {
  const sky = document.querySelector('.day-sky')
  const celestial = document.querySelector('.celestial')
  if (!sky) return

  const layers = Object.fromEntries(
    [...sky.querySelectorAll('.day-sky__layer')].map((l) => [l.dataset.sky, l])
  )
  const stars = sky.querySelector('.day-sky__stars')
  const moon = celestial?.querySelector('.celestial__moon')
  const sun = celestial?.querySelector('.celestial__sun')

  mm.add(MQ.motionOK, () => {
    let tl = null
    let inkToDay = 0.25
    let inkToDark = 0.75
    let lightPath = buildLightPath({})

    const setPhase = (p) => {
      const dark = p < inkToDay || p >= inkToDark
      if (dark) document.body.dataset.phase = 'dark'
      else delete document.body.dataset.phase
    }

    function build() {
      tl?.scrollTrigger?.kill()
      tl?.kill()

      const at = computePhasePositions()
      inkToDay = (at.morning ?? 0.2) + FADE / 2
      inkToDark = (at.dusk ?? 0.72) + FADE / 2
      lightPath = buildLightPath(at)

      tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: document.body,
          start: 0,
          end: 'max',
          scrub: 0.5,
          onUpdate(self) {
            setPhase(self.progress)
            if (!celestial) return
            const s = sampleLightPath(lightPath, self.progress)
            gsap.set(celestial, {
              x: (s.x / 100) * window.innerWidth,
              y: (s.y / 100) * window.innerHeight,
            })
            gsap.set(moon, { opacity: s.moon })
            gsap.set(sun, { opacity: s.sun })
          },
        },
      })

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

      // Apply state for the current position immediately: without this
      // the celestial sits at the viewport origin until the first
      // scroll event.
      const p = tl.scrollTrigger.progress
      setPhase(p)
      if (celestial) {
        const s = sampleLightPath(lightPath, p)
        gsap.set(celestial, {
          x: (s.x / 100) * window.innerWidth,
          y: (s.y / 100) * window.innerHeight,
        })
        gsap.set(moon, { opacity: s.moon })
        gsap.set(sun, { opacity: s.sun })
      }
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

  // Reduced motion: no scrub, no traveling light. Sky and ink still step
  // between phases (a color change, not movement) so every chapter stays
  // readable; a static moon shows in the dark chapters via CSS.
  mm.add(MQ.reduced, () => {
    if (celestial) celestial.style.display = 'none'
    if (stars) stars.style.opacity = '1'

    const chapters = document.querySelectorAll('[data-sky-phase]')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const key = entry.target.dataset.skyPhase
          Object.entries(layers).forEach(([k, l]) => {
            l.style.opacity = k === key || k === 'predawn' ? '1' : '0'
          })
          const dark = entry.target.dataset.ink === 'dark'
          if (dark) document.body.dataset.phase = 'dark'
          else delete document.body.dataset.phase
        })
      },
      { rootMargin: '-40% 0px -40% 0px' }
    )
    chapters.forEach((c) => io.observe(c))
    return () => io.disconnect()
  })
}
