import {lintGenerated,present,sentence,trustBlock} from '../facts.js';

// the DM desk owns the conversation where money changes hands: fast, on-brand
// answers to the questions every cross-border buyer actually asks, built only
// from facts the operator typed. Never invents shipping, duties or rails.

export function makeEnquiryReply(facts){
  const lines=[
    'thank you for the enquiry.',
    'archive no. '+facts.no+(facts.provenance?': '+sentence(facts.provenance):'.'),
    facts.auth?sentence(facts.auth):'',
    facts.priceDisplay?facts.priceDisplay+'.':'', // never sentence()'d — an ISO code like "USD" must not get lowercased
    'first come, first considered.',
    trustBlock(facts)
  ];
  return lintGenerated(lines.filter(Boolean).join(' '));
}

export function makeProvenancePack(facts){
  const rows=[
    facts.includeName&&facts.name?facts.name:'',
    facts.provenance?'era · '+facts.provenance:'',
    facts.material?'material · '+facts.material:'',
    facts.condition?'condition · '+facts.condition:'',
    facts.auth?'authentication · '+facts.auth:'',
    facts.detail?'defining detail · '+facts.detail:'',
    'archive no. '+facts.no,
    facts.priceDisplay?'price · '+facts.priceDisplay:'',
    facts.route?'acquisition · '+facts.route:''
  ];
  return lintGenerated(rows.filter(Boolean).join('\n'));
}

// global buyers ask this first — never invents a rail or a window the
// operator did not type; fDispatch is the operator's own phrasing, unwrapped
export function makeShippingAnswer(facts){
  const lines=[
    facts.shipping?sentence(facts.shipping):'',
    facts.duties?sentence(facts.duties):'',
    facts.dispatch?'dispatch within '+facts.dispatch+'.':''
  ];
  return lintGenerated(lines.filter(Boolean).join(' '));
}

// two facts that make the strongest case for the price, in priority order
function factPriority(facts){
  return [facts.auth,facts.provenance,facts.detail,facts.material,facts.condition].filter(Boolean);
}
function strongestFacts(facts,count){
  return factPriority(facts).slice(0,count).map(text=>sentence(text).replace(/\.$/,'')).join('. ');
}
function priceClause(facts,style){
  if(facts.currency==='POA')return style==='b'?'the record is priced on request and firm.':'the record is priced on request and stays open.';
  if(!facts.priceDisplay)return '';
  return style==='b'?'the piece is '+facts.priceDisplay+'.':'the record stays open at '+facts.priceDisplay+'.';
}

// three graduated replies that restate the record instead of arguing: never
// rude, never desperate, never negotiating against ourselves
export function makeLowballDefense(facts){
  const strongest=strongestFacts(facts,2);
  const a=lintGenerated('the price reflects the record'+(strongest?': '+strongest+'.':'.')+' it is firm.');
  const b=lintGenerated(present(['we price against the record, not against offers.',priceClause(facts,'b')],' '));
  const cPrice=priceClause(facts,'c');
  const c=lintGenerated(present(['understood.',cPrice||'the record stays open.','if it is still available when you decide, the first refusal note applies.'],' '));
  return {a,b,c};
}

// hold/payment terms — a blank for the payment method, never an invented rail
export function makeClose(facts){
  const lines=[
    'the piece is held for you pending payment.',
    facts.route?sentence(facts.route):'',
    'payment method: ___ (confirm before sending any funds).',
    facts.dispatch?'dispatch follows within '+facts.dispatch+' of cleared payment.':''
  ];
  return lintGenerated(lines.filter(Boolean).join(' '));
}

// truthful-only lever: the operator fills the blank and must not send this
// unless another collector genuinely has asked — the UI labels it accordingly
export function makeSecondCollectorNote(){
  return lintGenerated('another collector has asked about this piece. you hold first refusal until ___ (fill time and zone).');
}

// a service promise, so it only ships when the operator opts in via the UI
export function makeTimeZoneCourtesy(){
  return lintGenerated('we reply across time zones. expect an answer within 12 hours.');
}

const SECTIONS=[
  ['ENQUIRY REPLY',facts=>makeEnquiryReply(facts)],
  ['PROVENANCE PACK',facts=>makeProvenancePack(facts)],
  ['SHIPPING ANSWER',facts=>makeShippingAnswer(facts)],
  ['LOWBALL DEFENSE · FIRST',facts=>makeLowballDefense(facts).a],
  ['LOWBALL DEFENSE · SECOND',facts=>makeLowballDefense(facts).b],
  ['LOWBALL DEFENSE · THIRD',facts=>makeLowballDefense(facts).c],
  ['THE CLOSE',facts=>makeClose(facts)],
  ['SECOND-COLLECTOR NOTE · SEND ONLY IF TRUE',()=>makeSecondCollectorNote()],
  ['TIME-ZONE COURTESY LINE',()=>makeTimeZoneCourtesy()]
];

// registered in COPY_MAKERS as 'dm'; excluded from the 5-channel readiness
// meter by app.js's PLATFORMS list, not by anything in this module
export function makeDm(facts){
  return SECTIONS.map(([title,build])=>title+'\n'+build(facts)).filter(section=>section.split('\n').slice(1).join('\n').trim()).join('\n\n');
}

export function parseDmSections(text){
  const section=name=>{
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const match=String(text).match(new RegExp(escaped+'\\n([\\s\\S]*?)(?=\\n\\n[A-Z][A-Z ·\\-]+\\n|$)'));
    return match?match[1].trim():'';
  };
  return {
    enquiry:section('ENQUIRY REPLY'),
    provenance:section('PROVENANCE PACK'),
    shipping:section('SHIPPING ANSWER'),
    lowballFirst:section('LOWBALL DEFENSE · FIRST'),
    lowballSecond:section('LOWBALL DEFENSE · SECOND'),
    lowballThird:section('LOWBALL DEFENSE · THIRD'),
    close:section('THE CLOSE'),
    secondCollector:section('SECOND-COLLECTOR NOTE · SEND ONLY IF TRUE'),
    timezone:section('TIME-ZONE COURTESY LINE')
  };
}
