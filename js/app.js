import {initCanvasStudio} from './canvas.js';
import {CampaignStore,APP_VERSION} from './state.js';
import {ANGLE_SIGNAL,applySpelling,campaignFacts,lintGenerated,present,signalHook,valueOf,viralHook} from './facts.js';
import {aggregateHooks,bestVariantForBank,rankByBank} from './leaderboard.js';
import {buildMonthlyReview} from './deskreview.js';
import {COPY_MAKERS} from './copy/index.js';
import {makeTiktok,parseTiktokSections} from './copy/tiktok.js';
import {PLATFORM_LIMITS,validateOutput} from './validation.js';
import {deleteCampaignImages,duplicateCampaignImages,imageStorageAvailable,loadCampaignImages,saveCampaignImages} from './images.js';
import {createZip} from './zip.js';
import {buildCalendar} from './calendar.js';
import {getAiKey,polishWithAi,setAiKey} from './ai.js';
import {dualClockLabel,formatOperatorTime,suggestTimes,zonedWallTimeToUtc} from './schedule.js';
import {TEMPLATE_META} from './templates/registry.js';
import {parseDmSections} from './copy/dm.js';
import {makeSoldStory,makeSoldStoryPack} from './copy/sold.js';
import {makeProofCaption,makeTeaseCaption} from './copy/arc.js';
import {initContentFactory} from './factory/ui.js';
import {REMOTE_FACTORY_CONFIG,clearRemoteFactoryConfig,saveRemoteFactoryConfig} from './remote/config.js';
import {createAuthClient} from './remote/auth.js';
import {createRemoteFactoryClient} from './remote/client.js';
import {createCampaignRepository} from './remote/repository.js';
import {remoteEnabled,syncCampaign as syncCampaignToCloud} from './remote/index.js';

const PLATFORMS=['instagram','tiktok','telegram','threads','x'];
const outputIds={instagram:'outInstagram',tiktok:'outTiktok',telegram:'outTelegram',threads:'outThreads',x:'outX'};
const countIds={instagram:'countInstagram',tiktok:'countTiktok',telegram:'countTelegram',threads:'countThreads',x:'countX'};
const timeIds={instagram:'timeInstagram',tiktok:'timeTiktok',telegram:'timeTelegram',threads:'timeThreads',x:'timeX'};
const clockIds={instagram:'clockInstagram',tiktok:'clockTiktok',telegram:'clockTelegram',threads:'clockThreads',x:'clockX'};
const RESULT_METRICS=['views','saves','dms'];
function resultInputId(platform,metric){return metric+platform.charAt(0).toUpperCase()+platform.slice(1);}
const fieldIds=['campaignObjective','storyAngle','campaignDate','copySpelling','acquisitionRoute','productUrl','fMaterial','fCondition','fAuth','fDetail','includeName','includeTags','fNo','fName','fHook','fProv','fPrice','priceCurrency','fCta','fShipping','fDuties','fGuarantee','fDispatch','bagSize','soldToggle','tagToggle','gridMode','hookStrat','targetRegion','soldRegion','arcTeaseDate','arcTeaseTime','arcProofDate','arcProofTime','caption'];
function spellingMode(){return valueOf('copySpelling')||'american';}
const store=new CampaignStore();
const appLive=document.getElementById('appLive');
let active=null;
let saveTimer=null;
let imageSaveTimer=null;
let applying=false;
let canvasStudio=null;
let factoryController=null;

document.getElementById('appVersion').textContent='v'+APP_VERSION;

function localDate(){const date=new Date();const pad=value=>String(value).padStart(2,'0');return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());}
if(!document.getElementById('campaignDate').value)document.getElementById('campaignDate').value=localDate();

function readElement(id){const element=document.getElementById(id);if(!element)return undefined;return element.type==='checkbox'?element.checked:element.value;}
function writeElement(id,value){const element=document.getElementById(id);if(!element||value===undefined)return;if(element.type==='checkbox')element.checked=!!value;else element.value=value;}
function captureFields(){return Object.fromEntries(fieldIds.map(id=>[id,readElement(id)]));}
const intentionalDefaults=captureFields();
function blankOutputs(){return Object.fromEntries(PLATFORMS.map(platform=>[outputIds[platform],'']));}
function defaultSchedule(){return Object.fromEntries(PLATFORMS.map(platform=>[timeIds[platform],document.getElementById(timeIds[platform]).value]));}
function freshSeed(){return {title:'New archive campaign',fields:{...intentionalDefaults,campaignDate:localDate()},outputs:blankOutputs(),schedule:defaultSchedule(),readiness:Object.fromEntries(PLATFORMS.map(platform=>[platform,'draft'])),variants:Object.fromEntries(PLATFORMS.map(platform=>[platform,0])),canvas:{},factory:{}};}

const migrated=store.migrateLegacy(intentionalDefaults);
const firstLaunch=!migrated&&store.list().length===0;
active=migrated||store.load(store.activeId());
if(!active)active=store.create(freshSeed());

function announce(message){appLive.textContent='';requestAnimationFrame(()=>appLive.textContent=message);}
function showSaveState(message){document.getElementById('saveState').textContent=message;}

canvasStudio=initCanvasStudio({
  onCanvasStateChange(state){if(applying||!active)return;active.canvas=state;scheduleSave();updateCanvasLabel();},
  onImagesChanged(images){
    if(applying||!active)return;
    clearTimeout(imageSaveTimer);
    imageSaveTimer=setTimeout(async()=>{
      try{await saveCampaignImages(active.id,images);document.getElementById('imageStorageHint').textContent='Images saved for this campaign.';}catch(error){document.getElementById('imageStorageHint').textContent='Images will not survive reload in this browser.';}
    },250);
    if(imagesComplete())setImagesCollapsed(true);
    updateReadinessChips();updateEmptyState();
  }
});
factoryController=initContentFactory({
  canvasStudio,templates:TEMPLATE_META,getFacts:()=>campaignFacts(),getCampaignId:()=>active?.id||'campaign',downloadBlob,
  onChange(factory){if(applying||!active)return;active.factory=factory;scheduleSave();}
});

const remoteAuth=createAuthClient({config:REMOTE_FACTORY_CONFIG});
const remoteClient=createRemoteFactoryClient({config:REMOTE_FACTORY_CONFIG,getSession:remoteAuth.getSession});
const campaignRepository=createCampaignRepository({config:REMOTE_FACTORY_CONFIG,client:remoteClient,store});

function setRemoteStatus(message){const element=document.getElementById('remoteStatus');if(element)element.textContent=message;}
function setRemoteSessionState(signedIn){
  document.getElementById('remoteSignIn').disabled=signedIn;
  document.getElementById('remoteSignOut').disabled=!signedIn;
  document.getElementById('remoteSyncCampaign').disabled=!signedIn;
  document.getElementById('remoteRefreshQueue').disabled=!signedIn;
}
function renderRemoteQueue(items){
  const queue=document.getElementById('remoteQueue');
  queue.replaceChildren();
  const rows=Array.isArray(items)?items:items?.items||[];
  if(!rows.length){queue.hidden=true;return;}
  rows.forEach(item=>{
    const row=document.createElement('div');row.className='remote-queue-item';
    const label=document.createElement('span');label.textContent=[item.platform,item.content_type].filter(Boolean).join(' · ')||item.id;
    const state=document.createElement('span');state.textContent=item.status||'unknown';
    row.append(label,state);queue.append(row);
  });
  queue.hidden=false;
}
function setupRemoteControls(){
  const enabled=REMOTE_FACTORY_CONFIG.enabled;
  document.getElementById('remoteModeLabel').textContent=enabled?'on · sign-in required':'off';
  document.getElementById('remoteEnabled').checked=enabled;
  document.getElementById('remoteUrl').value=REMOTE_FACTORY_CONFIG.supabaseUrl;
  document.getElementById('remoteAnonKey').value=REMOTE_FACTORY_CONFIG.anonKey;
  document.getElementById('remoteSessionControls').hidden=!enabled;
  setRemoteSessionState(false);
  if(enabled)setRemoteStatus('Remote mode is enabled. Sign in to sync; nothing uploads automatically.');

  document.getElementById('remoteSaveConfig').addEventListener('click',()=>{
    try{
      saveRemoteFactoryConfig({
        RBC_REMOTE_FACTORY:document.getElementById('remoteEnabled').checked,
        RBC_SUPABASE_URL:document.getElementById('remoteUrl').value,
        RBC_SUPABASE_ANON_KEY:document.getElementById('remoteAnonKey').value
      });
      setRemoteStatus('Settings saved. Reloading with the selected mode…');
      location.reload();
    }catch(error){setRemoteStatus(error.message);}
  });
  document.getElementById('remoteClearConfig').addEventListener('click',()=>{
    clearRemoteFactoryConfig();
    setRemoteStatus('Remote sync disabled. Reloading in local mode…');
    location.reload();
  });
  document.getElementById('remoteSignIn').addEventListener('click',async()=>{
    const button=document.getElementById('remoteSignIn');button.disabled=true;
    try{
      await remoteAuth.signIn(document.getElementById('remoteEmail').value.trim(),document.getElementById('remotePassword').value);
      document.getElementById('remotePassword').value='';setRemoteSessionState(true);
      setRemoteStatus('Signed in. Campaigns still sync only when you tap “Sync this campaign”.');
    }catch(error){setRemoteSessionState(false);setRemoteStatus(error.message);}
  });
  document.getElementById('remoteSignOut').addEventListener('click',async()=>{
    await remoteAuth.signOut();setRemoteSessionState(false);renderRemoteQueue([]);setRemoteStatus('Signed out. Local work remains available.');
  });
  document.getElementById('remoteSyncCampaign').addEventListener('click',async()=>{
    const button=document.getElementById('remoteSyncCampaign');button.disabled=true;
    try{
      saveNow();
      const result=await campaignRepository.syncCampaign(active.id);
      setRemoteStatus(result.synced?`Synced this campaign · remote ID ${result.remoteCampaignId}`:'Already synced · no duplicate remote write.');
    }catch(error){setRemoteStatus(error.message);}finally{button.disabled=!remoteAuth.getSession();}
  });
  document.getElementById('remoteRefreshQueue').addEventListener('click',async()=>{
    const button=document.getElementById('remoteRefreshQueue');button.disabled=true;
    try{const items=await campaignRepository.listReviewQueue({limit:100});renderRemoteQueue(items);setRemoteStatus(`Remote queue refreshed · ${Array.isArray(items)?items.length:0} item(s).`);}
    catch(error){setRemoteStatus(error.message);}finally{button.disabled=!remoteAuth.getSession();}
  });
}
setupRemoteControls();

// empty state: only a genuinely first-ever launch (nothing migrated, no saved
// campaigns) shows the 3-step card in place of the canvas; it clears the
// moment the operator adds an image or loads the worked example
function updateEmptyState(){
  const el=document.getElementById('emptyState');if(!el)return;
  const hasImages=document.getElementById('bagCount').textContent!=='None'||Number(document.getElementById('moodCount').textContent)>0;
  el.hidden=!firstLaunch||hasImages||store.list().length>1;
}
document.getElementById('loadExample')?.addEventListener('click',async()=>{
  saveNow();
  const seed=freshSeed();
  seed.title='example · archive no. 004';
  seed.fields={...seed.fields,fNo:'004',fName:'Dior Hardcore Pouch',fHook:'the loud one',fProv:'Galliano era · c. 2003 · authenticated',priceCurrency:'USD',fPrice:'4800',fCta:'DM to claim',fMaterial:'black leather · silver-tone hardware',fCondition:'excellent vintage condition',fAuth:'two-stage authenticated',fDetail:'original chain and era-correct hardware'};
  const record=store.create(seed);
  await applyRecord(record);
  updateEmptyState();toggleLibrary(false);announce('loaded example campaign');
});

// progressive disclosure: once a panel's fields are all set and the operator
// moves on, collapse it to a one-line summary chip (edit button re-expands)
function briefSummaryText(){
  const objective=document.getElementById('campaignObjective');
  const angle=document.getElementById('storyAngle');
  const objectiveLabel=(objective.selectedOptions[0]?.textContent||'').toLowerCase();
  const angleLabel=(angle.selectedOptions[0]?.textContent||'').toLowerCase();
  const date=valueOf('campaignDate');
  const region=valueOf('targetRegion');
  const abbr={americas:'ET',europe:'CET',auNz:'AEST',sun:'follow the sun'}[region]||'';
  let dateLabel='';
  if(date){const parts=date.split('-').map(Number);const d=new Date(parts[0],(parts[1]||1)-1,parts[2]||1);dateLabel=d.toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'}).toLowerCase();}
  return [objectiveLabel,angleLabel,dateLabel,abbr].filter(Boolean).join(' · ');
}
function briefComplete(){return !!(valueOf('campaignObjective')&&valueOf('storyAngle')&&valueOf('campaignDate'));}
function setBriefCollapsed(collapsed){
  document.getElementById('briefPanel').classList.toggle('collapsed',collapsed);
  document.getElementById('briefSummaryChip').setAttribute('aria-expanded',String(!collapsed));
  if(collapsed)document.getElementById('briefSummaryText').textContent=briefSummaryText();
}
// the whole chip reopens the panel, not just the "edit" label — a collapsed
// panel is otherwise a dead end for anyone who wants to change an answer
document.getElementById('briefSummaryChip').addEventListener('click',()=>setBriefCollapsed(false));
document.getElementById('briefBody').addEventListener('focusout',()=>{
  setTimeout(()=>{if(briefComplete()&&!document.getElementById('briefBody').contains(document.activeElement))setBriefCollapsed(true);},0);
});

function imagesComplete(){return Number(document.getElementById('moodCount').textContent)>0&&document.getElementById('bagCount').textContent==='✓';}
function imagesSummaryText(){return document.getElementById('moodCount').textContent+' mood · bag '+(document.getElementById('bagCount').textContent==='✓'?'✓':'—');}
function setImagesCollapsed(collapsed){
  document.getElementById('imagesPanel').classList.toggle('collapsed',collapsed);
  document.getElementById('imagesSummaryChip').setAttribute('aria-expanded',String(!collapsed));
  if(collapsed)document.getElementById('imagesSummaryText').textContent=imagesSummaryText();
}
document.getElementById('imagesSummaryChip').addEventListener('click',()=>setImagesCollapsed(false));

function captureRecord(){
  active.fields=captureFields();
  active.outputs=Object.fromEntries(PLATFORMS.map(platform=>[outputIds[platform],document.getElementById(outputIds[platform]).value]));
  active.outputs.dm=dmRawText;
  active.outputs.dmTimezoneEnabled=!!document.getElementById('dmTimezoneEnabled')?.checked;
  active.outputs.arcTease=document.getElementById('arcTeaseCaption').value;
  active.outputs.arcProof=document.getElementById('arcProofCaption').value;
  active.results=Object.fromEntries(PLATFORMS.map(platform=>[platform,Object.fromEntries(RESULT_METRICS.map(metric=>[metric,document.getElementById(resultInputId(platform,metric))?.value||'']))]));
  active.schedule=Object.fromEntries(PLATFORMS.map(platform=>[timeIds[platform],document.getElementById(timeIds[platform]).value]));
  active.canvas=canvasStudio.getState();
  active.factory=factoryController?.getState()||active.factory||{};
  if(!active.title||active.title==='New archive campaign')active.title=active.fields.fName||'New archive campaign';
  return active;
}

function saveNow(){
  if(applying||!active)return;
  const ok=store.save(captureRecord());
  showSaveState(ok?'Saved · '+active.title:'Local save unavailable');
  renderLibrary();
}
function scheduleSave(){showSaveState('Saving…');clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,300);}

async function applyRecord(record){
  applying=true;active=record;store.setActive(record.id);
  for(const id of fieldIds)writeElement(id,record.fields?.[id]??intentionalDefaults[id]);
  for(const platform of PLATFORMS){
    document.getElementById(outputIds[platform]).value=record.outputs?.[outputIds[platform]]||'';
    writeElement(timeIds[platform],record.schedule?.[timeIds[platform]]||defaultSchedule()[timeIds[platform]]);
    const status=record.readiness?.[platform]||'draft';
    document.querySelector('[data-ready="'+platform+'"]').checked=status==='ready'||status==='posted';
  }
  canvasStudio.setState(record.canvas||{});
  dmRawText=record.outputs?.dm||'';
  if(document.getElementById('dmTimezoneEnabled'))document.getElementById('dmTimezoneEnabled').checked=!!record.outputs?.dmTimezoneEnabled;
  populateDmFields();
  const soldCard=document.getElementById('soldStoryCard');
  if(soldCard)soldCard.hidden=!record.fields?.soldToggle;
  document.getElementById('soldStoryOutputs').hidden=true;
  if(record.soldStory)renderSoldStory(record.soldStory);
  syncArcDefaults();
  document.getElementById('arcDotTease').classList.toggle('ready',!!record.arc?.tease?.ready);
  document.getElementById('arcDotProof').classList.toggle('ready',!!record.arc?.proof?.ready);
  document.getElementById('arcTeaseOutputs').hidden=!record.outputs?.arcTease;
  document.getElementById('arcProofOutputs').hidden=!record.outputs?.arcProof;
  document.getElementById('arcTeaseCaption').value=record.outputs?.arcTease||'';
  document.getElementById('arcProofCaption').value=record.outputs?.arcProof||'';
  document.getElementById('arcProofLabel').textContent=record.fields?.soldToggle&&record.outputs?.arcProof?'Proof slot → acquired offer':'Proof caption';
  for(const platform of PLATFORMS)for(const metric of RESULT_METRICS){const input=document.getElementById(resultInputId(platform,metric));if(input)input.value=record.results?.[platform]?.[metric]||'';}
  try{await canvasStudio.restoreImages(await loadCampaignImages(record.id));document.getElementById('imageStorageHint').textContent='Images save with this campaign.';}catch(error){await canvasStudio.restoreImages({});document.getElementById('imageStorageHint').textContent='Images will not survive reload in this browser.';}
  factoryController?.setState(record.factory||{});
  applying=false;
  if(!PLATFORMS.some(platform=>document.getElementById(outputIds[platform]).value.trim()))generateCampaign(false);
  validateAll();syncReadiness();updateCanvasLabel();updateCompleteness();updateDualClocks();updateTemplateSuggestions();showSaveState('Saved · '+active.title);renderLibrary();
}

// hook leaderboard: which strategy bucket backs each platform's line-one hook
function bankForPlatform(platform){
  if(platform==='instagram'||platform==='x')return ANGLE_SIGNAL[valueOf('storyAngle')]||'saves';
  if(platform==='tiktok')return 'retention';
  if(platform==='threads')return 'comments';
  return null; // telegram has no scroll-stopper hook to rank
}
function loadAllCampaigns(){return store.list().map(item=>store.load(item.id)).filter(Boolean);}
// "proven first": once results exist for this bank, start from the
// best-performing variant instead of the next one in rotation
function resolveVariant(platform,advance){
  if(advance)active.variants[platform]=(Number(active.variants[platform])||0)+1;
  let variant=Number(active.variants[platform])||0;
  if(advance&&document.getElementById('provenFirst')?.checked){
    const bank=bankForPlatform(platform);
    if(bank){
      const entries=aggregateHooks(loadAllCampaigns());
      if(entries.some(entry=>entry.bank===bank)){variant=bestVariantForBank(entries,bank,valueOf('targetRegion'));active.variants[platform]=variant;}
    }
  }
  return variant;
}
function captureSnapshot(platform,facts,variant,hookTextOverride){
  const bank=bankForPlatform(platform);if(!bank)return;
  const hookText=hookTextOverride??(platform==='tiktok'?signalHook(facts,'retention',variant):platform==='threads'?signalHook(facts,'comments',variant):viralHook(facts,variant));
  active.snapshots=active.snapshots||{};
  active.snapshots[platform]={bank,variant,hookText,template:canvasStudio.getTemplate().label,region:valueOf('targetRegion')};
}
function generatePlatform(platform,advance=true){
  const variant=resolveVariant(platform,advance);
  const facts=campaignFacts();
  document.getElementById(outputIds[platform]).value=applySpelling(COPY_MAKERS[platform](facts,variant),spellingMode());
  captureSnapshot(platform,facts,variant);
  validatePlatform(platform);scheduleSave();
}
function generateCampaign(scroll=true){PLATFORMS.forEach(platform=>generatePlatform(platform,true));if(scroll)document.getElementById('channels').scrollIntoView({behavior:'smooth'});}

// DM desk: nine reference scripts parsed out of one COPY_MAKERS.dm blob so
// each gets its own copy button; deliberately outside PLATFORMS, so it never
// touches the 5-channel readiness meter
const dmFieldIds={enquiry:'dmEnquiry',provenance:'dmProvenance',shipping:'dmShipping',lowballFirst:'dmLowballFirst',lowballSecond:'dmLowballSecond',lowballThird:'dmLowballThird',close:'dmClose',secondCollector:'dmSecondCollector',timezone:'dmTimezone'};
// dmRawText stays the pristine, unconverted blob — parseDmSections matches on
// literal section headers like "ENQUIRY REPLY", and applySpelling's own
// enquiry→inquiry rule would silently break that match if applied here first.
// Spelling is applied only at the point of display/export, never to the
// parseable source.
let dmRawText='';
function populateDmFields(){
  const sections=parseDmSections(dmRawText);
  const mode=spellingMode();
  const timezoneOn=!!document.getElementById('dmTimezoneEnabled')?.checked;
  for(const [key,id] of Object.entries(dmFieldIds)){
    const el=document.getElementById(id);if(!el)continue;
    el.value=(key==='timezone'&&!timezoneOn)?'':applySpelling(sections[key]||'',mode);
  }
}
function generateDm(){dmRawText=COPY_MAKERS.dm(campaignFacts());populateDmFields();scheduleSave();}
document.getElementById('genDm')?.addEventListener('click',generateDm);
document.getElementById('dmTimezoneEnabled')?.addEventListener('change',()=>{populateDmFields();scheduleSave();});
document.querySelectorAll('[data-dm-copy]').forEach(button=>button.addEventListener('click',()=>{
  const id=dmFieldIds[button.dataset.dmCopy];if(!id)return;
  copyText(document.getElementById(id).value,button);
}));

// sold-story engine: offered, never auto-posted — turns every sale into the
// next sale's proof. hasAnotherOpenCampaign checks every OTHER saved record
// for one that is not marked sold, to pick the truthful forward line.
function hasAnotherOpenCampaign(){
  return store.list().some(item=>item.id!==active.id&&!store.load(item.id)?.fields?.soldToggle);
}
const soldFieldIds={instagramCaption:'soldInstagram',storyLine:'soldStoryLine',telegramLine:'soldTelegram'};
function renderSoldStory(pack){
  if(!pack)return;
  for(const [key,id] of Object.entries(soldFieldIds))document.getElementById(id).value=pack[key]||'';
  document.getElementById('soldStoryOutputs').hidden=false;
}
document.getElementById('soldToggle')?.addEventListener('change',e=>{
  const card=document.getElementById('soldStoryCard');if(card)card.hidden=!e.target.checked;
  if(e.target.checked)active.soldAt=active.soldAt||localDate(); // first time only — the desk review's days-to-acquired anchor
  else{document.getElementById('soldStoryOutputs').hidden=true;active.soldStory=null;active.soldAt=null;}
  scheduleSave();
});
document.getElementById('genSoldStory')?.addEventListener('click',()=>{
  const facts=campaignFacts();
  const pack=makeSoldStoryPack(facts,{region:valueOf('soldRegion'),hasAnotherOpenCampaign:hasAnotherOpenCampaign()});
  const mode=spellingMode();
  for(const key of Object.keys(pack))pack[key]=applySpelling(pack[key],mode);
  active.soldStory=pack;
  renderSoldStory(pack);
  scheduleSave();
});
document.querySelectorAll('[data-sold-copy]').forEach(button=>button.addEventListener('click',()=>{
  const id=soldFieldIds[button.dataset.soldCopy];if(!id)return;
  copyText(document.getElementById(id).value,button);
}));

// drop arc: tease (T-1) and proof (T+1) around the reveal (the existing
// five-channel pack, unchanged). Dates default around campaignDate but only
// while the operator hasn't already set their own — never overwrite an edit.
function addDays(dateStr,delta){
  const [y,m,d]=String(dateStr||'').split('-').map(Number);if(!y||!m||!d)return '';
  const date=new Date(y,m-1,d);date.setDate(date.getDate()+delta);
  const pad=value=>String(value).padStart(2,'0');
  return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
}
function syncArcDefaults(){
  const campaignDate=valueOf('campaignDate');if(!campaignDate)return;
  if(!valueOf('arcTeaseDate'))writeElement('arcTeaseDate',addDays(campaignDate,-1));
  if(!valueOf('arcProofDate'))writeElement('arcProofDate',addDays(campaignDate,1));
}
function weekdayLabel(dateStr){
  const [y,m,d]=String(dateStr||'').split('-').map(Number);if(!y||!m||!d)return '';
  return new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'long'}).toLowerCase();
}
let teaseVariant=0;
document.getElementById('genTease')?.addEventListener('click',async()=>{
  const facts=campaignFacts();
  document.getElementById('arcTeaseCaption').value=applySpelling(makeTeaseCaption(facts,teaseVariant++,weekdayLabel(valueOf('campaignDate'))),spellingMode());
  document.getElementById('arcTeaseOutputs').hidden=false;
  document.getElementById('arcDotTease').classList.add('ready');
  active.arc={...(active.arc||{}),tease:{...(active.arc?.tease||{}),ready:true}};
  try{await canvasStudio.renderTeaseBlob('reel');}catch(error){}
  scheduleSave();
});
document.getElementById('genProof')?.addEventListener('click',()=>{
  const facts=campaignFacts();
  const label=document.getElementById('arcProofLabel'),output=document.getElementById('arcProofCaption');
  if(facts.sold){
    label.textContent='Proof slot → acquired offer';
    output.value=applySpelling(makeSoldStory(facts,{region:valueOf('soldRegion'),hasAnotherOpenCampaign:hasAnotherOpenCampaign()}),spellingMode());
  } else {
    label.textContent='Proof caption';
    output.value=applySpelling(makeProofCaption(facts),spellingMode());
  }
  document.getElementById('arcProofOutputs').hidden=false;
  document.getElementById('arcDotProof').classList.add('ready');
  active.arc={...(active.arc||{}),proof:{...(active.arc?.proof||{}),ready:true}};
  scheduleSave();
});
document.querySelectorAll('[data-arc-copy]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.arcCopy==='tease'?'arcTeaseCaption':'arcProofCaption';
  copyText(document.getElementById(id).value,button);
}));

function validationLabel(result){
  const parts=result.counts.map((count,index)=>(result.counts.length>1?'post '+(index+1)+' ':'')+count+'/'+result.limit);
  if(result.platform==='tiktok'&&result.softOver&&!result.over)parts.push('under 300 suggested');
  return parts.join(' · ');
}
function validatePlatform(platform){
  const output=document.getElementById(outputIds[platform]);const result=validateOutput(platform,output.value);const counter=document.getElementById(countIds[platform]);
  counter.innerHTML=result.counts.map((count,index)=>'<span class="post-count '+(count>result.limit?'over':'')+'">'+(result.counts.length>1?'post '+(index+1)+' ':'')+count+'/'+result.limit+'</span>').join(' · ');counter.classList.toggle('counter-warning',result.over||result.softOver);
  const card=output.closest('.channel-card');card.classList.toggle('limit-warning',result.over);
  const ready=card.querySelector('.ready-label');ready.classList.toggle('warning',result.over&&ready.querySelector('input').checked);
  let note=card.querySelector('.validation-note');if(!note){note=document.createElement('div');note.className='validation-note inline-status';card.querySelector('.channel-meta').after(note);}
  note.textContent=result.over?'post '+(result.worstIndex+1)+' is '+result.worst+'/'+result.limit:result.softOver?'caption is '+result.worst+' characters; under '+result.soft+' is suggested':'';note.hidden=!note.textContent;
  if(platform==='x')document.getElementById('xLimit').textContent='280 per post';
  return result;
}
function validateAll(){return Object.fromEntries(PLATFORMS.map(platform=>[platform,validatePlatform(platform)]));}

// nudges toward richer facts before generation — empty provenance/detail/auth
// fields silently fall back to generic lead-bank lines, so this surfaces the gap
const QUALITY_FIELDS=['fProv','fMaterial','fCondition','fAuth','fDetail'];
function updateCompleteness(){
  const note=document.getElementById('completenessHint');if(!note)return;
  const filled=QUALITY_FIELDS.filter(id=>(document.getElementById(id)?.value||'').trim()).length;
  note.textContent=filled+'/'+QUALITY_FIELDS.length+' record fields complete — richer facts produce stronger copy across every channel.';
}

async function copyText(text,button){
  try{await navigator.clipboard.writeText(text);}catch(error){const helper=document.createElement('textarea');helper.value=text;helper.setAttribute('readonly','');helper.style.position='fixed';helper.style.opacity='0';document.body.appendChild(helper);helper.select();helper.setSelectionRange(0,helper.value.length);document.execCommand('copy');helper.remove();}
  const old=button?.textContent;if(button){button.textContent='Copied ✓';setTimeout(()=>button.textContent=old,1400);}announce('Copied to clipboard');
}

function readinessStatus(platform){return active.readiness?.[platform]||'draft';}
function syncReadiness(){
  let readyCount=0,postedCount=0;
  for(const platform of PLATFORMS){
    const status=readinessStatus(platform);if(status==='ready'||status==='posted')readyCount++;if(status==='posted')postedCount++;
    const checkbox=document.querySelector('[data-ready="'+platform+'"]');checkbox.checked=status==='ready'||status==='posted';
    const row=document.querySelector('[data-queue="'+platform+'"]');const dot=row.querySelector('.status-dot');const label=row.querySelector('.queue-status');
    row.classList.toggle('posted',status==='posted');dot.classList.toggle('ready',status==='ready');label.textContent=status==='posted'?'Posted':status==='ready'?'Ready':'Draft';
  }
  const progress=postedCount===5?5:readyCount;document.getElementById('pulseFill').style.width=(progress/5*100)+'%';document.getElementById('pulseText').textContent=postedCount===5?'campaign complete':readyCount+' / 5 ready';
  setupPostingDay();
  updateReadinessChips();
}

// drive-to-done chip row: a scannable, clickable checklist under the pulse —
// each chip jumps to its section instead of leaving the operator to scroll
let pngGenerated=false;
const touchedTimes=new Set();
function updateReadinessChips(){
  const chips=document.getElementById('readinessChips');if(!chips||!active)return;
  const packReady=PLATFORMS.filter(platform=>['ready','posted'].includes(readinessStatus(platform))).length;
  const scheduled=PLATFORMS.every(platform=>touchedTimes.has(platform));
  const visual=imagesComplete()||pngGenerated;
  const label=(target,text,done)=>{const el=chips.querySelector('[data-chip-target="'+target+'"]');if(el)el.textContent=text+' '+(done?'✓':'✗');};
  label('brief','Brief',briefComplete());
  label('imagesPanel','Images',imagesComplete());
  label('stage','Visual',visual);
  const pack=chips.querySelector('[data-chip-target="channels"]');if(pack)pack.textContent='Pack '+packReady+'/5';
  label('queue','Scheduled',scheduled);
}
// jumping to a section reopens it if it collapsed — scrolling someone to a
// panel they still can't edit is the same as not taking them there
function expandTarget(target){
  if(target==='brief'||target==='briefPanel')setBriefCollapsed(false);
  if(target==='imagesPanel')setImagesCollapsed(false);
}
document.querySelectorAll('#readinessChips .chip').forEach(chip=>chip.addEventListener('click',()=>{
  expandTarget(chip.dataset.chipTarget);
  document.getElementById(chip.dataset.chipTarget)?.scrollIntoView({behavior:'smooth',block:'start'});
}));
document.querySelectorAll('.campaign-nav a').forEach(link=>link.addEventListener('click',()=>{
  expandTarget(link.getAttribute('href').slice(1));
}));
document.getElementById('exportBtn')?.addEventListener('click',()=>{pngGenerated=true;updateReadinessChips();});

// template recommendation by objective — never auto-switches the selection,
// just marks the two proof cells whose commercial job matches the brief
const TEMPLATE_SUGGESTIONS={drop:['maison','noir'],educate:['specimen','dossier'],profile:['atelier','editorial']};
function updateTemplateSuggestions(){
  const objective=valueOf('campaignObjective');
  const angle=valueOf('storyAngle');
  const ids=TEMPLATE_SUGGESTIONS[objective]||(angle==='styling'?['runway','snapshot']:[]);
  document.querySelectorAll('.proof .cell').forEach((cell,index)=>{
    cell.classList.toggle('suggested',ids.includes(TEMPLATE_META[index]?.id));
  });
}

function updateDualClocks(){
  const region=valueOf('targetRegion')||'americas';
  const date=valueOf('campaignDate')||localDate();
  for(const platform of PLATFORMS){
    const clock=document.getElementById(clockIds[platform]);if(!clock)continue;
    const [hh,mm]=valueOf(timeIds[platform]).split(':').map(Number);
    clock.textContent=Number.isFinite(hh)&&Number.isFinite(mm)?dualClockLabel(region,platform,date,hh,mm):'';
  }
}

function setupPostingDay(){
  const postingDay=valueOf('campaignDate')===localDate();const body=document.querySelector('.queue tbody');
  const rows=Array.from(body.querySelectorAll('tr[data-queue]'));
  if(postingDay)rows.sort((a,b)=>valueOf(timeIds[a.dataset.queue]).localeCompare(valueOf(timeIds[b.dataset.queue]))).forEach(row=>body.appendChild(row));
  for(const row of rows){row.dataset.postingDay=postingDay?'true':'false';row.setAttribute('aria-disabled',postingDay?'false':'true');row.title=postingDay?'Copy post and mark as posted':'One-tap posting activates on the campaign date';}
}

async function useQueueRow(row){
  if(row.dataset.postingDay!=='true')return;
  const platform=row.dataset.queue;await copyText(document.getElementById(outputIds[platform]).value,row.querySelector('.queue-status'));active.readiness[platform]='posted';syncReadiness();scheduleSave();announce(platform+' marked posted');
}

function timeAgo(iso){
  const minutes=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000));if(minutes<1)return 'just now';if(minutes<60)return minutes+'m ago';const hours=Math.round(minutes/60);if(hours<24)return hours+'h ago';return Math.round(hours/24)+'d ago';
}
function escapeHtml(text){const div=document.createElement('div');div.textContent=String(text||'');return div.innerHTML;}
function renderLibrary(){
  const list=store.list();document.getElementById('campaignList').innerHTML=list.map(item=>`
    <article class="campaign-item ${item.id===active?.id?'active':''}" data-campaign-id="${item.id}">
      ${item.sold?'<span class="acquired-chip">Acquired</span>':''}
      <h3>${escapeHtml(item.title)}</h3>
      <div class="campaign-item-meta">NO. ${escapeHtml(item.archiveNo)} · ${escapeHtml(item.pieceName)} · ${timeAgo(item.updatedAt)}</div>
      <div class="campaign-item-progress"><span style="width:${((item.posted||item.ready)/item.total)*100}%"></span></div>
      <div class="campaign-item-meta">${item.complete?'campaign complete':item.ready+'/'+item.total+' ready'}</div>
      <div class="campaign-item-actions"><button class="btn small" data-library-action="open">Open</button><button class="btn small ghost" data-library-action="duplicate">Duplicate</button><button class="btn small ghost" data-library-action="rename">Rename</button>${item.sold?'<button class="btn small ghost" data-library-action="sold-story">Sold story</button>':''}${remoteEnabled()?'<button class="btn small ghost" data-library-action="sync">Sync to cloud</button>':''}<button class="text-link" data-library-action="delete">Delete</button></div>
    </article>`).join('')||'<p class="hint">No campaigns yet.</p>';
}
function toggleLibrary(show){const panel=document.getElementById('campaignLibrary');panel.hidden=!show;document.getElementById('campaignLibraryButton').setAttribute('aria-expanded',String(show));if(show){renderLibrary();renderLeaderboard();renderDeskReview();panel.scrollIntoView({behavior:'smooth',block:'start'});}}

async function openCampaign(id){saveNow();const record=store.load(id);if(record){await applyRecord(record);toggleLibrary(false);announce('Opened '+record.title);}}
async function deleteActiveOrOpenNext(id){
  const deletingActive=active?.id===id;store.delete(id);try{await deleteCampaignImages(id);}catch(error){}
  if(deletingActive){const next=store.list()[0];active=next?store.load(next.id):store.create(freshSeed());await applyRecord(active);}renderLibrary();
}

function campaignBriefText(){const facts=campaignFacts();return ['RAREBAGCLUB CAMPAIGN BRIEF','Archive no. '+facts.no,facts.name,present([facts.provenance,facts.material,facts.condition,facts.auth]),'Objective: '+facts.objective,'Campaign date: '+facts.date,'Acquisition route: '+facts.route,facts.url].filter(Boolean).join('\n');}
function scheduleText(){return PLATFORMS.map(platform=>platform.toUpperCase()+' · '+valueOf('campaignDate')+' · '+valueOf(timeIds[platform])+' · '+readinessStatus(platform).toUpperCase()).join('\n');}
function copyPackText(){return [campaignBriefText(),'','PUBLISHING QUEUE',scheduleText(),'',...PLATFORMS.flatMap(platform=>[platform.toUpperCase(),document.getElementById(outputIds[platform]).value,'']),...(dmRawText.trim()?['DM DESK',applySpelling(dmRawText,spellingMode()),'']:[])].join('\n');}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportName(extension){return 'rbc-campaign-'+(valueOf('fNo')||'000')+'-'+(valueOf('campaignDate')||localDate()).replace(/-/g,'')+'.'+extension;}
function nextFrame(){return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));}

const REEL_SEQUENCE_TIMING=[
  '1-hook.png    0:00-0:02  the opening frame the reel is currently exported as - the scroll-stopper',
  '2-record.png  0:02-0:05  provenance, material and authentication - the proof beat',
  '3-cta.png     0:05-0:08  price, name and the call to action',
  '',
  'Combine in CapCut, InShot or your editor of choice, holding each frame for its listed span.',
  'Pair with the TikTok shot list and voiceover below for narration timing.'
].join('\n');

async function exportZip(){
  const status=document.getElementById('exportProgress');document.body.classList.add('exporting');
  try{
    status.textContent='Rendering Instagram feed 1/7';const instagramFeed=await canvasStudio.renderBlob('feed');await nextFrame();
    status.textContent='Rendering Instagram reel 2/7';const instagramReel=await canvasStudio.renderBlob('reel');await nextFrame();
    const tiktok=parseTiktokSections(document.getElementById('outTiktok').value);status.textContent='Rendering TikTok cover 3/7';const cover=await canvasStudio.renderBlob('reel',{coverText:tiktok.cover});await nextFrame();
    status.textContent='Rendering Telegram visual 4/7';const telegramFeed=await canvasStudio.renderBlob('feed');await nextFrame();
    status.textContent='Rendering Threads visual 5/7';const threadsFeed=await canvasStudio.renderBlob('feed');await nextFrame();
    status.textContent='Rendering X visual 6/7';const xFeed=await canvasStudio.renderBlob('feed');await nextFrame();
    status.textContent='Rendering reel sequence 7/7';const sequence=await canvasStudio.renderSequenceBlobs();await nextFrame();
    const entries=[{name:'campaign-brief.txt',data:campaignBriefText()},{name:'schedule.txt',data:scheduleText()}];
    for(const platform of PLATFORMS){entries.push({name:platform+'/copy.txt',data:document.getElementById(outputIds[platform]).value});}
    entries.push({name:'instagram/feed.png',data:instagramFeed},{name:'instagram/reel-story.png',data:instagramReel},{name:'tiktok/visual.png',data:instagramReel},{name:'tiktok/cover.png',data:cover},{name:'tiktok/shot-list.txt',data:tiktok.shots},{name:'tiktok/voiceover.txt',data:tiktok.voiceover},{name:'telegram/feed.png',data:telegramFeed},{name:'threads/feed.png',data:threadsFeed},{name:'x/feed.png',data:xFeed});
    entries.push(
      {name:'reel-sequence/1-hook.png',data:sequence.hook},
      {name:'reel-sequence/2-record.png',data:sequence.record},
      {name:'reel-sequence/3-cta.png',data:sequence.cta},
      {name:'reel-sequence/timing.txt',data:REEL_SEQUENCE_TIMING}
    );
    if(dmRawText.trim())entries.push({name:'dm-scripts.txt',data:applySpelling(dmRawText,spellingMode())});
    const teaseCaption=document.getElementById('arcTeaseCaption').value;
    if(teaseCaption.trim()){
      status.textContent='Rendering tease visual';const teaseVisual=await canvasStudio.renderTeaseBlob('reel');await nextFrame();
      entries.push({name:'tease/visual.png',data:teaseVisual},{name:'tease/caption.txt',data:teaseCaption});
    }
    const proofCaption=document.getElementById('arcProofCaption').value;
    if(proofCaption.trim())entries.push({name:'proof/visual.png',data:sequence.record},{name:'proof/caption.txt',data:proofCaption});
    status.textContent='Building ZIP';downloadBlob(await createZip(entries),exportName('zip'));status.textContent='Complete posting pack exported';
  }catch(error){status.textContent='Export failed: '+error.message;}finally{document.body.classList.remove('exporting');}
}

// assembles the hook → record → CTA sequence into a real moving reel in the
// browser (no ffmpeg, no upload). Where the platform lacks MediaRecorder, the
// same three beats are still in the ZIP as timed PNG frames.
const REEL_BEAT_LABELS=['hook (0:00-0:02)','record (0:02-0:05)','call to action (0:05-0:08)'];
async function exportReelVideo(){
  const status=document.getElementById('exportProgress');
  if(!canvasStudio.sequenceVideoSupported()){status.textContent='This browser cannot record video. The three reel frames are in the ZIP pack (Export ZIP pack) to assemble in CapCut or InShot.';return;}
  document.body.classList.add('exporting');
  try{
    const video=await canvasStudio.renderSequenceVideo({onBeat:(index)=>{status.textContent='Recording reel · '+REEL_BEAT_LABELS[index];}});
    if(!video){status.textContent='Reel video capture returned nothing. The three reel frames are in the ZIP pack instead.';return;}
    const extension=video.type.includes('mp4')?'mp4':'webm';
    const stamp=(valueOf('campaignDate')||localDate()).replace(/-/g,'');
    downloadBlob(video,'rbc-reel-'+(valueOf('fNo')||'000')+'-'+stamp+'.'+extension);
    status.textContent='Reel video exported ('+extension+')';
  }catch(error){status.textContent='Reel video failed: '+error.message;}finally{document.body.classList.remove('exporting');}
}

function updateCanvasLabel(){const template=canvasStudio.getTemplate();const state=canvasStudio.getState();canvasStudio.stage.setAttribute('aria-label',template.label+' template, '+state.fmt+' format. Use arrow keys to move '+state.dragMode+'. Hold Shift for larger movement.');}

document.getElementById('generatePack').addEventListener('click',()=>generateCampaign(true));
document.getElementById('dockGenerate').addEventListener('click',()=>generateCampaign(true));
document.querySelectorAll('[data-regenerate]').forEach(button=>button.addEventListener('click',()=>generatePlatform(button.dataset.regenerate,true)));
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',()=>copyText(document.getElementById(button.dataset.copy).value,button)));

document.querySelectorAll('.ready-check').forEach(checkbox=>checkbox.addEventListener('change',()=>{const platform=checkbox.dataset.ready;active.readiness[platform]=checkbox.checked?'ready':'draft';validatePlatform(platform);syncReadiness();scheduleSave();}));
document.querySelectorAll('.result-input').forEach(input=>input.addEventListener('input',()=>scheduleSave()));

// desk record: aggregates hook performance across every saved campaign,
// ranked by dms then saves, top 3 per strategy bucket
const BANK_LABELS={saves:'Insider / gatekeep · saves',sends:'Send-to-a-friend · shares',comments:'Question / hot take · comments',retention:'List / reveal · retention',aspiration:'Aspiration / flex · profile visits',scarcity:'Scarcity / FOMO · urgency'};
function renderLeaderboard(){
  const body=document.getElementById('leaderboardBody');if(!body)return;
  const region=document.getElementById('leaderboardRegion')?.value||'all';
  const entries=aggregateHooks(loadAllCampaigns());
  const byBank=rankByBank(entries,region);
  const banks=Object.keys(byBank);
  if(!banks.length){body.innerHTML='<p class="hint">No results logged yet. Enter views/saves/dms in the queue to start the desk record.</p>';return;}
  const maxDms=Math.max(1,...banks.flatMap(bank=>byBank[bank].map(entry=>entry.dms)));
  body.innerHTML=banks.map(bank=>`
    <div class="leaderboard-bank">
      <h4>${escapeHtml(BANK_LABELS[bank]||bank)}</h4>
      ${byBank[bank].map(entry=>`
        <div class="leaderboard-row">
          <span class="leaderboard-hook">${escapeHtml(entry.hookText||'(hook text unavailable)')}</span>
          <span class="leaderboard-meta">${entry.dms} dms · ${entry.saves} saves</span>
          <div class="leaderboard-bar-track"><div class="leaderboard-bar-fill" style="width:${Math.round(entry.dms/maxDms*100)}%"></div></div>
        </div>`).join('')}
    </div>`).join('');
}
document.getElementById('leaderboardRegion')?.addEventListener('change',renderLeaderboard);

// desk review: the monthly retro that closes the leaderboard's loop
function renderDeskReview(){
  const body=document.getElementById('deskReviewBody');if(!body)return;
  const months=buildMonthlyReview(loadAllCampaigns());
  if(!months.length){body.innerHTML='<p class="hint">No campaigns dated yet. The review fills in once campaigns have a campaign date and results.</p>';return;}
  body.innerHTML=months.map(month=>{
    const rows=[['Drops posted',String(month.dropsPosted)],['Sell-through',month.sellThrough.sold+'/'+month.sellThrough.total]];
    if(month.medianDaysToAcquired!==null)rows.push(['Median days-to-acquired',String(month.medianDaysToAcquired)]);
    if(month.bestHook)rows.push(['Best hook','"'+escapeHtml(month.bestHook.hookText||'')+'" · '+escapeHtml(month.bestHook.bank)+' · '+month.bestHook.dms+' dms']);
    if(month.bestTemplate)rows.push(['Best template',escapeHtml(month.bestTemplate.template)+' · '+month.bestTemplate.dms+' dms']);
    const sellThroughPct=month.sellThrough.total?Math.round(month.sellThrough.sold/month.sellThrough.total*100):0;
    return `
      <div class="review-month">
        <h4>${escapeHtml(month.label)}</h4>
        <table class="review-table">${rows.map(([label,value])=>`<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`).join('')}</table>
        <div class="review-bar-row"><span>Sell-through</span><div class="leaderboard-bar-track"><div class="leaderboard-bar-fill" style="width:${sellThroughPct}%"></div></div></div>
        ${month.insight?`<p class="review-insight">${escapeHtml(month.insight)}</p>`:''}
      </div>`;
  }).join('');
}
document.querySelectorAll('[data-output]').forEach(output=>output.addEventListener('input',()=>{validatePlatform(output.dataset.output);scheduleSave();}));
function timeIdPlatform(id){return PLATFORMS.find(platform=>timeIds[platform]===id);}
document.addEventListener('input',event=>{if(fieldIds.includes(event.target.id)||Object.values(timeIds).includes(event.target.id)){scheduleSave();if(QUALITY_FIELDS.includes(event.target.id))updateCompleteness();if(Object.values(timeIds).includes(event.target.id)||event.target.id==='campaignDate'||event.target.id==='targetRegion')updateDualClocks();const platform=timeIdPlatform(event.target.id);if(platform)touchedTimes.add(platform);updateReadinessChips();}});
document.addEventListener('change',event=>{if(fieldIds.includes(event.target.id)||Object.values(timeIds).includes(event.target.id)){if(event.target.id==='campaignDate'){setupPostingDay();syncArcDefaults();}scheduleSave();if(Object.values(timeIds).includes(event.target.id)||event.target.id==='campaignDate'||event.target.id==='targetRegion')updateDualClocks();if(event.target.id==='campaignObjective'||event.target.id==='storyAngle')updateTemplateSuggestions();updateReadinessChips();}});

document.getElementById('suggestTimes')?.addEventListener('click',()=>{
  const region=valueOf('targetRegion')||'americas';
  const date=valueOf('campaignDate')||localDate();
  const times=suggestTimes(region,date);
  for(const platform of PLATFORMS)if(times[platform]){writeElement(timeIds[platform],times[platform]);touchedTimes.add(platform);}
  // follow-the-sun also fills the tease (AEST morning) and proof (CET morning)
  // acts, so one drop genuinely touches all three markets inside 24 hours
  if(region==='sun'){
    syncArcDefaults();
    const teaseDate=valueOf('arcTeaseDate'),proofDate=valueOf('arcProofDate');
    if(teaseDate)writeElement('arcTeaseTime',formatOperatorTime(zonedWallTimeToUtc(teaseDate,8,0,'Australia/Sydney')));
    if(proofDate)writeElement('arcProofTime',formatOperatorTime(zonedWallTimeToUtc(proofDate,8,0,'Europe/Berlin')));
  }
  updateDualClocks();scheduleSave();updateReadinessChips();announce('suggested times filled for '+region);
});

document.getElementById('genTiktokHook')?.addEventListener('click',()=>{
  const strat=document.getElementById('tiktokHookStrat').value;
  const facts=campaignFacts();
  const variant=Number(active.variants.tiktok)||0;
  const hook=signalHook(facts,strat,variant);
  document.getElementById('outTiktok').value=makeTiktok(facts,variant,hook);
  active.snapshots=active.snapshots||{};
  active.snapshots.tiktok={bank:strat,variant,hookText:hook,template:canvasStudio.getTemplate().label,region:valueOf('targetRegion')};
  validatePlatform('tiktok');scheduleSave();
});

document.querySelectorAll('[data-platform-tab]').forEach((tab,index,tabs)=>{
  tab.tabIndex=index===0?0:-1;
  tab.addEventListener('click',()=>{tabs.forEach(item=>{const on=item===tab;item.classList.toggle('active',on);item.setAttribute('aria-selected',String(on));item.tabIndex=on?0:-1;});document.querySelectorAll('.channel-card').forEach(card=>card.classList.toggle('active',card.dataset.platform===tab.dataset.platformTab));});
  tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;tabs[next].focus();tabs[next].click();});
});

canvasStudio.stage.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?.05:.01;const directions={ArrowUp:[0,-step],ArrowDown:[0,step],ArrowLeft:[-step,0],ArrowRight:[step,0]};canvasStudio.nudge(...directions[event.key]);document.getElementById('canvasLive').textContent=canvasStudio.getState().dragMode+' moved';});
['modeBag','modeText','fmtFeed','fmtReel'].forEach(id=>document.getElementById(id).addEventListener('click',()=>{setTimeout(()=>{updateCanvasLabel();document.getElementById('canvasLive').textContent=id.startsWith('mode')?canvasStudio.getState().dragMode+' positioning mode':canvasStudio.getState().fmt+' format';},0);}));

document.querySelectorAll('.queue tr[data-queue]').forEach(row=>{row.addEventListener('click',event=>{if(event.target.matches('input'))return;useQueueRow(row);});row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();useQueueRow(row);}});});
document.getElementById('exportPack').addEventListener('click',exportZip);
document.getElementById('exportReel')?.addEventListener('click',exportReelVideo);
document.getElementById('exportCopy').addEventListener('click',()=>downloadBlob(new Blob([copyPackText()],{type:'text/plain;charset=utf-8'}),exportName('txt')));
document.getElementById('exportCalendar').addEventListener('click',()=>{
  const region=valueOf('targetRegion')||'americas';const date=valueOf('campaignDate')||localDate();
  const events=PLATFORMS.map(platform=>{
    const [hh,mm]=valueOf(timeIds[platform]).split(':').map(Number);
    const buyerLabel=Number.isFinite(hh)&&Number.isFinite(mm)?dualClockLabel(region,platform,date,hh,mm):'';
    return {platform,time:valueOf(timeIds[platform]),copy:document.getElementById(outputIds[platform]).value,buyerLabel};
  });
  // arc acts, one VEVENT per channel actually used: tease → instagram + tiktok,
  // proof → instagram story + threads — only when each act has been generated
  const teaseCaption=document.getElementById('arcTeaseCaption').value;
  if(teaseCaption.trim()){
    const teaseDate=valueOf('arcTeaseDate')||date,teaseTime=valueOf('arcTeaseTime');
    events.push({platform:'instagram (tease)',uid:'instagram-tease',date:teaseDate,time:teaseTime,copy:teaseCaption});
    events.push({platform:'tiktok (tease)',uid:'tiktok-tease',date:teaseDate,time:teaseTime,copy:teaseCaption});
  }
  const proofCaption=document.getElementById('arcProofCaption').value;
  if(proofCaption.trim()){
    const proofDate=valueOf('arcProofDate')||date,proofTime=valueOf('arcProofTime');
    events.push({platform:'instagram story (proof)',uid:'instagram-story-proof',date:proofDate,time:proofTime,copy:proofCaption});
    events.push({platform:'threads (proof)',uid:'threads-proof',date:proofDate,time:proofTime,copy:proofCaption});
  }
  downloadBlob(new Blob([buildCalendar({campaignId:active.id,title:active.title,date,events})],{type:'text/calendar;charset=utf-8'}),exportName('ics'));
});

document.getElementById('campaignLibraryButton').addEventListener('click',()=>toggleLibrary(document.getElementById('campaignLibrary').hidden));
document.getElementById('closeLibrary').addEventListener('click',()=>toggleLibrary(false));
document.getElementById('newCampaign').addEventListener('click',async()=>{saveNow();const record=store.create(freshSeed());await applyRecord(record);toggleLibrary(false);announce('New campaign created');});
document.getElementById('campaignList').addEventListener('click',async event=>{
  const action=event.target.dataset.libraryAction;if(!action)return;const card=event.target.closest('[data-campaign-id]');const id=card.dataset.campaignId;
  if(action==='open')return openCampaign(id);
  if(action==='duplicate'){saveNow();const duplicate=store.duplicate(id);try{await duplicateCampaignImages(id,duplicate.id);}catch(error){}await applyRecord(duplicate);toggleLibrary(false);return;}
  if(action==='rename'){const record=store.load(id);const title=prompt('Campaign name',record.title);if(title!==null)store.rename(id,title);if(active.id===id)active=store.load(id);renderLibrary();return;}
  if(action==='sold-story'){await openCampaign(id);document.getElementById('soldStoryCard')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(action==='sync'){
    saveNow();
    try{
      const result=await syncCampaignToCloud(store,id,{getCredentials:async()=>{
        const email=prompt('Cloud sign-in email');if(!email)return null;
        const password=prompt('Password for '+email);if(!password)return null;
        return {email,password};
      }});
      if(result.synced)announce('Synced to cloud'+(result.remoteCampaignId?' · '+result.remoteCampaignId:''));
      else announce('Cloud sync: '+(result.reason||'no change'));
    }catch(error){announce('Cloud sync failed: '+error.message);}
    return;
  }
  if(action==='delete'&&confirm('Delete this campaign and its saved images?'))return deleteActiveOrOpenNext(id);
});

document.getElementById('resetCampaign').addEventListener('click',async()=>{if(!confirm('Reset this campaign and remove its saved images?'))return;const id=active.id,createdAt=active.createdAt,title=active.title;active={...store.create(freshSeed()),id,createdAt,title};store.delete(store.activeId());store.setActive(id);try{await deleteCampaignImages(id);}catch(error){}store.save(active);await applyRecord(active);announce('Campaign reset');});

const aiEnabled=document.getElementById('aiEnabled');
try{aiEnabled.checked=localStorage.getItem('rbc-studio-ai-enabled')==='true';}catch(error){}
document.getElementById('aiKey').value=getAiKey();
function syncAiButtons(){document.querySelectorAll('.ai-polish').forEach(button=>button.hidden=!aiEnabled.checked);}
aiEnabled.addEventListener('change',()=>{try{localStorage.setItem('rbc-studio-ai-enabled',String(aiEnabled.checked));}catch(error){}syncAiButtons();});
document.getElementById('saveAiKey').addEventListener('click',()=>{const ok=setAiKey(document.getElementById('aiKey').value.trim());document.getElementById('aiStatus').textContent=ok?'API key saved in this browser.':'Key could not be saved.';});
document.getElementById('removeAiKey').addEventListener('click',()=>{setAiKey('');document.getElementById('aiKey').value='';document.getElementById('aiStatus').textContent='API key removed.';});
document.querySelectorAll('[data-ai]').forEach(button=>button.addEventListener('click',async()=>{const platform=button.dataset.ai;const status=document.getElementById('aiStatus');button.disabled=true;status.textContent='Polishing '+platform+'…';try{document.getElementById(outputIds[platform]).value=lintGenerated(applySpelling(await polishWithAi({platform,draft:document.getElementById(outputIds[platform]).value,spelling:spellingMode()}),spellingMode()));validatePlatform(platform);scheduleSave();status.textContent=platform+' draft polished.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}}));
syncAiButtons();

async function setupServiceWorker(){
  if(!('serviceWorker' in navigator))return;
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{type:'module'});const pill=document.getElementById('updateAvailable');
    const show=()=>{pill.hidden=false;};if(registration.waiting)show();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)show();});});
    pill.addEventListener('click',()=>registration.waiting?.postMessage({type:'SKIP_WAITING'}));let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;location.reload();}});
  }catch(error){}
}

const mediaAvailable=await imageStorageAvailable();if(!mediaAvailable)document.getElementById('imageStorageHint').textContent='Images will not survive reload in this browser.';
await applyRecord(active);
renderLibrary();syncAiButtons();validateAll();syncReadiness();updateTemplateSuggestions();updateEmptyState();setupServiceWorker();

// test hook only — state accessor for the e2e harness, not used by the app itself
globalThis.__RBC_DEBUG={canvasStudio,factoryController,remoteConfig:REMOTE_FACTORY_CONFIG,getActive:()=>active};
