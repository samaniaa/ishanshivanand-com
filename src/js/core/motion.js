import { gsap } from './scroll.js'

/**
 * Shared matchMedia contexts. Section modules register their animations
 * inside mm.add() so breakpoint and reduced-motion changes revert cleanly.
 *
 * Contract: markup is authored fully visible. Hidden initial states are
 * applied ONLY inside the motionOK context, so reduced-motion users and
 * no-JS users always see complete content.
 */
export const mm = gsap.matchMedia()

export const MQ = {
  motionOK: '(prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
  desktop: '(min-width: 900px)',
}

export const EASE = 'power4.out'
export const DUR = 1.1

if (import.meta.env.DEV) {
  // QA hook: flip the page into reduced-motion behavior at runtime.
  window.__forceReducedMotion = () => {
    gsap.globalTimeline.progress(1)
    mm.revert()
    document.documentElement.dataset.forcedReduced = 'true'
  }
}
