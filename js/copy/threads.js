import {fomoCloser,lintGenerated,objectiveLine,present,sentence,signalHook} from '../facts.js';

// post 1 earns replies, post 2 earns trust, post 3 converts on real scarcity.
export function makeThreads(facts,variant=0){
  const question=facts.angle==='detail'?'which detail do you check first on a vintage piece?':facts.angle==='styling'?'would you build the look around the bag, or let it sit quietly?':'do you collect the object, the era, or the record behind it?';
  return lintGenerated([
    '1/3\n'+signalHook(facts,'comments',variant)+' '+facts.publicName.toLowerCase()+'.',
    '2/3\n'+present([sentence(facts.provenance),sentence(facts.detail),sentence(facts.auth)],' '),
    '3/3\n'+fomoCloser(facts,variant)+' '+question+'\n\n'+objectiveLine(facts)
  ].join('\n\n'));
}
