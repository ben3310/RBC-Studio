export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#F6F2E9';ctx.fillRect(0,0,W,CH);
    ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;
    ctx.strokeRect(44,SIT()+44,W-88,CH-SIT()-SIB()-88);
    ctx.font='500 20px "Hanken Grotesk", sans-serif';
    ctx.letterSpacing='4px';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';
    ctx.fillText('SPECIMEN · NO. '+F('fNo'),72,VY(.075));
    ctx.textAlign='right';ctx.fillStyle='#755f42';
    ctx.fillText('THE ARCHIVE',W-72,VY(.075));
    ctx.letterSpacing='0px';
    ctx.fillStyle='#2B2B2B';ctx.fillRect(72,VY(.075)+18,W-144,1);
    // registration crosses
    const crosses=[[W/2,VY(.2)],[W*.18,VY(.5)],[W*.82,VY(.5)],[W/2,VY(.78)]];
    ctx.strokeStyle='rgba(38,37,31,.5)';ctx.lineWidth=1;
    crosses.forEach(([cx,cy])=>{
      ctx.beginPath();ctx.moveTo(cx-14,cy);ctx.lineTo(cx+14,cy);
      ctx.moveTo(cx,cy-14);ctx.lineTo(cx,cy+14);ctx.stroke();
    });
    // swatch column · cycles available images, hides when none
    if(moodImgs.length){
      const swN=Math.min(3,Math.max(moodImgs.length,1));
      for(let i=0;i<swN;i++){
        const sx=W-72-120, sy2=VY(.16)+i*156;
        cover(ctx,moodAt(i),sx,sy2,120,120);
        ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;ctx.strokeRect(sx,sy2,120,120);
        ctx.font='400 15px "Hanken Grotesk", sans-serif';
        ctx.textAlign='left';ctx.fillStyle='#444748';
        ctx.fillText('fig. 0'+(i+1),sx,sy2+140);
      }
    }
    drawBag(ctx);
    // museum label
    if(!tagOn()){
      const lx=72, ly=VY(.76), lw2=W*.48;
      ctx.fillStyle='#FDFCF8';ctx.fillRect(lx,ly,lw2,VY(.95)-ly);
      ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;ctx.strokeRect(lx,ly,lw2,VY(.95)-ly);
      ctx.font='500 30px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';
      ctx.fillText(F('fName'),lx+26,ly+52,lw2-52);
      ctx.font='400 19px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';
      ctx.fillText(F('fProv'),lx+26,ly+90,lw2-52);
      ctx.fillText(priceDisplay+' · Excellent',lx+26,ly+122,lw2-52);
      ctx.font='italic 24px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';
      ctx.fillText(F('fCta').toLowerCase()+' \u223D',lx+26,ly+164);
    }
    sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,SH,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,moodAt,atmosphere,block,oneLine}=env;
  ctx.fillStyle='#F6F2E9';ctx.fillRect(0,0,W,CH);
  atmosphere(ctx,'rgba(246,242,233,.9)');
  // the board + plate are contained within the safe band so the whole board reads
  // on-device; the hazard zones keep only the background wash
  const x=48,y=RT,w=W-96,h=RB-RT;
  ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
  const plateX=x+38,plateY=y+56,plateW=650,plateH=y+h-plateY-56;
  if(moodImgs[0]){cover(ctx,moodAt(0),plateX,plateY,plateW,plateH);ctx.fillStyle='rgba(235,231,225,.22)';ctx.fillRect(plateX,plateY,plateW,plateH);}
  else{ctx.fillStyle='rgba(235,231,225,.7)';ctx.fillRect(plateX,plateY,plateW,plateH);}
  ctx.strokeStyle='rgba(43,43,43,.4)';ctx.strokeRect(plateX,plateY,plateW,plateH);
  env.hazardVignette(ctx);
  const crosses=[[plateX+30,plateY+30],[plateX+plateW-30,plateY+30],[plateX+30,plateY+plateH-30],[plateX+plateW-30,plateY+plateH-30]];crosses.forEach(([cx,cy])=>{ctx.beginPath();ctx.moveTo(cx-12,cy);ctx.lineTo(cx+12,cy);ctx.moveTo(cx,cy-12);ctx.lineTo(cx,cy+12);ctx.stroke();});
  if(moodImgs.length){const figH=170,figTop=plateY+30,gap=(plateH-60-figH*3)/2;for(let index=0;index<Math.min(3,moodImgs.length);index++){const sx=x+w-214,sy=figTop+index*(figH+gap);cover(ctx,moodAt(index+1),sx,sy,166,figH);ctx.strokeStyle='#2B2B2B';ctx.strokeRect(sx,sy,166,figH);ctx.font='500 14px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#444748';ctx.fillText('FIG. 0'+(index+1),sx,sy+figH+20);}}
  block(ctx,'header',x+24,RT-4,w-48,54,()=>{
    ctx.fillStyle='rgba(245,241,236,.92)';ctx.fillRect(x+24,RT-4,w-48,54);
    ctx.font='500 19px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';ctx.letterSpacing='4px';ctx.fillText('SPECIMEN / NO. '+F('fNo'),x+44,RT+30);ctx.textAlign='right';ctx.fillStyle='#755f42';ctx.fillText('THE ARCHIVE',x+w-44,RT+30);ctx.letterSpacing='0px';
  });
  block(ctx,'hook',plateX+8,RT+56,plateW-16,100,()=>{
    ctx.fillStyle='rgba(245,241,236,.92)';ctx.fillRect(plateX+8,RT+56,plateW-16,100);
    ctx.font='italic 50px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='#755f42';ctx.fillText(oneLine(F('fHook')),plateX+28,RT+114,plateW-56);
  });
  drawBag(ctx);
  if(!tagOn())block(ctx,'label',plateX+8,RB-192,Math.min(620,plateW-16),166,()=>{
    const ly=RB-192,lw=Math.min(620,plateW-16);ctx.fillStyle='#FDFCF8';ctx.fillRect(plateX+8,ly,lw,166);ctx.strokeStyle='#2B2B2B';ctx.lineWidth=1;ctx.strokeRect(plateX+8,ly,lw,166);
    ctx.font='500 38px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fName')),plateX+34,ly+56,lw-52);ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.fillText(oneLine(F('fProv')),plateX+34,ly+96,lw-52);ctx.fillText(priceDisplay+' · '+F('fCta'),plateX+34,ly+132,lw-52);
  });
  sold(ctx);
  }
