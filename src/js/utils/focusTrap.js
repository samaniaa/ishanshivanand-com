const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Minimal focus trap for the overlay menu dialog.
 * Returns a release() function.
 */
export function trapFocus(container, { onEscape } = {}) {
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onEscape?.()
      return
    }
    if (e.key !== 'Tab') return
    const items = [...container.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('keydown', handleKeydown)
  return () => document.removeEventListener('keydown', handleKeydown)
}
