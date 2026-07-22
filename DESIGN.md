# RareBagClub — Design System

## Typography

| Role | Font | Weight | Size (desktop) | Size (mobile) | Notes |
|---|---|---|---|---|---|
| Display / Heading | Cormorant Garamond | 300–400 | clamp(3rem, 8vw, 6rem) | clamp(2.5rem, 11vw, 4rem) | No optical size axis; use wght 300 for lighter display, 400 default |
| Section heading | Cormorant Garamond | 400 | clamp(2.5rem, 4vw, 3.5rem) | clamp(1.75rem, 9vw, 2.75rem) | |
| Sub-heading / pull quote | Cormorant Garamond | 400 italic | clamp(2rem, 3.5vw, 3rem) | clamp(2rem, 9vw, 2.75rem) | Italic for accent second lines |
| UI / Body | Hanken Grotesk | 400–600 | 20px | 16px–20px | |
| Eyebrow / Label | Hanken Grotesk | 600–700 | 12px | 12px | Letter-spacing 0.14em–0.18em, uppercase |
| Price | Hanken Grotesk | 600 | 20px | 20px | |
| CTA button | Hanken Grotesk | 700 | 12px | 12px | Letter-spacing 0.15em–0.20em, uppercase |

**All font sizes must be divisible by 4.**

Google Fonts CDN. Preconnect + preload in `<head>`.

```
Cormorant Garamond: ital,wght@0,300;0,400;0,600;1,300;1,400;1,600
Hanken Grotesk: wght@400;600
```

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--rbc-cream` | #F5F1EC | Primary background, all page surfaces |
| `--rbc-sand` | #EBE7E1 | Card backgrounds, image containers, secondary surfaces |
| `--rbc-border` | #D6CFC7 | All borders, dividers, separators |
| `--rbc-mid-border` | #C4C7C7 | Lighter dividers |
| `--rbc-charcoal` | #2B2B2B | Primary text, primary buttons, announcement bar |
| `--rbc-bronze` | #755f42 | Accent color — availability dots, trust icons, urgency text, progress bar fill, CTA hover |
| `--rbc-bronze-dark` | #5a4832 | Bronze hover state |
| `--rbc-muted` | #444748 | Secondary text, mini labels |
| `--rbc-subtle` | #888580 | Tertiary text, sub-nav items |
| `--rbc-announcement` | #2B2B2B | Announcement bar background |

**Never use dark/black section backgrounds.** All section backgrounds must be #F5F1EC or #EBE7E1.

## Studio Tool Variant

RBC Studio is an internal campaign-production tool, not a customer-facing storefront. Its interface chrome may use the following documented variant while retaining the same archive character:

- UI background: `#F1ECE2`
- UI paper: `#FBF9F4`
- UI border: `#DED5C3`
- UI ink: `#26251F`
- UI display type: Bodoni Moda
- UI body type: Hanken Grotesk
- Interactive accent: the canonical accessible bronze, `#755f42`

This exception applies only to controls, panels, and navigation. Every exported canvas treatment must use the canonical customer-facing tokens: cream `#F5F1EC`, sand `#EBE7E1`, charcoal `#2B2B2B`, bronze `#755f42`, Cormorant Garamond, and Hanken Grotesk. Exported treatments must not use full dark section backgrounds.

## Spacing

4px base unit. All spacing divisible by 4.

Common values: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 128, 160, 192.

## Layout Grid

Desktop: 12-column, max-width 1440px, 64px side padding.
Tablet (≤1199px): 64px → 40px padding.
Mobile (≤767px): 40px → 20px padding, single column.

Product page: 7-col gallery + 5-col panel on desktop. Gallery: cols 1–7, Panel: cols 9–12.

## Border Radius

- Zero radius for: buttons, product images, tags, cart items. The archive does not round things.
- 24px for: image container cards in hero and philosophy sections (soft luxury exception).
- 9999px (pill) for: CTA buttons in hero section only, trust badges.

## Elevation / Shadow

Minimal. Only for: sticky ATC bar `box-shadow: 0 -2px 24px rgba(0,0,0,0.2)`. No card shadows.

## Motion

Entrance animations for marketing sections (hero, narrative, editorial band):
- Fade-up: `opacity 0 → 1`, `translateY(20px → 0)`, 600–850ms, `cubic-bezier(0.22, 1, 0.36, 1)`
- Scale-in for image containers: scale(1.04 → 1) + clip-path wipe
- Spring pop for badges: `cubic-bezier(0.34, 1.56, 0.64, 1)` 550ms
- Staggered delays: 80ms, 150ms, 280ms, 420ms, 560ms

UI transitions: 200–320ms ease. No spring on UI elements.

Always include `@media (prefers-reduced-motion: reduce)` guard: set animation:none, opacity:1.

## Component Patterns

### Buttons
Primary: `background #2B2B2B, color #F5F1EC, border-radius 0, padding 20px 32px, font-size 12px, letter-spacing 0.15em–0.20em, uppercase`
Hover: `background #1a1a1a`
Ghost: `background transparent, border 1px solid #2B2B2B, same padding`
Accent CTA: `background #755f42` (bronze — used in sticky ATC, cart checkout)

### Tags / Eyebrow Chips
`background #E6E2DD, font-size 12px, font-weight 600, letter-spacing 0.15em, uppercase, padding 4px 12px, border-radius 0`

### Trust Signals
Always use bronze (#755f42) stroke SVG icons at 12–13px. Display inline with icon + text, gap 5–8px. Font: Hanken Grotesk 11px, weight 500–600, letter-spacing 0.06em–0.12em.

### Urgency Strip
Border: `1px solid rgba(117, 95, 66, 0.22)`. Background: `rgba(117, 95, 66, 0.07)`. Text: bronze, 11px, uppercase, 700 weight.

### Availability Indicator
Dot: `6px × 6px, border-radius 9999px, background #755f42`. Text: "One Available", uppercase, 14px, letter-spacing 0.08em.

## Announcement Bar

Background #2B2B2B, text #F5F1EC, font-size 11px, font-weight 600, letter-spacing 0.14em, uppercase.

## Anti-Patterns

- No dark/black section backgrounds
- No em dashes (—) in copy or code comments
- No border-radius on product images, buttons, or tags (except hero pill CTAs)
- No fake urgency (stock = 1 is always real)
- No generic luxury adjectives in copy
- No `margin-bottom` inside flex/grid last-child without checking alignment
