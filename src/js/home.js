import './main.js'
import * as skyJourney from './modules/skyJourney.js'
import * as hero from './modules/hero.js'
import * as showreel from './modules/showreel.js'
import * as logoWall from './modules/logoWall.js'
import * as teases from './modules/teases.js'

const registry = {
  sky: skyJourney,
  hero,
  showreel,
  'logo-wall': logoWall,
  tease: teases,
  testimonial: teases, // shares the reveal grammar
}

document.querySelectorAll('[data-module]').forEach((el) => {
  registry[el.dataset.module]?.init(el)
})
