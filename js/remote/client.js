import {REMOTE_FACTORY_CONFIG} from './config.js';

export function createRemoteFactoryClient({config=REMOTE_FACTORY_CONFIG,fetchImpl=globalThis.fetch}={}){
  if(!config.enabled){
    return Object.freeze({
      enabled:false,
      mode:'local',
      async queue(){return {mode:'local',items:[]};},
      async sync(){return {mode:'local',synced:false,reason:'remote-disabled'};}
    });
  }
  if(typeof fetchImpl!=='function')throw new Error('Remote factory requires a fetch implementation.');
  const request=async path=>{
    const response=await fetchImpl(config.supabaseUrl.replace(/\/$/,'')+path,{headers:{apikey:config.anonKey,Authorization:`Bearer ${config.anonKey}`}});
    if(!response.ok)throw new Error(`Remote factory request failed with ${response.status}.`);
    return response.json();
  };
  return Object.freeze({enabled:true,mode:'remote',queue:()=>request('/rest/v1/content_items?select=id,status&limit=100')});
}
