# Supabase scaffold (Milestone 1)

This directory is the database scaffold for the RBC
Content Factory. It corresponds to `CODEX_IMPLEMENTATION.md` §7 and M1.1 of the
§28 work packet: local configuration, ordered migrations, synthetic seed data,
and migration tests without connecting the PWA.

## Status: STAGING REPORTED APPLIED; CORRECTED GATE RERUN PENDING

The Claude/operator handoff reports that these migrations were applied to staging
and that nine RLS checks passed. This Codex track did not apply or query staging.
No secret, pinned CLI package, local container runtime, or PWA connection was added.
The app remains default-off (`parseRemoteFactoryConfig` → `mode: "local"`).

Ignored files under `.temp/` contain the corresponding
`linked-project.json`, `project-ref`, and pooler metadata timestamped 2026-07-22
10:37 local time. Their values were not read or used by this track.

The committed RLS test initially contained an invalid UUID, a missing required
campaign, and the wrong JWT claim setting. It therefore could not reproduce the
reported success verbatim. The checked-in test is now corrected and must pass
again against staging before M1.5 is marked complete.

Local scaffold files:

- `config.toml`: secret-free local configuration with no remote reference;
- `migrations/`: the 12 ordered migrations reported applied to staging;
- `seed.sql`: deterministic synthetic records only, with no Auth identities;
- `tests/0001_schema.test.sql`: pgTAP smoke plan for the first authorized reset.
- `tests/rls_negative_checks.sql`: transactional nine-case local RLS gate.

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

Those commands discover `infra/supabase/config.toml`. The explicit `--local` on
reset is mandatory because ignored link metadata exists. Never use `--linked`,
`db push`, `migration up`, or a default-remote command until the local reset,
lint, pgTAP, and RLS negative suite pass and staging is separately authorized.

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

Because staging is reported applied, never edit an applied migration. Add a
forward migration and documented repair path for schema changes. Test-only
repairs such as the corrected transactional RLS gate do not alter the schema.
