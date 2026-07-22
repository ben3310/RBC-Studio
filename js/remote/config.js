const TRUE_VALUES=new Set(['1','true','yes','on']);

function booleanValue(value){return value===true||TRUE_VALUES.has(String(value??'').trim().toLowerCase());}
function clean(value){return String(value??'').trim();}

export function parseRemoteFactoryConfig(source={}){
  const enabled=booleanValue(source.RBC_REMOTE_FACTORY??source.remoteFactory);
  const supabaseUrl=clean(source.RBC_SUPABASE_URL??source.supabaseUrl);
  const anonKey=clean(source.RBC_SUPABASE_ANON_KEY??source.anonKey);
  if(enabled){
    let parsed;
    try{parsed=new URL(supabaseUrl);}catch(error){throw new Error('Remote factory requires a valid Supabase URL.');}
    if(parsed.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(parsed.hostname))throw new Error('Remote factory URL must use HTTPS outside local development.');
    if(!anonKey)throw new Error('Remote factory requires a public anonymous key.');
  }
  return Object.freeze({enabled,supabaseUrl,anonKey,mode:enabled?'remote':'local'});
}

export const REMOTE_FACTORY_CONFIG=parseRemoteFactoryConfig(globalThis.__RBC_CONFIG__||{});
