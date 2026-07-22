# RBC Content Factory — Master Strategy PRD (for Claude Sonnet)

Version 1.0 · 2026-07-18 · Owner: RareBagClub
Companions: `GROWTH_PLAN.md` (studio app growth), `CODEX_IMPLEMENTATION.md` (canonical technical implementation plan), and `CODEXPLAN.md` (preserved working draft).
This is the business/strategy document. Codex executes `CODEX_IMPLEMENTATION.md`; Claude Sonnet reasons from this one.

Implementation status (2026-07-19): RBC Studio 6.12.1 ships the local-first factory core, 31-asset plan, rights ledger, governed routing/review, cutout adapter, Pinterest/blog handoff, approved-asset ZIP, shared policy/contracts, and local worker spine. See `CODEX_IMPLEMENTATION.md` for the exact shipped boundary, executable architecture, and next milestones.

Execution artifacts (2026-07-22): the strategy in §2/§6/§7 is now actionable in `docs/strategy/` — `satellite-briefs.md` (the three disclosed reach accounts, launch checklists, routing), `persona-bible.md` (the disclosed "archivist" identity/prompt/calendar system), and `register-spec.md` (the per-account voice offsets the copy service consumes). The Milestone 1 database scaffold (local, not-yet-applied) lives in `infra/supabase/` with an offline validator (`npm run verify:migrations`); applying it is gated on operator authorization per `CODEX_IMPLEMENTATION.md` §28.

---

## 0. Executive summary

RareBagClub (RBC) sells one-of-one authenticated vintage luxury bags to Big-5 collectors (US/EU/CA/AU/NZ). The bottleneck is no longer creative quality — RBC Studio produces strong assets — it is **throughput and reach**: manual background removal, manual posting, one account, one post per drop.

The play: build a **content factory** around the existing studio. One bag photograph enters; dozens of unique, on-brand assets exit, scheduled across platforms and a small fleet of themed satellite accounts, all funneling to the flagship where every sale still closes by hand.

Operating doctrine, non-negotiable:
1. **Flagship stays human.** Every post on the main account is manually approved. Automation feeds it drafts; it never posts there unattended.
2. **Satellites are owned media, not sock puppets.** A small number (3–5) of themed accounts we openly operate — "curated by rarebagclub" in bio — not a farm of disposable phone-verified burners. Burner farms get cluster-detected (device/IP/behavior graphs) and take the flagship down with them; the funnel becomes the fuse. Reach comes from volume-per-account and format-market fit, not account count.
3. **AI content is labeled.** The AI model persona is explicitly virtual (this is also what makes it *interesting* — see §6). Platforms now require AI disclosure; an exposed undisclosed persona would poison the flagship's authenticity story, which is the entire moat.
4. **All scarcity claims stay literal.** The factory inherits the studio's lint and banned-words doctrine everywhere, including satellites.

---

## 1. Business model & unit economics

- Inventory: one-of-one pieces, price band roughly USD 800–8,000. Gross margin assumed 30–50%.
- One incremental sale/month pays for the entire stack (target infra cost < USD 150/mo at phase 1–2; the RTX 3080 does the heavy lifting locally for free).
- The factory's economic job: raise **qualified DM enquiries per piece** and cut **operator hours per drop** from ~3–4h to <30min of pure curation/approval.
- North-star metric: **DM enquiries per listed piece per week**. Secondary: sell-through days, saves/reach on flagship, satellite→flagship follow conversion.

## 2. Brand architecture (hub and spokes)

```
                    ┌────────────────────────────┐
                    │  FLAGSHIP @rarebagclub      │  manual, premium,
                    │  the archive · sales close  │  every post approved
                    └──────────▲─────────────────┘
       follow/DM funnel        │         ▲
  ┌────────────┬───────────────┼─────────┴──────┬───────────────┐
  │ SATELLITE  │  SATELLITE    │   SATELLITE    │  AI MODEL     │
  │ archive/   │  quiet-luxury │   era/maison   │  persona      │
  │ education  │  aesthetic    │   deep-dives   │  (labeled AI) │
  └────────────┴───────────────┴────────────────┴───────────────┘
                 automated production, human-batched approval
```

### Flagship — @rarebagclub
- Positioning: the archive. Private-dealer gravity. Sales happen here and only here.
- Cadence: 3–4 posts/week (drop arcs per GROWTH_PLAN P3) + daily stories.
- Automation level: factory generates; human approves and posts. Zero unattended posting.

### Satellite 1 — Archive education (e.g. @thebagrecord)
- Positioning: "how to read a vintage bag." Authentication checklists, era guides, hardware close-ups, "name the maison" games.
- Why it works: education is the highest-save format in the collector niche; saves are the algorithm's strongest distribution signal, and the audience is *exactly* pre-qualified buyers.
- Content: carousel checklists, detail macros (factory-generated from bag cutouts), era timelines. 1–2/day, fully factory-produced, batch-approved weekly.
- Funnel: every carousel's last slide: "study pieces with full records → @rarebagclub". Bio link to flagship.

### Satellite 2 — Quiet-luxury aesthetic (e.g. @creamandbronze)
- Positioning: moodboard account. Palettes, textures, interiors, styling — the RBC visual world without the shop.
- Content: factory-composed moodboards (licensed/owned imagery + bag cutouts as one tile among many), reels of palette transitions. 1–2/day.
- Funnel: soft. Tagged flagship on bag tiles; occasional "the piece in tile 3 is in the archive."
- Also the natural Pinterest powerhouse (see §4 Pinterest).

### Satellite 3 — Era/maison deep-dives (e.g. @gallianoyears)
- Positioning: single-era or single-maison fandom. Highest niche density; comment-heavy audience.
- Content: archival-style facts + our pieces of that era when available. 3–4/week.
- Funnel: when a matching piece drops, this account gets the tease act a day early — genuine "insiders see it first" mechanics, all true.

### AI model persona — see §6.

Rules for all satellites: bios state "curated by @rarebagclub"; distinct handles, distinct visual seasoning (the factory's variant engine gives each a palette/typography offset so grids don't look cloned); registered/managed under the business's real identity through official APIs or a self-hosted scheduler — no phone-number burner provisioning, no device spoofing, no engagement pods. Scale reach by increasing per-account volume and format fit, not by adding accounts past ~5.

## 3. The content factory (what actually gets built)

One intake event ("piece photographed") fans out mechanically:

```
bag photos (raw)
  → auto background removal (local BiRefNet + matting refine; API fallback)   [CODEX_IMPLEMENTATION §10]
  → auto attribute extraction (color/leather/hardware/style/season/vibe)      [CODEX_IMPLEMENTATION §11]
  → cutout library: hero, detail crops (hardware/corners/interior), silhouette
  → aesthetic sourcing: palette-matched mood tiles from OWNED/LICENSED pool   [§5]
  → template composition: existing 12 RBC treatments ×2 formats, headless     [CODEX_IMPLEMENTATION §13]
      + variant engine: accent, crop, layout seed → N unique visuals
  → copy generation: existing facts.js banks headless + AI polish per surface
  → routing: flagship gets the best (human picks), satellites get the rest
  → scheduling: time-zone windows per GROWTH_PLAN P0 via self-hosted scheduler
  → approval queue: one screen, batch approve/reject, then auto-publish (satellites)
  → analytics ingest → hook/template leaderboard → informs next generation
```

Target: 1 bag → 25–40 unique publishable assets (1 flagship arc + carousels + satellite variants + Pinterest pins + shorts) in <10 minutes of machine time, <20 minutes of human curation.

## 4. Platform playbook (formats, cadence, automation)

| Platform | Format | Caption style | CTA | Cadence | Automation |
|---|---|---|---|---|---|
| Instagram (flagship) | 9:16 reel + 4:5 grid, carousels | studio voice: hook→record→FOMO→CTA | DM to acquire · first refusal | 3–4/wk + daily story | draft-only; human posts |
| Instagram (satellites) | carousels, reels, detail macros | educational/aesthetic registers per account | follow flagship / save | 1–2/day each | full auto after batch approval |
| Pinterest | 2:3 (1000×1500) pins, idea pins | keyword-rich descriptive (Pinterest is a search engine, write for search: "vintage dior saddle bag 2003 galliano era") | outbound link → site/linkinbio | 5–15 pins/day (Pinterest rewards volume) | full auto via API; biggest untapped channel for this niche — pins compound for years |
| TikTok | 9:16 12–18s, factory-assembled slideshows from stills | on-screen hook + short caption ≤150 chars | comment/DM · profile link | 1/day satellite, 2–3/wk flagship | slideshow export auto; posting via Content Posting API after approval |
| Facebook | crosspost IG grid + Marketplace-free zone; FB groups manual | same as IG, slightly fuller sentences | DM / site | 3/wk (crosspost) | auto crosspost via Graph API |
| Threads | 3-post text arcs (existing generator) | conversational collector questions | reply → profile | 1/day | auto |
| X | 2-post record threads (existing generator) | compressed record | link | 3–5/wk | auto |
| Lemon8 | 3:4 editorial cards, listicle overlay style | "5 things to check before buying vintage" | save + follow | 3/wk | no public API — export pack + phone-batch manual (20 min/wk); treat as bonus, not core |
| Rednote/Xiaohongshu | 3:4 cards, zh-EN mixed | authenticity/education angle | profile | optional | manual only; separate market strategy — park unless CN demand appears |
| Blog (site) | long-form archive records, 1 per piece | the full record as an article (SEO: "maison + model + year") | enquire form | 1/piece | fully auto from facts JSON → static page |
| Google Business | photo + drop announcement | short record | site link | 1/piece | auto via API |
| Email newsletter | "the record opens" — 1 hero piece + 2 recent + 1 sold story | studio voice, personal | reply-to-acquire (reply beats click for 1-of-1) | weekly, fixed day | auto-drafted, human sends |

Priority order for build: Pinterest + Blog (compounding search assets, fully automatable, zero platform risk) → IG satellites → TikTok slideshows → Threads/X → the rest.

## 5. Aesthetic sourcing — the Pinterest question, answered properly

Scraping Pinterest images into posts is the tempting shortcut and the wrong move: it's copyright infringement of photographers' work, violates Pinterest ToS, and puts reused-content strikes on exactly the accounts we need alive. The factory gets the same *look* from sources we control:

1. **Owned pool (primary).** Every bag shoot adds texture/detail shots. Plus one deliberate quarterly "atmosphere shoot" (interiors, fabrics, marble, paper, patina) → hundreds of tiles.
2. **Licensed pool.** Unsplash+/Pexels/commercial stock, downloaded via API with license records stored per asset (`assets.license` in the DB). Cheap, automatable, safe.
3. **Generated pool.** Local SDXL/Flux on the 3080 generates abstract atmosphere tiles (silk, stone, light studies — no logos, no products, no people) tagged by palette. Effectively infinite, on-palette by construction.
4. **Pinterest as compass, not warehouse.** Automated *trend reading* (what palettes/compositions trend in "quiet luxury") is fine; the pixels we publish come from pools 1–3. The attribute extractor matches bag palette → nearest pool tiles → mood slots in the existing templates.

## 6. AI model persona — do it as theater, not deception

The commodity version (pretend-human "AI girl" luring follows) is saturated, high-risk, and would contaminate RBC's authenticity story if linked. The differentiated version is **an openly virtual archive muse**:

- **Identity:** a named, stylized character — "the archivist" — bio: "virtual muse of @rarebagclub · pieces are real, i am not." The honesty is the hook; nobody else in the vintage space does a *disclosed* virtual character with real inventory.
- **Visual system:** one locked character design (LoRA trained on a consistent generated identity; ~30 curated seed images), fixed wardrobe language (cream/charcoal/bronze — the brand palette worn as clothing), fixed environments (the archive room, the vault, the desk). Consistency = a recognizable character, not a random pretty face per post.
- **Content calendar:** 4 pillars — (a) "from the desk" stills with a real bag composited (the piece is always the real photograph, never generated — generated product images would be misrepresentation of goods); (b) archive lore/voiceover reels; (c) era styling essays; (d) drop-day appearances holding the tease.
- **Compliance/risks:** label as AI-generated in bio and platform toggles; never generate a real person's likeness; never let the persona state product facts that aren't operator-entered (same facts doctrine); watch platform policy drift quarterly. Sustainability: the character is an owned IP asset — it can outlive any single account.
- **Funnel:** every appearance with a piece tags the flagship; stories link the record.

## 7. Copy strategy at factory scale

- The studio's banks (`js/facts.js`) become the **shared copy service** — one source of truth consumed headlessly by the factory (`CODEX_IMPLEMENTATION.md` §14). Satellites get register offsets (education register, aesthetic register) layered on the same fact objects; the lint (banned words, no em dashes, literal scarcity) applies to every account with zero exceptions.
- AI (Claude Sonnet) is used for: register transposition per satellite, Pinterest SEO descriptions, blog long-form expansion of the record, newsletter drafting, alt text. Always constrained: facts in, no facts invented, brand system prompt from `js/ai.js` extended per surface.
- A/B mechanics: every generated caption stores its hook/bank lineage; the leaderboard (GROWTH_PLAN P1) becomes cross-account, so satellites act as the testing ground and the flagship inherits only proven lines. **This is the strategic reason satellites exist: they are the lab; the flagship is the gallery.**

## 8. Funnel design

```
Pinterest pin (search, evergreen) ─┐
Satellite save/follow ─────────────┼→ flagship follow → story views → drop arc
TikTok slideshow comment ──────────┘        │
Blog record (Google) ──────────→ enquiry form│
                                            ▼
                              DM (closer kit, GROWTH_PLAN P2)
                                            ▼
                             sale → sold story → feeds satellites + newsletter
```

- Every satellite asset carries exactly one funnel action (follow flagship OR save) — never two CTAs.
- Flagship bio: single link → self-hosted link page (part of the blog site, not Linktree — keep the data).
- Newsletter capture: "the record, weekly" — offered in blog records and flagship stories; email list is the only audience asset no platform can take away.

## 9. Phased roadmap

| Phase | Weeks | Ships | Success gate |
|---|---|---|---|
| 1 · Cutout factory | 1–2 | local bg removal + attribute extraction + cutout library (`CODEX_IMPLEMENTATION.md` §10–11) | 95% of bags need zero manual masking; <60s/bag |
| 2 · Headless studio | 3–4 | templates render server-side; variant engine; copy service extracted (`CODEX_IMPLEMENTATION.md` §13–14) | 1 bag → 25 assets, hands-off |
| 3 · Publish rail | 5–6 | self-hosted scheduler + Pinterest/IG/Threads/X APIs + approval queue (`CODEX_IMPLEMENTATION.md` §15–16) | 7 days of satellite content queued in one 30-min session |
| 4 · Satellites live | 7–8 | 2 satellites launched (education + aesthetic), blog auto-publishing | 14 days uninterrupted cadence |
| 5 · AI persona | 9–12 | character locked, LoRA trained, 30-day calendar | consistent identity across 20 posts; disclosure in place |
| 6 · Loop | 13+ | analytics ingest, cross-account leaderboard, proven-first generation | hook ranking demonstrably shifts flagship copy |

## 10. Success metrics (weekly dashboard)

- DM enquiries/listed piece (north star) · sell-through days · flagship follower Δ and % from satellites (ask in DM: "how did you find us") · saves rate on education carousels (>8% of reach = working) · Pinterest outbound clicks (compounding curve expected) · newsletter list Δ · operator hours/week (target <5) · factory cost/asset (target <USD 0.10).

## 11. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Platform action against automation | High | Official APIs only; self-hosted scheduler within rate limits; satellites disclosed as brand-operated; no burner provisioning, no scraping-based posting, human approval on everything public |
| AI persona backlash/policy shift | Medium | Disclosed-by-design; persona never sells directly; kill-switch: persona retires, flagship untouched |
| Copyright strikes from sourced imagery | Medium | Owned/licensed/generated pools only; license ledger per asset in DB |
| Cutout quality misses on hard pieces (chains, transparency) | Medium | Confidence scoring routes low-confidence masks to API fallback then manual queue; never auto-publish a bad cutout |
| Voice dilution across satellites | Medium | Single copy service + lint everywhere; register offsets are code, not vibes |
| Key-person dependency (operator) | Medium | Everything in the approval queue is skippable-but-resumable; runbooks in repo |
| Over-automation of flagship by drift | High | Hard rule in scheduler config: flagship destination has `autopublish: false` permanently |

## 12. What NOT to build (explicit anti-scope)

- Phone-verified disposable account farms, device/IP spoofing, engagement pods, follow/unfollow bots, comment bots — cluster detection ties these to the flagship; the expected value is strongly negative.
- Pinterest/Google image scraping into published posts — legal + strike risk; the three-pool system replaces it.
- Undisclosed AI persona pretending to be a human seller.
- Fully unattended posting to the flagship, ever.
- Generated imagery of the actual products (misrepresentation of one-of-one goods); the real photograph is sacred.
