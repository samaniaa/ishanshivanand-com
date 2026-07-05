import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'
import { wordReveal } from '../utils/splitReveal.js'

/**
 * One reveal grammar for every chapter:
 * - [data-vision]: the pre-dawn vision line, timed word surfacing on load
 * - [data-word-reveal]: statements and quotes surface with the scroll
 * - [data-rise] / [data-rise-children]: blocks rise softly, once
 * - [data-drift]: the philanthropy row drifts laterally as it passes
 */
export function init() {
  const vision = document.querySelector('[data-vision]')

  mm.add(MQ.motionOK, () => {
    if (vision) wordReveal(vision, { mode: 'play', delay: 0.5 })

    document.querySelectorAll('[data-word-reveal]').forEach((el) => wordReveal(el))

    document.querySelectorAll('[data-rise]').forEach((el) => {
      const items = el.hasAttribute('data-rise-children') ? [...el.children] : [el]
      gsap.from(items, {
        autoAlpha: 0,
        y: 30,
        duration: 1.1,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      })
    })

    document.querySelectorAll('[data-drift]').forEach((el) => {
      gsap.fromTo(
        el,
        { xPercent: 4 },
        {
          xPercent: -4,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5,
          },
        }
      )
    })
  })
}
