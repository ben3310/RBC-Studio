import {lintGenerated,present} from '../facts.js';

// turns every sale into the next sale's proof: normalizes cross-border buying
// for the next prospect without ever inventing a claim the operator didn't
// give it — days-on-market and region only ever compute from real inputs.

const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const REGION_LABELS={americas:'the Americas',europe:'Europe',apac:'Asia-Pacific'};

function parseDateOnly(value){
  if(!value)return null;
  const [y,m,d]=String(value).split('-').map(Number);
  if(!y||!m||!d)return null;
  return new Date(y,m-1,d);
}
function startOfToday(now=new Date()){return new Date(now.getFullYear(),now.getMonth(),now.getDate());}

// only computes when campaignDate exists and is not in the future — a
// forward-dated drop has no market history yet, so the line is omitted
export function daysOnMarketLine(campaignDate,today=startOfToday()){
  const listed=parseDateOnly(campaignDate);
  if(!listed)return '';
  const anchor=startOfToday(today);
  if(listed>anchor)return '';
  if(listed.getTime()===anchor.getTime())return 'listed and acquired within the day.';
  return 'listed '+WEEKDAYS[listed.getDay()]+', acquired '+WEEKDAYS[anchor.getDay()]+'.';
}

// continent-level only, and only ever printed when the operator explicitly
// picked a region — never inferred from anything else in the record
export function regionLine(region){
  const label=REGION_LABELS[region];
  return label?'the piece joins a collector in '+label+'.':'';
}

export function forwardLine(hasAnotherOpenCampaign){
  return hasAnotherOpenCampaign?'the archive continues. the next record opens soon.':'the record remains in the archive.';
}

export function makeSoldStory(facts,meta={}){
  const lines=[
    'archive no. '+facts.no+' has been acquired.',
    daysOnMarketLine(facts.date,meta.today),
    regionLine(meta.region),
    forwardLine(!!meta.hasAnotherOpenCampaign),
    'records stay published after acquisition. that is the archive.'
  ];
  return lintGenerated(lines.filter(Boolean).join(' '));
}

// where it posts: one instagram caption (the full story), one short story-
// sticker line, one telegram line — trust content, not reach content, so
// tiktok/x/threads are deliberately excluded by default
export function makeSoldStoryPack(facts,meta={}){
  const days=daysOnMarketLine(facts.date,meta.today);
  const region=regionLine(meta.region);
  return {
    instagramCaption:makeSoldStory(facts,meta),
    storyLine:lintGenerated(present(['archive no. '+facts.no+' · acquired.',days],' ')),
    telegramLine:lintGenerated(present(['ARCHIVE UPDATE · NO. '+facts.no+' · acquired.',region],' '))
  };
}
