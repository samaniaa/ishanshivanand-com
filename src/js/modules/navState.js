import { ScrollTrigger } from '../core/scroll.js'

/**
 * Header chrome: gains a soft backdrop once content scrolls beneath it,
 * and hides on scroll-down / returns on scroll-up so it never fights
 * the reading line.
 */
export function init() {
  const header = document.querySelector('.header')
  if (!header) return

  ScrollTrigger.create({
    start: 60,
    end: 'max',
    onUpdate(self) {
      header.dataset.scrolled = 'true'
      header.dataset.hidden = String(self.direction === 1 && self.scroll() > 300)
    },
    onLeaveBack() {
      header.dataset.scrolled = 'false'
      header.dataset.hidden = 'false'
    },
  })
}
