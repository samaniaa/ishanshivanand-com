import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

const fmt = new Intl.NumberFormat('en-US')

/**
 * Stat counters. Width is reserved in CSS (tabular-nums) and the final
 * value is present in markup, so reduced-motion and no-JS render
 * complete numbers with zero layout shift.
 */
export function init(el) {
  const counters = el.querySelectorAll('[data-count]')

  mm.add(MQ.motionOK, () => {
    counters.forEach((node) => {
      const target = Number(node.dataset.count)
      const proxy = { val: 0 }
      node.textContent = fmt.format(0)
      gsap.to(proxy, {
        val: target,
        duration: 1.7,
        ease: 'power2.out',
        snap: { val: 1 },
        scrollTrigger: { trigger: el, start: 'top 74%', once: true },
        onUpdate: () => {
          node.textContent = fmt.format(proxy.val)
        },
      })
    })

    gsap.from(el.querySelectorAll('.stat'), {
      autoAlpha: 0,
      y: 26,
      duration: 0.9,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 74%', once: true },
    })
  })
}
