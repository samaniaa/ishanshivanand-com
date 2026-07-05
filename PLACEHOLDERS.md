# PLACEHOLDERS.md — what Aarti fills in before launch

Every placeholder in the build is listed here, with the vibe brief for
sourcing imagery and the claims caution log for pre-launch curation.

## 1. Hero portrait (AI attire edit)

The hero currently uses the supplied photo (`public/assets/img/portrait-hero.jpg`)
with a warm brand treatment. The plan is 2–3 AI attire-edit variants
(smart casual / corporate) so the image reads universally for
institutional audiences.

**Status: blocked on image credits.** The connected Higgsfield workspace
has 0 credits (free plan). The portrait is already uploaded
(media_id `00b733a2-760a-448a-af18-fc48ecf6d362`). Once credits are
added, ask Claude to rerun the generation, or paste this prompt into any
capable editor (Gemini, Nano Banana):

> Edit this photo: keep the man's face, expression, smile, beard, hair,
> pose and the warm wooden background EXACTLY the same. Replace his
> clothing only: instead of the red robe and bead necklaces, he now wears
> a perfectly tailored deep navy unstructured blazer over a fine
> merino crew-neck sweater in warm ivory. No jewelry. Smart-casual
> executive portrait, same warm golden-hour directional lighting,
> photorealistic, high detail.

Variant 2: charcoal suit, open collar, no tie. Variant 3: warm
earth-tone unstructured jacket over a navy band-collar shirt.

Drop the chosen file at `public/assets/img/portrait-hero.jpg`
(portrait orientation, at least 1200px wide).

## 2. Chapter photography

Slots are labeled in the sphere and the fallback grid. Vibe brief:
**golden-hour light, always.** Warm rim light, long soft shadows,
amber-on-navy tones. No flash-photography look, no stock corporate
imagery. Slots:

1. Keynote, institutional stage
2. Hospital program delivery
3. Rural clinic, Rajasthan
4. University research visit
5. Champions program, Mauritius
6. Live forum, large audience
7. Field medical, East Africa
8. IIT Ropar, Centre opening
9. Quiet practice, teaching
10. Government reception
11. Book, reader moment
12. Corporate program, workshop

Drop files into `public/assets/gallery/` as 512px-wide webp and update
`src/js/gallery/galleryData.js` (set `src`) and the grid in
`index.html`.

## 3. Logo wall

Currently typographic marks. Replace with official monochrome logo
files (SVG preferred) in `public/assets/img/logos/`, then swap the
`<span class="logo-wall__name">` entries in `index.html` for `<img>`.

## 4. Testimonials

One quote is live with placeholder attribution ("Program Director,
medical institution" — wording paraphrased from the Framer mockup and
NOT verified). Provide the strongest 2–3 verbatim quotes with names,
titles, and permission status.

## 5. Book

Cover artwork for the book tease (`tease--book` frame) and retailer
links for the Book page.

## 6. Proof strip numbers

Live values: 100,000+ daily session participants · 50,000+ at single
live forums · 100+ countries · 6 peer-reviewed studies. Confirm the
cleared figures (countries figure is my inference and needs checking).

## 7. Contact

`/connect/` is a stub pointing at office@ishanshivanand.com (address
unverified). Provide the real enquiry destination or form service.

## 8. Social links

Footer LinkedIn/Instagram links are `#` placeholders
(`data-placeholder` attributes mark them).

---

## Claims caution log (v1 claims everything; curate before launch)

Per the July 2026 decision, v1 holds every institutional name and
number. Review each with Ishanji before the site goes public:

| Claim on site | Note |
|---|---|
| 100,000+ daily participants | Community figure, confirm cleared wording |
| 50,000+ at single live forums | Same |
| 100+ countries | Inferred, verify |
| Mayo Clinic / Google / Amazon / MD Anderson adoption | Locked language ("adopted at"), permission check for logo wall usage |
| US Congress / UK Parliament / White House ONDCP | Locked language, verify wording on plaques/letters |
| Testimonial quote | Paraphrase, needs verbatim + permission |
| University names on logo wall | Research collaborators, fine; logo usage permission needed |
| Penguin Random House on logo wall | Publisher mark usage permission needed |
| 82% / 79% / 73% stat ranges | Verified ranges from the Context Pack |
