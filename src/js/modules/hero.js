import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'
import { splitReveal } from '../utils/splitReveal.js'
import { markReveal } from '../utils/markReveal.js'

/**
 * Hero entrance (~2s, restrained): mark wipe → vision line stagger →
 * portrait clip reveal → attribution + scroll cue.
 * The portrait is the LCP element: it is revealed with clip-path,
 * never opacity-0, so first paint is not suppressed.
 */
export function init(el) {
  const mark = el.querySelector('[data-hero-mark]')
  const vision = el.querySelector('[data-hero-vision]')
  const attrib = el.querySelector('[data-hero-attrib]')
  const portrait = el.querySelector('[data-hero-portrait]')
  const cue = el.querySelector('[data-hero-cue]')

  mm.add(MQ.motionOK, () => {
    gsap.set(attrib, { autoAlpha: 0, y: 22 })
    gsap.set(cue, { autoAlpha: 0 })
    gsap.set(portrait, { clipPath: 'inset(0 0 100% 0)' })
    gsap.set(portrait.querySelector('img'), { scale: 1.07 })

    markReveal(mark, { duration: 1.4 })
    splitReveal(vision, { delay: 0.3 })

    gsap.timeline({ delay: 0.55 })
      .to(portrait, {
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.3,
        ease: 'power4.inOut',
      })
      .to(
        portrait.querySelector('img'),
        { scale: 1, duration: 1.3, ease: 'power4.inOut' },
        '<'
      )
      .to(attrib, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.45')
      .to(cue, { autoAlpha: 1, duration: 0.8 }, '-=0.4')
  })

  // Portrait parallax: desktop, motion-permitting
  mm.add(`${MQ.motionOK} and ${MQ.desktop}`, () => {
    const img = portrait.querySelector('img')
    gsap.fromTo(
      img,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      }
    )
  })
}
