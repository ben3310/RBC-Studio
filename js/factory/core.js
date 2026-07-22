import {approveNonFlagshipAssets,canAutoPublish,DESTINATIONS} from '../../packages/policy-core/index.js';
export {canAutoPublish,DESTINATIONS} from '../../packages/policy-core/index.js';

export const FACTORY_VERSION=1;

const ROUTES={
  collage:'aesthetic',maison:'flagship',editorial:'flagship',noir:'era',vitrine:'era',atelier:'era',
  gazette:'education',snapshot:'aesthetic',specimen:'education',poet:'aesthetic',runway:'era',dossier:'education'
};

export function slug(value){return String(value||'archive').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,72)||'archive';}
function previousMap(previous){return new Map((previous?.assets||[]).map(asset=>[asset.id,asset]));}

export function buildFactoryPlan({campaignId='campaign',archiveNo='000',name='Archive piece',templates=[],previous=null,source={}}={}){
  const old=previousMap(previous);
  const base=slug('archive-'+archiveNo+'-'+name);
  const assets=[];
  const add=asset=>{
    const prior=old.get(asset.id);
    assets.push({...asset,status:prior?.status||'draft',reviewedAt:prior?.reviewedAt||null,reviewNote:prior?.reviewNote||'',manualOnly:DESTINATIONS[asset.destination].manualOnly});
  };
  templates.forEach((template,index)=>{
    ['feed','reel'].forEach(format=>add({
      id:`visual-${template.id}-${format}`,type:'visual',templateId:template.id,templateIndex:index,format,
      destination:ROUTES[template.id]||'aesthetic',filename:`${base}-${template.id}-${format}.png`
    }));
  });
  templates.slice(0,6).forEach((template,index)=>add({
    id:`pin-${template.id}`,type:'pin',templateId:template.id,templateIndex:index,format:'pin',destination:'pinterest',
    sourceAssetId:`visual-${template.id}-feed`,filename:`${base}-pin-${template.id}.png`
  }));
  add({id:'blog-archive-note',type:'blog',format:'html',destination:'blog',filename:`${base}-archive-note.html`});
  return {
    version:FACTORY_VERSION,campaignId,createdAt:previous?.createdAt||new Date().toISOString(),generatedAt:null,
    source:{class:source.class||'owned',licenseRef:source.licenseRef||'',rightsConfirmed:!!source.rightsConfirmed},assets
  };
}

export function updateAssetStatus(plan,id,status,note=''){
  if(!['draft','approved','rejected'].includes(status))throw new Error('Unknown review status.');
  const assets=(plan?.assets||[]).map(asset=>asset.id===id?{...asset,status,reviewedAt:new Date().toISOString(),reviewNote:String(note||'')}:{...asset});
  return {...plan,assets};
}

export function approveSatelliteAssets(plan){
  return approveNonFlagshipAssets(plan);
}

export function rejectDraftAssets(plan){
  const reviewedAt=new Date().toISOString();
  return {...plan,assets:(plan?.assets||[]).map(asset=>asset.status==='draft'?{...asset,status:'rejected',reviewedAt}:{...asset})};
}

export function factoryCounts(plan){
  const assets=plan?.assets||[];
  return {total:assets.length,draft:assets.filter(a=>a.status==='draft').length,approved:assets.filter(a=>a.status==='approved').length,rejected:assets.filter(a=>a.status==='rejected').length,flagship:assets.filter(a=>a.destination==='flagship').length};
}

export function exportManifest(plan){
  return {
    version:plan?.version||FACTORY_VERSION,campaignId:plan?.campaignId||'',createdAt:plan?.createdAt||null,generatedAt:plan?.generatedAt||null,
    policy:{flagship:'manual-only',satellites:'approval-required',syntheticMedia:'must be disclosed',fakeScarcity:'prohibited'},
    source:{...(plan?.source||{})},
    assets:(plan?.assets||[]).map(asset=>({...asset,autoPublishEligible:canAutoPublish(asset)}))
  };
}
