# Runbook: disable the remote factory (kill switch)

Milestone 1 rollback (`CODEX_IMPLEMENTATION.md` M1.13). Turning the remote factory
off returns the app to pure local-first behavior with **zero network calls**. It
never deletes remote data.

## When to use

- Suspected credential leak or misconfiguration.
- Unexpected remote errors during a session.
- Any time you want the app to run fully offline again.

## Steps

1. Set the flag off. In the browser config (`window.__RBC_CONFIG__`) or the
   environment that builds it:
   ```
   RBC_REMOTE_FACTORY=false
   ```
   `parseRemoteFactoryConfig` then returns `mode: "local"`, and
   `createRemoteFactoryClient` / `createAuthClient` return inert stubs whose
   methods make no network calls.
2. Reload the app. The campaign library, canvas, copy, and export all continue
   from `localStorage` exactly as before.
3. (Optional) Sign out any active session: call `auth.signOut()` or clear the
   in-memory session by reloading; the token is never persisted with secrets.

## What stays intact

- All local campaigns (`rbc-studio-v6-*` keys) and images (IndexedDB).
- The local→remote ID map (`rbc-studio-v6-remote-map`) is retained so re-enabling
  resumes idempotent sync without duplicating remote rows.
- Remote records in Supabase are untouched. Local deletion never deletes remote
  originals (§8.3).

## Verify it is truly dark

`npm run test:foundation` includes a guard: with the flag off, invoking the
client throws if any fetch is attempted (`Network must stay dark`). If you change
remote code, keep that assertion green.

## Re-enable

Set `RBC_REMOTE_FACTORY=true` with a valid `RBC_SUPABASE_URL` and
`RBC_SUPABASE_ANON_KEY`, reload, and sign in. Existing mappings make the first
re-sync a no-op for unchanged campaigns.
