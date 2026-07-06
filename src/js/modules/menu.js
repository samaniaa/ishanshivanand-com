import { gsap, lenis } from '../core/scroll.js'
import { trapFocus } from '../utils/focusTrap.js'

/**
 * Glass drawer menu. Slides in gently from the right over a soft scrim.
 * A11y: dialog + native inert swapping, focus trap, Esc, scrim click,
 * focus restore.
 */
export function init() {
  const menu = document.getElementById('site-menu')
  const trigger = document.querySelector('[data-menu-trigger]')
  const label = trigger?.querySelector('[data-menu-label]')
  if (!menu || !trigger) return

  const scrim = menu.querySelector('.menu__scrim')
  const panel = menu.querySelector('.menu__panel')
  const links = menu.querySelectorAll('.menu__link')
  const aside = menu.querySelector('.menu__aside')
  const pageRegions = [document.querySelector('main'), document.querySelector('.footer')].filter(Boolean)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let releaseTrap = null
  let isOpen = false

  const tl = gsap.timeline({ paused: true })
  if (reduced) {
    tl.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 })
  } else {
    gsap.set(panel, { xPercent: 104 })
    tl.to(scrim, { opacity: 1, duration: 0.55, ease: 'power2.out' })
      .to(panel, { xPercent: 0, duration: 0.7, ease: 'power3.out' }, 0.05)
      .fromTo(
        links,
        { autoAlpha: 0, x: 26 },
        { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.045, ease: 'power3.out' },
        0.28
      )
      .fromTo(aside, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.6)
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
    tl.timeScale(1.5).reverse()
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
  scrim?.addEventListener('click', close)

  const path = location.pathname.replace(/\/$/, '') || '/'
  links.forEach((a) => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/'
    if (href === path) a.setAttribute('aria-current', 'page')
  })
}
