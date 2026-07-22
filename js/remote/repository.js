// Campaign repository abstraction (CODEX_IMPLEMENTATION.md §8.1).
// LocalCampaignRepository wraps existing browser behavior. RemoteCampaignRepository
// uses the authenticated Supabase client. HybridCampaignRepository selects
// explicitly: remote mode NEVER silently uploads local campaigns — sync is an
// explicit call, one-way, idempotent.
import {CampaignStore} from '../state.js';
import {buildSyncRequest,pieceFingerprint,RemoteIdMap} from './sync.js';

export class CampaignRepository{
  async listCampaigns(){throw new Error('not implemented');}
  async getCampaign(){throw new Error('not implemented');}
  async saveLocalCampaign(){throw new Error('not implemented');}
  async syncCampaign(){throw new Error('not implemented');}
  async listReviewQueue(){throw new Error('not implemented');}
}

export class LocalCampaignRepository extends CampaignRepository{
  constructor(store=new CampaignStore()){super();this.store=store;this.mode='local';}
  async listCampaigns(){return this.store.list();}
  async getCampaign(id){return this.store.load(id);}
  async saveLocalCampaign(record){return this.store.save(record);}
  // sync is a no-op locally: there is no remote to push to
  async syncCampaign(){return {mode:'local',synced:false,reason:'remote-disabled'};}
  async listReviewQueue(){return {mode:'local',items:[]};}
}

export class RemoteCampaignRepository extends CampaignRepository{
  // client: the authenticated remote client (js/remote/client.js). store/idMap
  // stay local because sync reads the local record and records the mapping.
  constructor({client,store,idMap}={}){
    super();
    // validate the client before constructing a default store (which touches
    // localStorage) so a disabled client fails closed, not with a storage error
    if(!client?.enabled)throw new Error('RemoteCampaignRepository requires an enabled remote client.');
    this.client=client;
    this.store=store||new CampaignStore();
    this.idMap=idMap||new RemoteIdMap(this.store.storage);
    this.mode='remote';
  }
  async listCampaigns(){return this.store.list();}            // library UI stays local-first
  async getCampaign(id){return this.store.load(id);}
  async saveLocalCampaign(record){return this.store.save(record);}
  async listReviewQueue(filters){return this.client.queue(filters);}

  // explicit one-way sync of one local record to remote staging.
  async syncCampaign(localId,{force=false}={}){
    const record=this.store.load(localId);
    if(!record)return {synced:false,reason:'not-found'};
    const fingerprint=pieceFingerprint(record);
    if(!force&&this.idMap.isCurrent(localId,fingerprint)){
      const mapped=this.idMap.get(localId);
      return {synced:false,reason:'unchanged',remoteCampaignId:mapped?.remoteCampaignId,remotePieceId:mapped?.remotePieceId};
    }
    const request=buildSyncRequest(record);
    const result=await this.client.syncCampaign(request);   // server upserts by (org, external ref); returns stable ids
    this.idMap.set(localId,{
      remoteCampaignId:result.campaign_id,
      remotePieceId:result.piece_id,
      lastSyncKey:request.idempotency_key,
      syncedAt:new Date().toISOString()
    });
    return {synced:true,remoteCampaignId:result.campaign_id,remotePieceId:result.piece_id,uploadIntents:result.upload_intents||[]};
  }
}

// Hybrid picks the adapter by mode; the default is always local so the current
// app is unchanged until the flag is flipped and a client provided.
export class HybridCampaignRepository extends CampaignRepository{
  constructor({config,client,store=new CampaignStore()}={}){
    super();
    this.local=new LocalCampaignRepository(store);
    this.remote=(config?.enabled&&client?.enabled)?new RemoteCampaignRepository({client,store}):null;
    this.mode=this.remote?'remote':'local';
  }
  active(){return this.remote||this.local;}
  listCampaigns(){return this.active().listCampaigns();}
  getCampaign(id){return this.active().getCampaign(id);}
  saveLocalCampaign(record){return this.local.saveLocalCampaign(record);}  // writes are always local first
  // sync only exists in remote mode; local mode reports disabled, never uploads
  syncCampaign(id,options){return this.remote?this.remote.syncCampaign(id,options):this.local.syncCampaign(id,options);}
  listReviewQueue(filters){return this.active().listReviewQueue(filters);}
}

export function createCampaignRepository({config,client,store}={}){
  return new HybridCampaignRepository({config,client,store});
}
