const encoder=new TextEncoder();

function crcTable(){
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){let value=n;for(let k=0;k<8;k++)value=(value&1)?0xEDB88320^(value>>>1):value>>>1;table[n]=value>>>0;}
  return table;
}
const CRC_TABLE=crcTable();
function crc32(bytes){let crc=0xFFFFFFFF;for(const byte of bytes)crc=CRC_TABLE[(crc^byte)&0xFF]^(crc>>>8);return (crc^0xFFFFFFFF)>>>0;}
function u16(view,offset,value){view.setUint16(offset,value,true);}
function u32(view,offset,value){view.setUint32(offset,value>>>0,true);}
function dosTime(date=new Date()){
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
  const day=((date.getFullYear()-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}
async function bytesOf(value){
  if(value instanceof Uint8Array)return value;
  if(value instanceof Blob)return new Uint8Array(await value.arrayBuffer());
  return encoder.encode(String(value));
}

export async function createZip(entries){
  const locals=[];const centrals=[];let offset=0;const stamp=dosTime();
  for(const entry of entries){
    const name=encoder.encode(entry.name.replace(/\\/g,'/'));const data=await bytesOf(entry.data);const crc=crc32(data);
    const local=new Uint8Array(30+name.length+data.length);const lv=new DataView(local.buffer);
    u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x0800);u16(lv,8,0);u16(lv,10,stamp.time);u16(lv,12,stamp.day);u32(lv,14,crc);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,name.length);u16(lv,28,0);local.set(name,30);local.set(data,30+name.length);locals.push(local);
    const central=new Uint8Array(46+name.length);const cv=new DataView(central.buffer);
    u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u16(cv,10,0);u16(cv,12,stamp.time);u16(cv,14,stamp.day);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u16(cv,30,0);u16(cv,32,0);u16(cv,34,0);u16(cv,36,0);u32(cv,38,0);u32(cv,42,offset);central.set(name,46);centrals.push(central);offset+=local.length;
  }
  const centralOffset=offset;const centralSize=centrals.reduce((sum,item)=>sum+item.length,0);const end=new Uint8Array(22);const ev=new DataView(end.buffer);
  u32(ev,0,0x06054b50);u16(ev,4,0);u16(ev,6,0);u16(ev,8,entries.length);u16(ev,10,entries.length);u32(ev,12,centralSize);u32(ev,16,centralOffset);u16(ev,20,0);
  return new Blob([...locals,...centrals,end],{type:'application/zip'});
}
