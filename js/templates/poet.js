export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
    const aw=W*.6, ah=(CH-SIT()-SIB())*.62, ax=W/2, atop=VY(.09);
    // arch clip
    ctx.save();ctx.beginPath();
    ctx.moveTo(ax-aw/2,atop+ah);
    ctx.lineTo(ax-aw/2,atop+aw/2);
    ctx.arc(ax,atop+aw/2,aw/2,Math.PI,0);
    ctx.lineTo(ax+aw/2,atop+ah);ctx.closePath();ctx.clip();
    if(moodImgs[0])cover(ctx,moodImgs[0],ax-aw/2,atop,aw,ah);
    else{ctx.fillStyle='#E8E1D3';ctx.fillRect(ax-aw/2,atop,aw,ah);}
    ctx.restore();
    // gold arch outline (offset)
    ctx.strokeStyle='#755f42';ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(ax-aw/2-16,atop+ah+16);
    ctx.lineTo(ax-aw/2-16,atop+aw/2);
    ctx.arc(ax,atop+aw/2,aw/2+16,Math.PI,0);
    ctx.lineTo(ax+aw/2+16,atop+ah+16);ctx.stroke();
    ctx.font='500 20px "Hanken Grotesk", sans-serif';
    ctx.letterSpacing='6px';ctx.textAlign='center';ctx.fillStyle='#444748';
    ctx.fillText('THE ARCHIVE',W/2,VY(.045));
    ctx.letterSpacing='0px';
    drawBag(ctx);
    const py2=atop+ah+90+txY;
    if(!tagOn()){
      ctx.font='500 48px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
      ctx.fillText(F('fName'),W/2,py2,W-180);
      ctx.font='italic 30px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';
      ctx.fillText('\u2014 '+F('fHook')+' \u2014',W/2,py2+52,W-220);
      ctx.font='500 21px "Hanken Grotesk", sans-serif';
      ctx.letterSpacing='4px';ctx.fillStyle='#444748';
      ctx.fillText((F('fProv')+' · '+priceDisplay).toUpperCase(),W/2,py2+112,W-160);
      ctx.fillText(F('fCta').toUpperCase(),W/2,py2+152);
      ctx.letterSpacing='0px';
    } else {
      ctx.font='italic 30px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';ctx.textAlign='center';
      ctx.fillText('\u2014 '+F('fHook')+' \u2014',W/2,py2,W-220);
    }sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,atmosphere,block,oneLine}=env;
  ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
  if(moodImgs[0]){ctx.globalAlpha=.16;cover(ctx,moodImgs[0],0,0,W,CH);ctx.globalAlpha=1;ctx.fillStyle='rgba(245,241,236,.78)';ctx.fillRect(0,0,W,CH);env.hazardVignette(ctx);}else atmosphere(ctx,'rgba(245,241,236,.8)');
  // the arch window is contained within the safe band so its crown and legs read
  // complete on-device — the hazard zones keep only the background wash
  const aw=820,ah=RB-RT,ax=W/2,top=RT;
  ctx.save();ctx.beginPath();ctx.moveTo(ax-aw/2,top+ah);ctx.lineTo(ax-aw/2,top+aw/2);ctx.arc(ax,top+aw/2,aw/2,Math.PI,0);ctx.lineTo(ax+aw/2,top+ah);ctx.closePath();ctx.clip();
  if(moodImgs[0])cover(ctx,moodImgs[0],ax-aw/2,top,aw,ah);else{ctx.fillStyle='#E8E1D3';ctx.fillRect(ax-aw/2,top,aw,ah);}ctx.restore();
  ctx.strokeStyle='#755f42';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax-aw/2-14,top+ah+14);ctx.lineTo(ax-aw/2-14,top+aw/2);ctx.arc(ax,top+aw/2,aw/2+14,Math.PI,0);ctx.lineTo(ax+aw/2+14,top+ah+14);ctx.stroke();
  env.hazardVignette(ctx);
  block(ctx,'header',W/2-220,RT+4,440,50,()=>{
    ctx.fillStyle='rgba(245,241,236,.9)';ctx.fillRect(W/2-220,RT+4,440,50);
    ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.textAlign='center';ctx.fillStyle='#444748';ctx.letterSpacing='6px';ctx.fillText('THE ARCHIVE / POET',W/2,RT+35);ctx.letterSpacing='0px';
  });
  drawBag(ctx);
  block(ctx,'hook',ax-320,RT+108,640,110,()=>{
    const hookY=RT+172;ctx.fillStyle='rgba(245,241,236,.92)';ctx.fillRect(ax-320,hookY-64,640,110);ctx.font='italic 62px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#755f42';ctx.fillText(oneLine(F('fHook')),W/2,hookY,560);
  });
  if(!tagOn())block(ctx,'name & price',W/2-320,RB-236,640,192,()=>{
    ctx.fillStyle='rgba(245,241,236,.92)';ctx.fillRect(W/2-320,RB-236,640,192);
    ctx.font='500 56px "Cormorant Garamond", serif';ctx.textAlign='center';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fName')),W/2,RB-198,W-180);ctx.font='500 21px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText((oneLine(F('fProv'))+' · '+priceDisplay).toUpperCase(),W/2,RB-136,W-180);ctx.fillText(F('fCta').toUpperCase(),W/2,RB-88);ctx.letterSpacing='0px';
  });
  sold(ctx);
  }
