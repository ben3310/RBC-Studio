const DB_NAME='rbc-studio-media';
const STORE='images';
const VERSION=1;

function openDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in globalThis))return reject(new Error('IndexedDB unavailable'));
    const request=indexedDB.open(DB_NAME,VERSION);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));
  });
}

async function transact(mode,work){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);const store=tx.objectStore(STORE);let result;
    try{result=work(store);}catch(error){reject(error);return;}
    tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};
  });
}

async function downscale(blob,maxEdge=3000){
  if(!blob||!blob.type?.startsWith('image/'))return blob;
  if(typeof createImageBitmap!=='function')return blob;
  const bitmap=await createImageBitmap(blob);
  const edge=Math.max(bitmap.width,bitmap.height);
  if(edge<=maxEdge){bitmap.close();return blob;}
  const scale=maxEdge/edge;const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d',{alpha:true}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  return new Promise(resolve=>canvas.toBlob(result=>resolve(result||blob),blob.type==='image/png'?'image/png':'image/jpeg',.9));
}

export async function saveCampaignImages(campaignId,{bag,mood=[]}){
  const records=[];
  if(bag)records.push({key:campaignId+':bag',campaignId,slot:'bag',blob:await downscale(bag)});
  for(let index=0;index<mood.length;index++)records.push({key:campaignId+':mood:'+index,campaignId,slot:'mood',index,blob:await downscale(mood[index])});
  await deleteCampaignImages(campaignId);
  return transact('readwrite',store=>records.forEach(record=>store.put(record)));
}

export async function loadCampaignImages(campaignId){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');const request=tx.objectStore(STORE).getAll();
    request.onsuccess=()=>{const rows=request.result.filter(row=>row.campaignId===campaignId);db.close();resolve({bag:rows.find(row=>row.slot==='bag')?.blob||null,mood:rows.filter(row=>row.slot==='mood').sort((a,b)=>a.index-b.index).map(row=>row.blob)});};
    request.onerror=()=>{db.close();reject(request.error);};
  });
}

export async function deleteCampaignImages(campaignId){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);const request=store.openCursor();
    request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(cursor.value.campaignId===campaignId)cursor.delete();cursor.continue();};
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
  });
}

export async function duplicateCampaignImages(fromId,toId){
  const images=await loadCampaignImages(fromId);return saveCampaignImages(toId,images);
}

export async function imageStorageAvailable(){try{const db=await openDb();db.close();return true;}catch(error){return false;}}
