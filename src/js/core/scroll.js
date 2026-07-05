import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Single source of truth for scrolling. Nothing else may instantiate
 * Lenis, call requestAnimationFrame for scroll, or use normalizeScroll /
 * scrollerProxy (they fight Lenis and cause double-scroll bugs).
 */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const lenis = new Lenis({
  duration: 1.1,
  smoothWheel: !prefersReduced,
  syncTouch: false, // native scroll on touch: critical for iOS
})

lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)

ScrollTrigger.config({ ignoreMobileResize: true })

/** Smooth-scroll anchor links through Lenis (respecting fixed header). */
export function bindAnchors(headerOffset = 84) {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'))
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target, { offset: -headerOffset })
    })
  })
}

export { gsap, ScrollTrigger }
