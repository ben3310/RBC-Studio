import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertContract} from '../packages/contracts/validate.js';
import {approveNonFlagshipAssets,assertDestinationPolicy,canAutoPublish,DESTINATIONS} from '../packages/policy-core/index.js';
import {loadDestinationConfig} from '../packages/policy-core/config.js';
import {createRemoteFactoryClient} from '../js/remote/client.js';
import {parseRemoteFactoryConfig} from '../js/remote/config.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const pairs=[
  ['factory-run','factory-run.v1.json'],['source-asset','source-asset.v1.json'],['content-item','content-item.v1.json'],
  ['worker-job','worker-job.v1.json'],['cutout-qa','cutout-qa.v1.json'],['approval','approval.v1.json'],['publish-job','publish-job.v1.json']
];
for(const [schemaName,fixtureName] of pairs){
  const schema=json(`packages/contracts/schemas/${schemaName}.schema.json`);
  assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
  assertContract(schema,json(`packages/contracts/fixtures/${fixtureName}`),schemaName);
}
assertContract(json('packages/contracts/schemas/destination-config.schema.json'),json('config/destinations.json'),'destination-config');

const configured=loadDestinationConfig(path.join(root,'config','destinations.json'));
assertDestinationPolicy(configured.destinations);
assert.deepEqual(configured.destinations,DESTINATIONS,'checked-in and runtime destination policies must remain identical');
assert.throws(()=>assertDestinationPolicy({...configured.destinations,flagship:{...configured.destinations.flagship,manualOnly:false}}),/manual-only/);
assert.throws(()=>assertDestinationPolicy({...configured.destinations,flagship:{...configured.destinations.flagship,requiresApproval:false}}),/require approval/);
const plan={assets:[{id:'flagship',destination:'flagship',status:'draft'},{id:'pin',destination:'pinterest',status:'draft'}]};
const approved=approveNonFlagshipAssets(plan,DESTINATIONS,'2026-07-19T00:00:00.000Z');
assert.equal(approved.assets[0].status,'draft');assert.equal(approved.assets[1].status,'approved');
assert.equal(canAutoPublish({...approved.assets[0],status:'approved'}),false);assert.equal(canAutoPublish(approved.assets[1]),true);

const generatedPlan=json('packages/contracts/fixtures/factory-plan.v1.json');
const generatedManifest=json('packages/contracts/fixtures/export-manifest.v1.json');
assert.equal(generatedPlan.assets.length,31);assert.equal(generatedManifest.assets.length,31);
assert.equal(generatedManifest.assets.filter(asset=>asset.destination==='flagship').length,4);
assert.ok(generatedManifest.assets.filter(asset=>asset.destination==='flagship').every(asset=>asset.autoPublishEligible===false));

const localConfig=parseRemoteFactoryConfig({});assert.deepEqual(localConfig,{enabled:false,supabaseUrl:'',anonKey:'',mode:'local'});
let networkCalls=0;
const localClient=createRemoteFactoryClient({config:localConfig,fetchImpl:async()=>{networkCalls++;throw new Error('Network must stay dark.');}});
assert.deepEqual(await localClient.queue(),{mode:'local',items:[]});
assert.deepEqual(await localClient.sync(),{mode:'local',synced:false,reason:'remote-disabled'});
assert.equal(networkCalls,0,'remote-off mode must make zero network requests');
assert.throws(()=>parseRemoteFactoryConfig({RBC_REMOTE_FACTORY:'true'}),/valid Supabase URL/);
assert.throws(()=>parseRemoteFactoryConfig({RBC_REMOTE_FACTORY:'true',RBC_SUPABASE_URL:'http://example.com',RBC_SUPABASE_ANON_KEY:'public'}),/HTTPS/);
const remoteConfig=parseRemoteFactoryConfig({RBC_REMOTE_FACTORY:'true',RBC_SUPABASE_URL:'https://project.supabase.co',RBC_SUPABASE_ANON_KEY:'public-anon'});
const remoteClient=createRemoteFactoryClient({config:remoteConfig,fetchImpl:async url=>{networkCalls++;assert.match(url,/\/rest\/v1\/app_content_items/);return {ok:true,json:async()=>[{id:'one',status:'review'}]};}});
assert.equal((await remoteClient.queue())[0].id,'one');assert.equal(networkCalls,1);

console.log('Milestone 0 foundation verification passed');
