# Persona bible — "the archivist"

Executable companion to `CLAUDE_PLAN.md` §6. The differentiated play is a **disclosed
virtual character**, not a fake human. The honesty is the hook: nobody in the vintage
space runs an openly virtual muse with real, one-of-one inventory. Disclosure is also
enforced at the data layer — `app_content_items.synthetic_media = true` requires a
`disclosure_text` (migration 05), so an undisclosed persona post cannot be stored.

## Identity

- **Name / handle.** "the archivist" — working handle @rbc.archivist.
- **Bio.** "virtual muse of @rarebagclub · pieces are real, i am not."
- **Premise.** She keeps the archive. She never sells; she *shows*. Sales always
  happen on the flagship, in DMs, by a human.
- **What she is not.** Not a real person's likeness (never generate one). Not a
  product photographer — the bags she appears with are always the **real
  photographs**, composited, never AI-generated (generating product imagery would
  misrepresent one-of-one goods; the real photo is sacred, CLAUDE_PLAN §12).

## Visual consistency system

- **Locked character design.** One identity trained as a LoRA on ~30 curated seed
  images (generated, consistent). Fixed face, hair, proportions. Regenerating gives
  the *same* character, not a new pretty face per post — consistency is the whole point.
- **Wardrobe language.** The brand palette worn as clothing: cream, charcoal, bronze.
  No logos, no other brands.
- **Environments.** Three fixed sets — the archive room, the vault, the desk. Warm
  light, film grain, shallow depth. Same lens language as the templates.
- **Model registry.** The LoRA + base model are recorded in `app_model_registry` with
  license and `commercial_use_allowed = true` before any production use (§7 / §8).
  No model becomes default without a license check.

## Prompt strategy

- **Base prompt skeleton** (kept in the persona config, versioned): identity LoRA
  token + wardrobe palette + one of the three environments + shot type + lighting.
- **Product composite pass.** The real bag cutout (from the cutout library) is
  composited into the scene; the persona is never generated *holding a generated bag*.
- **Negative prompts.** No other faces, no logos, no text artifacts, no other brands,
  no minors, no photorealistic real-person resemblance.
- **QA gate.** Every persona image passes the same cutout/QA confidence check as other
  media before it can enter the review queue; low confidence routes to manual.

## Content calendar (four pillars)

| Pillar | Cadence | Register | Funnel |
|---|---|---|---|
| From the desk (still with a real piece composited) | 3/wk | `archive` | tags flagship; story links the record |
| Archive lore / voiceover reels | 2/wk | `aesthetic` | follow implied |
| Era styling essays | 1/wk | `education` | "study the era → @rarebagclub" |
| Drop-day appearance holding the tease | per drop | `archive` (tease act) | tease → flagship reveal next day |

## Engagement strategy

- Replies stay in character, brief, never salesy, never claim a fact not in the piece
  record. The persona can say "the record is on the flagship," never invent price or
  provenance.
- No DMs from the persona account. All acquisition funnels to the flagship human DM.

## Risks and kill-switch

- **Policy drift.** Platform AI-labeling rules change; re-audit quarterly. The bio
  disclosure + platform AI toggles stay on always.
- **Backlash.** Because she is disclosed and never sells, the downside is contained.
  **Kill-switch:** the persona can be retired without touching the flagship — she is
  an owned IP asset with no funnel dependency the flagship can't survive.
- **Authenticity contamination — the real risk.** If the persona were ever taken for
  a real seller or the bags for AI-generated, the flagship's entire authenticity moat
  is damaged. Both guardrails (disclosed persona, real-photo-only products) exist to
  prevent exactly this. They are non-negotiable.

## Sustainability

The character is durable IP: a locked LoRA + prompt kit + this bible mean the persona
survives any single account, platform, or model generation. Retrain the LoRA on a new
base model when needed; the identity, wardrobe, and environments carry forward.
