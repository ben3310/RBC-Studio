// desk review: the operator's monthly retro, computed entirely from stored
// campaigns. Closes the loop the hook leaderboard (P1) opens. Pure and
// storage-agnostic — every number here is derived, never speculative.

const REGION_LABELS={americas:'the Americas',europe:'Europe',auNz:'AU/NZ',sun:'the follow-the-sun split'};

function monthKey(dateStr){
  const [y,m]=String(dateStr||'').split('-');
  return y&&m?y+'-'+m:null;
}
function monthLabel(key){
  const [y,m]=key.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
}
function median(values){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:Math.round((sorted[mid-1]+sorted[mid])/2);
}
function daysBetween(fromStr,toStr){
  const [fy,fm,fd]=String(fromStr).split('-').map(Number);
  const [ty,tm,td]=String(toStr).split('-').map(Number);
  if(!fy||!fm||!fd||!ty||!tm||!td)return null;
  return Math.round((new Date(ty,tm-1,td)-new Date(fy,fm-1,fd))/86400000);
}

// one card per month with campaigns, newest first; months with zero
// campaigns are simply absent (nothing to omit — they never appear)
export function buildMonthlyReview(campaigns){
  const byMonth=new Map();
  for(const campaign of campaigns||[]){
    const key=monthKey(campaign.fields?.campaignDate);
    if(!key)continue;
    if(!byMonth.has(key))byMonth.set(key,[]);
    byMonth.get(key).push(campaign);
  }
  return [...byMonth.keys()].sort().reverse().map(key=>{
    const items=byMonth.get(key);
    const total=items.length;
    const sold=items.filter(item=>item.fields?.soldToggle).length;
    const daysToAcquired=items
      .filter(item=>item.fields?.soldToggle&&item.soldAt&&item.fields?.campaignDate)
      .map(item=>daysBetween(item.fields.campaignDate,item.soldAt))
      .filter(value=>Number.isFinite(value)&&value>=0);

    let bestHook=null,bestHookDms=-1;
    const templateDms={},regionDms={};
    let totalDms=0;
    for(const campaign of items){
      const snapshots=campaign.snapshots||{},results=campaign.results||{};
      for(const [platform,snapshot] of Object.entries(snapshots)){
        if(!snapshot)continue;
        const dms=Number(results[platform]?.dms)||0;
        totalDms+=dms;
        if(dms>bestHookDms){bestHookDms=dms;bestHook={hookText:snapshot.hookText,bank:snapshot.bank,dms};}
        if(snapshot.template)templateDms[snapshot.template]=(templateDms[snapshot.template]||0)+dms;
        if(snapshot.region)regionDms[snapshot.region]=(regionDms[snapshot.region]||0)+dms;
      }
    }
    const bestTemplateEntry=Object.entries(templateDms).sort((a,b)=>b[1]-a[1])[0]||null;
    const bestTemplate=bestTemplateEntry?{template:bestTemplateEntry[0],dms:bestTemplateEntry[1]}:null;

    // one derived insight, rule-based and truthful — omitted entirely when
    // there isn't enough data to say anything real
    let insight='';
    const regionEntries=Object.entries(regionDms).filter(([,dms])=>dms>0);
    if(totalDms>0&&regionEntries.length){
      const [topRegion,topDms]=regionEntries.sort((a,b)=>b[1]-a[1])[0];
      const share=Math.round(topDms/totalDms*100);
      insight=share+'% of dms this month came from '+(REGION_LABELS[topRegion]||topRegion)+'.';
    } else if(bestHook&&bestHookDms>0){
      insight='the "'+bestHook.bank+'" bucket produced this month’s strongest hook.';
    }

    return {
      key,label:monthLabel(key),
      dropsPosted:total,
      sellThrough:{sold,total},
      medianDaysToAcquired:median(daysToAcquired),
      bestHook:bestHookDms>0?bestHook:null,
      bestTemplate,
      totalDms,
      insight
    };
  });
}
