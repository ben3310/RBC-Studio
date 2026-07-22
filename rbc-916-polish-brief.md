# RBC Studio — 9:16 Typographic Refinement Pass
### Brief for Claude (Sonnet) · hand over verbatim
### Target: v6.0.5+ · bump appVersion on completion

---

## ROLE

You are a senior art director finishing a luxury resale house's Reels/Story system. The
structural work is done — photos already bleed the full 1080×1920 canvas. What's left is
**typography and composition polish**: the type is currently sized for the old 4:5 canvas,
so on 9:16 it reads small, timid, and loosely spaced. Your job is to make every one of the
12 reel templates look like a page from a printed maison catalogue — confident scale,
deliberate hierarchy, no orphaned floating labels.

Reference taste: Céline invitations, Acne Paper mastheads, vintage Sotheby's lot cards,
A24 title cards. Quiet, but LARGE.

---

## GROUND RULES (do not violate)

1. **Verify with your eyes.** Run `node tools/visual-check.mjs` → inspect `shots/*.png`
   after EVERY change. A template is "done" only after you have looked at its screenshot
   (tag-on AND tag-off). Never claim a fix from code alone.
2. **Feed 4:5 is frozen.** Touch only the `reel()` exports in `js/templates/*.js` and
   shared reel-only primitives (`reelMast`, `gridTag` reel branch, `atmosphere`,
   `hazardVignette`) in `js/templates/primitives.js`. Feed screenshots before/after must
   be identical.
3. **Meta safe zones are for TEXT/UI only** — photos keep bleeding full canvas:
   - All text baselines inside y **269 → 1248**, x inset **65px** (add ~70px extra on the
     right where type would collide with the action rail).
   - Photos/frames/atmosphere: full 0 → 1920. Never shrink an image to "protect" it.
4. **Single price authority.** Tag ON → template must show zero name/price/CTA of its own.
   Tag OFF → its own commerce block returns, styled to the template's voice.
5. Canvas 2D only, existing font stack only: Cormorant Garamond (serif/display) +
   Hanken Grotesk (labels). No new assets, no external libs.
6. After the pass: bump `APP_VERSION` (js/version.js, index.html, package.json,
   tests/browser-e2e.cjs assertion) and run `npm test`.

---

## THE ACTUAL PROBLEM — type scale

Current reel type was ported from 4:5 nearly unchanged. On a 1920-tall canvas viewed
full-screen on a phone it under-fills badly:

- Hooks/headlines: currently ~34–52px → should be **72–120px** (display serif, tight
  leading ~1.05, may break into 2–3 ragged lines).
- Template mastheads ("THE ARCHIVE GAZETTE" etc.): scale up until they span ≥80% of the
  safe width.
- Micro-labels (LOT 004, FIG. 01, @RAREBAGCLUB): keep small (17–22px) — contrast in scale
  IS the luxury signal — but give them intentional anchors: pin to band edges, align to
  the same grid, letterspace 3–6px, never float in the middle of nowhere.
- Commerce blocks (tag OFF): name 56–72px serif, price equally weighted, CTA italic serif
  ~36px. These should read as a composed lot card, not three stacked strings.
- Use the full band height: header zone at band top, hero/hook in the upper third,
  commerce/tag at ~70% of band, footer strip hugging band bottom (y≈1200–1248). No
  contiguous text-free stretch taller than ~25% of the band unless the photo itself is
  the statement there.

## REFINEMENT CHECKLIST (apply per template)

- [ ] One clear focal hierarchy: exactly one element wins (usually the hook); everything
      else steps down in size, weight, or opacity.
- [ ] Legibility plates: any text over photography sits on a plate (rgba paper .90–.94) or
      gradient scrim — with consistent internal padding (≥24px) and NEVER clipping
      descenders. Plate widths should relate to the text, not arbitrary rects.
- [ ] Optical alignment: shared left margin per template (pick one x and stick to it);
      centered elements truly centered including their plates.
- [ ] Rhythm: vertical gaps between text groups should follow a scale (e.g. 24/48/96),
      not accidental values.
- [ ] Kerning/casing: display serif lines in sentence case or elegant italic; ALL-CAPS
      only for Hanken micro-labels with letterspacing.
- [ ] `txY` drag offset must still move the text group coherently (test by eye if unsure).
- [ ] Tag ON composition must not leave a hole where the commerce block was — rebalance
      (enlarge hook, shift provenance line) rather than leaving a gap.
- [ ] Zero-image state still composes (run the harness's `zz-noimage-reel.png`).

## PER-TEMPLATE NOTES (identity to preserve while scaling up)

| Template | Voice | Scale-up priority |
|---|---|---|
| Collage | contact sheet | hook banner much larger; header strip full safe width |
| Maison | fragrance ad | name/hook as giant centered serif stack |
| Éditorial | magazine cover | hook = cover line, 100px+, crossing the seam |
| Noir | cinema | hook lines 90px+, gold rule wider, credits as film-credit row |
| Vitrine | auction lot card | lot header + commerce card larger, card padding generous |
| Atelier | spec sheet | name 64px+, spec rows taller with more air |
| Gazette | newspaper | masthead spans safe width; headline 72px+ |
| Snapshot | polaroid wall | caption strip taller, handwriting-esque italic larger |
| Specimen | lab board | "SPECIMEN" label row larger; fig captions aligned to a column |
| Poet | gallery arch | hook as engraved title 64px+; commerce as plinth caption |
| Runway | type poster | already big — refine leading/overlap so bag doesn't hide words |
| Dossier | case file | hook typewriter-large; ledger rows taller; stamp proportional |

## ACCEPTANCE

For each of the 12: screenshot reviewed (tag on/off), type fills the band with clear
hierarchy, no text in hazard zones, no clipped/overlapping glyphs, feed unchanged,
`npm test` green, version bumped. Deliver a one-line summary per template of what changed.
