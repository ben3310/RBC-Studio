const KEY_STORAGE='rbc-studio-anthropic-key';
const MODEL='claude-sonnet-5';
const BRAND_RULES=`RareBagClub voice is editorial and precise, like a museum catalog meeting a private members club. Use lowercase poetic copy and title case functional labels. No exclamation points, hype, generic luxury adjectives, fake urgency, or invented claims. Say archive, acquire, piece, and collector where natural. Preserve the platform's existing shape.

Conversion doctrine: line one must stop the scroll using curiosity or status tension built from a real fact already in the draft; never open with a catalog note. Keep every scarcity claim literal (one piece, no restock, the sold record stays up) and place it immediately before the call to action. Frame the CTA as first come, first considered. Never invent deadlines, countdowns, demand numbers, or viewer counts.

Audience: US, European, Canadian, Australian, New Zealand and Bruneian vintage collectors. Use the selected spelling convention throughout. Prices are shown with ISO currency codes, except Brunei dollars which are shown as the symbol B$ (e.g. B$4,800); reproduce the price exactly as given, never convert or invent exchange rates, and never state a number for a piece marked price on request.`;

export function getAiKey(){try{return localStorage.getItem(KEY_STORAGE)||'';}catch(error){return '';}}
export function setAiKey(key){try{if(key)localStorage.setItem(KEY_STORAGE,key);else localStorage.removeItem(KEY_STORAGE);return true;}catch(error){return false;}}

export async function polishWithAi({platform,draft,key=getAiKey(),spelling='american'}){
  if(!key)throw new Error('Add an Anthropic API key to use AI polish.');
  const system=BRAND_RULES+'\n\nSelected spelling convention for this draft: '+spelling+'.';
  const response=await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:MODEL,max_tokens:1200,system,messages:[{role:'user',content:`Polish this ${platform} draft. Never add a fact not already present. Never add urgency. Return only the revised copy.\n\n${draft}`}]})
  });
  if(!response.ok){let message='AI polish failed ('+response.status+').';try{const data=await response.json();message=data.error?.message||message;}catch(error){}throw new Error(message);}
  const data=await response.json();return data.content?.filter(item=>item.type==='text').map(item=>item.text).join('\n').trim()||draft;
}
