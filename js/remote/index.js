// App-facing assembly of the remote persistence layer. Everything here is inert
// unless RBC_REMOTE_FACTORY is on; the app imports these but the local-only path
// is unchanged until the flag is flipped and a user signs in.
import {REMOTE_FACTORY_CONFIG} from './config.js';
import {createRemoteFactoryClient} from './client.js';
import {createAuthClient} from './auth.js';
import {HybridCampaignRepository} from './repository.js';

export function remoteEnabled(){return REMOTE_FACTORY_CONFIG.enabled;}

let authClient=null;
function auth(){return authClient||(authClient=createAuthClient());}
export function currentSession(){return remoteEnabled()?auth().getSession():null;}
export async function signIn(email,password){return auth().signIn(email,password);}
export async function signOut(){return remoteEnabled()?auth().signOut():{ok:true};}

// build a repository bound to the given local store and the current session.
// Off the flag this is a local-only hybrid (no client), so calls never touch
// the network.
export function repository(store){
  const client=createRemoteFactoryClient({getSession:currentSession});
  return new HybridCampaignRepository({config:REMOTE_FACTORY_CONFIG,client,store});
}

// One-call helper for the UI: ensures a session (prompting via the provided
// credential getter), then syncs one campaign. Returns the sync result.
export async function syncCampaign(store,id,{getCredentials}={}){
  if(!remoteEnabled())return {synced:false,reason:'remote-disabled'};
  if(!currentSession()){
    const creds=getCredentials?await getCredentials():null;
    if(!creds?.email||!creds?.password)return {synced:false,reason:'sign-in-cancelled'};
    await signIn(creds.email,creds.password);
  }
  return repository(store).syncCampaign(id);
}
