# Copy register spec — the voice offsets each account speaks in

Executable companion to `CLAUDE_PLAN.md` §7 and `CODEX_IMPLEMENTATION.md` §14.
The copy service is a single source of truth: the same fact object (`campaignFacts`
in `js/facts.js`) is transposed into per-surface registers. **The lint is universal**
— every register passes `lintGenerated` (no em dashes, no exclamation points, no
banned words, literal scarcity only). A register changes *tone and structure*, never
the facts and never the scarcity doctrine.

## The three registers

| Register | Used by | Job | Sentence shape | Never |
|---|---|---|---|---|
| `archive` (flagship) | @rarebagclub | convert | hook → record → FOMO → first-refusal CTA | educational lecturing; two CTAs |
| `education` | archive-education satellite | earn saves | claim → checklist → "study more →" | selling; price talk unless asked |
| `aesthetic` | quiet-luxury satellite | earn follows/mood | one line, mostly negative space | facts dump; hashtag walls |

The `archive` register already ships (the current five-channel generators). The two
satellite registers are the new work. They consume the same `facts` object plus a
`register` argument.

## `education` register — the save engine

- **Line 1 is a claim or a question**, never a catalog note. Draws from the
  `comments`/`saves` signal hook banks: "name the maison. no googling.", "the detail
  that dates this piece.", "what collectors check before they pay."
- **Body is a numbered micro-checklist** built from the fact object: hardware →
  corners → interior → stamp → provenance. Each line is one verifiable check derived
  from `facts.detail`, `facts.material`, `facts.auth`, `facts.provenance`. Absent
  facts are omitted (never invented — the factory doctrine).
- **Last line is the single funnel action**: "study pieces with full records →
  @rarebagclub". Exactly one CTA. Never a price, never a DM ask (this account does
  not sell).
- **Format**: carousel-first (each check = one slide). The factory renders these from
  the existing templates using the detail-crop cutouts.
- **Hashtags**: education tier only (`#vintagefashion #authenticationtips
  #bagcollector`), no niche maison leak on teaser-style posts.

Example (Dior, Galliano, hardware detail):
```
five things that date a galliano-era saddle before you pay.

1 the hardware finish. era-correct pieces wear warm, not mirror-bright.
2 the stitch count at the corner. period construction is denser than you expect.
3 the interior stamp. read it against the year, not the logo.
4 the strap hardware. it should match the era, not the trend.
5 the provenance line. galliano era, c. 2003, documented.

study pieces with full records → @rarebagclub
```

## `aesthetic` register — the mood engine

- **One line, maybe two.** The image does the work; the copy is a caption, not an
  essay. Draws from the `aspiration` hook bank and the opener bank register:
  "quiet room, loud entrance.", "old object, current wardrobe."
- **No facts, no price, no checklist.** If a bag appears, it is one tile among mood
  tiles; the caption never sells it.
- **Soft funnel, occasional**: at most one in four posts adds "the piece in tile 3 is
  in the archive → @rarebagclub". The rest carry only a follow implied by consistency.
- **Format**: moodboard grids and palette-transition reels, composed by the factory
  from the owned/licensed/generated tile pools (never scraped).
- **Hashtags**: aesthetic tier (`#quietluxury #oldmoneyaesthetic #vintagestyle`),
  five max.

## Persona register

The AI persona (`persona-bible.md`) speaks the `archive` register when a real piece
appears (identical scarcity doctrine) and the `aesthetic` register for lore/mood
posts. It always carries the disclosure string — enforced at the data layer
(`app_content_items.synthetic_media = true` requires `disclosure_text`).

## Implementation notes for the copy service (§14)

- Add `register` to the copy maker signature; default `archive` preserves current
  output byte-for-byte (regression-safe).
- Register transposition may use AI polish (`js/ai.js`) with a register-specific
  system-prompt suffix, but the **deterministic bank output is always the fallback**,
  so the factory runs with zero network and zero key.
- Every generated line stores its `{register, bank, variant}` lineage so the
  cross-account leaderboard (GROWTH_PLAN P1) can rank lines per register — satellites
  are the lab, the flagship inherits only proven lines.
