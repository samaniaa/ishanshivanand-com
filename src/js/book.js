import './main.js'
import * as bookQuote from './modules/bookQuote.js'

/**
 * The Practice of Immortality page entry. Extends the shared entry with
 * the book-quote's growing tree.
 */
document.querySelectorAll('[data-book-quote]').forEach((el) => bookQuote.init(el))
