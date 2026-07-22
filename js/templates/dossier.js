export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#EFE7D5';ctx.fillRect(0,0,W,CH);
    // file tab
    ctx.fillStyle='#2B2B2B';
    ctx.fillRect(56,VY(.04),320,56);
    ctx.font='500 20px "Hanken Grotesk", sans-serif';
    ctx.letterSpacing='4px';ctx.textAlign='left';ctx.fillStyle='#F5F1EC';
    ctx.fillText('RBC / ARCHIVE',80,VY(.04)+37);
    ctx.letterSpacing='0px';
    ctx.fillStyle='#2B2B2B';ctx.fillRect(56,VY(.04)+56,W-112,2);
    // evidence photo
    if(moodImgs[0]){
      ctx.save();ctx.translate(W-236,VY(.14));ctx.rotate(0.03);
      ctx.fillStyle='#FDFCF8';ctx.fillRect(-16,-16,332,332);
      cover(ctx,moodImgs[0],0,0,300,300);
      ctx.restore();
    }
    drawBag(ctx);
    // form rows with dotted leaders
    const rows=(tagOn()
      ?[['ERA',F('fProv').split('·')[0].trim()],['CONDITION','Excellent vintage']]
      :[['ARTICLE',F('fName')],['ERA',F('fProv').split('·')[0].trim()],['PRICE',priceDisplay],['CONDITION','Excellent vintage']]);
    let fy2=tagOn()?VY(.86):VY(.68);
    ctx.font='500 20px "Hanken Grotesk", sans-serif';
    rows.forEach(([k,v])=>{
      ctx.letterSpacing='3px';ctx.textAlign='left';ctx.fillStyle='#444748';
      ctx.fillText(k,72,fy2);
      ctx.letterSpacing='0px';
      ctx.textAlign='right';ctx.fillStyle='#2B2B2B';
      ctx.font='500 24px "Cormorant Garamond", serif';
      ctx.fillText(String(v),W-72,fy2,W*.5);
      ctx.font='500 20px "Hanken Grotesk", sans-serif';
      ctx.strokeStyle='rgba(38,37,31,.5)';ctx.lineWidth=1;
      ctx.setLineDash([2,7]);
      ctx.beginPath();ctx.moveTo(72,fy2+14);ctx.lineTo(W-72,fy2+14);ctx.stroke();
      ctx.setLineDash([]);
      fy2+=64;
    });
    // stamp
    ctx.save();ctx.translate(W*.72,VY(.3));ctx.rotate(-0.16);
    ctx.globalAlpha=.85;
    ctx.strokeStyle='#8A1F1F';ctx.lineWidth=4;
    ctx.strokeRect(-190,-52,380,104);
    ctx.strokeRect(-180,-42,360,84);
    ctx.font='600 34px "Hanken Grotesk", sans-serif';
    ctx.letterSpacing='4px';ctx.textAlign='center';ctx.fillStyle='#8A1F1F';
    ctx.fillText('AUTHENTICATED',0,12);
    ctx.letterSpacing='0px';ctx.globalAlpha=1;
    ctx.restore();
    if(!tagOn()){
      ctx.font='italic 30px "Cormorant Garamond", serif';
      ctx.textAlign='center';ctx.fillStyle='#2B2B2B';
      ctx.fillText(F('fCta').toLowerCase()+' \u223D  ·  @rarebagclub',W/2,VY(.96),W-160);
    }
    sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,SH,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,atmosphere,block,oneLine}=env;
  ctx.fillStyle='#EFE7D5';ctx.fillRect(0,0,W,CH);
  atmosphere(ctx,'rgba(239,231,213,.86)');
  // the folder + evidence photo are contained within the safe band so the whole
  // case file reads on-device; the hazard zones keep only the background wash
  const x=54,y=RT,w=W-108,h=RB-RT;
  ctx.fillStyle='rgba(245,241,236,.76)';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);

  const photoW=420,photoH=h-220,photoX=x+w-photoW-40,photoY=y+70;
  ctx.fillStyle='#FDFCF8';ctx.fillRect(photoX-12,photoY-12,photoW+24,photoH+24);
  if(moodImgs[0])cover(ctx,moodImgs[0],photoX,photoY,photoW,photoH);else{ctx.fillStyle='#E8E1D3';ctx.fillRect(photoX,photoY,photoW,photoH);}
  ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;ctx.strokeRect(photoX,photoY,photoW,photoH);
  env.hazardVignette(ctx);

  block(ctx,'header',x,RT-4,w,58,()=>{
    ctx.fillStyle='#2B2B2B';ctx.fillRect(x,RT-4,320,58);
    ctx.font='500 19px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#F5F1EC';ctx.letterSpacing='4px';ctx.fillText('RBC / CASE FILE',x+24,RT+32);ctx.letterSpacing='0px';
    ctx.font='500 23px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.fillStyle='#755f42';ctx.fillText('ARCHIVE NO. '+F('fNo'),x+w-28,RT+32);
  });
  block(ctx,'hook',x+20,RT+62,photoX-x-60,128,()=>{
    ctx.fillStyle='rgba(245,241,236,.9)';ctx.fillRect(x+20,RT+62,photoX-x-60,128);
    ctx.font='italic 64px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fHook')),x+28,RT+142,photoX-x-100);
    ctx.fillStyle='#755f42';ctx.fillRect(x+28,RT+168,56,2);
  });
  block(ctx,'ledger',x+16,RT+222,photoX-40-(x+16)+24,RB-40-(RT+222),()=>{
    const rows=tagOn()?[["ERA",oneLine(F('fProv')).split('·')[0].trim()],["STATUS",'AUTHENTICATED']]:[["ARTICLE",oneLine(F('fName'))],["ERA",oneLine(F('fProv')).split('·')[0].trim()],["PRICE",priceDisplay],["ROUTE",F('fCta')]];
    let ry=RT+264;const rowRight=photoX-40;
    ctx.fillStyle='rgba(245,241,236,.88)';ctx.fillRect(x+16,ry-42,rowRight-x-16+24,rows.length*76+34);
    rows.forEach(([label,value])=>{
      ctx.strokeStyle='rgba(43,43,43,.45)';ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(x+28,ry);ctx.lineTo(rowRight,ry);ctx.stroke();ctx.setLineDash([]);
      ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText(label,x+28,ry+40);
      ctx.textAlign='right';ctx.fillStyle='#2B2B2B';ctx.letterSpacing='1px';ctx.font='500 22px "Cormorant Garamond", serif';ctx.fillText(String(value).toUpperCase(),rowRight,ry+42,rowRight-x-180);ctx.letterSpacing='0px';ry+=76;
    });
    ctx.font='italic 300px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='rgba(43,43,43,.05)';ctx.fillText(F('fNo'),x+8,RB-40);
    ctx.strokeStyle='rgba(43,43,43,.28)';ctx.setLineDash([2,7]);
    for(;ry<RB-40;ry+=76){ctx.beginPath();ctx.moveTo(x+28,ry);ctx.lineTo(rowRight,ry);ctx.stroke();}
    ctx.setLineDash([]);
  });
  ctx.save();ctx.translate(photoX+photoW/2,photoY+photoH+36);ctx.rotate(-.08);ctx.strokeStyle='#8A1F1F';ctx.lineWidth=3;ctx.strokeRect(-140,-34,280,68);ctx.font='600 22px "Hanken Grotesk", sans-serif';ctx.textAlign='center';ctx.fillStyle='#8A1F1F';ctx.letterSpacing='3px';ctx.fillText('AUTHENTICATED',0,8);ctx.restore();
  drawBag(ctx);sold(ctx);
  }
