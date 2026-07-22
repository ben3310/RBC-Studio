import {clip,fomoCloser,lintGenerated,objectiveLine,present,sentence,viralHook} from '../facts.js';

// tweet 1: hook plus the single hardest fact. tweet 2: proof, scarcity, route.
export function makeX(facts,variant=0){
  const first=clip('1/2 '+viralHook(facts,variant)+' '+facts.publicName.toLowerCase()+'. '+sentence(facts.provenance),280);
  const second=clip('2/2 '+present([sentence(facts.detail),sentence(facts.auth),fomoCloser(facts,variant),objectiveLine(facts),facts.url],' '),280);
  return lintGenerated(first+'\n\n'+second);
}
