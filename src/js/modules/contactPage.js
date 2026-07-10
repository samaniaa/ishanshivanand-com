/**
 * Contact page: routed enquiry form + atmosphere.
 * Ported from Aarti's Claude Design "Contact.dc.html". Vanilla, no
 * framework — mirrors the site's stubPage module pattern.
 *
 * Wiring status: UI complete, endpoint NOT wired. On submit the form
 * validates, opens a prefilled mailto to the office, and shows the
 * success state. Swap ENDPOINT for a real Formspree/Web3Forms POST at
 * launch (see PLACEHOLDERS.md).
 */

const OFFICE_EMAIL = 'hello@compassionunites.com'
const ENDPOINT = null // TODO(launch): set to the Formspree/Web3Forms URL, then POST instead of mailto.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REQUIRED = ['interest', 'name', 'org', 'email', 'message']

export function init(el) {
  const form = el.querySelector('[data-contact-form]')
  const success = el.querySelector('[data-contact-success]')
  if (!form || !success) return

  const interest = form.querySelector('[data-field="interest"]')
  const conds = [...el.querySelectorAll('.contact__cond')]
  const submitBtn = form.querySelector('[data-submit]')
  const submitLabel = form.querySelector('[data-submit-label]')

  buildStars(el.querySelector('[data-contact-stars]'))
  revealTrust(el.querySelector('[data-contact-trust]'))

  // Progressive disclosure: reveal the fields that match the interest.
  const syncConds = () => {
    conds.forEach((c) => {
      c.hidden = c.dataset.cond !== interest.value
    })
  }
  interest.addEventListener('change', () => {
    syncConds()
    clearError(form, 'interest')
  })
  syncConds()

  // Clear a field's error as soon as the visitor corrects it.
  REQUIRED.forEach((name) => {
    const field = form.querySelector(`[data-field="${name}"]`)
    if (field) field.addEventListener('input', () => clearError(form, name))
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (submitBtn.disabled) return

    // Honeypot: a filled hidden field means a bot. Feign success.
    if (form.querySelector('[name="company"]')?.value) {
      reveal(form, success)
      return
    }

    const values = collect(form)
    const invalid = validate(values)
    if (invalid.length) {
      showErrors(form, invalid)
      form.querySelector(`[data-field="${invalid[0]}"]`)?.focus()
      return
    }

    submitBtn.disabled = true
    if (submitLabel) submitLabel.textContent = 'Sending…'

    // No endpoint yet: route through the visitor's mail client so no
    // enquiry is lost pre-launch, then show the success state.
    if (!ENDPOINT) {
      openMailto(values)
      window.setTimeout(() => reveal(form, success), 600)
    }
  })
}

function collect(form) {
  const get = (n) => (form.querySelector(`[name="${n}"]`)?.value || '').trim()
  return {
    interest: get('interest'),
    name: get('name'),
    org: get('org'),
    email: get('email'),
    message: get('message'),
    eventName: get('eventName'),
    eventLocation: get('eventLocation'),
    eventDate: get('eventDate'),
    outlet: get('outlet'),
  }
}

function validate(v) {
  const invalid = []
  if (!v.interest) invalid.push('interest')
  if (!v.name) invalid.push('name')
  if (!v.org) invalid.push('org')
  if (!EMAIL_RE.test(v.email)) invalid.push('email')
  if (!v.message) invalid.push('message')
  return invalid
}

function showErrors(form, names) {
  REQUIRED.forEach((n) => {
    const err = form.querySelector(`[data-err="${n}"]`)
    if (err) err.hidden = !names.includes(n)
  })
}

function clearError(form, name) {
  const err = form.querySelector(`[data-err="${name}"]`)
  if (err) err.hidden = true
}

function openMailto(v) {
  const subject = `[${v.interest}] Message from ${v.name}`
  const lines = [
    `Name: ${v.name}`,
    `Organization: ${v.org}`,
    `Email: ${v.email}`,
    `Interest: ${v.interest}`,
  ]
  if (v.interest === 'Speaking and Appearances') {
    if (v.eventName) lines.push(`Event Name: ${v.eventName}`)
    if (v.eventLocation) lines.push(`Event Location: ${v.eventLocation}`)
    if (v.eventDate) lines.push(`Event Date: ${v.eventDate}`)
  }
  if (v.interest === 'Media and Press' && v.outlet) {
    lines.push(`Publication or Outlet: ${v.outlet}`)
  }
  lines.push('', v.message)

  const href = `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(lines.join('\n'))}`
  try {
    const a = document.createElement('a')
    a.href = href
    a.click()
  } catch (_) {
    /* prototype: routing stub */
  }
}

function reveal(form, success) {
  form.hidden = true
  form.style.display = 'none'
  success.hidden = false
}

/**
 * Reveal the trusted-by logos with a quick stagger when they scroll
 * into view — engaging without a carousel. Reduced-motion shows them
 * immediately.
 */
function revealTrust(section) {
  if (!section) return
  const reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const strip = section.querySelector('.logo-strip')
  // Logos are visible (static navy) by default; the glisten is pure
  // enhancement. Skip it entirely when motion is off.
  if (reduce || !strip) return
  const logos = [...strip.querySelectorAll('.logo-strip__logo')]

  // Per-logo glint: fires on the logo you hover OR click, immediately and
  // where you touch. Restart cleanly (remove → reflow → add) so doing both
  // just replays it rather than glitching.
  const glint = (logo) => {
    logo.classList.remove('is-lit')
    void logo.offsetWidth
    logo.classList.add('is-lit')
  }
  logos.forEach((logo) => {
    logo.addEventListener('mouseenter', () => glint(logo))
    logo.addEventListener('pointerdown', () => glint(logo)) // click + touch
  })

  // Ambient first impression: the slow gathering-light sweep runs once
  // across the whole row when it scrolls into view.
  const last = logos[logos.length - 1]
  strip.addEventListener('animationend', (e) => {
    if (e.animationName === 'contact-logo-sweep' && e.target === last) {
      strip.classList.remove('is-sweeping')
    }
  })
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            strip.classList.add('is-sweeping')
            obs.disconnect()
          }
        })
      },
      { threshold: 0.3 },
    )
    io.observe(section)
  }
}

/**
 * Sparse, deterministic star field, confined to the deep-blue crown.
 * Decorative (aria-hidden) — degrades to nothing if this never runs.
 */
function buildStars(host) {
  if (!host) return
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  // [leftPct, topPct, dim]
  const placements = [
    [7, 3, false], [22, 8, false], [34, 2.5, false], [48, 6, false],
    [61, 3.5, false], [78, 7, false], [91, 2, false], [14, 12, false],
    [70, 14, true], [88, 17, true], [96, 11, true],
    [64, 21, true], [83, 25, true], [93, 20, true],
  ]

  const frag = document.createDocumentFragment()
  placements.forEach(([left, top, dim]) => {
    const core = 2 + rand() * 1
    const halo = 3 + rand() * 1
    const warm = rand() > 0.55
    const color = warm ? '#ffe9c4' : '#eef2ff'
    const haloRgb = warm ? '255 233 196' : '238 242 255'
    const box = core + halo * 2
    const inner = ((core / box) * 50).toFixed(0)
    const mid = ((core / box) * 50 + 12).toFixed(0)

    const s = document.createElement('div')
    s.className = 'contact__star'
    s.style.cssText = [
      'position:absolute',
      `left:${left}%`,
      `top:${top}%`,
      `width:${box.toFixed(1)}px`,
      `height:${box.toFixed(1)}px`,
      `margin-left:${(-box / 2).toFixed(1)}px`,
      `margin-top:${(-box / 2).toFixed(1)}px`,
      'border-radius:50%',
      `background:radial-gradient(circle, ${color} 0%, ${color} ${inner}%, rgb(${haloRgb} / 0.28) ${mid}%, transparent 60%)`,
      `animation:contact-twinkle ${(2 + rand() * 2).toFixed(1)}s ease-in-out ${(
        rand() * 6
      ).toFixed(1)}s infinite both`,
    ].join(';')
    s.style.setProperty('--tw-max', dim ? '0.5' : '1')
    s.style.setProperty('--tw-min', dim ? '0.15' : '0.35')
    frag.appendChild(s)
  })
  host.appendChild(frag)
}
