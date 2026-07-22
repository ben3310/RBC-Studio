# Supabase scaffold (Milestone 1)

This directory is the **local, not-yet-applied** database scaffold for the RBC
Content Factory. It corresponds to `CODEX_IMPLEMENTATION.md` §7 and M1.1 of the
§28 work packet: local configuration, ordered migrations, synthetic seed data,
and migration tests without connecting the PWA.

## Status: NOT APPLIED

Nothing here has been applied to any Supabase project. No secrets, CLI package,
container runtime, CLI link, PWA connection, or remote database call was added.
The app remains default-off (`parseRemoteFactoryConfig` → `mode: "local"`).

Local scaffold files:

- `config.toml`: secret-free, unlinked CLI configuration;
- `migrations/`: the 12 ordered, not-yet-applied migrations;
- `seed.sql`: deterministic synthetic records only, with no Auth identities;
- `tests/0001_schema.test.sql`: pgTAP smoke plan for the first authorized reset.

## What is verified offline

`npm run verify:migrations` parses SQL text without a database and verifies:

- all 12 migrations are timestamped and in the §7.1 order;
- all 20 required core tables are declared;
- all 17 cross-table relationships are constrained to one organization;
- every core table is covered by forced RLS;
- flagship destinations cannot be created weakly, weakened, or deleted;
- flagship/manual-only items cannot create publish jobs;
- fixed prices require a positive amount and currency; POA forbids an amount;
- audit rows and source-asset binary rows are immutable;
- approvals bind the authenticated reviewer and current binary/copy fingerprints;
- required idempotency and replay uniqueness exists;
- private storage excludes analysts from originals and rights proofs;
- all `SECURITY DEFINER` RPCs revoke default public execution;
- approval and publish states match their versioned JSON contracts;
- local config, synthetic seed, and pgTAP smoke-plan structure are present.

This validation is intentionally stronger than keyword presence, but it cannot
replace PostgreSQL parsing or runtime RLS tests.

## Gated: installing or running Supabase

Per §28, **do not install, start, reset, link, or apply** until the operator
authorizes:

1. the CLI and Docker-compatible runtime;
2. a Supabase staging project or permission to create one;
3. region/data-residency preference;
4. owner authentication method;
5. approved worker/n8n secret storage;
6. synthetic-only data until every RLS negative test passes.

The CLI and container runtime are not installed on this machine. After local
runtime authorization, run from the repository root:

```powershell
Set-Location infra
supabase start
supabase db reset --local
supabase db lint --level error
supabase test db
```

Those commands discover `infra/supabase/config.toml`. Never substitute
`--linked` until the local reset, lint, pgTAP, and RLS negative suite pass and a
staging apply is separately authorized.

## Still deferred to the first authorized runtime

- **SQL/runtime validation.** PostgreSQL has not parsed these migrations. The
  first local reset and `db lint` may reveal syntax or catalog assumptions.
- **Service roles.** Worker and publisher roles need narrow grants matching §7.4.
- **Account projection.** `token_secret_ref` is only an opaque reference and the
  base account table is owner-only. A non-secret projection is required before
  operator/reviewer account views.
- **RLS negative cases.** Cross-org reads, guessed storage keys, analyst access,
  reviewer fact mutation, service isolation, and flagship scheduling must fail
  against the running database.
- **Upload completion.** The gated upload service must move the object to the
  final hash-bearing key before calling the revoked completion RPC.

## Migration immutability

These files may be repaired while status remains NOT APPLIED. After any shared
staging or production apply, never edit an applied migration. Add a forward
migration and documented repair path.

