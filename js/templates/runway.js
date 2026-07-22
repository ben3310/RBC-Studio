export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
    ctx.font='500 19px "Hanken Grotesk", sans-serif';
    ctx.letterSpacing='6px';ctx.textAlign='center';ctx.fillStyle='#444748';
    ctx.fillText('THE ARCHIVE · NO. '+F('fNo'),W/2,VY(.05));
    ctx.letterSpacing='0px';
    const words=F('fName').toUpperCase().split(/\s+/);
    const wy0=VY(.14), lh=Math.min(150,(VY(.8)-wy0)/Math.max(words.length,1));
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    words.forEach((wd,i)=>{
      const fs=Math.min(150,(W-120)/(wd.length*.62));
      ctx.font='600 '+fs+'px "Cormorant Garamond", serif';
      const yy=wy0+lh*(i+0.8)+txY;
      if(i%2===0){ctx.fillStyle='#2B2B2B';ctx.fillText(wd,W/2,yy,W-100);}
      else{ctx.strokeStyle='#755f42';ctx.lineWidth=2.5;ctx.strokeText(wd,W/2,yy,W-100);}
    });
    drawBag(ctx);
    if(!tagOn()){
      ctx.font='500 22px "Hanken Grotesk", sans-serif';
      ctx.letterSpacing='4px';ctx.fillStyle='#2B2B2B';
      ctx.fillText((priceDisplay+' · '+F('fCta')).toUpperCase(),W/2,VY(.9));
    }
    ctx.font='500 19px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';
    ctx.fillText(F('fProv').toUpperCase(),W/2,VY(.95),W-140);
    ctx.letterSpacing='0px';sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,atmosphere,block,oneLine}=env;
  ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
  if(moodImgs[0]){ctx.globalAlpha=.32;cover(ctx,moodImgs[0],0,0,W,CH);ctx.globalAlpha=1;ctx.fillStyle='rgba(245,241,236,.55)';ctx.fillRect(0,0,W,CH);env.hazardVignette(ctx);}else atmosphere(ctx,'rgba(245,241,236,.82)');
  block(ctx,'header',W/2-260,RT+22,520,40,()=>{ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.letterSpacing='6px';ctx.textAlign='center';ctx.fillStyle='#444748';ctx.fillText('THE ARCHIVE · NO. '+F('fNo'),W/2,RT+46);ctx.letterSpacing='0px';});
  // the word stack is compressed into the upper band so the bag (user-positioned,
  // usually mid-canvas) never sits across a headline word; hook + commerce live
  // in the lower band, clear of the bag's typical footprint
  block(ctx,'name',60,RT+72,W-120,320,()=>{
    const words=oneLine(F('fName')).toUpperCase().split(/\s+/).filter(Boolean),top=RT+92,bottom=RT+368,step=(bottom-top)/Math.max(words.length,1);
    ctx.textAlign='center';ctx.textBaseline='alphabetic';words.forEach((word,index)=>{const size=Math.min(120,(W-120)/(word.length*.62));ctx.font='600 '+size+'px "Cormorant Garamond", serif';const y=top+step*(index+.8);if(index%2===0){ctx.fillStyle='rgba(43,43,43,.9)';ctx.fillText(word,W/2,y,W-110);}else{ctx.strokeStyle='#755f42';ctx.lineWidth=2.5;ctx.strokeText(word,W/2,y,W-110);}});
  });
  // hook epithet rides just under the name stack (upper band) so the lower band
  // stays clear for the shared lot tag / commerce line — no bottom collision
  block(ctx,'hook',W/2-280,RT+372,560,64,()=>{ctx.fillStyle='rgba(245,241,236,.88)';ctx.fillRect(W/2-280,RT+372,560,64);ctx.font='italic 44px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';ctx.textAlign='center';ctx.fillText(oneLine(F('fHook')),W/2,RT+415,W-200);});
  drawBag(ctx);
  if(!tagOn())block(ctx,'price',W/2-280,RB-140,560,100,()=>{
    ctx.textAlign='center';ctx.font='500 23px "Hanken Grotesk", sans-serif';ctx.fillStyle='#2B2B2B';ctx.letterSpacing='4px';ctx.fillText((priceDisplay+' · '+F('fCta')).toUpperCase(),W/2,RB-108,W-180);ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.fillText(oneLine(F('fProv')).toUpperCase(),W/2,RB-60,W-180);ctx.letterSpacing='0px';
  });
  sold(ctx);
  }
