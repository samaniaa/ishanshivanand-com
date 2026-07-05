/**
 * Click-to-load YouTube facade: no third-party requests until the
 * visitor asks for the film.
 */
export function init(el) {
  const id = el.dataset.video
  const play = el.querySelector('button')
  if (!id || !play) return
  play.addEventListener('click', () => {
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    iframe.title = 'Video'
    iframe.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture'
    iframe.allowFullscreen = true
    el.append(iframe)
    play.remove()
  })
}
