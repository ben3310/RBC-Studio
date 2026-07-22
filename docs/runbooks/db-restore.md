# Runbook: database backup and restore (staging)

Milestone 1 operational safety (`CODEX_IMPLEMENTATION.md` M1.13). Exercise this on
the staging project before any production apply — an untested restore is not a
backup.

## Backups

Supabase takes automated daily backups on paid plans; the free tier does not, so
take explicit snapshots before risky changes.

- **Point-in-time / dashboard:** Supabase dashboard → Database → Backups. Note the
  retention window for your plan.
- **Manual logical dump (portable, plan-independent):**
  ```bash
  # connection string: dashboard → Project Settings → Database → Connection string
  pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -Fc -f rbc-staging-$(date +%Y%m%d).dump
  ```
  Store the dump outside the repo (it is data, not code; the repo `.gitignore`
  excludes dumps). Never commit a dump or a connection string.

## Restore

1. Provision a fresh empty database (a new Supabase project or a local Postgres).
2. Apply schema from migrations (preferred — reproducible):
   ```bash
   npm run db:link -- --project-ref <new-ref>
   npm run db:push
   ```
   Then load data only from the dump, or:
3. Full logical restore (schema + data) from a dump:
   ```bash
   pg_restore --no-owner --no-privileges -d "$NEW_DB_URL" rbc-staging-YYYYMMDD.dump
   ```
4. Re-run the security gate before trusting the restored DB:
   - `infra/supabase/tests/rls_negative_checks.sql` in the SQL Editor → expect
     "all nine RLS role/isolation checks completed".
   - `npm run verify:migrations` and `npm run verify:db-types` locally.

## Drill checklist (run quarterly on staging)

- [ ] Take a manual dump.
- [ ] Restore it into a throwaway project.
- [ ] RLS gate passes on the restored copy.
- [ ] Row counts match the source for `app_pieces`, `app_campaigns`,
      `app_content_items`.
- [ ] Delete the throwaway project.

## Incident notes

- Local deletion in the app never touches remote data (§8.3); restore is only for
  server-side loss or corruption.
- If a bad migration was applied, do **not** edit the applied migration. Add a
  forward repair migration (§7.1) and, if needed, restore from the pre-migration
  dump into a new project.
