export const POLICY_VERSION=1;

function freezeDestinations(destinations){
  return Object.freeze(Object.fromEntries(Object.entries(destinations).map(([code,value])=>[code,Object.freeze({...value})])));
}

export const DESTINATIONS=freezeDestinations({
  flagship:{label:'Rare Bag Club',kind:'flagship',manualOnly:true,requiresApproval:true,disclosure:''},
  education:{label:'Archive Notes',kind:'satellite',manualOnly:false,requiresApproval:true,disclosure:'Curated by @rarebagclub'},
  aesthetic:{label:'Object Study',kind:'satellite',manualOnly:false,requiresApproval:true,disclosure:'Curated by @rarebagclub'},
  era:{label:'Era Index',kind:'satellite',manualOnly:false,requiresApproval:true,disclosure:'Curated by @rarebagclub'},
  pinterest:{label:'Pinterest',kind:'discovery',manualOnly:false,requiresApproval:true,disclosure:'Curated by @rarebagclub'},
  blog:{label:'Archive Journal',kind:'owned',manualOnly:false,requiresApproval:true,disclosure:'Published by Rare Bag Club'}
});

export function assertDestinationPolicy(destinations=DESTINATIONS){
  if(!destinations||typeof destinations!=='object'||Array.isArray(destinations))throw new Error('Destination policy must be an object.');
  const entries=Object.entries(destinations);
  if(!entries.length)throw new Error('At least one destination is required.');
  for(const [code,destination] of entries){
    if(!destination||typeof destination!=='object')throw new Error(`Destination ${code} must be an object.`);
    if(!['flagship','satellite','discovery','owned'].includes(destination.kind))throw new Error(`Destination ${code} has an invalid kind.`);
    if(typeof destination.manualOnly!=='boolean')throw new Error(`Destination ${code} must declare manualOnly.`);
    if(typeof destination.requiresApproval!=='boolean')throw new Error(`Destination ${code} must declare requiresApproval.`);
    if(destination.kind==='flagship'&&destination.manualOnly!==true)throw new Error(`Flagship destination ${code} must remain manual-only.`);
    if(destination.kind==='flagship'&&destination.requiresApproval!==true)throw new Error(`Flagship destination ${code} must require approval.`);
  }
  const flagship=destinations.flagship;
  if(!flagship||flagship.kind!=='flagship'||flagship.manualOnly!==true)throw new Error('The flagship destination is missing or not manual-only.');
  return true;
}

export function destinationFor(asset,destinations=DESTINATIONS){return asset?destinations[asset.destination]||null:null;}

export function isFlagshipAsset(asset,destinations=DESTINATIONS){return destinationFor(asset,destinations)?.kind==='flagship';}

export function canAutoPublish(asset,destinations=DESTINATIONS){
  const destination=destinationFor(asset,destinations);
  return !!asset&&asset.status==='approved'&&!!destination&&destination.kind!=='flagship'&&destination.manualOnly===false;
}

export function approveNonFlagshipAssets(plan,destinations=DESTINATIONS,reviewedAt=new Date().toISOString()){
  assertDestinationPolicy(destinations);
  return {...plan,assets:(plan?.assets||[]).map(asset=>isFlagshipAsset(asset,destinations)?{...asset}:{...asset,status:'approved',reviewedAt})};
}

assertDestinationPolicy(DESTINATIONS);
