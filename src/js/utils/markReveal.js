import { gsap } from '../core/scroll.js'

/**
 * "Light passes over the mark": reveals the IS monogram (filled paths,
 * so dash-draw is unavailable) with a 135° gradient mask wipe that
 * matches the brand gradient angle.
 */
export function markReveal(container, { duration = 1.5, delay = 0 } = {}) {
  const svg = container.querySelector('svg')
  if (!svg) return null
  const proxy = { p: -30 }
  const apply = () => {
    const edge = proxy.p
    svg.style.webkitMaskImage = svg.style.maskImage =
      `linear-gradient(135deg, black ${edge}%, transparent ${edge + 28}%)`
  }
  apply()
  return gsap.to(proxy, {
    p: 130,
    duration,
    delay,
    ease: 'power2.inOut',
    onUpdate: apply,
    onComplete() {
      svg.style.maskImage = svg.style.webkitMaskImage = ''
    },
  })
}
