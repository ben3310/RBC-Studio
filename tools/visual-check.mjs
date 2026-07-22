// Visual verification harness for RBC Studio canvas templates.
// Zero binary fixtures checked in: mood images + bag cutout are generated on the fly.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

const ROOT = process.cwd();
const PORT = 4173;
const SHOTS = 'shots';

const SEL = {
  moodInput: '#moodIn',
  bagInput: '#bagIn',
  proofCells: '.proof .cell',
  fmtFeed: '#fmtFeed',
  fmtReel: '#fmtReel',
  tagToggle: '#tagToggle',
  stage: '#stage',
  fields: { '#fNo':'004', '#fName':'Dior Hardcore Pouch', '#fHook':'the loud one',
            '#fProv':'Galliano era · c. 2003 · authenticated',
            '#fPrice':'RM 1,200', '#fCta':'DM to claim' }
};
const TEMPLATE_NAMES = ['collage','maison','editorial','noir','vitrine','atelier',
                        'gazette','snapshot','specimen','poet','runway','dossier'];

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json', '.json':'application/json' };

function serve(){
  return new Promise(res=>{
    const srv=createServer(async (req,resp)=>{
      let p=req.url.split('?')[0]; if(p==='/')p='/index.html';
      try{
        const data=await readFile(join(ROOT,p));
        resp.writeHead(200,{'Content-Type':MIME[extname(p)]||'application/octet-stream'});
        resp.end(data);
      }catch{ resp.writeHead(404); resp.end(); }
    });
    srv.listen(PORT,()=>res(srv));
  });
}

async function makeFixtures(page){
  mkdirSync('fixtures',{recursive:true});
  const moods=[['#D9C9BC','MOOD 1'],['#C4A895','MOOD 2'],['#B99B8A','MOOD 3'],['#E4D8CB','MOOD 4']];
  for(let i=0;i<moods.length;i++){
    const b64=await page.evaluate(([c,label])=>{
      const cv=document.createElement('canvas');cv.width=800;cv.height=1000;
      const x=cv.getContext('2d');
      x.fillStyle=c;x.fillRect(0,0,800,1000);
      x.fillStyle='rgba(255,255,255,.4)';x.fillRect(60,60,680,880);
      x.fillStyle='#6B5B4E';x.font='60px serif';x.textAlign='center';
      x.fillText(label,400,520);
      return cv.toDataURL('image/png').split(',')[1];
    },moods[i]);
    writeFileSync(`fixtures/mood${i+1}.png`,Buffer.from(b64,'base64'));
  }
  const bag=await page.evaluate(()=>{
    const cv=document.createElement('canvas');cv.width=700;cv.height=600;
    const x=cv.getContext('2d');
    x.strokeStyle='#4A3B30';x.lineWidth=26;
    x.beginPath();x.arc(350,180,120,Math.PI,0);x.stroke();     // handle
    x.fillStyle='#5C4638';
    x.beginPath();x.roundRect(110,200,480,340,36);x.fill();     // body
    x.fillStyle='#C4A878';x.fillRect(310,300,80,56);            // clasp
    return cv.toDataURL('image/png').split(',')[1];
  });
  writeFileSync('fixtures/bag.png',Buffer.from(bag,'base64'));
}

(async()=>{
  mkdirSync(SHOTS,{recursive:true});
  const srv=await serve();
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:520,height:1400}});
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForFunction(sel=>document.querySelectorAll(sel).length>0,SEL.proofCells);
  await page.evaluate(()=>document.fonts.ready);
  // the fixed bottom action-dock (backdrop-filter compositor layer) can bleed
  // into cropped element screenshots in headless Chromium even when hidden
  // via CSS — remove it from the DOM outright for clean crops
  await page.evaluate(()=>document.querySelector('.action-dock')?.remove());

  // zero-image fallback state, captured before any fixtures are uploaded
  await page.click(SEL.fmtReel);
  await page.waitForTimeout(300);
  await page.locator(SEL.stage).screenshot({path:`${SHOTS}/zz-noimage-reel.png`});
  await page.click(SEL.fmtFeed);

  await makeFixtures(page);
  await page.setInputFiles(SEL.moodInput,[1,2,3,4].map(n=>`fixtures/mood${n}.png`));
  await page.setInputFiles(SEL.bagInput,'fixtures/bag.png');
  for(const [sel,val] of Object.entries(SEL.fields)){
    if(await page.locator(sel).count()) await page.fill(sel,val);
  }
  await page.waitForTimeout(600);

  const cells=page.locator(SEL.proofCells);
  const n=Math.min(await cells.count(),TEMPLATE_NAMES.length);
  for(let i=0;i<n;i++){
    await cells.nth(i).click();

    await page.click(SEL.fmtFeed);
    await page.waitForTimeout(400);
    await page.locator(SEL.stage).screenshot({
      path:`${SHOTS}/${String(i).padStart(2,'0')}-${TEMPLATE_NAMES[i]}-feed.png`});

    await page.click(SEL.fmtReel);
    await page.waitForTimeout(400);
    await page.locator(SEL.stage).screenshot({
      path:`${SHOTS}/${String(i).padStart(2,'0')}-${TEMPLATE_NAMES[i]}-reel-tagon.png`});

    await page.uncheck(SEL.tagToggle);
    await page.waitForTimeout(300);
    await page.locator(SEL.stage).screenshot({
      path:`${SHOTS}/${String(i).padStart(2,'0')}-${TEMPLATE_NAMES[i]}-reel-tagoff.png`});
    await page.check(SEL.tagToggle);
  }

  await browser.close(); srv.close();
  console.log(`done → ${SHOTS}/ (${n*3+1} screenshots). NOW LOOK AT THEM.`);
})();
