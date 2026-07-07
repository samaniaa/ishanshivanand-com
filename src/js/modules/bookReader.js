import { prefersReducedMotion } from '../core/capabilities.js'

/**
 * "Look inside" hardcover reader.
 *
 * Progressive enhancement over real, selectable DOM pages:
 *   - Baseline: a static one-page-at-a-time pager (works with no JS animation,
 *     reduced-motion, or if the flip engine fails to load).
 *   - Enhancement: StPageFlip (page-flip) gives the real hardcover — a cover
 *     that swings open, a two-page spread, stacked-leaf shadows and soft
 *     page-curl. Lazy-loaded when the book scrolls near view, gated on
 *     prefers-reduced-motion (mirrors the showreel.js capability pattern).
 *
 * The DOM pages (`.page`) are the single source of truth; both modes drive
 * the same elements, so text is always present and selectable.
 */
export function init(el) {
  const pages = [...el.querySelectorAll('.page')]
  if (!pages.length) return

  const reader = el.closest('.reader')
  const prevBtn = reader.querySelector('[data-dir="prev"]')
  const nextBtn = reader.querySelector('[data-dir="next"]')
  const count = reader.querySelector('.reader__count')
  const total = pages.length

  const label = (idx) => {
    if (idx === 0) return 'Cover'
    return 'Page ' + idx + ' of ' + (total - 1)
  }

  // ---- Baseline static pager -------------------------------------------
  let staticIdx = 0
  let staticControls = null

  const setAt = (idx) => {
    el.dataset.at = idx === 0 ? 'cover' : 'mid'
  }

  function showStatic(idx) {
    staticIdx = Math.max(0, Math.min(total - 1, idx))
    pages.forEach((p, k) => p.classList.toggle('is-current', k === staticIdx))
    count.textContent = label(staticIdx)
    setAt(staticIdx)
    prevBtn.disabled = staticIdx === 0
    nextBtn.disabled = staticIdx === total - 1
  }

  function enableStatic() {
    el.classList.add('book--static')
    const onPrev = () => showStatic(staticIdx - 1)
    const onNext = () => showStatic(staticIdx + 1)
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
    }
    prevBtn.addEventListener('click', onPrev)
    nextBtn.addEventListener('click', onNext)
    addEventListener('keydown', onKey)
    staticControls = () => {
      prevBtn.removeEventListener('click', onPrev)
      nextBtn.removeEventListener('click', onNext)
      removeEventListener('keydown', onKey)
    }
    showStatic(0)
  }

  enableStatic()

  // ---- Enhancement: real hardcover via StPageFlip ----------------------
  if (prefersReducedMotion()) return

  const io = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      try {
        await mountFlip()
      } catch (err) {
        console.error('[bookReader] flip enhancement skipped', err)
      }
    },
    { rootMargin: '200% 0px' }
  )
  io.observe(el)

  async function mountFlip() {
    const { PageFlip } = await import('page-flip/dist/js/page-flip.module.js')

    // Hand off from the static pager: stop its listeners and let the engine
    // own the DOM pages. Keep the book invisible during the swap to avoid a
    // flash of the un-styled stack.
    if (staticControls) staticControls()
    pages.forEach((p) => p.classList.remove('is-current'))
    el.classList.remove('book--static')
    el.classList.add('book--loading')

    const pageFlip = new PageFlip(el, {
      width: 400,
      height: 570, // portrait leaf, ~1:1.42
      size: 'stretch',
      minWidth: 260,
      maxWidth: 560,
      minHeight: 370,
      maxHeight: 800,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      showCover: true,
      usePortrait: true,
      mobileScrollSupport: true,
      flippingTime: 800,
      swipeDistance: 20,
    })

    pageFlip.loadFromHTML(pages)
    if (pageFlip.getCurrentPageIndex() !== 0) pageFlip.turnToPage(0)
    el.classList.remove('book--loading')
    el.classList.add('book--live')

    const render = () => {
      const idx = pageFlip.getCurrentPageIndex()
      count.textContent = label(idx)
      setAt(idx)
      prevBtn.disabled = idx === 0
      nextBtn.disabled = idx >= total - 1
    }
    render()

    pageFlip.on('flip', render)

    prevBtn.addEventListener('click', () => pageFlip.flipPrev())
    nextBtn.addEventListener('click', () => pageFlip.flipNext())
    addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') pageFlip.flipPrev()
      else if (e.key === 'ArrowRight') pageFlip.flipNext()
    })
  }
}
