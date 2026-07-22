# ADR 0006: Database schema scaffold and invariants at the data layer

Status: Accepted
Date: 2026-07-22

## Context

Milestone 1 introduces the Supabase database (`CODEX_IMPLEMENTATION.md` §7). The
schema must be authored locally and verifiable in CI before any shared apply,
because migrations become append-only once applied. Several product invariants
(flagship stays manual, scarcity claims stay literal, audit is tamper-evident,
rights are inspectable) are too important to leave to application code alone.

## Decision

1. **Local scaffold first, apply gated.** All 12 migrations live under
   `infra/supabase/migrations/` and are validated offline by
   `scripts/verify-migrations.mjs`. Applying them requires operator authorization
   (staging project, region, secrets, CLI link) per §28. Nothing here connects to
   a database or the PWA.

2. **Enums for stable taxonomies, text+check for workflow states.** Roles, asset
   kinds, rights classes, destination kinds, content types, CTA types, and actor
   types are Postgres enums (bounded, stable; grow with `ALTER TYPE ADD VALUE`).
   Lifecycle states (piece/campaign/content/job/publish) are `text` + `check`
   constraints, because a state machine is more likely to need a value removed or
   reordered, which a forward migration can do by swapping the constraint without
   recreating a type used across columns.

3. **Invariants enforced in the database, not only in `policy-core`.**
   - Flagship: a check constraint plus a `protect_flagship` guard trigger make it
     impossible to create or weaken a flagship destination into an
     auto-publishable one. This mirrors ADR 0005 at the storage layer.
   - Literal scarcity / POA: `app_pieces` check constraints require an amount for
     fixed prices and forbid one for price-on-request.
   - Audit: `app_audit_events` has update/delete guard triggers; append-only.
   - AI disclosure: `synthetic_media` content must carry `disclosure_text`.
   - Immutable binaries: `app_source_assets` has no `updated_at`/`version`;
     changed bytes create a new row, and the storage key embeds the content hash.

4. **RLS forced on every tenant table.** Policies key off `app.is_member` /
   `app.has_role` against `app_organization_members`. Join tables without their
   own `organization_id` (`app_asset_attributes`, `app_content_item_assets`) are
   gated through their parent row. Service roles and token-column isolation are
   applied at the gated apply step because they depend on the live project.

## Consequences

- Schema regressions are caught in CI offline (`npm run verify:migrations`),
  before any irreversible apply.
- The flagship, scarcity, audit, and disclosure guarantees survive an application
  bug or a direct SQL client, not just the happy path.
- The offline validator checks structure and text invariants, not runtime RLS
  behavior; the §7.4 negative-case tests still run against the applied database
  and are the gate before real data enters.
- Enum growth is easy; enum value removal is not — accepted, because the enum sets
  chosen are genuinely stable taxonomies.
