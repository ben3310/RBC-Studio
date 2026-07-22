export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
    if(moodImgs[0]){
      ctx.globalAlpha=.25;blurCover(ctx,moodImgs[0],0,0,W,CH,22);ctx.globalAlpha=1;
      ctx.fillStyle='rgba(241,236,226,.55)';ctx.fillRect(0,0,W,CH);
    }
    ctx.font='500 22px "Hanken Grotesk", sans-serif';
    ctx.textAlign='center';ctx.fillStyle='#444748';
    ctx.letterSpacing='8px';
    ctx.fillText('THE ARCHIVE',W/2,VY(.06));
    ctx.letterSpacing='0px';
    drawBag(ctx);
    if(!tagOn()){
      const my=VY(.82)+txY;
      ctx.font='500 56px "Cormorant Garamond", serif';
      ctx.fillStyle='#2B2B2B';ctx.textAlign='center';ctx.textBaseline='alphabetic';
      ctx.fillText(F('fName'),W/2,my,W-120);
      ctx.fillStyle='#755f42';ctx.fillRect(W/2-24,my+28,48,2);
      ctx.font='500 24px "Hanken Grotesk", sans-serif';
      ctx.fillStyle='#444748';ctx.letterSpacing='4px';
      ctx.fillText((F('fProv')+'  ·  '+priceDisplay).toUpperCase(),W/2,my+84,W-100);
      ctx.fillText(F('fCta').toUpperCase(),W/2,my+130);
      ctx.letterSpacing='0px';
    }
    lotNo(ctx,'#755f42');mark(ctx,true);sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,SH,moodImgs,F,priceDisplay,tagOn,blurCover,drawBag,sold,reelMast,atmosphere,hazardVignette,block,oneLine}=env;
    // fragrance-ad: full-bleed blurred mood, bag floating, credit low
    ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
    if(moodImgs[0]){
      // deeper wash so the mood photo reads as atmosphere, not blank cream
      ctx.globalAlpha=.55;blurCover(ctx,moodImgs[0],0,0,W,CH,20);ctx.globalAlpha=1;
      ctx.fillStyle='rgba(241,236,226,.32)';ctx.fillRect(0,0,W,CH);
      hazardVignette(ctx);
    } else atmosphere(ctx,'rgba(241,236,226,.5)');
    block(ctx,'masthead',W/2-260,RT+22,520,72,()=>{
      reelMast(ctx,'#2B2B2B');
      ctx.font='500 24px "Hanken Grotesk", sans-serif';ctx.textAlign='center';ctx.fillStyle='#444748';ctx.letterSpacing='11px';ctx.fillText('THE ARCHIVE',W/2,RT+72);ctx.letterSpacing='0px';
      ctx.font='500 26px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.fillStyle='#755f42';ctx.fillText('NO. '+F('fNo'),W-120,RT+72);
    });
    drawBag(ctx);
    if(!tagOn()){
      block(ctx,'name & price',60,RB-350,W-120,310,()=>{
        const by=RB-266;
        ctx.font='500 86px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fName')),W/2,by,W-140);
        ctx.font='italic 40px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';ctx.fillText(oneLine(F('fHook')),W/2,by+62,W-200);
        ctx.fillStyle='#755f42';ctx.fillRect(W/2-30,by+96,60,2);
        ctx.font='500 25px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.letterSpacing='4px';ctx.fillText((oneLine(F('fProv'))+'  ·  '+priceDisplay).toUpperCase(),W/2,by+152,W-160);ctx.fillText(F('fCta').toUpperCase(),W/2,by+198);ctx.letterSpacing='0px';
      });
    } else {
      block(ctx,'hook',60,RT+SH*.26-72,W-120,112,()=>{ctx.font='italic 68px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#755f42';ctx.fillText(oneLine(F('fHook')),W/2,RT+SH*.26,W-160);});
    }
    sold(ctx);
  }
