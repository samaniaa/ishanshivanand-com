import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

/**
 * The dawn→dusk journey. Fixed gradient layers cross-fade by opacity
 * (compositor-only); ink color flips once via body[data-theme="dusk"]
 * at the dusk threshold rather than being scrubbed (a continuous text
 * color interpolation would restyle the whole tree per frame).
 */
export function init(el) {
  const dawn = el.querySelector('[data-sky="dawn"]')
  const day = el.querySelector('[data-sky="day"]')
  const dusk = el.querySelector('[data-sky="dusk"]')
  const threshold = document.querySelector('[data-dusk-threshold]')

  mm.add(MQ.motionOK, () => {
    ;[dawn, day, dusk].forEach((l) => l.classList.add('sky__layer--animating'))

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: 0,
        end: 'max',
        scrub: 0.6,
      },
    })
    // Dawn holds through the hero, dissolves into day through the
    // proof/showreel middle, and dusk gathers across the final zone.
    tl.to(dawn, { opacity: 0, ease: 'none', duration: 0.3 }, 0.12)
      .to(day, { opacity: 1, ease: 'none', duration: 0.3 }, 0.12)
      .to(dusk, { opacity: 1, ease: 'none', duration: 0.22 }, 0.7)
  })

  // Theme flip is NOT scrubbed: one eased swap, both directions.
  // Runs in reduced-motion too (it is a color change, not movement).
  if (threshold) {
    ScrollTrigger.create({
      trigger: threshold,
      start: 'top 55%',
      onEnter: () => (document.body.dataset.theme = 'dusk'),
      onLeaveBack: () => delete document.body.dataset.theme,
    })
  }

  mm.add(MQ.reduced, () => {
    // Static compromise: keep the dawn field; dusk still applies via the
    // threshold trigger so the dark footer zone remains legible.
    gsap.set(dawn, { opacity: 1 })
    gsap.set(day, { opacity: 0 })
  })

  // Reduced-motion dusk visual: when theme flips, show the dusk layer
  // immediately so light text sits on the dark field.
  const observer = new MutationObserver(() => {
    const isDusk = document.body.dataset.theme === 'dusk'
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dusk.style.opacity = isDusk ? '1' : '0'
      dawn.style.opacity = isDusk ? '0' : '1'
      dusk.style.transition = dawn.style.transition = 'opacity .6s ease'
    }
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
}
