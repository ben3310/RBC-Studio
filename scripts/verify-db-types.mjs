// M1.7 drift check: the app's schema-manifest.json must not drift from the
// migrations. Fails if a table is added/removed in migrations without updating
// the manifest, or if a column the remote client reads no longer exists.
// Offline: parses SQL text, never connects to a database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const migrationsDir=path.join(root,'infra','supabase','migrations');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'infra','supabase','schema-manifest.json'),'utf8'));

const sql=fs.readdirSync(migrationsDir).filter(f=>f.endsWith('.sql'))
  .map(f=>fs.readFileSync(path.join(migrationsDir,f),'utf8')).join('\n');

// tables actually declared in the migrations
const migrationTables=[...sql.matchAll(/create table (app_[a-z_]+)\s*\(/g)].map(m=>m[1]).sort();
const manifestTables=[...manifest.tables].sort();

const missingInManifest=migrationTables.filter(t=>!manifestTables.includes(t));
const missingInMigrations=manifestTables.filter(t=>!migrationTables.includes(t));
assert.equal(missingInManifest.length,0,`migrations added tables the manifest does not track: ${missingInManifest.join(', ')}`);
assert.equal(missingInMigrations.length,0,`manifest lists tables absent from migrations: ${missingInMigrations.join(', ')}`);

// extract the body of a create-table block so we can check its columns
function tableBody(table){
  const start=sql.indexOf(`create table ${table} (`);
  if(start<0)return '';
  const from=sql.indexOf('(',start);
  let depth=0;
  for(let i=from;i<sql.length;i++){
    if(sql[i]==='(')depth++;
    else if(sql[i]===')'){depth--;if(depth===0)return sql.slice(from+1,i);}
  }
  return '';
}

for(const [table,columns] of Object.entries(manifest.appReads||{})){
  assert.ok(manifestTables.includes(table),`appReads references untracked table ${table}`);
  // drop line comments so a comment between a comma and the next column does not
  // hide the column from the boundary match
  const body=tableBody(table).replace(/--.*$/gm,'').toLowerCase();
  for(const col of columns){
    // a column definition line begins with the column name (word boundary)
    assert.match(body,new RegExp(`(^|,|\\()\\s*${col}\\b`),`app reads ${table}.${col} but the migration has no such column`);
  }
}

// every RPC the client calls must exist in the migration set
for(const fn of manifest.rpc||[]){
  const present=sql.includes(`function app.${fn}`)||sql.includes(`function ${fn}`)||sql.includes(`create or replace function public.${fn}`);
  assert.ok(present,`RPC ${fn} is used by the app but missing from migrations`);
}
for(const fn of manifest.workerRpc||[]){
  const present=sql.includes(`create or replace function public.${fn}`);
  assert.ok(present,`worker RPC ${fn} is missing from forward migrations`);
}

console.log(`DB drift check passed: ${migrationTables.length} tables aligned; ${Object.keys(manifest.appReads||{}).length} app-read table(s) column-verified.`);
