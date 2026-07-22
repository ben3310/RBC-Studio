# RBC Studio 6.0 - Campaign Operating System

## Product direction

RBC Studio should turn one authenticated archive piece into a coordinated social campaign in one sitting. The existing visual generator remains the creative core. The new product layer removes the repetitive work around it: shaping the product story, adapting it to each channel, tracking what is ready, and exporting a complete posting pack.

The product is intentionally local-first and backend-free. A collector or social lead can open the app on a phone or laptop, create the campaign, save progress automatically in the browser, and export the work without an account. The static bundle is installable and can be deployed on Netlify's free tier.

## Brand interpretation

- RareBagClub is an archive and private dealer, not a high-volume resale marketplace.
- Specificity is the conversion device: era, provenance, condition, authentication and archive number do more work than luxury adjectives.
- Real scarcity can be stated. Invented deadlines and false urgency cannot.
- The visual language should feel like an archivist's desk: cream paper, bronze rules, sharp borders, serif editorial typography, and restrained motion.
- Platform copy can be native and conversational, but must remain precise, lowercase, and free of hype.
- Acquisition language replaces checkout language. "Collectors" replaces "customers" where natural.

## Primary workflow

1. Open, duplicate or create a campaign from the local campaign library.
2. Complete the campaign brief: objective, date, destination route and core story angle.
3. Add images and structured details for the piece. Images persist with the campaign.
4. Choose and adjust an editorial treatment for feed or vertical video.
5. Generate a platform pack for Instagram, TikTok, Telegram, Threads and X.
6. Review per-post limits, video direction and publishing notes.
7. Export the complete ZIP pack, copy-only text pack or calendar schedule.
8. Mark each channel ready, then use posting-day actions to copy and mark it posted.

## Information architecture

### Header and campaign pulse

- Brand wordmark, version, local save state.
- Campaign progress meter based on the five channels.
- Compact navigation anchors: Brief, Visual, Channel Pack, Queue.
- Campaign library with open, duplicate, rename and delete actions.
- Quiet service-worker update indicator tied to the visible app version.

### Campaign brief

- Objective: acquire via DM, drive profile visits, educate collectors, announce archive drop.
- Story angle: provenance, collector knowledge, styling, rarity.
- Drop date and time.
- Acquisition route.
- Optional product URL.
- Structured details used by every copy generator: era/year, condition, authentication, material/color, defining detail.

### Visual studio

- Preserve image upload, 12 treatments, bag/text dragging, feed and vertical output, safe zones, sold state and final PNG generation.
- Clarify microcopy and keep image controls compact.

### Channel pack

- One action regenerates a complete campaign from the current brief.
- Instagram: hook, body, credibility, CTA, disclaimer and restrained discovery tags.
- TikTok: on-screen hook, short caption, 5-shot sequence, voiceover, CTA.
- Telegram: high-information drop announcement with price, provenance and acquisition route.
- Threads: conversational three-post thread designed for replies without manufactured controversy.
- X: concise two-post thread that fits the current character limit.
- Every output has a live character count, copy action and ready checkbox.
- Platform tabs reduce scrolling on mobile; all channel cards remain accessible.
- Multi-post channels validate each post independently using grapheme-aware counts.
- Deterministic copy rotates through at least ten lead variants per story angle.
- Optional user-key AI polish is off by default and never required for core use.

### Publishing queue

- Five-channel schedule derived from the selected date and editable times.
- Suggested sequence is a workflow recommendation, not a promise of algorithmic performance.
- Draft, ready and posted states are visible and persisted.
- On the campaign date, each queue row copies its post and marks it posted.
- Export a complete ZIP posting pack, copy-only text file or `.ics` calendar.

## Functional requirements

- Static HTML app with no framework, paid service or build step.
- Netlify-ready configuration, installable web-app metadata and offline app-shell caching.
- Works without a server after fonts have loaded once; core features do not depend on APIs.
- Multi-campaign localStorage records with silent migration from the version 5 single-campaign record.
- IndexedDB image persistence with per-campaign bag and mood-image blobs.
- Canvas template, format, bag scale/position and text position persist per campaign.
- Input changes update previews and generated copy predictably.
- Generated copy is editable and preserved until explicitly regenerated.
- Copy buttons use Clipboard API with a fallback.
- Campaign ZIP export renders channel visuals, includes all copy and production notes, and uses a deterministic file name.
- Reset affects only the active campaign and requires confirmation.
- Respect reduced-motion preferences and keyboard focus.
- No fake scarcity, fabricated authentication facts or unverified claims.

## Copy system

Copy is assembled from verified user-entered facts. Empty facts are omitted rather than guessed. Platform outputs share the same facts but differ in shape:

- Instagram earns saves through a catalog-note structure.
- TikTok earns retention through visual sequencing and an immediate on-screen fact.
- Telegram favors utility and direct acquisition information.
- Threads invites collector conversation with one defensible question.
- X compresses the archive record into a clean two-part thread.

The generator should avoid generic claims such as premium, exquisite, must-have, investment piece, guaranteed appreciation, or "gone by tonight." Hashtags should be limited and relevant.

## Visual design

- Wider responsive shell on desktop while retaining a single-column mobile mode.
- Cream background, paper cards, charcoal text, bronze accent, hairline borders.
- Bodoni Moda for internal-tool editorial display and Hanken Grotesk for controls.
- Exported canvas work uses the canonical Cormorant Garamond, cream, sand, charcoal and bronze tokens from `DESIGN.md`.
- Zero-radius functional controls and cards.
- Small uppercase labels, generous section spacing, minimal shadows.
- Sticky campaign action bar on mobile for Generate Pack and Export Pack.

## Verification checklist

- Existing 12 templates still render in feed and vertical formats.
- Image uploads, dragging, safe guide, sold stamp and PNG generation still work.
- Uploaded images and canvas positions survive reload and campaign switching.
- New, open, duplicate, rename, delete and per-campaign reset flows work.
- All campaign inputs generate sensible copy even when optional fields are blank.
- All five copy buttons work and per-post character limits update after manual edits.
- Ready toggles update progress and survive reload.
- Schedule and posted state survive reload and use the chosen campaign date.
- ZIP pack includes the brief, channel visuals and copy, TikTok shot list/voiceover and schedule.
- Copy-only and `.ics` exports work without a server.
- Reset restores intentional defaults.
- Layout is usable at 375px and at desktop widths.
- Canvas and template selection are operable with a keyboard.
- No console errors on first load or after reset.

## Delivery scope

The production entry is `index.html`. Styles live in `css/studio.css`; application, state, facts, copy, media, export and canvas concerns are ES modules under `js/`; each visual treatment is one module under `js/templates/`. The bundle remains static, no-build and Netlify-ready. Keep `DESIGN.md` and `PRODUCT.md` as the brand source of truth and this file as the product/build rationale for future iterations.

## Acceptance rerun - 2026-07-16

Status: all verification-checklist items pass in RBC Studio 6.0.3. The rerun found and repaired one narrow regression: final PNG previews were generated correctly, but the visible Save PNG link did not receive the generated data URL after the application was modularized. `js/canvas.js` now assigns both a deterministic filename and the generated PNG URL. Patch versions invalidate the installed app-shell cache so existing phone installations receive corrections.

### Vertical treatment review - 2026-07-16

The complete 9:16 family was visually re-rendered and reviewed with representative product and mood imagery. Editorial now preserves the cream/image split and typographic hierarchy shown in its feed proof. Collage, Gazette, Snapshot, Specimen, Poet, Runway, Dossier and Vitrine use dedicated vertical compositions rather than stretched feed layouts. Shared lot-card placement, SOLD placement and template-specific supporting copy were rebalanced around the vertical safe band, with only non-critical atmosphere extending into interface zones.

The proof strip is format-aware in 6.0.3: choosing Reel / Story rerenders all 12 thumbnails through their actual 9:16 functions and changes the thumbnail proportions to 9:16. The retired `rbc-studio_4.html` path redirects to the production entry so stale local bookmarks and Netlify URLs cannot silently display the old single-file renderer.

Verification evidence:

- `node tests/unit.mjs` passes copy, grapheme validation, ZIP, calendar and campaign-store checks.
- `node tests/browser-e2e.cjs` passes the complete workflow in headless Microsoft Edge with no uncaught browser exceptions.
- The browser run covers all 12 treatments in feed and vertical formats, file upload, pointer and keyboard canvas movement, guide and sold overlays, PNG generation and save-link wiring, campaign CRUD/reset, image and canvas restoration across campaign switching and reload, optional blank facts, all five copy actions, validation, ready/schedule/posted persistence, ZIP/copy/calendar downloads, mobile/desktop overflow and AI-off behavior.
- Static verification passes for all 33 JavaScript files, the web manifest, 89 unique HTML IDs and all 36 offline app-shell routes.

### Further action gates

1. Deploy this exact static bundle to Netlify and perform one real-phone smoke test: update/install the PWA, reload offline, reopen a saved campaign, generate a PNG, ZIP and calendar file, and confirm the phone's share/save destinations receive them.
2. Run three real archive campaigns through the app. Record which generated lines are edited, which fields are repeatedly left blank and which export is used on posting day. Use that evidence for the next copy or workflow iteration.
3. Keep direct social publishing outside the static 6.0 scope. Adding Instagram, TikTok, Telegram, Threads or X publishing requires platform-specific OAuth, permissions and secure token storage; it should only be planned as a backend-backed release after the local-first workflow is proven.
