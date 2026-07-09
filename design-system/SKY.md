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
is a bright core wrapped in a tight soft halo, so it reads as a star and
not a dot. Fourteen in all — **8 bright across the crown + 6 faint accents**
for depth — warm-white (`#ffe9c4`) and cool-white (`#eef2ff`) mixed, kept
to the **upper sky** (tops 2–25%) and thinning toward the warm horizon.

The key move is the twinkle: **each star pulses on its own rhythm** — a
staggered, independent opacity swing — so the field shimmers gently rather
than blinking in unison. Exact spec:

- **Size** — each orb 7–11px overall; solid bright core to the inner ~15% (a 2–3px point).
- **Glow** — radial: solid core to 15% → soft halo at 30% opacity to 28% → transparent by 62%.
- **Twinkle** — opacity pulse, `ease-in-out`; per-star **duration 2.2–4.0s**, **delay 0.3–5.1s** (the stagger). Bright stars swing **0.35↔1.0**, faint **0.15↔0.5**.
- **Placement** — 8 bright spread across the crown, 6 faint weighted lower-right.

Rendered as `.day-sky__star` orbs inside `.day-sky__stars` (`day.css`); the
field is authored once in `partials/stars.html` and mirrored into
`index.html`. See the *Sky & Motion · stars* card. Adapted from the Contact
page's star treatment.

## Shipped since

Sun-disc and moon-disc states per phase (two book-page discs: warm-gold
day sun + orange fire ball; silver/cream crescents that never set) — the
travelling light recolours as it arcs. See `tokens-sun.css` /
`tokens-moon.css` and the *sun & moon* card.
