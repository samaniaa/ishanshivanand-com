import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'
import { wordReveal } from '../utils/splitReveal.js'

/**
 * The book quote's growing tree.
 *
 * As the first-person quote surfaces (wordReveal, the site's signature
 * reveal), the golden tree from the cover DRAWS IN — roots and trunk,
 * then branches out to the tips, then the blossoms open and the doves
 * settle. On completion it hands off to a slow living BREATHE: blossoms
 * shimmer and sway, the canopy rocks a hair, the doves bob.
 *
 * Contract (core/motion.js): the SVG is authored fully grown in markup,
 * so reduced-motion and no-JS visitors always see the whole, still tree.
 * Hidden initial states are set ONLY inside the motionOK context.
 */
export function init(root) {
  root = root || document.querySelector('[data-book-quote]')
  if (!root) return

  const svg = root.querySelector('.tree')
  const quote = root.querySelector('[data-quote]')
  const branches = svg ? [...svg.querySelectorAll('.tree__branch')] : []
  const leaves = svg ? [...svg.querySelectorAll('.tree__leaf')] : []
  const birds = svg ? [...svg.querySelectorAll('.tree__bird')] : []
  const figure = svg ? svg.querySelector('.tree__figure') : null
  const targetScale = (leaf) => parseFloat(leaf.dataset.s) || 1

  // In view at load (a hero at the top of the page, or one the visitor
  // has already scrolled to) plays on load; a section still below the
  // fold waits and draws as it rises in.
  const inView = () => root.getBoundingClientRect().top < window.innerHeight * 0.72

  mm.add(MQ.motionOK, () => {
    // The quote surfaces as the tree grows: on load if it is already in
    // view, otherwise word-by-word with the scroll.
    if (quote) wordReveal(quote, inView() ? { mode: 'play', delay: 0.35 } : {})

    // --- Hidden initial states (motionOK only) ----------------------
    branches.forEach((p) => {
      const len = p.getTotalLength()
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len })
    })
    gsap.set(leaves, { scale: 0, opacity: 0, transformOrigin: '50% 50%' })
    gsap.set(birds, { opacity: 0, y: 6, transformOrigin: '50% 50%' })
    if (figure) gsap.set(figure, { opacity: 0, y: 6 })

    // --- The draw-in timeline (plays once, on enter) ----------------
    const draw = gsap.timeline({ paused: true })

    // Roots and trunk and branches, base -> tip (their DOM order).
    draw.to(
      branches,
      {
        strokeDashoffset: 0,
        duration: 1.6,
        stagger: 0.055,
        ease: 'power1.inOut',
      },
      0
    )

    // Blossoms open as the branches that carry them arrive.
    draw.to(
      leaves,
      {
        scale: (i, t) => targetScale(t),
        opacity: 1,
        duration: 0.7,
        stagger: { each: 0.05, from: 'random' },
        ease: 'back.out(1.7)',
      },
      0.75
    )

    // The meditator settles in with the canopy.
    if (figure) draw.to(figure, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.6)

    // The doves land last.
    draw.to(
      birds,
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.22, ease: 'power2.out' },
      1.7
    )

    draw.eventCallback('onComplete', breathe)

    function breathe() {
      // Each blossom shimmers around its settled size and rocks a hair,
      // on its own slow clock, so the canopy never pulses in unison.
      leaves.forEach((leaf) => {
        const s = targetScale(leaf)
        gsap.to(leaf, {
          scale: s * (1.05 + Math.random() * 0.03),
          duration: 2.4 + Math.random() * 1.6,
          delay: Math.random() * 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
        gsap.to(leaf, {
          rotation: (Math.random() - 0.5) * 5,
          duration: 3 + Math.random() * 2.2,
          delay: Math.random() * 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })

      // A whole-canopy sway: the crown rocks around the trunk base.
      if (svg) {
        const canopy = svg.querySelector('.tree__sway')
        if (canopy) {
          gsap.set(canopy, { transformOrigin: '240px 520px' })
          gsap.to(canopy, {
            rotation: 0.9,
            duration: 6,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          })
        }
      }

      // The doves bob softly.
      birds.forEach((b, i) => {
        gsap.to(b, {
          y: -3,
          duration: 2 + i * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })
    }

    // Play on load if already in view; otherwise draw as it rises in.
    let st
    if (inView()) {
      draw.play()
    } else {
      st = ScrollTrigger.create({
        trigger: root,
        start: 'top 72%',
        once: true,
        onEnter: () => draw.play(),
      })
    }

    return () => {
      st?.kill()
      draw.kill()
      gsap.killTweensOf(leaves)
      gsap.killTweensOf(birds)
    }
  })
}
