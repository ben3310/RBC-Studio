// Browser authentication behind RBC_REMOTE_FACTORY (CODEX_IMPLEMENTATION.md
// M1.8). Thin wrapper over Supabase GoTrue REST. No auth code path runs unless
// the remote flag is on and the caller explicitly signs in; the token lives in
// memory here (callers may persist it, but never alongside secrets).
import {REMOTE_FACTORY_CONFIG} from './config.js';

export function createAuthClient({config=REMOTE_FACTORY_CONFIG,fetchImpl=globalThis.fetch}={}){
  if(!config.enabled){
    return Object.freeze({
      enabled:false,
      async signIn(){throw new Error('Remote factory is disabled; enable RBC_REMOTE_FACTORY to sign in.');},
      async signOut(){return {ok:true};},
      getSession(){return null;}
    });
  }
  if(typeof fetchImpl!=='function')throw new Error('Auth requires a fetch implementation.');
  const base=config.supabaseUrl.replace(/\/$/,'');
  let session=null;

  const signIn=async(email,password)=>{
    const response=await fetchImpl(base+'/auth/v1/token?grant_type=password',{
      method:'POST',
      headers:{apikey:config.anonKey,'content-type':'application/json'},
      body:JSON.stringify({email,password})
    });
    if(!response.ok){
      let message='Sign-in failed ('+response.status+').';
      try{const data=await response.json();message=data.error_description||data.msg||message;}catch(error){}
      throw new Error(message);
    }
    const data=await response.json();
    session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at,user:data.user};
    return session;
  };
  const signOut=async()=>{
    if(session?.access_token){
      try{await fetchImpl(base+'/auth/v1/logout',{method:'POST',headers:{apikey:config.anonKey,Authorization:`Bearer ${session.access_token}`}});}catch(error){}
    }
    session=null;return {ok:true};
  };

  return Object.freeze({enabled:true,signIn,signOut,getSession:()=>session});
}
