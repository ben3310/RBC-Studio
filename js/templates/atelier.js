export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
    const lw=W*.56;
    if(moodImgs[0]) cover(ctx,moodImgs[0],0,0,lw,CH);
    else {ctx.fillStyle='#E8E1D3';ctx.fillRect(0,0,lw,CH);}
    drawBag(ctx);
    ctx.fillStyle='#F5F1EC';ctx.fillRect(lw,0,W-lw,CH);
    const rx=lw+34;
    ctx.font='500 30px "Cormorant Garamond", serif';
    ctx.textAlign='right';ctx.fillStyle='#755f42';
    ctx.fillText(F('fNo'),W-34,VY(.04));
    ctx.font='500 19px "Hanken Grotesk", sans-serif';
    ctx.textAlign='left';ctx.fillStyle='#755f42';ctx.letterSpacing='4px';
    ctx.fillText('THE PIECE',rx,VY(.1));
    ctx.letterSpacing='0px';
    const words=F('fName').split(/\s+/);
    ctx.font='500 58px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
    let line='',yy=VY(.16);const maxW=W-lw-70;
    words.forEach(w=>{
      const t=line?line+' '+w:w;
      if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,rx,yy);yy+=64;line=w;}
      else line=t;
    });
    ctx.fillText(line,rx,yy);
    ctx.font='italic 30px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';
    ctx.fillText(F('fHook'),rx,yy+62,maxW);
    const sy=VY(.72);
    ctx.strokeStyle='#DED5C3';ctx.lineWidth=2;
    const specs=(tagOn()
      ?[['ERA',F('fProv').split('·')[0].trim()],['COND.','Excellent']]
      :[['ERA',F('fProv').split('·')[0].trim()],['PRICE',priceDisplay],['COND.','Excellent']]);
    specs.forEach((sp,i)=>{
      const yyy=sy+i*74;
      ctx.beginPath();ctx.moveTo(rx,yyy);ctx.lineTo(W-34,yyy);ctx.stroke();
      ctx.font='500 18px "Hanken Grotesk", sans-serif';
      ctx.fillStyle='#444748';ctx.letterSpacing='2px';
      ctx.fillText(sp[0],rx,yyy+34);
      ctx.textAlign='right';ctx.fillStyle='#2B2B2B';
      ctx.fillText(String(sp[1]).toUpperCase(),W-34,yyy+34);
      ctx.textAlign='left';ctx.letterSpacing='0px';
    });
    if(!tagOn()){
      ctx.font='italic 32px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
      ctx.fillText(F('fCta').toLowerCase()+' ∽',rx,VY(.98));
    }
    ctx.save();ctx.translate(40,CH-40);ctx.rotate(-Math.PI/2);
    ctx.font='500 19px "Hanken Grotesk", sans-serif';
    ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=6;
    ctx.letterSpacing='4px';
    ctx.fillText('THE ARCHIVE · NO. '+F('fNo'),0,0);
    ctx.restore();
    sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,SH,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,wrapLines,vignette,block,oneLine}=env;
    // tall bookmark split: photo column bleeds full height, panel carries the record
    ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
    const lw=W*.52;
    if(moodImgs[0]) cover(ctx,moodImgs[0],0,0,lw,CH);
    else {ctx.fillStyle='#E8E1D3';ctx.fillRect(0,0,lw,CH);}
    ctx.fillStyle='#F5F1EC';ctx.fillRect(lw,0,W-lw,CH);
    vignette(ctx);
    ctx.fillStyle='#755f42';ctx.fillRect(lw,RT,2,SH);
    drawBag(ctx);
    const rx=lw+42, rr=W-64, maxW=rr-rx;
    block(ctx,'record',rx-12,RT+34,W-rx-28,RB-RT-70,()=>{
      ctx.font='500 28px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.fillStyle='#755f42';ctx.fillText(F('fNo'),rr,RT+64);
      ctx.font='500 20px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#755f42';ctx.letterSpacing='5px';ctx.fillText('THE PIECE',rx,RT+134);ctx.letterSpacing='0px';
      ctx.font='500 60px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';
      const nameLines=wrapLines(ctx,F('fName'),maxW);nameLines.forEach((l,i)=>ctx.fillText(l,rx,RT+216+i*66,maxW));
      const afterName=RT+216+(nameLines.length-1)*66;
      ctx.font='italic 32px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';ctx.fillText(oneLine(F('fHook')),rx,afterName+58,maxW);
      const sy=afterName+150;
      const specs=(tagOn()?[['ERA',oneLine(F('fProv')).split('·')[0].trim()],['COND.','Excellent']]:[['ERA',oneLine(F('fProv')).split('·')[0].trim()],['PRICE',priceDisplay],['COND.','Excellent']]);
      // the bag renders under this panel; a paper chip keeps the spec rows
      // legible even when the handle crosses the column
      ctx.fillStyle='rgba(245,241,236,.92)';ctx.fillRect(rx-18,sy-24,rr-rx+36,specs.length*88+44);
      ctx.strokeStyle='#DED5C3';ctx.lineWidth=2;
      specs.forEach((sp,i)=>{const yyy=sy+i*88;ctx.beginPath();ctx.moveTo(rx,yyy);ctx.lineTo(rr,yyy);ctx.stroke();ctx.font='500 19px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.letterSpacing='2px';ctx.textAlign='left';ctx.fillText(sp[0],rx,yyy+42);ctx.textAlign='right';ctx.fillStyle='#2B2B2B';ctx.font='500 24px "Cormorant Garamond", serif';ctx.fillText(String(sp[1]).toUpperCase(),rr,yyy+44);ctx.letterSpacing='0px';});
      if(!tagOn()){ctx.textAlign='left';ctx.font='italic 30px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';ctx.fillText(F('fCta').toLowerCase()+' ∽',rx,Math.max(sy+specs.length*88+24,RB-52));}
    });
    block(ctx,'spine',26,RT+60,48,SH-120,()=>{
      ctx.save();ctx.translate(46,RB-20);ctx.rotate(-Math.PI/2);ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=6;ctx.letterSpacing='4px';ctx.fillText('THE ARCHIVE · NO. '+F('fNo'),0,0);ctx.shadowBlur=0;ctx.letterSpacing='0px';ctx.restore();
    });
    sold(ctx);
  }
