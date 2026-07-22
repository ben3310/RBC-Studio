// Offline unit tests for the Milestone 1 persistence layer (M1.8-M1.11).
// No network: the remote client is driven by a mock fetch. Asserts the flag-off
// path never touches the network and that sync is idempotent.
import assert from 'node:assert/strict';
import {parseRemoteFactoryConfig} from '../js/remote/config.js';
import {createRemoteFactoryClient} from '../js/remote/client.js';
import {createAuthClient} from '../js/remote/auth.js';
import {CampaignStore} from '../js/state.js';
import {LocalCampaignRepository,RemoteCampaignRepository,HybridCampaignRepository} from '../js/remote/repository.js';
import {pieceFingerprint,idempotencyKey,buildSyncRequest,stableStringify,RemoteIdMap} from '../js/remote/sync.js';

class MemoryStorage{constructor(){this.map=new Map();}getItem(k){return this.map.get(k)??null;}setItem(k,v){this.map.set(k,String(v));}removeItem(k){this.map.delete(k);}}

// ---- sync core ----
assert.equal(stableStringify({b:1,a:2}),'{"a":2,"b":1}','stableStringify sorts keys');
const recA={id:'c1',fields:{fNo:'004',fName:'Dior',fProv:'Galliano'}};
const recAsame={id:'c1',fields:{fName:'Dior',fNo:'004',fProv:'Galliano'}}; // reordered
const recAchanged={id:'c1',fields:{fNo:'004',fName:'Dior',fProv:'Galliano era'}};
assert.equal(pieceFingerprint(recA),pieceFingerprint(recAsame),'fingerprint is order-independent');
assert.notEqual(pieceFingerprint(recA),pieceFingerprint(recAchanged),'fingerprint changes with facts');
assert.equal(idempotencyKey('c1',pieceFingerprint(recA)),buildSyncRequest(recA).idempotency_key,'idempotency key is derived deterministically');

// ---- config + flag-off client makes zero network calls ----
const localConfig=parseRemoteFactoryConfig({});
assert.deepEqual(localConfig,{enabled:false,supabaseUrl:'',anonKey:'',mode:'local'});
let calls=0;
const localClient=createRemoteFactoryClient({config:localConfig,fetchImpl:async()=>{calls++;throw new Error('dark');}});
assert.deepEqual(await localClient.queue(),{mode:'local',items:[]});
assert.deepEqual(await localClient.sync(),{mode:'local',synced:false,reason:'remote-disabled'});
assert.deepEqual(await localClient.syncCampaign(),{mode:'local',synced:false,reason:'remote-disabled'});
assert.equal(calls,0,'flag-off client must not touch the network');

// auth is inert when disabled and never calls fetch
const localAuth=createAuthClient({config:localConfig,fetchImpl:async()=>{calls++;throw new Error('dark');}});
assert.equal(localAuth.enabled,false);
assert.equal(localAuth.getSession(),null);
await assert.rejects(()=>localAuth.signIn('a@b.c','x'),/disabled/);
assert.equal(calls,0,'disabled auth must not touch the network');

// ---- local repository wraps the store ----
const store=new CampaignStore(new MemoryStorage());
const local=new LocalCampaignRepository(store);
const created=store.create({title:'Test',fields:{fNo:'004',fName:'Dior'}});
assert.equal((await local.listCampaigns()).length,1);
assert.equal((await local.getCampaign(created.id)).id,created.id);
assert.deepEqual(await local.syncCampaign(created.id),{mode:'local',synced:false,reason:'remote-disabled'});
assert.deepEqual(await local.listReviewQueue(),{mode:'local',items:[]});

// ---- remote repository: idempotent sync via mock client ----
const remoteConfig=parseRemoteFactoryConfig({RBC_REMOTE_FACTORY:'true',RBC_SUPABASE_URL:'https://x.supabase.co',RBC_SUPABASE_ANON_KEY:'anon'});
let syncCalls=0,lastPayload=null;
const mockClient={enabled:true,mode:'remote',
  async queue(){return [{id:'ci1',status:'review'}];},
  async syncCampaign(request){syncCalls++;lastPayload=request;return {campaign_id:'remote-c1',piece_id:'remote-p1',upload_intents:[]};}
};
const remoteStore=new CampaignStore(new MemoryStorage());
const rec=remoteStore.create({title:'Remote',fields:{fNo:'004',fName:'Dior',fProv:'Galliano'}});
const remote=new RemoteCampaignRepository({client:mockClient,store:remoteStore,idMap:new RemoteIdMap(remoteStore.storage)});

const first=await remote.syncCampaign(rec.id);
assert.equal(first.synced,true);
assert.equal(first.remoteCampaignId,'remote-c1');
assert.equal(syncCalls,1);
assert.equal(lastPayload.local_campaign_id,rec.id);

// second sync of unchanged data is a no-op (no duplicate remote write)
const second=await remote.syncCampaign(rec.id);
assert.equal(second.synced,false);
assert.equal(second.reason,'unchanged');
assert.equal(syncCalls,1,'unchanged re-sync must not call the server again');

// changing a fact re-syncs
rec.fields.fProv='Galliano era';remoteStore.save(rec);
const third=await remote.syncCampaign(rec.id);
assert.equal(third.synced,true);
assert.equal(syncCalls,2,'changed facts trigger a fresh sync');

// review queue is read-only passthrough
assert.equal((await remote.listReviewQueue())[0].id,'ci1');

// ---- hybrid defaults to local; only goes remote with an enabled client ----
const hybridLocal=new HybridCampaignRepository({config:localConfig,store});
assert.equal(hybridLocal.mode,'local');
assert.deepEqual(await hybridLocal.syncCampaign(created.id),{mode:'local',synced:false,reason:'remote-disabled'});
const hybridRemote=new HybridCampaignRepository({config:remoteConfig,client:mockClient,store:remoteStore});
assert.equal(hybridRemote.mode,'remote');

// remote repository refuses a disabled client (fail-closed)
assert.throws(()=>new RemoteCampaignRepository({client:{enabled:false}}),/enabled remote client/);

console.log('Remote persistence verification passed');
