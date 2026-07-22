async function imageSource(blob){
  if(globalThis.createImageBitmap)return createImageBitmap(blob);
  return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob);const image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read image.'));};image.src=url;});
}
function canvasBlob(canvas,type='image/png',quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not encode image.')),type,quality));}

export async function extractPalette(blob,count=5){
  const image=await imageSource(blob);const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,64,64);
  const data=ctx.getImageData(0,0,64,64).data;const buckets=new Map();
  for(let i=0;i<data.length;i+=16){if(data[i+3]<180)continue;const r=Math.round(data[i]/32)*32,g=Math.round(data[i+1]/32)*32,b=Math.round(data[i+2]/32)*32;const key=[Math.min(r,255),Math.min(g,255),Math.min(b,255)].join(',');buckets.set(key,(buckets.get(key)||0)+1);}
  return [...buckets.entries()].sort((a,b)=>b[1]-a[1]).slice(0,count).map(([key])=>'#'+key.split(',').map(value=>Number(value).toString(16).padStart(2,'0')).join(''));
}

export async function removeUniformBackground(blob){
  const image=await imageSource(blob);const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height),d=pixels.data;
  const points=[[2,2],[width-3,2],[2,height-3],[width-3,height-3]];let br=0,bg=0,bb=0;
  points.forEach(([x,y])=>{const i=(y*width+x)*4;br+=d[i];bg+=d[i+1];bb+=d[i+2];});br/=4;bg/=4;bb/=4;
  for(let i=0;i<d.length;i+=4){const distance=Math.hypot(d[i]-br,d[i+1]-bg,d[i+2]-bb);const alpha=Math.max(0,Math.min(1,(distance-22)/58));d[i+3]=Math.round(d[i+3]*alpha);}
  ctx.putImageData(pixels,0,0);return canvasBlob(canvas);
}

function validateCutoutEndpoint(value){
  const parsed=new URL(value);
  const local=['localhost','127.0.0.1'].includes(parsed.hostname);
  if(parsed.protocol!=='https:'&&!(local&&parsed.protocol==='http:'))throw new Error('Cutout endpoint must use HTTPS outside local development.');
  if(parsed.username||parsed.password||parsed.hash)throw new Error('Cutout endpoint contains forbidden URL credentials or fragments.');
  return parsed.toString();
}

export async function runCutout(blob,endpoint='',{signal,retries=1,timeoutMs=120000}={}){
  const url=String(endpoint||'').trim();
  if(!url)return {blob:await removeUniformBackground(blob),qa:{decision:'manual_review',provider:'browser-uniform-v1',score:null}};
  const safeUrl=validateCutoutEndpoint(url);
  let lastError;
  for(let attempt=0;attempt<=retries;attempt++){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort('timeout'),timeoutMs);
    const abort=()=>controller.abort(signal.reason||'cancelled');signal?.addEventListener('abort',abort,{once:true});
    try{
      const body=new FormData();body.append('image',blob,'product.png');
      const response=await fetch(safeUrl,{method:'POST',body,signal:controller.signal,redirect:'error'});
      if(!response.ok){const error=new Error(`Cutout service returned ${response.status}.`);error.retryable=response.status>=500;throw error;}
      const result=await response.blob();if(!result.type.startsWith('image/'))throw new Error('Cutout service did not return an image.');
      const reported=response.headers.get('x-rbc-qa-decision');
      const decision=['accept','fallback','manual_review','reject'].includes(reported)?reported:'manual_review';
      const rawScore=response.headers.get('x-rbc-qa-score');const score=rawScore===null?NaN:Number(rawScore);
      return {blob:result,qa:{decision,score:Number.isFinite(score)?score:null,provider:response.headers.get('x-rbc-provider')||'private-service',revision:response.headers.get('x-rbc-model-revision')||'unknown',jobId:response.headers.get('x-rbc-job-id')||''}};
    }catch(error){
      lastError=error;
      if(controller.signal.aborted||attempt>=retries||error.retryable===false)throw error;
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  throw lastError;
}

export async function makePinterestPin(sourceBlob,{title='Rare Bag Archive',subtitle='Curated by @rarebagclub'}={}){
  const image=await imageSource(sourceBlob);const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1500;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f5f1ec';ctx.fillRect(0,0,1000,1500);
  const area={x:55,y:55,w:890,h:1180};const sw=image.width||image.naturalWidth,sh=image.height||image.naturalHeight;const scale=Math.max(area.w/sw,area.h/sh);const dw=sw*scale,dh=sh*scale;
  ctx.save();ctx.beginPath();ctx.rect(area.x,area.y,area.w,area.h);ctx.clip();ctx.drawImage(image,area.x+(area.w-dw)/2,area.y+(area.h-dh)/2,dw,dh);ctx.restore();
  ctx.strokeStyle='#b4976d';ctx.strokeRect(area.x+.5,area.y+.5,area.w-1,area.h-1);ctx.fillStyle='#272621';ctx.textAlign='center';ctx.font='50px Georgia,serif';ctx.fillText(String(title).slice(0,38),500,1330,850);ctx.fillStyle='#85653c';ctx.font='600 18px Arial,sans-serif';ctx.letterSpacing='3px';ctx.fillText(String(subtitle).toUpperCase(),500,1390,850);
  return canvasBlob(canvas);
}
