import { gsap } from '../core/scroll.js'
import { mm, MQ } from '../core/motion.js'

const ROLES = ['Academic.', 'Philanthropist.', 'Founder.', 'Author.', 'Speaker.']

/**
 * Hero v2: name plate rises in masked lines, the cutout rises with it
 * (no opacity change: it is the LCP element), then the role word begins
 * its quiet rotation. Reduced motion gets the static roles line.
 */
export function init(el) {
  const nameLines = el.querySelectorAll('.hero__name-line .line-inner')
  const roleWord = el.querySelector('[data-role-word]')
  const roleMask = el.querySelector('.hero__role-mask')
  const cutout = el.querySelector('[data-hero-portrait]')
  const foot = el.querySelector('[data-hero-attrib]')

  mm.add(MQ.reduced, () => {
    if (roleWord) roleWord.textContent = 'Academic. Philanthropist. Founder.'
  })

  mm.add(MQ.motionOK, () => {
    gsap.set(nameLines, { yPercent: 108 })
    gsap.set(roleMask, { autoAlpha: 0 })
    gsap.set(foot, { autoAlpha: 0, y: 24 })
    gsap.set(cutout, { y: 90 })

    const tl = gsap.timeline()
    tl.to(nameLines, {
      yPercent: 0,
      duration: 1.2,
      stagger: 0.12,
      ease: 'power4.out',
      delay: 0.15,
    })
      .to(cutout, { y: 0, duration: 1.5, ease: 'power3.out' }, 0.25)
      .to(roleMask, { autoAlpha: 1, duration: 0.01 }, 1.0)
      .from(
        roleWord,
        { yPercent: 110, duration: 0.9, ease: 'power4.out' },
        1.0
      )
      .to(foot, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 1.25)

    // Role rotation: word rises out, next rises in. Starts after entrance.
    let idx = 0
    const cycle = gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 3 })
    cycle
      .to(roleWord, { yPercent: -110, duration: 0.55, ease: 'power3.in' })
      .add(() => {
        idx = (idx + 1) % ROLES.length
        roleWord.textContent = ROLES[idx]
      })
      .set(roleWord, { yPercent: 110 })
      .to(roleWord, { yPercent: 0, duration: 0.65, ease: 'power3.out' })

    // Gentle parallax on the cutout
    gsap.fromTo(
      cutout,
      { yPercent: 0 },
      {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
      }
    )
  })
}
