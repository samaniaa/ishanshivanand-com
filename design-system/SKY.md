# The Sky Scale

The canonical light system for ishanshivanand.com. One continuous day,
**thirteen phases, symmetric around midday.** Every page's sky is a slice
of this arc.

**Source of truth:** [`src/styles/tokens-sky.css`](../src/styles/tokens-sky.css)
(the `--sky-*` gradient tokens). The live site (`day.css` / `day.js`) and
the design-system "Sky Scale" card both read from it — do not hardcode
these hexes anywhere else, or the spec and the code will drift.

## The laws

1. **Never black.** The day is bookended by light — a warm blush at
   pre-dawn, a silvery afterglow at post-dusk. There is always a sign of
   light in the sky.
2. **Blue & blush.** Blue carries the day; blush edges every transition.
   Blue and blush are the signature of a rising and setting sun.
3. **Brand-navy crown.** The dark phases crown in the brand blues
   (`--c-dark-anchor #071938`, `--c-dark-lift #0d2354`) so the light
   story stays cohesive with the brand.
4. **The sun is white overhead, an orange ball at the horizon.** At
   `daybreak` and `sundown` the sky is ablaze and the sun is a defined
   orange disc; at midday it is a small white disc. (Sun- and moon-disc
   states per phase are the next layer — see "Coming next.")
5. **Each page runs its own slice.** The homepage closes cool at
   post-dusk; the book page closes warm at sundown over dunes. Both obey
   laws 1–4. The book keeps its own warmer crown by design — do not force
   the brand navy onto its sunset arc.

## The thirteen phases

Read top-of-sky → horizon. Symmetric twins are paired.

| Rising | | Setting (twin) |
| --- | --- | --- |
| `pre-dawn` — navy → blush → warm gold | ↔ | `post-dusk` — navy → silver-blue afterglow |
| `blue-hour` — deep blue, blush hint | ↔ | `twilight` — deep blue → silver-lilac |
| `sunrise` — soft blue → blush → peach | ↔ | `dusk` — soft blue → blush → warm |
| `daybreak` — FIRE, orange ball | ↔ | `sundown` — FIRE, orange ball |
| `morning-gold` — low sun, warm gold | ↔ | `evening-gold` — low sun, warm gold + blush |
| `morning` — soft blue day | ↔ | `afternoon` — blue day, warming |
| `midday` — blue summer sky, white sun (apex) | | |

Exact gradient stops live in `tokens-sky.css`.

## The homepage slice

The current homepage has 7 section-anchored phases and uses this slice:
`predawn → sunrise → morning → midday → golden → dusk → night`. Its legacy
`golden` and `night` keys are aliased in `day.css` to `--sky-evening-gold`
and `--sky-post-dusk`. When the homepage is rebuilt it can draw on the
full 13-phase arc (fire states, blue/gold hours, etc.).

## Stars

Only in the dark phases (pre-dawn, blue hour, twilight, post-dusk). The
rule is **few mid-sized stars, never a field of uniform specks**: each star
is a bright core (~1.5–2.4px) wrapped in a soft glow halo (~5–9px), so it
reads as a star and not a dot. Nine in all — 6 hero stars plus 3 faint
accents — warm-white and cool-white mixed. They stay in the **upper sky**
(masked out below the horizon so they never litter the page) and **breathe
on a slow ~7s brightness pulse** — the twinkle is a gentle glow, never a
blink. Rendered by `.day-sky__stars` in `day.css`; see the *Sky & Motion ·
stars* card.

## Shipped since

Sun-disc and moon-disc states per phase (two book-page discs: warm-gold
day sun + orange fire ball; silver/cream crescents that never set) — the
travelling light recolours as it arcs. See `tokens-sun.css` /
`tokens-moon.css` and the *sun & moon* card.
