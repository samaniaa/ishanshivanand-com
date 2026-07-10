# PLACEHOLDERS.md — what Aarti fills in before launch

The homepage is the "One day, one life" scroll: pre-dawn → sunrise →
morning research → midday philanthropy → afternoon book → golden-hour
film → dusk work → night story. These are the slots that need real
content, plus the claims caution log for the pre-launch pass with
Ishanji.

## 1. Photography (golden-hour grade, always)

Warm rim light, long soft shadows, no flash look, no stock-corporate
imagery. Slots on the homepage:

1. **Philanthropy drift row** (`index.html`, `.phil__photo` frames):
   - ARK rural healthcare photo
   - IIT education/scholarships photo
   - Six Sigma field/high-altitude medical photo
2. **Sunrise portrait**: FILLED (her arms-open cutout,
   `public/assets/img/sunrise-cutout.webp`).
3. **Dusk About portrait** (`.night__photo`): currently the supplied
   wood-background portrait; swap for the chosen final portrait when
   ready.

## 2. Testimonial

The MD Program Director quote is carried over from your Framer mockup
and is NOT verified verbatim. Provide the exact quote, name/title, and
permission status. A second quote slot can be added beside the
philanthropy chapter when one is cleared.

## 3. Contact

`/connect/` is now the full Contact page (ported from your Claude Design
"Contact.dc.html"): dawn-field atmosphere, invitation, a routed enquiry
form with progressive disclosure (Speaking adds event fields, Media adds
outlet), a direct-routes column, and the "Rise and Lift Others" close.
Still to confirm before launch:

- **Form endpoint.** The form UI is complete but NOT wired to a backend.
  On submit it validates, opens a prefilled `mailto:` to the office, and
  shows the success state, so nothing is lost pre-launch. Swap in a real
  service at launch: set `ENDPOINT` in `src/js/modules/contactPage.js`
  (top of file) to a Formspree/Web3Forms URL and POST instead of mailto.
- **Destination email.** The design routes everything to
  `hello@compassionunites.com` (used in the form mailto, the direct-route
  card, and the ContactPoint JSON-LD in `connect/index.html`). Confirm
  this is the right inbox, or give the real one.
- **Social links.** The LinkedIn and YouTube routes are `#`
  placeholders (`data-placeholder`), like the footer links.

## 3b. Trusted-by logos
Typographic institution names for v1 (safe with parliaments/agencies).
When logo permissions exist, swap to monochrome marks — layout is ready.

## 3c. Book laurel graphic
The five award seals are live on the book chapter. If you prefer your
Framer composite laurel graphic instead, send the image and it swaps in.

## 4. Social links

Footer LinkedIn/Instagram links are `#` placeholders
(`data-placeholder` attributes mark them).

## 5. Hero portrait attire edit (optional, for /about/ and pages)

The Higgsfield workspace had 0 credits. The portrait is uploaded
(media_id `00b733a2-760a-448a-af18-fc48ecf6d362`); the editing prompt
for smart-casual variants:

> Edit this photo: keep the man's face, expression, smile, beard, hair,
> pose and the warm wooden background EXACTLY the same. Replace his
> clothing only: instead of the red robe and bead necklaces, he now
> wears a perfectly tailored deep navy unstructured blazer over a fine
> merino crew-neck sweater in warm ivory. No jewelry. Smart-casual
> executive portrait, same warm golden-hour directional lighting,
> photorealistic, high detail.

## 6. Interior pages

All eight routes are elegant stubs with "On this page" indexes where
the sitemap defines children. Page-by-page briefs and copy are the next
build phase (sitemap step 4).

---

## Claims caution log (v1 claims everything; curate before launch)

| Claim on site | Note |
|---|---|
| "adopted at Google and Fortune 500 companies" | Her AEO paragraph wording; confirm cleared |
| "adopted at Mayo Clinic, Google, Amazon, and MD Anderson" | Locked Context Pack language (research chapter) |
| "advises global governments and CEOs" | Her wording; confirm |
| Trusted-by institution names (US Congress, UK Parliament, White House ONDCP, universities, PRH) | v1 holds all; verify wording and any logo permissions later |
| 82% / 79% / 73% | Verified ranges from the Context Pack |
| Testimonial quote | Paraphrase; needs verbatim + permission |
| Award seals (USA Today, Nautilus, Literary Titan, BookFest, Amazon #1) | Images from your Framer mockup; confirm rights to use each mark |
| Video (The Ancient Practice High Performers Are Missing) | Confirm this is the film you want on the homepage |
