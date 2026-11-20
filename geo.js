// Limpieza de direcciones + geocodificación: CartoCiudad (IGN) → OpenStreetMap (Nominatim) → localidad → municipio
const GEO=(()=>{
  const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim();
  const abbr=s=>(s||'').replace(/\bAvda\.?\s*/gi,'Avenida ').replace(/\bCtra\.?\s*/gi,'Carretera ').replace(/\bC\/\s*/gi,'Calle ').replace(/\bPol\.\s*Ind\.?/gi,'Polígono Industrial').replace(/\bn\s*[º°]\s*/gi,'');
  function limpiaAlumno(d){d=d||'';const cp=(d.match(/CP:\s*(\d{5})/)||[])[1]||'',mun=((d.match(/Municipio:\s*(.*?)\s*Localidad:/)||[])[1]||'').trim(),
      loc=((d.match(/Localidad:\s*(.*)$/)||[])[1]||'').trim();
    if(!/CP:/.test(d))return limpiaLibre(d);
    let calle=abbr(d.split(/\s*CP:/)[0]).replace(/\(.*?\)/g,' ').replace(/\s(piso|puerta|bloque|escalera|portal|esc\.?)\b.*$/i,'').replace(/^calle\s+(camino|carretera|avenida|rambla)\b/i,'$1').replace(/-\s*URB\..*?(?=\d)/i,' ').replace(/\s+/g,' ').trim();
    return{calle,cp,mun,loc:/NO DEFINIDA/i.test(loc)||norm(loc)===norm(mun)?'':loc}}
  function limpiaLibre(d,munDef){d=abbr(d||'');const parts=d.split(/\.\s+|\.$/).map(s=>s.trim()).filter(Boolean);
    const cp=(d.match(/\b(\d{5})\b/)||[])[1]||'';
    let calle=(parts[0]||'').replace(/,\s*s\/n\b.*$/i,'').trim();const mm=calle.match(/^(.*?\d+\s?[A-Za-z]?)(?=,|\s|$)/);if(mm)calle=mm[1].trim();
    const loc=parts.slice(1).find(p=>!/^\d{5}$/.test(p)&&!/bajo|oficina|puerta|piso|local|nave|trasera|^\d/i.test(p)&&norm(p)!==norm(munDef)&&!/la palma|fuerteventura|gran canaria/i.test(p))||'';
    return{calle,cp,mun:munDef||'',loc}}
  const limpiaEmpresa=e=>limpiaLibre(e.direccion,e.municipio);
  let seq=0;
  function jsonp(url){return new Promise(res=>{const cb='__cc'+(++seq);const s=document.createElement('script');const t=setTimeout(()=>{fin(null)},15000);
    function fin(v){clearTimeout(t);window[cb]=()=>{};s.remove();res(v)}window[cb]=v=>fin(v);s.onerror=()=>fin(null);s.src=url+'&callback='+cb;document.head.appendChild(s)})}
  async function cartociudad(q){const isNode=typeof document==='undefined';let j;
    const url='https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?q='+encodeURIComponent(q);
    if(isNode){const t=await (await fetch(url)).text();const m=t.match(/^\w+\((.*)\)\s*;?\s*$/s);j=m?JSON.parse(m[1]):null}else j=await jsonp(url);
    return j&&j.lat?j:null}
  let lastN=0;
  async function nominatim(q){const w=1100-(Date.now()-lastN);if(w>0)await new Promise(r=>setTimeout(r,w));lastN=Date.now();
    try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&viewbox=-18.4,29.5,-13.2,27.5&bounded=1&q='+encodeURIComponent(q),typeof document==='undefined'?{headers:{'User-Agent':'fct-sea-test/1.0 (rchatru)'}}:{});const a=await r.json();return a[0]?{lat:+a[0].lat,lng:+a[0].lon}:null}catch{return null}}
  const munOk=(j,mun)=>!mun||norm(j.muni).includes(norm(mun).replace(/^villa de /,''))||norm(mun).includes(norm(j.muni));
  // Devuelve {lat,lng,precision,fuente} o null
  async function geocode(L){const mun=L.mun;
    if(L.calle){const j=await cartociudad(`${L.calle}, ${mun}`);
      if(j&&munOk(j,mun)&&(j.type==='portal'||j.type==='callejero'))return{lat:j.lat,lng:j.lng,precision:j.type==='portal'?'portal':'calle',fuente:'CartoCiudad'};
      const n=await nominatim(`${L.calle}, ${L.loc?L.loc+', ':''}${mun}`);if(n)return{...n,precision:'calle',fuente:'OpenStreetMap'}}
    if(L.loc){const n=await nominatim(`${L.loc}, ${mun}`);if(n)return{...n,precision:'localidad',fuente:'OpenStreetMap'}}
    if(mun){const n=await nominatim(mun+', Canarias');if(n)return{...n,precision:'municipio',fuente:'OpenStreetMap'}}
    return null}
  return{limpiaAlumno,limpiaEmpresa,geocode,norm}})();
if(typeof module!=='undefined')module.exports=GEO;
