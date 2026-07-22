import * as collage from './collage.js';
import * as maison from './maison.js';
import * as editorial from './editorial.js';
import * as noir from './noir.js';
import * as vitrine from './vitrine.js';
import * as atelier from './atelier.js';
import * as gazette from './gazette.js';
import * as snapshot from './snapshot.js';
import * as specimen from './specimen.js';
import * as poet from './poet.js';
import * as runway from './runway.js';
import * as dossier from './dossier.js';

// subtitle names each template's commercial job, not just its mood — answers
// "which template for a drop / for proof / for styling?" at a glance
export const TEMPLATE_META=[
  {id:'collage',label:'Collage',subtitle:'styling story · grid',feed:collage.feed,reel:collage.reel},
  {id:'maison',label:'Maison',subtitle:'signature drop',feed:maison.feed,reel:maison.reel},
  {id:'editorial',label:'Éditorial',subtitle:'feature record',feed:editorial.feed,reel:editorial.reel},
  {id:'noir',label:'Noir',subtitle:'evening drop · after dark',feed:noir.feed,reel:noir.reel},
  {id:'vitrine',label:'Vitrine',subtitle:'display case',feed:vitrine.feed,reel:vitrine.reel},
  {id:'atelier',label:'Atelier',subtitle:'the record · profile',feed:atelier.feed,reel:atelier.reel},
  {id:'gazette',label:'Gazette',subtitle:'press clipping · authority',feed:gazette.feed,reel:gazette.reel},
  {id:'snapshot',label:'Snapshot',subtitle:'candid · polaroid story',feed:snapshot.feed,reel:snapshot.reel},
  {id:'specimen',label:'Specimen',subtitle:'museum proof card',feed:specimen.feed,reel:specimen.reel},
  {id:'poet',label:'Poet',subtitle:'brand voice · poetry',feed:poet.feed,reel:poet.reel},
  {id:'runway',label:'Runway',subtitle:'styling angle · worn',feed:runway.feed,reel:runway.reel},
  {id:'dossier',label:'Dossier',subtitle:'provenance file',feed:dossier.feed,reel:dossier.reel}
];

export function createTemplateRegistry(env){return TEMPLATE_META.map(template=>({...template,feed:ctx=>template.feed(ctx,env),reel:ctx=>template.reel(ctx,env)}));}
