export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#F4F0E6';ctx.fillRect(0,0,W,CH);
    ctx.fillStyle='#2B2B2B';
    ctx.fillRect(56,VY(.055),W-112,3);ctx.fillRect(56,VY(.055)+8,W-112,1);
    ctx.font='600 56px "Cormorant Garamond", serif';
    ctx.textAlign='center';ctx.fillStyle='#2B2B2B';
    ctx.fillText('THE ARCHIVE GAZETTE',W/2,VY(.055)+76,W-140);
    ctx.font='500 19px "Hanken Grotesk", sans-serif';
    ctx.letterSpacing='3px';ctx.fillStyle='#444748';
    ctx.textAlign='left';ctx.fillText('LOT '+F('fNo'),56,VY(.055)+122);
    ctx.textAlign='center';ctx.fillText(F('fProv').split('·')[0].trim().toUpperCase(),W/2,VY(.055)+122);
    ctx.textAlign='right';ctx.fillText(priceDisplay,W-56,VY(.055)+122);
    ctx.letterSpacing='0px';
    ctx.fillStyle='#2B2B2B';ctx.fillRect(56,VY(.055)+142,W-112,1);
    const iy=VY(.055)+170, iw=W*.55, ih=VY(.92)-iy-40;
    if(moodImgs[0]){cover(ctx,moodImgs[0],56,iy,iw,ih);}
    else{ctx.fillStyle='#E8E1D3';ctx.fillRect(56,iy,iw,ih);}
    ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;ctx.strokeRect(56,iy,iw,ih);
    drawBag(ctx);
    const cx2=56+iw+34, cw2=W-56-cx2;
    ctx.textAlign='left';
    ctx.font='italic 42px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
    let hy=iy+52;
    wrapLines(ctx,F('fHook'),cw2).forEach(ln=>{ctx.fillText(ln,cx2,hy);hy+=48;});
    ctx.fillStyle='#755f42';ctx.fillRect(cx2,hy-24,44,2);
    hy+=18;
    ctx.font='400 21px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';
    wrapLines(ctx,F('fName')+'. '+F('fProv')+'. Excellent vintage condition, in hand.',cw2).forEach(ln=>{ctx.fillText(ln,cx2,hy);hy+=30;});
    if(!tagOn()){
      ctx.font='italic 28px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
      ctx.fillText(F('fCta').toLowerCase()+' \u223D',cx2,hy+34);
    }
    ctx.fillStyle='#2B2B2B';ctx.fillRect(56,VY(.92),W-112,1);
    ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.letterSpacing='3px';
    ctx.textAlign='center';ctx.fillStyle='#444748';
    ctx.fillText('@RAREBAGCLUB · DAILY',W/2,VY(.92)+34);
    ctx.letterSpacing='0px';sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,wrapLines,atmosphere,block,oneLine}=env;
  ctx.fillStyle='#F4F0E6';ctx.fillRect(0,0,W,CH);
  atmosphere(ctx,'rgba(244,240,230,.88)');
  const x=58,right=W-58;

  // the photo plate is contained within the safe band so its whole frame reads
  // on-device; the hazard zones keep only the background wash
  const photoY=RT+176,photoH=RB-photoY;
  if(moodImgs[0])cover(ctx,moodImgs[0],x,photoY,right-x,photoH);else{ctx.fillStyle='#E8E1D3';ctx.fillRect(x,photoY,right-x,photoH);}
  ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;ctx.strokeRect(x,photoY,right-x,photoH);
  env.hazardVignette(ctx);
  drawBag(ctx);

  block(ctx,'masthead',x,RT+16,right-x,140,()=>{
    ctx.fillStyle='#F4F0E6';ctx.fillRect(x,RT+16,right-x,140);
    ctx.fillStyle='#2B2B2B';ctx.fillRect(x,RT+20,right-x,3);ctx.fillRect(x,RT+30,right-x,1);
    ctx.font='600 54px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#2B2B2B';ctx.fillText('THE ARCHIVE GAZETTE',W/2,RT+92,W-150);
    ctx.font='500 17px "Hanken Grotesk", sans-serif';ctx.letterSpacing='3px';ctx.fillStyle='#444748';ctx.textAlign='left';ctx.fillText('LOT '+F('fNo'),x+26,RT+130);ctx.textAlign='center';ctx.fillText(oneLine(F('fProv')).split('·')[0].trim().toUpperCase(),W/2,RT+130);ctx.textAlign='right';ctx.fillText(priceDisplay,right-26,RT+130);ctx.letterSpacing='0px';
    ctx.fillStyle='#2B2B2B';ctx.fillRect(x,RT+150,right-x,1);
  });

  block(ctx,'headline',x+24,photoY+26,right-x-48,160,()=>{
    const headlineY=photoY+26;ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(x+24,headlineY,right-x-48,160);
    ctx.font='italic 64px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';let lineY=headlineY+66;
    wrapLines(ctx,F('fHook'),right-x-104).slice(0,2).forEach(line=>{ctx.fillText(line,x+52,lineY);lineY+=64;});
  });
  if(!tagOn())block(ctx,'body',x+24,RB-246,right-x-48,166,()=>{
    const bodyY=RB-210;ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(x+24,bodyY-36,right-x-48,166);
    ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.textAlign='left';ctx.letterSpacing='1px';
    wrapLines(ctx,(oneLine(F('fName'))+'. '+oneLine(F('fProv'))+'.').toUpperCase(),W-268).slice(0,3).forEach((line,index)=>ctx.fillText(line,x+24,bodyY+index*30));
    ctx.font='italic 30px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';ctx.letterSpacing='0px';ctx.fillText(F('fCta').toLowerCase()+' ∽',x+24,bodyY+126);
  });
  block(ctx,'footer',x,RB-36,right-x,54,()=>{
    ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(x,RB-36,right-x,36);
    ctx.fillStyle='#2B2B2B';ctx.fillRect(x,RB-36,right-x,1);ctx.font='500 16px "Hanken Grotesk", sans-serif';ctx.textAlign='right';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText('@RAREBAGCLUB / DAILY',right-24,RB-12);ctx.letterSpacing='0px';
  });
  sold(ctx);
  }
