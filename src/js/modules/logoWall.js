import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

export function init(el) {
  mm.add(MQ.motionOK, () => {
    gsap.from(el.querySelector('.logo-wall__intro'), {
      autoAlpha: 0,
      duration: 0.8,
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    })
    ScrollTrigger.batch(el.querySelectorAll('.logo-wall__cell'), {
      start: 'top 86%',
      once: true,
      onEnter: (cells) =>
        gsap.from(cells, {
          autoAlpha: 0,
          y: 18,
          duration: 0.8,
          stagger: 0.05,
          ease: 'power2.out',
        }),
    })
  })
}
