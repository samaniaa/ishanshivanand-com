import { gsap, lenis } from '../core/scroll.js'
import { trapFocus } from '../utils/focusTrap.js'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

/**
 * Full-screen editorial overlay menu.
 * A11y: dialog + native inert swapping, focus trap, Esc, focus restore.
 * Motion: gold under-panel leads, navy panel follows with a brief gold
 * sliver between them, links rise in masked lines.
 */
export function init() {
  const menu = document.getElementById('site-menu')
  const trigger = document.querySelector('[data-menu-trigger]')
  const label = trigger?.querySelector('[data-menu-label]')
  if (!menu || !trigger) return

  const under = menu.querySelector('.menu__panel--under')
  const main = menu.querySelector('.menu__panel--main')
  const links = menu.querySelectorAll('.menu__link')
  const subs = menu.querySelectorAll('.menu__sub, .menu__aside > *')
  const pageRegions = [document.querySelector('main'), document.querySelector('.footer')].filter(Boolean)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Pre-split link labels once; menu is display-fixed so metrics are stable.
  let lines = links
  if (!reduced) {
    const split = SplitText.create(links, { type: 'lines', mask: 'lines' })
    lines = split.lines
  }

  let releaseTrap = null
  let isOpen = false

  const tl = gsap.timeline({ paused: true })
  if (reduced) {
    tl.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 })
  } else {
    gsap.set([under, main], { yPercent: -102 })
    tl.to(under, { yPercent: 0, duration: 0.7, ease: 'power4.inOut' })
      .to(main, { yPercent: 0, duration: 0.7, ease: 'power4.inOut' }, 0.15)
      .fromTo(
        lines,
        { yPercent: 112 },
        { yPercent: 0, duration: 0.85, stagger: 0.05, ease: 'power3.out' },
        0.42
      )
      .fromTo(subs, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.04 }, 0.7)
  }

  function open() {
    isOpen = true
    document.body.dataset.menuOpen = 'true'
    menu.dataset.open = 'true'
    menu.removeAttribute('inert')
    pageRegions.forEach((r) => r.setAttribute('inert', ''))
    trigger.setAttribute('aria-expanded', 'true')
    if (label) label.textContent = 'Close'
    lenis.stop()
    tl.timeScale(1).play()
    releaseTrap = trapFocus(menu, { onEscape: close })
    menu.querySelector('.menu__link')?.focus({ preventScroll: true })
  }

  function close() {
    isOpen = false
    trigger.setAttribute('aria-expanded', 'false')
    if (label) label.textContent = 'Menu'
    releaseTrap?.()
    tl.timeScale(1.65).reverse()
    tl.eventCallback('onReverseComplete', () => {
      delete document.body.dataset.menuOpen
      menu.dataset.open = 'false'
      menu.setAttribute('inert', '')
      pageRegions.forEach((r) => r.removeAttribute('inert'))
      lenis.start()
      tl.eventCallback('onReverseComplete', null)
    })
    trigger.focus({ preventScroll: true })
  }

  trigger.addEventListener('click', () => (isOpen ? close() : open()))

  // Mark the current page
  const path = location.pathname.replace(/\/$/, '') || '/'
  links.forEach((a) => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/'
    if (href === path) a.setAttribute('aria-current', 'page')
  })
}
