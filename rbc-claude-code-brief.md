# RBC Studio — 9:16 Fix + Visual Verification Harness
### Brief for Claude Code · hand this over verbatim
### Target: v6.0.3+ · bump appVersion on completion

---

## MISSION

Two jobs, in order:

1. **Build the visual verification harness first** (Playwright, spec below) so you can SEE what the canvas renders. Do not attempt the design fix before the harness works — you are debugging pixels and cannot verify pixels from code alone.
2. **Fix the 9:16 (Reel/Story) rendering** for all 12 templates using the harness screenshots as your feedback loop.

---

## JOB 1 — VISUAL VERIFICATION HARNESS

Create `tools/visual-check.mjs`. Requirements:

- Zero-dependency static server inline (ES modules break on `file://`, the app uses `<script type="module">`)
- Generates test fixtures programmatically (4 mood images in a coherent palette + 1 bag cutout PNG with transparency) — no binary fixtures checked in
- Seeds all form fields with realistic data so the lot tag and text render
- Iterates all 12 templates × both formats, screenshots the main canvas each time
- Output to `shots/` as `{index}-{template}-{format}.png`
- After running, VIEW the screenshots yourself before claiming anything works

Install once:
```bash
npm i -D playwright
npx playwright install chromium
```

Reference implementation — adapt SELECTORS to the current DOM before running:

```js
// tools/visual-check.mjs
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { extname, join } from 'path';

const ROOT = process.cwd();
const PORT = 4173;
const SHOTS = 'shots';

// ---- ADJUST THESE to match the live DOM ----
const SEL = {
  moodInput: '#moodIn',
  bagInput: '#bagIn',
  proofCells: '.proof .cell',
  fmtFeed: '#fmtFeed',
  fmtReel: '#fmtReel',
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
  await page.evaluate(()=>document.fonts.ready);

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
    for(const [fmt,btn] of [['feed',SEL.fmtFeed],['reel',SEL.fmtReel]]){
      await page.click(btn);
      await page.waitForTimeout(450);
      await page.locator(SEL.stage).screenshot({
        path:`${SHOTS}/${String(i).padStart(2,'0')}-${TEMPLATE_NAMES[i]}-${fmt}.png`});
    }
  }
  await browser.close(); srv.close();
  console.log(`done → ${SHOTS}/ (${n*2} screenshots). NOW LOOK AT THEM.`);
})();
```

Run: `node tools/visual-check.mjs` — then **open and inspect every screenshot in `shots/`**. This is your feedback loop for Job 2. Re-run after every change.

---

## JOB 2 — THE 9:16 FIX

**Current bug (see attached user screenshot):** in Reel/Story 9:16 mode, templates compress all content into the top ~55% of the 1080×1920 canvas and leave a dead zone below. The layouts read as a 4:5 design pasted onto a taller canvas — because that is effectively what regressed.

**The spec — Meta official Reels safe zone (1080×1920):**
- Top hazard: **14%** → y 0–269 (profile row)
- Bottom hazard: **35%** → y 1248–1920 (caption, buttons, audio ticker)
- Side hazards: **6%** → 65px each side (extra ~70px right for the action rail)
- SAFE BAND for all text/critical content: **y 269 → 1248**

**Design rules every reel template must satisfy:**
1. **Backgrounds bleed the full 1920px.** Mood imagery, blur washes, paper textures, tonal vignettes — the chrome zones carry atmosphere, never flat empty color. If zero mood images are loaded, render the designed fallback (vignette + ghost brand marks), not void.
2. **Text anchors are relative to the safe band**, not hardcoded 4:5-era y values. Use band-relative positioning: `bandY(p) = 269 + (1248-269)*p`. Headers near p≈0.05, hero/bag around p≈0.45, commerce block p≈0.70–0.90.
3. **Content distributes across the whole band.** No template may leave a contiguous empty region taller than ~20% of the band inside the safe zone.
4. **The lot tag plaque** anchors at ~p 0.70 of the band; when the tag is ON, templates suppress their own duplicate name/price/CTA (this logic exists — verify it survived the refactor, per-template).
5. **Feed 4:5 is regression-frozen.** Feed screenshots before and after must match apart from intentional fixes.

**Per-template intent for 9:16** (keep each design's identity, recomposed vertically):
- Collage: grid cells fill full 1920; banners spaced down the band
- Maison: fragrance-ad — full blurred bleed, bag center, credit low in band
- Éditorial: magazine cover — full-bleed image, masthead hook top of band, gradient legibility strips
- Noir: gold frame inset exactly to the safe band; black chrome = cinematic letterbox
- Vitrine: paper-washed mood full bleed; lot card composed inside band
- Atelier: split — photo column full height, panel typography spread over the band
- Gazette/Snapshot/Specimen/Poet/Runway/Dossier: same principle — structure inside band, atmosphere in the bleed (Snapshot may scatter polaroids INTO chrome zones deliberately)

**Contact Sheet** (and any templates added after v3.x): apply the same band system; the screenshot shows it currently collapsing to the top half.

---

## ACCEPTANCE CHECKLIST — verify against screenshots, per template

- [ ] Reel: content spans the safe band; no dead zone >20% of band height
- [ ] Reel: chrome zones (top 269 / bottom 672) carry atmosphere, never flat void
- [ ] Reel: no text outside safe band; nothing under the right action rail
- [ ] Tag ON: single price authority — no duplicate name/price/CTA text anywhere
- [ ] Tag OFF: template's own commerce text returns correctly
- [ ] Feed: pixel-consistent with pre-fix baseline (no regressions)
- [ ] Zero-image state: designed fallback, not emptiness
- [ ] appVersion bumped, harness committed under tools/

**Process rule: a template is "fixed" only after you have looked at its screenshot. Not before.**
