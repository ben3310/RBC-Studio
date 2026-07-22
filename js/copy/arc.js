import {TEASE_BANK,discoveryTags,lintGenerated,objectiveLine,sentence,trustBlock} from '../facts.js';

// tease: comment-bait, no facts revealed — the reveal day is the only
// concrete claim, and it is only ever printed when the operator set one
export function makeTeaseCaption(facts,variant=0,revealDayLabel=''){
  const line=TEASE_BANK[((variant%TEASE_BANK.length)+TEASE_BANK.length)%TEASE_BANK.length];
  const opens=revealDayLabel?'the record opens '+revealDayLabel+'.':'the record opens soon.';
  // the niche tier (maison + era tags) would leak exactly what the tease withholds
  return lintGenerated([line,'',opens,discoveryTags(facts,{stripNiche:true})].filter(Boolean).join('\n'));
}

// proof (T+1): authentication close-ups lead, then the same objective/trust
// lines as the reveal. Generated ONLY while the piece is not sold — enforced
// here in code, not left to the operator's convention.
export function makeProofCaption(facts){
  if(facts.sold)return '';
  const lines=[
    facts.auth?sentence(facts.auth):'',
    facts.detail?sentence(facts.detail):'',
    'still one available. the record is open.',
    objectiveLine(facts),
    trustBlock(facts)
  ];
  return lintGenerated(lines.filter(Boolean).join(' '));
}
