import {createTemplateRegistry,TEMPLATE_META} from './templates/registry.js';
import * as primitives from './templates/primitives.js';
import {disclaimer,discoveryTags,fomoCloser,formatPrice,graphemeLength,lintGenerated,openerLine,restrainedLine,signalHook} from './facts.js';
import {PLATFORM_LIMITS} from './validation.js';
export function initCanvasStudio(options={}){
  const W=1080, H=1350;
  const stage=document.getElementById('stage');
  const mctx=stage.getContext('2d');

  const TEMPLATES=TEMPLATE_META.map(template=>template.label);
  const TEMPLATE_SUBTITLES=TEMPLATE_META.map(template=>template.subtitle||'');
  let current=0;

  const palette=['#C08D76','#6E4F3A','#7A3B45','#7C8471','#3A3833','#B8916A','#B9AE97'];
  let accent=palette[0];

  const swBox=document.getElementById('swatches');
  palette.forEach((c,i)=>{
    const d=document.createElement('div');
    d.className='sw'+(i===0?' active':'');
    d.style.background=c;
    d.onclick=()=>{document.querySelectorAll('.sw').forEach(x=>x.classList.remove('active'));d.classList.add('active');accent=c;redrawAll();options.onCanvasStateChange?.(getState());};
    swBox.appendChild(d);
  });

  let moodImgs=[], bagImg=null;
  let moodBlobs=[], bagBlob=null;
  let bagX=W/2, bagY=H*0.42, dragging=false;
  let txX=0, txY=0, dragMode='bag', lastP=null;
  // per-element (group) layout overrides for reel mode, keyed by templateId → blockKey → {dx,dy}
  let layout={}, activeKey=null, hitRegions=[], registering=false, exporting=false, renderTpl=null;
  const tplId=()=>TEMPLATE_META[current].id;
  // block lookups key off whichever template is being drawn (renderTpl during the
  // thumbnail sweep, else the selected one) so overrides never bleed across templates
  const layoutFor=key=>{const t=renderTpl||tplId();return (layout[t]&&layout[t][key])||{dx:0,dy:0};};
  function layoutSlot(key){const t=tplId();const m=layout[t]||(layout[t]={});return m[key]||(m[key]={dx:0,dy:0});}
  // a draggable text group: applies its saved offset, draws, and (on the main
  // reel canvas) registers a hit-rect so pointer/keyboard can pick it up
  function block(bctx,key,x,y,w,h,draw){
    const ov=layoutFor(key);
    bctx.save();bctx.translate(ov.dx,ov.dy);draw();bctx.restore();
    if(registering&&bctx===mctx)hitRegions.push({key,x:x+ov.dx,y:y+ov.dy,w,h});
  }
  function pickBlock(p){
    let best=null;
    for(const r of hitRegions){
      if(p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h){const a=r.w*r.h;if(!best||a<=best.a)best={key:r.key,a};}
    }
    return best?best.key:null;
  }
  // format handling: templates always render to a 4:5 art canvas;
  // reel/story mode letterboxes the art onto a 9:16 brand backdrop clear of IG's UI zones
  const art=document.createElement('canvas');art.width=W;art.height=H;
  const actx=art.getContext('2d');
  let fmt='feed';            // 'feed' = 1080x1350 · 'reel' = 1080x1920
  const REEL_H=1920;
  let showGuide=false;
  // CH = current render height. Official Meta Reels safe-zone (House of Marketers / Meta Business):
  // top 14%, bottom 35%, sides 6% of a 1080x1920 frame.
  let CH=H;
  const REEL_TOP=Math.round(REEL_H*0.14);   // 269 · profile row
  const REEL_BOT=Math.round(REEL_H*0.15);   // 288 · caption/CTA (tuned down from 35% for a taller working band)
  const REEL_SIDE=Math.round(W*0.06);       // 65
  function SIT(){ return fmt==='reel'?REEL_TOP:0; }
  function SIB(){ return fmt==='reel'?REEL_BOT:0; }
  function SIL(){ return fmt==='reel'?REEL_SIDE:0; }        // left inset
  function SIR(){ return fmt==='reel'?REEL_SIDE+70:0; }     // right inset · extra for action rail
  function VY(p){ const top=SIT(), bot=CH-SIB(); return top+(bot-top)*p; }

  function loadFile(f){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=URL.createObjectURL(f);});}

  document.getElementById('moodIn').addEventListener('change',async e=>{
    const files=[...e.target.files].slice(0,6);
    moodBlobs=files;
    moodImgs=[];
    for(const f of files) moodImgs.push(await loadFile(f));
    document.getElementById('moodCount').textContent=moodImgs.length;
    redrawAll();
    options.onImagesChanged?.(getImageBlobs());
  });
  document.getElementById('bagIn').addEventListener('change',async e=>{
    if(!e.target.files.length)return;
    bagBlob=e.target.files[0];
    bagImg=await loadFile(bagBlob);
    document.getElementById('bagCount').textContent='✓';
    redrawAll();
    options.onImagesChanged?.(getImageBlobs());
  });
  ['fNo','fName','fHook','fProv','fPrice','fCta','bagSize'].forEach(id=>{
    document.getElementById(id).addEventListener('input',()=>{redrawAll();buildCaption();});
  });
  document.getElementById('priceCurrency')?.addEventListener('change',()=>{redrawAll();buildCaption();});
  document.getElementById('gridMode').addEventListener('change',redrawAll);
  document.getElementById('soldToggle').addEventListener('change',redrawAll);
  document.getElementById('tagToggle').addEventListener('change',redrawAll);

  // tease act: crops the bag to a zoomed detail region and forces every
  // template's tagOn() branch (which already skips name/price/CTA text) —
  // the shared lot tag and SOLD stamp are separately gated on env.tease
  let teaseMode=false;
  const F=id=>document.getElementById(id).value;
  function tagOn(){if(teaseMode)return true;const t=document.getElementById('tagToggle');return !!(t&&t.checked);}
  function priceDisplay(){return formatPrice({price:F('fPrice'),currency:document.getElementById('priceCurrency')?.value||'USD'});}
  const primitiveEnv={W,H,F,VY,cover:(...args)=>cover(...args),blurCover:(...args)=>blurCover(...args)};
  Object.defineProperties(primitiveEnv,{CH:{get:()=>CH},fmt:{get:()=>fmt},accent:{get:()=>accent},txY:{get:()=>txY},moodImgs:{get:()=>moodImgs},RT:{get:()=>RT},RB:{get:()=>RB},priceDisplay:{get:priceDisplay},tease:{get:()=>teaseMode}});

  // ---------- helpers ----------
  function cover(ctx,img,x,y,w,h){return primitives.cover(ctx,img,x,y,w,h);}
  // universal cheap blur: draw tiny, stretch back
  const off=document.createElement('canvas');
  function blurCover(ctx,img,x,y,w,h,strength){return primitives.blurCover(ctx,img,x,y,w,h,strength);}
  function drawBag(ctx){
    if(!bagImg)return;
    const pct=document.getElementById('bagSize').value/100;
    const bw=W*pct, bh=bw*(bagImg.height/bagImg.width);
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=44;ctx.shadowOffsetY=18;
    if(teaseMode){
      // 2.4x zoom centered on the bag's upper third, where the hardware lives
      const zoom=2.4,sw=bagImg.width/zoom,sh=bagImg.height/zoom;
      const sx=(bagImg.width-sw)/2,sy=Math.max(0,Math.min(bagImg.height*0.12,bagImg.height-sh));
      ctx.drawImage(bagImg,sx,sy,sw,sh,bagX-bw/2,bagY-bh/2,bw,bh);
    } else {
      ctx.drawImage(bagImg,bagX-bw/2,bagY-bh/2,bw,bh);
    }
    ctx.restore();
  }
  function banner(ctx,text,cy,size,opts){return primitives.banner(primitiveEnv,ctx,text,cy,size,opts);}
  function mark(ctx,dark){return primitives.mark(primitiveEnv,ctx,dark);}
  function lotNo(ctx,color){return primitives.lotNo(primitiveEnv,ctx,color);}
  function sold(ctx){return primitives.sold(primitiveEnv,ctx);}
  // ===== standardized lot tag · the browsability anchor =====
  // identical size + position on every template so the grid reads like a catalogue
  function gridTag(ctx){return primitives.gridTag(primitiveEnv,ctx);}
  function hookLines(){
    const raw=F('fHook');
    let lines;
    if(raw.includes('|'))lines=raw.split('|').map(s=>s.trim()).filter(Boolean);
    else{
      const words=raw.split(/\s+/).filter(Boolean);
      if(words.length<=2)lines=words;
      else{const mid=Math.ceil(words.length/2);lines=[words.slice(0,mid).join(' '),words.slice(mid).join(' ')];}
    }
    // reel hook type runs 74-108px per line; a manually piped hook of 4+ lines
    // crowds or clips the safe band, so fold any overflow into the last line
    if(fmt==='reel'&&lines.length>3)lines=[...lines.slice(0,2),lines.slice(2).join(' ')];
    return lines;
  }
  const oneLine=primitives.oneLine;
  // ---- smart mood grid ----
  function moodAt(i){ return moodImgs.length?moodImgs[i%moodImgs.length]:null; }
  function gridCount(){
    const m=document.getElementById('gridMode').value;
    if(m!=='auto')return parseInt(m,10);
    return Math.min(Math.max(moodImgs.length,1),6);
  }
  function layoutRects(n){
    // returns [x,y,w,h] cells covering the full canvas, designed per count
    switch(n){
      case 1: return [[0,0,W,CH]];
      case 2: return [[0,0,W/2,CH],[W/2,0,W/2,CH]];
      case 3: return [[0,0,W*.62,CH],[W*.62,0,W*.38,CH/2],[W*.62,CH/2,W*.38,CH/2]];
      case 4: return [[0,0,W/2,CH/2],[W/2,0,W/2,CH/2],[0,CH/2,W/2,CH/2],[W/2,CH/2,W/2,CH/2]];
      case 5: return [[0,0,W*.55,CH/3],[0,CH/3,W*.55,CH/3],[0,CH*2/3,W*.55,CH/3],
                      [W*.55,0,W*.45,CH/2],[W*.55,CH/2,W*.45,CH/2]];
      default: {
        const cols=2,rows=3,cw=W/cols,ch=CH/rows,out=[];
        for(let i=0;i<6;i++)out.push([(i%cols)*cw,Math.floor(i/cols)*ch,cw,ch]);
        return out;
      }
    }
  }
  function collageGrid(ctx){
    ctx.fillStyle='#E8E1D3';ctx.fillRect(0,0,W,CH);
    if(!moodImgs.length)return;
    layoutRects(gridCount()).forEach((r,i)=>{
      cover(ctx,moodAt(i),r[0],r[1],r[2],r[3]);
      // hairline seams keep the collage crisp
      ctx.strokeStyle='rgba(241,236,226,.9)';ctx.lineWidth=3;
      ctx.strokeRect(r[0],r[1],r[2],r[3]);
    });
  }
  function wrapLines(ctx,text,maxW){return primitives.wrapLines(ctx,text,maxW);}

  // ---------- templates ----------







  // ===== six additional treatments (trend-mapped) =====
  function polaroidFrame(ctx,x,y,w,h,rot,img){return primitives.polaroidFrame(primitiveEnv,ctx,x,y,w,h,rot,img);}
  function tape(ctx,x,y,rot){return primitives.tape(primitiveEnv,ctx,x,y,rot);}








  // ============ DEDICATED 9:16 DESIGNS ============
  // RT/RB = safe band edges. Chrome zones get atmosphere, never content.
  const RT=REEL_TOP, RB=REEL_H-REEL_BOT;   // 269 .. 1248
  const SH=RB-RT;

  function reelMast(ctx,color){return primitives.reelMast(primitiveEnv,ctx,color);}






  // reel variants of the six new treatments: same safe-band layout,
  // chrome zones filled with atmosphere so nothing reads as dead space
  function atmosphere(ctx,tone){return primitives.atmosphere(primitiveEnv,ctx,tone);}
  function vignette(ctx){return primitives.vignette(primitiveEnv,ctx);}
  function hazardVignette(ctx){return primitives.hazardVignette(primitiveEnv,ctx);}







  const templateEnv={W,H,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,SIT,SIB,SIL,SIR,VY,F,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere,vignette,hazardVignette,block,oneLine};
  Object.defineProperties(templateEnv,{CH:{get:()=>CH},fmt:{get:()=>fmt},accent:{get:()=>accent},txX:{get:()=>txX},txY:{get:()=>txY},moodImgs:{get:()=>moodImgs},bagImg:{get:()=>bagImg},priceDisplay:{get:priceDisplay},tease:{get:()=>teaseMode}});
  const TEMPLATE_REGISTRY=createTemplateRegistry(templateEnv);

  // ---------- proof strip ----------
  const proof=document.getElementById('proof');
  const thumbs=[];
  TEMPLATES.forEach((name,i)=>{
    const cell=document.createElement('div');
    cell.className='cell'+(i===0?' active':'');
    const cv=document.createElement('canvas');
    cv.width=270;cv.height=338;
    const nm=document.createElement('div');
    nm.className='nm';nm.textContent=name;
    cell.appendChild(cv);cell.appendChild(nm);
    if(TEMPLATE_SUBTITLES[i]){
      const sub=document.createElement('div');
      sub.className='nm-sub';sub.textContent=TEMPLATE_SUBTITLES[i];
      cell.appendChild(sub);
    }
    cell.tabIndex=i===0?0:-1;cell.setAttribute('role','button');cell.setAttribute('aria-label',name+' template');
    cell.onclick=()=>{current=i;document.querySelectorAll('.proof .cell').forEach((x,index)=>{x.classList.toggle('active',index===i);x.tabIndex=index===i?0:-1;});drawMain();options.onCanvasStateChange?.(getState());};
    cell.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key))return;event.preventDefault();if(event.key==='Enter'||event.key===' '){cell.click();return;}let next=i;if(event.key==='ArrowRight')next=(i+1)%TEMPLATES.length;if(event.key==='ArrowLeft')next=(i-1+TEMPLATES.length)%TEMPLATES.length;if(event.key==='Home')next=0;if(event.key==='End')next=TEMPLATES.length-1;document.querySelectorAll('.proof .cell')[next].focus();document.querySelectorAll('.proof .cell')[next].click();});
    proof.appendChild(cell);
    thumbs.push(cv);
  });

  function drawMain(){
    const th=(fmt==='feed')?H:REEL_H;
    if(stage.height!==th)stage.height=th;
    CH=th;
    mctx.clearRect(0,0,W,th);
    const reel=fmt==='reel';
    hitRegions=[];registering=reel;renderTpl=tplId();
    TEMPLATE_REGISTRY[current][fmt](mctx);
    // the lot tag is the most-moved element (it lands on the bag), so it is a
    // block too — the tease act never shows it, name/price/lot stay hidden
    if(!teaseMode){
      if(reel){const cw=W-150;block(mctx,'lot tag',(W-cw)/2,VY(.78)-120,cw,280,()=>gridTag(mctx));}
      else gridTag(mctx);
    }
    registering=false;
    if(!bagImg&&moodImgs.length===0){
      mctx.fillStyle='rgba(38,37,31,.6)';
      mctx.font='500 34px "Hanken Grotesk", sans-serif';
      mctx.textAlign='center';
      mctx.fillText('add images above to begin',W/2,th*0.3);
    }
    drawSnapGuides();
    if(showGuide)drawGuide();
    if(reel&&dragMode==='text'&&!exporting)drawBlockChrome();
  }
  function drawBlockChrome(){
    mctx.save();mctx.textAlign='left';mctx.textBaseline='alphabetic';
    hitRegions.forEach(r=>{
      const on=r.key===activeKey;
      mctx.strokeStyle=on?'rgba(117,95,66,.95)':'rgba(117,95,66,.32)';
      mctx.lineWidth=on?3:1.5;mctx.setLineDash(on?[]:[7,7]);
      mctx.strokeRect(r.x,r.y,r.w,r.h);
      if(on){mctx.setLineDash([]);mctx.fillStyle='rgba(117,95,66,.95)';mctx.font='500 22px "Hanken Grotesk", sans-serif';mctx.fillText(r.key,r.x+6,Math.max(r.y-10,24));}
    });
    mctx.setLineDash([]);mctx.restore();
  }
  function drawGuide(){
    mctx.save();
    mctx.fillStyle='rgba(232,62,140,.22)';
    if(fmt==='feed'){
      mctx.fillRect(0,0,40,H);
      mctx.fillRect(W-40,0,40,H);
      mctx.fillStyle='rgba(232,62,140,.9)';
      mctx.font='600 20px "Hanken Grotesk", sans-serif';
      mctx.save();mctx.translate(22,H/2);mctx.rotate(-Math.PI/2);
      mctx.textAlign='center';mctx.fillText('GRID CROP',0,4);mctx.restore();
    } else {
      // Reels safe reference: avoid top 14%, bottom 15%, sides 6%
      mctx.fillRect(0,0,W,REEL_TOP);
      mctx.fillRect(0,REEL_H-REEL_BOT,W,REEL_BOT);
      mctx.fillRect(0,REEL_TOP,REEL_SIDE,REEL_H-REEL_TOP-REEL_BOT);
      mctx.fillRect(W-REEL_SIDE,REEL_TOP,REEL_SIDE,REEL_H-REEL_TOP-REEL_BOT);
      // safe-zone outline
      mctx.strokeStyle='rgba(46,160,120,.9)';mctx.lineWidth=3;
      mctx.strokeRect(REEL_SIDE,REEL_TOP,W-REEL_SIDE*2,REEL_H-REEL_TOP-REEL_BOT);
      mctx.fillStyle='rgba(232,62,140,.95)';
      mctx.font='600 22px "Hanken Grotesk", sans-serif';mctx.textAlign='center';
      mctx.fillText('AVOID · TOP 14%',W/2,REEL_TOP-24);
      mctx.fillText('AVOID · BOTTOM 15%',W/2,REEL_H-REEL_BOT+40);
      mctx.fillStyle='rgba(46,160,120,.95)';
      mctx.fillText('SAFE ZONE',W/2,REEL_H/2);
    }
    mctx.restore();
  }
  let thumbTimer=null;
  function drawThumbs(){
    const savedCH=CH,savedFmt=fmt,renderFmt=fmt,renderHeight=renderFmt==='feed'?H:REEL_H;
    CH=renderHeight;fmt=renderFmt;proof.dataset.format=renderFmt;
    thumbs.forEach((cv,i)=>{
      cv.width=270;cv.height=renderFmt==='feed'?338:480;
      cv.parentElement.setAttribute('aria-label',TEMPLATES[i]+' template, '+(renderFmt==='feed'?'feed 4:5':'reel story 9:16'));
      const c=cv.getContext('2d');
      c.clearRect(0,0,cv.width,cv.height);
      c.save();c.scale(cv.width/W,cv.height/renderHeight);
      renderTpl=TEMPLATE_META[i].id;
      TEMPLATE_REGISTRY[i][renderFmt](c);
      gridTag(c);
      c.restore();
    });
    renderTpl=null;
    CH=savedCH; fmt=savedFmt;
  }
  function redrawAll(){
    drawMain();
    clearTimeout(thumbTimer);
    thumbTimer=setTimeout(drawThumbs,180);
  }

  // ---- snap-to-grid: the money guide (canvas + safe-band centers) and
  // rule-of-thirds, checked in priority order so only the nearest tier wins
  // when several targets sit within threshold at once ----
  const SNAP_THRESHOLD=14;
  function storedBool(key){try{const v=localStorage.getItem(key);return v===null?null:v==='true';}catch(error){return null;}}
  function saveBool(key,value){try{localStorage.setItem(key,String(value));}catch(error){}}
  let snapEnabled=storedBool('rbc-studio-snap');snapEnabled=snapEnabled===null?true:snapEnabled;
  let activeSnapGuides=[];
  const snapToggle=document.getElementById('snapToggle');
  if(snapToggle){snapToggle.checked=snapEnabled;snapToggle.addEventListener('change',e=>{snapEnabled=e.target.checked;saveBool('rbc-studio-snap',snapEnabled);});}
  function nearestByPriority(value,groups){
    for(const group of groups){
      let best=null;
      for(const candidate of group){const d=Math.abs(value-candidate);if(d<=SNAP_THRESHOLD&&(!best||d<best.d))best={value:candidate,d};}
      if(best)return best;
    }
    return null;
  }
  function snapPoint(point){
    if(!snapEnabled)return {x:point.x,y:point.y,guides:[]};
    const workTop=fmt==='reel'?RT:0,workBottom=fmt==='reel'?RB:CH,workHeight=workBottom-workTop;
    const xGroups=[[W/2],[W/3,W*2/3]];
    const yGroups=fmt==='reel'?[[CH/2,(RT+RB)/2],[workTop+workHeight/3,workTop+workHeight*2/3]]:[[CH/2],[workTop+workHeight/3,workTop+workHeight*2/3]];
    const guides=[];let x=point.x,y=point.y;
    const nx=nearestByPriority(point.x,xGroups);if(nx){x=nx.value;guides.push({axis:'x',value:nx.value});}
    const ny=nearestByPriority(point.y,yGroups);if(ny){y=ny.value;guides.push({axis:'y',value:ny.value});}
    return {x,y,guides};
  }
  // reel side-inset edges, text/block drags only — snaps the rect's nearer
  // edge flush to the safe margin rather than the rect's center
  function snapRectEdges(rect){
    if(!snapEnabled||fmt!=='reel')return {dx:0,guide:null};
    const leftD=Math.abs(rect.x-REEL_SIDE),rightD=Math.abs((rect.x+rect.w)-(W-REEL_SIDE));
    if(leftD<=SNAP_THRESHOLD&&leftD<=rightD)return {dx:REEL_SIDE-rect.x,guide:{axis:'x',value:REEL_SIDE}};
    if(rightD<=SNAP_THRESHOLD)return {dx:(W-REEL_SIDE)-(rect.x+rect.w),guide:{axis:'x',value:W-REEL_SIDE}};
    return {dx:0,guide:null};
  }
  function drawSnapGuides(){
    if(exporting||!activeSnapGuides.length)return;
    mctx.save();mctx.strokeStyle='rgba(117,95,66,.55)';mctx.lineWidth=1;
    for(const guide of activeSnapGuides){
      mctx.beginPath();
      if(guide.axis==='x'){mctx.moveTo(guide.value,0);mctx.lineTo(guide.value,CH);}
      else{mctx.moveTo(0,guide.value);mctx.lineTo(W,guide.value);}
      mctx.stroke();
    }
    mctx.restore();
  }

  // drag
  function pos(e){
    const r=stage.getBoundingClientRect();
    const cx=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
    const cy=(e.touches?e.touches[0].clientY:e.clientY)-r.top;
    let x=cx*(W/r.width), y=cy*(stage.height/r.height);
    return {x,y};
  }
  stage.addEventListener('pointerdown',e=>{
    dragging=true;const p=pos(e);lastP=p;activeSnapGuides=[];
    if(dragMode==='bag'){bagX=p.x;bagY=p.y;}
    else if(fmt==='reel'){activeKey=pickBlock(p);}   // tap to pick a text block, then drag it
    drawMain();
  });
  stage.addEventListener('pointermove',e=>{
    if(!dragging)return;const p=pos(e);
    // Alt/Cmd is the precision bypass — arrow-key nudging never snaps either
    const bypass=e.altKey||e.metaKey;
    activeSnapGuides=[];
    if(dragMode==='bag'){
      let x=p.x,y=p.y;
      if(!bypass){const snapped=snapPoint({x,y});x=snapped.x;y=snapped.y;activeSnapGuides=snapped.guides;}
      bagX=x;bagY=y;
    }
    else if(fmt==='reel'){
      if(activeKey){
        const l=layoutSlot(activeKey);
        let dx=p.x-lastP.x,dy=p.y-lastP.y;
        const region=hitRegions.find(r=>r.key===activeKey);
        if(!bypass&&region){
          const cx=region.x+dx+region.w/2,cy=region.y+dy+region.h/2;
          const centerSnap=snapPoint({x:cx,y:cy});
          let adjX=centerSnap.x-cx,adjY=centerSnap.y-cy;
          const edgeSnap=snapRectEdges({x:region.x+dx+adjX,y:region.y+dy,w:region.w,h:region.h});
          if(edgeSnap.guide){adjX+=edgeSnap.dx;centerSnap.guides.push(edgeSnap.guide);}
          dx+=adjX;dy+=adjY;activeSnapGuides=centerSnap.guides;
        }
        l.dx+=dx;l.dy+=dy;
      }
      lastP=p;
    }
    else {txX+=p.x-lastP.x;txY+=p.y-lastP.y;lastP=p;}
    drawMain();
  });
  window.addEventListener('pointerup',()=>{if(dragging){dragging=false;activeSnapGuides=[];drawMain();drawThumbs();options.onCanvasStateChange?.(getState());}});

  const mb=document.getElementById('modeBag'), mt=document.getElementById('modeText');
  const resetBtn=document.getElementById('resetLayout'), dragHint=document.getElementById('dragHint');
  function refreshDragUI(){
    const showBlockUI=dragMode==='text'&&fmt==='reel';
    if(resetBtn)resetBtn.hidden=!showBlockUI;
    if(dragHint)dragHint.hidden=!showBlockUI;
    if(dragMode!=='text')activeKey=null;
  }
  function setMode(m){
    dragMode=m;
    const on='background:#2B2B2B;color:#F5F1EC;border:none;padding:7px 14px;';
    const off='background:transparent;color:#2B2B2B;border:1px solid #2B2B2B;padding:7px 14px;';
    mb.style.cssText=(m==='bag'?on:off);
    mt.style.cssText=(m==='text'?on:off);
    refreshDragUI();drawMain();
  }
  mb.onclick=()=>setMode('bag');
  mt.onclick=()=>setMode('text');
  if(resetBtn)resetBtn.onclick=()=>resetLayout();

  // constrains the on-screen stage to real phone width so hook legibility and
  // safe-band crowding can be judged at the size a viewer actually sees it.
  // Defaults ON in reel format (the primary deliverable) until the operator
  // makes an explicit per-device choice, which then wins in every format.
  const phoneScaleToggle=document.getElementById('phoneScaleToggle');
  let phoneScalePref=storedBool('rbc-studio-phone-scale');
  function applyPhoneScale(on){
    stage.classList.toggle('phone-scale',on);
    if(phoneScaleToggle)phoneScaleToggle.checked=on;
  }
  function syncPhoneScaleForFormat(){applyPhoneScale(phoneScalePref===null?fmt==='reel':phoneScalePref);}
  phoneScaleToggle?.addEventListener('change',e=>{
    phoneScalePref=e.target.checked;saveBool('rbc-studio-phone-scale',phoneScalePref);
    applyPhoneScale(phoneScalePref);
  });

  const fb=document.getElementById('fmtFeed'), fr=document.getElementById('fmtReel');
  const exportBtn=document.getElementById('exportBtn');
  function setFmt(f){
    fmt=f;
    const on='background:#755f42;color:#F5F1EC;border:none;padding:7px 14px;';
    const off='background:transparent;color:#2B2B2B;border:1px solid #2B2B2B;padding:7px 14px;';
    fb.style.cssText=(f==='feed'?on:off);
    fr.style.cssText=(f==='reel'?on:off);
    if(exportBtn)exportBtn.textContent=f==='reel'?'Export 9:16 visual':'Export 4:5 visual';
    refreshDragUI();
    syncPhoneScaleForFormat();
    drawMain();
    clearTimeout(thumbTimer);thumbTimer=setTimeout(drawThumbs,0);
  }
  fb.onclick=()=>{bagY=(fmt!=='feed')?bagY:H*0.42;setFmt('feed');};
  // hero bag sits a touch below band-center so the masthead/hook fill the top
  // third and the commerce card fills the bottom third — cluster reads centered
  fr.onclick=()=>{setFmt('reel');bagY=VY(0.53);drawMain();};
  // 9:16 is the primary deliverable: it posts as reel/story and the grid takes
  // a clean centre crop, so new campaigns open in reel mode
  setFmt('reel');bagY=VY(0.53);
  document.getElementById('guideToggle').addEventListener('change',e=>{
    showGuide=e.target.checked;drawMain();
  });

  // export
  document.getElementById('exportBtn').addEventListener('click',()=>{
    const g=showGuide;showGuide=false;exporting=true;drawMain();
    const png=stage.toDataURL('image/png');
    document.getElementById('resultImg').src=png;
    const download=document.getElementById('downloadPng');
    const archive=(F('fNo')||'000').trim().replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'000';
    download.href=png;
    download.download='rbc-archive-'+archive+'-'+fmt+'.png';
    showGuide=g;exporting=false;drawMain();
    document.getElementById('result-wrap').style.display='block';
    document.getElementById('result-wrap').scrollIntoView({behavior:'smooth'});
  });

  // caption · opener complements the hook (never repeats it). openers, FOMO
  // closer, disclaimer and tags all come from the shared banks in facts.js so
  // the on-image caption and the five-channel pack speak with one voice.
  let openerIdx=0;
  function captionFacts(){
    return {name:F('fName'),provenance:F('fProv'),price:priceDisplay(),sold:!!document.getElementById('soldToggle')?.checked,tags:true};
  }
  let capLine=null; // set by ⚡ hook; null falls back to opener bank
  function buildCaption(){
    const facts=captionFacts();
    const line=capLine||openerLine(facts,openerIdx);
    const value=lintGenerated(
      line+'\n\nfull details on the image.\n'+fomoCloser(facts,openerIdx)+'\n'+(F('fCta')||'dm to claim').toLowerCase()+' ∽\n\n'+disclaimer()+'\n\n'+discoveryTags(facts));
    document.getElementById('caption').value=value;
    updateCaptionCount();
  }
  function updateCaptionCount(){
    const counter=document.getElementById('captionCount');if(!counter)return;
    const length=graphemeLength(document.getElementById('caption').value);
    counter.textContent=length+'/'+PLATFORM_LIMITS.instagram.limit;
    counter.classList.toggle('counter-warning',length>PLATFORM_LIMITS.instagram.limit);
  }
  document.getElementById('caption').addEventListener('input',updateCaptionCount);
  document.getElementById('newOpener').addEventListener('click',()=>{
    capLine=null;openerIdx++;buildCaption();
  });

  // ===== CAPTION HOOK ENGINE · algo-signal line one =====
  function bagData(){
    const maison=(F('fName').trim().split(/\s+/)[0]||'this').toLowerCase();
    const prov=F('fProv');
    const era=(prov.split('\u00b7')[0]||prov.split('·')[0]||'the era').trim().toLowerCase();
    const yr=(prov.match(/\d{4}/)||[''])[0];
    return {maison,era,yr,price:priceDisplay()};
  }
  let hookIdx=0;
  document.getElementById('genCapHook').addEventListener('click',()=>{
    const strat=document.getElementById('hookStrat').value;
    capLine=signalHook({name:F('fName'),provenance:F('fProv'),price:priceDisplay()},strat,hookIdx);
    hookIdx++;
    buildCaption();
  });
  document.getElementById('hookStrat').addEventListener('change',()=>{hookIdx=0;});
  // a quieter register than the signal-weighted bank above \u2014 same lead-story
  // angle, restrained luxury tone, for operators who want the calmer read
  document.getElementById('genRestrainedHook')?.addEventListener('click',()=>{
    capLine=restrainedLine({angle:document.getElementById('storyAngle')?.value});
    buildCaption();
  });

  // ===== TITLE ENGINE · short epithets for the on-image headline =====
  const TITLE_BANK=(d)=>[
    'the loud one','the quiet one','the rare one','the classic one',
    'the collector\u2019s one','the forever one','the grail','the it bag',
    'the '+(d.era.split(/\s+/)[0]||'archive')+' one','the sleeper hit',
    'the conversation piece','the quiet flex'
  ];
  let titleIdx=0;
  document.getElementById('genTitle').addEventListener('click',()=>{
    const list=TITLE_BANK(bagData());
    document.getElementById('fHook').value=list[titleIdx%list.length];
    titleIdx++;
    redrawAll();
  });
  document.getElementById('copyBtn').addEventListener('click',async()=>{
    const button=document.getElementById('copyBtn');const value=document.getElementById('caption').value;
    try{await navigator.clipboard.writeText(value);}catch(error){const helper=document.createElement('textarea');helper.value=value;helper.style.position='fixed';helper.style.opacity='0';document.body.appendChild(helper);helper.select();helper.setSelectionRange(0,value.length);document.execCommand('copy');helper.remove();}
    button.textContent='Copied ✓';setTimeout(()=>button.textContent='Copy caption',1600);
  });

  function getState(){
    return {current,accent,fmt,showGuide,bagX,bagY,txX,txY,dragMode,layout:JSON.parse(JSON.stringify(layout)),bagSize:Number(document.getElementById('bagSize').value)};
  }
  function setState(saved={}){
    if(Number.isInteger(saved.current)) current=Math.max(0,Math.min(TEMPLATES.length-1,saved.current));
    if(saved.accent) accent=saved.accent;
    if(Number.isFinite(saved.bagX)) bagX=saved.bagX;
    if(Number.isFinite(saved.bagY)) bagY=saved.bagY;
    if(Number.isFinite(saved.txX)) txX=saved.txX;
    if(Number.isFinite(saved.txY)) txY=saved.txY;
    if(saved.layout&&typeof saved.layout==='object') layout=saved.layout;
    if(saved.dragMode) setMode(saved.dragMode);
    if(saved.bagSize) document.getElementById('bagSize').value=saved.bagSize;
    document.querySelectorAll('.proof .cell').forEach((cell,i)=>cell.classList.toggle('active',i===current));
    document.querySelectorAll('.sw').forEach(sw=>sw.classList.toggle('active',sw.style.backgroundColor===accent));
    setFmt(saved.fmt==='feed'?'feed':'reel');
    if(!Number.isFinite(saved.bagY)) bagY=fmt==='reel'?VY(0.53):H*0.42;
    showGuide=!!saved.showGuide;
    document.getElementById('guideToggle').checked=showGuide;
    redrawAll();
  }
  function getImageBlobs(){return {mood:[...moodBlobs],bag:bagBlob};}
  async function restoreImages(blobs={}){
    moodBlobs=(blobs.mood||[]).filter(Boolean);
    bagBlob=blobs.bag||null;
    moodImgs=[];
    for(const blob of moodBlobs) moodImgs.push(await loadFile(blob));
    bagImg=bagBlob?await loadFile(bagBlob):null;
    document.getElementById('moodCount').textContent=moodImgs.length;
    document.getElementById('bagCount').textContent=bagImg?'✓':'None';
    redrawAll();
  }
  async function replaceBagBlob(blob){
    if(!(blob instanceof Blob))throw new Error('A product image blob is required.');
    bagBlob=blob;bagImg=await loadFile(blob);
    document.getElementById('bagCount').textContent='âœ“';
    redrawAll();options.onImagesChanged?.(getImageBlobs());
    return blob;
  }
  async function renderBlob(targetFmt=fmt,options={}){
    const saved={fmt,showGuide};
    showGuide=false;exporting=true;
    fmt=targetFmt==='feed'?'feed':'reel';
    drawMain();
    if(options.coverText&&fmt==='reel'){
      mctx.save();
      mctx.fillStyle='rgba(245,241,236,.94)';mctx.fillRect(64,REEL_H-REEL_BOT-190,W-128,120);
      mctx.fillStyle='#2B2B2B';mctx.font='600 34px "Hanken Grotesk", sans-serif';mctx.textAlign='center';mctx.textBaseline='middle';
      mctx.fillText(String(options.coverText).slice(0,48),W/2,REEL_H-REEL_BOT-130,W-184);
      mctx.restore();
    }
    const blob=await new Promise(resolve=>stage.toBlob(resolve,'image/png'));
    fmt=saved.fmt;showGuide=saved.showGuide;exporting=false;drawMain();
    return blob;
  }
  async function renderVariantBlob(templateIndex,targetFmt='feed'){
    const savedCurrent=current;
    current=Math.max(0,Math.min(TEMPLATES.length-1,Number(templateIndex)||0));
    document.querySelectorAll('.proof .cell').forEach((cell,i)=>cell.classList.toggle('active',i===current));
    try{return await renderBlob(targetFmt);}
    finally{
      current=savedCurrent;
      document.querySelectorAll('.proof .cell').forEach((cell,i)=>cell.classList.toggle('active',i===current));
      drawMain();
    }
  }
  // the tease act: same template, zoomed detail crop, name/price/lot tag/SOLD
  // all suppressed via teaseMode — a real visual, not a placeholder
  async function renderTeaseBlob(targetFmt='reel'){
    const saved={fmt,showGuide,teaseMode};
    showGuide=false;exporting=true;teaseMode=true;
    fmt=targetFmt==='feed'?'feed':'reel';
    drawMain();
    const blob=await new Promise(resolve=>stage.toBlob(resolve,'image/png'));
    fmt=saved.fmt;showGuide=saved.showGuide;teaseMode=saved.teaseMode;exporting=false;drawMain();
    return blob;
  }
  // the reel bundle: hook (the current template's own reel), record (provenance
  // and authentication) and CTA (price + acquisition) as three ordered frames —
  // a real hook → proof → CTA sequence instead of one static reel image
  async function renderSequenceBlobs(){
    const saved={fmt,showGuide};
    showGuide=false;exporting=true;fmt='reel';
    drawMain();
    const hook=await new Promise(resolve=>stage.toBlob(resolve,'image/png'));
    mctx.clearRect(0,0,W,CH);
    primitives.recordFrame(templateEnv,mctx);
    const record=await new Promise(resolve=>stage.toBlob(resolve,'image/png'));
    mctx.clearRect(0,0,W,CH);
    primitives.ctaFrame(templateEnv,mctx);
    const cta=await new Promise(resolve=>stage.toBlob(resolve,'image/png'));
    fmt=saved.fmt;showGuide=saved.showGuide;drawMain();exporting=false;
    return {hook,record,cta};
  }
  // in-browser video assembly of the same hook → record → CTA sequence: capture
  // the live stage as a stream and hold each beat for its span, so the operator
  // gets an actual moving reel, not just a storyboard. Dependency-free (WebM via
  // the platform's own MediaRecorder). Returns null where the browser lacks the
  // API, so callers can fall back to the PNG frames in the ZIP.
  function sequenceVideoSupported(){
    return typeof stage.captureStream==='function'&&typeof MediaRecorder!=='undefined';
  }
  async function renderSequenceVideo(opts={}){
    if(!sequenceVideoSupported())return null;
    const beats=opts.beats||[{name:'hook',ms:2000},{name:'record',ms:3000},{name:'cta',ms:3000}];
    const onBeat=typeof opts.onBeat==='function'?opts.onBeat:()=>{};
    const saved={fmt,showGuide};
    showGuide=false;exporting=true;fmt='reel';
    const drawBeat=name=>{
      if(name==='hook'){drawMain();return;}
      mctx.clearRect(0,0,W,CH);
      if(name==='record')primitives.recordFrame(templateEnv,mctx);
      else primitives.ctaFrame(templateEnv,mctx);
    };
    // size and paint the first frame before opening the stream so capture never
    // starts on a blank or mis-sized surface
    drawBeat(beats[0].name);
    const candidates=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];
    const mimeType=(typeof MediaRecorder.isTypeSupported==='function'?candidates.find(t=>MediaRecorder.isTypeSupported(t)):'')||'';
    let stream=null,recorder=null;
    try{
      stream=stage.captureStream(30);
      recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
    }catch(err){
      if(stream)stream.getTracks().forEach(track=>track.stop());
      fmt=saved.fmt;showGuide=saved.showGuide;exporting=false;drawMain();
      return null;
    }
    const chunks=[];
    recorder.ondataavailable=event=>{if(event.data&&event.data.size)chunks.push(event.data);};
    const stopped=new Promise(resolve=>{recorder.onstop=resolve;});
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    try{
      recorder.start();
      for(let index=0;index<beats.length;index++){
        if(index>0)drawBeat(beats[index].name);
        onBeat(index,beats[index].name);
        await sleep(beats[index].ms);
      }
      if(recorder.state!=='inactive')recorder.stop();
      await stopped;
    }catch(err){
      try{if(recorder.state!=='inactive')recorder.stop();}catch(stopError){}
    }finally{
      stream.getTracks().forEach(track=>track.stop());
      fmt=saved.fmt;showGuide=saved.showGuide;exporting=false;drawMain();
    }
    if(!chunks.length)return null;
    const type=recorder.mimeType||mimeType||'video/webm';
    return new Blob(chunks,{type});
  }
  function nudge(dx,dy){
    if(dragMode==='bag'){bagX+=dx*W;bagY+=dy*stage.height;}
    else if(fmt==='reel'&&activeKey){const l=layoutSlot(activeKey);l.dx+=dx*W;l.dy+=dy*stage.height;}
    else{txX+=dx*W;txY+=dy*stage.height;}
    redrawAll();options.onCanvasStateChange?.(getState());
  }
  function resetLayout(){delete layout[tplId()];activeKey=null;redrawAll();options.onCanvasStateChange?.(getState());}
  function getTemplate(){return {...TEMPLATE_REGISTRY[current],index:current};}
  document.fonts.ready.then(()=>{redrawAll();if(!document.getElementById('caption').value.trim())buildCaption();});
  return {stage,redrawAll,getState,setState,getImageBlobs,restoreImages,replaceBagBlob,renderBlob,renderVariantBlob,renderTeaseBlob,renderSequenceBlobs,renderSequenceVideo,sequenceVideoSupported,nudge,getTemplate,setMode,setFmt,resetLayout};
}
