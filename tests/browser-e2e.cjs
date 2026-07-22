const http=require('http');
const fs=require('fs');
const path=require('path');
const os=require('os');
const {spawn,spawnSync}=require('child_process');
const assert=require('assert/strict');

const root=path.resolve(__dirname,'..');
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
// random ports per run: a lingering Edge from a previous run can otherwise
// hold the fixed debug port, and the harness would silently attach to that
// stale browser (and its stale service-worker cache) instead of the fresh one
const port=8800+Math.floor(Math.random()*200);
const debugPort=9300+Math.floor(Math.random()*200);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rbc-e2e-'));
const profile=path.join(temp,'profile');
const downloads=path.join(temp,'downloads');
fs.mkdirSync(downloads,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.toml':'text/plain'};

const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\//,'');
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end('not found');return;}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});response.end(data);});
});

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function poll(fn,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){try{const result=await fn();if(result)return result;}catch(error){}await delay(120);}throw new Error('Timed out waiting for browser');}

class CDP{
  constructor(url){this.url=url;this.next=1;this.pending=new Map();this.waiters=new Map();this.events=[];}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject;});this.ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);clearTimeout(pending.timer);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result);return;}this.events.push(message);const list=this.waiters.get(message.method)||[];list.splice(0).forEach(resolve=>resolve(message.params));};this.ws.onclose=()=>{for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('Browser closed while waiting for CDP '+pending.method));}this.pending.clear();};}
  send(method,params={}){const id=this.next++;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Timed out waiting for CDP '+method));},120000);this.pending.set(id,{resolve,reject,timer,method});this.ws.send(JSON.stringify({id,method,params}));});}
  wait(method,timeout=15000){return new Promise((resolve,reject)=>{const existing=this.events.findIndex(event=>event.method===method);if(existing>=0){resolve(this.events.splice(existing,1)[0].params);return;}const list=this.waiters.get(method)||[];list.push(resolve);this.waiters.set(method,list);setTimeout(()=>reject(new Error('Timed out waiting for '+method)),timeout);});}
  async evaluate(expression){const result=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text+' '+(result.exceptionDetails.exception?.description||''));return result.result.value;}
  close(){this.ws?.close();}
}

// Edge relaunches itself, so a plain kill on the spawned pid can leave a zombie
// holding the fixed debug port; a later run would then attach to that stale
// browser (with its stale service-worker cache) and fail with baffling
// assertions. Sweep any leftover rbc-e2e Edge trees before launching.
function killStrayEdge(){
  try{spawnSync('powershell.exe',['-NoProfile','-Command',
    "Get-CimInstance Win32_Process -Filter \"name='msedge.exe'\" | Where-Object {$_.CommandLine -match 'rbc-e2e'} | ForEach-Object {taskkill /PID $_.ProcessId /F /T 2>$null | Out-Null}"
  ],{stdio:'ignore',timeout:20000});}catch(error){}
}

async function main(){
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  let browser,target;
  for(let attempt=0;attempt<3&&!target;attempt++){
    killStrayEdge();
    await delay(1500); // let killed Edge trees release the debug port before binding it
    browser=spawn(edge,['--headless=new','--disable-gpu','--no-first-run','--no-proxy-server','--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
    target=await poll(async()=>{const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list');const list=await response.json();return list.find(item=>item.type==='page');}).catch(()=>null);
    if(!target)try{browser.kill();}catch(error){}
  }
  let cdp;
  try{
    if(!target)throw new Error('Edge did not expose the debug port after 3 attempts');
    cdp=new CDP(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Page.enable');await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});
    const exceptions=[];const originalOnMessage=cdp.ws.onmessage;cdp.ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails);originalOnMessage(event);};
    const loaded=cdp.wait('Page.loadEventFired');await cdp.send('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});await loaded;await delay(3500);

    const expectedVersion='v'+fs.readFileSync(path.join(root,'js','version.js'),'utf8').match(/'(\d+\.\d+\.\d+)'/)[1];
    assert.equal(await cdp.evaluate("document.getElementById('appVersion').textContent"),expectedVersion);
    assert.equal(await cdp.evaluate("window.__RBC_DEBUG.remoteConfig.enabled"),false,'remote factory must default off');
    assert.equal(await cdp.evaluate("document.querySelectorAll('.proof .cell').length"),12);
    // 9:16 is the default working format for new campaigns
    assert.equal(await cdp.evaluate("document.getElementById('proof').dataset.format==='reel'&&[...document.querySelectorAll('#proof canvas')].every(canvas=>canvas.width===270&&canvas.height===480)"),true);
    assert.equal(await cdp.evaluate("document.querySelectorAll('#campaignList .campaign-item').length"),1);
    assert.equal(await cdp.evaluate("['instagram','tiktok','telegram','threads','x'].every(p=>document.querySelector('[data-output='+p+']').value.length>20)"),true);
    assert.equal(await cdp.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth"),true);
    assert.ok(await cdp.evaluate("document.getElementById('stage').toDataURL().length")>5000);
    await cdp.evaluate("document.getElementById('fmtReel').click()");await delay(250);
    assert.equal(await cdp.evaluate("document.getElementById('proof').dataset.format==='reel'&&[...document.querySelectorAll('#proof canvas')].every(canvas=>canvas.width===270&&canvas.height===480&&canvas.parentElement.getAttribute('aria-label').includes('9:16'))"),true);
    await cdp.evaluate("document.getElementById('fmtFeed').click()");await delay(150);
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await delay(300);
    assert.equal(await cdp.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth"),true);

    await cdp.evaluate("for(const id of ['productUrl','fDetail']){const input=document.getElementById(id);input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('generatePack').click()");await delay(500);
    assert.equal(await cdp.evaluate("['instagram','tiktok','telegram','threads','x'].every(p=>{const value=document.querySelector('[data-output='+p+']').value;return value.length>20&&!/undefined|null/i.test(value)})"),true);
    assert.equal(await cdp.evaluate(`(async()=>{const buttons=[...document.querySelectorAll('[data-copy]')];for(const button of buttons){button.click();await new Promise(resolve=>setTimeout(resolve,80));if(!button.textContent.includes('Copied'))return false;}return buttons.length===5;})()`),true);

    await cdp.evaluate("document.getElementById('campaignLibraryButton').click();document.getElementById('newCampaign').click()");await delay(800);
    assert.equal(await cdp.evaluate("JSON.parse(localStorage.getItem('rbc-studio-v6-library')).length"),2);
    await cdp.evaluate("document.getElementById('campaignLibraryButton').click();document.querySelector('.campaign-item.active [data-library-action=duplicate]').click()");await delay(1000);
    assert.equal(await cdp.evaluate("JSON.parse(localStorage.getItem('rbc-studio-v6-library')).length"),3);
    await cdp.evaluate("window.prompt=()=> 'Renamed archive campaign';document.getElementById('campaignLibraryButton').click();document.querySelector('.campaign-item.active [data-library-action=rename]').click()");await delay(300);
    assert.equal(await cdp.evaluate("document.querySelector('.campaign-item.active h3').textContent"),'Renamed archive campaign');
    await cdp.evaluate("window.confirm=()=>true;document.querySelector('.campaign-item:not(.active) [data-library-action=delete]').click()");await delay(500);
    assert.equal(await cdp.evaluate("JSON.parse(localStorage.getItem('rbc-studio-v6-library')).length"),2);

    await cdp.evaluate(`new Promise(resolve=>{const c=document.createElement('canvas');c.width=160;c.height=120;const x=c.getContext('2d');x.fillStyle='#755f42';x.fillRect(20,38,120,70);x.strokeStyle='#2B2B2B';x.lineWidth=8;x.beginPath();x.arc(80,42,34,Math.PI,0);x.stroke();x.strokeStyle='#F5F1EC';x.lineWidth=3;x.strokeRect(30,48,100,48);c.toBlob(blob=>{const file=new File([blob],'bag.png',{type:'image/png'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.getElementById('bagIn');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(resolve,900);},'image/png');})`);
    assert.equal(await cdp.evaluate("document.getElementById('bagCount').textContent"),'✓');
    await cdp.evaluate(`(async()=>{const transfer=new DataTransfer();for(let index=0;index<3;index++){const c=document.createElement('canvas');c.width=480;c.height=640;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,480,640);g.addColorStop(0,['#D6CFC7','#C7B59A','#8B765F'][index]);g.addColorStop(1,['#755F42','#EBE7E1','#2B2B2B'][index]);x.fillStyle=g;x.fillRect(0,0,480,640);x.globalAlpha=.35;x.fillStyle='#F5F1EC';for(let n=0;n<8;n++){x.beginPath();x.arc(60+n*58,100+(n%3)*150,35+n*5,0,Math.PI*2);x.fill();}const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));transfer.items.add(new File([blob],'mood-'+index+'.png',{type:'image/png'}));}const input=document.getElementById('moodIn');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,1200));})()`);
    assert.equal(await cdp.evaluate("document.getElementById('moodCount').textContent"),'3');
    const pointerBefore=await cdp.evaluate("document.getElementById('stage').toDataURL()");
    await cdp.evaluate(`(()=>{const stage=document.getElementById('stage');const rect=stage.getBoundingClientRect();const event=(type,x,y)=>new PointerEvent(type,{clientX:rect.left+rect.width*x,clientY:rect.top+rect.height*y,bubbles:true,pointerId:1});stage.dispatchEvent(event('pointerdown',.35,.4));stage.dispatchEvent(event('pointermove',.68,.54));window.dispatchEvent(event('pointerup',.68,.54));})()`);await delay(350);
    assert.notEqual(await cdp.evaluate("document.getElementById('stage').toDataURL()"),pointerBefore);
    const before=await cdp.evaluate("document.getElementById('stage').toDataURL()");
    await cdp.evaluate("document.getElementById('stage').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");await delay(300);
    const after=await cdp.evaluate("document.getElementById('stage').toDataURL()");assert.notEqual(after,before);

    // snap-to-grid: dropping the bag within threshold of canvas-center snaps its
    // center exactly to W/2; disabling snap leaves the raw drop position instead
    const dragBagTo=(x,y)=>`(()=>{const stage=document.getElementById('stage');const rect=stage.getBoundingClientRect();const event=(type,px,py)=>new PointerEvent(type,{clientX:rect.left+rect.width*px,clientY:rect.top+rect.height*py,bubbles:true,pointerId:1});stage.dispatchEvent(event('pointerdown',.2,.2));stage.dispatchEvent(event('pointermove',${x},${y}));window.dispatchEvent(event('pointerup',${x},${y}));})()`;
    await cdp.evaluate(dragBagTo('.505','.2'));await delay(300);
    assert.equal(await cdp.evaluate("window.__RBC_DEBUG.canvasStudio.getState().bagX"),540,'bag should snap to the horizontal center');
    await cdp.evaluate("document.getElementById('snapToggle').click()");await delay(150);
    await cdp.evaluate(dragBagTo('.505','.2'));await delay(300);
    assert.notEqual(await cdp.evaluate("window.__RBC_DEBUG.canvasStudio.getState().bagX"),540,'snap-disabled drag should not snap');
    await cdp.evaluate("document.getElementById('snapToggle').click()");await delay(150);
    assert.equal(await cdp.evaluate(`(()=>{const cells=[...document.querySelectorAll('.proof .cell')];cells[0].focus();cells[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));return cells[1].classList.contains('active')&&document.activeElement===cells[1];})()`),true);
    const treatmentHashes=await cdp.evaluate(`(()=>{const hash=value=>{let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};const cells=[...document.querySelectorAll('.proof .cell')];const results=[];for(let i=0;i<cells.length;i++){cells[i].click();document.getElementById('fmtFeed').click();results.push(hash(document.getElementById('stage').toDataURL()));document.getElementById('fmtReel').click();results.push(hash(document.getElementById('stage').toDataURL()));}return results;})()`);
    assert.equal(new Set(treatmentHashes).size,24);
    // content factory: one saved source record yields 24 template renders, six
    // discovery pins, and one article. Batch approval is structurally unable to
    // approve the four flagship Maison/Editorial outputs.
    await cdp.evaluate(`(async()=>{const rights=document.getElementById('factoryRightsConfirmed');rights.checked=true;rights.dispatchEvent(new Event('change',{bubbles:true}));await window.__RBC_DEBUG.factoryController.generate();})()`);
    assert.equal(await cdp.evaluate("document.querySelectorAll('[data-factory-asset]').length"),31);
    assert.equal(await cdp.evaluate("document.querySelectorAll('[data-factory-asset] img.factory-thumb').length"),30);
    await cdp.evaluate("document.getElementById('factoryApproveSatellites').click()");await delay(350);
    assert.equal(await cdp.evaluate("window.__RBC_DEBUG.getActive().factory.plan.assets.filter(a=>a.destination==='flagship'&&a.status==='draft').length"),4);
    assert.equal(await cdp.evaluate("window.__RBC_DEBUG.getActive().factory.plan.assets.filter(a=>a.destination!=='flagship'&&a.status==='approved').length"),27);
    await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
    await cdp.evaluate("document.getElementById('factoryExport').click()");
    const factoryZipPath=await poll(()=>{const found=fs.readdirSync(downloads).find(name=>name.startsWith('rbc-factory-')&&name.endsWith('.zip'));return found&&path.join(downloads,found);},30000);
    const factoryZipText=fs.readFileSync(factoryZipPath).toString('latin1');
    for(const name of ['factory/manifest.json','factory/licenses.json','factory/pinterest.csv','factory/RUNBOOK.txt'])assert.ok(factoryZipText.includes(name),name+' missing from factory ZIP');
    fs.unlinkSync(factoryZipPath);
    if(process.env.RBC_CAPTURE_TEMPLATES){
      const review=await cdp.evaluate(`(()=>{const sheet=document.createElement('canvas');sheet.width=720;sheet.height=960;const out=sheet.getContext('2d'),stage=document.getElementById('stage'),cells=[...document.querySelectorAll('.proof .cell')];out.fillStyle='#F1ECE2';out.fillRect(0,0,sheet.width,sheet.height);cells.forEach((cell,index)=>{cell.click();document.getElementById('fmtReel').click();const x=(index%4)*180,y=Math.floor(index/4)*320;out.drawImage(stage,x,y,180,320);out.fillStyle='rgba(38,37,31,.82)';out.fillRect(x,y,180,24);out.font='600 11px sans-serif';out.textAlign='center';out.fillStyle='#F5F1EC';out.fillText(cell.querySelector('.nm').textContent.toUpperCase(),x+90,y+16,166);});return sheet.toDataURL('image/png');})()`);
      fs.writeFileSync(path.join(root,'template-9x16-review.png'),Buffer.from(review.split(',')[1],'base64'));
    }

    const baseVisual=await cdp.evaluate("document.getElementById('stage').toDataURL()");
    await cdp.evaluate("(()=>{const guide=document.getElementById('guideToggle');guide.checked=true;guide.dispatchEvent(new Event('change',{bubbles:true}))})()");await delay(150);
    assert.notEqual(await cdp.evaluate("document.getElementById('stage').toDataURL()"),baseVisual);
    await cdp.evaluate("(()=>{const guide=document.getElementById('guideToggle');guide.checked=false;guide.dispatchEvent(new Event('change',{bubbles:true}));const sold=document.getElementById('soldToggle');sold.checked=true;sold.dispatchEvent(new Event('change',{bubbles:true}))})()");await delay(150);
    assert.notEqual(await cdp.evaluate("document.getElementById('stage').toDataURL()"),baseVisual);
    await cdp.evaluate("document.getElementById('exportBtn').click()");await delay(250);
    assert.equal(await cdp.evaluate("document.getElementById('resultImg').src.startsWith('data:image/png')&&document.getElementById('downloadPng').href.startsWith('data:image/png')&&document.getElementById('downloadPng').download.endsWith('-reel.png')"),true);

    // sold-story engine: the card appears only while sold, generates on demand,
    // and the library marks the campaign ACQUIRED with a dedicated action
    assert.equal(await cdp.evaluate("document.getElementById('soldStoryCard').hidden"),false);
    await cdp.evaluate("document.getElementById('genSoldStory').click()");await delay(150);
    assert.ok(await cdp.evaluate("document.getElementById('soldInstagram').value.length")>10);
    assert.ok(await cdp.evaluate("document.getElementById('soldInstagram').value").then(value=>value.includes('has been acquired.')));
    await cdp.evaluate("document.getElementById('campaignLibraryButton').click()");await delay(200);
    assert.equal(await cdp.evaluate("document.querySelector('.campaign-item.active .acquired-chip')?.textContent"),'Acquired');
    assert.ok(await cdp.evaluate("!!document.querySelector('.campaign-item.active [data-library-action=\"sold-story\"]')"));
    await cdp.evaluate("document.getElementById('campaignLibraryButton').click()");await delay(150);

    await cdp.evaluate("(()=>{const sold=document.getElementById('soldToggle');sold.checked=false;sold.dispatchEvent(new Event('change',{bubbles:true}))})()");await delay(350);

    const campaignVisualBeforeSwitch=await cdp.evaluate(`(()=>{const sample=document.createElement('canvas');sample.width=36;sample.height=64;sample.getContext('2d').drawImage(document.getElementById('stage'),0,0,36,64);return [...sample.getContext('2d').getImageData(0,0,36,64).data];})()`);
    const imageCampaignId=await cdp.evaluate("JSON.parse(localStorage.getItem('rbc-studio-v6-active'))");
    await cdp.evaluate("document.getElementById('campaignLibraryButton').click();document.querySelector('.campaign-item:not(.active) [data-library-action=open]').click()");await delay(1500);
    assert.equal(await cdp.evaluate("document.getElementById('bagCount').textContent"),'None');
    await cdp.evaluate(`document.getElementById('campaignLibraryButton').click();document.querySelector('[data-campaign-id="${imageCampaignId}"] [data-library-action=open]').click()`);await delay(1800);
    assert.notEqual(await cdp.evaluate("document.getElementById('bagCount').textContent"),'None');
    const campaignVisualAfterSwitch=await cdp.evaluate(`(()=>{const sample=document.createElement('canvas');sample.width=36;sample.height=64;sample.getContext('2d').drawImage(document.getElementById('stage'),0,0,36,64);return [...sample.getContext('2d').getImageData(0,0,36,64).data];})()`);
    const visualDelta=campaignVisualAfterSwitch.reduce((sum,value,index)=>sum+Math.abs(value-campaignVisualBeforeSwitch[index]),0)/campaignVisualAfterSwitch.length;
    assert.ok(visualDelta<2,'Canvas changed after campaign switch; mean pixel delta '+visualDelta.toFixed(2));

    const reloaded=cdp.wait('Page.loadEventFired');await cdp.send('Page.reload',{ignoreCache:true});await reloaded;await delay(3200);
    assert.equal(await cdp.evaluate("document.getElementById('bagCount').textContent"),'✓');
    assert.equal(await cdp.evaluate("document.getElementById('imageStorageHint').textContent.includes('save')"),true);
    assert.equal(await cdp.evaluate("document.querySelectorAll('[data-factory-asset]').length"),31);
    assert.equal(await cdp.evaluate("window.__RBC_DEBUG.getActive().factory.plan.assets.filter(a=>a.destination==='flagship'&&a.status==='draft').length"),4);

    await cdp.evaluate("(()=>{const date=document.getElementById('campaignDate');date.value='2030-04-05';date.dispatchEvent(new Event('change',{bubbles:true}));const time=document.getElementById('timeInstagram');time.value='13:37';time.dispatchEvent(new Event('input',{bubbles:true}));const ready=document.querySelector('[data-ready=instagram]');ready.checked=true;ready.dispatchEvent(new Event('change',{bubbles:true}))})()");await delay(700);
    const persisted=cdp.wait('Page.loadEventFired');await cdp.send('Page.reload',{ignoreCache:true});await persisted;await delay(3000);
    assert.equal(await cdp.evaluate("document.getElementById('campaignDate').value==='2030-04-05'&&document.getElementById('timeInstagram').value==='13:37'&&document.querySelector('[data-ready=instagram]').checked"),true);
    await cdp.evaluate("(()=>{const date=document.getElementById('campaignDate');const now=new Date();date.value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);date.dispatchEvent(new Event('change',{bubbles:true}))})()");await delay(500);

    await cdp.evaluate("const x=document.getElementById('outX');x.value='1/2 ok\\n\\n2/2 '+('x'.repeat(300));x.dispatchEvent(new Event('input',{bubbles:true}));");await delay(400);
    assert.equal(await cdp.evaluate("document.querySelector('[data-platform=x]').classList.contains('limit-warning')"),true);
    assert.equal(await cdp.evaluate("document.querySelector('[data-platform=x] .validation-note').textContent.includes('300/280')"),false);
    assert.equal(await cdp.evaluate("document.querySelector('[data-platform=x] .validation-note').textContent.includes('/280')"),true);
    await cdp.evaluate("const box=document.querySelector('[data-ready=x]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}))");
    assert.equal(await cdp.evaluate("document.querySelector('[data-platform=x] .ready-label').classList.contains('warning')"),true);

    await cdp.evaluate("document.querySelector('[data-queue=x]').click()");await delay(400);
    assert.equal(await cdp.evaluate("document.querySelector('[data-queue=x] .queue-status').textContent"),'Posted');
    const postedReload=cdp.wait('Page.loadEventFired');await cdp.send('Page.reload',{ignoreCache:true});await postedReload;await delay(3000);
    assert.equal(await cdp.evaluate("document.querySelector('[data-queue=x] .queue-status').textContent"),'Posted');

    // drop arc: tease reveals nothing (no maison, no archive number) and its
    // render genuinely differs from the reveal; proof switches to the sold
    // offer the moment the piece is marked sold
    await cdp.evaluate("document.getElementById('genTease').click()");await delay(400);
    const teaseCaptionText=await cdp.evaluate("document.getElementById('arcTeaseCaption').value");
    assert.ok(teaseCaptionText.length>10);
    assert.ok(!teaseCaptionText.toLowerCase().includes('dior'),'tease caption must not leak the maison name');
    assert.ok(!teaseCaptionText.includes('004'),'tease caption must not leak the archive number');
    assert.equal(await cdp.evaluate("document.getElementById('arcDotTease').classList.contains('ready')"),true);
    const arcBlobsDiffer=await cdp.evaluate(`(async()=>{
      const toDataUrl=blob=>new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
      const reveal=await toDataUrl(await window.__RBC_DEBUG.canvasStudio.renderBlob('reel'));
      const tease=await toDataUrl(await window.__RBC_DEBUG.canvasStudio.renderTeaseBlob('reel'));
      return reveal!==tease;
    })()`);
    assert.equal(arcBlobsDiffer,true,'tease render must differ visually from the reveal');
    await cdp.evaluate("document.getElementById('genProof').click()");await delay(150);
    assert.equal(await cdp.evaluate("document.getElementById('arcProofLabel').textContent"),'Proof caption');
    assert.ok(await cdp.evaluate("document.getElementById('arcProofCaption').value.length")>10);
    await cdp.evaluate("(()=>{const sold=document.getElementById('soldToggle');sold.checked=true;sold.dispatchEvent(new Event('change',{bubbles:true}))})()");await delay(150);
    await cdp.evaluate("document.getElementById('genProof').click()");await delay(150);
    assert.equal(await cdp.evaluate("document.getElementById('arcProofLabel').textContent"),'Proof slot → acquired offer');
    assert.equal(await cdp.evaluate("document.getElementById('arcProofCaption').value.includes('has been acquired.')"),true);
    await cdp.evaluate("(()=>{const sold=document.getElementById('soldToggle');sold.checked=false;sold.dispatchEvent(new Event('change',{bubbles:true}))})()");await delay(150);

    await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
    await cdp.evaluate("document.getElementById('exportPack').click()");
    const zipPath=await poll(()=>{const found=fs.readdirSync(downloads).find(name=>name.endsWith('.zip'));return found&&path.join(downloads,found);},30000);
    const zipBytes=fs.readFileSync(zipPath);assert.equal(zipBytes.readUInt32LE(0),0x04034b50);const zipText=zipBytes.toString('latin1');for(const name of ['campaign-brief.txt','instagram/feed.png','tiktok/shot-list.txt','schedule.txt','tease/visual.png','tease/caption.txt','proof/visual.png','proof/caption.txt'])assert.ok(zipText.includes(name),name+' missing from ZIP');

    await cdp.evaluate("document.getElementById('exportCalendar').click();document.getElementById('exportCopy').click()");
    await poll(()=>fs.readdirSync(downloads).some(name=>name.endsWith('.ics'))&&fs.readdirSync(downloads).some(name=>name.endsWith('.txt')),10000);
    assert.equal(await cdp.evaluate("document.querySelectorAll('.ai-polish:not([hidden])').length"),0);

    // DM desk: generates on demand, stays out of the 5-channel readiness meter,
    // and each script gets its own working copy button
    await cdp.evaluate("document.querySelector('.dm-desk').open=true;document.getElementById('genDm').click()");await delay(500);
    assert.equal(await cdp.evaluate("document.getElementById('dmEnquiry').value.length>10&&document.getElementById('dmProvenance').value.length>10"),true);
    assert.equal(await cdp.evaluate("document.getElementById('dmTimezone').value"),''); // courtesy line stays empty until the operator opts in
    await cdp.evaluate("const box=document.getElementById('dmTimezoneEnabled');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}))");await delay(150);
    assert.ok(await cdp.evaluate("document.getElementById('dmTimezone').value.length")>10);
    assert.equal(await cdp.evaluate(`(async()=>{const button=document.querySelector('[data-dm-copy=enquiry]');button.click();await new Promise(resolve=>setTimeout(resolve,120));return button.textContent.includes('Copied');})()`),true);
    assert.equal(await cdp.evaluate("document.querySelectorAll('.ready-check').length"),5); // dm desk never adds a 6th readiness checkbox

    // hook leaderboard: results entered in the queue feed the desk record,
    // and "proven first" never breaks generation even with live data
    await cdp.evaluate("(()=>{const dms=document.getElementById('dmsInstagram');dms.value='25';dms.dispatchEvent(new Event('input',{bubbles:true}));const saves=document.getElementById('savesInstagram');saves.value='60';saves.dispatchEvent(new Event('input',{bubbles:true}));})()");await delay(500);
    await cdp.evaluate("document.getElementById('campaignLibraryButton').click();document.querySelector('.desk-record').open=true");await delay(200);
    assert.equal(await cdp.evaluate("document.getElementById('leaderboardBody').textContent.includes('25 dms')"),true);
    await cdp.evaluate("document.getElementById('campaignLibraryButton').click()");await delay(150);
    await cdp.evaluate("(()=>{const box=document.getElementById('provenFirst');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}))})()");
    await cdp.evaluate("document.getElementById('generatePack').click()");await delay(400);
    assert.equal(await cdp.evaluate("document.getElementById('outInstagram').value.length>20"),true);
    await cdp.evaluate("(()=>{const box=document.getElementById('provenFirst');box.checked=false;box.dispatchEvent(new Event('change',{bubbles:true}))})()");

    // spelling switch: british mode never leaves an american-mode word behind
    // in the generated pack, and switching back restores american
    await cdp.evaluate("(()=>{const sel=document.getElementById('copySpelling');sel.value='british';sel.dispatchEvent(new Event('change',{bubbles:true}))})();document.getElementById('generatePack').click()");await delay(500);
    assert.equal(await cdp.evaluate("['instagram','tiktok','telegram','threads','x'].every(p=>!/\\binquiry\\b/i.test(document.querySelector('[data-output='+p+']').value))"),true);
    await cdp.evaluate("document.getElementById('genDm').click()");await delay(400);
    assert.equal(await cdp.evaluate("!/\\binquiry\\b/i.test(document.getElementById('dmEnquiry').value)&&document.getElementById('dmEnquiry').value.length>10"),true);
    await cdp.evaluate("(()=>{const sel=document.getElementById('copySpelling');sel.value='american';sel.dispatchEvent(new Event('change',{bubbles:true}))})();document.getElementById('generatePack').click()");await delay(500);

    // a collapsed panel must always be reopenable. The chip once carried a
    // `hidden` attribute, and [hidden]{display:none!important} beat the
    // .collapsed rule, so collapsing left an empty panel with no way back in.
    // headless Edge has no window focus, so drive the real focusout handler.
    const collapseBrief=async()=>{await cdp.evaluate("document.getElementById('campaignDate').dispatchEvent(new FocusEvent('focusout',{bubbles:true}))");await delay(400);};
    const briefCollapsed=()=>cdp.evaluate("document.getElementById('briefPanel').classList.contains('collapsed')");
    await collapseBrief();
    assert.equal(await briefCollapsed(),true);
    assert.equal(await cdp.evaluate("getComputedStyle(document.getElementById('briefSummaryChip')).display"),'flex');
    assert.equal(await cdp.evaluate("document.getElementById('briefSummaryChip').getBoundingClientRect().width>100"),true);
    await cdp.evaluate("document.getElementById('briefSummaryChip').click()");await delay(300);
    assert.equal(await briefCollapsed(),false);
    assert.notEqual(await cdp.evaluate("getComputedStyle(document.getElementById('briefBody')).display"),'none');
    // jumping to a section reopens it rather than scrolling to a dead end
    await collapseBrief();
    await cdp.evaluate("document.querySelector('#readinessChips [data-chip-target=brief]').click()");await delay(400);
    assert.equal(await briefCollapsed(),false);
    await collapseBrief();
    await cdp.evaluate("document.querySelector('.campaign-nav a[href=\"#brief\"]').click()");await delay(400);
    assert.equal(await briefCollapsed(),false);
    await cdp.evaluate("document.getElementById('imagesPanel').classList.add('collapsed')");
    assert.equal(await cdp.evaluate("getComputedStyle(document.getElementById('imagesSummaryChip')).display"),'flex');
    await cdp.evaluate("document.getElementById('imagesSummaryChip').click()");await delay(300);
    assert.equal(await cdp.evaluate("document.getElementById('imagesPanel').classList.contains('collapsed')"),false);

    const campaignsBeforeReset=await cdp.evaluate("JSON.parse(localStorage.getItem('rbc-studio-v6-library')).length");
    await cdp.evaluate("window.confirm=()=>true;document.getElementById('resetCampaign').click()");await delay(1400);
    assert.equal(await cdp.evaluate("JSON.parse(localStorage.getItem('rbc-studio-v6-library')).length"),campaignsBeforeReset);
    assert.equal(await cdp.evaluate("document.getElementById('bagCount').textContent"),'None');
    assert.equal(await cdp.evaluate("document.getElementById('outInstagram').value.length>20"),true);

    assert.equal(exceptions.length,0,'Uncaught browser exceptions: '+exceptions.map(item=>item.text).join(', '));
    console.log('Browser verification passed');
  } finally {
    cdp?.close();browser.kill('SIGTERM');spawnSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore'});await delay(800);server.close();
    for(let attempt=0;attempt<5;attempt++){try{fs.rmSync(temp,{recursive:true,force:true});break;}catch(error){if(attempt===4)console.warn('Temporary Edge profile will be removed by the system.');await delay(500);}}
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
