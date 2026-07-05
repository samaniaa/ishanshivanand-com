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
/**
 * Word-by-word surfacing, the site's signature reveal.
 * mode 'scrub' ties word opacity to scroll; 'play' runs once on load
 * (the pre-dawn vision, which sits at the top of the page).
 */
export function wordReveal(el, { mode = 'scrub', delay = 0 } = {}) {
  return SplitText.create(el, {
    type: 'words',
    wordsClass: 'word',
    autoSplit: true,
    onSplit(self) {
      if (mode === 'play') {
        return gsap.fromTo(
          self.words,
          { opacity: 0.001 },
          { opacity: 1, duration: 0.6, stagger: 0.06, delay, ease: 'none' }
        )
      }
      return gsap.fromTo(
        self.words,
        { opacity: 0.13 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 84%',
            end: 'center 45%',
            scrub: 0.4,
          },
        }
      )
    },
  })
}

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
