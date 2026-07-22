// Offline structural and semantic validator for the NOT-APPLIED Supabase scaffold.
// This file never opens a database or network connection. Runtime PostgreSQL,
// RLS, and storage behavior still require the gated local/staging apply suite.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'infra','supabase','migrations');
const ORDER=[
  'extensions_and_enums','organizations_and_members','pieces_and_campaigns',
  'assets_rights_and_attributes','factory_content_and_approvals',
  'destinations_and_accounts','jobs_publications_and_metrics',
  'audit_and_webhooks','constraints_indexes_and_triggers',
  'row_level_security','storage_policies','rpc_functions'
];

const files=fs.readdirSync(dir).filter(file=>file.endsWith('.sql')).sort();
assert.equal(files.length,ORDER.length,`expected ${ORDER.length} migrations, found ${files.length}`);
files.forEach((file,index)=>{
  assert.match(file,/^\d{14}_/,`migration ${file} must start with a 14-digit timestamp`);
  assert.ok(file.includes(ORDER[index]),`migration ${index+1} must be "${ORDER[index]}", got ${file}`);
});
const stamps=files.map(file=>file.slice(0,14));
for(let index=1;index<stamps.length;index++){
  assert.ok(stamps[index]>stamps[index-1],`timestamps must increase: ${files[index]}`);
}

const rawByName=Object.fromEntries(ORDER.map((name,index)=>[
  name,fs.readFileSync(path.join(dir,files[index]),'utf8')
]));
const configPath=path.join(root,'infra','supabase','config.toml');
const seedPath=path.join(root,'infra','supabase','seed.sql');
const databaseTestPath=path.join(root,'infra','supabase','tests','0001_schema.test.sql');
for(const requiredPath of [configPath,seedPath,databaseTestPath]){
  assert.ok(fs.existsSync(requiredPath),`missing local Supabase scaffold file: ${requiredPath}`);
}
const config=fs.readFileSync(configPath,'utf8');
const seed=fs.readFileSync(seedPath,'utf8');
const databaseTest=fs.readFileSync(databaseTestPath,'utf8');
const stripComments=value=>value.replace(/\/\*[\s\S]*?\*\//g,'').replace(/--.*$/gm,'');
const normalize=value=>stripComments(value).toLowerCase().replace(/\s+/g,' ').trim();
const sql=normalize(Object.values(rawByName).join('\n'));
const part=name=>normalize(rawByName[name]);
const expect=(haystack,needle,label)=>assert.ok(
  haystack.includes(normalize(needle)),
  label
);
const reject=(haystack,needle,label)=>assert.ok(
  !haystack.includes(normalize(needle)),
  label
);

for(const [name,raw] of Object.entries(rawByName)){
  assert.ok(stripComments(raw).trimEnd().endsWith(';'),`${name} migration must end with a semicolon`);
  assert.equal((raw.match(/\$\$/g)||[]).length%2,0,`${name} has unbalanced dollar quotes`);
}
assert.ok(!/\bdrop\s+table\b/i.test(sql),'scaffold may not drop tables');
assert.ok(!/\btruncate\b/i.test(sql),'scaffold may not truncate data');

const TABLES=[
  'app_organizations','app_organization_members','app_pieces','app_campaigns',
  'app_source_assets','app_rights_records','app_asset_attributes',
  'app_factory_runs','app_content_items','app_content_item_assets','app_approvals',
  'app_destinations','app_social_accounts','app_job_runs','app_publish_jobs',
  'app_publications','app_metric_observations','app_audit_events','app_webhook_events',
  'app_model_registry'
];
for(const table of TABLES){
  assert.match(sql,new RegExp(`\\bcreate table ${table} `),`missing table ${table}`);
}
expect(part('organizations_and_members'),'references auth.users(id) on delete cascade',
  'organization membership must reference auth.users');
for(const table of TABLES){
  assert.ok(part('row_level_security').includes(table),`${table} is absent from the RLS migration`);
}
expect(part('row_level_security'),'enable row level security','RLS enable statements missing');
expect(part('row_level_security'),'force row level security','RLS force statements missing');

// Product invariants.
expect(sql,"kind <> 'flagship' or (manual_only = true and requires_approval = true)",
  'flagship kind constraint missing');
expect(sql,"code <> 'flagship' or (kind = 'flagship' and manual_only = true and requires_approval = true)",
  'flagship code constraint missing');
expect(part('destinations_and_accounts'),'before update or delete on app_destinations',
  'flagship update/delete guard missing');
expect(part('destinations_and_accounts'),'an existing destination cannot be repurposed as flagship',
  'destination-to-flagship repurposing guard missing');
expect(sql,"price_mode = 'fixed' and price_amount_minor > 0 and price_currency is not null",
  'fixed-price amount/currency constraint missing');
expect(sql,"price_mode = 'on_request' and price_amount_minor is null",
  'price-on-request constraint missing');
expect(sql,'audit_is_append_only','audit append-only trigger missing');
expect(sql,'source_asset_is_immutable','source asset immutable-row trigger missing');
expect(sql,'coalesce(length(trim(disclosure_text)), 0) > 0',
  'non-null, non-empty AI disclosure constraint missing');
expect(sql,'validate_approval','fingerprint-bound approval trigger missing');
expect(sql,'reviewer_id must match the authenticated user','approval identity binding missing');
expect(sql,'validate_publish_job','publish-job policy guard missing');
expect(sql,'flagship/manual-only content cannot create a publish job',
  'database flagship publish guard missing');
expect(sql,'protect_scheduled_content_inputs','scheduled content input lock missing');
expect(sql,'publish account must be enabled and linked','publisher account readiness guard missing');

// Tenant relationships must carry organization_id, including join-table guards.
const TENANT_FKS=[
  'fk_campaign_piece_org','fk_asset_piece_org','fk_asset_campaign_org',
  'fk_asset_parent_org','fk_rights_asset_org','fk_run_campaign_org',
  'fk_item_run_org','fk_item_campaign_org','fk_item_destination_org',
  'fk_item_account_org','fk_approval_item_org','fk_account_destination_org',
  'fk_publish_item_org','fk_publish_account_org','fk_publication_job_org',
  'fk_publication_account_org','fk_metric_publication_org'
];
for(const constraint of TENANT_FKS){
  expect(part('constraints_indexes_and_triggers'),constraint,
    `same-organization foreign key missing: ${constraint}`);
}
expect(part('constraints_indexes_and_triggers'),'assert_content_item_asset_org',
  'join-table tenant guard missing');

// Required uniqueness and idempotency.
for(const unique of [
  'unique (organization_id, archive_no)',
  'unique (account_id, idempotency_key)',
  'unique (publish_job_id)',
  'unique (account_id, platform_post_id)',
  'unique (publication_id, observed_at)',
  'unique (provider, provider_event_id)',
  'uq_active_model_purpose'
]){
  expect(sql,unique,`missing uniqueness: ${unique}`);
}

// RLS and storage least privilege.
const rls=part('row_level_security');
expect(rls,'source_assets_read on app_source_assets for select',
  'restricted source-asset read policy missing');
reject(rls,'on app_source_assets for all','source assets must not have generic write RLS');
expect(rls,'publish_jobs_read on app_publish_jobs for select',
  'publish jobs must be interactive read-only');
reject(rls,'on app_publish_jobs for all','publish jobs must not have generic interactive writes');
expect(rls,'accounts_owner_only on app_social_accounts for all',
  'account token references must remain owner-only');
const storage=part('storage_policies');
reject(storage,'app.is_member(app.storage_org(name))',
  'storage reads must use role-aware checks, not generic membership');
reject(storage,"'analyst'::app.member_role",'analysts must not read private storage');
assert.ok(!/insert into storage\.buckets[\s\S]*?,\s*true\s*\)/.test(storage),
  'no storage bucket may be public');
expect(storage,"split_part(objname, '/', 1) = 'org'",'storage path parser must fail closed');
expect(storage,'benchmark-private','private benchmark bucket missing');

// SECURITY DEFINER RPCs are inert until narrow grants exist.
const rpc=part('rpc_functions');
assert.equal((rpc.match(/security definer set search_path = ''/g)||[]).length,3,
  'every gated SECURITY DEFINER RPC must pin an empty search_path');
for(const fn of ['request_upload_intent','complete_source_asset','claim_job']){
  expect(rpc,`revoke all on function app.${fn}`,`${fn} must revoke default PUBLIC execution`);
}
expect(rpc,'from public, anon, authenticated','gated RPC revocation roles missing');
expect(rpc,'storage_bucket, storage_key, sha256','source completion must persist bucket and key');
expect(rpc,'from storage.objects','source completion must verify the object exists');
expect(rpc,'p_lease_seconds not between 30 and 900','job lease bounds missing');
expect(rpc,'for update skip locked','job claim must be concurrency-safe');

// Shared JSON contracts and database state checks may not silently drift.
const schema=name=>JSON.parse(fs.readFileSync(
  path.join(root,'packages','contracts','schemas',`${name}.schema.json`),'utf8'
));
const quoted=value=>[...value.matchAll(/'([^']+)'/g)].map(match=>match[1]).sort();
const checkValues=(source,table,column)=>{
  const expression=new RegExp(
    `create table ${table} \\([\\s\\S]*?${column} text[\\s\\S]*?check \\(${column} in \\(([^)]*)\\)\\)`,
    'i'
  ).exec(stripComments(source));
  assert.ok(expression,`could not parse ${table}.${column} check values`);
  return quoted(expression[1]);
};
assert.deepEqual(
  checkValues(rawByName.factory_content_and_approvals,'app_approvals','decision'),
  [...schema('approval').properties.decision.enum].sort(),
  'approval decision contract/database drift'
);
assert.deepEqual(
  checkValues(rawByName.jobs_publications_and_metrics,'app_publish_jobs','state'),
  [...schema('publish-job').properties.state.enum].sort(),
  'publish-job state contract/database drift'
);

// Local CLI scaffold stays unlinked, deterministic, synthetic, and secret-free.
for(const setting of [
  'project_id = "rbc-content-factory-local"',
  'major_version = 15',
  '[db.seed]',
  'sql_paths = ["./seed.sql"]',
  'enable_anonymous_sign_ins = false',
  '[analytics]',
  'enabled = false'
]) assert.ok(config.includes(setting),`local config missing: ${setting}`);
assert.doesNotMatch(config,/(password|service_role|secret|access_token)\s*=/i,
  'local config must not contain secret-bearing settings');
assert.match(seed,/Synthetic local-only seed/,'seed must declare synthetic-only data');
assert.doesNotMatch(seed,/insert\s+into\s+auth\.users/i,
  'offline seed must not create authentication identities');
assert.match(databaseTest,/select plan\(17\)/,'pgTAP runtime plan is missing');
assert.match(databaseTest,/rollback;/,'database smoke suite must roll back');

console.log(
  `Migration scaffold verified: ${files.length} files, ${TABLES.length} core tables, `+
  `${TENANT_FKS.length} tenant-safe relationships, forced RLS, gated RPCs, contract parity, `+
  'local config, synthetic seed, and pgTAP smoke plan.'
);
