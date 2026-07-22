import {disclaimer,discoveryTags,fomoCloser,leadLine,lintGenerated,objectiveLine,present,sentence,trustBlock,viralHook} from '../facts.js';

// conversion order: scroll-stop hook inside the caption fold, editorial story,
// the record (trust), then real scarcity directly above the CTA.
export function makeInstagram(facts,variant=0){
  const record=present([facts.provenance,facts.material,facts.condition,facts.auth]);
  // when the hook already sells rarity, the body lead switches to provenance
  // so the caption escalates instead of repeating the same scarcity note
  const storyAngle=facts.angle==='rarity'?'provenance':facts.angle;
  const lines=[
    viralHook(facts,variant),
    '',
    leadLine({...facts,angle:storyAngle},variant)+' '+facts.publicName.toLowerCase()+'.',
    record?record.toLowerCase()+'.':'',
    storyAngle==='detail'?'':(facts.detail?sentence(facts.detail):''),
    '',
    fomoCloser(facts,variant),
    objectiveLine(facts),
    trustBlock(facts),
    facts.url,
    '',
    disclaimer(),
    '',
    discoveryTags(facts)
  ];
  return lintGenerated(lines.filter((line,index,array)=>line!==''||array[index-1]!=='').join('\n'));
}
