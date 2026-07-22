import {approveSatelliteAssets,buildFactoryPlan,DESTINATIONS,exportManifest,factoryCounts,rejectDraftAssets,updateAssetStatus} from './core.js';
import {buildBlogHtml,pinterestCsv,pinterestDescription,safeWebUrl,satelliteCopy} from './copy.js';
import {extractPalette,makePinterestPin,runCutout} from './media.js';
import {createZip} from '../zip.js';

const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
const text=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value;};
function clone(value){return value?JSON.parse(JSON.stringify(value)):value;}
function destinationFolder(asset){return String(asset.destination||'other').replace(/[^a-z0-9-]/gi,'-');}

export function initContentFactory({canvasStudio,templates,getFacts,getCampaignId,onChange=()=>{},downloadBlob}){
  const sourceClass=document.getElementById('factorySourceClass');
  const licenseRef=document.getElementById('factoryLicenseRef');
  const rightsConfirmed=document.getElementById('factoryRightsConfirmed');
  const endpoint=document.getElementById('factoryCutoutEndpoint');
  const cancelCutout=document.getElementById('factoryCancelCutout');
  const retryCutout=document.getElementById('factoryCutoutRetry');
  const fallbackCutout=document.getElementById('factoryCutoutFallback');
  const queue=document.getElementById('factoryQueue');
  const files=new Map(),urls=new Map();
  let state={sourceClass:'owned',licenseRef:'',rightsConfirmed:false,cutoutEndpoint:'',cutoutQa:null,palette:[],plan:null};
  let busy=false,cutoutController=null;

  function revokeUrls(){urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();}
  function syncInputs(){sourceClass.value=state.sourceClass;licenseRef.value=state.licenseRef;rightsConfirmed.checked=state.rightsConfirmed;endpoint.value=state.cutoutEndpoint;renderPalette();}
  function captureInputs(){state.sourceClass=sourceClass.value;state.licenseRef=licenseRef.value.trim();state.rightsConfirmed=rightsConfirmed.checked;state.cutoutEndpoint=endpoint.value.trim();if(state.plan)state.plan.source={...state.plan.source,class:state.sourceClass,licenseRef:state.licenseRef,rightsConfirmed:state.rightsConfirmed,cutout:state.cutoutQa};}
  function changed(){captureInputs();onChange(getState());}
  function setBusy(value){busy=value;document.getElementById('factoryGenerate').disabled=value;document.getElementById('factoryCutout').disabled=value;document.getElementById('factoryApproveSatellites').disabled=value;document.getElementById('factoryRejectDrafts').disabled=value;document.getElementById('factoryExport').disabled=value;document.getElementById('factoryPanel').classList.toggle('factory-busy',value);}
  function status(message){text('factoryStatus',message);}
  function cutoutActions({running=false,review=false}={}){cancelCutout.hidden=!running;retryCutout.hidden=running||!review||!endpoint.value.trim();fallbackCutout.hidden=running||!review;}
  function progress(done,total){const percent=total?Math.round(done/total*100):0;document.getElementById('factoryProgressBar').style.width=percent+'%';document.getElementById('factoryProgress').setAttribute('aria-valuenow',String(percent));}
  function renderPalette(){const host=document.getElementById('factoryPalette');host.innerHTML='';(state.palette||[]).forEach(color=>{const chip=document.createElement('span');chip.className='factory-swatch';chip.style.background=color;chip.title=color;host.appendChild(chip);});}

  function thumbFor(asset){
    const blob=files.get(asset.id);if(!blob)return '<div class="factory-thumb factory-thumb-empty">regenerate to preview</div>';
    if(!urls.has(asset.id))urls.set(asset.id,URL.createObjectURL(blob));
    return `<img class="factory-thumb" src="${urls.get(asset.id)}" alt="${asset.templateId||asset.type} preview">`;
  }
  function renderQueue(){
    revokeUrls();queue.innerHTML='';const assets=state.plan?.assets||[];
    if(!assets.length){queue.innerHTML='<p class="factory-empty">Confirm image rights, then generate the governed asset plan.</p>';text('factoryCount','0 assets');return;}
    assets.forEach(asset=>{
      const card=document.createElement('article');card.className='factory-asset '+asset.status;card.dataset.factoryAsset=asset.id;
      const destination=DESTINATIONS[asset.destination];
      card.innerHTML=`${asset.type==='blog'?'<div class="factory-thumb factory-doc">Aa</div>':thumbFor(asset)}<div class="factory-asset-body"><div class="factory-asset-top"><strong>${asset.templateId||'Archive journal'} · ${asset.format}</strong><span class="factory-state">${asset.status}</span></div><span class="factory-destination">${destination?.label||asset.destination}${asset.manualOnly?' · manual only':''}</span><div class="factory-review"><button type="button" data-factory-review="approved" class="btn small">Approve</button><button type="button" data-factory-review="rejected" class="btn small ghost">Reject</button><button type="button" data-factory-review="draft" class="text-link">Reset</button></div></div>`;
      queue.appendChild(card);
    });
    const counts=factoryCounts(state.plan);text('factoryCount',`${counts.total} assets · ${counts.approved} approved · ${counts.draft} draft · ${counts.rejected} rejected`);
  }

  function copyFor(asset,facts){
    if(asset.type==='blog')return '';
    const base=asset.destination==='flagship'?String(document.getElementById('outInstagram')?.value||'').trim():satelliteCopy(asset,facts);
    return state.sourceClass==='generated'?[base,'AI-assisted mood imagery. Product photography remains real.'].filter(Boolean).join('\n\n'):base;
  }

  async function generate(){
    if(busy)return;captureInputs();
    if(!state.rightsConfirmed){status('Confirm that the source imagery is cleared before generating.');rightsConfirmed.focus();return;}
    const images=canvasStudio.getImageBlobs();
    if(!images.bag){status('Add the product cutout first.');document.getElementById('bagInput')?.focus();return;}
    setBusy(true);files.clear();revokeUrls();
    try{
      const facts=getFacts();
      state.plan=buildFactoryPlan({campaignId:getCampaignId(),archiveNo:facts.no,name:facts.publicName||facts.name,templates,previous:state.plan,source:{class:state.sourceClass,licenseRef:state.licenseRef,rightsConfirmed:true}});
      state.plan.assets=state.plan.assets.map(asset=>({...asset,copy:copyFor(asset,facts)}));
      const total=state.plan.assets.length;let done=0;progress(0,total);status(`Rendering 24 studio visuals · 0/${total}`);
      for(const asset of state.plan.assets.filter(asset=>asset.type==='visual')){
        files.set(asset.id,await canvasStudio.renderVariantBlob(asset.templateIndex,asset.format));done++;progress(done,total);status(`Rendering studio visuals · ${done}/${total}`);await nextPaint();
      }
      for(const asset of state.plan.assets.filter(asset=>asset.type==='pin')){
        const source=files.get(asset.sourceAssetId);files.set(asset.id,await makePinterestPin(source,{title:facts.publicName||facts.name||'Rare Bag Archive'}));
        done++;progress(done,total);status(`Building Pinterest discovery set · ${done}/${total}`);await nextPaint();
      }
      const article=state.plan.assets.find(asset=>asset.type==='blog');files.set(article.id,new Blob([buildBlogHtml({...facts,syntheticMedia:state.sourceClass==='generated'})],{type:'text/html;charset=utf-8'}));done++;progress(done,total);
      state.palette=await extractPalette(images.bag);state.plan.generatedAt=new Date().toISOString();state.plan.palette=[...state.palette];
      status('Factory complete · 31 deliverables ready for review.');renderPalette();renderQueue();changed();
    }catch(error){status('Factory stopped · '+error.message);}
    finally{setBusy(false);}
  }

  async function cutout(forceLocal=false){
    if(busy)return;const source=canvasStudio.getImageBlobs().bag;if(!source){status('Add the product image before running cutout assist.');return;}
    cutoutController=new AbortController();setBusy(true);cutoutActions({running:true});
    const serviceUrl=forceLocal?'':endpoint.value;
    status(serviceUrl.trim()?'Sending image to the configured private cutout service…':'Running local plain-background cutout assist…');
    try{
      const result=await runCutout(source,serviceUrl,{signal:cutoutController.signal,retries:1});
      state.cutoutQa={...result.qa,checkedAt:new Date().toISOString()};
      const decision=result.qa.decision;
      if(decision!=='fallback'&&decision!=='reject'){
        await canvasStudio.replaceBagBlob(result.blob);state.palette=await extractPalette(result.blob);renderPalette();
      }
      if(decision==='accept')status('Cutout QA passed. Product layer replaced; factory assets still require review.');
      else if(decision==='manual_review')status('Manual edge review required · compare handles, holes, stitching, and light/dark edges before approval.');
      else if(decision==='fallback')status('Cutout QA requested fallback · source preserved. Retry the service or use the local assist.');
      else status('Cutout rejected by QA · source preserved. Retry or use the local assist.');
      cutoutActions({review:decision!=='accept'});changed();
    }catch(error){
      const cancelled=cutoutController.signal.aborted||error.name==='AbortError';
      status(cancelled?'Cutout cancelled · source preserved.':'Cutout failed · '+error.message);cutoutActions({review:!cancelled});
    }finally{cutoutController=null;setBusy(false);}
  }

  function review(id,next){state.plan=updateAssetStatus(state.plan,id,next);renderQueue();changed();status('Review state updated.');}
  function approveSatellites(){if(!state.plan)return;state.plan=approveSatelliteAssets(state.plan);renderQueue();changed();status('Satellite, Pinterest, and blog assets approved. Flagship remains manual.');}
  function rejectDrafts(){if(!state.plan)return;state.plan=rejectDraftAssets(state.plan);renderQueue();changed();status('Remaining drafts rejected.');}

  async function exportApproved(){
    if(busy||!state.plan)return;const approved=state.plan.assets.filter(asset=>asset.status==='approved');
    if(!approved.length){status('Approve at least one asset before export.');return;}
    const missing=approved.filter(asset=>!files.has(asset.id));if(missing.length){status('Regenerate this factory after reload to rebuild binary files before export.');return;}
    setBusy(true);status('Packing approved factory files…');
    try{
      const facts=getFacts();const entries=approved.map(asset=>({name:`factory/${destinationFolder(asset)}/${asset.filename}`,data:files.get(asset.id)}));
      const pins=approved.filter(asset=>asset.type==='pin').map(asset=>({title:facts.publicName||facts.name||'Rare Bag Archive',filename:asset.filename,description:pinterestDescription(asset,facts)+(state.sourceClass==='generated'?' AI-assisted mood imagery.':''),link:safeWebUrl(facts.url)}));
      const manifest=exportManifest(state.plan);
      entries.push({name:'factory/manifest.json',data:JSON.stringify(manifest,null,2)});
      entries.push({name:'factory/licenses.json',data:JSON.stringify({source:manifest.source,exportedAt:new Date().toISOString()},null,2)});
      if(pins.length)entries.push({name:'factory/pinterest.csv',data:pinterestCsv(pins)});
      entries.push({name:'factory/RUNBOOK.txt',data:'RBC CONTENT FACTORY\r\n\r\nFlagship assets are always posted manually.\r\nEvery satellite asset requires approval before an official API adapter may publish it.\r\nDisclose synthetic media. Do not manufacture product facts, availability, or scarcity.\r\nSource rights are recorded in licenses.json.\r\n'});
      const zip=await createZip(entries);downloadBlob(zip,`rbc-factory-${facts.no||'000'}.zip`);status(`Exported ${approved.length} approved assets plus governance files.`);
    }catch(error){status('Export failed · '+error.message);}
    finally{setBusy(false);}
  }

  [sourceClass,licenseRef,rightsConfirmed,endpoint].forEach(element=>{element.addEventListener('input',changed);element.addEventListener('change',changed);});
  document.getElementById('factoryGenerate').addEventListener('click',generate);
  document.getElementById('factoryCutout').addEventListener('click',()=>cutout(false));
  cancelCutout.addEventListener('click',()=>cutoutController?.abort('operator-cancelled'));
  retryCutout.addEventListener('click',()=>cutout(false));
  fallbackCutout.addEventListener('click',()=>cutout(true));
  document.getElementById('factoryApproveSatellites').addEventListener('click',approveSatellites);
  document.getElementById('factoryRejectDrafts').addEventListener('click',rejectDrafts);
  document.getElementById('factoryExport').addEventListener('click',exportApproved);
  queue.addEventListener('click',event=>{const button=event.target.closest('[data-factory-review]');if(!button||busy)return;const card=button.closest('[data-factory-asset]');review(card.dataset.factoryAsset,button.dataset.factoryReview);});

  function getState(){captureInputs();return clone(state);}
  function setState(saved={}){files.clear();revokeUrls();state={sourceClass:saved.sourceClass||saved.plan?.source?.class||'owned',licenseRef:saved.licenseRef||saved.plan?.source?.licenseRef||'',rightsConfirmed:!!(saved.rightsConfirmed??saved.plan?.source?.rightsConfirmed),cutoutEndpoint:saved.cutoutEndpoint||'',cutoutQa:clone(saved.cutoutQa||saved.plan?.source?.cutout||null),palette:[...(saved.palette||saved.plan?.palette||[])],plan:clone(saved.plan||null)};syncInputs();cutoutActions({review:!!state.cutoutQa&&state.cutoutQa.decision!=='accept'});renderQueue();progress(state.plan?.generatedAt?state.plan.assets.length:0,state.plan?.assets?.length||0);status(state.plan?'Factory plan restored · regenerate to rebuild previews and export files.':'Rights-gated · local-first · no credentials stored.');}
  setState();
  return {getState,setState,generate,exportApproved};
}
