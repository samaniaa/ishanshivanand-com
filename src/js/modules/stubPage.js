import { gsap } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'
import { splitReveal } from '../utils/splitReveal.js'

export function init(el) {
  mm.add(MQ.motionOK, () => {
    gsap.from(el.querySelector('.stub__eyebrow'), { autoAlpha: 0, duration: 0.8, delay: 0.1 })
    splitReveal(el.querySelector('.stub__title'), { delay: 0.25 })
    gsap.from([el.querySelector('.stub__body'), el.querySelector('.stub__links')], {
      autoAlpha: 0,
      y: 24,
      duration: 0.9,
      stagger: 0.12,
      delay: 0.7,
      ease: 'power3.out',
    })
  })
}
