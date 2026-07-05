import '../styles/main.css'
import { bindAnchors } from './core/scroll.js'
import * as menu from './modules/menu.js'
import * as navState from './modules/navState.js'
import * as stubPage from './modules/stubPage.js'

/**
 * Shared entry: every page loads this. Page-specific entries (home.js)
 * import it and extend the registry pattern with their own modules.
 */
menu.init()
navState.init()
bindAnchors()

document.querySelectorAll('[data-module="stub"]').forEach((el) => stubPage.init(el))

// After everything registers, replay reveals the scroll already passed
// (hash loads, scroll restoration, font-load re-splits).
import('./core/motion.js').then((m) => m.scheduleCatchUp())

if (import.meta.env.DEV) {
  // QA-only anchor strip so section states can be exercised by clicks.
  const qa = document.createElement('nav')
  qa.id = 'qa-strip'
  qa.style.cssText =
    'position:fixed;bottom:4px;left:4px;z-index:999;display:flex;gap:6px;font-size:9px;opacity:.5'
  qa.innerHTML = [
    'introduction',
    'reach',
    'showreel',
    'institutions',
    'research-tease',
    'philanthropy-tease',
    'book-tease',
    'about-tease',
    'work',
  ]
    .map((id) => `<a href="#${id}" data-qa="${id}">${id.slice(0, 4)}</a>`)
    .join('')
  document.body.append(qa)
  bindAnchors()
}
