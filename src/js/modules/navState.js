import { ScrollTrigger } from '../core/scroll.js'

/**
 * Header chrome: hidden at load so the pre-dawn belongs to the vision
 * line; appears after the first meaningful scroll and stays.
 */
export function init() {
  const header = document.querySelector('.header')
  if (!header) return

  ScrollTrigger.create({
    start: 80,
    end: 'max',
    onUpdate() {
      header.dataset.visible = 'true'
    },
    onLeaveBack() {
      header.dataset.visible = 'false'
    },
  })
}
