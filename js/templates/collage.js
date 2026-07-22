export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    collageGrid(ctx);
    drawBag(ctx);
    banner(ctx,F('fProv'),(tagOn()?VY(.48):VY(.72))+txY,26,{upper:true,roman:true,bg:'#2B2B2B',alpha:.88,padY:18,padX:34});
    if(!tagOn()){
      banner(ctx,F('fName')+'  '+priceDisplay,VY(.83)+txY,50);
      banner(ctx,F('fCta'),VY(.93)+txY,42);
    }
    mark(ctx,false);sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,moodImgs,F,priceDisplay,tagOn,cover,drawBag,banner,sold,moodAt,hazardVignette,block}=env;
  // grid is full-bleed — only text respects the safe band, the photos own the whole 1920
  ctx.fillStyle='#EBE7E1';ctx.fillRect(0,0,W,CH);
  const cw=W/2,ch=CH/2;
  for(let index=0;index<4;index++){const cx=(index%2)*cw,cy=Math.floor(index/2)*ch;if(moodImgs.length)cover(ctx,moodAt(index),cx,cy,cw,ch);else{ctx.fillStyle=index%2?'#DED5C3':'#E8E1D3';ctx.fillRect(cx,cy,cw,ch);}ctx.strokeStyle='#F5F1EC';ctx.lineWidth=4;ctx.strokeRect(cx,cy,cw,ch);}
  hazardVignette(ctx);
  const x=54,w=W-108;
  block(ctx,'header',x,RT+18,w,48,()=>{ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(x,RT+18,w,48);ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.letterSpacing='4px';ctx.fillText('RBC / CONTACT SHEET',x+20,RT+50);ctx.textAlign='right';ctx.fillText('NO. '+F('fNo'),x+w-20,RT+50);ctx.letterSpacing='0px';});
  drawBag(ctx);
  block(ctx,'hook',32,RT+136,W-64,140,()=>banner(ctx,F('fHook'),RT+206,92,{bg:'#F5F1EC',fg:'#2B2B2B',alpha:.94,padY:20,padX:56}));
  block(ctx,'provenance',32,RB-78,W-64,56,()=>banner(ctx,F('fProv'),RB-50,24,{upper:true,roman:true,bg:'#2B2B2B',alpha:.9,padY:16,padX:34}));
  if(!tagOn())block(ctx,'name & price',32,RB-300,W-64,240,()=>{banner(ctx,F('fName')+'  '+priceDisplay,RB-250,64);banner(ctx,F('fCta'),RB-146,44);});
  sold(ctx);
  }
