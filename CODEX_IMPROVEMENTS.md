# RBC Studio — Big Improvement Plan (Codex Prompts)

Review date: 2026-07-16. Target: `rbc-studio_4.html` (1,901 lines, single-file app), `sw.js`, `manifest.webmanifest`, `netlify.toml`, `_redirects`.

## State of the app (honest review)

**Strong:** The core is genuinely good. 12 feed + 12 reel canvas treatments, drag positioning, safe zones, PNG export, a fact-driven five-channel copy system that refuses to invent claims, localStorage autosave, offline PWA shell. The brand discipline (no fake urgency, facts over adjectives) is enforced in code, not just docs.

**Weak spots, biggest first:**

1. **Single campaign, ephemeral work.** One `STORAGE_KEY`, images lost on reload. A social lead can't work on two drops or come back to yesterday's campaign. This is the biggest product ceiling.
2. **Copy variety is shallow.** `leadLine()` has 3 variants per angle; collectors following the account will see repetition within a month. No AI option either.
3. **Export is text-only.** The "posting pack" doesn't include the visuals — the user must manually generate each PNG per format per channel. The product promise is "complete posting pack"; it isn't complete.
4. **Character counts don't validate.** Counts are shown but never compared to real platform limits; X counts the combined two-post string, not each post against 280.
5. **Brand drift.** The app uses `--cream:#F1ECE2`, `--gold:#A8895C`, Bodoni Moda. `DESIGN.md` (declared source of truth) says `#F5F1EC`, bronze `#755f42`, Cormorant Garamond. `BUILD_PLAN.md` contradicts `DESIGN.md` on the display font. Pick one truth.
6. **Maintainability ceiling.** ~1,450 lines of JS in one `<script>` tag; the 24 template functions share huge amounts of duplicated banner/mast/tag code. Adding template #13 is painful.
7. **Accessibility gaps.** `user-scalable=no` in the viewport meta (blocks pinch zoom — WCAG violation), canvas drag is pointer-only, clipboard fallback (`document.execCommand('copy')` without a selection) is a no-op.
8. **Housekeeping.** Entry file is `rbc-studio_4.html` instead of `index.html` (papered over by `_redirects`); SW cache name must be bumped manually per deploy.

---

## Codex prompts, in recommended order

Each prompt is self-contained. Constraints that apply to ALL of them:

> Global constraints: This is a static, local-first, no-build, no-framework app. Everything ships as plain HTML/CSS/JS deployable on Netlify free tier. No paid APIs required for core features. Follow the brand rules in DESIGN.md and PRODUCT.md: no fake urgency, no generic luxury adjectives, no dark section backgrounds, no em dashes in copy, zero-radius controls, cream/bronze palette. Preserve every existing feature listed in the BUILD_PLAN.md verification checklist and verify against it before finishing. No console errors on load or after reset.

### Prompt 1 — Refactor into modules + rename to index.html (do this first, everything else builds on it)

```
In the RBC Studio repo, refactor the single-file app rbc-studio_4.html into a
maintainable no-build structure without changing any behavior:

1. Rename rbc-studio_4.html to index.html. Update sw.js APP_SHELL, the _redirects
   file, and netlify.toml accordingly. Remove the now-unneeded redirect if the
   entry is index.html.
2. Extract CSS into css/studio.css. Extract JS into ES modules under js/:
   - js/state.js (persistence, STORAGE_KEY, save/restore/reset)
   - js/facts.js (campaignFacts, present/sentence/clip helpers)
   - js/copy/*.js (one module per platform: instagram, tiktok, telegram, threads, x)
   - js/templates/*.js (canvas treatments; see step 3)
   - js/canvas.js (stage, drag, format switching, export)
   - js/app.js (wiring, event listeners)
   Load with <script type="module">.
3. De-duplicate the 24 template functions (tCollage..tDossier, rCollage..rDossier).
   Extract the shared primitives (banner, mark, lotNo, sold, gridTag, cover,
   blurCover, wrapLines, reelMast, atmosphere, polaroidFrame, tape) into
   js/templates/primitives.js. Convert each template into a declarative entry in a
   TEMPLATES registry: { id, label, feed(ctx, env), reel(ctx, env) } where env
   carries images, facts, accent, format insets. Adding a new template must
   require only one new file plus one registry entry.
4. Bump the service worker CACHE_NAME and add the new css/js files to APP_SHELL.
5. Verify pixel-identical output: before refactoring, export a PNG from at least
   3 templates in both feed and reel formats; after, export the same and compare.
   All items in BUILD_PLAN.md "Verification checklist" must still pass.
```

### Prompt 2 — Campaign Library (multi-campaign, the biggest product unlock)

```
Add a campaign library to RBC Studio so a user can manage multiple campaigns
instead of one implicit campaign:

1. Replace the single localStorage STORAGE_KEY blob with a library model:
   an index of campaigns (id, title, piece name, archive no., created/updated
   timestamps, readiness summary like "3/5 ready") plus one record per campaign.
   Migrate any existing saved campaign into the library on first load, silently.
2. Add a "Campaigns" entry point in the header: a panel listing all campaigns
   with piece name, archive number, date, readiness meter, and last-edited time.
   Actions per campaign: open, duplicate (as a starting point for the next drop),
   rename, delete (with confirm). "New campaign" starts from intentional defaults.
3. Autosave continues per-campaign with the existing debounce. The header save
   state shows which campaign is active.
4. Reset now means "reset this campaign", not "wipe everything".
5. Style per DESIGN.md: paper cards, hairline borders, zero radius, uppercase
   labels, bronze accents. The list must work at 375px width.
6. Keep storage robust: wrap all localStorage access in try/catch, and if quota
   is exceeded, surface "Local save unavailable" as the app already does.
```

### Prompt 3 — Persist campaign images with IndexedDB

```
RBC Studio currently keeps uploaded images (bag photo + mood images) session-only;
a reload loses them. Fix this:

1. Store uploaded images per campaign in IndexedDB as Blobs (not dataURLs, not
   localStorage). Key by campaign id + slot (bag, mood[n]).
2. On campaign open, restore images and re-render the canvas exactly as before
   reload, including bag position/scale and text position (persist those in the
   campaign record too - currently bag/text drag positions are lost on reload).
3. Handle failures gracefully: if IndexedDB is unavailable (private browsing),
   fall back to current session-only behavior and show a small hint in the
   upload panel ("images will not survive reload in this browser").
4. Deleting a campaign deletes its images. Duplicating a campaign copies image
   references or blobs.
5. Downscale very large uploads (>3000px long edge) before storing to keep the
   DB small, but never upscale.
```

### Prompt 4 — Complete Posting Pack export (visuals + copy as a ZIP)

```
RBC Studio's "Export pack" currently produces a plain-text file only. Make it a
genuinely complete posting pack:

1. Add a "render all visuals" pipeline: for the currently selected template,
   render off-screen and collect PNGs for feed 4:5 (1080x1350), reel/story 9:16
   (1080x1920), and a TikTok cover frame (9:16 with the cover text the TikTok
   copy block specifies). Reuse the existing template registry; do not duplicate
   drawing code.
2. Add ZIP export with a small vendored zip writer (a single local, license-
   compatible JS file committed to the repo - no CDN, no build step; a minimal
   store-only ZIP implementation written in-repo is also acceptable since PNGs
   are already compressed). The pack contains:
   - campaign-brief.txt (objective, date, route, facts)
   - one folder per channel: copy.txt plus the right visual(s) for that channel
   - tiktok/shot-list.txt and tiktok/voiceover.txt as separate files
   - schedule.txt (the queue with chosen times)
   Deterministic file name: rbc-campaign-{archiveNo}-{YYYYMMDD}.zip.
3. Keep the existing single-PNG "Generate final image" flow untouched.
4. Show progress while rendering (5+ canvases) and never freeze the UI - yield
   between renders. Works on mobile Safari (test blob download path).
5. The existing text-only export remains available as "Export copy only".
```

### Prompt 5 — Platform-aware validation (counts that actually mean something)

```
Upgrade RBC Studio's character counters into real platform validation:

1. Add a limits table: Instagram caption 2,200; TikTok caption 2,200 (recommend
   <300 for retention, show as soft guidance); Telegram photo caption 1,024;
   Threads 500 per post; X 280 per post. Cite the limit in each channel-meta row.
2. Parse multi-post outputs: Threads (3 posts separated by the 1/3 2/3 3/3
   markers) and X (2 posts) must be counted PER POST, with each post's count
   shown and the worst offender highlighted. The current single combined count
   for X is misleading - fix it.
3. When over limit: bronze warning state on the counter and a one-line note
   ("post 2 is 312/280"). Never auto-truncate user edits; only the generator's
   clip() may shorten, and it must clip at word boundaries, not mid-word.
4. Counts must use grapheme-aware length (Intl.Segmenter when available) so
   emoji and the ellipsis character do not miscount.
5. Re-validate on every input event and after generation. Ready checkboxes show
   a subtle warning if a channel is marked ready while over limit (do not block).
```

### Prompt 6 — Copy engine depth + optional AI assist (local-first preserved)

```
Deepen RBC Studio's copy generation in two layers:

Layer 1 (deterministic, always available):
1. Expand each angle's lead-line bank in leadLine() from 3 to at least 10
   variants per angle (provenance, detail, styling, rarity), written strictly in
   the PRODUCT.md voice: lowercase poetic register, specificity over adjectives,
   no exclamation points, no banned words (premium, exquisite, must-have,
   investment piece, guaranteed, "gone by tonight"), no em dashes.
2. Add variant memory per campaign: remember which variant index each channel
   last used and rotate, so regenerating cycles through fresh combinations and
   the same session never shows the same lead twice in a row.
3. Add a lint pass over ALL generated output that flags banned words, em dashes,
   exclamation points, and double spaces; strip or replace before display.

Layer 2 (optional, off by default):
4. Add an "AI polish" option in the Channel Pack panel: user pastes their own
   Anthropic API key (stored only in localStorage, clearly labeled, with a
   remove button). When enabled, a per-channel "polish with AI" button sends the
   deterministic draft + the brand voice rules (embed a condensed excerpt of
   PRODUCT.md's voice section in the prompt) to the Messages API
   (claude-sonnet-5, anthropic-dangerous-direct-browser-access header for
   browser CORS) and replaces the draft with the polished result, editable as
   usual. Hard rules in the system prompt: never invent facts not present in the
   draft, never add urgency, keep platform shape.
5. Everything must degrade gracefully with no key: the app stays fully
   functional and no network calls are made. API errors show a quiet inline
   message, never an alert().
```

### Prompt 7 — Accessibility and input-quality pass

```
Fix RBC Studio's accessibility and input-handling debt:

1. Remove maximum-scale=1.0 and user-scalable=no from the viewport meta. Fix any
   layout that depended on suppressed zoom (use touch-action on the canvas to
   prevent scroll-while-dragging instead).
2. Canvas positioning: add keyboard nudging - when the stage is focused
   (tabindex=0, role=img with a live aria-label describing the template and
   format), arrow keys move the active drag target (bag or text) by 1%, shift+
   arrows by 5%. Announce mode changes via an aria-live region.
3. Fix the clipboard fallback: document.execCommand('copy') without a selected
   range does nothing. Fallback path must create a temporary textarea, select,
   copy, remove. Show "Copied" confirmation on the button in both paths.
4. Full keyboard audit: every control reachable and operable by keyboard,
   visible focus styles consistent with the bronze/ink palette, template picker
   and platform tabs operable with arrow keys (roving tabindex), ready
   checkboxes properly labeled.
5. Honor prefers-reduced-motion for any animation/transition.
6. Color-contrast check on --soft (#6B6759) and --gold (#A8895C) text on cream/
   paper backgrounds; darken tokens where they fail WCAG AA for their size.
7. Verify at 375px and desktop; no horizontal scroll; no console errors.
```

### Prompt 8 — Brand reconciliation + PWA/deploy hygiene

```
Two cleanups for RBC Studio:

A. Brand token reconciliation. DESIGN.md is the declared source of truth but the
app drifted: app uses cream #F1ECE2 / gold #A8895C / Bodoni Moda; DESIGN.md says
cream #F5F1EC / bronze #755f42 / Cormorant Garamond; BUILD_PLAN.md says Bodoni
Moda. First, update DESIGN.md to record the studio-app palette as an explicit
"internal tool" variant OR migrate the app tokens to DESIGN.md values - decide by
this rule: customer-facing visual OUTPUT (the canvas templates) must follow
DESIGN.md exactly; the internal tool chrome may keep its current palette but must
document it in DESIGN.md under a "Studio tool" section. Audit every canvas
template for palette and font compliance and fix drift in the rendered output.

B. Deploy hygiene:
1. Derive the SW CACHE_NAME from a single APP_VERSION constant surfaced in the
   header version tag, so bumping one string invalidates the cache and updates
   the visible version.
2. Add an update flow: when a new SW is waiting, show a quiet "new version
   available - refresh" pill; clicking it triggers skipWaiting + reload.
3. Cache Google Fonts stylesheets and woff2 files with a cache-first strategy in
   the SW so the app is truly offline after first load (current network-first
   re-fetches fonts).
4. Replace the huge base64 apple-touch-icon in the HTML head with a real
   apple-touch-icon.png file (180x180, generated from icon.svg), added to
   APP_SHELL.
5. netlify.toml: add sensible security headers (X-Content-Type-Options,
   Referrer-Policy) and cache headers (immutable for versioned assets, no-cache
   for index.html and sw.js).
```

### Prompt 9 (stretch) — Publishing queue that connects to the real world

```
Make RBC Studio's publishing queue actionable instead of decorative:

1. Export the schedule as an .ics calendar file (one VEVENT per channel using
   campaign date + chosen time, alarm 15 minutes before, description containing
   the first 200 chars of that channel's copy). Pure client-side Blob download.
2. Add a "posting day" mode: on the campaign date, the queue sorts by time and
   each row gains a one-tap flow - tap the row to copy that channel's text and
   mark it Posted (new status after Draft/Ready). Progress meter counts Posted.
3. Persist posted state per campaign; a fully posted campaign shows a quiet
   "campaign complete" state and is labeled in the campaign library.
4. Times remain editable; no notifications API, no server, no promises of
   algorithmic performance in the copy (per BUILD_PLAN.md).
```

---

## Suggested sequencing

| Phase | Prompts | Why this order |
|---|---|---|
| 1 | 1 | Refactor first; every other change gets cheaper and safer. |
| 2 | 2 + 3 | Campaign library + image persistence together = the product stops losing work. Biggest user-visible leap. |
| 3 | 4 + 5 | Complete ZIP pack + real validation = the export promise finally true. |
| 4 | 6 | Copy depth + optional AI. |
| 5 | 7 + 8 | A11y, brand truth, deploy hygiene. |
| 6 | 9 | Stretch. |

After each phase, run the BUILD_PLAN.md verification checklist end-to-end before starting the next.
