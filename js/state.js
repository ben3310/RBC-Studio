export {APP_VERSION} from './version.js';
export const LEGACY_KEY='rbc-studio-v5-campaign';
const INDEX_KEY='rbc-studio-v6-library';
const ACTIVE_KEY='rbc-studio-v6-active';
const RECORD_PREFIX='rbc-studio-v6-campaign:';

function uid(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return 'campaign-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
}

function clone(value){return JSON.parse(JSON.stringify(value));}
function now(){return new Date().toISOString();}

export class CampaignStore{
  constructor(storage=localStorage){this.storage=storage;this.available=true;}
  read(key,fallback){try{const raw=this.storage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(error){this.available=false;return fallback;}}
  write(key,value){try{this.storage.setItem(key,JSON.stringify(value));this.available=true;return true;}catch(error){this.available=false;return false;}}
  remove(key){try{this.storage.removeItem(key);return true;}catch(error){this.available=false;return false;}}
  index(){return this.read(INDEX_KEY,[]);}
  activeId(){return this.read(ACTIVE_KEY,null);}
  setActive(id){return this.write(ACTIVE_KEY,id);}
  load(id){return id?this.read(RECORD_PREFIX+id,null):null;}
  list(){return this.index().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));}
  summary(record){
    const fields=record.fields||{};
    const readiness=record.readiness||{};
    const ready=Object.values(readiness).filter(value=>value==='ready'||value==='posted'||value===true).length;
    const posted=Object.values(readiness).filter(value=>value==='posted').length;
    return {id:record.id,title:record.title||fields.fName||'Untitled campaign',pieceName:fields.fName||'Unnamed piece',archiveNo:fields.fNo||'000',campaignDate:fields.campaignDate||'',createdAt:record.createdAt,updatedAt:record.updatedAt,ready,posted,total:5,complete:posted===5,sold:!!fields.soldToggle};
  }
  save(record){
    const next={...record,updatedAt:now()};
    const ok=this.write(RECORD_PREFIX+next.id,next);
    if(!ok)return false;
    const list=this.index().filter(item=>item.id!==next.id);
    list.unshift(this.summary(next));
    this.write(INDEX_KEY,list);
    return true;
  }
  create(seed={}){
    const timestamp=now();
    const record={id:uid(),title:seed.title||seed.fields?.fName||'New archive campaign',createdAt:timestamp,updatedAt:timestamp,fields:{...(seed.fields||{})},outputs:{...(seed.outputs||{})},readiness:{instagram:'draft',tiktok:'draft',telegram:'draft',threads:'draft',x:'draft',...(seed.readiness||{})},posted:{},schedule:{...(seed.schedule||{})},variants:{instagram:0,tiktok:0,telegram:0,threads:0,x:0,...(seed.variants||{})},canvas:{...(seed.canvas||{})},factory:clone(seed.factory||{}),snapshots:{...(seed.snapshots||{})},results:{...(seed.results||{})},arc:{...(seed.arc||{})},soldStory:seed.soldStory||null,soldAt:seed.soldAt||null};
    this.save(record);this.setActive(record.id);return record;
  }
  rename(id,title){const record=this.load(id);if(!record)return null;record.title=String(title||'').trim()||record.title;this.save(record);return record;}
  // a duplicate is an unposted piece: readiness/posted/results/soldStory/soldAt
  // reset (nothing has shipped or sold yet), but the resolved copy and arc
  // dates carry over like every other field, since the rest of the record does too
  duplicate(id){const source=this.load(id);if(!source)return null;const data=clone(source);delete data.id;delete data.createdAt;delete data.updatedAt;data.title=(source.title||'Campaign')+' copy';data.readiness={instagram:'draft',tiktok:'draft',telegram:'draft',threads:'draft',x:'draft'};data.posted={};data.results={};data.factory={...(data.factory||{}),plan:null};data.soldStory=null;data.soldAt=null;if(data.fields)data.fields.soldToggle=false;return this.create(data);}
  delete(id){this.remove(RECORD_PREFIX+id);this.write(INDEX_KEY,this.index().filter(item=>item.id!==id));if(this.activeId()===id)this.remove(ACTIVE_KEY);}
  migrateLegacy(defaultFields={}){
    if(this.index().length)return null;
    const legacy=this.read(LEGACY_KEY,null);
    if(!legacy)return null;
    const fields={...defaultFields};const outputs={};const readiness={};const schedule={};
    Object.entries(legacy).forEach(([key,value])=>{
      if(key.startsWith('out'))outputs[key]=value;
      else if(key.startsWith('ready_'))readiness[key.slice(6)]=value?'ready':'draft';
      else if(key.startsWith('time'))schedule[key]=value;
      else fields[key]=value;
    });
    const record=this.create({title:fields.fName||'Migrated campaign',fields,outputs,readiness,schedule});
    this.remove(LEGACY_KEY);
    return record;
  }
}
