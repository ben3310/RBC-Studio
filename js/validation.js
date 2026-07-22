import {graphemeLength} from './facts.js';

export const PLATFORM_LIMITS={
  instagram:{limit:2200,label:'Instagram caption',soft:null},
  tiktok:{limit:2200,label:'TikTok caption',soft:300},
  telegram:{limit:1024,label:'Telegram photo caption',soft:null},
  threads:{limit:500,label:'Threads post',soft:null},
  x:{limit:280,label:'X post',soft:null}
};

export function splitPosts(platform,text){
  const source=String(text).trim();
  if(platform==='threads')return source.split(/\n\n(?=[123]\/3\n)/).filter(Boolean);
  if(platform==='x')return source.split(/\n\n(?=[12]\/2\s)/).filter(Boolean);
  if(platform==='tiktok'){
    const match=source.match(/POST CAPTION\n([\s\S]*?)(?=\n\nSHOT LIST|$)/);
    return [match?match[1].trim():source];
  }
  return [source];
}

export function validateOutput(platform,text){
  const config=PLATFORM_LIMITS[platform];const posts=splitPosts(platform,text);
  const counts=posts.map(post=>graphemeLength(post));const worst=Math.max(0,...counts);const worstIndex=counts.indexOf(worst);
  return {platform,posts,counts,worst,worstIndex,limit:config.limit,soft:config.soft,over:worst>config.limit,softOver:!!config.soft&&worst>config.soft};
}
