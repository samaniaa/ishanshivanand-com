import { gsap, ScrollTrigger } from '../core/scroll.js'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

/**
 * Masked line reveal used across the site (hero vision, tease titles,
 * testimonials, menu links).
 *
 * Returns the SplitText instance, or null in reduced-motion contexts
 * (call sites guard via mm contexts; this is a second gate).
 *
 * options:
 *   scrollTrigger — pass an element to reveal on scroll; omit for
 *                   manual control via the returned timeline
 *   delay/stagger/duration — timing knobs
 */
export function splitReveal(el, { trigger = null, delay = 0, stagger = 0.09, duration = 1.1, start = 'top 78%' } = {}) {
  let tween
  const split = SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'line',
    autoSplit: true,
    onSplit(self) {
      tween = gsap.from(self.lines, {
        yPercent: 112,
        duration,
        stagger,
        delay,
        ease: 'power4.out',
        paused: !!trigger,
        scrollTrigger: trigger
          ? { trigger, start, once: true }
          : undefined,
      })
      return tween
    },
  })
  return split
}
