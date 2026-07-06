# ishanshivanand.com — Build Handover

Personal brand site for Dr. Ishan Shivanand. This doc is the tactical
state of the build. Strategic context lives in the Claude memory files
(auto-loaded) and in `PLACEHOLDERS.md`.

## Run it
- `npm install`, then `npm run dev` (Vite, port 5173). `npm run build` for prod.
- Git: all work committed locally. Latest commit `fffab8a`. No GitHub remote yet.

## The concept: "One day, one life"
The homepage is a single continuous day scrubbed by scroll, and the day
IS his biography. Pre-dawn → sunrise → morning → midday → golden → dusk
→ night. One traveling light (crescent moon → sun → moon) is the
signature. Everything (sky, light position, ink color, mountain range
palette) is driven by ONE timeline so they can never fall out of sync.

## Architecture (the load-bearing parts)
- **Stack**: Vite MPA, vanilla ES modules, GSAP (ScrollTrigger + SplitText),
  Lenis smooth scroll. No framework. Static output.
- **Scroll contract** (`src/js/core/scroll.js`): the ONLY place Lenis is
  instantiated. Lenis on gsap ticker, `lagSmoothing(0)`, no
  normalizeScroll, no scrollerProxy, `syncTouch:false`. Never break this.
- **The day engine** (`src/js/modules/day.js`): the heart. One scrubbed
  timeline drives: sky layer cross-fades, the `.celestial` moon/sun path,
  `body[data-phase]` ink flips, and the mountain range palette lerp.
  Phase positions are computed from the actual chapter DOM positions
  (`computePhasePositions()`), so timing follows content. Has a
  reduced-motion branch (IntersectionObserver stepping, no scrub).
- **Ink sync**: `body[data-phase="dark"]` = light text; absent = navy
  ink. Flips at the MIDPOINT of the relevant sky fade so text only
  changes color over empty sky (`.sky-breath` spacer divs). This is why
  there's never white-on-white.
- **The mountain range**: a layered SVG silhouette (`partials/range.html`,
  generated ridgelines + snowfields) filled by day-engine palette
  variables (`--alpenglow`, `--snow-shade`, `--range-far/mid/near`,
  `--haze`). Aarti REJECTED a photo-based range (tried and reverted);
  `tools/make-range.py` remains only in case she supplies a photo she
  likes. The celestial system is TWO independent travelers
  (`.celestial--moon`, `.celestial--sun`) on monotonic arcs: moon sets
  left behind the range as the sun rises right, sun arcs over the day
  and sets left, moon returns from the right. Sky bookends are brand
  navys (#071938 / #05152D); sunrise and dusk gradients carry the "blue
  hour" from her reference photos.
- **Build-time partials** (`plugins/html-partials.js`): `<!-- @include
  x.html {json} -->` in any page. head/header/menu/footer/range/icon.
- **Reveals** (`src/js/utils/splitReveal.js`): `wordReveal` (word-by-word
  surfacing) + `data-rise` (soft rise once). `catchUpReveals` in
  `core/motion.js` replays reveals the scroll already passed (hash loads,
  font re-splits).

## Homepage chapters (index.html, in order)
1. Pre-dawn — vision line (italic, balanced) + motto, under moon+range
2. Sunrise — his arms-open cutout photo (left) beside his name, tagline,
   and the AEO entity paragraph (VERBATIM, crawlable); "Read the story"
3. Morning — research: flame-textured 82/79/73% numerals + percentage
   tracks + one pull-quote
4. Midday — philanthropy: her verbatim copy + 3 drift cards (ARK / IIT /
   Six Sigma photo slots)
5. Midday/afternoon — the book: real cover + 5 award seals + memoir line
6. Golden — the film (click-to-play YouTube facade) + Trusted-by line +
   institution names (words, not logos, for v1)
7. Dusk — "From the monastery to modern medicine" (the ONLY monastery
   mention on the homepage; navy ink holds through here)
8. Night — Work with Ishan (3 routes) → close: gold seal, motto "Rise
   and Lift Others", values "Compassion · Oneness · Valour" → footer

## Locked design rules (from Aarti — do not violate)
- Her Framer mock (altruistic-confidence-486854.framer.app) + her copy
  are the source of truth. No invented structure.
- NO decorative numbering (no "01", no Roman numerals). NO scattered
  brand seal/laurel watermarks. ONE link style (pill buttons + plain
  text links; no arrow/dash links, no "Explore" labels).
- Monastery stays OFF the homepage except the closing About block.
  Lead with vision, motto, Global Voice. AEO paragraph verbatim, high.
- Coat of arms reserved for certificates. Seal used only at the close.
- Menu = parents only (children live on landing pages). It's a
  right-side glass drawer.
- Present whole design plans, not piecemeal questions. She is the
  designer-owner.

## Menu / systems
- Glass drawer from the right (`src/js/modules/menu.js`,
  `components/menu.css`): translucent navy + blur, scrim, focus trap,
  Esc, inert swap, lenis stop.
- Buttons: navy pill (flips warm-white on dark phases) + gold-underline
  text links (`components/buttons.css`).
- 8 interior routes are elegant stubs (research/philanthropy/etc.), each
  with an "On this page" index where the sitemap defines children.

## Open items (need Aarti; tracked in PLACEHOLDERS.md)
- Photos: 3 philanthropy (ARK/IIT/Six Sigma), sunrise portrait (arms
  open to the sun), final About portrait.
- Verified testimonial (current MD Program Director quote is unverified).
- Contact form destination; social links (currently #).
- Optional: her Framer laurel graphic for the book; logo files for
  trusted-by; AI attire-edit portrait (Higgsfield had 0 credits).
- Claims caution log in PLACEHOLDERS.md — curate with Ishanji before
  public launch (v1 currently claims everything).

## Next phases (not started)
- Push to GitHub (needs her account/gh + repo name + public/private).
  Unlocks: Netlify/Vercel deploy + preview URL, and a git-based CMS
  (Decap) so she can edit copy herself.
- Interior page build-out (sitemap step 4: page-by-page briefs + copy).

## Verification habits
- Preview server + screenshots at desktop 1440 and mobile 375.
- 10%-step scroll sweep to confirm sky/ink/celestial lockstep (no
  light-on-light).
- `npm run build` clean; console clean after a full Lenis scroll.
- Voice pre-flight on all copy: no em dashes, American spellings, USA
  Today (not NYT), no "not X but Y".
