export function feed(ctx,env){
  const {W,CH,VY,F,priceDisplay,tagOn,moodImgs,cover,drawBag,sold}=env;
  ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);const top=VY(.04),bottom=VY(.88);
  ctx.fillStyle='#2B2B2B';ctx.fillRect(56,top,W-112,2);ctx.fillRect(56,bottom,W-112,2);
  ctx.font='500 22px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText(('LOT '+F('fNo')+' · THE ARCHIVE').toUpperCase(),56,top+44);ctx.textAlign='right';ctx.fillText('ENQUIRE · DM',W-56,top+44);ctx.letterSpacing='0px';
  const x=56,y=top+76,w=W-112,h=bottom-40-y;if(moodImgs[0]){cover(ctx,moodImgs[0],x,y,w,h);ctx.fillStyle='rgba(241,236,226,.6)';ctx.fillRect(x,y,w,h);}else{ctx.fillStyle='#E8E1D3';ctx.fillRect(x,y,w,h);}ctx.strokeStyle='#DED5C3';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);drawBag(ctx);
  if(!tagOn()){
    ctx.font='500 46px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';ctx.fillText(F('fName'),56,bottom+52,W-300);ctx.font='500 40px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.fillText(priceDisplay,W-56,bottom+52);
    ctx.font='400 23px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.fillText(F('fProv')+' · Excellent vintage condition',56,bottom+98,W-112);ctx.font='italic 34px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';ctx.fillText(F('fCta').toLowerCase(),56,bottom+182);ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.textAlign='right';ctx.fillStyle='#444748';ctx.letterSpacing='2px';ctx.fillText('@RAREBAGCLUB',W-56,bottom+182);ctx.letterSpacing='0px';
  }else{ctx.font='400 23px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.fillText(F('fProv')+' · Excellent vintage condition',56,bottom+52,W-112);}
  sold(ctx);
}

export function reel(ctx,env){
  const {W,CH,RT,RB,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,atmosphere,block,oneLine}=env;
  ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);if(moodImgs[0]){cover(ctx,moodImgs[0],0,0,W,CH);ctx.fillStyle='rgba(241,236,226,.82)';ctx.fillRect(0,0,W,CH);env.hazardVignette(ctx);}else atmosphere(ctx,'rgba(245,241,236,.85)');
  // the display case is contained within the safe band so its whole frame reads
  // on-device; the hazard zones keep only the background wash
  const x=70,right=W-70,imageY=RT,imageH=RB-RT;
  if(moodImgs[0]){cover(ctx,moodImgs[0],x,imageY,right-x,imageH);ctx.fillStyle='rgba(241,236,226,.4)';ctx.fillRect(x,imageY,right-x,imageH);}else{ctx.fillStyle='#E8E1D3';ctx.fillRect(x,imageY,right-x,imageH);}ctx.strokeStyle='rgba(38,37,31,.35)';ctx.lineWidth=2;ctx.strokeRect(x,imageY,right-x,imageH);
  env.hazardVignette(ctx);
  block(ctx,'header',x,RT+6,right-x,44,()=>{ctx.fillStyle='rgba(245,241,236,.92)';ctx.fillRect(x,RT+6,right-x,44);ctx.fillStyle='#2B2B2B';ctx.fillRect(x,RT+6,right-x,2);ctx.font='500 19px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText(('LOT '+F('fNo')+' · THE ARCHIVE').toUpperCase(),x+24,RT+50);ctx.textAlign='right';ctx.fillText('ENQUIRE · DM',right-24,RT+50);ctx.letterSpacing='0px';});
  drawBag(ctx);
  if(tagOn()){
    block(ctx,'hook',x+24,RT+94,right-x-48,96,()=>{const hookY=RT+152;ctx.fillStyle='rgba(245,241,236,.92)';ctx.fillRect(x+24,hookY-58,right-x-48,96);ctx.font='italic 58px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#755f42';ctx.fillText(oneLine(F('fHook')),W/2,hookY,right-x-100);});
  }else{
    block(ctx,'name & price',x,RB-286,right-x,224,()=>{
      ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(x,RB-286,right-x,224);
      ctx.font='500 64px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fName')),x+24,RB-244,W-444);ctx.font='500 56px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.fillText(priceDisplay,right-24,RB-244);ctx.font='400 24px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.fillText(oneLine(F('fProv'))+' · Excellent vintage condition',x+24,RB-192,W-248);ctx.fillStyle='#2B2B2B';ctx.fillRect(x+24,RB-146,right-x-48,1);ctx.font='italic 38px "Cormorant Garamond", serif';ctx.fillText(F('fCta').toLowerCase(),x+24,RB-78);ctx.font='500 19px "Hanken Grotesk", sans-serif';ctx.textAlign='right';ctx.fillStyle='#444748';ctx.letterSpacing='2px';ctx.fillText('@RAREBAGCLUB',right-24,RB-78);ctx.letterSpacing='0px';
    });
  }
  sold(ctx);
}
