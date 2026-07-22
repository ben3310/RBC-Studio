// Offline structural validator for the Supabase migration scaffold.
// It parses the SQL text (does NOT connect to a database) and asserts the §7
// invariants so schema regressions are caught in CI before the gated apply step.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'infra', 'supabase', 'migrations');

// §7.1 required migration order (suffixes after the timestamp prefix)
const ORDER = [
  'extensions_and_enums','organizations_and_members','pieces_and_campaigns',
  'assets_rights_and_attributes','factory_content_and_approvals',
  'destinations_and_accounts','jobs_publications_and_metrics',
  'audit_and_webhooks','constraints_indexes_and_triggers',
  'row_level_security','storage_policies','rpc_functions'
];

const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
assert.equal(files.length, ORDER.length, `expected ${ORDER.length} migrations, found ${files.length}`);
files.forEach((f, i) => {
  assert.ok(/^\d{14}_/.test(f), `migration ${f} must start with a 14-digit timestamp prefix`);
  assert.ok(f.includes(ORDER[i]), `migration ${i + 1} must be "${ORDER[i]}", got ${f}`);
});
// timestamps strictly increasing so apply order is unambiguous
const stamps = files.map(f => f.slice(0, 14));
for (let i = 1; i < stamps.length; i++) assert.ok(stamps[i] > stamps[i - 1], `timestamps must increase: ${files[i]}`);

const sql = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n').toLowerCase();

// §7.2 required tables
const TABLES = [
  'app_organizations','app_organization_members','app_pieces','app_campaigns',
  'app_source_assets','app_rights_records','app_asset_attributes',
  'app_factory_runs','app_content_items','app_content_item_assets','app_approvals',
  'app_destinations','app_social_accounts','app_job_runs','app_publish_jobs',
  'app_publications','app_metric_observations','app_audit_events','app_webhook_events',
  'app_model_registry'
];
for (const t of TABLES) assert.ok(sql.includes(`create table ${t} `), `missing table ${t}`);

// tenant tables must enable AND force RLS: each must be named in the RLS
// migration (either directly or inside its enable-loop array)
const rlsFile = files.find(f => f.includes('row_level_security'));
const rlsSql = fs.readFileSync(path.join(dir, rlsFile), 'utf8').toLowerCase();
const TENANT = TABLES.filter(t => !['app_model_registry'].includes(t));
for (const t of TENANT) assert.ok(rlsSql.includes(t), `${t} not covered by RLS migration`);
assert.ok(rlsSql.includes('enable row level security') && rlsSql.includes('force row level security'),
  'RLS enable/force statements missing');

// flagship invariant is enforced in the database (constraint + guard trigger)
assert.ok(sql.includes("kind <> 'flagship' or (manual_only = true and requires_approval = true)"),
  'flagship check constraint missing');
assert.ok(sql.includes('protect_flagship'), 'flagship guard trigger missing');

// literal-scarcity / POA price doctrine encoded on pieces: a price-on-request
// piece must carry no amount (checked by intent, not exact phrasing, so schema
// hardening does not break this gate)
assert.ok(/price_mode\s*=\s*'on_request'/.test(sql) && /price_amount_minor is null/.test(sql),
  'POA price check missing (on_request must forbid an amount)');
assert.ok(/price_mode\s*=\s*'fixed'/.test(sql) && /price_amount_minor\s*>\s*0/.test(sql),
  'fixed-price check missing (fixed must require a positive amount)');

// audit append-only guard
assert.ok(sql.includes('audit_is_append_only'), 'audit append-only trigger missing');

// key uniqueness (§7.2 / §7.3)
for (const u of [
  'unique (organization_id, archive_no)',
  'unique (account_id, idempotency_key)',
  'unique (account_id, platform_post_id)',
  'unique (publication_id, observed_at)',
  'unique (provider, provider_event_id)'
]) assert.ok(sql.includes(u), `missing uniqueness: ${u}`);

// server-generated storage keys + immutable-binary hash path
assert.ok(sql.includes('request_upload_intent') && sql.includes('complete_source_asset'),
  'upload-intent RPCs missing');
assert.ok(sql.includes('skip locked'), 'job claim must use FOR UPDATE SKIP LOCKED');

// private buckets only; no bucket is created public
assert.ok(!/insert into storage\.buckets[\s\S]*?,\s*true\s*\)/.test(sql), 'no storage bucket may be public');

console.log(`Migration scaffold verified: ${files.length} files, ${TABLES.length} tables, RLS forced, flagship + POA + audit invariants present.`);
