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
