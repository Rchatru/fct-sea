// Caché básica para que la web abra rápido y se pueda instalar. Los datos siempre vienen de Supabase.
const V='fct-v11';
const ESTATICOS=['app.js','stack.js','vendor/fonts/public-sans-latin-400-normal.woff2','vendor/fonts/public-sans-latin-500-normal.woff2','vendor/fonts/public-sans-latin-600-normal.woff2','vendor/fonts/public-sans-latin-700-normal.woff2','vendor/supabase.js','vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css','geo.js','icons/icon-192.png','icons/icon-512.png','manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(ESTATICOS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(e.request.mode==='navigate'||u.pathname.endsWith('/')||/\/(index\.html|app\.js|stack\.js|geo\.js)$/.test(u.pathname)){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(V).then(x=>x.put(e.request,c));return n})))});
