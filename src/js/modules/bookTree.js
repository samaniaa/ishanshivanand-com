import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

/**
 * The living tree from the book cover.
 *
 * Two Higgsfield-generated clips share one frame: the still composite
 * of the actual cover tree. The GROW clip ends on it; the BREATHE loop
 * starts and ends on it. Grow plays once on enter, slightly slowed,
 * then dissolves into the loop.
 *
 * Seam-hiding (Aarti's feedback, 7 Jul): the handoff begins BEFORE the
 * grow clip ends so the dissolve overlaps live motion instead of
 * snapping on 'ended'; and the breathe loop is double-buffered — two
 * copies of the clip alternate with a crossfade at each pass — so the
 * loop never visibly restarts.
 *
 * Contract (core/motion.js): the still composite is the authored
 * baseline, fully visible. It is hidden ONLY inside the motionOK
 * context, so reduced-motion and no-JS visitors see the complete tree.
 * If video playback fails for any reason, the still is restored.
 */
const GROW_RATE = 0.8 // slightly slower growth: the 5s clip plays over ~6.3s
const HANDOFF_EARLY = 0.7 // media-seconds before the grow's end to begin the dissolve
const HANDOFF_FADE = 1.2
const LOOP_FADE = 0.9 // loop-to-loop dissolve that hides the seam
const LOOP_MARGIN = 0.35 // timeupdate fires ~4Hz; trigger with headroom

export function init(root) {
  root = root || document.querySelector('[data-book-tree]')
  if (!root) return

  const stage = root.querySelector('.book-tree__stage')
  const still = root.querySelector('.book-tree__still')
  const grow = root.querySelector('[data-tree-grow]')
  const loopEl = root.querySelector('[data-tree-loop]')
  if (!stage || !still || !grow || !loopEl) return

  mm.add(MQ.motionOK, () => {
    // The empty sky IS the section gradient: with the still hidden and
    // the videos transparent, the stage already shows the grow clip's
    // first frame. No pop when playback begins.
    gsap.set(still, { autoAlpha: 0 })

    // Double-buffer the breathe loop: a JS-managed pair replaces the
    // native loop attribute (a native wrap mid-dissolve would jump
    // beneath the fade).
    const loopTwin = loopEl.cloneNode(true)
    loopTwin.removeAttribute('data-tree-loop')
    stage.append(loopTwin)
    const loops = [loopEl, loopTwin]
    loops.forEach((v) => v.removeAttribute('loop'))

    gsap.set([grow, ...loops], { autoAlpha: 0 })
    grow.playbackRate = GROW_RATE

    const restoreStill = () => {
      gsap.set(still, { autoAlpha: 1 })
      gsap.set([grow, ...loops], { autoAlpha: 0 })
    }

    // --- grow -> breathe, dissolving over live motion ----------------
    let handed = false
    const handoff = () => {
      if (handed) return
      handed = true
      // The canopy is essentially complete here — let the page bring the
      // quote up as the tree finishes building.
      root.dispatchEvent(new CustomEvent('tree:grown'))
      loops[0].currentTime = 0
      loops[0]
        .play()
        .then(() => {
          gsap.to(loops[0], { autoAlpha: 1, duration: HANDOFF_FADE, ease: 'none' })
          gsap.set(grow, { autoAlpha: 0, delay: HANDOFF_FADE + 0.1 })
        })
        .catch(() => {
          // The grow clip's final frame stays on stage — same image.
        })
    }
    const onGrowTime = () => {
      if (grow.duration && grow.duration - grow.currentTime <= HANDOFF_EARLY) handoff()
    }
    grow.addEventListener('timeupdate', onGrowTime)
    grow.addEventListener('ended', handoff) // backstop

    // --- the seamless breathe: alternate the pair at each pass -------
    let active = 0
    let switching = false
    const onLoopTime = () => {
      const cur = loops[active]
      if (switching || !cur.duration) return
      if (cur.duration - cur.currentTime > LOOP_FADE + LOOP_MARGIN) return
      switching = true
      const next = loops[1 - active]
      next.currentTime = 0
      next
        .play()
        .then(() => {
          gsap.to(next, { autoAlpha: 1, duration: LOOP_FADE, ease: 'none' })
          gsap.delayedCall(LOOP_FADE + 0.05, () => {
            gsap.set(cur, { autoAlpha: 0 })
            cur.pause()
            active = 1 - active
            switching = false
          })
        })
        .catch(() => {
          switching = false
        })
    }
    loops.forEach((v) => v.addEventListener('timeupdate', onLoopTime))

    const begin = () => {
      grow
        .play()
        .then(() => {
          gsap.to(grow, { autoAlpha: 1, duration: 0.35, ease: 'none' })
          // Fetch the loop while the tree grows, so the handoff is ready.
          loops.forEach((v) => {
            v.preload = 'auto'
            v.load()
          })
        })
        .catch(restoreStill)
    }

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
      grow.removeEventListener('timeupdate', onGrowTime)
      grow.removeEventListener('ended', handoff)
      loops.forEach((v) => v.removeEventListener('timeupdate', onLoopTime))
      grow.pause()
      loops.forEach((v) => v.pause())
      loopTwin.remove()
      gsap.set(still, { autoAlpha: 1 })
      gsap.set(grow, { autoAlpha: 0 })
      gsap.set(loopEl, { autoAlpha: 0 })
    }
  })
}
