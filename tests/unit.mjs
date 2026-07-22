import assert from 'node:assert/strict';
import {applySpelling,archiveState,clip,discoveryTags,formatPrice,graphemeLength,leadLine,lintGenerated,objectiveLine,trustBlock} from '../js/facts.js';
import {COPY_MAKERS} from '../js/copy/index.js';
import {validateOutput} from '../js/validation.js';
import {createZip} from '../js/zip.js';
import {buildCalendar} from '../js/calendar.js';
import {CampaignStore} from '../js/state.js';
import {dualClockLabel,suggestTimes,zonedWallTimeToUtc} from '../js/schedule.js';
import {makeClose,makeDm,makeEnquiryReply,makeLowballDefense,makeProvenancePack,makeShippingAnswer,parseDmSections} from '../js/copy/dm.js';
import {daysOnMarketLine,forwardLine,makeSoldStory,makeSoldStoryPack,regionLine} from '../js/copy/sold.js';
import {makeProofCaption,makeTeaseCaption} from '../js/copy/arc.js';
import {aggregateHooks,bestVariantForBank,rankByBank} from '../js/leaderboard.js';
import {buildMonthlyReview} from '../js/deskreview.js';
import {approveSatelliteAssets,buildFactoryPlan,canAutoPublish,exportManifest,factoryCounts} from '../js/factory/core.js';
import {buildBlogHtml,pinterestCsv,safeWebUrl,satelliteCopy} from '../js/factory/copy.js';

const facts={no:'004',name:'Dior Hardcore Pouch',publicName:'archive no. 004',provenance:'Galliano era · c. 2003',price:'4800',currency:'USD',priceDisplay:'USD 4,800',material:'black leather',condition:'excellent vintage condition',auth:'two-stage authenticated',detail:'era-correct hardware',route:'dm to acquire',url:'https://example.com/004',objective:'acquire',angle:'provenance',date:'2026-07-16',sold:false,tags:true,shipping:'',duties:'',guarantee:''};

assert.equal(graphemeLength('a👜'),2);
assert.ok(graphemeLength(clip('one two three four',10))<=10);
assert.ok(!clip('one two three four',10).includes('th…'));
assert.equal(lintGenerated('premium  piece! — now'),'piece, now');
assert.equal(archiveState(facts),'one available. no restock.');
for(let index=0;index<10;index++)assert.ok(leadLine(facts,index));
for(const [platform,maker] of Object.entries(COPY_MAKERS)){
  const output=maker(facts,2);assert.ok(output.length>20,platform+' output is empty');assert.ok(!/[—!]/.test(output),platform+' output failed lint');
}

const xValidation=validateOutput('x','1/2 one\n\n2/2 two');
assert.deepEqual(xValidation.counts,[7,7]);
assert.equal(xValidation.over,false);
const threadsValidation=validateOutput('threads','1/3\n'+('x'.repeat(501))+'\n\n2/3\nok\n\n3/3\nok');
assert.equal(threadsValidation.over,true);
assert.equal(threadsValidation.worstIndex,0);

const zip=await createZip([{name:'a.txt',data:'hello'},{name:'folder/b.txt',data:new Blob(['world'])}]);
const bytes=new Uint8Array(await zip.arrayBuffer());
assert.equal(new DataView(bytes.buffer).getUint32(0,true),0x04034b50);
assert.ok(bytes.length>100);

const calendar=buildCalendar({campaignId:'test',title:'Archive 004',date:'2026-07-16',events:[{platform:'instagram',time:'12:30',copy:'hello'}]});
assert.match(calendar,/BEGIN:VEVENT/);assert.match(calendar,/TRIGGER:-PT15M/);

class MemoryStorage{constructor(){this.map=new Map();}getItem(key){return this.map.get(key)??null;}setItem(key,value){this.map.set(key,String(value));}removeItem(key){this.map.delete(key);}}
const store=new CampaignStore(new MemoryStorage());
const first=store.create({fields:{fNo:'004',fName:'Test Piece'},snapshots:{instagram:{bank:'saves',variant:0,hookText:'hook A'}},results:{instagram:{dms:'12',saves:'4',views:''}}});
assert.equal(store.list().length,1);assert.equal(store.load(first.id).fields.fNo,'004');
assert.equal(store.load(first.id).snapshots.instagram.hookText,'hook A'); // create() must not silently drop new record fields
const duplicate=store.duplicate(first.id);assert.equal(store.list().length,2);assert.notEqual(duplicate.id,first.id);
assert.equal(duplicate.snapshots.instagram.hookText,'hook A'); // resolved copy carries over — it's still the same drafted hook
assert.deepEqual(duplicate.results,{}); // but performance results are the ORIGINAL posting's outcome, never inherited
store.delete(first.id);assert.equal(store.list().length,1);

// P0 · currency, trust block, POA doctrine
assert.equal(formatPrice({price:'4800',currency:'USD'}),'USD 4,800');
assert.equal(formatPrice({price:'',currency:'USD'}),'');
assert.equal(formatPrice({price:'4800',currency:'BND'}),'B$4,800'); // Brunei dollars read as a symbol, not the ISO code
assert.equal(formatPrice({price:'',currency:'BND'}),'');
assert.equal(formatPrice({price:'4800',currency:'POA'}),'price on request');
assert.equal(formatPrice({price:'',currency:'POA'}),'price on request');
assert.equal(formatPrice({price:'RM 4,800',currency:'USD'}),'USD 4,800'); // legacy numeric strings reformat to the selected currency
assert.equal(formatPrice({price:'inquire for price',currency:'USD'}),'inquire for price'); // non-numeric legacy text passes through untouched
assert.equal(trustBlock({}),'');
assert.equal(trustBlock({shipping:'Insured worldwide courier',duties:'',guarantee:'Two-stage authenticated'}),'insured worldwide courier · two-stage authenticated');
assert.ok(!objectiveLine({objective:'acquire',currency:'USD'}).includes('price on request'));
assert.ok(objectiveLine({objective:'acquire',currency:'POA'}).includes('price on request. serious enquiries answered in order received.'));
// makeInstagram/makeTelegram: empty trust fields are byte-identical to the untouched fixture; filled fields surface the trust line
const instagramBase=COPY_MAKERS.instagram(facts,1);
assert.equal(COPY_MAKERS.instagram({...facts},1),instagramBase);
const instagramWithTrust=COPY_MAKERS.instagram({...facts,shipping:'insured worldwide courier'},1);
assert.ok(instagramWithTrust.includes('insured worldwide courier'));
assert.ok(!instagramBase.includes('insured worldwide courier'));
const telegramWithPoa=COPY_MAKERS.telegram({...facts,currency:'POA',priceDisplay:'price on request'});
assert.ok(!/\d/.test(telegramWithPoa.match(/Price:.*/)?.[0]||''),'POA must never print a number');

// P0 · timezone conversion, DST-safe
assert.equal(zonedWallTimeToUtc('2026-03-07',12,0,'America/New_York'),Date.UTC(2026,2,7,17,0,0)); // EST, before spring-forward
assert.equal(zonedWallTimeToUtc('2026-03-09',12,0,'America/New_York'),Date.UTC(2026,2,9,16,0,0)); // EDT, after spring-forward
const suggested=suggestTimes('americas','2026-07-16');
assert.ok(Object.values(suggested).every(time=>/^\d{2}:\d{2}$/.test(time)));
const sunTimes=suggestTimes('sun','2026-07-16');
assert.ok(Object.values(sunTimes).every(time=>/^\d{2}:\d{2}$/.test(time)));
assert.match(dualClockLabel('auNz','telegram','2026-07-16',20,0),/^\d{2}:\d{2} \w{3} AEST$/);
assert.equal(dualClockLabel('americas','instagram','',12,0),'');

// buildCalendar carries the buyer-zone label into SUMMARY
const calendarWithBuyer=buildCalendar({campaignId:'test',title:'Archive 004',date:'2026-07-16',events:[{platform:'instagram',time:'12:30',copy:'hello',buyerLabel:'09:30 wed AEST'}]});
assert.match(calendarWithBuyer,/SUMMARY:Archive 004 · instagram · 09:30 wed AEST/);

// P2 · DM Closer Kit — every script omits absent facts entirely
const bareFacts={no:'004',name:'archive no. 004',publicName:'archive no. 004',provenance:'',price:'',currency:'USD',priceDisplay:'',material:'',condition:'',auth:'',detail:'',route:'',url:'',objective:'acquire',angle:'provenance',date:'',sold:false,tags:false,shipping:'',duties:'',guarantee:'',dispatch:'',includeName:false,targetRegion:''};
assert.ok(!makeEnquiryReply(bareFacts).includes('undefined'));
assert.equal(makeShippingAnswer(bareFacts),''); // no shipping/duties/dispatch facts → empty, never fabricated
assert.ok(!makeProvenancePack(bareFacts).includes('era ·')); // blank provenance never prints a bare label
assert.ok(!makeClose(bareFacts).includes('undefined'));
const bareLowball=makeLowballDefense(bareFacts);
assert.ok(!bareLowball.b.includes('the piece is'),'no price → no price clause in reply b');
assert.ok(!bareLowball.c.includes('stays open at'),'no price → no price clause in reply c');

const dmFacts={...facts,shipping:'insured worldwide courier, fully tracked',duties:'import duties are the collector\'s responsibility',dispatch:'2 business days',includeName:true};
assert.ok(makeShippingAnswer(dmFacts).includes('dispatch within 2 business days.'));
assert.ok(makeEnquiryReply(dmFacts).includes('USD 4,800'),'ISO currency code must never be lowercased by sentence()');
assert.ok(!makeEnquiryReply(dmFacts).includes('uSD'),'regression: sentence() must not mangle the price ISO code');

// regression: applySpelling's enquiry→inquiry rule must never run on the
// still-to-be-parsed dm.js blob — it would rewrite the literal "ENQUIRY
// REPLY" section header and break parseDmSections. Callers must apply
// spelling only to already-parsed field values, never to dmRawText itself.
const dmBlobForSpellingCheck=makeDm(dmFacts);
const corruptedBySpellingFirst=parseDmSections(applySpelling(dmBlobForSpellingCheck,'american'));
assert.equal(corruptedBySpellingFirst.enquiry,'','documents why spelling must be applied after parsing, not before');
const correctOrder=parseDmSections(dmBlobForSpellingCheck);
assert.ok(applySpelling(correctOrder.enquiry,'american').length>10,'parse first, then apply spelling per field — this order must stay correct');
const filledLowball=makeLowballDefense(dmFacts);
assert.ok(filledLowball.b.includes('USD 4,800'));
assert.ok(filledLowball.c.includes('USD 4,800'));
const poaLowball=makeLowballDefense({...dmFacts,currency:'POA',priceDisplay:'price on request'});
assert.ok(poaLowball.b.includes('the record is priced on request and firm.'));
assert.ok(!/\d/.test(poaLowball.b),'POA lowball reply must never print a number');

const dmBlob=makeDm(dmFacts);
const dmSections=parseDmSections(dmBlob);
assert.ok(dmSections.enquiry.includes('archive no. 004'));
assert.ok(dmSections.provenance.split('\n').length>=4);
assert.ok(dmSections.secondCollector.includes('SEND ONLY IF TRUE')===false&&dmSections.secondCollector.includes('first refusal'));
assert.equal(parseDmSections(makeDm(bareFacts)).shipping,''); // bare facts → no shipping section in the combined blob

// P4 · Sold-Story Engine — date math across a month boundary, region opt-in only, forward line switches on library contents
assert.equal(daysOnMarketLine('',new Date(2026,6,20)),''); // no campaignDate → no line
assert.equal(daysOnMarketLine('2026-08-05',new Date(2026,6,20)),''); // future-dated → no market history yet
assert.equal(daysOnMarketLine('2026-07-20',new Date(2026,6,20)),'listed and acquired within the day.');
assert.equal(daysOnMarketLine('2026-06-29',new Date(2026,6,2)),'listed monday, acquired thursday.'); // crosses the May/June→June/July boundary correctly
assert.equal(regionLine(''),'');
assert.equal(regionLine('nowhere'),''); // unknown/unselected region never prints
assert.equal(regionLine('americas'),'the piece joins a collector in the Americas.');
assert.equal(forwardLine(true),'the archive continues. the next record opens soon.');
assert.equal(forwardLine(false),'the record remains in the archive.');
const soldFacts={...facts,date:'2026-07-16'};
const soldStoryNoRegion=makeSoldStory(soldFacts,{today:new Date(2026,6,18),hasAnotherOpenCampaign:false});
assert.ok(!soldStoryNoRegion.includes('joins a collector'));
const soldStoryWithRegion=makeSoldStory(soldFacts,{today:new Date(2026,6,18),region:'europe',hasAnotherOpenCampaign:true});
assert.ok(soldStoryWithRegion.includes('joins a collector in Europe'));
assert.ok(soldStoryWithRegion.includes('the archive continues'));
const soldPack=makeSoldStoryPack(soldFacts,{today:new Date(2026,6,18)});
assert.ok(soldPack.instagramCaption.includes('archive no. 004 has been acquired.'));
assert.ok(soldPack.storyLine.includes('acquired.'));
assert.ok(soldPack.telegramLine.startsWith('ARCHIVE UPDATE'));

// P3 · Drop Arc Generator — tease reveals zero facts, proof is sold-gated
const teaseText=makeTeaseCaption(facts,0,'thursday');
assert.ok(!teaseText.toLowerCase().includes('dior'),'tease must never leak the maison');
assert.ok(!teaseText.includes(facts.priceDisplay),'tease must never leak the price');
assert.ok(!teaseText.includes(facts.no),'tease must never leak the archive number');
assert.ok(teaseText.includes('the record opens thursday.'));
assert.ok(makeTeaseCaption(facts,0,'').includes('the record opens soon.')); // no reveal day set → generic line, never invented
assert.ok(makeProofCaption({...facts,sold:false}).includes('still one available'));
assert.equal(makeProofCaption({...facts,sold:true}),''); // enforced in code, not convention: sold pieces never get a proof act

// P1 · Hook Leaderboard — aggregation, ranking, and the "proven first" feedback loop
const campaignA={snapshots:{instagram:{bank:'saves',variant:0,hookText:'hook A',region:'americas'}},results:{instagram:{views:'1000',saves:'40',dms:'12'}}};
const campaignB={snapshots:{instagram:{bank:'saves',variant:1,hookText:'hook B',region:'americas'}},results:{instagram:{views:'500',saves:'10',dms:'30'}}};
const campaignC={snapshots:{instagram:{bank:'saves',variant:1,hookText:'hook B',region:'europe'}},results:{instagram:{views:'900',saves:'80',dms:'5'}}};
const campaignBlank={snapshots:{instagram:{bank:'saves',variant:2,hookText:'hook C',region:'americas'}},results:{}}; // no results entered → contributes zero, never fabricated
const entries=aggregateHooks([campaignA,campaignB,campaignC,campaignBlank]);
assert.equal(entries.length,4); // (bank,variant,region) triples stay separate: A/B-americas, B-europe, C-americas (zero results)
assert.equal(entries.find(entry=>entry.hookText==='hook C').dms,0);
const americasEntries=entries.filter(entry=>entry.region==='americas');
assert.equal(americasEntries.find(entry=>entry.variant===1).dms,30);
const ranked=rankByBank(entries,'americas');
assert.equal(ranked.saves[0].variant,1); // variant 1 (30 dms) outranks variant 0 (12 dms) in the Americas
assert.equal(bestVariantForBank(entries,'saves','americas'),1);
assert.equal(bestVariantForBank(entries,'saves','europe'),1); // europe's only saves entry is variant 1 too
assert.equal(bestVariantForBank(entries,'scarcity','americas'),0); // no data for this bank → falls back to 0
assert.equal(bestVariantForBank([],'saves',''),0);

// P7 · Desk review — monthly retro, rule-based, months with no data are absent
const soldCampaign={fields:{campaignDate:'2026-07-05',soldToggle:true},soldAt:'2026-07-08',snapshots:{instagram:{bank:'saves',hookText:'hook A',template:'Maison',region:'americas'}},results:{instagram:{dms:'20',saves:'5',views:''}}};
const openCampaign={fields:{campaignDate:'2026-07-12',soldToggle:false},snapshots:{instagram:{bank:'retention',hookText:'hook B',template:'Noir',region:'europe'}},results:{instagram:{dms:'10',saves:'2',views:''}}};
const undatedCampaign={fields:{soldToggle:false}}; // no campaignDate → excluded entirely, never guessed
const review=buildMonthlyReview([soldCampaign,openCampaign,undatedCampaign]);
assert.equal(review.length,1); // one month present
assert.equal(review[0].key,'2026-07');
assert.equal(review[0].dropsPosted,2);
assert.deepEqual(review[0].sellThrough,{sold:1,total:2});
assert.equal(review[0].medianDaysToAcquired,3); // 2026-07-05 → 2026-07-08
assert.equal(review[0].bestHook.hookText,'hook A'); // 20 dms beats 10
assert.equal(review[0].bestTemplate.template,'Maison');
assert.ok(review[0].insight.includes('Americas')); // Maison/saves drove more dms than Noir/europe
const emptyReview=buildMonthlyReview([{fields:{campaignDate:'2026-06-01',soldToggle:false}}]); // no snapshots/results at all
assert.equal(emptyReview[0].bestHook,null);
assert.equal(emptyReview[0].medianDaysToAcquired,null);
assert.equal(buildMonthlyReview([]).length,0);

// Factory · deterministic scale with a governance lock that batch review cannot bypass
const factoryTemplates=['collage','maison','editorial','noir','vitrine','atelier','gazette','snapshot','specimen','poet','runway','dossier'].map(id=>({id}));
let factory=buildFactoryPlan({campaignId:'test',archiveNo:'004',name:'Dior Hardcore Pouch',templates:factoryTemplates,source:{class:'owned',rightsConfirmed:true}});
assert.deepEqual(factoryCounts(factory),{total:31,draft:31,approved:0,rejected:0,flagship:4});
factory=approveSatelliteAssets(factory);
assert.equal(factory.assets.filter(asset=>asset.destination==='flagship'&&asset.status==='draft').length,4);
assert.equal(factory.assets.filter(asset=>asset.destination!=='flagship'&&asset.status==='approved').length,27);
assert.ok(factory.assets.filter(asset=>asset.destination==='flagship').every(asset=>!canAutoPublish({...asset,status:'approved'})));
assert.ok(exportManifest(factory).assets.filter(asset=>asset.destination==='flagship').every(asset=>asset.autoPublishEligible===false));
const satCopy=satelliteCopy(factory.assets.find(asset=>asset.destination==='education'),facts);
assert.ok(satCopy.includes('Curated by @rarebagclub'));assert.ok(!satCopy.includes('undefined'));assert.ok(!satCopy.includes('—'));
const blog=buildBlogHtml({...facts,publicName:'',name:'A <Bag>'});assert.ok(blog.includes('A &lt;Bag&gt;'));assert.ok(!blog.includes('A <Bag>'));
assert.equal(safeWebUrl('javascript:alert(1)'),'');assert.equal(safeWebUrl('https://example.com/').startsWith('https://'),true);
const csv=pinterestCsv([{title:'Bag, archive',filename:'pin.png',description:'A "quoted" note'}]);assert.ok(csv.includes('"Bag, archive"'));assert.ok(csv.includes('"A ""quoted"" note"'));

// P6 · Big-5 idiom & compliance — spelling round-trips, tiered hashtags, tease strips niche
assert.equal(applySpelling('thank you for the enquiry.','american'),'thank you for the inquiry.');
assert.equal(applySpelling('thank you for the enquiry.','british'),'thank you for the enquiry.'); // already correct — left alone
assert.equal(applySpelling('the colour is documented.','american'),'the color is documented.');
assert.equal(applySpelling('the color is documented.','british'),'the colour is documented.');
assert.equal(applySpelling('AUTHORIZED','british'),'AUTHORISED'); // case preserved
const sourceText='the colour is documented. thank you for the enquiry.'; // banks are always authored in this base form
assert.equal(applySpelling(sourceText,'british').includes('inquiry'),false); // british-mode pack never contains the american variant
assert.equal(applySpelling(sourceText,'american').includes('colour'),false); // american-mode pack never contains the british variant

const diorFacts={...facts,name:'Dior Hardcore Pouch',provenance:'Galliano era · c. 2003'};
const fullTags=discoveryTags(diorFacts);
assert.ok(fullTags.includes('#vintagedior'));
assert.ok(fullTags.includes('#rarebagclub'));
assert.equal(discoveryTags(diorFacts,{platform:'telegram'}),''); // telegram gets none
const tiktokTags=discoveryTags(diorFacts,{platform:'tiktok'});
assert.ok(tiktokTags.split(' ').length<=3);
assert.ok(tiktokTags.includes('#rarebagclub'));
assert.equal(discoveryTags(diorFacts,{stripNiche:true}).includes('#vintagedior'),false); // tease act never leaks the maison tag
assert.equal(discoveryTags({...diorFacts,name:'Unknown Brand Bag'}).split(' ').length,4); // unrecognized maison → no guessed niche tag (mid×2 + broad×1 + rarebagclub)
assert.equal(discoveryTags({...diorFacts,tags:false}),'');

console.log('Unit verification passed');
