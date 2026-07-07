import './main.js'
import '../styles/components/bookReader.css'
import { gsap } from './core/scroll.js'
import { mm, MQ } from './core/motion.js'
import * as bookSky from './modules/bookSky.js'
import * as bookTree from './modules/bookTree.js'
import * as video from './modules/video.js'
import * as bookReader from './modules/bookReader.js'

/**
 * The Practice of Immortality page entry. The bespoke half-day sky, the
 * living cover tree in the hero, the two video facades, and the embedded
 * "look inside" flipbook — plus the page's soft reveals.
 */
bookSky.init()
document.querySelectorAll('[data-book-tree]').forEach((el) => bookTree.init(el))
document.querySelectorAll('[data-video]').forEach((el) => video.init(el))
document.querySelectorAll('[data-module="book-reader"]').forEach((el) => bookReader.init(el))

mm.add(MQ.motionOK, () => {
  // Hero: the tree grows first (bookTree), then the quote surfaces line by
  // line, then the attribution. Delayed so the tree leads.
  const lines = document.querySelectorAll('[data-quote-reveal]')
  if (lines.length) {
    gsap.set(lines, { autoAlpha: 0 })
    gsap.to(lines, {
      autoAlpha: 1,
      duration: 1.4,
      ease: 'power2.out',
      stagger: 1.0,
      delay: 2.2,
    })
  }

  // Blocks rise softly as they arrive.
  document.querySelectorAll('[data-rise]').forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 26,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    })
  })
})
