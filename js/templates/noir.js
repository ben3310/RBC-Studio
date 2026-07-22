export function feed(ctx,env){
  const {W,H,CH,REEL_H,REEL_TOP,REEL_BOT,RT,RB,SH,fmt,accent,txX,txY,moodImgs,bagImg,SIT,SIB,SIL,SIR,VY,F,priceDisplay,tagOn,cover,blurCover,drawBag,banner,mark,lotNo,sold,gridTag,hookLines,moodAt,gridCount,layoutRects,collageGrid,wrapLines,polaroidFrame,tape,reelMast,atmosphere}=env;
    ctx.fillStyle='#EBE7E1';ctx.fillRect(0,0,W,CH);
    const fx=40, fy=SIT()+20, fw=W-80, fh=CH-SIB()-SIT()-40;
    if(moodImgs[0]){
      ctx.globalAlpha=.34;cover(ctx,moodImgs[0],fx,fy,fw,fh);ctx.globalAlpha=1;
      ctx.fillStyle='rgba(28,27,23,.45)';ctx.fillRect(fx,fy,fw,fh);
    }
    ctx.strokeStyle='#755f42';ctx.lineWidth=2;ctx.globalAlpha=.7;
    ctx.strokeRect(fx,fy,fw,fh);ctx.globalAlpha=1;
    ctx.font='500 22px "Hanken Grotesk", sans-serif';
    ctx.fillStyle='#755f42';ctx.textAlign='center';ctx.letterSpacing='7px';
    ctx.fillText('THE ARCHIVE · AFTER DARK',W/2,VY(.07));
    ctx.letterSpacing='0px';
    drawBag(ctx);
    const lines=hookLines();
    const ny=VY(.82)+txY;
    // hook text sits directly on the mood photo with no local chip behind it;
    // the whole-frame tint above isn't enough on bright photos, so pin a
    // second, tighter scrim behind just the text band before drawing it
    if(moodImgs[0]){
      const scrimH=lines.length*84+90;
      const scrimY=Math.min(ny-64,fy+fh-scrimH);
      ctx.fillStyle='rgba(20,19,16,.4)';
      ctx.fillRect(fx,Math.max(fy,scrimY),fw,scrimH);
    }
    ctx.textAlign='center';
    lines.forEach((ln,i)=>{
      ctx.font=(i===lines.length-1?'italic':'400')+' 74px "Cormorant Garamond", serif';
      ctx.fillStyle=i===lines.length-1?'#755f42':'#2B2B2B';
      ctx.fillText(ln,W/2,ny+i*84,W-160);
    });
    ctx.fillStyle='#755f42';ctx.fillRect(W/2-22,ny+lines.length*84+4,44,2);
    if(!tagOn()){
      ctx.font='500 23px "Hanken Grotesk", sans-serif';
      ctx.fillStyle=moodImgs[0]?'#F5F1EC':'#2B2B2B';ctx.letterSpacing='4px';
      ctx.fillText((F('fName')+' · '+priceDisplay+' · '+F('fCta')).toUpperCase(),W/2,ny+lines.length*84+58,W-140);
      ctx.letterSpacing='0px';
    }
    lotNo(ctx,'#755f42');mark(ctx,true);sold(ctx);
  }

export function reel(ctx,env){
  const {W,CH,RT,RB,SH,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,hookLines,atmosphere,block,oneLine}=env;
    // cinema frame within the standard warm-sand surface
    ctx.fillStyle='#EBE7E1';ctx.fillRect(0,0,W,CH);
    atmosphere(ctx,'rgba(235,231,225,.86)');
    const fx=70,fy=40,fw=W-140,fh=CH-80;
    if(moodImgs[0]){
      ctx.globalAlpha=.34;cover(ctx,moodImgs[0],fx,fy,fw,fh);ctx.globalAlpha=1;
      ctx.fillStyle='rgba(20,19,16,.5)';ctx.fillRect(fx,fy,fw,fh);
    }
    ctx.strokeStyle='#755f42';ctx.lineWidth=2;ctx.globalAlpha=.75;
    ctx.strokeRect(fx,fy,fw,fh);ctx.globalAlpha=1;
    const dark=moodImgs[0]?'#F5F1EC':'#2B2B2B';
    // bronze washes out on the darkened photo tint; lift the accent when a mood
    // image backs the frame so the masthead stays legible after dark
    const gold=moodImgs[0]?'#C9AE84':'#755f42';
    block(ctx,'header',fx+20,RT+52,fw-40,44,()=>{
      ctx.font='500 23px "Hanken Grotesk", sans-serif';ctx.textAlign='center';ctx.fillStyle=gold;ctx.letterSpacing='9px';ctx.fillText('THE ARCHIVE · AFTER DARK',W/2,RT+76);ctx.letterSpacing='0px';
      ctx.font='500 25px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.fillStyle=gold;ctx.fillText('NO. '+F('fNo'),W-110,RT+78);
      ctx.font='italic 24px "Cormorant Garamond", serif';ctx.textAlign='left';ctx.fillStyle=dark;ctx.fillText('RBC',110,RT+78);
    });
    drawBag(ctx);
    const lines=hookLines();const hookBase=tagOn()?RT+SH*.26:RB-420;
    block(ctx,'hook',60,hookBase-84,W-120,lines.length*100+40,()=>{
      if(moodImgs[0]){
        ctx.fillStyle='rgba(20,19,16,.4)';
        ctx.fillRect(fx+20,hookBase-84,fw-40,lines.length*100+40);
      }
      let ny=hookBase;ctx.textAlign='center';
      lines.forEach((ln,i)=>{ctx.font=(i===lines.length-1?'italic':'400')+' 94px "Cormorant Garamond", serif';ctx.fillStyle=i===lines.length-1?gold:dark;ctx.fillText(ln,W/2,ny,W-200);ny+=100;});
      ctx.fillStyle=gold;ctx.fillRect(W/2-60,ny-72,120,3);
    });
    if(!tagOn())block(ctx,'name & price',60,RB-142,W-120,110,()=>{
      ctx.font='500 25px "Hanken Grotesk", sans-serif';ctx.textAlign='center';ctx.fillStyle=dark;ctx.letterSpacing='4px';
      ctx.fillText((oneLine(F('fName'))+' · '+priceDisplay).toUpperCase(),W/2,RB-100,W-220);
      ctx.fillText(F('fCta').toUpperCase(),W/2,RB-56);ctx.letterSpacing='0px';
    });
    sold(ctx);
  }
