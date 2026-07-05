import { gsap, ScrollTrigger } from './scroll.js'

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

/**
 * Catch-up pass for reveal triggers.
 *
 * When the page loads already scrolled (hash link, browser scroll
 * restoration) or SplitText re-splits after the web font arrives, a
 * trigger's start line can already be above the viewport at creation
 * time, so its toggleAction never fires and the section stays hidden.
 * Play any non-scrub animation whose trigger has been passed.
 */
export function catchUpReveals() {
  ScrollTrigger.refresh()
  if (import.meta.env.DEV) {
    console.debug(
      '[catchup] scrollY=%s triggers=%s passed=%s',
      window.scrollY,
      ScrollTrigger.getAll().length,
      ScrollTrigger.getAll().filter((st) => st.progress > 0).length
    )
  }
  ScrollTrigger.getAll().forEach((st) => {
    if (st.vars.scrub || !st.animation) return
    if (st.progress > 0 && st.animation.progress() === 0) {
      // Render the settled state instantly: content the visitor has
      // already scrolled past should not animate late.
      st.animation.progress(1)
    }
  })
}

export function scheduleCatchUp() {
  // setTimeout rather than rAF: rAF never fires in background tabs, and
  // the catch-up must run even if the page loads unfocused.
  const run = () => setTimeout(catchUpReveals, 60)
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
  document.fonts?.ready.then(run)
}

if (import.meta.env.DEV) {
  // QA hook: flip the page into reduced-motion behavior at runtime.
  window.__forceReducedMotion = () => {
    gsap.globalTimeline.progress(1)
    mm.revert()
    document.documentElement.dataset.forcedReduced = 'true'
  }
}
