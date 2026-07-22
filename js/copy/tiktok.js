import {archiveState,disclaimer,discoveryTags,fomoCloser,lintGenerated,objectiveLine,present,sentence,signalHook} from '../facts.js';

// retention-first: the on-screen hook promises a payoff the last shot delivers,
// and the sequence ends on a cut that loops cleanly back to the hero frame.
export function makeTiktok(facts,variant=0,hookOverride=null){
  const hook=hookOverride||signalHook(facts,'retention',variant);
  const shots=[
    '0:00  hero silhouette, still frame, hook on screen',
    '0:02  hardware macro: '+(facts.detail||'defining construction detail'),
    '0:05  side profile and corners',
    '0:08  interior, stamp or authentication record',
    '0:12  full piece with archive number and acquisition route',
    '0:14  hold one beat, cut on the close so the loop lands back on the hero'
  ];
  const voice=[hook,sentence(facts.provenance),sentence(facts.detail),fomoCloser(facts,variant),objectiveLine(facts),facts.shipping?sentence(facts.shipping):''].filter(Boolean).join(' ');
  return lintGenerated([
    'ON-SCREEN HOOK\n'+hook,
    // US platform norms expect the brand-association disclaimer alongside tags
    'POST CAPTION\n'+present([facts.publicName.toLowerCase(),archiveState(facts)],' · ')+' '+present([facts.tags?disclaimer():'',discoveryTags(facts,{platform:'tiktok'})],' '),
    'SHOT LIST\n'+shots.join('\n'),
    'VOICEOVER\n'+voice,
    'COVER TEXT\narchive no. '+facts.no+' · '+(facts.sold?'acquired':'one available')
  ].join('\n\n'));
}

export function parseTiktokSections(text){
  const section=name=>{
    const match=String(text).match(new RegExp(name+'\\n([\\s\\S]*?)(?=\\n\\n[A-Z -]+\\n|$)'));
    return match?match[1].trim():'';
  };
  return {caption:section('POST CAPTION'),shots:section('SHOT LIST'),voiceover:section('VOICEOVER'),cover:section('COVER TEXT')};
}
