// buyer-zone prime windows and DST-safe conversion between the operator's
// local wall clock and the buyer's local wall clock, for the Big-5 markets.

export const REGIONS=[
  {id:'americas',label:'Americas (ET)',zone:'America/New_York',abbr:'ET'},
  {id:'europe',label:'Europe (CET)',zone:'Europe/Berlin',abbr:'CET'},
  {id:'auNz',label:'AU/NZ (AEST)',zone:'Australia/Sydney',abbr:'AEST'},
  {id:'sun',label:'Follow the sun (two-wave)',zone:null,abbr:''}
];
const REGION_BY_ID=Object.fromEntries(REGIONS.map(region=>[region.id,region]));
const CHANNELS=['telegram','instagram','tiktok','threads','x'];

// evidence-based buyer-zone prime windows · one suggested time per channel
export const PRIME_WINDOWS={
  americas:{instagram:{h:11,m:0},tiktok:{h:18,m:0},telegram:{h:8,m:0},threads:{h:8,m:0},x:{h:8,m:0}},
  europe:{instagram:{h:11,m:0},tiktok:{h:19,m:0},telegram:{h:8,m:0},threads:{h:8,m:0},x:{h:8,m:0}},
  auNz:{instagram:{h:11,m:0},tiktok:{h:19,m:0},telegram:{h:8,m:0},threads:{h:8,m:0},x:{h:8,m:0}}
};

// follow-the-sun: tease/telegram wave AEST morning, instagram+tiktok ET
// evening, threads/x CET morning — one drop touches all three markets in 24h
const SUN_CHANNEL_REGION={telegram:'auNz',instagram:'americas',tiktok:'americas',threads:'europe',x:'europe'};
const SUN_CHANNEL_WINDOW={telegram:{h:8,m:0},instagram:{h:19,m:0},tiktok:{h:18,m:0},threads:{h:8,m:0},x:{h:8,m:0}};

export function regionForChannel(regionId,channel){
  if(regionId==='sun')return REGION_BY_ID[SUN_CHANNEL_REGION[channel]];
  return REGION_BY_ID[regionId]||REGION_BY_ID.americas;
}
export function windowForChannel(regionId,channel){
  if(regionId==='sun')return SUN_CHANNEL_WINDOW[channel];
  return (PRIME_WINDOWS[regionId]||PRIME_WINDOWS.americas)[channel];
}

function offsetMinutes(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})
    .formatToParts(date).reduce((acc,part)=>{acc[part.type]=part.value;return acc;},{});
  const asUtc=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));
  return (asUtc-date.getTime())/60000;
}

// converts a wall-clock date + time in `timeZone` to a UTC instant, correct
// across a DST boundary (offset is read for the target date itself, then the
// guess is re-read once against the resolved instant to converge)
export function zonedWallTimeToUtc(dateStr,hh,mm,timeZone){
  const [y,mo,d]=String(dateStr||'').split('-').map(Number);
  const guess=Date.UTC(y||1970,(mo||1)-1,d||1,hh,mm,0);
  const first=guess-offsetMinutes(new Date(guess),timeZone)*60000;
  const second=guess-offsetMinutes(new Date(first),timeZone)*60000;
  return second;
}

function pad(value){return String(value).padStart(2,'0');}

// formats a UTC instant as the operator's local wall clock (assumes the
// browser's own timezone is the operator's, which is always true in-app)
export function formatOperatorTime(utcMs){
  const date=new Date(utcMs);
  return pad(date.getHours())+':'+pad(date.getMinutes());
}

// buyer-zone label for a UTC instant, e.g. "09:30 wed AEST"
export function formatBuyerLabel(utcMs,timeZone,abbr){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',weekday:'short',hour:'2-digit',minute:'2-digit'})
    .formatToParts(new Date(utcMs)).reduce((acc,part)=>{acc[part.type]=part.value;return acc;},{});
  return parts.hour+':'+parts.minute+' '+parts.weekday.toLowerCase()+' '+abbr;
}

// fills the operator's local wall clock for every channel's prime window in
// the buyer's zone, treating campaignDate as the buyer's calendar date
export function suggestTimes(regionId,campaignDate){
  const out={};
  for(const channel of CHANNELS){
    const zone=regionForChannel(regionId,channel);
    const win=windowForChannel(regionId,channel);
    if(!zone||!win)continue;
    out[channel]=formatOperatorTime(zonedWallTimeToUtc(campaignDate,win.h,win.m,zone.zone));
  }
  return out;
}

// live dual-clock label: converts whatever time currently sits in the
// operator's queue row (their own local wall clock, on campaignDate) into
// the buyer's zone, so the row stays accurate even after manual edits
export function dualClockLabel(regionId,channel,campaignDate,operatorHH,operatorMM){
  const zone=regionForChannel(regionId,channel);
  if(!zone||!campaignDate||!Number.isFinite(operatorHH)||!Number.isFinite(operatorMM))return '';
  const [y,mo,d]=String(campaignDate).split('-').map(Number);
  if(!y||!mo||!d)return '';
  const local=new Date(y,mo-1,d,operatorHH,operatorMM,0);
  return formatBuyerLabel(local.getTime(),zone.zone,zone.abbr);
}
