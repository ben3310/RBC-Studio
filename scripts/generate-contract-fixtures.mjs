import fs from 'node:fs';
import path from 'node:path';
import {buildFactoryPlan,exportManifest} from '../js/factory/core.js';
import {approveNonFlagshipAssets,DESTINATIONS} from '../packages/policy-core/index.js';

const root=path.resolve(import.meta.dirname,'..');
const target=path.join(root,'packages','contracts','fixtures');
const templates=['collage','maison','editorial','noir','vitrine','atelier','gazette','snapshot','specimen','poet','runway','dossier'].map(id=>({id}));
const createdAt='2026-07-19T00:00:00.000Z';
let plan=buildFactoryPlan({campaignId:'campaign-fixture-004',archiveNo:'004',name:'Dior Hardcore Pouch',templates,previous:{createdAt,assets:[]},source:{class:'owned',licenseRef:'shoot-rbc-004',rightsConfirmed:true}});
plan=approveNonFlagshipAssets(plan,DESTINATIONS,'2026-07-19T00:05:00.000Z');plan.generatedAt='2026-07-19T00:05:00.000Z';
const manifest=exportManifest(plan);
fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'factory-plan.v1.json'),JSON.stringify(plan,null,2)+'\n');
fs.writeFileSync(path.join(target,'export-manifest.v1.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${plan.assets.length}-asset contract fixtures.`);
