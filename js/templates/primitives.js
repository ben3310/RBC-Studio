import {archiveState} from '../facts.js';

let blurCanvas;

export function cover(ctx,image,x,y,width,height){
  const imageRatio=image.width/image.height;const ratio=width/height;let sw,sh,sx,sy;
  if(imageRatio>ratio){sh=image.height;sw=sh*ratio;sx=(image.width-sw)/2;sy=0;}else{sw=image.width;sh=sw/ratio;sx=0;sy=(image.height-sh)/2;}
  ctx.drawImage(image,sx,sy,sw,sh,x,y,width,height);
}

export function blurCover(ctx,image,x,y,width,height,strength=18){
  blurCanvas=blurCanvas||document.createElement('canvas');blurCanvas.width=Math.max(2,Math.round(width/strength));blurCanvas.height=Math.max(2,Math.round(height/strength));
  const off=blurCanvas.getContext('2d');off.clearRect(0,0,blurCanvas.width,blurCanvas.height);
  const imageRatio=image.width/image.height,ratio=blurCanvas.width/blurCanvas.height;let sw,sh,sx,sy;
  if(imageRatio>ratio){sh=image.height;sw=sh*ratio;sx=(image.width-sw)/2;sy=0;}else{sw=image.width;sh=sw/ratio;sx=0;sy=(image.height-sh)/2;}
  off.drawImage(image,sx,sy,sw,sh,0,0,blurCanvas.width,blurCanvas.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(blurCanvas,x,y,width,height);
}

// wraps to maxWidth, but honors a manual '|' break first so users control line splits
export function wrapLines(ctx,text,maxWidth){
  const out=[];
  for(const seg of String(text).split('|')){
    const words=seg.split(/\s+/).filter(Boolean);
    let line='';
    for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){out.push(line);line=word;}else line=test;}
    if(line)out.push(line);
  }
  return out;
}

// collapse manual '|' breaks to spaces for single-line fields
export function oneLine(text){return String(text).replace(/\s*\|\s*/g,' ');}

export function banner(env,ctx,text,cy,size,options={}){
  if(!String(text).trim())return;const {W}=env;
  ctx.font=(options.roman?'500 ':'italic ')+size+'px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const display=options.upper?text.toUpperCase():text;const padX=options.padX||44,padY=options.padY||24;const measurement=ctx.measureText(display);const width=Math.min(measurement.width+padX*2,W-64),height=size+padY*2;
  ctx.fillStyle=options.bg||env.accent;ctx.globalAlpha=options.alpha??.92;ctx.fillRect((W-width)/2,cy-height/2,width,height);ctx.globalAlpha=1;ctx.fillStyle=options.fg||'#F7F2E8';ctx.fillText(display,W/2,cy+2,width-padX);
}

export function mark(env,ctx,dark){
  ctx.font='italic 26px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=dark?'rgba(43,43,43,.85)':'rgba(255,255,255,.95)';
  if(!dark){ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=8;}ctx.fillText('RBC \u223D rarebagclub',34,env.H-34);ctx.shadowBlur=0;
}

export function lotNo(env,ctx,color){if(env.tease)return;ctx.font='500 26px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.fillText('NO. '+env.F('fNo'),env.W-34,58);}

export function sold(env,ctx){
  if(env.tease)return; // the tease act never reveals a sold outcome
  if(!document.getElementById('soldToggle').checked)return;const {W,H}=env;const cy=env.fmt==='reel'?env.VY(.4):H*.42;ctx.save();ctx.translate(W/2,cy);ctx.rotate(-.18);ctx.font='500 150px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const measurement=ctx.measureText('SOLD'),width=measurement.width+120,height=210;ctx.fillStyle='rgba(43,43,43,.82)';ctx.fillRect(-width/2,-height/2,width,height);ctx.strokeStyle='#F5F1EC';ctx.lineWidth=4;ctx.strokeRect(-width/2+14,-height/2+14,width-28,height-28);ctx.fillStyle='#F5F1EC';ctx.fillText('SOLD',0,6);
  // a sold post is proof, not a dead end — carry the demand instead of losing it
  ctx.font='500 26px "Hanken Grotesk", sans-serif';ctx.letterSpacing='3px';ctx.fillText('JOIN THE ACQUISITION LIST',0,height/2+40,width+80);ctx.letterSpacing='0px';
  ctx.restore();
}

export function gridTag(env,ctx){
  const toggle=document.getElementById('tagToggle');if(!toggle?.checked)return;const {W}=env;const name=env.F('fName').trim(),price=env.priceDisplay;if(!name&&!price)return;
  const isReel=env.fmt==='reel';const cy=(isReel?env.VY(.78):env.CH*.68)+env.txY;const nameSize=isReel?34:38,priceSize=isReel?52:60;ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='italic '+nameSize+'px "Cormorant Garamond", serif';const nameWidth=ctx.measureText(name).width;ctx.font='500 '+priceSize+'px "Cormorant Garamond", serif';const priceWidth=ctx.measureText(price).width;const width=Math.min(Math.max(nameWidth,priceWidth,isReel?410:0)+(isReel?96:110),W-(isReel?150:110)),height=isReel?148:170;
  ctx.shadowColor='rgba(0,0,0,.18)';ctx.shadowBlur=24;ctx.shadowOffsetY=8;ctx.fillStyle='rgba(247,242,232,.96)';ctx.fillRect((W-width)/2,cy-height/2,width,height);ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#755f42';ctx.lineWidth=1.5;ctx.strokeRect((W-width)/2+9,cy-height/2+9,width-18,height-18);
  ctx.fillStyle='#2B2B2B';ctx.font='italic '+nameSize+'px "Cormorant Garamond", serif';ctx.fillText(name,W/2,cy-(isReel?12:16),width-70);ctx.fillStyle='#755f42';ctx.font='500 '+priceSize+'px "Cormorant Garamond", serif';ctx.fillText(price,W/2,cy+(isReel?44:52),width-70);
  const isSold=!!document.getElementById('soldToggle')?.checked;
  const cta=(isSold?'join the acquisition list':(env.F('fCta')||'DM to claim')).toUpperCase();ctx.font='500 '+(isReel?22:24)+'px "Hanken Grotesk", sans-serif';ctx.letterSpacing='3px';const ctaWidth=ctx.measureText(cta).width,chipWidth=Math.min(ctaWidth+(isReel?80:88),W-160),chipY=cy+height/2+(isReel?36:42),chipH=isReel?50:54;ctx.fillStyle='rgba(43,43,43,.92)';ctx.fillRect((W-chipWidth)/2,chipY-chipH/2,chipWidth,chipH);ctx.fillStyle='#F5F1EC';ctx.fillText(cta,W/2,chipY+(isReel?7:8),chipWidth-40);ctx.letterSpacing='0px';ctx.restore();
}

export function polaroidFrame(env,ctx,x,y,width,height,rotation,image){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=26;ctx.shadowOffsetY=10;ctx.fillStyle='#FDFCF8';ctx.fillRect(-width/2,-height/2,width,height);ctx.shadowBlur=0;
  if(image)env.cover(ctx,image,-width/2+18,-height/2+18,width-36,height-96);else{ctx.fillStyle='#E8E1D3';ctx.fillRect(-width/2+18,-height/2+18,width-36,height-96);}ctx.restore();
}

export function tape(env,ctx,x,y,rotation){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle='rgba(222,213,195,.75)';ctx.fillRect(-70,-22,140,44);ctx.restore();}

export function reelMast(env,ctx,color){ctx.font='italic 28px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.fillText('RBC \u223D rarebagclub',env.W/2,env.RT+46);}

// darkens the top/bottom chrome hazard zones (the safe band tapers to fully
// clear) so a reel's dead-air zones read as designed depth, never flat void
export function hazardVignette(env,ctx){
  const {W,CH,RT,RB}=env;
  if(!RT||!RB)return;
  const gradient=ctx.createLinearGradient(0,0,0,CH);
  gradient.addColorStop(0,'rgba(28,25,20,.2)');
  gradient.addColorStop(Math.min(.999,RT/CH),'rgba(28,25,20,0)');
  gradient.addColorStop(Math.max(.001,RB/CH),'rgba(28,25,20,0)');
  gradient.addColorStop(1,'rgba(28,25,20,.28)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,W,CH);
}

export function vignette(env,ctx){
  const gradient=ctx.createLinearGradient(0,0,0,env.CH);gradient.addColorStop(0,'rgba(43,43,43,.07)');gradient.addColorStop(.5,'rgba(43,43,43,0)');gradient.addColorStop(1,'rgba(43,43,43,.1)');ctx.fillStyle=gradient;ctx.fillRect(0,0,env.W,env.CH);
  hazardVignette(env,ctx);
}

export function atmosphere(env,ctx,tone){
  if(env.moodImgs[0]){ctx.globalAlpha=.35;env.blurCover(ctx,env.moodImgs[0],0,0,env.W,env.CH,26);ctx.globalAlpha=1;ctx.fillStyle=tone;ctx.fillRect(0,0,env.W,env.CH);hazardVignette(env,ctx);return;}
  const gradient=ctx.createLinearGradient(0,0,0,env.CH);gradient.addColorStop(0,'rgba(43,43,43,.06)');gradient.addColorStop(.5,'rgba(43,43,43,0)');gradient.addColorStop(1,'rgba(43,43,43,.08)');ctx.fillStyle=gradient;ctx.fillRect(0,0,env.W,env.CH);ctx.font='italic 210px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle='rgba(117,95,66,.08)';ctx.fillText('RBC',env.W/2,190);ctx.font='italic 130px "Cormorant Garamond", serif';ctx.fillText('\u223D',env.W/2,env.CH-70);hazardVignette(env,ctx);
}

// ===== reel sequence beats \u00B7 template-agnostic so every treatment gets a
// real hook \u2192 proof \u2192 CTA sequence, not just a single static frame =====

// beat 2 \u00B7 the record: provenance, material, condition and authentication,
// read as filed fact rather than sales copy
export function recordFrame(env,ctx){
  const {W,CH,RT,RB,F}=env;
  ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
  if(env.moodImgs[0]){ctx.globalAlpha=.14;env.blurCover(ctx,env.moodImgs[0],0,0,W,CH,26);ctx.globalAlpha=1;ctx.fillStyle='rgba(245,241,236,.88)';ctx.fillRect(0,0,W,CH);}
  hazardVignette(env,ctx);
  const bx=70,by=RT,bw=W-140,bh=RB-RT;
  ctx.strokeStyle='#755f42';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,bw,bh);
  ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.letterSpacing='6px';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle='#755f42';
  ctx.fillText('THE RECORD \u00B7 NO. '+F('fNo'),W/2,by+64);
  ctx.letterSpacing='0px';
  const rows=[['PROVENANCE',F('fProv')],['MATERIAL',F('fMaterial')],['CONDITION',F('fCondition')],['AUTHENTICATION',F('fAuth')],['DETAIL',F('fDetail')]].filter(([,v])=>String(v||'').trim());
  const rx=bx+50,rr=bx+bw-50;
  let ry=by+150;
  ctx.textAlign='left';
  for(const [label,value] of rows){
    ctx.font='500 16px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText(label,rx,ry);ctx.letterSpacing='0px';
    ctx.font='500 32px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
    const lines=wrapLines(ctx,value,rr-rx).slice(0,2);
    lines.forEach((line,index)=>ctx.fillText(line,rx,ry+40+index*40));
    ry+=40+lines.length*40+30;
    if(ry>by+bh-90)break;
  }
  ctx.font='italic 25px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';ctx.textAlign='center';
  ctx.fillText('two-stage authenticated before it enters the archive.',W/2,by+bh-44,bw-100);
}

// beat 3 \u00B7 the CTA: price, name and the action \u2014 acquisition-list line
// automatically replaces the CTA once the piece is marked sold, so a closed
// drop still captures demand instead of ending the sequence on a dead frame
export function ctaFrame(env,ctx){
  const {W,CH,RT,RB,F}=env;
  ctx.fillStyle='#EBE7E1';ctx.fillRect(0,0,W,CH);
  if(env.moodImgs[0]){ctx.globalAlpha=.16;env.blurCover(ctx,env.moodImgs[0],0,0,W,CH,26);ctx.globalAlpha=1;ctx.fillStyle='rgba(235,231,225,.86)';ctx.fillRect(0,0,W,CH);}
  hazardVignette(env,ctx);
  const bx=70,by=RT,bw=W-140,bh=RB-RT,cy=by+bh/2;
  ctx.strokeStyle='#755f42';ctx.lineWidth=1.5;ctx.strokeRect(bx,by,bw,bh);
  const isSold=!!document.getElementById('soldToggle')?.checked;
  ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.letterSpacing='6px';ctx.fillStyle='#755f42';
  ctx.fillText('THE ARCHIVE',W/2,by+80);ctx.letterSpacing='0px';
  ctx.font='500 60px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
  ctx.fillText(oneLine(F('fName')),W/2,cy-40,bw-100);
  ctx.font='500 50px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';
  ctx.fillText(env.priceDisplay,W/2,cy+40);
  ctx.font='500 22px "Hanken Grotesk", sans-serif';ctx.letterSpacing='2px';ctx.fillStyle='#444748';
  ctx.fillText(archiveState({sold:isSold}).toUpperCase(),W/2,cy+94,bw-140);
  ctx.letterSpacing='0px';
  const ctaText=(isSold?'join the acquisition list':(F('fCta')||'DM to claim')).toUpperCase();
  ctx.font='600 28px "Hanken Grotesk", sans-serif';ctx.letterSpacing='4px';
  const chipW=Math.min(ctx.measureText(ctaText).width+100,bw-60);
  ctx.fillStyle='#2B2B2B';ctx.fillRect((W-chipW)/2,by+bh-134,chipW,62);
  ctx.fillStyle='#F5F1EC';ctx.fillText(ctaText,W/2,by+bh-93,chipW-40);
  ctx.letterSpacing='0px';
}
