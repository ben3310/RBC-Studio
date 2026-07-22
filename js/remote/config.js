const TRUE_VALUES=new Set(['1','true','yes','on']);
const REMOTE_CONFIG_KEY='rbc-studio-v6-remote-config';

function booleanValue(value){return value===true||TRUE_VALUES.has(String(value??'').trim().toLowerCase());}
function clean(value){return String(value??'').trim();}
function jwtRole(value){
  try{
    const part=String(value).split('.')[1];
    if(!part)return '';
    const json=globalThis.atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='));
    return JSON.parse(json).role||'';
  }catch(error){return '';}
}

export function parseRemoteFactoryConfig(source={}){
  const enabled=booleanValue(source.RBC_REMOTE_FACTORY??source.remoteFactory);
  const supabaseUrl=clean(source.RBC_SUPABASE_URL??source.supabaseUrl);
  const anonKey=clean(source.RBC_SUPABASE_ANON_KEY??source.anonKey);
  if(enabled){
    let parsed;
    try{parsed=new URL(supabaseUrl);}catch(error){throw new Error('Remote factory requires a valid Supabase URL.');}
    if(parsed.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(parsed.hostname))throw new Error('Remote factory URL must use HTTPS outside local development.');
    if(!anonKey)throw new Error('Remote factory requires a public anonymous key.');
    if(anonKey.startsWith('sb_secret_')||jwtRole(anonKey)==='service_role')throw new Error('Never put a Supabase secret or service-role key in the browser.');
  }
  return Object.freeze({enabled,supabaseUrl,anonKey,mode:enabled?'remote':'local'});
}

export function readStoredRemoteFactoryConfig(storage=globalThis.localStorage){
  try{return JSON.parse(storage?.getItem(REMOTE_CONFIG_KEY)||'{}');}catch(error){return {};}
}

export function saveRemoteFactoryConfig(source,storage=globalThis.localStorage){
  const config=parseRemoteFactoryConfig(source);
  if(!storage?.setItem)throw new Error('Remote settings cannot be stored in this browser.');
  storage.setItem(REMOTE_CONFIG_KEY,JSON.stringify({
    RBC_REMOTE_FACTORY:config.enabled,
    RBC_SUPABASE_URL:config.supabaseUrl,
    RBC_SUPABASE_ANON_KEY:config.anonKey
  }));
  return config;
}

export function clearRemoteFactoryConfig(storage=globalThis.localStorage){
  try{storage?.removeItem(REMOTE_CONFIG_KEY);return true;}catch(error){return false;}
}

const stored=readStoredRemoteFactoryConfig();
const injected=globalThis.__RBC_CONFIG__||{};
export const REMOTE_FACTORY_CONFIG=parseRemoteFactoryConfig({...stored,...injected});
