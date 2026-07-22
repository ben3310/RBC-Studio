export function feed(ctx,env){
  const {W,CH,txX,txY,moodImgs,VY,F,priceDisplay,tagOn,cover,drawBag,sold,hookLines,wrapLines}=env;
  ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
  if(moodImgs[0])cover(ctx,moodImgs[0],W*.52,0,W*.48,CH);
  ctx.fillStyle='rgba(241,236,226,.12)';ctx.fillRect(W*.52,0,W*.48,CH);
  const hx=54+txX,hy=VY(.14)+txY;
  ctx.font='italic 300px "Cormorant Garamond", serif';ctx.fillStyle='rgba(168,137,92,.14)';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(F('fNo'),hx-10,hy+430);
  const lines=hookLines();
  lines.forEach((line,index)=>{
    ctx.font=(index===lines.length-1?'italic':'400')+' 118px "Cormorant Garamond", serif';ctx.fillStyle=index===lines.length-1?'#755f42':'#2B2B2B';ctx.fillText(line,hx,hy+index*118,W*.55);
  });
  drawBag(ctx);
  if(!tagOn()){
    const colW=W*.46;ctx.font='500 22px "Hanken Grotesk", sans-serif';ctx.letterSpacing='3px';ctx.textAlign='left';ctx.textBaseline='alphabetic';
    const l1=wrapLines(ctx,('NO. '+F('fNo')+' · '+F('fName')+' · '+priceDisplay).toUpperCase(),colW),l2=wrapLines(ctx,(F('fProv')+' · '+F('fCta')).toUpperCase(),colW),lh=34,total=(l1.length+l2.length)*lh+10;let yy=VY(1)-total-4;
    ctx.fillStyle='rgba(241,236,226,.85)';ctx.fillRect(40,yy-26,colW+34,total+40);ctx.fillStyle='#2B2B2B';l1.forEach(line=>{ctx.fillText(line,54,yy+lh-10);yy+=lh;});yy+=10;ctx.fillStyle='#444748';l2.forEach(line=>{ctx.fillText(line,54,yy+lh-10);yy+=lh;});ctx.letterSpacing='0px';
  }
  sold(ctx);
}

export function reel(ctx,env){
  const {W,CH,RT,RB,SH,moodImgs,F,priceDisplay,tagOn,cover,drawBag,sold,hookLines,vignette,block,oneLine}=env;
  // Keep Editorial recognizably related to its feed proof: paper on the left,
  // image on the right, type crossing the seam, and a restrained archive card.
  ctx.fillStyle='#F5F1EC';ctx.fillRect(0,0,W,CH);
  const split=W*.43;
  ctx.fillStyle='#EBE7E1';ctx.fillRect(split,0,W-split,CH);
  if(moodImgs[0])cover(ctx,moodImgs[0],split,0,W-split,CH);
  ctx.fillStyle='rgba(241,236,226,.1)';ctx.fillRect(split,0,W-split,CH);
  vignette(ctx);
  ctx.fillStyle='#755f42';ctx.fillRect(split,RT,2,SH);

  block(ctx,'header',48,RT+24,W-96,44,()=>{
    ctx.font='500 18px "Hanken Grotesk", sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#444748';ctx.letterSpacing='4px';ctx.fillText('RBC / EDITORIAL',58,RT+48);ctx.letterSpacing='0px';
    ctx.font='500 24px "Cormorant Garamond", serif';ctx.textAlign='right';ctx.fillStyle='#755f42';ctx.fillText('NO. '+F('fNo'),W-104,RT+50);
  });
  block(ctx,'hook',48,RT+96,split+40,hookLines().length*110+40,()=>{
    const lines=hookLines();let hy=RT+204;ctx.textAlign='left';
    lines.forEach((line,index)=>{ctx.font=(index===lines.length-1?'italic 400':'400')+' 108px "Cormorant Garamond", serif';ctx.fillStyle=index===lines.length-1?'#755f42':'#2B2B2B';ctx.fillText(line,58,hy,split-92);hy+=110;});
  });
  block(ctx,'era',44,RT+430,split-40,260,()=>{
    ctx.font='italic 260px "Cormorant Garamond", serif';ctx.fillStyle='rgba(117,95,66,.1)';ctx.textAlign='left';ctx.fillText(F('fNo'),46,RT+650,split-70);
    ctx.fillStyle='#755f42';ctx.fillRect(58,RT+470,52,2);
    ctx.font='500 17px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.letterSpacing='3px';ctx.fillText(oneLine(F('fProv')).split('·')[0].trim().toUpperCase(),58,RT+510,split-90);ctx.letterSpacing='0px';
  });

  drawBag(ctx);
  if(!tagOn())block(ctx,'name & price',58,RB-236,W-174,186,()=>{
    const y=RB-236;ctx.fillStyle='rgba(245,241,236,.94)';ctx.fillRect(58,y,W-174,186);ctx.strokeStyle='#755f42';ctx.lineWidth=1.5;ctx.strokeRect(68,y+10,W-194,166);
    ctx.textAlign='left';ctx.font='italic 46px "Cormorant Garamond", serif';ctx.fillStyle='#2B2B2B';ctx.fillText(oneLine(F('fName')),94,y+68,W-350);
    ctx.textAlign='right';ctx.font='500 54px "Cormorant Garamond", serif';ctx.fillStyle='#755f42';ctx.fillText(priceDisplay,W-142,y+68,260);
    ctx.textAlign='left';ctx.font='500 19px "Hanken Grotesk", sans-serif';ctx.fillStyle='#444748';ctx.letterSpacing='2px';ctx.fillText((oneLine(F('fProv'))+' · '+F('fCta')).toUpperCase(),94,y+126,W-250);ctx.letterSpacing='0px';
  });
  sold(ctx);
}
