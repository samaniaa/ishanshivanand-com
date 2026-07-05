import { gsap, ScrollTrigger } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'
import { canWebGL, isLowPower, prefersReducedMotion } from '../core/capabilities.js'

/**
 * Showreel section. The DOM baseline is the CSS grid (which gets its own
 * reveal regardless); the Three.js sphere is a progressive upgrade,
 * lazily imported ~1.5 viewports before the section arrives.
 */
export function init(el) {
  const grid = el.querySelector('[data-showreel-grid]')
  const stage = el.querySelector('[data-showreel-stage]')

  mm.add(MQ.motionOK, () => {
    ScrollTrigger.batch(grid.querySelectorAll('li'), {
      start: 'top 88%',
      once: true,
      onEnter: (items) =>
        gsap.from(items, {
          autoAlpha: 0,
          y: 32,
          duration: 0.9,
          stagger: 0.07,
          ease: 'power3.out',
        }),
    })
  })

  if (prefersReducedMotion() || isLowPower() || !canWebGL() || !stage) return

  if (import.meta.env.DEV) console.debug('[showreel] gate passed, observing')
  const io = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      try {
        const { createSphereGallery } = await import('../gallery/sphereGallery.js')
        const gallery = await createSphereGallery(stage)
        if (gallery) {
          el.dataset.mode = '3d'
          ScrollTrigger.refresh()
        }
      } catch (err) {
        console.error('[showreel] 3D upgrade skipped', err)
      }
    },
    { rootMargin: '150% 0px' }
  )
  io.observe(el)
}
