// One-way local→remote sync core (CODEX_IMPLEMENTATION.md §8.3). Pure and
// dependency-free so it unit-tests offline. Repeating a sync of unchanged data
// produces the same idempotency key, which the server uses to no-op.

// deterministic canonical JSON: object keys sorted, so equal data hashes equal
export function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value)??'null';
  if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
  const keys=Object.keys(value).sort();
  return '{'+keys.map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
}

// FNV-1a 32-bit → 8 hex chars. Sufficient for change-detection / idempotency
// (not a content-address of image bytes; asset sha256 is the worker's job).
export function fnv1a(text){
  let h=0x811c9dc5;
  const s=String(text);
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}
  return (h>>>0).toString(16).padStart(8,'0');
}

// the subset of a local record that defines the piece's identity + facts. Bumps
// the fingerprint (and thus the idempotency key) only when something worth
// re-syncing changed.
export function pieceFingerprint(record){
  const f=record?.fields||{};
  const facts={
    fNo:f.fNo??'', fName:f.fName??'', fProv:f.fProv??'', fPrice:f.fPrice??'',
    priceCurrency:f.priceCurrency??'', priceMode:f.priceMode??'',
    fMaterial:f.fMaterial??'', fCondition:f.fCondition??'', fAuth:f.fAuth??'',
    fDetail:f.fDetail??'', acquisitionRoute:f.acquisitionRoute??'', productUrl:f.productUrl??''
  };
  return fnv1a(stableStringify(facts));
}

// Keep the persisted snapshot lossless except for the local write timestamp.
// Saving the same form twice must not create a different remote mutation.
export function localSyncSnapshot(record){
  const snapshot=JSON.parse(JSON.stringify(record||{}));
  delete snapshot.updatedAt;
  return snapshot;
}

export function syncFingerprint(record){return fnv1a(stableStringify(localSyncSnapshot(record)));}

// idempotency key is stable for the same local campaign + unchanged facts, so a
// repeated sync collides on (account/org, key) and creates no duplicates.
export function idempotencyKey(localId,fingerprint){
  return 'sync:'+String(localId)+':'+fingerprint;
}

export function buildSyncRequest(record,{schemaVersion='v6'}={}){
  if(!record||!record.id)throw new Error('sync requires a saved local record.');
  const fingerprint=pieceFingerprint(record);
  const mutationFingerprint=syncFingerprint(record);
  return {
    local_campaign_id:record.id,
    local_schema_version:schemaVersion,
    piece_fingerprint:fingerprint,
    idempotency_key:idempotencyKey(record.id,mutationFingerprint),
    local_snapshot:localSyncSnapshot(record),
    // Milestone 1 syncs metadata only; binary upload intents come back from the
    // server for assets whose hash it does not yet hold.
    source_assets:[]
  };
}

// Local persistent map of local campaign id → remote ids + last synced key.
// A second sync with an unchanged fingerprint is short-circuited to a no-op.
const MAP_KEY='rbc-studio-v6-remote-map';
export class RemoteIdMap{
  constructor(storage){this.storage=storage;}
  all(){try{const raw=this.storage?.getItem(MAP_KEY);return raw?JSON.parse(raw):{};}catch(error){return {};}}
  get(localId){return this.all()[localId]||null;}
  set(localId,entry){
    const map=this.all();
    map[localId]={...map[localId],...entry};
    try{this.storage?.setItem(MAP_KEY,JSON.stringify(map));return true;}catch(error){return false;}
  }
  // true when this exact fingerprint was already synced for this campaign
  isCurrent(localId,fingerprint){const e=this.get(localId);return !!e&&e.lastSyncKey===idempotencyKey(localId,fingerprint);}
}
