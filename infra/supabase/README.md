# Supabase scaffold (Milestone 1)

This directory is the **local, not-yet-applied** database scaffold for the RBC
Content Factory. It corresponds to `CODEX_IMPLEMENTATION.md` §7 and step 1 of the
§28 Milestone 1 work packet: *"Add local Supabase scaffold and migration-test
scripts without connecting the PWA."*

## Status: NOT APPLIED

Nothing here has been applied to any Supabase project. No secrets, no CLI link,
no PWA connection, no external calls have been made. The remote boundary in the
app remains default-off (`parseRemoteFactoryConfig` → `mode: 'local'`).

## What is verified offline

`npm run verify:migrations` parses the SQL text (no database connection) and
asserts the §7 invariants:

- all 12 migrations present, timestamp-prefixed, in the §7.1 order;
- all 20 required tables created;
- every tenant table is covered by the RLS enable/force migration;
- the flagship destination cannot be created or updated to be auto-publishable
  (`kind='flagship'` implies `manual_only` + `requires_approval`, plus a guard
  trigger that rejects weakening);
- POA/price doctrine encoded on `app_pieces` (a fixed price requires an amount;
  price-on-request forbids one);
- `app_audit_events` is append-only (update/delete guard trigger);
- required uniqueness (archive_no, idempotency_key, platform_post_id,
  metric observation, webhook replay);
- storage keys are server-generated via RPC and no bucket is public.

## Gated: applying these migrations

Per §28, **do not apply until the operator authorizes** and supplies:

1. a Supabase staging project (or permission to create one) + chosen region /
   data-residency preference;
2. owner authentication method;
3. approved secret storage for the local worker / n8n;
4. permission to install or link the Supabase CLI;
5. confirmation that only synthetic/test data is used until the RLS negative
   tests pass.

Once authorized, the apply order is:

```
supabase db reset            # local shadow db, or link to staging
supabase migration up        # applies 20260722090001..012 in order
# then run the RLS negative-case suite (§7.4) against the shadow/staging db
```

## Known items deferred to the gated apply step (not offline-checkable)

These require a live database and are intentionally **not** in the scaffold:

- **Service roles.** Narrow Postgres roles for the worker and publisher services
  (their column/row grants per the §7.4 matrix) are created at apply-time; they
  depend on the live project's role setup.
- **Token isolation.** `app_social_accounts.token_secret_ref` holds only an
  opaque reference, never a token. Full column-level hiding from operator/analyst
  reads is implemented at apply-time via a restricted view or a split secrets
  table (Postgres has no native column RLS).
- **RLS negative-case tests** (§7.4): cross-org reads return zero rows; guessed
  storage keys are undownloadable; analyst cannot read originals or token refs;
  reviewer cannot mutate facts; operator cannot create a flagship publish job.
  These run against the applied database and must pass before any real data.

## Migrations are append-only after a shared apply

Once a migration has been applied to staging or production, do not edit it. Add a
forward migration and document the repair path (§7.1).
