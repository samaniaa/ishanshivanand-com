import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

/**
 * The living tree from the book cover.
 *
 * Two Higgsfield-generated clips share one frame: the still composite
 * of the actual cover tree. The GROW clip ends on it; the BREATHE loop
 * starts and ends on it. So the sequence — grow once on enter, then
 * crossfade into the loop — passes through identical frames and reads
 * as one continuous living scene.
 *
 * Contract (core/motion.js): the still composite is the authored
 * baseline, fully visible. It is hidden ONLY inside the motionOK
 * context, so reduced-motion and no-JS visitors see the complete tree.
 * If video playback fails for any reason, the still is restored.
 */
export function init(root) {
  root = root || document.querySelector('[data-book-tree]')
  if (!root) return

  const still = root.querySelector('.book-tree__still')
  const grow = root.querySelector('[data-tree-grow]')
  const loop = root.querySelector('[data-tree-loop]')
  if (!still || !grow || !loop) return

  mm.add(MQ.motionOK, () => {
    // The empty sky IS the section gradient: with the still hidden and
    // the videos transparent, the stage already shows the grow clip's
    // first frame. No pop when playback begins.
    gsap.set(still, { autoAlpha: 0 })
    gsap.set([grow, loop], { autoAlpha: 0 })

    const restoreStill = () => {
      gsap.set(still, { autoAlpha: 1 })
      gsap.set([grow, loop], { autoAlpha: 0 })
    }

    const handoff = () => {
      // The loop's first frame equals the grow clip's last: start it,
      // then dissolve. Any decode hiccup keeps the grow clip's final
      // frame on stage, which is the same image.
      loop
        .play()
        .then(() => {
          gsap.to(loop, { autoAlpha: 1, duration: 0.5, ease: 'none' })
          gsap.set(grow, { autoAlpha: 0, delay: 0.55 })
        })
        .catch(() => {})
    }

    const begin = () => {
      grow
        .play()
        .then(() => {
          gsap.to(grow, { autoAlpha: 1, duration: 0.35, ease: 'none' })
          // Fetch the loop while the tree grows, so the handoff is ready.
          loop.preload = 'auto'
          loop.load()
        })
        .catch(restoreStill)
    }

    grow.addEventListener('ended', handoff)

    // Fetch ahead of arrival; play on arrival, once.
    const preST = ScrollTrigger.create({
      trigger: root,
      start: 'top 160%',
      once: true,
      onEnter: () => {
        grow.preload = 'auto'
        grow.load()
      },
    })
    const playST = ScrollTrigger.create({
      trigger: root,
      start: 'top 68%',
      once: true,
      onEnter: begin,
    })
    // Already in view on load (hero position): grow immediately.
    if (root.getBoundingClientRect().top < window.innerHeight * 0.68) begin()

    return () => {
      preST.kill()
      playST.kill()
      grow.removeEventListener('ended', handoff)
      grow.pause()
      loop.pause()
      restoreStill()
    }
  })
}
