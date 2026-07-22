# RBC Studio — Growth, Conversion & UX Plan (Global / Big-5 Edition)

Reviewed 2026-07-18 against v6.4.0. Lenses: marketing strategy, conversion, copywriting, viral distribution, UI/UX.
Target market: **US, EU, UK-adjacent Europe, Canada, Australia, New Zealand** ("Big 5"). This supersedes any earlier assumption of a local/SEA audience.
Companion to `CODEX_IMPROVEMENTS.md` (engineering). This file is about making the app *sell bags globally*, not just ship features. Each item below includes concrete implementation detail: files, data shapes, function names, example copy, and acceptance criteria.

---

## 1. Where the app stands

Strong foundation: 12 treatments × feed/reel, 9:16-first with grid-crop-safe design, a fact-driven copy engine (viral hooks + truthful FOMO + first-refusal CTAs in `js/facts.js` and `js/copy/*`), campaign library with image persistence (`js/state.js`, `js/images.js`), ZIP posting packs (`js/zip.js`), .ics schedule (`js/calendar.js`), optional AI polish (`js/ai.js`). The brand discipline (real scarcity only) is a genuine moat — competitors fake urgency; RBC never has to.

**The strategic gap, in one sentence:** the app produces *posts*, but a cross-border collector business runs on *DM trust, time-zone-correct reach, and repeat attention* — and the app currently goes silent at exactly the moments money appears (the DM) and trust is decided (shipping/authentication questions from an overseas buyer).

## 2. What "global Big-5" changes about the product

Selling a one-of-one bag from anywhere to a buyer in New York, London, Berlin, Toronto, Sydney or Auckland changes four things:

1. **Currency.** `RM ___` on the lot tag reads as a domestic shop to a US buyer. Global luxury convention is either a hard price in the buyer's reference currency (USD is the collector lingua franca) or deliberate "price on request" (POA), which also filters lowballers and drives DMs.
2. **Time zones.** The current queue times (10:00–20:00 local) are meaningless for reach. A drop must land in the *buyer's* prime windows. The Big-5 have a brutal property: US evening and AU/NZ morning are nearly opposite — one post time cannot serve both, so the schedule needs region targeting or a two-wave drop.
3. **Cross-border trust.** The overseas buyer's real objections are not authenticity alone — they are: insured shipping, customs/duties surprise, "what if it's not as described," and payment safety. These are copywriting problems the app should solve with a trust block, not something the operator improvises per DM.
4. **Idiom.** The copy engine's register (lowercase editorial, collector-specific) is already right for this market — US/EU vintage-collector Instagram speaks exactly this dialect. No translation layer is needed; what's needed is removing local tells (RM, local-time assumptions) and adding the trust language above.

---

## 3. The five biggest gaps (expert diagnosis)

### Gap 1 — No feedback loop (marketing)
Hooks rotate by index, not by performance. After ten drops the operator *knows* "name the year. no googling." out-pulls "the archive record comes first" — the app doesn't. Without a hook leaderboard the copy engine can never compound. Global makes this worse: the same hook performs differently at 9pm ET vs 8am AEST, and nothing records it.

### Gap 2 — The sale happens in DMs, and the app stops at posting (conversion)
"DM to acquire" is the CTA on every channel — then the operator improvises the funnel's most important conversation, now with added cross-border friction (shipping quotes, duties, payment rails, time-zone lag meaning hours between replies). Enquiry handling, provenance pack, price defense, shipping/trust answers, the close, and the truthful "second collector / first refusal" lever all belong in the app.

### Gap 3 — Single-shot drops, no narrative arc (viral)
One post per channel per drop. Viral collector accounts run arcs: tease (detail crop, no name) → reveal → proof (authentication close-ups) → sold story. The tease is the highest-comment format in the niche ("name this maison"). The app has all the facts to generate the whole arc but only generates the middle of it. For global reach the arc also solves the time-zone problem: tease in the AU/NZ window, reveal in the EU window, proof in the US window — one drop touches all three markets inside 24 hours.

### Gap 4 — Sold pieces are discarded instead of monetized (social proof)
"The sold record stays up marked acquired" is written into the copy — but the app never generates the *acquired post*. "listed tuesday, acquired friday. the collector is in <region>" (stated only when true, region only ever continent-level) is the strongest possible proof to the next overseas buyer that cross-border acquisition from this account is normal and safe.

### Gap 5 — The workflow reads as a form, not a studio (UX)
One long single-column scroll. On desktop the canvas — the heart of the product — scrolls away while editing the fields that repaint it. Labels mix registers ("the lowballer filter" as a label). No empty-state onboarding, no template recommendation by objective, passive completeness hint. And the UI contains local tells the global operator will trip on: `RM ___` default price, times with no zone.

---

## 4. The plan — prioritized, with detailed build prompts

Global constraints for every prompt:
- Static, local-first, **no build step, no backend, no tracking scripts, no paid APIs** for core features.
- Brand rules per `DESIGN.md`/`PRODUCT.md`: no fake urgency — every scarcity/demand claim literal; lowercase poetic register for public copy; zero-radius controls; cream/bronze palette.
- All new strings pass `lintGenerated()` (`js/facts.js`) — no em dashes, no exclamation points, no banned words.
- After each change: `node tests/unit.mjs` and `node tests/browser-e2e.cjs` must pass; add assertions for new behavior; bump `js/version.js` (drives SW cache + header version).
- New persistent data goes through `CampaignStore` (`js/state.js`) with silent migration of existing saves.

---

### P0 · Globalize the core (currency, time zones, trust block) — do this first

**Why first:** every other feature inherits these primitives (price rendering, zone-aware scheduling, trust strings).

```
Globalize RBC Studio for a US/EU/CA/AU/NZ collector audience:

A. CURRENCY
1. Add to the Campaign Brief (index.html, section 01): a "Pricing" fieldset:
   - select id="priceCurrency": USD (default), EUR, GBP, CAD, AUD, NZD,
     "POA (price on request)".
   - the existing fPrice input keeps the raw number; a new pure function
     formatPrice(facts) in js/facts.js renders it: "USD 4,800" style
     (ISO code + space + number with thousands separators via
     Intl.NumberFormat('en-US')). POA renders as "price on request".
2. campaignFacts() gains {currency, priceDisplay}. Every copy maker and
   canvas template that prints facts.price switches to priceDisplay.
   The lot tag (gridTag in js/templates/primitives.js) uses priceDisplay;
   verify it still fits the tag width at 6-digit prices in both formats
   (feed 60px / reel 52px font) — clamp with the existing maxWidth args.
3. Default field value: change index.html fPrice default from "RM ___"
   to empty with placeholder "4,800". Migration: existing campaigns
   keep their stored strings untouched.
4. POA conversion doctrine: when POA is selected, objectiveLine() appends
   "price on request. serious enquiries answered in order received." —
   truthful, filters lowballers, drives DMs.

B. TIME-ZONE-AWARE QUEUE
1. Add to the queue section: select id="targetRegion" with options:
   "Americas (ET)", "Europe (CET)", "AU/NZ (AEST)", "Follow the sun
   (two-wave)". Store per campaign.
2. Add js/schedule.js exporting PRIME_WINDOWS: for each region and
   channel, the evidence-based windows in the BUYER's zone:
     instagram: ET 11:00–13:00 and 19:00–21:00 weekdays;
     tiktok: ET 18:00–22:00; CET 19:00–21:00; AEST 19:00–21:00;
     telegram: buyer morning 08:00–09:00; threads/x: buyer 08:00–10:00.
   (Encode as {region:{channel:[{h,m}]}}; one suggested time each.)
3. suggestTimes(region, campaignDate) converts the buyer-zone window to
   the OPERATOR's local wall clock using Intl.DateTimeFormat with
   timeZone ('America/New_York', 'Europe/Berlin', 'Australia/Sydney')
   — implement conversion by constructing the target-zone datetime and
   reading its UTC offset for that date (handles DST correctly; add a
   unit test around a DST boundary date).
4. A "suggest times" button fills the five time inputs; times remain
   editable. Each queue row shows both clocks: "20:30 your time ·
   09:30 wed AEST" so the operator never posts into a dead zone.
5. "Follow the sun" assigns: tease/telegram wave in AEST morning,
   instagram+tiktok in ET evening, threads/x in CET morning (rationale
   comment in code). buildCalendar() (js/calendar.js) writes events in
   the operator's local time as today, but appends the buyer-zone label
   to each SUMMARY.

C. CROSS-BORDER TRUST BLOCK
1. Add three optional brief fields (all default-empty; empty = omitted
   everywhere, consistent with the facts doctrine):
   - fShipping, placeholder "insured worldwide courier, fully tracked"
   - fDuties, placeholder "import duties are the collector's
     responsibility" (or "duties included" if the operator offers it)
   - fGuarantee, placeholder "authentication documented before dispatch"
2. trustBlock(facts) in js/facts.js: joins the present ones lowercase
   with ' · '. Placement per PRODUCT.md principle 3 (trust under the
   CTA): instagram.js and telegram.js insert trustBlock() on the line
   AFTER objectiveLine(); tiktok voiceover appends the shipping fact
   only; x/threads omit (space-constrained).
3. The DM scripts in P2 consume the same three fields.
4. Never generate a shipping/duties claim the operator did not type.
Acceptance: unit test that empty trust fields produce byte-identical
output to today's; that POA never prints a number anywhere; that
suggested times round-trip a DST boundary correctly.
```

---

### P1 · Hook Leaderboard (the compounding loop)

```
Add a performance loop to RBC Studio:

1. RESOLVED-COPY SNAPSHOT. In js/copy/index.js, when generatePack runs,
   also compute {platform → {hook, opener, fomo, template, region,
   postedTimeLocal}} by capturing the resolved strings (the makers
   already derive them deterministically from variant index — refactor
   each maker to also export a describe(facts,variant) returning the
   parts, or have makers return {text, meta}; keep the public string
   API for tests by adapting call sites).
2. RESULTS ENTRY. In the queue, each channel row gains three compact
   numeric inputs: views, saves, DMs (labels: "views · saves · dms").
   Persist via CampaignStore under campaign.results[channel]. Autosave
   with the existing debounce. Blank = unknown, never zero.
3. LEADERBOARD. New panel inside the Campaign Library ("Desk record"):
   aggregates across all campaigns: for each hook string ever used,
   sum dms and saves; rank by dms desc, saves desc. Render top 3 per
   strategy bucket (bucket = which bank the string came from; store
   bank name in the snapshot). Hairline table, bronze bars sized by
   dms share (pure DOM, no chart lib).
4. FEED IT BACK. Add "proven first" checkbox next to the generate
   buttons: when checked, signalHook()/viralHook()/fomoCloser() receive
   a startIndex resolved from the leaderboard (the index of the best-
   performing line in its bank; fall back to 0 when no data). Implement
   as an optional {preferred} arg so the pure functions stay testable.
5. REGION SPLIT. Because P0 stores targetRegion per campaign, the
   leaderboard gains a region filter (All / Americas / Europe / AU-NZ)
   — the same hook can win in one market and lose in another.
Acceptance: entering results, reloading, and reopening shows the same
numbers; leaderboard ranks a seeded fixture correctly in a unit test;
"proven first" changes the first generated hook once data exists.
```

---

### P2 · DM Closer Kit (own the conversation where money changes hands)

```
Add a sixth output card "DM desk" to RBC Studio's Channel Pack (collapsed
by default, js/copy/dm.js, registered in COPY_MAKERS as 'dm' but excluded
from the 5-channel readiness meter):

Scripts, each with its own copy button, all built from campaignFacts():
1. ENQUIRY REPLY (goal: respond fast across time zones without sounding
   canned): "thank you for the enquiry. archive no. {no}: {provenance}.
   {auth}. {priceDisplay}. first come, first considered." + trustBlock().
2. PROVENANCE PACK: the full record as a paste-ready message: name (only
   if includeName), era, material, condition, authentication, defining
   detail, archive number, price line, acquisition route. Line-per-fact.
3. SHIPPING ANSWER (global buyers ask this first): fShipping + fDuties +
   "dispatch within X business days" where X is a new small brief field
   fDispatch (default empty → line omitted).
4. LOWBALL DEFENSE, three graduated replies that restate the record
   instead of arguing:
   a. "the price reflects the record: {two strongest facts}. it is firm."
   b. "we price against the record, not against offers. the piece is
      {priceDisplay}."
   c. "understood. the record stays open at {priceDisplay}. if it is
      still available when you decide, the first refusal note applies."
   Never rude, never desperate, never negotiating against ourselves.
5. THE CLOSE: hold/payment terms template with acquisition route and a
   blank the operator fills for payment method; never invent rails.
6. SECOND-COLLECTOR NOTE, rendered with a visible red-bronze label
   "SEND ONLY IF TRUE": "another collector has asked about this piece.
   you hold first refusal until {operator fills time + zone}."
7. TIME-ZONE COURTESY LINE, auto-built from targetRegion: "we reply
   across time zones; expect an answer within 12 hours." — only if the
   operator enables it (checkbox), because it is a service promise.
Export: dm-scripts.txt joins the pack ZIP (js/zip.js) and plain-text
export. Unit tests: every script omits absent facts entirely; lowball
replies contain priceDisplay only when a price exists (POA variant says
"the record is priced on request and firm").
```

---

### P3 · Drop Arc Generator (tease → reveal → proof — and it solves time zones)

```
Extend RBC Studio from one post per channel to a 3-act arc:

1. DATA MODEL. campaign.arc = {tease:{date,time,ready}, reveal:{...},
   proof:{...}}; reveal defaults to campaignDate; tease defaults to
   the day before; proof to the day after. All editable in an "Arc"
   strip above the queue table. The five-channel readiness meter is
   unchanged (it tracks the reveal); tease/proof get their own two
   small ready dots.
2. TEASE VISUAL. In js/canvas.js add renderTeaseBlob(): reuse the
   current template but: crop the bag image to a detail region (zoom
   the existing drawBag transform to 2.4x centered on the bag's upper
   third, where hardware lives), suppress gridTag and name text (the
   templates already gate name on tagOn/includeName — add a global
   teaseMode flag the templates check via env.tease to skip name,
   price, and lot number), keep the masthead. SOLD stamp never renders
   in tease mode.
3. TEASE COPY. Add TEASE_BANK to js/facts.js (comment-bait, zero facts
   revealed): "name the maison. no googling.", "you know this hardware
   or you don't.", "the era gives it away. which is it.", "tomorrow the
   record opens. today, just this detail.", "collectors will get this
   in one frame." teaseCaption(facts,variant) = bank line + '\n\n' +
   "the record opens {reveal day, e.g. 'thursday'}." + discoveryTags
   with the NICHE tier removed (don't leak the maison in tags).
4. PROOF COPY (T+1, generated ONLY while soldToggle is off — enforce in
   code, not convention): leads with authentication facts: "{auth}.
   {detail}. still one available. the record is open." + objectiveLine
   + trustBlock. If sold before proof date, the proof slot instead
   offers the P4 acquired post.
5. FOLLOW-THE-SUN INTEGRATION (with P0): arc acts map to regions —
   tease AEST morning, reveal ET evening, proof CET morning — one drop
   touches all three markets in 24 hours. suggestTimes() fills all
   three acts when region = follow-the-sun.
6. EXPORTS. ZIP gains tease/ and proof/ folders (visual + copy);
   buildCalendar() emits one VEVENT per act per channel actually used
   (tease: instagram+tiktok only; proof: instagram story + threads).
Acceptance: e2e drives the full arc: set date → suggest times →
generate tease (assert no name/price/lot number pixels' text in copy;
visual differs from reveal) → generate pack → toggle sold → proof slot
switches to acquired offer.
```

---

### P4 · Sold-Story Engine (turn every sale into the next sale's FOMO)

```
When soldToggle flips on, RBC Studio offers — never auto-posts — an
"acquired" content pack:

1. TRIGGER + UI. Flipping soldToggle shows a quiet inline card under the
   toggle: "the piece is acquired. generate the sold story?" [generate].
   Campaign Library rows for sold campaigns get a bronze ACQUIRED chip
   and a per-row "sold story" action.
2. VISUAL. The SOLD stamp treatment already exists (primitives.sold);
   the sold story uses the current template + stamp, exported via the
   existing renderBlob path.
3. COPY (js/copy/sold.js). makeSoldStory(facts, meta):
   - line 1: "archive no. {no} has been acquired."
   - days-on-market, computed ONLY when campaignDate exists and is in
     the past: "listed {weekday}, acquired {weekday}." (derive from
     campaignDate → today; if same day: "listed and acquired within
     the day." — powerful and true).
   - buyer region, continent-level ONLY and ONLY if the operator picks
     it from an optional select (americas/europe/asia pacific/prefer
     not to say → omitted): "the piece joins a collector in {region}."
     This normalizes cross-border buying for the next prospect. Never
     more specific than continent; never inferred.
   - forward line: check CampaignStore for another non-sold campaign;
     if one exists: "the archive continues. the next record opens
     soon." else: "the record remains in the archive."
   - closes with: "records stay published after acquisition. that is
     the archive." (brand-true, differentiating).
4. WHERE IT POSTS. One instagram caption + one story line + one
   telegram line; no tiktok/x/threads by default (sold stories are
   trust content, not reach content).
5. LEADERBOARD LINK (P1): a sold campaign auto-records days-to-sale;
   the Desk review dashboard uses it for median days-to-acquired.
Acceptance: unit tests for date math across month boundaries; no
region line without explicit selection; forward line switches based on
library contents.
```

---

### P5 · Studio Layout (desktop two-pane, mobile drive-to-done)

```
Restructure RBC Studio's UX without changing any feature:

1. TWO-PANE DESKTOP (≥1100px, css/studio.css grid): left column 460px
   scrollable: brief / images / piece fields. Right column flexible:
   position:sticky top:16px canvas + proof strip + format toggle +
   drag controls, always visible while any field edits repaint it.
   Mobile (<1100px) keeps the current single column ordering. The
   sticky dock (Generate/Export) remains mobile-only.
2. PROGRESSIVE DISCLOSURE. Once the brief is complete (objective,
   angle, date all set), collapse section 01 to a one-line summary
   chip: "acquire via dm · provenance · thu 24 jul · ET" with an edit
   affordance. Same for Images once both slots are filled ("6 mood ·
   bag ✓"). Implement as a .collapsed class + button, no animation
   beyond 200ms ease (DESIGN.md motion rules), respects
   prefers-reduced-motion.
3. DRIVE-TO-DONE. Replace the passive completenessHint with a chip row
   under the header pulse: Brief ✓ · Images ✓ · Visual ✓ · Pack 3/5 ·
   Scheduled ✗. Each chip is a button that scrolls to its section
   (scrollIntoView block:'start'). States derive from existing
   syncReadiness data + new checks (visual = a PNG was generated this
   session or images exist; scheduled = all five times touched or
   suggested).
4. EMPTY STATE. First launch (no campaigns in store): show a 3-step
   card in place of the canvas: "1 add the bag photo · 2 pick a
   treatment · 3 generate the pack", plus a text link "load example
   campaign" which creates the current Dior demo values as an explicit
   example campaign (name it 'example · archive no. 004'). Field
   defaults in index.html become empty/placeholder accordingly.
5. TEMPLATE RECOMMENDATION. TEMPLATE_META already carries commercial
   subtitles. When campaignObjective changes, add class .suggested
   (bronze corner dot + subtitle emphasized) to the 2 matching proof
   cells: drop→Maison,Noir · educate→Specimen,Dossier ·
   styling(angle)→Runway,Snapshot · profile→Atelier,Éditorial.
   Never auto-switch the selection.
6. LABEL REGISTER CLEANUP. Labels become plain sentence case
   ("Provenance", "Price"); the wit moves to hint lines under fields
   ("the lowballer filter" becomes the hint for Provenance). One pass
   over index.html; keep hints 11px var(--soft) per existing .hint.
7. VERSION FIX. index.html hardcodes v6.2.0 in #appVersion — ship the
   span empty; js/app.js already fills it from APP_VERSION.
8. PHONE-SCALE DEFAULT. phoneScaleToggle defaults ON in reel format
   (operators must judge 9:16 legibility at phone size); remember the
   user's choice per device in localStorage (not per campaign).
9. SNAP-TO-GRID (toggleable). Add checkbox "snap" next to the existing
   safe-guide toggle (default ON; persisted per device in localStorage
   like phone-scale, not per campaign).
   - SNAP TARGETS, in priority order when within threshold:
     a. canvas horizontal center (x = W/2) — the money guide: every
        template composes around the center axis;
     b. vertical centers: full-canvas center (y = CH/2) and, in reel
        mode, safe-band center (y = (RT+RB)/2) — these differ, both
        matter;
     c. rule-of-thirds lines of the working area (feed: full canvas;
        reel: the RT..RB band) at 1/3 and 2/3, both axes;
     d. reel side-inset edges (x = REEL_SIDE and W-REEL_SIDE) for
        text blocks only, so type can snap flush to the safe margin.
   - MECHANICS in js/canvas.js: implement snapPoint({x,y}, kind) where
     kind is 'bag' | 'text' | 'block'. Threshold 14 canvas px (scale-
     independent since drag coords are already canvas-space). Apply
     inside the pointermove handler for all three drag paths (bagX/bagY,
     txX/txY, and the per-block layout offsets), snapping the ELEMENT'S
     ANCHOR: the bag snaps by its center; text/blocks snap by their
     hit-rect center, plus edge-snap of the rect's left/right to the
     side insets. Never snap during keyboard nudging (arrow keys are
     the precision path and must stay 1% exact).
   - VISUAL FEEDBACK: while a snap is engaged, draw the engaged guide
     as a 1px line in bronze rgba(117,95,66,.55) across the working
     area for the duration of the drag frame only (drawn in drawMain
     after the template, before drawGuide; no persistence after
     pointerup). A tiny 'snapped' tick is unnecessary — the line is
     the feedback. Respect exporting flag: guides never render into
     exported blobs (reuse the existing showGuide/exporting gating).
   - BYPASS: holding Alt (or Cmd on mac) during drag disables snapping
     for that gesture — check e.altKey/e.metaKey in pointermove; add
     this hint to the dragHint line ("hold alt to drag free").
   - PERSISTENCE: the snapped positions save exactly like free
     positions (bagX/bagY/txX/txY/layout via getState) — snapping is a
     drag-time aid, not a data format.
   Acceptance: e2e drags the bag to within threshold of W/2 and asserts
   bagX === W/2 after pointerup; repeats with snap toggle off and
   asserts bagX !== W/2; asserts an exported PNG during an engaged
   snap contains no guide-line pixels (compare against export with
   snap disabled at identical position).
Acceptance: e2e asserts two-pane at 1280px (canvas bounding rect stays
in viewport while scrolling the left column), single column at 375px,
chip navigation scrolls, empty state appears with a cleared store and
disappears after "load example campaign".
```

---

### P6 · Big-5 idiom & compliance pass (copy layer)

```
Tune RBC Studio's generated copy for US/EU/CA/AU/NZ collectors:

1. SPELLING SWITCH. Add brief select "copy spelling: american /
   british" (default american; AU/NZ/UK read american fine, US buyers
   notice british). Implement as a tiny post-processor in facts.js:
   applySpelling(text, mode) mapping the handful of words the banks
   actually use (colour/color, authorised/authorized, enquiry/inquiry —
   audit the banks and map only real occurrences; keep "enquiry" in
   british mode since it's collector-correct there).
2. IDIOM AUDIT of all banks in js/facts.js for local tells: remove or
   generalize anything that assumes a local marketplace; ensure price
   references go through priceDisplay (P0). "somebody's girlfriend
   wants this." — replace with "somebody's group chat is about to see
   this." (same energy, no gendered assumption; better for the Big-5
   audience and safer for brand).
3. DISCLAIMER/COMPLIANCE. Keep the existing brand-association
   disclaimer on instagram; add it to tiktok caption when tags are on
   (US platform norms). Add a single sentence to the sold-story and
   proof copy paths guaranteeing nothing is stated as fact that is not
   operator-entered (already the doctrine — add a code comment + test).
4. HASHTAG TIERS (global). Replace the fixed set in discoveryTags():
   NICHE from maison+era ("#vintagedior #gallianoera" — derive maison
   token from first word of name, lowercase, only for known maisons:
   dior chanel hermes vuitton bottega prada fendi gucci celine loewe),
   MID (#archivefashion #authenticatedvintage #vintagebags),
   BROAD (#fashionhistory #collectorsitem), plus #rarebagclub always.
   Compose 2 niche + 2 mid + 1 broad. TikTok gets 3 max (1 niche 1 mid
   #rarebagclub). Telegram none. Behind the existing toggle. The tease
   act (P3) strips the niche tier.
5. AI POLISH. BRAND_RULES in js/ai.js gains: "Audience: US, European,
   Canadian, Australian and New Zealand vintage collectors. Use the
   selected spelling convention. Prices are shown with ISO currency
   codes; never convert or invent exchange rates."
Acceptance: unit test applySpelling round-trips; a british-mode pack
contains no american-mode variants of mapped words; tease copy never
contains a niche maison tag.
```

---

### P7 · Performance dashboard (once P1 has data)

```
Add "Desk review" to the Campaign Library: per-month cards computed
entirely from CampaignStore:
- drops posted, sell-through (sold/total), median days-to-acquired
  (from P4), best hook + best template by DMs (from P1), region split
  of results (from P0's targetRegion).
- Render: brand hairline tables + bronze bar meters (width % of max,
  plain divs). No chart libraries. Months with no data are omitted.
- One derived insight line per month, rule-based and truthful, e.g.
  "hooks in the saves bucket drove {n}% of enquiries this month" —
  computed, never speculative.
This is the operator's monthly retro — it closes the loop P1 opens.
```

---

## 5. Quick wins (do alongside anything)

| Win | How |
|---|---|
| `#appVersion` hardcoded v6.2.0 | Empty the span in index.html; app.js fills it (P5.7) |
| `RM ___` default price | Becomes empty + placeholder; currency select (P0.A) |
| Queue times have no zone label | Dual-clock display per row (P0.B4) |
| Caption textarea has no counter | Reuse js/validation.js instagram limit (2,200) under the caption box |
| Proof-strip subtitles hidden on mobile | Always render the subtitle line under the template name at all widths |
| No social meta on index.html | Add og:title/og:description/og:image (use apple-touch-icon.png) — operators share the tool's link with each other |
| "Generate final image" label | Rename dynamically: "Export 9:16 visual" / "Export 4:5 visual" per current format |

## 6. Sequencing

| Phase | Items | Rationale |
|---|---|---|
| 1 | P0 + quick wins | Currency/zones/trust are primitives everything else consumes; local tells are actively costing conversions today |
| 2 | P5 | UX friction taxes every session; fix the room before adding furniture |
| 3 | P2 + P4 | Nearest to revenue: close cross-border DMs better, monetize every sale |
| 4 | P3 | The arc multiplies reach per drop and is the structural answer to Big-5 time zones |
| 5 | P1 → P7 | Start logging as soon as P1 lands; dashboard once data exists |
| 6 | P6 | Idiom polish compounds on top of everything |

**The one-line thesis: stop optimizing the post, start optimizing the loop — tease (AU/NZ morning) → reveal (US evening) → DM close (trust block + scripts) → sold story → leaderboard → better next drop.**
