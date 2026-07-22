// the compounding loop: aggregates hook performance across every saved
// campaign so the copy engine can start from what has already won, instead
// of rotating hooks by index forever. Pure and storage-agnostic — takes
// plain campaign records, returns plain data, no DOM.

const METRICS=['views','saves','dms'];

function metricValue(results,platform,metric){
  const raw=results?.[platform]?.[metric];
  const num=Number(raw);
  return Number.isFinite(num)&&raw!==''&&raw!==null&&raw!==undefined?num:0;
}

// one row per (bank, variant, region) triple actually used across campaigns —
// variant is the identity (not the resolved hook text, which bakes in a
// specific maison/era and would never match across different campaigns)
export function aggregateHooks(campaigns){
  const byKey=new Map();
  for(const campaign of campaigns||[]){
    const snapshots=campaign.snapshots||{};
    const results=campaign.results||{};
    for(const [platform,snapshot] of Object.entries(snapshots)){
      if(!snapshot||!snapshot.bank||!Number.isFinite(snapshot.variant))continue;
      const region=snapshot.region||'';
      const key=[snapshot.bank,snapshot.variant,region].join('|');
      const entry=byKey.get(key)||{bank:snapshot.bank,variant:snapshot.variant,region,hookText:snapshot.hookText||'',views:0,saves:0,dms:0,campaigns:0};
      for(const metric of METRICS)entry[metric]+=metricValue(results,platform,metric);
      entry.campaigns+=1;
      entry.hookText=snapshot.hookText||entry.hookText;
      byKey.set(key,entry);
    }
  }
  return [...byKey.values()];
}

function matchesRegion(entry,region){return !region||region==='all'||entry.region===region;}

// top 3 per strategy bucket, ranked by dms desc then saves desc
export function rankByBank(entries,region){
  const byBank={};
  for(const entry of entries){
    if(!matchesRegion(entry,region))continue;
    (byBank[entry.bank]=byBank[entry.bank]||[]).push(entry);
  }
  for(const bank of Object.keys(byBank))byBank[bank]=byBank[bank].sort((a,b)=>b.dms-a.dms||b.saves-a.saves).slice(0,3);
  return byBank;
}

// the index to feed back into signalHook/viralHook when "proven first" is
// checked: the best-performing variant for this bank, or 0 with no data yet
export function bestVariantForBank(entries,bank,region){
  const ranked=entries.filter(entry=>entry.bank===bank&&matchesRegion(entry,region)).sort((a,b)=>b.dms-a.dms||b.saves-a.saves);
  return ranked.length?ranked[0].variant:0;
}
