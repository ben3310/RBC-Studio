export function feed(ctx,env){
  const {W,CH,VY,F,priceDisplay,tagOn,drawBag,sold,moodImgs,moodAt,polaroidFrame,tape}=env;
  ctx.fillStyle='#EDE7DA';ctx.fillRect(0,0,W,CH);
  if(moodImgs.length){polaroidFrame(ctx,W*.16,VY(.16),330,400,-.1,moodAt(1));polaroidFrame(ctx,W*.86,VY(.22),330,400,.08,moodAt(2));polaroidFrame(ctx,W*.82,VY(.86),330,400,-.06,moodAt(3));}
  polaroidFrame(ctx,W/2,VY(.5),640,780,.02,moodAt(0));tape(ctx,W/2-260,VY(.5)-380,-.35);tape(ctx,W/2+260,VY(.5)-380,.3);drawBag(ctx);
  if(!tagOn()){ctx.save();ctx.translate(W/2,VY(.5));ctx.rotate(.02);ctx.font='italic 40px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#2B2B2B';ctx.fillText(F('fName')+' · '+priceDisplay,0,352,600);ctx.restore();}
  ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.letterSpacing='3px';ctx.textAlign='center';ctx.fillStyle='#444748';ctx.fillText((tagOn()?F('fProv'):F('fProv')+' · '+F('fCta')).toUpperCase(),W/2,VY(.97),W-160);ctx.letterSpacing='0px';sold(ctx);
}

export function reel(ctx,env){
  const {W,CH,RT,RB,moodImgs,F,priceDisplay,tagOn,drawBag,sold,moodAt,polaroidFrame,tape,atmosphere,block,oneLine}=env;
  ctx.fillStyle='#EDE7DA';ctx.fillRect(0,0,W,CH);
  atmosphere(ctx,'rgba(237,231,218,.82)');
  if(moodImgs[1])polaroidFrame(ctx,168,RT+96,300,350,-.1,moodAt(1));
  if(moodImgs[2])polaroidFrame(ctx,W-128,RB-104,300,350,.08,moodAt(2));
  // the hero polaroid is centered within the safe band so its whole frame + tape
  // read on-device; the hazard zones keep only the background wash
  const cx=W/2,cy=(RT+RB)/2,w=900,h=RB-RT-24;
  polaroidFrame(ctx,cx,cy,w,h,.018,moodAt(0));tape(ctx,cx-270,cy-h/2+16,-.28);tape(ctx,cx+270,cy-h/2+16,.26);
  env.hazardVignette(ctx);
  block(ctx,'hook',cx-w/2+30,cy-h/2+24,w-60,116,()=>{ctx.save();ctx.translate(cx,cy);ctx.rotate(.018);ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(-w/2+30,-h/2+24,w-60,116);ctx.font='italic 58px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fHook')),0,-h/2+96,w-100);ctx.restore();});
  block(ctx,'header',W/2-220,RT+2,440,50,()=>{ctx.fillStyle='rgba(245,241,236,.9)';ctx.fillRect(W/2-220,RT+2,440,50);ctx.font='500 17px "Hanken Grotesk", sans-serif';ctx.textAlign='center';ctx.fillStyle='#444748';ctx.letterSpacing='4px';ctx.fillText(('SNAPSHOT / NO. '+F('fNo')).toUpperCase(),W/2,RT+32);ctx.letterSpacing='0px';});
  drawBag(ctx);
  if(!tagOn())block(ctx,'name & price',W/2-340,RB-160,680,140,()=>{
    ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(W/2-340,RB-160,680,140);
    ctx.font='italic 46px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fName'))+' · '+priceDisplay,W/2,RB-108,W-180);
    ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText((oneLine(F('fProv'))+' · '+F('fCta')).toUpperCase(),W/2,RB-56,W-180);ctx.letterSpacing='0px';
  });
  sold(ctx);
}
