import {REMOTE_FACTORY_CONFIG} from './config.js';

// The remote client is inert unless RBC_REMOTE_FACTORY is on. When enabled it
// talks to Supabase PostgREST. An optional session access token (from auth.js)
// is used for row-level-secured calls; without it the anon key is sent and RLS
// returns nothing for tenant tables (fail-closed).
export function createRemoteFactoryClient({config=REMOTE_FACTORY_CONFIG,fetchImpl=globalThis.fetch,session=null,getSession=null}={}){
  if(!config.enabled){
    const disabledSync=async()=>({mode:'local',synced:false,reason:'remote-disabled'});
    return Object.freeze({
      enabled:false,
      mode:'local',
      async queue(){return {mode:'local',items:[]};},
      sync:disabledSync,            // preserved name (foundation contract)
      syncCampaign:disabledSync
    });
  }
  if(typeof fetchImpl!=='function')throw new Error('Remote factory requires a fetch implementation.');
  const base=config.supabaseUrl.replace(/\/$/,'');
  const currentSession=()=>typeof getSession==='function'?getSession():session;
  const headers=extra=>({apikey:config.anonKey,Authorization:`Bearer ${currentSession()?.access_token||config.anonKey}`,...extra});

  const get=async path=>{
    const response=await fetchImpl(base+path,{headers:headers()});
    if(!response.ok)throw new Error(`Remote factory request failed with ${response.status}.`);
    return response.json();
  };
  const rpc=async(name,body)=>{
    const response=await fetchImpl(base+'/rest/v1/rpc/'+name,{
      method:'POST',
      headers:headers({'content-type':'application/json'}),
      body:JSON.stringify(body)
    });
    if(!response.ok)throw new Error(`Remote RPC ${name} failed with ${response.status}.`);
    return response.json();
  };

  const queue=(filters={})=>{
    const params=new URLSearchParams({select:'id,status,destination_id,platform,content_type',limit:String(filters.limit||100)});
    if(filters.status)params.set('status','eq.'+filters.status);
    if(filters.campaign)params.set('campaign_id','eq.'+filters.campaign);
    return get('/rest/v1/app_content_items?'+params.toString());
  };
  // one-way local→remote sync via the server RPC, which owns the upsert-by-
  // external-ref and returns stable remote ids
  const syncCampaign=request=>rpc('sync_local_campaign',{payload:request});

  return Object.freeze({enabled:true,mode:'remote',hasSession:()=>!!currentSession()?.access_token,queue,sync:syncCampaign,syncCampaign});
}
