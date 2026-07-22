function clean(value){return String(value||'').trim();}
export function escapeHtml(value){return clean(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
export function safeWebUrl(value){try{const url=new URL(clean(value));return url.protocol==='https:'||url.protocol==='http:'?url.href:'';}catch(error){return '';}}
function factsList(facts){
  return [facts.material&&`Material: ${facts.material}`,facts.condition&&`Condition: ${facts.condition}`,facts.auth&&`Authentication: ${facts.auth}`,facts.provenance&&`Record: ${facts.provenance}`].filter(Boolean);
}
const intros={
  education:'An archive note on',aesthetic:'An object study:',era:'An era index entry:',pinterest:'Rare bag reference:'
};

export function satelliteCopy(asset,facts={}){
  const name=clean(facts.publicName||facts.name)||'Archive piece';
  const detail=clean(facts.detail);
  const lines=[`${intros[asset.destination]||'From the archive:'} ${name}.`,...factsList(facts)];
  if(detail)lines.push(detail);
  if(asset.destination==='pinterest')lines.push('Save this reference for your archive research.');
  else lines.push('Explore the full record at @rarebagclub.');
  lines.push('Curated by @rarebagclub');
  return lines.join('\n');
}

export function pinterestDescription(asset,facts={}){
  const name=clean(facts.publicName||facts.name)||'archive bag';
  const terms=[name,facts.material,facts.provenance,'designer bag archive','vintage bag reference'].map(clean).filter(Boolean);
  return `${terms.join(' | ')}. ${clean(facts.detail)||'A visual reference from the Rare Bag Club archive.'} Curated by @rarebagclub.`;
}

export function buildBlogHtml(facts={}){
  const name=escapeHtml(facts.publicName||facts.name||'Archive piece');
  const no=escapeHtml(facts.no||'000');
  const entries=[['Material',facts.material],['Condition',facts.condition],['Authentication',facts.auth],['Provenance',facts.provenance],['Archive detail',facts.detail],['Acquisition',facts.priceDisplay]].filter(([,value])=>clean(value));
  const rows=entries.map(([label,value])=>`<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('\n');
  const url=safeWebUrl(facts.url);
  const cta=url?`<p><a href="${escapeHtml(url)}">View the current archive record</a></p>`:'<p>Contact @rarebagclub for the current archive record.</p>';
  const disclosure=facts.syntheticMedia?'<p><small>AI-assisted mood imagery is disclosed; the photographed product remains the documented archive object.</small></p>':'';
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} | Rare Bag Club Archive</title><meta name="description" content="Archive note ${no}: ${name}."><style>body{max-width:760px;margin:60px auto;padding:0 22px;background:#f5f1ec;color:#272621;font:17px/1.65 Georgia,serif}small,dt{font:11px/1.4 Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#85653c}h1{font-size:54px;line-height:1;margin:.25em 0}dl{display:grid;grid-template-columns:140px 1fr;gap:12px;border-top:1px solid #d8cdbd;padding-top:24px}dd{margin:0}a{color:#85653c}</style></head><body><small>Archive no. ${no} · Rare Bag Club</small><h1>${name}</h1><p>${escapeHtml(facts.detail||'A documented object from the Rare Bag Club archive.')}</p><dl>${rows}</dl>${cta}${disclosure}<p><small>Published by Rare Bag Club. Product details reflect the campaign record at export time.</small></p></body></html>`;
}

export function pinterestCsv(rows=[]){
  const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
  return ['Title,Media filename,Pinterest board,Description,Link',...rows.map(row=>[row.title,row.filename,row.board||'Rare Bag Archive',row.description,row.link||''].map(quote).join(','))].join('\r\n');
}
