# Satellite account briefs

Executable companion to `CLAUDE_PLAN.md` §2. These are the concrete launch specs for
the owned, disclosed satellite accounts. Every satellite bio states "curated by
@rarebagclub" — they are brand-operated reach accounts, not disposable burners
(see CLAUDE_PLAN §12 for why the burner pattern is anti-scope). Reach scales by
volume-per-account and format fit, not by adding accounts past ~5.

Each brief is the source of truth for: the `destinations` / `social_accounts` rows
(`CODEX_IMPLEMENTATION.md` §7), the register the copy service uses
(`register-spec.md`), and the routing rules (§16 publishing rail). All satellites are
`kind = 'satellite'`, `requires_approval = true`, `manual_only = false` (batch-approve
then auto-publish). Only the flagship is `manual_only`.

---

## Satellite 1 — Archive education · working handle @thebagrecord

- **Positioning.** "How to read a vintage bag." The pre-purchase research the
  collector does anyway, done for them. Authentication checklists, era guides,
  hardware macros, "name the maison" games.
- **Why it converts to the flagship.** Education is the highest-save format in the
  niche; saves are the strongest distribution signal; the audience that saves an
  authentication checklist is definitionally a pre-qualified buyer.
- **Register.** `education` (see register-spec).
- **Content mix (weekly).** 4 checklist carousels · 3 detail-macro reels · 2
  "name the maison" games · 1 era timeline. All factory-produced from the cutout
  library and detail crops; batch-approved in one weekly session.
- **Cadence.** 1–2/day, 7 days.
- **Funnel.** Every carousel's final slide: "study pieces with full records →
  @rarebagclub." One CTA only. Bio link → flagship.
- **Visual seasoning.** Same 12 templates; palette locked to the education variant
  (higher-contrast, checklist overlays enabled) so the grid is recognizably distinct
  from the flagship without leaving the system.
- **Launch checklist.** handle secured · bio + link · 9 seed posts queued (fills the
  grid before first follow) · disclosure not required (human-curated brand account).

## Satellite 2 — Quiet-luxury aesthetic · working handle @creamandbronze

- **Positioning.** The RBC visual world without the shop. Palettes, textures,
  interiors, styling. A moodboard people follow for the feeling.
- **Why it converts.** Builds the aspirational identity PRODUCT.md's secondary buyer
  wants; warms cold audiences the education account later qualifies.
- **Register.** `aesthetic`.
- **Content mix (weekly).** 5 moodboard grids · 4 palette-transition reels · 3
  texture/interior stills · 2 styling stills with a bag as one tile. Composed from
  the owned/licensed/generated tile pools — never scraped (CLAUDE_PLAN §5).
- **Cadence.** 1–2/day.
- **Funnel.** Soft. One-in-four posts: "the piece in tile 3 is in the archive →
  @rarebagclub." The rest earn the follow by consistency.
- **Also the Pinterest engine.** This account's tiles double as Pinterest pins
  (2:3, keyword-rich descriptions) — the single biggest untapped, compounding,
  zero-platform-risk channel for this niche.
- **Visual seasoning.** Aesthetic variant palette (softer, more negative space);
  lot-tag disabled; name/price suppressed on mood tiles.

## Satellite 3 — Era/maison deep-dive · working handle @gallianoyears (or per dominant inventory)

- **Positioning.** Single-era or single-maison fandom. Highest niche density, most
  comment-driven audience. Pick the era/maison your inventory actually skews to;
  spin up a second deep-dive only when inventory supports it.
- **Why it converts.** The most engaged, most specific collectors live in these
  fandoms; when a matching piece drops, this audience is the warmest possible.
- **Register.** `education` with a fandom tone (more lore, still checklist-backed).
- **Content mix.** 3–4/week: archival-style era facts, "spot the era" games, and our
  pieces of that era when available.
- **Cadence.** 3–4/week (lower volume, higher specificity).
- **Funnel + genuine insider mechanic.** When a matching piece drops, this account
  receives the **tease act one day early** (GROWTH_PLAN P3). "Insiders see it first"
  is then literally true — no fabricated exclusivity.

---

## Routing rules (feed the publishing rail, §16)

- The factory produces one flagship arc + N satellite variants per piece (target
  25–40 assets). The operator picks the flagship set by hand; everything else routes
  by register→destination:
  - checklist/detail/game → @thebagrecord
  - moodboard/texture/styling → @creamandbronze + Pinterest
  - era content (if the piece matches a live deep-dive) → @gallianoyears (tease early)
- No satellite asset carries two CTAs. Ever.
- No satellite auto-publishes without passing the batch-approval gate. The flagship
  never auto-publishes at all (enforced in `policy-core` and the DB, ADR 0005/0006).

## Anti-scope reminder (from CLAUDE_PLAN §12)

No phone-verified burner farms, no device/IP spoofing, no engagement pods, no
follow/unfollow bots. Cluster detection ties those to the flagship and the funnel
becomes the fuse. These three (optionally four) disclosed accounts are the ceiling.
