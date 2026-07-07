import './main.js'
import * as bookTree from './modules/bookTree.js'

/**
 * The Practice of Immortality page entry. Extends the shared entry with
 * the living cover tree.
 */
document.querySelectorAll('[data-book-tree]').forEach((el) => bookTree.init(el))
