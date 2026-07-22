import {lintGenerated,present,trustBlock} from '../facts.js';

// the collector channel converts on utility plus genuine priority: per the
// publishing queue, telegram posts before every public channel, so saying
// "you are seeing this first" is a fact, not a device.
export function makeTelegram(facts){
  return lintGenerated([
    'ARCHIVE ALERT · NO. '+facts.no,'',facts.name,
    present([facts.provenance,facts.material,facts.condition,facts.auth],'\n'),
    facts.detail?'Collector note: '+facts.detail+'.':'',facts.priceDisplay?'Price: '+facts.priceDisplay:'',
    'Status: '+(facts.sold?'acquired':'one available'),
    facts.sold?'':'Posted here before any public channel. First come, first considered.','',
    facts.route,trustBlock(facts),facts.url
  ].filter(Boolean).join('\n'));
}
