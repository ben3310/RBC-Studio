# ADR 0006: Database schema scaffold and invariants at the data layer

Status: Accepted  
Date: 2026-07-22

## Context

Milestone 1 introduces the Supabase database (`CODEX_IMPLEMENTATION.md` §7).
Migrations must be authored and checked locally before any shared apply because
they become append-only afterward. Flagship policy, literal scarcity, rights,
tenant isolation, approvals, and audit integrity are too important to depend on
application code alone.

## Decision

1. **Local scaffold first; runtime apply gated.** The committed scaffold contains
   a secret-free `config.toml`, 12 ordered migrations, synthetic `seed.sql`, an
   offline validator, and a pgTAP smoke plan. Installing/running the CLI or
   container runtime and linking/applying a project require separate authority.

2. **Enums for stable taxonomies; text checks for workflow states.** Roles, asset
   kinds, rights classes, destination kinds, content types, CTA types, and actor
   types are enums. Lifecycle states remain text plus check constraints so a
   forward migration can evolve state machines without recreating shared types.

3. **Product invariants live in PostgreSQL.**
   - Flagship code/kind implies manual-only and approval-required.
   - A trigger prevents weakening or deleting an existing flagship.
   - A publish-job trigger rejects flagship/manual-only, stale, unapproved, or
     relationship-mismatched content.
   - Fixed price requires a positive minor-unit amount and currency; POA forbids
     an amount.
   - Audit rows are append-only.
   - Synthetic media requires a non-empty disclosure.
   - Source binary rows cannot be edited in place.
   - Approvals bind the authenticated reviewer and final content fingerprints.

4. **Tenant identity travels with every relationship.** Child/parent foreign keys
   include `organization_id`. Join tables without that column compare both
   parents in a trigger. An opaque UUID alone is never tenant proof.

5. **RLS is forced and role-specific.** Analysts cannot read original asset rows
   or private storage. Account rows containing token references are owner-only
   until a restricted projection exists. Operational write paths remain
   service/RPC-only.

6. **Privileged paths start inert.** Every `SECURITY DEFINER` upload/worker RPC
   pins an empty `search_path` and revokes PostgreSQL's default PUBLIC execute
   grant. The first authorized runtime must add explicit narrow grants.

7. **Contracts cannot silently drift.** The offline validator compares approval
   and publish-state checks with the versioned JSON schemas.

## Consequences

- Static CI catches ordering, structure, contract, tenant, RLS, storage, and
  privilege regressions before a database exists.
- The first local reset is still mandatory: static parsing cannot prove
  PostgreSQL syntax, trigger execution, RLS behavior, or Storage catalog behavior.
- Local pgTAP smoke tests are committed but intentionally unexecuted until CLI
  and container authorization.
- Any repair is allowed while the scaffold is explicitly NOT APPLIED. After a
  shared apply, repairs must be forward migrations.
- Enum growth is simple; enum removal is intentionally harder because these enum
  sets are treated as stable taxonomies.

