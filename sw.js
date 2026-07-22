import {APP_VERSION} from './js/version.js';

const APP_CACHE='rbc-studio-app-'+APP_VERSION;
const FONT_CACHE='rbc-studio-fonts-v1';
const APP_SHELL=[
  './','./index.html','./css/studio.css','./manifest.webmanifest','./icon.svg','./apple-touch-icon.png',
  './js/version.js','./js/app.js','./js/canvas.js','./js/state.js','./js/facts.js','./js/images.js','./js/validation.js','./js/zip.js','./js/calendar.js','./js/ai.js',
  './js/factory/core.js','./js/factory/copy.js','./js/factory/media.js','./js/factory/ui.js',
  './js/remote/config.js','./js/remote/client.js','./packages/policy-core/index.js',
  './js/copy/index.js','./js/copy/instagram.js','./js/copy/tiktok.js','./js/copy/telegram.js','./js/copy/threads.js','./js/copy/x.js',
  './js/templates/registry.js','./js/templates/primitives.js','./js/templates/collage.js','./js/templates/maison.js','./js/templates/editorial.js','./js/templates/noir.js','./js/templates/vitrine.js','./js/templates/atelier.js','./js/templates/gazette.js','./js/templates/snapshot.js','./js/templates/specimen.js','./js/templates/poet.js','./js/templates/runway.js','./js/templates/dossier.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(APP_CACHE).then(cache=>cache.addAll(APP_SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rbc-studio-app-')&&key!==APP_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isFont=url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com';
  if(isFont){
    event.respondWith(caches.open(FONT_CACHE).then(async cache=>{
      const cached=await cache.match(event.request);if(cached)return cached;
      const response=await fetch(event.request);if(response.ok||response.type==='opaque')cache.put(event.request,response.clone());return response;
    }));
    return;
  }
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{caches.open(APP_CACHE).then(cache=>cache.put('./index.html',response.clone()));return response;}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(url.origin===self.location.origin){
    // network-first for our own JS/CSS/HTML so template + style edits ship on the
    // next load; fall back to cache only when offline. (cache-first here silently
    // pinned stale templates — every design change looked like it "didn't apply".)
    event.respondWith(fetch(event.request).then(response=>{if(response.ok)caches.open(APP_CACHE).then(cache=>cache.put(event.request,response.clone()));return response;}).catch(()=>caches.match(event.request)));
  }
});
