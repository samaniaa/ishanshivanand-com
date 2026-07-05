import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'
import { splitReveal } from '../utils/splitReveal.js'

/**
 * Shared reveal grammar for every editorial block (credibility band,
 * teases, testimonials, work routes): overline rule draws, serif title
 * rises in masked lines, body and media follow.
 */
export function init(el) {
  mm.add(MQ.motionOK, () => {
    const overline = el.querySelector('.overline')
    const titles = el.querySelectorAll('[data-reveal-title]')
    const bodies = el.querySelectorAll('[data-reveal-body]')
    const medias = el.querySelectorAll('[data-reveal-media]')

    if (overline) {
      gsap.from(overline, {
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      })
    }

    titles.forEach((t) => splitReveal(t, { trigger: el, start: 'top 76%' }))

    if (bodies.length) {
      gsap.from(bodies, {
        autoAlpha: 0,
        y: 28,
        duration: 1,
        stagger: 0.12,
        delay: 0.25,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 76%', once: true },
      })
    }

    medias.forEach((m) => {
      gsap.fromTo(
        m,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 1.25,
          ease: 'power4.inOut',
          scrollTrigger: { trigger: m, start: 'top 82%', once: true },
        }
      )
    })
  })
}
