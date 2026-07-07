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
  // Hero: the tree grows first, then the whole quote emerges gently from
  // the sky — as one soft wash (not line-by-line), once the tree has
  // finished building.
  const tree = document.querySelector('[data-book-tree]')
  const quote = [...document.querySelectorAll('[data-quote-reveal]')]
    .sort((a, b) => a.dataset.quoteReveal - b.dataset.quoteReveal)
  if (quote.length) {
    gsap.set(quote, { autoAlpha: 0, y: 14, filter: 'blur(6px)' })
    let emerged = false
    const emerge = () => {
      if (emerged) return
      emerged = true
      gsap.to(quote, {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.8,
        ease: 'power2.out',
        stagger: 0.08, // a whisper, so it reads as one emergence
      })
    }
    // Emerge as the tree completes; safety-net so it can never stay hidden
    // if the video fails or the signal never fires.
    if (tree) tree.addEventListener('tree:grown', emerge, { once: true })
    gsap.delayedCall(8, emerge)
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
