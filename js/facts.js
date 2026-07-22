export const BANNED_PATTERNS = [
  /\bpremium\b/gi,
  /\bexquisite\b/gi,
  /\bmust[- ]have\b/gi,
  /\binvestment piece\b/gi,
  /\bguaranteed\b/gi,
  /gone by tonight/gi
];

export function valueOf(id, root=document){
  const element=root.getElementById(id);
  return element ? String(element.value || '').trim() : '';
}

// Currencies that read as a local symbol rather than the ISO code. Brunei
// buyers expect "B$", not "BND".
const CURRENCY_SYMBOLS={BND:'B$'};

// ISO code + Intl.NumberFormat('en-US') thousands separators, e.g. "USD 4,800";
// symbol currencies render tight, e.g. "B$4,800".
// POA always renders as the fixed phrase and never a number; an unparseable
// legacy price string (pre-currency saves) passes through untouched.
export function formatPrice(facts){
  const currency=facts.currency||'USD';
  if(currency==='POA')return 'price on request';
  const raw=String(facts.price||'').trim();
  if(!raw)return '';
  const digits=raw.replace(/[^0-9.]/g,'');
  const numeric=Number(digits);
  if(!digits||!Number.isFinite(numeric))return raw;
  const amount=new Intl.NumberFormat('en-US').format(numeric);
  const symbol=CURRENCY_SYMBOLS[currency];
  return symbol?symbol+amount:currency+' '+amount;
}

export function campaignFacts(root=document){
  const no=valueOf('fNo',root)||'000';
  const name=valueOf('fName',root)||('archive no. '+no);
  const includeName=!!root.getElementById('includeName')?.checked;
  const price=valueOf('fPrice',root);
  const currency=valueOf('priceCurrency',root)||'USD';
  return {
    no,
    name,
    publicName:includeName?name:('archive no. '+no),
    provenance:valueOf('fProv',root),
    price,
    currency,
    priceDisplay:formatPrice({price,currency}),
    material:valueOf('fMaterial',root),
    condition:valueOf('fCondition',root),
    auth:valueOf('fAuth',root),
    detail:valueOf('fDetail',root),
    route:valueOf('acquisitionRoute',root)||valueOf('fCta',root),
    url:valueOf('productUrl',root),
    objective:valueOf('campaignObjective',root),
    angle:valueOf('storyAngle',root),
    date:valueOf('campaignDate',root),
    sold:!!root.getElementById('soldToggle')?.checked,
    tags:!!root.getElementById('includeTags')?.checked,
    includeName,
    shipping:valueOf('fShipping',root),
    duties:valueOf('fDuties',root),
    guarantee:valueOf('fGuarantee',root),
    dispatch:valueOf('fDispatch',root),
    targetRegion:valueOf('targetRegion',root)
  };
}

export function present(items, joiner=' · '){return items.filter(Boolean).join(joiner);}
export function lowercaseFirst(text){return text?text.charAt(0).toLowerCase()+text.slice(1):'';}
export function sentence(text){
  if(!text)return '';
  const cleaned=lowercaseFirst(String(text).trim());
  return /[.?]$/.test(cleaned)?cleaned:(cleaned+'.');
}

export function graphemeLength(text){
  if(globalThis.Intl?.Segmenter){
    const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
    return Array.from(segmenter.segment(String(text))).length;
  }
  return Array.from(String(text)).length;
}

export function clip(text,max){
  const input=String(text).trim();
  if(graphemeLength(input)<=max)return input;
  const graphemes=globalThis.Intl?.Segmenter
    ? Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(input),item=>item.segment)
    : Array.from(input);
  const candidate=graphemes.slice(0,Math.max(1,max-1)).join('');
  const boundary=candidate.replace(/\s+\S*$/u,'').trimEnd();
  return (boundary||candidate.trimEnd())+'…';
}

export function archiveState(facts){
  return facts.sold?'now acquired. the record remains in the archive.':'one available. no restock.';
}

export function objectiveLine(facts){
  const lines={
    acquire:(facts.route||'dm to acquire')+' · first come, first considered.',
    drop:'the record is open. first serious enquiry gets first refusal.',
    educate:'save the record. the archive rewards the prepared.',
    profile:'the complete record sits on our profile.'
  };
  const base=lines[facts.objective]||lines.acquire;
  // truthful lowballer filter: POA is a price stance, not a claim, so it is
  // appended to every objective rather than swapped in for just one
  return facts.currency==='POA'?base+' price on request. serious enquiries answered in order received.':base;
}

// cross-border trust line for the space directly under the CTA (PRODUCT.md
// principle 3): only ever states shipping/duties/authentication facts the
// operator actually typed, so it is byte-empty until the operator opts in
export function trustBlock(facts){
  return present([facts.shipping,facts.duties,facts.guarantee],' · ').toLowerCase();
}

// truthful loss-framing for the line directly above the CTA. every claim here
// is literally true for one-of-one inventory; no invented deadlines, ever.
export const FOMO_BANK=[
  ()=>'when this sells, the record stays up marked acquired. that part is permanent.',
  ()=>'one sourced. one listed. there is no second.',
  ()=>'no waitlist. no restock. the next collector closes the record.',
  ()=>'pieces like this leave quietly, usually to someone who did not hesitate.',
  ()=>'the archive does not hold pieces. it records who moved first.',
  ()=>'you will see this bag again only in the sold column.'
];
export function fomoCloser(facts,index=0){
  if(facts.sold)return archiveState(facts);
  // stands alone: each bank line already states the scarcity fact, so no
  // archiveState prefix; stacking both reads as pressure, not confidence
  return FOMO_BANK[((index%FOMO_BANK.length)+FOMO_BANK.length)%FOMO_BANK.length]();
}

export const LEAD_BANK={
  provenance:[
    f=>f.provenance?sentence(f.provenance)+' the record makes the piece legible.':'the archive record comes first.',
    ()=>'before the silhouette, read the provenance.',
    ()=>'a piece is only as convincing as the record behind it.',
    f=>f.provenance?'the useful detail is in the record: '+sentence(f.provenance):'the useful detail is always in the record.',
    ()=>'the archive begins with what can be documented.',
    ()=>'condition matters. provenance gives it context.',
    f=>f.auth?sentence(f.auth)+' filed before the piece enters the archive.':'authentication before acquisition. always.',
    ()=>'the object catches the eye. the record holds attention.',
    ()=>'what survived matters. how it survived matters more.',
    ()=>'collector confidence starts with a complete record.'
  ],
  detail:[
    f=>f.detail?sentence(f.detail)+' that is the detail collectors look for.':'the close-up tells the story.',
    ()=>'look past the logo. the construction is the record.',
    ()=>'the detail worth checking is the one most listings skip.',
    f=>f.material?sentence(f.material)+' start there, then look closer.':'start with the material, then look closer.',
    ()=>'hardware first. corners second. interior third.',
    ()=>'the smallest construction choice often dates the piece.',
    f=>f.detail?'one close-up explains it: '+sentence(f.detail):'one close-up usually explains the whole piece.',
    ()=>'collectors notice what a wide shot cannot show.',
    ()=>'the archive note lives in the details.',
    ()=>'a convincing piece rewards inspection.'
  ],
  styling:[
    ()=>'let the piece carry the look. keep everything around it quiet.',
    ()=>'one archive piece, a white shirt, and no further explanation.',
    ()=>'the styling note: restraint everywhere else.',
    ()=>'build the look around one object with a point of view.',
    ()=>'the bag does not need a matching era to make sense now.',
    ()=>'old object, current wardrobe, nothing costume about it.',
    ()=>'carry the history. leave the styling in the present.',
    ()=>'a precise piece makes a simple uniform feel intentional.',
    ()=>'the easiest styling decision is one strong archive object.',
    ()=>'quiet clothes. specific bag. complete look.'
  ],
  rarity:[
    ()=>'one piece in the archive. one next chapter.',
    ()=>'not a restock. an archive arrival.',
    ()=>'some records return to market once. this is one of them.',
    ()=>'one-of-one inventory changes the way you decide.',
    ()=>'rarity is useful only when the record supports it.',
    ()=>'one available because only one was sourced.',
    ()=>'the archive holds objects, not endless stock.',
    ()=>'when one piece changes hands, the archive changes with it.',
    ()=>'a single documented example, open for its next chapter.',
    ()=>'no manufactured countdown. simply one piece.'
  ]
};

export function leadLine(facts,index=0){
  const bank=LEAD_BANK[facts.angle]||LEAD_BANK.provenance;
  return bank[((index%bank.length)+bank.length)%bank.length](facts);
}

// distribution-signal hooks · shared by the Instagram hook lab and TikTok so
// both channels can audition a line by algorithmic intent, not just story angle
function deriveHookData(facts){
  const maison=String(facts.name||facts.publicName||'this').trim().split(/\s+/)[0].toLowerCase()||'this';
  const provenance=String(facts.provenance||'');
  const era=(provenance.split('·')[0]||'the era').trim().toLowerCase()||'the era';
  const yr=(provenance.match(/\d{4}/)||[''])[0];
  return {maison,era,yr,price:facts.price||''};
}

export const SIGNAL_HOOK_BANK={
  saves:d=>[
    'the '+d.maison+' resellers gatekeep.',
    'what collectors check first on a '+d.maison+' — saved you the search.',
    'nobody talks about '+d.era+'. their loss.',
    'the detail that dates this to '+(d.yr||'the good years')+'.',
    'save this before it sells.',
    'this is the reference photo. keep it.',
    'the checklist collectors run before they pay '+(d.price||'real money')+'.',
    'filed under: the ones that never come back.'
  ],
  sends:d=>[
    'send this to the friend who’d steal it.',
    'tag the one who owns the room.',
    'your groupchat needs to see this '+d.maison+'.',
    'show this to whoever says vintage is dead.',
    'somebody’s group chat is about to see this.',
    'forward this to the one with taste and no patience.',
    'the friend who knows will reply in seconds.'
  ],
  comments:d=>[
    'keep or flip? wrong answers only.',
    'name the year. no googling.',
    'would you carry this? honest answers.',
    'new '+d.maison+' or this — pick one.',
    'overrated or underrated: '+d.era+'.',
    'what would you pay. answer before you see the price.',
    'first thing you checked in this photo. be honest.'
  ],
  retention:d=>[
    '3 details that make this one real — swipe.',
    'wait for the hardware.',
    'the interior is the flex — keep swiping.',
    'front, corners, serial — in that order.',
    'the close-up sells it. last slide.',
    'watch the corners. they never lie.',
    'the last frame is the reason it costs this much.'
  ],
  aspiration:d=>[
    'looks 4x the price. priced like it isn’t.',
    'the bag that makes the outfit.',
    'quiet room, loud entrance.',
    'old money didn’t buy new.',
    'carried right, this is a reputation.',
    'nobody asks where it is from twice.',
    'the room notices. nobody says anything.'
  ],
  scarcity:d=>[
    'one available. that is the complete inventory.',
    'one piece. no restock.',
    'the next chapter begins with one collector.',
    'when acquired, the record remains in the archive.',
    'one sourced. one available.',
    'this is not a drop. it is the only one.',
    'inventory: one. that is the whole story.'
  ]
};

export function signalHook(facts,strategy,index=0){
  const bank=SIGNAL_HOOK_BANK[strategy]||SIGNAL_HOOK_BANK.saves;
  const list=bank(deriveHookData(facts));
  return list[((index%list.length)+list.length)%list.length];
}

// line one of every public channel: the story angle picks the distribution
// strategy so the pack leads with a scroll-stopper, not a catalog note.
// the editorial LEAD_BANK register moves to the body where it converts.
export const ANGLE_SIGNAL={provenance:'saves',detail:'retention',styling:'aspiration',rarity:'scarcity'};
export function viralHook(facts,index=0){
  return signalHook(facts,ANGLE_SIGNAL[facts.angle]||'saves',index);
}

// openers for the visual-studio caption: same commercial job as viralHook but
// voiced for a post where the facts live on the image, not in the caption.
// kept beside the hook banks so both surfaces evolve together.
export const OPENER_BANK=[
  d=>'not every '+d.era+' piece survives this well. this one did.',
  ()=>'you don’t find these. they find you.',
  ()=>'the archive doesn’t shout often. today it does.',
  ()=>'some bags are an outfit. this one is a reputation.',
  d=>'proof that '+d.era+' knew exactly what it was doing.',
  ()=>'for the ones who reverse-image-search everything — yes, it’s real.',
  ()=>'one owner away from being yours.',
  ()=>'filed, photographed, priced. the rest is up to you.'
];
export function openerLine(facts,index=0){
  const data=deriveHookData(facts);
  return OPENER_BANK[((index%OPENER_BANK.length)+OPENER_BANK.length)%OPENER_BANK.length](data);
}

// a quieter register for each lead bank angle — same commercial job as
// LEAD_BANK, restrained tone, for operators who want the calmer read
export const RESTRAINED_LEAD={
  provenance:()=>'the record is documented. the piece follows.',
  detail:()=>'one detail, considered closely.',
  styling:()=>'quiet clothes. one considered object.',
  rarity:()=>'one piece. no restock.'
};

export function restrainedLine(facts){
  return (RESTRAINED_LEAD[facts.angle]||RESTRAINED_LEAD.provenance)();
}

// comment-bait for the tease act: zero facts revealed, all curiosity
export const TEASE_BANK=[
  'name the maison. no googling.',
  'you know this hardware or you don’t.',
  'the era gives it away. which is it.',
  'tomorrow the record opens. today, just this detail.',
  'collectors will get this in one frame.'
];

// global hashtag tiers: NICHE (maison + era, only for a known maison — never
// a guessed one), MID (archive/vintage discovery), BROAD (fashion-history
// discovery), plus #rarebagclub always. Composition: 2 niche + 2 mid + 1
// broad for the full pack; tiktok gets 3 (1 niche + 1 mid + #rarebagclub);
// telegram gets none; the tease act strips the niche tier so it never leaks
// the maison. Behind the existing includeTags toggle.
const KNOWN_MAISONS=['dior','chanel','hermes','vuitton','bottega','prada','fendi','gucci','celine','loewe'];
const MID_TAGS=['#archivefashion','#authenticatedvintage','#vintagebags'];
const BROAD_TAGS=['#fashionhistory','#collectorsitem'];

function nicheTags(facts){
  const maison=String(facts.name||'').trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g,'');
  if(!maison||!KNOWN_MAISONS.includes(maison))return [];
  const eraToken=String(facts.provenance||'').split('·')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
  const tags=['#vintage'+maison];
  if(eraToken)tags.push('#'+eraToken+'era');
  return tags;
}

export function discoveryTags(facts,options={}){
  if(!facts.tags)return '';
  if(options.platform==='telegram')return '';
  const niche=options.stripNiche?[]:nicheTags(facts);
  if(options.platform==='tiktok')return [...niche.slice(0,1),MID_TAGS[0],'#rarebagclub'].join(' ');
  return [...niche.slice(0,2),...MID_TAGS.slice(0,2),BROAD_TAGS[0],'#rarebagclub'].join(' ');
}

export function disclaimer(){
  return 'RareBagClub is not associated with the designer brands it consigns. All marks remain the property of their respective owners.';
}

// Big-5 spelling convention: american is the default register; british only
// ever rewrites text on request. "enquiry" is left alone in british mode —
// it already reads correctly and is the term collectors use — but converts
// to "inquiry" for american mode, matching US convention.
const SPELLING_TO_AMERICAN=[['colour','color'],['authorised','authorized'],['enquiry','inquiry']];
const SPELLING_TO_BRITISH=[['color','colour'],['authorized','authorised']];
function matchCase(sample,replacement){
  if(sample===sample.toUpperCase())return replacement.toUpperCase();
  if(sample[0]===sample[0].toUpperCase())return replacement.charAt(0).toUpperCase()+replacement.slice(1);
  return replacement;
}
export function applySpelling(text,mode='american'){
  const pairs=mode==='british'?SPELLING_TO_BRITISH:SPELLING_TO_AMERICAN;
  let output=String(text);
  for(const [from,to] of pairs)output=output.replace(new RegExp('\\b'+from+'\\b','gi'),match=>matchCase(match,to));
  return output;
}

export function lintGenerated(text){
  let output=String(text).replace(/—/g,',').replace(/!/g,'.').replace(/[ \t]{2,}/g,' ').replace(/\.\s*,/g,',').replace(/\s+([,.;:?])/g,'$1');
  for(const pattern of BANNED_PATTERNS)output=output.replace(pattern,'').replace(/[ \t]{2,}/g,' ');
  return output.replace(/ +\n/g,'\n').trim();
}
