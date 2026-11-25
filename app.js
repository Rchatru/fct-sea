
{
const S={gd:{},gdx:{},gdMeta:null,emp:{},alu:{},campos:[],aj:{fechaInicio:'',incluirTramite:true,criterio:'primeras'}};
let db=null,selA=null,res=null;const M={mode:'alumno',sel:null,drag:false,focusE:null};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ESTADOS={realiza:'Hará la FCT',pendiente:'Sin decidir',exencion:'Pedirá exención (experiencia laboral)',aplaza:'Trabajando: aplaza al próximo curso',baja:'Baja por inasistencia',no_apto:'No apto (PRL / rendimiento)',otro:'Otro motivo'};
const TURNO_A={indiferente:'Indiferente',manana:'Mañana',tarde:'Tarde'};
const TURNO_E={'':'Sin indicar',ambos:'Mañana y tarde',manana:'Solo mañana',tarde:'Solo tarde'};
const SEG={'':'Sin contactar este curso',contactada:'Contactada, pendiente de respuesta',confirma:'Confirma plazas',rechaza:'No acepta alumnado este curso'};
const CONC={si:'Vigente',tramite:'En trámite',no:'Sin concierto'};
const COSTS={primeras:[0,1,2,3,4],equilibrado:[0,1,4,9,16]},NOASIG=60,BIG=1e6;
const toast=t=>{const m=$('#msg');m.textContent=t;m.style.display='block';clearTimeout(m._t);m._t=setTimeout(()=>m.style.display='none',2600)};
const fmtD=d=>d?esc(String(d).split('-').reverse().join('/')):'';
const refDate=()=>S.aj.fechaInicio||new Date().toISOString().slice(0,10);
const empName=id=>S.emp[id]?`${S.emp[id].n} · ${S.emp[id].nombre}`:'';
const sortedEmp=()=>Object.entries(S.emp).sort((a,b)=>(a[1].n||999)-(b[1].n||999));
const sortedAlu=()=>Object.entries(S.alu).sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre));

function conc(e){ // estado efectivo del concierto (si GDCAN lo conoce, manda GDCAN)
  const g=gdConc(e),k=g&&concK(g);if(k){if(k==='si'&&g.caducidad&&g.caducidad<refDate())return'cad';return k}
  if(e.concierto==='si'){if(e.caducidad&&e.caducidad<refDate())return'cad';return'si'}
  return e.concierto||'no'}
function concTag(e){const c=conc(e),g=gdConc(e),cad=g?.caducidad||e.caducidad;
  if(c==='si'){const pronto=cad&&diasEntre(hoyISO(),cad)<=90;return`<span class="tag ${pronto?'wa':'ok'}" ${g?'title="Dato de GDCAN"':''}>Vigente${cad?' hasta '+fmtD(cad):''}</span>`}
  if(c==='cad')return`<span class="tag bad">Caducado ${fmtD(cad)}</span>`;
  if(c==='tramite')return'<span class="tag wa">En trámite</span>';return'<span class="tag bad">Sin concierto</span>'}
function cap(e){return e.plazas==null||e.plazas===''?1:+e.plazas}
function motivoNo(a,id){const e=S.emp[id];if(!e)return'empresa borrada';if(e.activa===false)return'desactivada'+(e.motivoInactiva?' ('+e.motivoInactiva+')':'');const c=conc(e);
  if(c==='no')return'sin concierto';if(c==='cad')return'concierto caducado';if(c==='tramite'&&!S.aj.incluirTramite)return'concierto en trámite';
  if(cap(e)<=0)return'0 plazas';
  if(a.turno!=='indiferente'&&e.turno&&e.turno!=='ambos'&&e.turno!==a.turno)return'turno incompatible';return''}

// ---------- guardado ----------
const timers={},chains={};
let pend=0,saveErr=false,stT=null,geoMsg='';function st(){const e=$('#saveSt');if(!e)return;const paint=()=>{const busy=pend>0;e.className='save '+(saveErr?'err':busy||geoMsg?'busy':'ok');e.lastChild.textContent=saveErr?'Error al guardar':geoMsg||(busy?'Guardando…':'Todo guardado');const d=$('#saveDot');if(d){d.className='sdot '+e.className.split(' ')[1];d.title=e.lastChild.textContent}};
  clearTimeout(stT);if(pend>0&&!saveErr&&!geoMsg&&e.className.includes('ok'))stT=setTimeout(paint,700);else paint()}
function track(pr){pend++;st();return pr.then(()=>{saveErr=false},e=>{saveErr=true;toast('No se pudo guardar: '+(e.message||e.code))}).finally(()=>{pend--;st()})}
function save(col,id){if(!db)return;const p=col+'/'+id;clearTimeout(timers[p]);
  timers[p]=setTimeout(()=>{const data=col==='empresas'?S.emp[id]:S.alu[id];if(!data)return;
    const body=JSON.parse(JSON.stringify(data));
    chains[p]=(chains[p]||Promise.resolve()).then(()=>track(db.doc(p).set(body)))},500)}
function saveCfg(name,body){db&&track(db.doc('config/'+name).set(JSON.parse(JSON.stringify(body))))}
async function del(col,id){if(col==='empresas')delete S.emp[id];else delete S.alu[id];render();if(db)await db.doc(col+'/'+id).delete().catch(()=>{})}

// ---------- asignación (método húngaro) ----------
function hungarian(a){const n=a.length,m=a[0].length,u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
  for(let i=1;i<=n;i++){p[0]=i;let j0=0;const minv=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
    do{used[j0]=true;const i0=p[j0];let d=Infinity,j1=0;
      for(let j=1;j<=m;j++)if(!used[j]){const cur=a[i0-1][j-1]-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0}if(minv[j]<d){d=minv[j];j1=j}}
      for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=d;v[j]-=d}else minv[j]-=d;j0=j1}while(p[j0]!==0);
    do{const j1=way[j0];p[j0]=p[j1];j0=j1}while(j0)}
  const r=Array(n).fill(-1);for(let j=1;j<=m;j++)if(p[j])r[p[j]-1]=j-1;return r}
function asignar(){const out={},libre={};
  for(const[id,e]of Object.entries(S.emp))libre[id]=cap(e);
  const act=sortedAlu().filter(([,a])=>a.estado==='realiza');
  for(const[id,a]of act)if(a.fijada&&S.emp[a.fijada]){out[id]={emp:a.fijada,manual:true};libre[a.fijada]--}
  const rest=act.filter(([id])=>!out[id]);const slots=[];
  for(const[id,e]of Object.entries(S.emp))for(let k=0;k<libre[id];k++)slots.push(id);
  if(rest.length){const M=rest.map(([,a],i)=>{const row=slots.map(eid=>{const r=(a.prefs||[]).indexOf(eid);return r<0||motivoNo(a,eid)?BIG:(COSTS[S.aj.criterio]||COSTS.primeras)[r]});
      for(let k=0;k<rest.length;k++)row.push(NOASIG);return row});
    const r=hungarian(M);
    rest.forEach(([id],i)=>{const j=r[i];out[id]=j>=0&&j<slots.length&&M[i][j]<BIG?{emp:slots[j],manual:false}:{emp:'',manual:false}})}
  for(const id in out){const a=S.alu[id];out[id].rank=out[id].emp?(a.prefs||[]).indexOf(out[id].emp):-1}
  return out}

// ---------- render ----------
function render(){res=asignar();renderKpis();renderListA();renderEdA();renderRes();renderEmp();renderSeg()}
function renderKpis(){const al=Object.values(S.alu),act=al.filter(a=>a.estado==='realiza'),r=Object.entries(res);
  const sinPref=act.filter(a=>!(a.prefs||[]).length).length,sin=r.filter(([id,x])=>!x.emp&&(S.alu[id].prefs||[]).length).length,uno=r.filter(([,x])=>x.rank===0).length;
  const disp=demanda().filter(d=>d.fuera.length).length;
  const K=[['c-b',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.2 2.3 3.5 5.2"/></svg>`,act.length+' / '+al.length,'harán la FCT'],['c-g',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1-4.5-4.3 6.1-.8z"/></svg>`,uno,'en su 1ª opción'],[sin?'c-r':'c-g',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>`,sin,'con preferencias y sin plaza'],[sinPref?'c-a':'c-g',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>`,sinPref,'aún sin preferencias'],[disp?'c-p':'c-g',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 21V9l8-5 8 5v12z"/><path d="M12 21v-6"/><path d="M8 11h.01M16 11h.01"/></svg>`,disp,'empresas disputadas']];
  $('#kpis').innerHTML=K.map(([c,ic,b,t])=>`<div class="kpi"><div class="ic ${c}">${ic}</div><div class="t"><b>${b}</b><span>${t}</span></div></div>`).join('');
  const nav=(id,v,cl)=>{const e=$(id);e.textContent=v||'';e.className=v?cl:''};
  nav('#bA',sinPref,'w');nav('#bR',avisos().length,'r');nav('#bE',Object.values(S.emp).filter(e=>e.activa!==false).length,'');
  st()}

function renderListA(){const q=$('#qa').value.toLowerCase();{const b=$('#bDoc');if(b){const n=aluDocs().filter(([,x])=>docPend(x)).length;b.textContent=n||''}}
  $('#listA').innerHTML=sortedAlu().filter(([,a])=>a.nombre.toLowerCase().includes(q)).map(([id,a])=>{
    const np=(a.prefs||[]).length;const t=a.estado!=='realiza'?`<span class="tag ${a.estado==='pendiente'?'wa':'bad'}">${esc({pendiente:'Sin decidir',exencion:'Exención',aplaza:'Aplaza',baja:'Baja',no_apto:'No apto',otro:'Otro'}[a.estado]||a.estado)}</span>`:np?`<span class="tag ok">${np} pref.</span>`:'<span class="tag wa">Sin pref.</span>';
    return`<div class="li${id===selA?' sel':''}" data-a="${id}"><div>${esc(a.nombre)}<br><small>${esc(a.municipio||a.zona)}</small></div>${t}</div>`}).join('')||'<div class="empty">Ningún alumno</div>'}

function empOptions(sel,a){return'<option value="">—</option>'+sortedEmp().map(([id,e])=>{const m=a?motivoNo(a,id):'';
  return`<option value="${id}"${id===sel?' selected':''}>${esc(e.n+' · '+e.nombre)}${m?' ⚠ '+esc(m):''}</option>`}).join('')}

function renderEdA(){const box=$('#edA');if(box.contains(document.activeElement)&&box._id===selA)return;box._id=selA;
  const a=S.alu[selA];if(!a){box.innerHTML='<div class="card empty">Elige un alumno de la lista para ver y editar su ficha y sus preferencias.</div>';return}
  const r=res[selA];
  const info=a.estado!=='realiza'?'No entra en el reparto.':r?.emp?`Asignación actual: <b>${esc(empName(r.emp))}</b> ${r.manual?'(fijada a mano)':r.rank>=0?`(${r.rank+1}ª opción)`:''}`:'Sin empresa en el reparto actual.';
  box.innerHTML=`<button class="ghost backA" id="backA">← Todos los alumnos</button><div class="card"><h2>${esc(a.nombre)}</h2><p class="info">${info}${gdAluHTML(selA)}</p>
  <div class="grid">
  <label>Apellidos, nombre<input data-f="nombre" value="${esc(a.nombre)}"></label>
  <label>Municipio<input data-f="municipio" value="${esc(a.municipio)}"></label>
  <label>Email<input data-f="email" value="${esc(a.email)}"></label>
  <label>Email personal<input data-f="email2" value="${esc(a.email2)}"></label>
  <label>DNI / NIE<input data-f="dni" value="${esc(a.dni||'')}"></label>
  <label>NUS (nº Seguridad Social) ${docTagNus(a)}<input data-f="nus" value="${esc(nusFmt(a.nus))}" inputmode="numeric" placeholder="12 dígitos"></label>
  <div class="dck" style="grid-column:1/-1">${docChecks(selA,a)}</div>
  <label>Teléfono<input data-f="telefono" type="tel" value="${esc(a.telefono||'')}"></label>
  <label>¿Hará la FCT este curso?<select data-f="estado">${Object.entries(ESTADOS).map(([k,v])=>`<option value="${k}"${k===a.estado?' selected':''}>${v}</option>`).join('')}</select></label>
  <label>Motivo / detalle<input data-f="motivo" value="${esc(a.motivo)}"></label>
  <label>Turno preferido<select data-f="turno">${Object.entries(TURNO_A).map(([k,v])=>`<option value="${k}"${k===a.turno?' selected':''}>${v}</option>`).join('')}</select></label>
  </div>
  <h3>Preferencias de empresa (por orden)</h3><div class="prefs">${[0,1,2,3,4].map(i=>{const id=(a.prefs||[])[i]||'';const m=id?motivoNo(a,id):'';
    return`<div class="pref"><b>${i+1}</b><div><select data-p="${i}" aria-label="Preferencia ${i+1}">${empOptions(id,a)}</select>${m?`<p class="note bad">No se puede asignar: ${esc(m)}</p>`:''}</div></div>`}).join('')}</div>
  <h3>Dirección</h3><input data-f="direccion" value="${esc(a.direccion)}" aria-label="Dirección"><div class="geo">${geoTxt(a.geo)}<button class="ghost" data-vermap="a:${selA}">Ver en el mapa</button></div>
  <h3>Notas</h3><textarea data-f="notas" aria-label="Notas">${esc(a.notas)}</textarea>
  <div class="row" style="margin-top:16px"><button class="danger" id="delA">Eliminar alumno</button></div></div>`}

function demanda(){const d={};const act=Object.entries(S.alu).filter(([,a])=>a.estado==='realiza');
  for(const[,a]of act)(a.prefs||[]).forEach((id,i)=>{if(!S.emp[id])return;(d[id]??={id,r:[0,0,0,0,0],pide:0,asig:0}).r[i]++;d[id].pide++});
  for(const x of Object.values(res||{}))if(x.emp){(d[x.emp]??={id:x.emp,r:[0,0,0,0,0],pide:0,asig:0}).asig++}
  for(const x of Object.values(d))x.fuera=[];
  for(const[id,a]of act){const r=(res||{})[id];if(!r||r.manual)continue;const lim=r.emp&&r.rank>=0?r.rank:(a.prefs||[]).length;
    (a.prefs||[]).slice(0,lim).forEach(eid=>{if(d[eid]&&!motivoNo(a,eid))d[eid].fuera.push(a.nombre)})}
  return Object.values(d).map(x=>({...x,cap:cap(S.emp[x.id]),e:S.emp[x.id]})).sort((a,b)=>b.fuera.length-a.fuera.length||b.pide-a.pide)}

function avisos(){const rows=sortedAlu().filter(([,a])=>a.estado==='realiza'),dm=demanda();const av=[];for(const[id,a]of rows){(a.prefs||[]).forEach((eid,i)=>{const m=motivoNo(a,eid);if(m)av.push(`<b>${esc(a.nombre)}</b>: su ${i+1}ª opción (${esc(empName(eid))}) no es asignable — ${m}.`)});
    if(a.fijada&&res[id]&&S.emp[a.fijada]){const m=motivoNo(a,a.fijada);if(m)av.push(`<b>${esc(a.nombre)}</b> está fijado en ${esc(empName(a.fijada))}, que tiene: ${m}.`)}}
  for(const d of dm)if(d.asig>d.cap)av.push(`<b>${esc(d.e.nombre)}</b> tiene ${d.asig} alumnos fijados y ${d.cap} plaza(s).`);
  return av}
function renderRes(){const rows=sortedAlu().filter(([,a])=>a.estado==='realiza');
  $('#tRes').innerHTML='<thead><tr><th>Alumno</th><th>Empresa</th><th>Opción</th><th>Ajuste manual</th></tr></thead><tbody>'+rows.map(([id,a])=>{const r=res[id]||{};
    const op=!r.emp?(a.prefs?.length?'<span class="tag bad">Sin plaza</span>':'<span class="tag wa">Sin preferencias</span>'):r.rank<0?'<span class="tag wa">Fuera de sus opciones</span>':`<span class="tag${r.rank===0?' ok':''}">${r.rank+1}ª</span>`;
    return`<tr><td>${esc(a.nombre)}</td><td>${r.emp?esc(empName(r.emp)):'—'}</td><td>${op}</td><td><select data-fix="${id}" aria-label="Fijar empresa"><option value="">Automático</option>${sortedEmp().map(([eid,e])=>`<option value="${eid}"${eid===a.fijada?' selected':''}>Fijar en ${esc(e.n+' · '+e.nombre)}</option>`).join('')}</select></td></tr>`}).join('')+'</tbody>';
  $('#mRes').innerHTML=rows.map(([id,a])=>{const r=res[id]||{};const op=!r.emp?(a.prefs?.length?'<span class="tag bad">Sin plaza</span>':'<span class="tag wa">Sin pref.</span>'):r.rank<0?'<span class="tag wa">Manual</span>':`<span class="tag${r.rank===0?' ok':''}">${r.rank+1}ª</span>`;
    return`<div class="mi"><div class="mi-t"><b>${esc(a.nombre)}</b>${op}</div><div class="mi-s"><span style="flex:1;min-width:0">${r.emp?esc(S.emp[r.emp]?.nombre||''):'—'}</span><select data-fix="${id}" class="mi-sel" aria-label="Fijar empresa"><option value="">${a.fijada?'Quitar fijado':'Auto'}</option>${sortedEmp().map(([eid,e])=>`<option value="${eid}"${eid===a.fijada?' selected':''}>Fijar en ${esc(e.n+' · '+e.nombre)}</option>`).join('')}</select></div></div>`}).join('');
  const dm=demanda();const col=['#0f7b0f','#6ccb5f','#f7c948','#f08a4b','#c42b1c'];
  const sitT=d=>d.asig>d.cap?'<span class="tag bad">Sobrecupo</span>':d.fuera.length?`<span class="tag wa">Disputada</span>`:motivoNo({turno:'indiferente'},d.id)?'<span class="tag bad">No asignable</span>':'<span class="tag ok">Sin conflicto</span>';
  $('#mDem').innerHTML=dm.map(d=>`<div class="mi click" data-e="${d.id}"><div class="mi-t"><b>${esc(d.e.n+' · '+d.e.nombre)}</b>${sitT(d)}</div><div class="mi-s"><div class="bars" style="width:70px">${d.r.map((c,i)=>`<i style="width:${d.pide?c/d.pide*100:0}%;background:${col[i]}"></i>`).join('')}</div> Piden ${d.pide} · asignados ${d.asig} · plazas ${d.e.plazas==null||d.e.plazas===''?'¿1?':d.cap}</div>${d.fuera.length?`<div class="mi-s">Se queda${d.fuera.length>1?'n':''} fuera: ${esc(d.fuera.map(n=>{const[ap,no]=n.split(',');return (no||'').trim().split(' ')[0]+' '+(ap||'').trim().split(' ')[0]}).join(', '))}</div>`:''}</div>`).join('')||'<p class="note">Aún no hay preferencias.</p>';
  $('#tDem').innerHTML=dm.length?'<thead><tr><th>Empresa</th><th>Concierto</th><th class="n">Plazas</th><th class="n">Le piden</th><th>1ª · 2ª · 3ª · 4ª · 5ª</th><th class="n">Asignados</th><th>Situación</th></tr></thead><tbody>'+dm.map(d=>`<tr class="click" data-e="${d.id}"><td>${esc(d.e.n+' · '+d.e.nombre)}</td><td>${concTag(d.e)}</td><td class="n">${d.e.plazas==null||d.e.plazas===''?'1 <small>(sin confirmar)</small>':d.cap}</td><td class="n">${d.pide}</td><td><div class="row" style="gap:6px"><div class="bars">${d.r.map((c,i)=>`<i style="width:${d.pide?c/d.pide*100:0}%;background:${col[i]}"></i>`).join('')}</div><small>${d.r.join(' · ')}</small></div></td><td class="n">${d.asig}</td><td>${d.asig>d.cap?'<span class="tag bad">Sobrecupo</span>':d.fuera.length?`<span class="tag wa" title="${esc(d.fuera.join(', '))}">Disputada · ${d.fuera.length} se queda${d.fuera.length>1?'n':''} fuera</span>`:motivoNo({turno:'indiferente'},d.id)?'<span class="tag bad">No asignable</span>':'<span class="tag ok">Sin conflicto</span>'}</td></tr>`).join('')+'</tbody>':'<tbody><tr><td class="empty">Aún no hay preferencias.</td></tr></tbody>';
  const av=avisos();
  {const G={};for(const[id,a]of rows){const L=[];(a.prefs||[]).forEach((eid,i)=>{const m=motivoNo(a,eid);if(m)L.push(`<b>${i+1}ª</b> ${esc(S.emp[eid]?.nombre||'?')} <span class="why">${esc(m)}</span>`)});
      if(a.fijada&&S.emp[a.fijada]){const m=motivoNo(a,a.fijada);if(m)L.push(`Fijado en ${esc(S.emp[a.fijada].nombre)} <span class="why">${esc(m)}</span>`)}if(L.length)G[id]=L}
    const ex=dm.filter(d=>d.asig>d.cap).map(d=>`<div class="mi"><div class="mi-t"><b>${esc(d.e.nombre)}</b><span class="tag bad">Sobrecupo</span></div><div class="mi-s">${d.asig} alumnos fijados y ${d.cap} plaza(s)</div></div>`).join('');
    $('#avisos').innerHTML=Object.keys(G).length||ex?`<p class="note" style="margin:-4px 0 10px">Opciones que el reparto no puede usar. No es grave si el alumno tiene otras válidas.</p><div class="avgrid">${ex}${Object.entries(G).map(([id,L])=>`<div class="mi"><div class="mi-t"><b>${esc(S.alu[id].nombre)}</b><span class="tag ${res[id]?.emp?'':'bad'}">${res[id]?.emp?L.length+' no válida'+(L.length>1?'s':''):'sin plaza'}</span></div><ul class="avl">${L.map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>`:'<p class="note">Sin avisos.</p>'}
  $('#fIni').value=S.aj.fechaInicio||'';$('#incT').checked=!!S.aj.incluirTramite;$('#crit').value=S.aj.criterio||'primeras'}

function renderEmp(){const q=$('#qe').value.toLowerCase(),f=$('#fe').value;const dm={};for(const d of demanda())dm[d.id]=d;
  const rows=sortedEmp().filter(([,e])=>(!f||(f==='act'?e.activa!==false:f==='inact'?e.activa===false:conc(e)===f))&&JSON.stringify([e.nombre,e.municipio,e.contactos]).toLowerCase().includes(q));
  {const n=gdConcSinLista().length,b=$('#gdcBan');if(b){b.hidden=!S.gdx.conciertos;b.innerHTML=S.gdx.conciertos?`Estados de concierto leídos de GDCAN.${n?` Hay <b>${n}</b> concierto(s) vigentes del centro que no están en tu lista. <button class="linkb" id="concGd">Ver y añadir</button>`:''}`:''}}
  $('#mEmp').innerHTML=rows.map(([id,e])=>{const c=(e.contactos||[])[0]||{};return`<div class="mi click${e.activa===false?' off':''}" data-e="${id}"><div class="mi-t"><label class="sw" title="Activa"><input type="checkbox" data-act="${id}"${e.activa===false?'':' checked'} aria-label="Activa"><i></i></label><b style="flex:1">${esc(e.n+' · '+e.nombre)}</b>${dm[id]?.pide?`<span class="tag">${dm[id].pide} pide${dm[id].pide>1?'n':''}</span>`:''}</div>
    <div class="mi-s">${concTag(e)} ${e.seguimiento?`<span class="tag ${e.seguimiento==='confirma'?'ok':e.seguimiento==='rechaza'?'bad':''}">${esc(SEG[e.seguimiento].split(',')[0])}</span>`:''} ${esc(e.municipio||'')}${e.plazas!=null&&e.plazas!==''?' · '+esc(e.plazas)+' plaza(s)':''}</div></div>`}).join('')||'<p class="note">Ninguna empresa.</p>';
  $('#tEmp').innerHTML='<thead><tr><th>Activa</th><th class="n">Nº</th><th>Empresa</th><th>Municipio</th><th>Concierto</th><th class="n">Plazas</th><th>Turno</th><th>Contacto</th><th class="n">Le piden</th></tr></thead><tbody>'+rows.map(([id,e])=>{const c=(e.contactos||[])[0]||{};
    return`<tr class="click${e.activa===false?' off':''}" data-e="${id}"><td><label class="sw" title="Activar o desactivar para este curso"><input type="checkbox" data-act="${id}"${e.activa===false?'':' checked'} aria-label="Activa"><i></i></label></td><td class="n">${esc(e.n)}</td><td>${esc(e.nombre)}${e.activa===false&&e.motivoInactiva?`<br><small class="note">${esc(e.motivoInactiva)}</small>`:''}</td><td>${esc(e.municipio)}</td><td>${concTag(e)}${e.seguimiento?`<br><span class="tag ${e.seguimiento==='confirma'?'ok':e.seguimiento==='rechaza'?'bad':''}" style="margin-top:4px;display:inline-block">${esc(SEG[e.seguimiento].split(',')[0])}</span>`:''}</td><td class="n">${e.plazas==null||e.plazas===''?'<small class="note">—</small>':esc(e.plazas)}</td><td class="nw">${e.turno?esc(TURNO_E[e.turno]):'<small class="note">—</small>'}</td><td>${esc([c.nombre,c.telefono].filter(Boolean).join(' · '))}${(e.contactos||[]).length>1?` <small>+${e.contactos.length-1}</small>`:''}</td><td class="n">${dm[id]?.pide||''}</td></tr>`}).join('')+'</tbody>'}

// ---------- ficha de empresa (ventana) ----------
let selE=null;
function openE(id){selE=id;const e=S.emp[id];if(!e)return;setTimeout(()=>kmCentro(id),0);
  const f=(k,l,t='text')=>`<label>${l}<input type="${t}" data-ef="${k}" value="${esc(e[k]??'')}"></label>`;
  $('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(e.nombre||'Nueva empresa')}</h2><button class="sec" id="closeOv">Cerrar</button></div>
  <div class="grid" style="margin-top:16px">${f('n','Nº','number')}${f('nombre','Nombre completo')}${f('nif','NIF')}${f('telefono','Teléfono general')}${f('municipio','Municipio')}${f('direccion','Dirección fiscal')}
  <label>Concierto<select data-ef="concierto">${Object.entries(CONC).map(([k,v])=>`<option value="${k}"${k===e.concierto?' selected':''}>${v}</option>`).join('')}</select></label>
  <label>Disponible este curso<select data-ef="activa"><option value="1"${e.activa!==false?' selected':''}>Sí, activa</option><option value="0"${e.activa===false?' selected':''}>No, desactivada</option></select></label>${f('motivoInactiva','Motivo si está desactivada')}${f('caducidad','Caduca el','date')}${f('plazas','Nº de alumnos que admite','number')}
  <label>Turnos que ofrece<select data-ef="turno">${Object.entries(TURNO_E).map(([k,v])=>`<option value="${k}"${k===(e.turno||'')?' selected':''}>${v}</option>`).join('')}</select></label>
  ${S.campos.map(c=>`<label>${esc(c.label)}<input data-ex="${esc(c.id)}" value="${esc(e.extra?.[c.id]??'')}"></label>`).join('')}</div>
  ${gdConcHTML(e)}
  <div class="geo">${geoTxt(e.geo)}<button class="ghost" data-vermap="e:${id}">Ver en el mapa</button><span id="kmC">${kmTxt(e)}</span></div>
  <label style="margin-top:12px">Seguimiento con la empresa<select data-ef="seguimiento">${Object.entries(SEG).map(([k,v])=>`<option value="${k}"${k===(e.seguimiento||'')?' selected':''}>${v}</option>`).join('')}</select></label>
  ${(()=>{const pid=sortedAlu().filter(([,a])=>a.estado==='realiza'&&(a.prefs||[]).includes(id));const asg=sortedAlu().filter(([aid])=>res[aid]?.emp===id);
    return `<h3>Alumnado</h3><p class="note">Asignados: ${asg.length?asg.map(([,a])=>esc(a.nombre)).join(' · '):'ninguno'}</p><div class="mini" style="margin-top:8px">${pid.map(([,a])=>`<span class="tag">${a.prefs.indexOf(id)+1}ª · ${esc(a.nombre)}</span>`).join('')||'<span class="note">Ningún alumno la ha pedido.</span>'}</div>`})()}
  <label style="margin-top:16px">Observaciones<textarea data-ef="observaciones">${esc(e.observaciones)}</textarea></label>
  <h3>Personas de contacto y tutores de empresa</h3><div id="cts">${(e.contactos||[]).map((c,i)=>`<div class="contact">${['nombre','rol','telefono','email'].map(k=>`<label>${{nombre:'Nombre',rol:'Cargo / rol (p. ej. tutor)',telefono:'Teléfono',email:'Email'}[k]}<input data-c="${i}" data-ck="${k}" value="${esc(c[k])}"></label>`).join('')}<div style="align-self:end"><button class="sec" data-cdel="${i}">Quitar</button></div></div>`).join('')}</div>
  <div class="row" style="margin-top:8px"><button class="sec" id="addC">+ Contacto</button><span style="flex:1"></span><button class="danger" id="delE">Eliminar empresa</button></div>`;
  $('#ov').classList.add('on')}
function openMsg(title,html,ok){$('#ovc').innerHTML=`<h2>${title}</h2>${html}<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="sec" id="closeOv">Cancelar</button><button id="okOv">Restaurar</button></div>`;$('#ov').classList.add('on');$('#okOv').onclick=()=>{$('#ov').classList.remove('on');ok()}}
function closeE(){$('#ov').classList.remove('on');selE=null;selSeg=null;msgCtx=null;render()}

function openCampos(){$('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Campos personalizados</h2><button class="sec" id="closeOv">Cerrar</button></div>
  <p class="note">Campos extra que aparecerán en la ficha de todas las empresas (p. ej. «Horario», «Web», «Persona que firma el concierto»).</p>
  <div style="margin-top:12px">${S.campos.map((c,i)=>`<div class="row" style="margin-bottom:8px"><input data-cf="${i}" value="${esc(c.label)}" style="flex:1" aria-label="Nombre del campo"><button class="danger" data-cfdel="${i}">Borrar</button></div>`).join('')}</div>
  <div class="row"><input id="newCampo" placeholder="Nombre del nuevo campo" style="flex:1"><button id="addCampo">Añadir</button></div>`;$('#ov').classList.add('on')}

// ---------- eventos ----------
document.addEventListener('input',ev=>{const t=ev.target;
  if(t.id==='qa')return renderListA();if(t.id==='qe')return renderEmp();
  if(t.dataset.f&&S.alu[selA]){S.alu[selA][t.dataset.f]=t.dataset.f==='nus'?t.value.replace(/\D/g,''):t.value;if(t.dataset.f==='nus'){$('#edA')._id=null;setTimeout(render,0)}if(t.dataset.f==='direccion'||t.dataset.f==='municipio')S.alu[selA].geo=null;save('alumnos',selA);if(t.dataset.f==='nombre')renderListA()}
  if(selE&&S.emp[selE]){const e=S.emp[selE];
    if(t.dataset.ef){let v=t.value;if(t.dataset.ef==='activa')v=v==='1';if(t.dataset.ef==='plazas')v=v===''?null:+v;if(t.dataset.ef==='n')v=+v;e[t.dataset.ef]=v;if(t.dataset.ef==='direccion'||t.dataset.ef==='municipio')e.geo=null;save('empresas',selE)}
    if(t.dataset.ex){(e.extra??={})[t.dataset.ex]=t.value;save('empresas',selE)}
    if(t.dataset.c){e.contactos[+t.dataset.c][t.dataset.ck]=t.value;save('empresas',selE)}}
  if(t.dataset.cf){S.campos[+t.dataset.cf].label=t.value;clearTimeout(t._t);t._t=setTimeout(()=>saveCfg('campos',{lista:S.campos}),600)}});
document.addEventListener('change',async ev=>{const t=ev.target,a=S.alu[selA];
  if(t.dataset.f&&a&&t.tagName==='SELECT'){t.blur();$('#edA')._id=null;render()}
  if(t.dataset.p&&a){const p=[...(a.prefs||[])];while(p.length<5)p.push('');p[+t.dataset.p]=t.value;
    const seen=new Set();a.prefs=p.filter(x=>x&&!seen.has(x)&&seen.add(x));save('alumnos',selA);$('#edA')._id=null;document.activeElement.blur();render()}
  if(t.dataset.fix){S.alu[t.dataset.fix].fijada=t.value;save('alumnos',t.dataset.fix);render()}
  if(t.id==='fIni'){S.aj.fechaInicio=t.value;saveCfg('ajustes',S.aj);render()}
  if(t.id==='crit'){S.aj.criterio=t.value;saveCfg('ajustes',S.aj);render()}
  if(t.id==='incT'){S.aj.incluirTramite=t.checked;saveCfg('ajustes',S.aj);render()}
  if(t.id==='restFile'&&t.files[0]){let d;try{d=JSON.parse(await t.files[0].text())}catch{toast('Archivo no válido');return}t.value='';
    if(!d.empresas||!d.alumnos){toast('No parece una copia de esta app');return}
    const nE=Object.keys(d.empresas).length,nA=Object.keys(d.alumnos).length,faltan=[...Object.keys(d.empresas).filter(k=>!S.emp[k]),...Object.keys(d.alumnos).filter(k=>!S.alu[k])].length;
    $('#ovc').innerHTML=`<h2>Importar copia</h2><p>La copia es del ${esc((d.fecha||'').slice(0,10).split('-').reverse().join('/'))} y tiene ${nE} empresas y ${nA} alumnos. Ahora mismo faltan <b>${faltan}</b> de esos registros en la base de datos.</p>
      <p class="note"><b>Añadir solo lo que falta</b> no toca nada de lo que ya tienes. <b>Sobrescribir todo</b> deja los datos exactamente como en la copia (perderías los cambios hechos después).</p>
      <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px"><button class="sec" id="closeOv">Cancelar</button><button class="sec" id="impAll">Sobrescribir todo</button><button id="impNew">Añadir solo lo que falta</button></div>`;$('#ov').classList.add('on');
    const run=async solo=>{$('#ov').classList.remove('on');
      const rows=[...Object.entries(d.empresas).map(([id,v])=>({col:'empresas',id,data:v})),...Object.entries(d.alumnos).map(([id,v])=>({col:'alumnos',id,data:v})),{col:'config',id:'campos',data:{lista:d.campos||[]}},...(d.ajustes?[{col:'config',id:'ajustes',data:{...S.aj,...d.ajustes}}]:[])];
      toast('Importando…');try{await track(SB.from('docs').upsert(rows,{onConflict:'col,id',ignoreDuplicates:solo}).then(chk))}catch{return}
      toast(solo?'Añadidos los registros que faltaban':'Copia restaurada');await cargar();ubicar()};
    $('#impNew').onclick=()=>run(true);$('#impAll').onclick=()=>run(false);return}
  if(t.id==='fe')renderEmp();
  if(t.dataset.act){S.emp[t.dataset.act].activa=t.checked;save('empresas',t.dataset.act);render()}
  if(selE&&['concierto','turno','activa','seguimiento','plazas'].includes(t.dataset.ef))renderKpis()});
document.addEventListener('click',async ev=>{const t=ev.target.closest('[data-a],[data-e],button');if(!t)return;
  if(t.dataset.vermap){const[k,id]=t.dataset.vermap.split(':');$('#ov').classList.remove('on');selE=null;if(k==='a'){M.mode='alumno';M.sel=id}else{M.focusE=id}goHash('#mapa');return}
  if(t.dataset.a){selA=t.dataset.a;renderListA();$('#edA')._id=null;renderEdA();abrirDet();scrollTo(0,0);return}
  if(t.id==='backA'){cerrarDet();return}
  if(t.dataset.e&&t.tagName!=='BUTTON'){if(ev.target.closest('.sw'))return;openE(t.dataset.e);return}
  if(t.id==='closeOv')return closeE();
  if(t.id==='addA'){const id='a'+Date.now().toString(36);S.alu[id]={nombre:'NUEVO ALUMNO',zona:'',municipio:'',email:'',email2:'',direccion:'',estado:'realiza',motivo:'',turno:'indiferente',prefs:[],fijada:'',notas:''};selA=id;save('alumnos',id);$('#edA')._id=null;render();return}
  if(t.id==='delA'){if(t.dataset.ok){del('alumnos',selA);selA=null;cerrarDet()}else{t.dataset.ok=1;t.textContent='Pulsa otra vez para confirmar'}return}
  if(t.id==='addE'){const id='e'+Date.now().toString(36);const n=Math.max(0,...Object.values(S.emp).map(e=>+e.n||0))+1;
    S.emp[id]={n,nombre:'',telefono:'',nif:'',direccion:'',municipio:'',concierto:'tramite',caducidad:'',plazas:null,turno:'',observaciones:'',contactos:[],extra:{}};save('empresas',id);openE(id);return}
  if(t.id==='delE'){if(t.dataset.ok){const id=selE;$('#ov').classList.remove('on');selE=null;del('empresas',id)}else{t.dataset.ok=1;t.textContent='Pulsa otra vez para confirmar'}return}
  if(t.id==='addC'){(S.emp[selE].contactos??=[]).push({nombre:'',rol:'',telefono:'',email:''});save('empresas',selE);openE(selE);return}
  if(t.dataset.cdel){S.emp[selE].contactos.splice(+t.dataset.cdel,1);save('empresas',selE);openE(selE);return}
  if(t.id==='freeze'||t.id==='unfreeze'){if(!t.dataset.ok){t.dataset.ok=1;const o=t.textContent;t.textContent='Pulsa otra vez para confirmar';setTimeout(()=>{t.textContent=o;delete t.dataset.ok},4000);return}
    let n=0;for(const[id,a]of Object.entries(S.alu)){const v=t.id==='freeze'?(a.estado==='realiza'&&res[id]?.emp)||a.fijada:'';if(v!==a.fijada){a.fijada=v;save('alumnos',id);n++}}
    delete t.dataset.ok;render();toast(t.id==='freeze'?n+' alumnos fijados':'Fijados quitados');return}
  if(t.id==='restore'){$('#restFile').click();return}
  if(t.id==='campos')return openCampos();
  if(t.id==='backup'){bajar('FCT_1SEA_copia_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({fecha:new Date().toISOString(),empresas:S.emp,alumnos:S.alu,campos:S.campos,ajustes:S.aj},null,1),'application/json');toast('Copia descargada');return}
  if(t.id==='addCampo'){const v=$('#newCampo').value.trim();if(!v)return;S.campos.push({id:'c'+Date.now().toString(36),label:v});saveCfg('campos',{lista:S.campos});openCampos();return}
  if(t.dataset.cfdel){S.campos.splice(+t.dataset.cfdel,1);saveCfg('campos',{lista:S.campos});openCampos();return}
  if(t.id==='expCsv'||t.id==='cpy'){const sep=t.id==='cpy'?'\t':';';const q=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return sep===';'&&/[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v.replace(/\t|\n/g,' ')};
    const L=[['Alumno','Estado','Empresa','Opción','Turno alumno','Contacto empresa','Teléfono','Email contacto']];
    for(const[id,a]of sortedAlu()){const r=res[id]||{},e=S.emp[r.emp],c=e?.contactos?.[0]||{};
      L.push([a.nombre,ESTADOS[a.estado]+(a.motivo?' — '+a.motivo:''),e?e.nombre:'',r.emp?(r.manual&&r.rank<0?'manual':r.rank+1+'ª'):'',TURNO_A[a.turno],c.nombre,c.telefono||e?.telefono,c.email])}
    const txt=L.map(r=>r.map(q).join(sep)).join('\r\n');
    if(t.id==='cpy'){try{await navigator.clipboard.writeText(txt);toast('Copiado: pégalo en Excel')}catch{toast('No se pudo copiar')}return}
    bajar('reparto_FCT_1SEA.csv','\ufeff'+txt,'text/csv;charset=utf-8')}});
$('#ov').addEventListener('click',ev=>{if(ev.target.id==='ov')closeE()});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&$('#ov').classList.contains('on'))closeE()});

function route(){const h=(location.hash||'#alumnos').slice(1);const v=['alumnos','asignacion','empresas','seguimiento','visitas','mapa'].includes(h)?h:'alumnos';$('#kpis').style.display=v==='mapa'||v==='seguimiento'||v==='visitas'?'none':'';
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+v));$('#ptitle').textContent={alumnos:'Alumnos',asignacion:'Asignación',empresas:'Empresas',seguimiento:'Seguimiento',visitas:'Visitas',mapa:'Mapa'}[v];$('#psub').textContent={visitas:'Planifica las visitas a empresas en el menor número de días.',alumnos:'Ficha de cada alumno: si hace la FCT, turno y sus preferencias de empresa.',asignacion:'Reparto automático según las preferencias, con ajustes manuales.',empresas:'Base de datos de empresas colaboradoras, conciertos y contactos.',seguimiento:'Horas, diarios, cuestionarios y contactos con las empresas durante las prácticas.',mapa:'Dónde vive cada alumno y dónde están las empresas que ha pedido.'}[v];if(v==='mapa')setTimeout(abrirMapa,30)}
addEventListener('hashchange',route);route();

// ---------- utilidades ----------
function bajar(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function geoTxt(g){if(!g||!g.lat)return'<span>Sin ubicar en el mapa</span>';const P={portal:'portal exacto',calle:'calle',localidad:'barrio / localidad',municipio:'solo municipio (aprox.)',manual:'colocada a mano'};return`<span>Ubicación: ${esc(P[g.precision]||g.precision)}</span>`}

// ---------- Supabase ----------
const SB=supabase.createClient('https://gadcmpcfxwlroanjefxu.supabase.co','sb_publishable_PWKVfC18nVT8B2Vu2AZzzw_bm91RXc4',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const chk=r=>{if(r.error)throw r.error;return r};
db={doc:p=>{const[col,id]=p.split('/');return{set:d=>SB.from('docs').upsert({col,id,data:d}).then(chk),delete:()=>SB.from('docs').delete().eq('col',col).eq('id',id).then(chk)}}};
const BRAND=$('.brand').outerHTML;
function authView(v,msg=''){const b=$('#authbox');$('#auth').classList.add('on');const m=msg?`<p class="${msg.startsWith('✓')?'ok':'err'}">${esc(msg.replace(/^✓\s*/,''))}</p>`:'';
  const F={
  login:`<h2>Iniciar sesión</h2><form data-auth="login"><label>Email<input type="email" name="email" autocomplete="username" required></label><label>Contraseña<input type="password" name="pass" autocomplete="current-password" required></label>${m}<button type="submit">Entrar</button></form>
    <div class="row" style="justify-content:space-between;margin-top:14px"><button class="linkb" data-av="signup">Crear cuenta</button><button class="linkb" data-av="forgot">¿Has olvidado la contraseña?</button></div>`,
  signup:`<h2>Crear cuenta</h2><p class="note">Solo funcionará con el email autorizado en la base de datos.</p><form data-auth="signup"><label>Email<input type="email" name="email" autocomplete="username" required></label><label>Contraseña (mín. 10 caracteres)<input type="password" name="pass" minlength="10" autocomplete="new-password" required></label><label>Repite la contraseña<input type="password" name="pass2" minlength="10" autocomplete="new-password" required></label>${m}<button type="submit">Crear cuenta</button></form><p style="margin-top:14px"><button class="linkb" data-av="login">Volver a iniciar sesión</button></p>`,
  forgot:`<h2>Recuperar contraseña</h2><form data-auth="forgot"><label>Email<input type="email" name="email" required></label>${m}<button type="submit">Enviar enlace</button></form><p style="margin-top:14px"><button class="linkb" data-av="login">Volver</button></p>`,
  newpass:`<h2>Nueva contraseña</h2><form data-auth="newpass"><label>Nueva contraseña (mín. 10 caracteres)<input type="password" name="pass" minlength="10" autocomplete="new-password" required></label>${m}<button type="submit">Guardar</button></form>`,
  mfa:`<h2>Verificación en dos pasos</h2><p class="note">Escribe el código de 6 cifras de tu app de autenticación.</p><form data-auth="mfa"><label>Código<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>${m}<button type="submit">Verificar</button></form><p style="margin-top:14px"><button class="linkb" data-av="out">Cerrar sesión</button></p>`,
  denied:`<h2>Sin acceso</h2><p>Has iniciado sesión, pero esta cuenta no está autorizada para ver los datos.</p><p style="margin-top:14px"><button class="linkb" data-av="out">Cerrar sesión</button></p>`,
  cargando:`<p class="note">Comprobando sesión…</p>`};
  b.innerHTML=BRAND+F[v];b.querySelector('input')?.focus()}
async function boot(){authView('cargando');
  const{data:{session}}=await SB.auth.getSession();if(!session)return authView('login');
  const{data:aal}=await SB.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aal&&aal.nextLevel==='aal2'&&aal.currentLevel!=='aal2')return authView('mfa');
  const ok=await SB.rpc('es_permitido');if(!ok.data)return authView('denied');
  $('#auth').classList.remove('on');$('#uMail').textContent=session.user.email;await cargar()}
SB.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY')setTimeout(()=>authView('newpass'),0)});
document.addEventListener('submit',async ev=>{const f=ev.target.closest('[data-auth]');if(!f)return;ev.preventDefault();const d=Object.fromEntries(new FormData(f));const btn=f.querySelector('button[type=submit]');btn.disabled=true;
  const redir=location.origin+location.pathname;
  try{switch(f.dataset.auth){
    case'login':{const r=await SB.auth.signInWithPassword({email:d.email,password:d.pass});if(r.error)throw r.error;await boot();break}
    case'signup':{if(d.pass!==d.pass2)throw new Error('Las contraseñas no coinciden');const r=await SB.auth.signUp({email:d.email,password:d.pass,options:{emailRedirectTo:redir}});if(r.error)throw r.error;authView('login','✓ Te hemos enviado un email para confirmar la cuenta. Ábrelo y después inicia sesión.');break}
    case'forgot':{const r=await SB.auth.resetPasswordForEmail(d.email,{redirectTo:redir});if(r.error)throw r.error;authView('login','✓ Si el email existe, te llegará un enlace para cambiar la contraseña.');break}
    case'newpass':{const r=await SB.auth.updateUser({password:d.pass});if(r.error)throw r.error;history.replaceState(null,'',redir);await boot();toast('Contraseña cambiada');break}
    case'mfa':{const{data:fs}=await SB.auth.mfa.listFactors();const fa=(fs?.totp||[]).find(x=>x.status==='verified');const r=await SB.auth.mfa.challengeAndVerify({factorId:fa.id,code:d.code.trim()});if(r.error)throw r.error;await boot();break}}}
  catch(e){const T={'Invalid login credentials':'Email o contraseña incorrectos','Email not confirmed':'Aún no has confirmado el email: revisa tu bandeja de entrada'};authView(f.dataset.auth,T[e.message]||e.message||String(e))}});
document.addEventListener('click',async ev=>{const t=ev.target.closest('[data-av],#logout,#secBtn,[data-mfa]');if(!t)return;
  if(t.dataset.av==='out'||t.id==='logout'){await SB.auth.signOut();S.emp={};S.alu={};authView('login');return}
  if(t.dataset.av)return authView(t.dataset.av);
  if(t.id==='secBtn')return seguridad();
  if(t.dataset.mfa==='on'){const{data:fs}=await SB.auth.mfa.listFactors();for(const x of(fs?.all||[]))if(x.status!=='verified')await SB.auth.mfa.unenroll({factorId:x.id});
    const r=await SB.auth.mfa.enroll({factorType:'totp',friendlyName:'Móvil'});if(r.error)return toast(r.error.message);
    $('#ovc').innerHTML=`<h2>Activar verificación en dos pasos</h2><p>1. Abre una app de autenticación (Google Authenticator, Microsoft Authenticator, Authy…) y escanea este código:</p><img class="qr" alt="Código QR" src="${esc(r.data.totp.qr_code)}"><p class="note" style="text-align:center">¿No puedes escanear? Clave: <code>${esc(r.data.totp.secret)}</code></p><p>2. Escribe el código de 6 cifras que te muestre la app:</p><div class="row"><input id="mfaCode" inputmode="numeric" maxlength="6" style="flex:1"><button data-mfa="verify" data-f2="${esc(r.data.id)}">Verificar</button></div><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="sec" id="closeOv">Cancelar</button></div>`;return}
  if(t.dataset.mfa==='verify'){const r=await SB.auth.mfa.challengeAndVerify({factorId:t.dataset.f2,code:$('#mfaCode').value.trim()});if(r.error)return toast('Código incorrecto, prueba otra vez');toast('Verificación en dos pasos activada');seguridad();return}
  if(t.dataset.mfa==='off'){if(!t.dataset.ok){t.dataset.ok=1;t.textContent='Pulsa otra vez para confirmar';return}const r=await SB.auth.mfa.unenroll({factorId:t.dataset.f2});if(r.error)return toast(r.error.message);toast('Desactivada');seguridad()}});
async function seguridad(){const{data:fs}=await SB.auth.mfa.listFactors();const v=(fs?.totp||[]).find(x=>x.status==='verified');
  $('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Seguridad</h2><button class="sec" id="closeOv">Cerrar</button></div>
  <p>Sesión iniciada como <b>${esc($('#uMail').textContent)}</b>.</p>
  <h3>Verificación en dos pasos</h3>${v?`<p><span class="tag ok">Activada</span> Al entrar se te pedirá un código de tu app de autenticación.</p><button class="danger" data-mfa="off" data-f2="${esc(v.id)}">Desactivar</button>`:`<p><span class="tag wa">Desactivada</span> Recomendado: además de la contraseña, pedirá un código del móvil al entrar.</p><button data-mfa="on">Activar</button>`}`;
  $('#ov').classList.add('on')}

// ---------- carga y sincronización ----------
async function cargar(){$('#load').style.display='block';$('#load').textContent='Cargando datos…';
  const r=await SB.from('docs').select('col,id,data').range(0,9999);if(r.error){$('#load').textContent='Error al leer datos: '+r.error.message;return}
  S.emp={};S.alu={};S.gd={};S.gdx={};S.gdMeta=null;for(const d of r.data){if(d.col==='gdcan'){S.gd[d.id]=d.data;continue}if(d.col==='gdcan_meta'){if(d.id==='estado')S.gdMeta=d.data;else S.gdx[d.id]=d.data;continue}if(d.col==='empresas')S.emp[d.id]=d.data;else if(d.col==='alumnos')S.alu[d.id]=d.data;else if(d.col==='config'){if(d.id==='campos')S.campos=d.data.lista||[];if(d.id==='ajustes')S.aj={...S.aj,...d.data}}}
  if(!r.data.length){$('#load').innerHTML='<div class="card" style="text-align:left"><h2>La base de datos está vacía</h2><p>Importa la copia de seguridad que descargaste de la versión anterior (archivo <code>FCT_1SEA_copia_….json</code>).</p><button id="restore">Importar copia</button></div>'}
  else $('#load').style.display='none';
  autoGdcan();$('#edA')._id=null;render();if(location.hash==='#mapa')abrirMapa();if(location.hash==='#visitas')abrirVisitas()}
document.addEventListener('click',ev=>{const t=ev.target.closest('#cfgBtn,[data-run]');if(!t)return;
  if(t.id==='cfgBtn'){$('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Cuenta y datos</h2><button class="sec" id="closeOv">Cerrar</button></div>
    <p class="note" style="margin-top:10px">${esc($('#saveSt').lastChild.textContent)} · ${esc($('#uMail').textContent)}</p>
    <div class="sheet"><button class="sec" data-run="backup">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>'}Descargar copia de seguridad</button><button class="sec" data-run="restore">Restaurar o importar copia</button><button class="sec" data-run="secBtn">Seguridad y verificación en dos pasos</button><button class="danger" data-run="logout">Cerrar sesión</button></div>`;$('#ov').classList.add('on');return}
  $('#ov').classList.remove('on');const b=document.getElementById(t.dataset.run);if(b)b.click()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!pend&&!ubicando&&!$('#auth').classList.contains('on')&&!document.activeElement?.closest('#edA,#ovc'))cargar()});

// ---------- mapa ----------
let map=null,capa=null,osrmCache={};
const RC=['#0f7b0f','#5fb34d','#e3a21a','#e8702a','#c42b1c'];
const enLP=g=>g&&g.lat>28.4&&g.lat<28.9&&g.lng>-18.05&&g.lng<-17.6;
const ini=n=>{const[ap,no]=(n||'').split(',');return((no||'').trim()[0]||'')+((ap||'').trim()[0]||'')};
const km=(a,b)=>{const R=6371,dl=(b.lat-a.lat)*Math.PI/180,dg=(b.lng-a.lng)*Math.PI/180,x=Math.sin(dl/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
function abrirMapa(){if(!window.L)return;
  if(!map){map=L.map('map',{zoomSnap:.5}).setView([28.67,-17.86],10.5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    capa=L.layerGroup().addTo(map)}
  setTimeout(()=>map.invalidateSize(),50);
  if(!M.sel){const c=sortedAlu().find(([,a])=>a.estado==='realiza'&&(a.prefs||[]).length);if(c)M.sel=c[0]}
  dibujarMapa(true);if(pendientesGeo().length&&!ubicando)ubicar()}
const icon=(html,cls,s)=>L.divIcon({html,className:cls||'',iconSize:[s,s],iconAnchor:[s/2,s/2],popupAnchor:[0,-s/2]});
function popupE(id,extra=''){const e=S.emp[id];const asg=sortedAlu().filter(([aid])=>res[aid]?.emp===id).map(([,a])=>esc(a.nombre));
  return`<b>${esc(e.n+' · '+e.nombre)}</b><br>${concTag(e)} ${e.activa===false?'<span class="tag bad">Desactivada</span>':''}<br>Plazas: ${esc(e.plazas??'sin confirmar')} · ${esc(e.municipio||'')}${extra}${asg.length?'<br>Asignados: '+asg.join(', '):''}<br><button class="ghost" style="margin-top:6px" data-e="${id}">Abrir ficha</button>`}
function marcador(g,ic,drag,onDrag){const m=L.marker([g.lat,g.lng],{icon:ic,draggable:!!drag,autoPan:true});if(drag)m.on('dragend',()=>{const p=m.getLatLng();onDrag({lat:p.lat,lng:p.lng,precision:'manual',fuente:'manual'})});return m}
function setGeo(col,id,g){const o=col==='empresas'?S.emp[id]:S.alu[id];o.geo=g;save(col,id);toast('Ubicación guardada')}
function dibujarMapa(fit){if(!map)return;capa.clearLayers();osrmPend=null;
  const emps=sortedEmp().filter(([,e])=>enLP(e.geo));const pts=[];
  if(M.mode==='alumno'&&S.alu[M.sel]){const id=M.sel,a=S.alu[id],prefs=a.prefs||[],asg=res[id]?.emp,ag=a.geo;
    for(const[eid,e]of emps){if(prefs.includes(eid)||eid===asg)continue;const off=e.activa===false||!!motivoNo(a,eid);
      marcador(e.geo,icon('',`mk-d${off?' off':''}`,12),M.drag,g=>setGeo('empresas',eid,g)).bindPopup(()=>popupE(eid)).addTo(capa)}
    const lista=[...prefs];if(asg&&!lista.includes(asg))lista.push(asg);
    lista.forEach(eid=>{const e=S.emp[eid];if(!e||!enLP(e.geo))return;const r=prefs.indexOf(eid),col=r>=0?RC[r]:'#005fb8',isA=eid===asg;
      if(enLP(ag))L.polyline([[ag.lat,ag.lng],[e.geo.lat,e.geo.lng]],{color:isA?'#005fb8':col,weight:isA?5:2.5,opacity:isA?.9:.75,dashArray:isA?null:'6 7'}).addTo(capa);
      const mk=marcador(e.geo,icon(r>=0?r+1:'★',`mk-p${isA?' asig':''}`,28),M.drag,g=>setGeo('empresas',eid,g)).bindPopup(()=>popupE(eid,enLP(ag)?`<br>${km(ag,e.geo).toFixed(1)} km en línea recta`:'')).addTo(capa);
      const el=mk.getElement();if(el)el.style.background=col;
      pts.push([e.geo.lat,e.geo.lng])});
    if(enLP(ag)){marcador(ag,icon(esc(ini(a.nombre)),'mk-al',34),M.drag,g=>setGeo('alumnos',id,g)).bindPopup(`<b>${esc(a.nombre)}</b><br>${esc(a.municipio||'')}<br>${geoTxt(ag)}`).setZIndexOffset(1000).addTo(capa);pts.push([ag.lat,ag.lng])}
    if(fit&&pts.length)map.fitBounds(pts,{padding:[50,50],maxZoom:14});
    if(enLP(ag))tiempos(id)}
  else{const act=sortedAlu().filter(([,a])=>a.estado==='realiza');const dem={};for(const d of demanda())dem[d.id]=d;
    for(const[eid,e]of emps){const d=dem[eid];if(!d){marcador(e.geo,icon('',`mk-d${e.activa===false||motivoNo({turno:'indiferente'},eid)?' off':''}`,12),M.drag,g=>setGeo('empresas',eid,g)).bindPopup(()=>popupE(eid)).addTo(capa);continue}
      const s=Math.min(40,18+d.pide*4);marcador(e.geo,icon(d.pide,'mk-g',s),M.drag,g=>setGeo('empresas',eid,g)).bindPopup(()=>popupE(eid,`<br>La piden ${d.pide} alumno(s)`)).addTo(capa)}
    for(const[id,a]of act){if(!enLP(a.geo))continue;const r=res[id];const e=r?.emp&&S.emp[r.emp];
      if(e&&enLP(e.geo))L.polyline([[a.geo.lat,a.geo.lng],[e.geo.lat,e.geo.lng]],{color:r.rank>=0?RC[r.rank]:'#005fb8',weight:3,opacity:.85}).addTo(capa);
      marcador(a.geo,icon(esc(ini(a.nombre)),`mk-al s${r?.emp?'':' off'}`,26),M.drag,g=>setGeo('alumnos',id,g)).on('click',()=>{if(!M.drag){M.mode='alumno';M.sel=id;dibujarMapa(true);panel()}}).setZIndexOffset(1000).bindTooltip(esc(a.nombre)).addTo(capa);pts.push([a.geo.lat,a.geo.lng])}
    if(fit)map.setView([28.67,-17.86],10.5)}
  if(M.focusE&&S.emp[M.focusE]){const e=S.emp[M.focusE];if(enLP(e.geo)){map.setView([e.geo.lat,e.geo.lng],15);L.popup().setLatLng([e.geo.lat,e.geo.lng]).setContent(popupE(M.focusE)).openOn(map)}else toast('Esa empresa no está ubicada en La Palma');M.focusE=null}
  $('#map').classList.toggle('drag',M.drag);panel()}
let osrmPend=null;
async function tiempos(id){const a=S.alu[id];const ids=(a.prefs||[]).filter(e=>S.emp[e]&&enLP(S.emp[e].geo));const asg=res[id]?.emp;if(asg&&!ids.includes(asg)&&enLP(S.emp[asg]?.geo))ids.push(asg);if(!ids.length)return;
  const key=id+JSON.stringify(a.geo)+ids.map(e=>e+JSON.stringify(S.emp[e].geo)).join();if(osrmCache[key]){panel();return}
  const q=[a.geo,...ids.map(e=>S.emp[e].geo)].map(g=>g.lng.toFixed(5)+','+g.lat.toFixed(5)).join(';');osrmPend=key;
  try{const r=await(await fetch(`https://router.project-osrm.org/table/v1/driving/${q}?sources=0&annotations=duration,distance`)).json();
    if(r.code==='Ok'){const o={};ids.forEach((e,i)=>o[e]={min:r.durations[0][i+1]/60,km:r.distances[0][i+1]/1000});osrmCache[key]=o}}catch{}
  if(osrmPend===key)panel()}
function tiempoDe(id,eid){const a=S.alu[id];for(const k in osrmCache)if(k.startsWith(id+JSON.stringify(a.geo))&&osrmCache[k][eid])return osrmCache[k][eid];return null}
function pendientesGeo(){const r=[];for(const[id,a]of Object.entries(S.alu))if(!a.geo&&a.direccion&&!a.geoFallo)r.push(['alumnos',id]);for(const[id,e]of Object.entries(S.emp))if(!e.geo&&(e.direccion||e.municipio)&&!e.geoFallo)r.push(['empresas',id]);return r}
let ubicando=false;
async function ubicar(todos){if(ubicando)return;ubicando=true;
  if(todos){for(const a of Object.values(S.alu))delete a.geoFallo;for(const e of Object.values(S.emp))delete e.geoFallo}
  const P=pendientesGeo();let n=0;
  for(const[col,id]of P){n++;const prog=$('#geoProg');if(prog)prog.textContent=`Ubicando direcciones… ${n}/${P.length}`;
    geoMsg=`Ubicando direcciones ${n}/${P.length}…`;st();
    const o=col==='alumnos'?S.alu[id]:S.emp[id];if(!o||o.geo)continue;const Lm=col==='alumnos'?GEO.limpiaAlumno(o.direccion):GEO.limpiaEmpresa(o);
    let g=null;try{g=await GEO.geocode(Lm)}catch{}
    const cur=col==='alumnos'?S.alu[id]:S.emp[id];if(!cur)continue;
    if(g){cur.geo={lat:g.lat,lng:g.lng,precision:g.precision,fuente:g.fuente}}else cur.geoFallo=true;save(col,id)}
  geoMsg='';st();
  ubicando=false;if(P.length){toast(`Direcciones ubicadas: ${P.length}`);dibujarMapa(false)}else panel()}
function panel(){const box=$('#mside');if(!box)return;const al=sortedAlu().filter(([,a])=>a.estado==='realiza');
  const fuera=[...sortedAlu().filter(([,a])=>a.estado==='realiza'&&a.geo&&!enLP(a.geo)).map(([,a])=>'Alumno: '+a.nombre),...sortedEmp().filter(([,e])=>e.geo&&!enLP(e.geo)).map(([,e])=>e.n+' · '+e.nombre+(e.municipio?' ('+e.municipio+')':''))];
  const sinU=[...al.filter(([,a])=>!a.geo).map(([id,a])=>[`a:${id}`,a.nombre]),...sortedEmp().filter(([,e])=>!e.geo).map(([id,e])=>[`e:${id}`,e.n+' · '+e.nombre])];
  let h=`<div class="seg"><button data-mm="alumno" class="${M.mode==='alumno'?'on':''}">Por alumno</button><button data-mm="grupo" class="${M.mode==='grupo'?'on':''}">Todo el grupo</button></div>`;
  if(M.mode==='alumno'){const a=S.alu[M.sel];
    h+=`<label>Alumno<select id="mSel">${al.map(([id,x])=>`<option value="${id}"${id===M.sel?' selected':''}>${esc(x.nombre)}${(x.prefs||[]).length?'':' (sin preferencias)'}</option>`).join('')}</select></label>`;
    if(a){const r=res[M.sel];h+=`<p class="note" style="margin-top:10px">${a.geo?(enLP(a.geo)?geoTxt(a.geo):'Vive fuera de La Palma'):'Sin ubicar'} · ${r?.emp?'Asignado: <b>'+esc(empName(r.emp))+'</b>':'Sin empresa asignada'}</p>`;
      const lista=[...(a.prefs||[])];if(r?.emp&&!lista.includes(r.emp))lista.push(r.emp);
      h+='<div class="plist">'+(lista.map(eid=>{const e=S.emp[eid];if(!e)return'';const k=prefsIdx(a,eid),t=tiempoDe(M.sel,eid),m=motivoNo(a,eid);
        const dist=t?`${Math.round(t.min)} min<br><small>${t.km.toFixed(1)} km</small>`:(enLP(a.geo)&&enLP(e.geo)?`<small>${km(a.geo,e.geo).toFixed(1)} km recta</small>`:'<small>—</small>');
        return`<div class="pitem${eid===r?.emp?' asig':''}"><span class="dot" style="background:${k>=0?RC[k]:'#005fb8'}">${k>=0?k+1:'★'}</span><div><button class="linkb" data-fe="${eid}" style="text-align:left;color:var(--ink)">${esc(e.nombre)}</button><small>${esc(e.municipio||'')}${m?' · <span style="color:var(--bai)">'+esc(m)+'</span>':''}${!e.geo?' · sin ubicar':''}</small></div><div class="t">${dist}</div></div>`}).join('')||'<p class="note">Este alumno aún no tiene preferencias.</p>')+'</div><p class="note">Tiempos en coche aproximados (OSRM, sin tráfico).</p>'}}
  else h+=`<p class="note">Cada alumno unido a la empresa que le ha tocado; el color indica qué opción era. Los círculos morados son empresas pedidas (el número, cuántos la piden). Pulsa un alumno para ver su detalle.</p>`;
  h+=`<div class="legend">${RC.map((c,i)=>`<div><i class="dot" style="background:${c};width:14px;height:14px"></i>${i+1}ª opción</div>`).join('')}<div><i class="mk-d"></i>Otras empresas activas</div><div><i class="mk-d off"></i>Desactivadas o no asignables</div><div><i style="width:22px;height:4px;background:#005fb8;border-radius:2px"></i>Empresa asignada</div></div>`;
  h+=`<h3>Ajustes del mapa</h3><label class="check"><input type="checkbox" id="mDrag"${M.drag?' checked':''}> Recolocar puntos arrastrándolos</label>
    <div class="row" style="margin-top:8px"><button class="sec" id="geoAll">Volver a ubicar direcciones</button></div><p class="note" id="geoProg">${ubicando?'Ubicando direcciones…':''}</p>`;
  if(fuera.length)h+=`<h3>Fuera de La Palma</h3><div class="mini">${fuera.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>`;
  if(sinU.length)h+=`<h3>Sin ubicar (${sinU.length})</h3><p class="note">No tienen dirección o no se encontró. Rellénala en su ficha o colócalos a mano.</p><div class="mini" style="margin-top:6px">${sinU.map(([k,n])=>`<button class="ghost" data-sinu="${k}">${esc(n)}</button>`).join('')}</div>`;
  box.innerHTML=h;
  const unl=pendientesGeo().length+sinU.length;const b=$('#bM');b.textContent=sinU.length||'';b.className=sinU.length?'w':''}
const prefsIdx=(a,eid)=>(a.prefs||[]).indexOf(eid);
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-mm],[data-fe],#geoAll,[data-sinu]');if(!t)return;
  if(t.dataset.mm){M.mode=t.dataset.mm;dibujarMapa(true)}
  if(t.dataset.fe){const e=S.emp[t.dataset.fe];if(enLP(e.geo)){map.setView([e.geo.lat,e.geo.lng],15)}else openE(t.dataset.fe)}
  if(t.id==='geoAll'){if(!t.dataset.ok){t.dataset.ok=1;t.textContent='Pulsa otra vez: se perderán las recolocaciones manuales';return}for(const o of[...Object.values(S.alu),...Object.values(S.emp)])o.geo=null;ubicar(true)}
  if(t.dataset.sinu){const[k,id]=t.dataset.sinu.split(':');if(k==='a'){selA=id;location.hash='#alumnos';$('#edA')._id=null;render()}else openE(id)}});
document.addEventListener('change',ev=>{if(ev.target.id==='mSel'){M.sel=ev.target.value;dibujarMapa(true)}if(ev.target.id==='mDrag'){M.drag=ev.target.checked;dibujarMapa(false);if(M.drag)toast('Arrastra cualquier punto a su sitio exacto; se guarda al soltarlo')}});
const _render=render;render=function(){_render();if(map&&location.hash==='#mapa'&&!M.drag)dibujarMapa(false)};

// ---------- seguimiento ----------
const HITOS_DEF=[{id:'ini',label:'Inicial'},{id:'i1',label:'Intermedio 1'},{id:'i2',label:'Intermedio 2'},{id:'i3',label:'Intermedio 3'},{id:'i4',label:'Intermedio 4'},{id:'fin',label:'Final'}];
const hitos=()=>HITOS_DEF.map(h=>({...h,fecha:(S.aj.hitos||{})[h.id]||''}));
const hoyISO=()=>new Date().toISOString().slice(0,10);
const diasEntre=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const segDe=a=>{a.seg??={};const s=a.seg;s.cuestA??={};s.cuestT??={};s.contactos??=[];return s};
function estHito(hecho,h){if(hecho)return'ok';if(!h.fecha)return'';const d=diasEntre(hoyISO(),h.fecha);return d<0?'bad':d<=7?'wa':''}
function segAvisos(){const av=[...gdAvisos(),...gdAvisosPropios()];const H=hitos();
  for(const[id,a]of sortedAlu()){if(a.estado!=='realiza')continue;const s=segDe(a),r=res[id];
    for(const h of H){if(estHito(s.cuestA[h.id],h)==='bad')av.push([id,`${a.nombre}: falta el cuestionario ${h.label.toLowerCase()} del alumno (vencía ${fmtD(h.fecha)})`]);
      if(estHito(s.cuestT[h.id]?.fecha,h)==='bad')av.push([id,`${a.nombre}: falta el seguimiento ${h.label.toLowerCase()} con el tutor de empresa${r?.emp?' ('+S.emp[r.emp]?.nombre+')':''}`])}
    if(+s.porRellenar>0)av.push([id,`${a.nombre}: ${s.porRellenar} día(s) del diario sin rellenar`]);
    const ult=(s.contactos||[]).map(c=>c.fecha).sort().pop();if(S.aj.fechaInicio&&S.aj.fechaInicio<=hoyISO()){const ref=ult||S.aj.fechaInicio;const d=diasEntre(ref,hoyISO());if(d>=21)av.push([id,`${a.nombre}: ${ult?'hace '+d+' días del último contacto':'sin contactos registrados desde el inicio'}`])}}
  return av}
function horasObj(){return +S.aj.horasObjetivo||0}
function renderSeg(){const box=$('#segBox');if(!box)return;const H=hitos();const rows=sortedAlu().filter(([,a])=>a.estado==='realiza');
  const dot=(st,t,lbl)=>`<i class="sd ${st}" title="${esc(lbl)}${t?': '+esc(t):''}"></i>`;
  
  const obj=horasObj();
  const avs=segAvisos(),hechos=rows.reduce((n,[,a])=>n+H.filter(h=>segDe(a).cuestA[h.id]).length,0),totQ=rows.length*H.length;
  const sinFechas=H.every(h=>!h.fecha);
  const cards=rows.map(([id,a])=>{const s=segDe(a),r=res[id],e=r?.emp&&S.emp[r.emp];const hc=horasDe(id,s),pct=obj?Math.min(100,hc/obj*100):0;const ult=(s.contactos||[]).map(c=>c.fecha).sort().pop();
    const pend=avs.filter(x=>x[0]===id).length;
    return`<button class="scard" data-seg="${id}"><div class="sc-top"><b>${esc(a.nombre)}</b>${pend?`<span class="tag bad">${pend}</span>`:'<span class="tag ok">al día</span>'}</div>
      <small class="note">${e?esc(e.nombre):'Sin empresa asignada'}</small>
      ${gdDe(id)?`<div class="sc-row"><span>GDCAN</span><small>${gdResumen(gdDe(id))}</small></div>`:''}<div class="sc-row"><span>Horas</span><div class="bars" style="flex:1;width:auto"><i style="width:${pct}%;background:${pct>=100?'#0f7b0f':'#005fb8'}"></i></div><small>${hc}${obj?' / '+obj:''} h</small></div>
      <div class="sc-row"><span>Alumno</span><div>${H.map(h=>dot(estHito(s.cuestA[h.id],h),'',h.label)).join('')}</div>${+s.porRellenar?`<small style="color:var(--bai)">${s.porRellenar} d sin diario</small>`:''}</div>
      <div class="sc-row"><span>Tutor</span><div>${H.map(h=>dot(estHito(s.cuestT[h.id]?.fecha,h),'',h.label)).join('')}</div><small class="note">${ult?'contacto '+fmtD(ult).slice(0,5):'sin contactos'}</small></div></button>`}).join('');
  box.innerHTML=gdBanner()+`<div class="segsum">
    <div class="kpi"><div class="ic ${avs.length?'c-r':'c-g'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v5M12 16.5v.01"/><circle cx="12" cy="12" r="9"/></svg></div><div class="t"><b>${avs.length}</b><span>cosas pendientes</span></div></div>
    <div class="kpi"><div class="ic c-g"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div><div class="t"><b>${hechos} / ${totQ}</b><span>cuestionarios de alumnos hechos</span></div></div></div>
  <div class="card calstrip"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>Calendario</b><button class="ghost" id="segCal">${sinFechas?'Poner fechas y horas':'Editar'}</button></div>
    ${sinFechas?'<p class="note" style="margin:0">Aún no hay fechas límite. Ponlas para que la web te avise de lo que vence.</p>':`<div class="hitos">${H.map(h=>`<div class="hito ${h.fecha&&h.fecha<hoyISO()?'pas':''}"><small>${h.label.replace('Intermedio ','Int. ')}</small><b>${h.fecha?fmtD(h.fecha).slice(0,5):'—'}</b></div>`).join('')}</div>`}</div>
  ${avs.length?`<details class="card avbox" ${avs.length<=6?'open':''}><summary><b>Pendientes (${avs.length})</b></summary><ul class="avl2">${avs.map(([id,t])=>`<li>${id?`<a href="#seguimiento" data-segav="${esc(id)}">${esc(t)}</a>`:esc(t)}</li>`).join('')}</ul></details>`:''}
  <div class="scards">${cards||'<p class="note">Ningún alumno hará la FCT todavía.</p>'}</div>
  <div class="segtbl"><div class="tbl scroll"><table><thead><tr><th>Alumno</th><th>Empresa · tutor</th><th>Horas</th><th class="n">Por rellenar</th><th>Anexos</th><th>Cuestionarios alumno</th><th>Seguimiento tutor</th><th>Último contacto</th></tr></thead><tbody>
  ${rows.map(([id,a])=>{const s=segDe(a),r=res[id],e=r?.emp&&S.emp[r.emp],hcG=gdDe(id)?.horasConf,tut=(e?.contactos||[]).find(c=>/tutor/i.test(c.rol))||(e?.contactos||[])[0];
    const hc=horasDe(id,s),pct=obj?Math.min(100,hc/obj*100):0;const ult=(s.contactos||[]).map(c=>c.fecha).sort().pop();
    return`<tr class="click" data-seg="${id}"><td>${esc(a.nombre)}</td><td>${e?esc(e.nombre):'<span class="note">sin asignar</span>'}${tut?.nombre?`<br><small class="note">${esc(tut.nombre)}</small>`:''}</td>
    <td class="nw">${obj?`<div class="bars" style="width:90px"><i style="width:${pct}%;background:${pct>=100?'#0f7b0f':'#005fb8'}"></i></div><small>${hc} / ${obj} h</small>`:`<small>${hc?hc+' h':'—'}</small>`}</td>
    <td class="n">${+s.porRellenar?`<span class="tag bad">${s.porRellenar}</span>`:'<small class="note">—</small>'}</td>
    <td class="nw"><span class="tag ${s.anexoI?'ok':''}">I</span> <span class="tag ${s.anexoII?'ok':''}">II</span></td>
    <td class="nw">${H.map(h=>dot(estHito(s.cuestA[h.id],h),s.cuestA[h.id]&&fmtD(s.cuestA[h.id]),h.label)).join('')}</td>
    <td class="nw">${H.map(h=>dot(estHito(s.cuestT[h.id]?.fecha,h),s.cuestT[h.id]?.fecha&&fmtD(s.cuestT[h.id].fecha),h.label)).join('')}</td>
    <td class="nw">${ult?`${fmtD(ult)}<br><small class="note">hace ${diasEntre(ult,hoyISO())} días</small>`:'<small class="note">—</small>'}</td></tr>`}).join('')||'<tr><td class="empty">Ningún alumno hará la FCT todavía.</td></tr>'}</tbody></table></div></div>
  <div class="legend" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:10px 0 0"><div><i class="sd ok"></i>Hecho</div><div><i class="sd wa"></i>Vence en ≤ 7 días</div><div><i class="sd bad"></i>Vencido sin hacer</div><div><i class="sd"></i>Aún no toca</div></div>
  <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="sec icb" id="segCsv" title="Descargar CSV"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg><span class="bl">CSV</span></button></div>
  <h2 class="sec-h">Pendiente</h2>${(()=>{const av=avs;return av.length?'<div class="card"><ul style="margin:0;padding-left:20px">'+av.map(([id,t])=>`<li><button class="linkb" data-seg="${id}" style="color:var(--ink);text-align:left">${esc(t)}</button></li>`).join('')+'</ul></div>':'<p class="note">Nada pendiente.</p>'})()}`;
  const b=$('#bS');const n=segAvisos().length;b.textContent=n||'';b.className=n?'r':''}
function openSeg(id){const a=S.alu[id];if(!a)return;const s=segDe(a),H=hitos(),r=res[id],e=r?.emp&&S.emp[r.emp];selSeg=id;
  const f=(k,l,t='number')=>`<label>${l}<input type="${t}" data-sg="${k}" value="${esc(s[k]??'')}"></label>`;
  const tipos=['Llamada','Visita','Email','WhatsApp','Reunión','Otro'];
  $('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(a.nombre)}</h2><button class="sec" id="closeOv">Cerrar</button></div>
  <p class="info" style="margin-top:12px">${e?`<b>${esc(e.nombre)}</b> · ${esc((e.contactos||[]).map(c=>[c.nombre,c.rol,c.telefono,c.email].filter(Boolean).join(' · ')).join(' | ')||e.telefono||'sin contacto')}`:'Sin empresa asignada'}</p>
  ${gdFichaHTML(id)}
  <h3>Horas y asistencia</h3><div class="grid">${f('horasConf','Horas confirmadas en GDCAN')}${f('diasAsist','Días de asistencia')}${f('diasNoAsist','Días de no asistencia')}${f('porRellenar','Días del diario por rellenar')}${f('horario','Horario','text')}</div>
  <div class="row" style="margin-top:10px;gap:16px"><label class="check"><input type="checkbox" data-sgc="anexoI"${s.anexoI?' checked':''}> Anexo I firmado</label><label class="check"><input type="checkbox" data-sgc="anexoII"${s.anexoII?' checked':''}> Anexo II</label></div>
  <h3>Cuestionarios del alumno</h3><div class="grid">${H.map(h=>`<label>${h.label}${h.fecha?` <small class="note">(límite ${fmtD(h.fecha)})</small>`:''}<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="date" data-qa="${h.id}" value="${esc(s.cuestA[h.id]||'')}" style="margin-top:6px"><button class="ghost" data-hoy="qa:${h.id}" style="margin-top:6px">Hoy</button></div></label>`).join('')}</div>
  <label style="margin-top:12px">Diario de actividades: observaciones<textarea data-sg="diario">${esc(s.diario||'')}</textarea></label>
  <h3>Seguimiento con el tutor de empresa</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${H.map(h=>{const x=s.cuestT[h.id]||{};return`<div class="contact" style="grid-template-columns:1fr;margin:0"><label>${h.label}${h.fecha?` <small class="note">(límite ${fmtD(h.fecha)})</small>`:''}<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="date" data-qt="${h.id}" value="${esc(x.fecha||'')}" style="margin-top:6px"><button class="ghost" data-hoy="qt:${h.id}" style="margin-top:6px">Hoy</button></div></label><label>Comentario<textarea data-qtc="${h.id}" style="min-height:52px">${esc(x.com||'')}</textarea></label></div>`}).join('')}</div>
  <div class="row" style="justify-content:space-between;margin-top:24px"><h3 style="margin:0">Registro de contactos</h3><button data-msg="${id}">Enviar mensaje…</button></div>
  <div class="contact" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))"><label>Fecha<input type="date" id="cFecha" value="${hoyISO()}"></label><label>Tipo<select id="cTipo">${tipos.map(t=>`<option>${t}</option>`).join('')}</select></label><label>Con<select id="cCon"><option>Tutor de empresa</option><option>Alumno</option><option>Otro</option></select></label><label style="grid-column:1/-1">Notas<textarea id="cNotas" style="min-height:52px"></textarea></label><div><button id="cAdd">Añadir contacto</button></div></div>
  <div class="tbl scroll" style="margin-top:8px"><table><tbody>${[...s.contactos].map((c,i)=>[c,i]).sort((x,y)=>(y[0].fecha||'').localeCompare(x[0].fecha||'')).map(([c,i])=>`<tr><td class="nw">${fmtD(c.fecha)}</td><td class="nw">${esc(c.tipo)} · ${esc(c.con)}</td><td>${esc(c.notas)}</td><td><button class="ghost" data-cdx="${i}">Quitar</button></td></tr>`).join('')||'<tr><td class="note">Sin contactos registrados.</td></tr>'}</tbody></table></div>
  <label style="margin-top:12px">Comentarios generales<textarea data-sg="comentarios">${esc(s.comentarios||'')}</textarea></label>`;
  $('#ov').classList.add('on')}
let selSeg=null;
function openCal(){const H=hitos();$('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Calendario de seguimiento</h2><button class="sec" id="closeOv">Cerrar</button></div>
  <p class="note">Fechas límite de cada cuestionario/seguimiento (las marca la Consejería o el centro). Sirven para los avisos y los colores.</p>
  <div class="grid" style="margin-top:12px">${H.map(h=>`<label>${h.label}<input type="date" data-hito="${h.id}" value="${esc(h.fecha)}"></label>`).join('')}<label>Horas mínimas a completar<input type="number" id="horasObj" value="${esc(S.aj.horasObjetivo||'')}" placeholder="p. ej. 500"></label></div>`;$('#ov').classList.add('on')}
document.addEventListener('input',ev=>{const t=ev.target;const a=selSeg&&S.alu[selSeg];
  if(a&&$('#ov').classList.contains('on')){const s=segDe(a);
    if(t.dataset.sg){s[t.dataset.sg]=t.value;save('alumnos',selSeg)}
    if(t.dataset.qa!==undefined){s.cuestA[t.dataset.qa]=t.value;save('alumnos',selSeg)}
    if(t.dataset.qt){(s.cuestT[t.dataset.qt]??={}).fecha=t.value;save('alumnos',selSeg)}
    if(t.dataset.qtc){(s.cuestT[t.dataset.qtc]??={}).com=t.value;save('alumnos',selSeg)}}
  if(t.dataset.hito){(S.aj.hitos??={})[t.dataset.hito]=t.value;clearTimeout(t._t);t._t=setTimeout(()=>saveCfg('ajustes',S.aj),500)}
  if(t.id==='horasObj'){S.aj.horasObjetivo=t.value;clearTimeout(t._t);t._t=setTimeout(()=>saveCfg('ajustes',S.aj),500)}});
document.addEventListener('change',ev=>{const t=ev.target;if(t.dataset.sgc&&selSeg){segDe(S.alu[selSeg])[t.dataset.sgc]=t.checked;save('alumnos',selSeg)}});
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-seg],#segCal,#segCsv,#cAdd,[data-cdx],[data-hoy]');if(!t)return;
  if(t.dataset.seg){openSeg(t.dataset.seg);return}
  if(t.id==='segCal')return openCal();
  if(t.dataset.hoy){const[k,h]=t.dataset.hoy.split(':');const s=segDe(S.alu[selSeg]);if(k==='qa')s.cuestA[h]=hoyISO();else(s.cuestT[h]??={}).fecha=hoyISO();save('alumnos',selSeg);openSeg(selSeg);return}
  if(t.id==='cAdd'){const s=segDe(S.alu[selSeg]);const notas=$('#cNotas').value.trim();s.contactos.push({fecha:$('#cFecha').value||hoyISO(),tipo:$('#cTipo').value,con:$('#cCon').value,notas});save('alumnos',selSeg);openSeg(selSeg);toast('Contacto añadido');return}
  if(t.dataset.cdx){if(!t.dataset.ok){t.dataset.ok=1;t.textContent='¿Seguro?';return}segDe(S.alu[selSeg]).contactos.splice(+t.dataset.cdx,1);save('alumnos',selSeg);openSeg(selSeg);return}
  if(t.id==='segCsv'){const H=hitos();const q=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return/[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    const L=[['Alumno','Empresa','Horas confirmadas','Días asistencia','Días no asistencia','Días por rellenar','Anexo I','Anexo II',...H.map(h=>'Alumno '+h.label),'Diario',...H.flatMap(h=>['Tutor '+h.label,'Comentario '+h.label]),'Contactos','Comentarios']];
    for(const[id,a]of sortedAlu()){if(a.estado!=='realiza')continue;const s=segDe(a),e=S.emp[res[id]?.emp];
      L.push([a.nombre,e?.nombre||'',s.horasConf,s.diasAsist,s.diasNoAsist,s.porRellenar,s.anexoI?'Sí':'',s.anexoII?'Sí':'',...H.map(h=>fmtD(s.cuestA[h.id])),s.diario,...H.flatMap(h=>[fmtD(s.cuestT[h.id]?.fecha),s.cuestT[h.id]?.com]),s.contactos.map(c=>`${fmtD(c.fecha)} ${c.tipo} (${c.con}): ${c.notas}`).join(' | '),s.comentarios])}
    bajar('seguimiento_FCT_1SEA.csv','﻿'+L.map(r=>r.map(q).join(';')).join('\r\n'),'text/csv;charset=utf-8')}});

// ---------- mensajes preparados ----------
const PLANT_DEF=[
 {id:'p1',nombre:'Recordatorio de cuestionario (tutor de empresa)',para:'tutor',asunto:'FCT {alumno} · cuestionario {hito}',cuerpo:'Buenos días, {tutor}:\n\nLe escribo como tutor de FCT de {alumno}, que realiza sus prácticas en {empresa}. Le recuerdo que tiene pendiente el cuestionario de seguimiento {hito} en GDCAN (fecha límite: {fecha_limite}).\n\nSi tiene cualquier duda o incidencia, quedo a su disposición.\n\nUn saludo,\n{firma}'},
 {id:'p2',nombre:'Presentación al inicio (tutor de empresa)',para:'tutor',asunto:'Prácticas FCT de {alumno} · CIFP Virgen de Las Nieves',cuerpo:'Buenos días, {tutor}:\n\nSoy el tutor de FCT del ciclo de Sistemas Electrotécnicos y Automatizados del CIFP Virgen de Las Nieves. {alumno} comenzará sus prácticas en {empresa} el {inicio}.\n\nEstaré en contacto durante el periodo de prácticas para hacer el seguimiento. Para cualquier cuestión puede escribirme a este correo.\n\nMuchas gracias por su colaboración.\n\nUn saludo,\n{firma}'},
 {id:'p3',nombre:'Diario sin rellenar (alumno)',para:'alumno',asunto:'FCT · diario de actividades pendiente',cuerpo:'Hola, {nombre_alumno}:\n\nTienes {dias_diario} día(s) del diario de actividades sin rellenar en GDCAN. Por favor, ponte al día lo antes posible.\n\nUn saludo,\n{firma}'},
 {id:'p5',nombre:'Diario al día para el cuestionario (alumno)',para:'alumno',asunto:'FCT · pon el diario al día',cuerpo:'Hola, {nombre_alumno}:\n\nPara que a tu tutor/a de empresa le llegue el cuestionario de seguimiento de GDCAN, tu diario tiene que estar cumplimentado hasta hoy. Por favor, ponlo al día cuanto antes.\n\nRecuerda también que solo cuentan las horas de los días marcados como cumplimentados.\n\nUn saludo,\n{firma}'},
 {id:'p6',nombre:'Aviso del cuestionario: spam y una sola vez (tutor de empresa)',para:'tutor',asunto:'FCT {alumno} · cuestionario de seguimiento de GDCAN',cuerpo:'Buenos días, {tutor}:\n\nLe llegará (o le habrá llegado) por correo el cuestionario de seguimiento {hito} de {alumno} desde GDCAN. Si no lo encuentra, revise la carpeta de spam o correo no deseado.\n\nTenga en cuenta que el cuestionario solo se puede enviar una vez y después no se puede modificar, así que le ruego que repase las respuestas antes de guardarlo.\n\nMuchas gracias. Un saludo,\n{firma}'},
 {id:'p7',nombre:'Falta el NUS y su certificado (alumno)',para:'alumno',asunto:'FCT · número de la Seguridad Social (NUS)',cuerpo:'Hola:\n\nPara poder darte de alta en la Seguridad Social durante las prácticas necesito tu número de la Seguridad Social (NUS) y el documento en el que te lo asignan. Si aún no lo tienes, puedes pedirlo en la sede electrónica de la Seguridad Social (Importass) o en una oficina de la TGSS.\n\nEnvíamelo respondiendo a este correo, por favor. Yo lo entregaré en secretaría para tu expediente.\n\nUn saludo,\n{firma}'},
 {id:'p4',nombre:'Recordatorio de cuestionario (alumno)',para:'alumno',asunto:'FCT · cuestionario {hito} pendiente',cuerpo:'Hola, {nombre_alumno}:\n\nTe recuerdo que tienes pendiente el cuestionario {hito} en GDCAN (fecha límite: {fecha_limite}).\n\nUn saludo,\n{firma}'}];
const plantillas=()=>{if(!S.aj.plantillas?.length)return PLANT_DEF;const ids=new Set(S.aj.plantillas.map(p=>p.id));return[...S.aj.plantillas,...PLANT_DEF.filter(p=>!ids.has(p.id)&&!(S.aj.plBorradas||[]).includes(p.id))]};
const firma=()=>S.aj.firma??'Roberto Chávez Trujillo\nTutor de FCT · 1º SEA\nCIFP Virgen de Las Nieves';
const nomCorto=n=>{const[ap,no]=(n||'').split(',');const t=s=>(s||'').trim().toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());return{completo:(t(no)+' '+t(ap)).trim(),nombre:t(no).split(' ')[0]||t(ap)}};
function tutorDe(id){const r=res[id],e=r?.emp&&S.emp[r.emp];if(!e)return{e:null,c:{}};return{e,c:(e.contactos||[]).find(c=>/tutor/i.test(c.rol))||(e.contactos||[])[0]||{}}}
function proxHito(id,para){const s=segDe(S.alu[id]);for(const h of hitos()){const hecho=para==='tutor'?s.cuestT[h.id]?.fecha:s.cuestA[h.id];if(!hecho&&h.fecha)return h}return hitos().find(h=>!(para==='tutor'?s.cuestT[h.id]?.fecha:s.cuestA[h.id]))||{label:'',fecha:''}}
function rellenar(t,id,para){const a=S.alu[id],{e,c}=tutorDe(id),n=nomCorto(a.nombre),h=proxHito(id,para);
  const V={alumno:n.completo,nombre_alumno:n.nombre,empresa:e?.nombre||'',tutor:c.nombre||'',hito:(h.label||'').toLowerCase(),fecha_limite:h.fecha?fmtD(h.fecha):'lo antes posible',inicio:S.aj.fechaInicio?fmtD(S.aj.fechaInicio):'',dias_diario:segDe(a).porRellenar||'0',firma:firma()};
  return(t||'').replace(/\{(\w+)\}/g,(m,k)=>k in V?V[k]:m)}
const telWA=t=>{let d=(t||'').replace(/\D/g,'');if(d.length===9)d='34'+d;return d};
let msgCtx=null;
function openMensaje(id,pid){const a=S.alu[id];const P=plantillas();const p=P.find(x=>x.id===pid)||P[0];const{e,c}=tutorDe(id);
  const para=p.para,to=para==='tutor'?(c.email||''):(a.email||a.email2||''),tel=para==='tutor'?(c.telefono||e?.telefono||''):(a.telefono||'');
  msgCtx={id,p};
  $('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Mensaje</h2><button class="sec" data-backseg="${id}">← Volver</button></div>
  <div class="grid" style="margin-top:12px"><label>Plantilla<select id="mPl">${P.map(x=>`<option value="${x.id}"${x.id===p.id?' selected':''}>${esc(x.nombre)}</option>`).join('')}</select></label>
  <label>Para (${para==='tutor'?'tutor de empresa':'alumno'})<input id="mTo" value="${esc(to)}" placeholder="${para==='tutor'?'no consta: añádelo en la empresa':'no consta'}"></label><label>Teléfono (WhatsApp)<input id="mTel" value="${esc(tel)}"></label></div>
  <label style="margin-top:10px">Asunto<input id="mAs" value="${esc(rellenar(p.asunto,id,para))}"></label>
  <label style="margin-top:10px">Texto<textarea id="mTx" style="min-height:220px">${esc(rellenar(p.cuerpo,id,para))}</textarea></label>
  ${!to&&!tel?`<p class="note bad">No hay email ni teléfono ${para==='tutor'?'del tutor (añádelo en la ficha de la empresa)':'del alumno (añádelo en su ficha)'}.</p>`:''}
  <label class="check" style="margin-top:8px"><input type="checkbox" id="mLog" checked> Anotarlo en el registro de contactos</label>
  <div class="row" style="margin-top:12px;gap:8px"><button class="icb" id="mMail">Abrir en el correo</button><button class="sec" id="mWA">WhatsApp</button><button class="sec" id="mCopy">Copiar texto</button><span style="flex:1"></span><button class="ghost" id="mPlants">Editar plantillas</button></div>
  <p class="note">Se abre en tu correo con todo relleno; lo revisas y lo envías tú. Correo configurado: <b>${{mailto:'app de correo del dispositivo',outlook:'Outlook web (Microsoft 365)',gmail:'Gmail'}[S.aj.correo||'mailto']}</b>.</p>`;
  $('#ov').classList.add('on');$('#ov').scrollTop=0}
function logMsg(tipo){if(!$('#mLog')?.checked||!msgCtx)return;const s=segDe(S.alu[msgCtx.id]);s.contactos.push({fecha:hoyISO(),tipo,con:msgCtx.p.para==='tutor'?'Tutor de empresa':'Alumno',notas:'Mensaje: '+($('#mAs').value||msgCtx.p.nombre)});save('alumnos',msgCtx.id)}
function abrirURL(u){const a=document.createElement('a');a.href=u;if(!u.startsWith('mailto:'))a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
function openPlantillas(){const P=JSON.parse(JSON.stringify(plantillas()));
  const draw=()=>{$('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Plantillas de mensajes</h2><button class="sec" id="plDone">Guardar y volver</button></div>
  <p class="note">Puedes usar: {alumno} {nombre_alumno} {empresa} {tutor} {hito} {fecha_limite} {inicio} {dias_diario} {firma}</p>
  <div class="grid" style="margin-top:10px"><label>Abrir los emails en<select id="plCorreo"><option value="mailto">App de correo del dispositivo</option><option value="outlook">Outlook web (Microsoft 365)</option><option value="gmail">Gmail</option></select></label></div>
  <label style="margin-top:10px">Firma<textarea id="plFirma" style="min-height:70px">${esc(firma())}</textarea></label>
  ${P.map((p,i)=>`<div class="contact" style="grid-template-columns:1fr;margin-top:10px"><div class="row" style="gap:8px"><input data-pl="${i}:nombre" value="${esc(p.nombre)}" style="flex:1;margin:0"><select data-pl="${i}:para" style="width:auto;margin:0"><option value="tutor"${p.para==='tutor'?' selected':''}>Al tutor</option><option value="alumno"${p.para==='alumno'?' selected':''}>Al alumno</option></select><button class="danger" data-pldel="${i}">Borrar</button></div>
    <label>Asunto<input data-pl="${i}:asunto" value="${esc(p.asunto)}"></label><label>Texto<textarea data-pl="${i}:cuerpo" style="min-height:140px">${esc(p.cuerpo)}</textarea></label></div>`).join('')}
  <div class="row" style="margin-top:10px"><button class="sec" id="plAdd">+ Nueva plantilla</button></div>`;$('#plCorreo').value=S.aj.correo||'mailto'};
  draw();
  $('#ovc').oninput=ev=>{const k=ev.target.dataset.pl;if(k){const[i,f]=k.split(':');P[+i][f]=ev.target.value}};
  $('#ovc').onclick=ev=>{const t=ev.target;if(t.id==='plAdd'){P.push({id:'p'+Date.now().toString(36),nombre:'Nueva plantilla',para:'tutor',asunto:'',cuerpo:''});draw()}
    if(t.dataset.pldel){const x=P.splice(+t.dataset.pldel,1)[0];if(x?.id)(S.aj.plBorradas??=[]).push(x.id);draw()}
    if(t.id==='plDone'){S.aj.plantillas=P;S.aj.firma=$('#plFirma').value;S.aj.correo=$('#plCorreo').value;saveCfg('ajustes',S.aj);$('#ovc').oninput=null;$('#ovc').onclick=null;toast('Plantillas guardadas');msgCtx?openMensaje(msgCtx.id,msgCtx.p.id):closeE()}}}
document.addEventListener('change',ev=>{if(ev.target.id==='mPl'&&msgCtx)openMensaje(msgCtx.id,ev.target.value)});
document.addEventListener('click',async ev=>{const t=ev.target.closest('#mMail,#mWA,#mCopy,#mPlants,[data-msg],[data-backseg]');if(!t)return;
  if(t.dataset.msg){openMensaje(t.dataset.msg);return}
  if(t.dataset.backseg){msgCtx=null;openSeg(t.dataset.backseg);return}
  if(t.id==='mPlants')return openPlantillas();
  const to=$('#mTo').value.trim(),as=$('#mAs').value,tx=$('#mTx').value,E=encodeURIComponent;
  if(t.id==='mMail'){if(!to)return toast('Falta el email del destinatario');const c=S.aj.correo||'mailto';
    abrirURL(c==='outlook'?`https://outlook.office.com/mail/deeplink/compose?to=${E(to)}&subject=${E(as)}&body=${E(tx)}`:c==='gmail'?`https://mail.google.com/mail/?view=cm&fs=1&to=${E(to)}&su=${E(as)}&body=${E(tx)}`:`mailto:${E(to)}?subject=${E(as)}&body=${E(tx)}`);logMsg('Email')}
  if(t.id==='mWA'){const n=telWA($('#mTel').value);if(!n)return toast('Falta el teléfono');abrirURL(`https://wa.me/${n}?text=${E(tx)}`);logMsg('WhatsApp')}
  if(t.id==='mCopy'){try{await navigator.clipboard.writeText(as?as+'\n\n'+tx:tx);toast('Texto copiado')}catch{toast('No se pudo copiar')}}});
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

// ---------- historial (gesto atrás) y hoja deslizable ----------
let backPending=false,needPush=false,pendingHash=null,closingByPop=false;
function goHash(h){if(backPending)pendingHash=h;else if(location.hash===h)route();else location.hash=h}
new MutationObserver(()=>{const on=$('#ov').classList.contains('on');
  if(on){if(backPending)needPush=true;else if(!history.state?.ov)history.pushState({ov:1},'')}
  else{$('#ovc').style.transform='';if(closingByPop){closingByPop=false;return}if(history.state?.ov&&!backPending){backPending=true;history.back()}}
}).observe($('#ov'),{attributes:true,attributeFilter:['class']});
addEventListener('popstate',()=>{
  if(backPending){backPending=false;if(needPush&&$('#ov').classList.contains('on'))history.pushState({ov:1},'');needPush=false;
    if(pendingHash){const h=pendingHash;pendingHash=null;goHash(h)}return}
  if($('#ov').classList.contains('on')&&!history.state?.ov){closingByPop=true;closeE();return}
  if($('#v-alumnos').classList.contains('det')&&!history.state?.det)$('#v-alumnos').classList.remove('det')});
function abrirDet(){$('#v-alumnos').classList.add('det');if(innerWidth<=760&&!history.state?.det)history.pushState({det:1},'')}
function cerrarDet(){if(history.state?.det)history.back();else $('#v-alumnos').classList.remove('det')}
// deslizar hacia abajo para cerrar (móvil)
{const c=$('#ovc');let y0=null,dy=0;
  c.addEventListener('touchstart',e=>{if(innerWidth>760||c.scrollTop>0){y0=null;return}const ta=e.target.closest('textarea,select,input[type=date]');if(ta&&ta.scrollTop>0){y0=null;return}y0=e.touches[0].clientY;dy=0;c.style.transition='none'},{passive:true});
  c.addEventListener('touchmove',e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy>0&&c.scrollTop<=0){e.preventDefault();c.style.transform=`translateY(${dy}px)`}else if(dy<0){y0=null;c.style.transform=''}},{passive:false});
  c.addEventListener('touchend',()=>{if(y0==null)return;c.style.transition='transform .2s';if(dy>110){c.style.transform='translateY(100%)';setTimeout(()=>{closeE();c.style.transition=''},180)}else c.style.transform='';y0=null})}

// ---------- datos de GDCAN (los escribe el robot; aquí solo se leen) ----------
const tokens=s=>GEO.norm(s).replace(/[^a-z ]/g,' ').split(' ').filter(w=>w.length>1).sort().join(' ');
function gdDe(id){const a=S.alu[id];if(!a)return null;if(a.dni&&S.gd[a.dni.toUpperCase()])return S.gd[a.dni.toUpperCase()];
  const t=tokens(a.nombre);return Object.values(S.gd).find(g=>tokens(g.nombre)===t)||null}
function gdFecha(){const m=S.gdMeta;if(!m)return'';const d=new Date(m.fecha);return isNaN(d)?'':d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
function gdBanner(){const m=S.gdMeta;if(!m)return'<div class="gdban">GDCAN: aún no hay ninguna lectura.</div>';
  return m.ok?`<div class="gdban ok">GDCAN leído el ${esc(gdFecha())} · ${esc(m.practicas??0)} práctica(s)</div>`:`<div class="gdban bad">Última lectura de GDCAN con problemas (${esc(gdFecha())}): ${esc(m.error||(m.errores||[]).join('; ')||'error')}</div>`}
const tick=v=>v===true?'<span class="tag ok">✓</span>':v===false?'<span class="tag bad">✗</span>':'<span class="tag">?</span>';
function gdResumen(g){const ss=ssInfo(g.estadoSS),hd=horasDiario(g);return`${ss?`<span class="tag ${ss[0]}">${esc(ss[1])}</span> · `:''}${esc(hd?hd.h:(g.horasConf??0))}/${esc(g.horasPrev??'?')} h${hd?.noAs?' · '+hd.noAs+' día(s) sin asistir':''} · Horario ${tick(g.horario)} Plan ${tick(g.plan)} Calendario ${tick(g.calendario)}`}
function gdAvisos(){const av=[];for(const[id,a]of sortedAlu()){if(a.estado!=='realiza')continue;const g=gdDe(id);if(!g)continue;
    const ge=gdEmpresa(g);if(res[id]?.emp&&ge&&ge!==res[id].emp)av.push([id,`${a.nombre}: en GDCAN figura en otra empresa (${g.empresa})`]);
    const ss=ssInfo(g.estadoSS);if(ss&&ss[0]==='bad')av.push([id,`${a.nombre}: ${ss[1]}`]);else if(g.inicio&&diasEntre(hoyISO(),g.inicio)<=3&&ss&&ss[0]!=='ok')av.push([id,`${a.nombre}: empieza el ${fmtD(g.inicio)} y aún no tiene el alta correcta en la Seguridad Social`]);
    const hd=horasDiario(g);if(hd?.corregir)av.push([id,`${a.nombre}: ${hd.corregir} día(s) del diario corregidos por el alumno; acepta la corrección en GDCAN para que cuenten las horas`]);
    if(!S.gdx.avisos&&g.inicio&&diasEntre(hoyISO(),g.inicio)<=7){for(const[k,l]of[['horario','horario'],['plan','plan formativo'],['calendario','calendario']])if(g[k]===false)av.push([id,`${a.nombre}: falta el ${l} en GDCAN (empieza el ${fmtD(g.inicio)})`])}}
  return av}
function gdEmpresa(g){const c=GEO.norm(g.ficha?.empresa?.cif||''),n=tokens((g.ficha?.empresa?.nombre||g.empresa||'').split('/')[0]);for(const[eid,e]of Object.entries(S.emp)){if(c&&GEO.norm(e.nif||'')===c)return eid}for(const[eid,e]of Object.entries(S.emp)){if(n&&tokens(e.nombre).replace(/\b(sa|sl|slu|sau)\b/g,'').trim()===n.replace(/\b(sa|sl|slu|sau)\b/g,'').trim())return eid}return null}
function gdFichaHTML(id){const g=gdDe(id);if(!g)return`<h3>GDCAN</h3><p class="note">Sin práctica en GDCAN todavía.</p>`;const f=g.ficha||{},e=f.empresa||{};
  const seg=(L,t)=>L?.length?`<div class="tbl scroll"><table><tbody>${L.map(s=>`<tr><td>${esc(s.tipo)}</td><td class="nw">prev. ${fmtD(s.prevista)}</td><td>${tick(s.realizado)}</td><td class="nw">${fmtD(s.fecha)}</td><td>${esc(s.incidencia||'')}</td></tr>`).join('')}</tbody></table></div>`:`<p class="note">${t}: sin cuestionarios aún.</p>`;
  return`<h3>GDCAN <small class="note">(leído ${esc(gdFecha())})</small></h3><div class="info">
    <b>${esc(g.empresa)}</b> · ${fmtD(g.inicio)} → ${fmtD(g.fin)} · estado ${esc(f.estado||g.estadoSS||'—')}<br>${gdResumen(g)}<br>
    Tutor/a de empresa: <b>${esc(e.tutor||'—')}</b>${e.tutorEmail?' · '+esc(e.tutorEmail):''} ${e.tutor&&gdEmpresa(g)?`<button class="ghost" data-gdtutor="${id}">Añadir a la empresa</button>`:''}<br>
    Diario: ${esc(f.diario?.horas??0)} h en ${esc(f.diario?.dias?.length??0)} día(s) · Comunicaciones: ${esc(f.comunicaciones??0)} · Solicitudes: ${esc(f.solicitudes??0)}</div>
    <p class="note" style="margin-top:8px"><b>Cuestionarios del alumno</b></p>${seg(f.seguimientosAlumno,'Alumno')}<p class="note" style="margin-top:8px"><b>Seguimientos al tutor de empresa</b></p>${seg(f.seguimientosTutor,'Tutor')}`}
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-gdtutor]');if(!t)return;const id=t.dataset.gdtutor,g=gdDe(id);if(!g)return;const eid=gdEmpresa(g),e=S.emp[eid];if(!e){toast('Esa empresa de GDCAN no está en tu lista de empresas');return}
  const tu=g.ficha.empresa;e.contactos??=[];const ya=e.contactos.find(c=>GEO.norm(c.nombre)===GEO.norm(tu.tutor)||(tu.tutorEmail&&c.email===tu.tutorEmail));
  if(ya){ya.rol=ya.rol||'Tutor/a de empresa';if(!ya.email&&tu.tutorEmail)ya.email=tu.tutorEmail}else e.contactos.unshift({nombre:tu.tutor,rol:'Tutor/a de empresa',telefono:'',email:tu.tutorEmail||''});
  save('empresas',eid);toast('Tutor añadido a '+e.nombre)});

// ---------- GDCAN: conciertos, alumnado, Seguridad Social, avisos y horas ----------
const nCif=s=>GEO.norm(s||'').replace(/[^a-z0-9]/g,'');
const tkE=s=>tokens((s||'').split('/')[0]).split(' ').filter(w=>!/^(sa|sl|slu|sau|slp|sll|sc|scl|sociedad|limitada|anonima|de|del|la|las|los|y)$/.test(w)).join(' ');
function gdConc(e){const L=S.gdx?.conciertos?.lista;if(!L||!e)return null;const c=nCif(e.nif);
  let m=c?L.filter(x=>nCif(x.cif)===c):[];if(!m.length){const n=tkE(e.nombre);if(n)m=L.filter(x=>tkE(x.empresa)===n)}
  if(!m.length)return null;const r=x=>({si:0,tramite:1,cad:2}[concK(x)]??3);
  return[...m].sort((a,b)=>r(a)-r(b)||(b.caducidad||'').localeCompare(a.caducidad||''))[0]}
function concK(g){const n=GEO.norm(g.estado||'');if(/caduc/.test(n))return'cad';if(/tramite|solicit|pendiente|firma/.test(n))return'tramite';if(/vigente|activo|firmado|aprobado/.test(n))return'si';return null}
function gdConcHTML(e){const g=gdConc(e);if(!S.gdx?.conciertos)return'';
  if(!g)return`<p class="note">GDCAN: no encuentro un concierto para esta empresa${e.nif?'':' (pon el NIF/CIF para que la búsqueda sea exacta)'}. Se usa el estado que pongas arriba.</p>`;
  return`<p class="info" style="margin:10px 0 0">GDCAN: <b>${esc(g.estado||'—')}</b>${g.tipo?' · '+esc(g.tipo):''}${g.fecha?' · firmado '+fmtD(g.fecha):''}${g.caducidad?' · caduca '+fmtD(g.caducidad):''}${g.cif?' · CIF '+esc(g.cif):''}<br><small class="note">Este dato manda sobre el estado que pongas a mano.</small></p>`}
function gdAlu(id){const a=S.alu[id],L=S.gdx?.alumnos?.lista;if(!a||!L)return null;const d=(a.dni||'').toUpperCase();
  return(d&&L.find(x=>(x.dni||'').toUpperCase()===d))||L.find(x=>tokens(x.nombre)===tokens(a.nombre))||null}
function gdAluHTML(id){const x=gdAlu(id),g=gdDe(id);const p=[];
  if(x)p.push(`GDCAN: sin práctica creada${x.matricula?' · matrícula '+esc(x.matricula):''}${x.grupo?' · '+esc(x.grupo):''}`);
  else if(g){const ss=ssInfo(g.estadoSS);p.push(`GDCAN: práctica en ${esc(g.empresa||'—')}${ss?` · <span class="tag ${ss[0]}">${esc(ss[1])}</span>`:''}`)}
  return p.length?'<br>'+p.join('<br>'):''}
// Rellena datos vacíos con lo que trae GDCAN (nunca pisa lo que ya escribiste)
function autoGdcan(){
  for(const[id,a]of Object.entries(S.alu)){let ch=false;const x=gdAlu(id),f=gdDe(id)?.ficha?.alumno;
    const dni=(x?.dni||f?.dni||'').toUpperCase(),tel=x?.telefono||f?.telefono,em=x?.email||f?.email;
    if(dni&&!a.dni){a.dni=dni;ch=true}if(tel&&!a.telefono){a.telefono=tel;ch=true}
    if(em&&GEO.norm(a.email)!==GEO.norm(em)&&GEO.norm(a.email2)!==GEO.norm(em)){if(!a.email){a.email=em;ch=true}else if(!a.email2){a.email2=em;ch=true}}
    if(ch)save('alumnos',id)}
  for(const[id,e]of Object.entries(S.emp)){if(e.nif)continue;const g=gdConc(e);if(g?.cif){e.nif=g.cif;save('empresas',id)}}}
function ssInfo(s){const n=GEO.norm(s||'');if(!n)return null;if(/alta correcta/.test(n))return['ok','Alta en la S. Social'];if(/no enviada/.test(n))return['','No enviada a la S. Social'];
  if(/pendiente|enviada/.test(n))return['wa','Enviada a la S. Social, sin respuesta'];if(/baja/.test(n))return['','Baja en la S. Social'];return['bad','Incidencia en la S. Social: '+s]}
const hhmm=t=>{const m=String(t||'').match(/(\d{1,2}):(\d{2})/g);if(!m||m.length<2)return 0;const[a,b]=m.map(x=>{const[h,mi]=x.split(':');return+h*60+ +mi});return Math.max(0,b-a)};
function horasDiario(g){const D=g?.ficha?.diario?.dias;if(!D?.length)return null;let min=0,corregir=0,noAs=0,pend=0;
  for(const d of D){const n=GEO.norm(d.estado||'');if(/no asiste/.test(n)){noAs++;continue}if(/corregid/.test(n)){corregir++;continue}
    if(/cumplimentad/.test(n)&&!/sin cumpliment|no cumpliment/.test(n)){min+=hhmm(d.manana)+hhmm(d.tarde);continue}pend++}
  return{h:Math.round(min/6)/10,corregir,noAs,pend}}
function horasDe(id,s){const g=gdDe(id),hd=horasDiario(g);if(hd)return hd.h;if(g&&g.horasConf!=null)return+g.horasConf||0;return+s.horasConf||0}
function gdAvisosPropios(){const L=S.gdx?.avisos?.lista||[];return L.map(x=>{const id=Object.keys(S.alu).find(k=>{const a=S.alu[k];return x.dni&&((a.dni||'').toUpperCase()===x.dni||Object.keys(S.gd).includes(x.dni)&&gdDe(k)===S.gd[x.dni])})||null;
  return[id,'GDCAN'+(x.tipo?' ('+x.tipo+')':'')+': '+x.aviso]})}
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-segav]');if(!t)return;ev.preventDefault();openSeg(t.dataset.segav)});
function gdConcSinLista(){const L=S.gdx?.conciertos?.lista||[];const nuestros=new Set(Object.values(S.emp).map(e=>nCif(e.nif)).filter(Boolean)),nn=new Set(Object.values(S.emp).map(e=>tkE(e.nombre)));
  const vistos=new Set();return L.filter(x=>concK(x)==='si'&&!nuestros.has(nCif(x.cif))&&!nn.has(tkE(x.empresa))&&!vistos.has(nCif(x.cif)||x.empresa)&&vistos.add(nCif(x.cif)||x.empresa))}
function openConcGd(){const L=gdConcSinLista();let q='';
  const draw=()=>{const F=L.filter(x=>!q||GEO.norm(x.empresa+' '+x.cif).includes(GEO.norm(q))).slice(0,80);
    $('#cgL').innerHTML=F.map(x=>`<div class="mi"><div class="mi-t"><b>${esc(x.empresa)}</b><button class="ghost" data-cgadd="${esc(x.cif||x.empresa)}">Añadir</button></div><div class="mi-s">${esc(x.cif||'')}${x.caducidad?' · caduca '+fmtD(x.caducidad):''}${x.tipo?' · '+esc(x.tipo):''}</div></div>`).join('')||'<p class="note">Nada que coincida.</p>'};
  $('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Conciertos vigentes del centro que no tienes</h2><button class="sec" id="closeOv">Cerrar</button></div>
    <p class="note">Son todos los conciertos vigentes del CIFP en GDCAN (de cualquier familia profesional) que no están en tu lista. Busca y añade los que te interesen.</p>
    <input id="cgQ" placeholder="Buscar por nombre o CIF…" style="margin:10px 0"><div id="cgL" style="display:grid;gap:6px"></div>`;
  $('#ov').classList.add('on');draw();$('#cgQ').oninput=e=>{q=e.target.value;draw()};
  $('#cgL').onclick=e=>{const b=e.target.closest('[data-cgadd]');if(!b)return;const x=L.find(y=>(y.cif||y.empresa)===b.dataset.cgadd);if(!x)return;
    const id='e'+Date.now().toString(36),n=Math.max(0,...Object.values(S.emp).map(e=>+e.n||0))+1;
    S.emp[id]={n,nombre:x.empresa,telefono:'',nif:x.cif||'',direccion:'',municipio:'',concierto:'si',caducidad:x.caducidad||'',plazas:null,turno:'',observaciones:'',contactos:[],extra:{}};
    save('empresas',id);L.splice(L.indexOf(x),1);draw();render();toast('Añadida: '+x.empresa)}}
document.addEventListener('click',ev=>{if(ev.target.closest('#concGd'))openConcGd()});

// ---------- distancia desde el centro ----------
const CENTRO={lat:28.69516,lng:-17.76626,nombre:'CIFP Virgen de Las Nieves'}; // Barranco del Carmen 5, S/C de La Palma
const fmtKm=k=>k==null?'—':(Math.round(k*10)/10).toLocaleString('es-ES')+' km';
const fmtMin=m=>{m=Math.round(m);return m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min'};
const geoK=g=>g?g.lat.toFixed(5)+','+g.lng.toFixed(5):'';
function kmTxt(e){const k=e.kmCentro;return k&&k.g===geoK(e.geo)?` · Desde el CIFP: <b>${fmtKm(k.km)}</b> (${fmtMin(k.min)}), ida y vuelta ${fmtKm(k.km*2)}`:''}
async function kmCentro(id){const e=S.emp[id];if(!e?.geo||(e.kmCentro&&e.kmCentro.g===geoK(e.geo)))return;
  try{const r=await(await fetch(`https://router.project-osrm.org/route/v1/driving/${CENTRO.lng},${CENTRO.lat};${e.geo.lng},${e.geo.lat}?overview=false`)).json();
    if(r.code==='Ok'){const cur=S.emp[id];if(!cur)return;cur.kmCentro={km:r.routes[0].distance/1000,min:r.routes[0].duration/60,g:geoK(cur.geo)};save('empresas',id);const k=$('#kmC');if(k&&selE===id)k.innerHTML=kmTxt(cur)}}catch{}}

// ---------- Visitas: rondas de visitas, días y orden (automático o a mano) ----------
// Algoritmo: tiempos reales por carretera (OSRM). 1) Clarke-Wright ("ahorros") con límite de jornada; 2) vaciar días metiendo
// sus paradas donde menos tiempo añadan; 3) orden exacto de cada día (≤8 paradas) o 2-opt. Objetivo: menos días y luego menos minutos.
const DIA_COL=['#3b5bdb','#e8590c','#2b8a3e','#ae3ec9','#c92a2a','#0c8599','#5c940d','#d6336c'];
let vmap=null,vcapa=null,vCalc=false,vSeguro=false,vDrag=null;
const toMin=t=>{const[h,m]=(t||'0:0').split(':').map(Number);return h*60+(m||0)};
const deMin=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(Math.round(m%60)).padStart(2,'0');
function V(){const v=S.aj.visitas??={};v.salida??='08:30';v.fin??='13:30';v.svc??=30;v.ini??='cifp';v.vue??='cifp';
  if(!v.rondas){v.rondas={r1:{nombre:'Ronda 1',sel:v.sel||null,dias:(v.plan||[]).map((d,i)=>({paradas:d.paradas,horas:{},fecha:v.fechas?.[i]||''}))}};v.actual='r1';delete v.plan;delete v.sel;delete v.fechas}
  if(!v.rondas[v.actual])v.actual=Object.keys(v.rondas)[0];return v}
const RD=()=>{const v=V();return v.rondas[v.actual]};
const guardaV=()=>saveCfg('ajustes',S.aj);
function visEmpresas(){const m=new Map();for(const[aid,a]of sortedAlu()){if(a.estado!=='realiza')continue;const e=res[aid]?.emp;if(!e||!S.emp[e])continue;if(!m.has(e))m.set(e,[]);m.get(e).push(aid)}return m}
function ultimaVisita(als){let u='';for(const aid of als||[])for(const c of segDe(S.alu[aid]).contactos)if(c.tipo==='Visita'&&c.fecha>u)u=c.fecha;return u}
const casaOk=()=>{const c=V().casa;return c&&c.lat?c:null};
const extremo=(d,k)=>((d?.[k]||V()[k])==='casa'&&casaOk())?'@casa':null; // null = CIFP
const ptDe=x=>x==='@casa'?casaOk():x==null?CENTRO:S.emp[x]?.geo;
const nomExt=(x,fin)=>(fin?'Vuelta ':'Salida ')+(x==='@casa'?(fin?'a casa':'de casa'):(fin?'al CIFP':'del CIFP'));
function tramo(r,a,b){const M=r.M;if(!M)return null;const i=a==null?0:M.ids.indexOf(a)+1,j=b==null?0:M.ids.indexOf(b)+1;if(!i&&a!=null||!j&&b!=null)return null;return{min:M.T[i][j],km:M.D[i][j]}}
// simula un día: llegada a cada parada, esperas y retrasos respecto a la hora acordada
function simDia(r,d){const v=V(),svc=+v.svc||0;let t=toMin(v.salida),km=0,prev=extremo(d,'ini'),falta=false,tarde=0;const P=[];const fin=extremo(d,'vue');
  for(const e of d.paradas){const lg=tramo(r,prev,e);if(!lg)falta=true;t+=lg?.min||0;km+=lg?.km||0;let espera=0,retraso=0;const h=d.horas?.[e];
    if(h){const hm=toMin(h);if(t<hm){espera=hm-t;t=hm}else if(t>hm+1){retraso=t-hm;tarde+=retraso}}P.push({e,lg,llegada:t,espera,retraso});t+=svc;prev=e}
  const vu=d.paradas.length?tramo(r,prev,fin):{min:0,km:0};if(!vu)falta=true;t+=vu?.min||0;km+=vu?.km||0;return{P,vuelta:t,vu,km,falta,tarde}}
function costeOrden(r,d,orden){const s=simDia(r,{...d,paradas:orden});let viaje=0;for(const p of s.P)viaje+=p.lg?.min||0;return viaje+(s.vu?.min||0)+s.tarde*1000}
function optimizarDia(r,d){const P=d.paradas;if(P.length<2)return P;const c=o=>costeOrden(r,d,o);
  if(P.length<=8){let b=P,bc=c(P);const perm=(a,l)=>{if(l===a.length){const x=c(a);if(x<bc){bc=x;b=[...a]}return}for(let i=l;i<a.length;i++){[a[l],a[i]]=[a[i],a[l]];perm(a,l+1);[a[l],a[i]]=[a[i],a[l]]}};perm([...P],0);return b}
  let b=[...P],ok=true;while(ok){ok=false;for(let i=0;i<b.length-1;i++)for(let j=i+1;j<b.length;j++){const x=[...b.slice(0,i),...b.slice(i,j+1).reverse(),...b.slice(j+1)];if(c(x)<c(b)-.01){b=x;ok=true}}}return b}
function planificar(M,n,svc,max,o=0,dd=0){const T=M.T,ct=r=>{let t=T[o][r[0]];for(let k=1;k<r.length;k++)t+=T[r[k-1]][r[k]];return t+T[r[r.length-1]][dd]+svc*r.length};
  const mejor=r=>{if(r.length<2)return r;if(r.length<=8){let b=r,bc=ct(r);const perm=(a,l)=>{if(l===a.length){const c=ct(a);if(c<bc){bc=c;b=[...a]}return}for(let i=l;i<a.length;i++){[a[l],a[i]]=[a[i],a[l]];perm(a,l+1);[a[l],a[i]]=[a[i],a[l]]}};perm([...r],0);return b}
    let b=[...r],ok=true;while(ok){ok=false;for(let i=0;i<b.length-1;i++)for(let j=i+1;j<b.length;j++){const c=[...b.slice(0,i),...b.slice(i,j+1).reverse(),...b.slice(j+1)];if(ct(c)<ct(b)-.01){b=c;ok=true}}}return b};
  let R=Array.from({length:n},(_,i)=>[i+1]);const sv=[];
  for(let i=1;i<=n;i++)for(let j=1;j<=n;j++)if(i!==j)sv.push([T[i][dd]+T[o][j]-T[i][j],i,j]);sv.sort((a,b)=>b[0]-a[0]);
  for(const[s,i,j]of sv){if(s<=0)break;const a=R.find(r=>r[r.length-1]===i),b=R.find(r=>r[0]===j);if(!a||!b||a===b)continue;const m=[...a,...b];if(ct(m)>max)continue;R=R.filter(r=>r!==a&&r!==b);R.push(m)}
  R=R.map(mejor);let cambio=true;
  while(cambio&&R.length>1){cambio=false;R.sort((a,b)=>a.length-b.length||ct(a)-ct(b));
    for(let k=0;k<R.length&&!cambio;k++){const src=R[k],otras=R.filter((_,x)=>x!==k).map(r=>[...r]);let ok=true;
      for(const p of src){let best=null;for(let x=0;x<otras.length;x++){const r=otras[x],c=mejor([...r,p]),d=ct(c);if(d<=max&&(!best||d-ct(r)<best[0]))best=[d-ct(r),x,c]}
        if(best){otras[best[1]]=best[2];continue}
        // cadena: meter p en un día y sacar de ese día otra parada q que quepa en un tercero
        let hecho=false;for(let x=0;x<otras.length&&!hecho;x++){const c=mejor([...otras[x],p]);
          for(const q of c){if(q===p)continue;const c2=mejor(c.filter(z=>z!==q));if(ct(c2)>max)continue;
            for(let y=0;y<otras.length;y++){if(y===x)continue;const c3=mejor([...otras[y],q]);if(ct(c3)<=max){otras[x]=c2;otras[y]=c3;hecho=true;break}}if(hecho)break}}
        if(!hecho){ok=false;break}}
      if(ok){R=otras.map(mejor);cambio=true}}}
  // mejora final: mover una parada de un día a otro si reduce el tiempo total sin pasarse de la jornada
  let mejora=true,vueltas=0;while(mejora&&vueltas++<50){mejora=false;
    for(let x=0;x<R.length&&!mejora;x++)for(let y=0;y<R.length&&!mejora;y++){if(x===y)continue;
      for(const p of R[x]){const a=mejor(R[x].filter(q=>q!==p)),b=mejor([...R[y],p]);if(ct(b)<=max&&(a.length?ct(a):0)+ct(b)<ct(R[x])+ct(R[y])-1){R[x]=a;R[y]=b;mejora=true;break}}}
    R=R.filter(r=>r.length)}
  return R.sort((a,b)=>ct(b)-ct(a))}
async function asegurarMatriz(forzar){const r=RD();const ids=[...new Set([...(r.sel||[]),...r.dias.flatMap(d=>d.paradas)])].filter(id=>S.emp[id]?.geo);if(casaOk())ids.push('@casa');
  const key=ids.map(id=>id+geoK(ptDe(id))).sort().join();if(!forzar&&r.M&&r.M.key===key)return true;if(!ids.length)return false;
  const q=[CENTRO,...ids.map(ptDe)].map(g=>g.lng.toFixed(5)+','+g.lat.toFixed(5)).join(';');
  try{const j=await(await fetch(`https://router.project-osrm.org/table/v1/driving/${q}?annotations=duration,distance`)).json();if(j.code!=='Ok')throw 0;
    const rd=x=>Math.round(x*10)/10;r.M={key,ids,T:j.durations.map(f=>f.map(x=>rd(x/60))),D:j.distances.map(f=>f.map(x=>rd(x/1000)))};guardaV();return true}
  catch{toast('No se pudo consultar el servicio de rutas. Prueba en un rato.');return false}}
async function calcVisitas(){const v=V(),r=RD();const ids=(r.sel||[]).filter(id=>S.emp[id]?.geo);if(!ids.length){toast('No hay empresas ubicadas marcadas');return}
  vCalc=true;renderVisitas();
  if(await asegurarMatriz()){const M=r.M,ci=casaOk()?M.ids.indexOf('@casa')+1:-1,idx=[0,...ids.map(id=>M.ids.indexOf(id)+1),...(ci>0?[ci]:[])],sub={T:idx.map(i=>idx.map(j=>M.T[i][j]))};
    const ext=k=>v[k]==='casa'&&ci>0?ids.length+1:0;
    const dias=planificar(sub,ids.length,+v.svc||0,toMin(v.fin)-toMin(v.salida),ext('ini'),ext('vue')).map(rr=>rr.map(k=>ids[k-1]));
    r.dias=dias.map((p,i)=>({paradas:p,horas:{},fecha:r.dias[i]?.fecha||'',ini:r.dias[i]?.ini,vue:r.dias[i]?.vue}));guardaV()}
  vCalc=false;renderVisitas();dibujarVisitas()}
function abrirVisitas(){renderVisitas();setTimeout(async()=>{if(!window.L||!$('#vmap'))return;if(!vmap){vmap=L.map('vmap',{zoomSnap:.5}).setView([28.67,-17.86],10.5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(vmap);vcapa=L.layerGroup().addTo(vmap)}vmap.invalidateSize();dibujarVisitas();
  if(RD().dias.length&&await asegurarMatriz()){renderVisitas();dibujarVisitas()}},50)}
function renderVisitas(){const box=$('#visBox');if(!box)return;const v=V(),r=RD(),EM=visEmpresas();if(r.sel==null)r.sel=[...EM.keys()];
  const sel=new Set(r.sel),ids=[...new Set([...EM.keys(),...r.sel])].filter(id=>S.emp[id]);const enDia=new Set(r.dias.flatMap(d=>d.paradas));
  const sinGeo=ids.filter(id=>sel.has(id)&&!S.emp[id].geo),sueltas=r.sel.filter(id=>S.emp[id]&&!enDia.has(id)&&S.emp[id].geo);
  const fila=id=>{const e=S.emp[id],als=EM.get(id)||[],u=ultimaVisita(als),tur=[...new Set(als.map(a=>TURNO_A[S.alu[a].turno]).filter(x=>x&&x!=='Indiferente'))];
    return`<label class="vrow"><input type="checkbox" data-vsel="${id}"${sel.has(id)?' checked':''}><span><b>${esc(e.nombre)}</b><small>${esc(e.municipio||'')}${als.length?' · '+als.length+' alumno(s)':''}${tur.length?' · turno de '+esc(tur.join('/').toLowerCase()):''}${u?' · visitada '+fmtD(u):''}${e.geo?'':' · <span style="color:var(--bai)">sin ubicar</span>'}</small></span></label>`};
  const ops=Object.entries(v.rondas).map(([k,x])=>`<option value="${k}"${k===v.actual?' selected':''}>${esc(x.nombre)}</option>`).join('');
  box.innerHTML=`<div class="card vronda"><div class="row"><select id="vRonda" style="flex:1 1 180px;margin:0">${ops}</select><input id="vNom" value="${esc(r.nombre)}" aria-label="Nombre de la ronda" style="flex:1 1 180px;margin:0">
    <button class="sec" id="vNueva">+ Nueva ronda</button>${Object.keys(v.rondas).length>1?'<button class="danger" id="vBorra">Borrar ronda</button>':''}</div>
    <p class="note" style="margin:6px 0 0">Cada ronda (por ejemplo, «Visita inicial», «Visita intermedia») tiene sus propias empresas, días, orden y horas.</p></div>
  <div class="visgrid"><div>
    <div class="card"><h2>1. Qué empresas visitar</h2><p class="note">Por defecto, las que tienen alumnos asignados.</p>
      <div class="vlist">${ids.map(fila).join('')||'<p class="note">Aún no hay alumnos asignados a empresas.</p>'}</div>
      <select id="vAdd" style="margin-top:10px"><option value="">+ Añadir otra empresa…</option>${Object.entries(S.emp).filter(([id,e])=>!ids.includes(id)&&e.activa!==false).sort((a,b)=>a[1].nombre.localeCompare(b[1].nombre)).map(([id,e])=>`<option value="${id}">${esc(e.nombre)}</option>`).join('')}</select>
      ${sinGeo.length?`<p class="note bad">${sinGeo.length} empresa(s) sin ubicar no pueden entrar en la ruta. Ubícalas desde la pestaña Mapa.</p>`:''}</div>
    <div class="card" style="margin-top:12px"><h2>2. Tu jornada</h2><div class="grid">
      <label>Hora de salida<input type="time" data-vk="salida" value="${esc(v.salida)}"></label><label>Hora límite de vuelta<input type="time" data-vk="fin" value="${esc(v.fin)}"></label>
      <label>Minutos en cada empresa<input type="number" min="5" step="5" data-vk="svc" value="${esc(v.svc)}"></label></div>
      <div class="vcasa"><b>Tu casa</b> <small class="note">(solo la ves tú)</small><div class="row" style="margin-top:6px"><input id="vCasaDir" placeholder="Calle y número" value="${esc(v.casa?.dir||'')}" style="flex:2 1 160px;margin:0"><input id="vCasaMun" placeholder="Municipio" value="${esc(v.casa?.mun||'')}" style="flex:1 1 110px;margin:0"><button class="sec" id="vCasaOk">Ubicar</button></div>
      <p class="note">${v.casa?.lat?'✓ Ubicada':'Sin ubicar: las rutas empiezan y acaban en el CIFP.'}</p>
      ${casaOk()?`<div class="grid"><label>Por defecto, salir de<select data-vk="ini"><option value="cifp"${v.ini!=='casa'?' selected':''}>CIFP</option><option value="casa"${v.ini==='casa'?' selected':''}>Casa</option></select></label><label>Por defecto, volver a<select data-vk="vue"><option value="cifp"${v.vue!=='casa'?' selected':''}>CIFP</option><option value="casa"${v.vue==='casa'?' selected':''}>Casa</option></select></label></div>`:''}</div>
      <button id="vCalc" style="margin-top:12px;width:100%">${vCalc?'Calculando…':vSeguro?'¿Rehacer todos los días? Pulsa otra vez':r.dias.length?'Proponer días y orden de nuevo':'Proponer días y orden'}</button>
      <p class="note">Propone el reparto con menos días y menos tiempo de coche. Después puedes cambiarlo todo a mano.</p></div>
    <p class="note" style="margin-top:10px">Comisión de servicio en GDCAN: registra cada visita <b>el mismo día</b> (no admite fechas pasadas). Los km de cada tramo son los que te pedirá.</p>
  </div><div><div id="vmap"></div>
    ${sueltas.length?`<div class="card vdia"><h2>Sin día</h2><p class="note">Marcadas pero sin día asignado.</p><ol class="vtl">${sueltas.map(e=>`<li><span class="vh">—</span><div><b>${esc(S.emp[e].nombre)}</b><div class="vctl">${moverSel(-1,e,r.dias.length)}</div></div></li>`).join('')}</ol></div>`:''}
    <div id="vPlan">${r.dias.length?r.dias.map((d,i)=>diaHTML(r,d,i)).join(''):'<div class="card empty">Marca las empresas y pulsa <b>Proponer días y orden</b>, o crea los días a mano moviendo empresas.</div>'}</div></div></div>`}
const moverSel=(i,e,n)=>`<select data-vmove="${i}:${e}" class="vmv"><option value="">${i<0?'Asignar a…':'Mover a…'}</option>${Array.from({length:n+1},(_,j)=>j===i?'':`<option value="${j}">${j<n?'Día '+(j+1):'Día nuevo'}</option>`).join('')}${i<0?'':'<option value="s">Sin día</option>'}<option value="x">Quitar de la ronda</option></select>`;
function diaHTML(r,d,i){const v=V(),c=DIA_COL[i%DIA_COL.length],s=simDia(r,d),n=r.dias.length,EM=visEmpresas();const tarde=s.vuelta>toMin(v.fin);
  const L2=s.P.map((p,k)=>{const e=S.emp[p.e],als=EM.get(p.e)||[];const tut=(e?.contactos||[]).find(x=>/tutor/i.test(x.rol))||(e?.contactos||[])[0];
    return`<li draggable="true" data-vst="${i}:${k}"><span class="vh"><span class="vgrip" aria-hidden="true">⋮⋮</span>${deMin(p.llegada)}</span><div><b>${esc(e?.nombre||'?')}</b>
      <small>${p.lg?fmtKm(p.lg.km)+' · '+fmtMin(p.lg.min)+' desde '+(k?'la anterior':extremo(d,'ini')?'casa':'el CIFP'):'calculando tramo…'}${p.espera>0?` · <span style="color:var(--wai)">esperas ${fmtMin(p.espera)}</span>`:''}${p.retraso>0?` · <span style="color:var(--bai)">llegas ${fmtMin(p.retraso)} tarde</span>`:''}${als.length?' · '+als.map(a=>esc(S.alu[a].nombre.split(',').reverse().join(' ').trim())).join(', '):''}${tut?.telefono?` · <a href="tel:${esc(tut.telefono.replace(/\s/g,''))}">${esc(tut.nombre||'tutor')} ${esc(tut.telefono)}</a>`:''}</small>
      <div class="vctl"><button class="ghost vup" data-vup="${i}:${k}" ${k?'':'disabled'} aria-label="Subir">↑</button><button class="ghost vup" data-vdn="${i}:${k}" ${k<s.P.length-1?'':'disabled'} aria-label="Bajar">↓</button>
        <label class="vhora" title="Hora acordada con la empresa"><span>Hora acordada</span><input type="time" data-vhora="${i}:${p.e}" value="${esc(d.horas?.[p.e]||'')}"></label>${moverSel(i,p.e,n)}</div></div></li>`}).join('');
  const o=ptDe(extremo(d,'ini')),de=ptDe(extremo(d,'vue')),pts=[o,...d.paradas.map(e=>S.emp[e]?.geo).filter(Boolean),de];
  const gm='https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+o.lat+','+o.lng+'&destination='+de.lat+','+de.lng+(pts.length>2?'&waypoints='+encodeURIComponent(pts.slice(1,-1).map(g=>g.lat+','+g.lng).join('|')):'');
  return`<div class="card vdia" style="border-top:4px solid ${c}" data-vdia="${i}"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Día ${i+1}</h2>
    <input type="date" data-vfecha="${i}" value="${esc(d.fecha||'')}" style="width:auto;margin:0" aria-label="Fecha del día ${i+1}"></div>
    ${casaOk()?`<div class="row vext"><label>Salgo de<select data-vext="${i}:ini"><option value="cifp">CIFP</option><option value="casa"${extremo(d,'ini')?' selected':''}>Casa</option></select></label><label>Vuelvo a<select data-vext="${i}:vue"><option value="cifp">CIFP</option><option value="casa"${extremo(d,'vue')?' selected':''}>Casa</option></select></label></div>`:''}
    <p class="note">${d.paradas.length} empresa(s) · ${fmtKm(s.km)} · vuelta a las <b${tarde?' style="color:var(--bai)"':''}>${deMin(s.vuelta)}</b>${tarde?' (pasa de la hora límite)':''}${s.tarde?' · <span style="color:var(--bai)">no llegas a alguna hora acordada</span>':''}</p>
    <ol class="vtl" data-vdrop="${i}"><li class="vfix"><span class="vh">${esc(v.salida)}</span><div><b>${nomExt(extremo(d,'ini'))}</b></div></li>${L2||'<li class="vfix"><span class="vh"></span><div class="note">Arrastra o mueve empresas aquí.</div></li>'}<li class="vfix"><span class="vh">${deMin(s.vuelta)}</span><div><b>${nomExt(extremo(d,'vue'),1)}</b><small>${s.vu?fmtKm(s.vu.km)+' · '+fmtMin(s.vu.min):''}</small></div></li></ol>
    <div class="row"><button class="sec" data-vopt="${i}" ${d.paradas.length>1?'':'disabled'}>Mejor orden</button><a class="btnl" href="${gm}" target="_blank" rel="noopener">Google Maps</a><button class="sec" data-vhecho="${i}">Visitas hechas</button><button class="sec" data-vcopy="${i}">Copiar</button></div></div>`}
async function dibujarVisitas(){if(!vmap||!vcapa)return;vcapa.clearLayers();const r=RD();const B=[[CENTRO.lat,CENTRO.lng]];
  L.marker([CENTRO.lat,CENTRO.lng],{icon:L.divIcon({className:'',html:'<div class="mk-al" style="background:#2b2f38">C</div>',iconSize:[34,34],iconAnchor:[17,17]})}).bindPopup('<b>CIFP Virgen de Las Nieves</b>').addTo(vcapa);
  const ca=casaOk();if(ca){B.push([ca.lat,ca.lng]);L.marker([ca.lat,ca.lng],{icon:L.divIcon({className:'',html:'<div class="mk-al" style="background:#2b8a3e">H</div>',iconSize:[34,34],iconAnchor:[17,17]})}).bindPopup('<b>Casa</b>').addTo(vcapa)}
  const enPlan=new Set();r.dias.forEach((d,i)=>{const c=DIA_COL[i%DIA_COL.length];const pts=d.paradas.map(e=>S.emp[e]?.geo).filter(Boolean);const o=ptDe(extremo(d,'ini')),de=ptDe(extremo(d,'vue'));
    d.paradas.forEach((e,k)=>{const g=S.emp[e]?.geo;if(!g)return;enPlan.add(e);B.push([g.lat,g.lng]);L.marker([g.lat,g.lng],{icon:L.divIcon({className:'',html:`<div class="mk-p" style="background:${c}">${k+1}</div>`,iconSize:[28,28],iconAnchor:[14,14]})}).bindPopup(`<b>Día ${i+1} · ${k+1}</b><br>${esc(S.emp[e].nombre)}`).addTo(vcapa)});
    if(!pts.length)return;const line=L.polyline([[o.lat,o.lng],...pts.map(g=>[g.lat,g.lng]),[de.lat,de.lng]],{color:c,weight:3,opacity:.5,dashArray:'4 6'}).addTo(vcapa);
    rutaReal([o,...pts,de]).then(gj=>{if(gj&&vcapa.hasLayer(line)){vcapa.removeLayer(line);L.geoJSON(gj,{style:{color:c,weight:4,opacity:.8}}).addTo(vcapa)}})});
  for(const e of r.sel||[]){const g=S.emp[e]?.geo;if(!g||enPlan.has(e))continue;B.push([g.lat,g.lng]);L.circleMarker([g.lat,g.lng],{radius:6,color:'#6c7280',fillOpacity:.6}).bindPopup(esc(S.emp[e].nombre)).addTo(vcapa)}
  if(B.length>1)vmap.fitBounds(B,{padding:[30,30],maxZoom:13})}
const rutaCache={};async function rutaReal(pts){const q=pts.map(g=>g.lng.toFixed(5)+','+g.lat.toFixed(5)).join(';');if(rutaCache[q])return rutaCache[q];
  try{const r=await(await fetch(`https://router.project-osrm.org/route/v1/driving/${q}?overview=full&geometries=geojson`)).json();if(r.code==='Ok')return rutaCache[q]=r.routes[0].geometry}catch{}return null}
// cambios en el plan: se guardan, se repinta y, si hace falta, se piden los tramos nuevos
async function trasCambio(){const r=RD();r.dias=r.dias.filter(d=>d.paradas.length);guardaV();renderVisitas();dibujarVisitas();
  if(await asegurarMatriz()){renderVisitas();dibujarVisitas()}}
function quitaDeDias(r,e){for(const d of r.dias){const k=d.paradas.indexOf(e);if(k>=0){d.paradas.splice(k,1);delete d.horas?.[e]}}}
function moverA(r,e,dest,pos){quitaDeDias(r,e);if(dest==='x'){r.sel=r.sel.filter(x=>x!==e);return}if(dest==='s')return;
  const j=+dest;if(!r.dias[j])r.dias[j]={paradas:[],horas:{},fecha:''};r.dias[j].horas??={};const P=r.dias[j].paradas;P.splice(pos==null?P.length:pos,0,e);if(!r.sel.includes(e))r.sel.push(e)}
document.addEventListener('change',ev=>{const t=ev.target;if(!t.closest('#visBox'))return;const v=V(),r=RD();
  if(t.id==='vRonda'){v.actual=t.value;guardaV();renderVisitas();dibujarVisitas();asegurarMatriz().then(ok=>{if(ok){renderVisitas();dibujarVisitas()}});return}
  if(t.id==='vNom'){r.nombre=t.value.trim()||r.nombre;guardaV();renderVisitas();return}
  if(t.dataset.vsel){const e=t.dataset.vsel;if(t.checked){if(!r.sel.includes(e))r.sel.push(e)}else{r.sel=r.sel.filter(x=>x!==e);quitaDeDias(r,e)}trasCambio();return}
  if(t.id==='vAdd'&&t.value){r.sel.push(t.value);trasCambio();return}
  if(t.dataset.vk){v[t.dataset.vk]=t.dataset.vk==='svc'?+t.value:t.value;guardaV();renderVisitas();dibujarVisitas();return}
  if(t.dataset.vext){const[i,k]=t.dataset.vext.split(':');r.dias[+i][k]=t.value;guardaV();renderVisitas();dibujarVisitas();return}
  if(t.dataset.vfecha!=null){r.dias[+t.dataset.vfecha].fecha=t.value;guardaV();return}
  if(t.dataset.vhora){const[i,e]=t.dataset.vhora.split(':');const d=r.dias[+i];d.horas??={};if(t.value)d.horas[e]=t.value;else delete d.horas[e];guardaV();renderVisitas();return}
  if(t.dataset.vmove&&t.value){const e=t.dataset.vmove.slice(t.dataset.vmove.indexOf(':')+1);moverA(r,e,t.value);trasCambio()}});
document.addEventListener('click',ev=>{const t=ev.target.closest('button');if(!t||!t.closest('#visBox'))return;const v=V(),r=RD();
  if(t.id==='vCalc'){if(vCalc)return;if(r.dias.length&&!vSeguro){vSeguro=true;renderVisitas();setTimeout(()=>{if(vSeguro){vSeguro=false;renderVisitas()}},4000);return}vSeguro=false;calcVisitas();return}
  if(t.id==='vCasaOk'){const dir=$('#vCasaDir').value.trim(),mun=$('#vCasaMun').value.trim();if(!dir&&!mun){delete v.casa;v.ini=v.vue='cifp';guardaV();trasCambio();return}
    t.disabled=true;t.textContent='Ubicando…';GEO.geocode(GEO.limpiaEmpresa({direccion:dir,municipio:mun})).then(g=>{if(!g){toast('No encuentro esa dirección. Revisa calle y municipio.');renderVisitas();return}
      v.casa={dir,mun,lat:g.lat,lng:g.lng};guardaV();toast('Casa ubicada ('+(g.precision==='portal'?'portal exacto':g.precision)+')');trasCambio()}).catch(()=>{toast('No se pudo ubicar');renderVisitas()});return}
  if(t.id==='vNueva'){const id='r'+Date.now().toString(36);v.rondas[id]={nombre:'Ronda '+(Object.keys(v.rondas).length+1),sel:null,dias:[]};v.actual=id;guardaV();renderVisitas();dibujarVisitas();return}
  if(t.id==='vBorra'){if(t.dataset.ok){delete v.rondas[v.actual];v.actual=Object.keys(v.rondas)[0];guardaV();renderVisitas();dibujarVisitas()}else{t.dataset.ok=1;t.textContent='¿Seguro? Pulsa otra vez'}return}
  if(t.dataset.vup||t.dataset.vdn){const[i,k]=(t.dataset.vup||t.dataset.vdn).split(':').map(Number);const P=r.dias[i].paradas,j=t.dataset.vup?k-1:k+1;[P[k],P[j]]=[P[j],P[k]];trasCambio();return}
  if(t.dataset.vopt!=null){const d=r.dias[+t.dataset.vopt];if(!r.M){toast('Calculando tramos…');asegurarMatriz().then(ok=>ok&&t.click());return}d.paradas=optimizarDia(r,d);trasCambio();toast('Orden con menos tiempo de coche'+(Object.keys(d.horas||{}).length?' (respetando las horas acordadas)':''));return}
  const i=+(t.dataset.vhecho??t.dataset.vcopy),d=r.dias?.[i];if(!d||(t.dataset.vhecho==null&&t.dataset.vcopy==null))return;const EM=visEmpresas();
  if(t.dataset.vhecho!=null){const f=d.fecha||hoyISO();let n=0;for(const e of d.paradas)for(const aid of EM.get(e)||[]){const s=segDe(S.alu[aid]);if(!s.contactos.some(c=>c.fecha===f&&c.tipo==='Visita')){s.contactos.push({fecha:f,tipo:'Visita',con:'Tutor de empresa',notas:'Visita a '+S.emp[e].nombre});save('alumnos',aid);n++}}
    toast(n?`Visita anotada en ${n} alumno(s) con fecha ${fmtD(f)}`:'Ya estaban anotadas');renderVisitas();return}
  const s=simDia(r,d);const txt=[`${r.nombre} · Día ${i+1}${d.fecha?' ('+fmtD(d.fecha)+')':''} · ${nomExt(extremo(d,'ini')).toLowerCase()} ${v.salida}`,...s.P.map(p=>`${deMin(p.llegada)} ${S.emp[p.e]?.nombre}${d.horas?.[p.e]?' (acordada '+d.horas[p.e]+')':''} · ${fmtKm(p.lg?.km)}`),`${nomExt(extremo(d,'vue'),1)} ${deMin(s.vuelta)} · ${fmtKm(s.vu?.km)} · total ${fmtKm(s.km)}`].join('\n');
  navigator.clipboard?.writeText(txt).then(()=>toast('Ruta copiada'),()=>toast('No se pudo copiar'))});
// arrastrar y soltar (ordenador y la mayoría de móviles); con las flechas ↑↓ y «Mover a…» se hace lo mismo
document.addEventListener('dragstart',ev=>{const li=ev.target.closest?.('#visBox li[data-vst]');if(!li)return;vDrag=li.dataset.vst;ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',vDrag);li.classList.add('drag')});
document.addEventListener('dragend',()=>{vDrag=null;document.querySelectorAll('#visBox .drag,#visBox .dover').forEach(x=>x.classList.remove('drag','dover'))});
document.addEventListener('dragover',ev=>{if(!vDrag)return;const ol=ev.target.closest?.('#visBox ol[data-vdrop]');if(!ol)return;ev.preventDefault();document.querySelectorAll('#visBox .dover').forEach(x=>x.classList.remove('dover'));(ev.target.closest('li[data-vst]')||ol).classList.add('dover')});
document.addEventListener('drop',ev=>{if(!vDrag)return;const ol=ev.target.closest?.('#visBox ol[data-vdrop]');if(!ol)return;ev.preventDefault();const r=RD();const[i,k]=vDrag.split(':').map(Number);const e=r.dias[i]?.paradas[k];if(!e)return;
  const j=+ol.dataset.vdrop,li=ev.target.closest('li[data-vst]');let pos=li?+li.dataset.vst.split(':')[1]:null;const hora=r.dias[i].horas?.[e];
  if(li&&i===j&&k<pos)pos--;moverA(r,e,j,pos);if(hora)r.dias[j].horas[e]=hora;vDrag=null;trasCambio()});
addEventListener('hashchange',()=>{if(location.hash==='#visitas')abrirVisitas()});

// ---------- Documentación del alumnado (NUS y otros requisitos con tick) ----------
const DOC_DEF=[{id:'nusCert',nombre:'Certificado del NUS recibido'},{id:'nusSecre',nombre:'Entregado en secretaría'}];
const docReq=()=>S.aj.docReq?.length?S.aj.docReq:DOC_DEF;
// NUSS: 12 dígitos = provincia (2) + número (8) + control (2); control = (provincia·10^8 + número) mod 97 (o ·10^7 si número < 10^7)
function nusOk(n){const d=String(n||'').replace(/\D/g,'');if(d.length!==12)return false;const p=+d.slice(0,2),x=+d.slice(2,10),c=+d.slice(10);
  const base=x<1e7?p*1e7+x:p*1e8+x;return base%97===c}
const nusFmt=n=>{const d=String(n||'').replace(/\D/g,'');return d.length===12?d.slice(0,2)+' '+d.slice(2,10)+' '+d.slice(10):String(n||'')};
const aluDocs=()=>sortedAlu().filter(([,a])=>a.estado!=='baja');
function docPend(a){return !a.nus||docReq().some(r=>!a.docs?.[r.id])}
function docTagNus(a){if(!a.nus)return'<span class="tag bad">Sin NUS</span>';return nusOk(a.nus)?'<span class="tag ok">NUS válido</span>':'<span class="tag wa" title="El dígito de control no cuadra: revisa el número">Revisar NUS</span>'}
function docChecks(id,a){return docReq().map(r=>`<label class="ck"><input type="checkbox" data-doc="${id}:${esc(r.id)}"${a.docs?.[r.id]?' checked':''}><span>${esc(r.nombre)}</span></label>`).join('')}
function openDocs(){const L=aluDocs(),R=docReq();const n=L.length,cN=L.filter(([,a])=>a.nus).length,cR=R.map(r=>L.filter(([,a])=>a.docs?.[r.id]).length);
  const pend=L.filter(([,a])=>docPend(a));
  $('#ovc').innerHTML=`<div class="row" style="justify-content:space-between"><h2 style="margin:0">Documentación del alumnado</h2><button class="sec" id="closeOv">Cerrar</button></div>
  <div class="dsum"><span><b>${cN}/${n}</b> con NUS</span>${R.map((r,i)=>`<span><b>${cR[i]}/${n}</b> ${esc(r.nombre.charAt(0).toLowerCase()+r.nombre.slice(1))}</span>`).join('')}</div>
  ${pend.length?`<div class="row" style="margin:4px 0 12px"><button class="sec" id="docMail">Escribir a los ${pend.length} pendientes</button><button class="ghost" id="docCopy">Copiar sus emails</button></div>`:'<p class="info">Todo el alumnado tiene la documentación completa.</p>'}
  <div class="dlist">${L.map(([id,a])=>`<div class="drow${docPend(a)?'':' dok'}"><div class="dname"><b>${esc(a.nombre)}</b>${docTagNus(a)}</div>
    <input class="dnus" data-nus="${id}" value="${esc(nusFmt(a.nus))}" placeholder="NUS (12 dígitos)" inputmode="numeric" aria-label="NUS de ${esc(a.nombre)}">
    <div class="dck">${docChecks(id,a)}</div></div>`).join('')}</div>
  <details style="margin-top:14px"><summary class="note" style="cursor:pointer">Requisitos que se marcan (puedes añadir otros documentos)</summary>
    <div style="display:grid;gap:6px;margin-top:8px">${R.map((r,i)=>`<div class="row"><input data-dreq="${i}" value="${esc(r.nombre)}" style="flex:1;margin:0"><button class="ghost" data-dreqdel="${i}" aria-label="Quitar requisito">Quitar</button></div>`).join('')}
    <div class="row"><input id="dReqNew" placeholder="Nuevo requisito, p. ej. «Anexo de protección de datos firmado»" style="flex:1;margin:0"><button class="sec" id="dReqAdd">Añadir</button></div></div></details>`;
  $('#ov').classList.add('on')}
const correosPend=()=>aluDocs().filter(([,a])=>docPend(a)).map(([,a])=>a.email||a.email2).filter(Boolean);
document.addEventListener('change',ev=>{const t=ev.target;
  if(t.dataset.doc){const[i,k]=[t.dataset.doc.slice(0,t.dataset.doc.indexOf(':')),t.dataset.doc.slice(t.dataset.doc.indexOf(':')+1)];const a=S.alu[i];if(!a)return;(a.docs??={})[k]=t.checked;if(!t.checked)delete a.docs[k];save('alumnos',i);
    if(t.closest('#ovc'))openDocs();else render();return}
  if(t.dataset.nus){const a=S.alu[t.dataset.nus];if(!a)return;a.nus=t.value.replace(/\D/g,'');save('alumnos',t.dataset.nus);if(a.nus&&!nusOk(a.nus))toast('Ese NUS no cuadra con su dígito de control: revísalo');openDocs();return}
  if(t.dataset.dreq!=null){const R=[...docReq()];R[+t.dataset.dreq]={...R[+t.dataset.dreq],nombre:t.value.trim()||R[+t.dataset.dreq].nombre};S.aj.docReq=R;saveCfg('ajustes',S.aj);openDocs()}});
document.addEventListener('click',ev=>{const t=ev.target.closest('#docA,#docMail,#docCopy,#dReqAdd,[data-dreqdel]');if(!t)return;
  if(t.id==='docA')return openDocs();
  if(t.id==='dReqAdd'){const v=$('#dReqNew').value.trim();if(!v)return;S.aj.docReq=[...docReq(),{id:'r'+Date.now().toString(36),nombre:v}];saveCfg('ajustes',S.aj);openDocs();return}
  if(t.dataset.dreqdel!=null){if(!t.dataset.ok){t.dataset.ok=1;t.textContent='¿Seguro?';return}const R=[...docReq()];R.splice(+t.dataset.dreqdel,1);S.aj.docReq=R;saveCfg('ajustes',S.aj);openDocs();return}
  const E=correosPend();if(!E.length)return toast('Los pendientes no tienen email en su ficha');
  if(t.id==='docCopy'){navigator.clipboard?.writeText(E.join('; ')).then(()=>toast(E.length+' email(s) copiados'),()=>toast('No se pudo copiar'));return}
  const p=plantillas().find(x=>x.id==='p7')||PLANT_DEF.find(x=>x.id==='p7'),as=p.asunto,tx=p.cuerpo.replace(/\{firma\}/g,firma()).replace(/\{nombre_alumno\}/g,'').replace(/\{[^}]+\}/g,''),c=S.aj.correo||'mailto',X=encodeURIComponent,bcc=E.join(',');
  abrirURL(c==='outlook'?`https://outlook.office.com/mail/deeplink/compose?bcc=${X(bcc)}&subject=${X(as)}&body=${X(tx)}`:c==='gmail'?`https://mail.google.com/mail/?view=cm&fs=1&bcc=${X(bcc)}&su=${X(as)}&body=${X(tx)}`:`mailto:?bcc=${X(bcc)}&subject=${X(as)}&body=${X(tx)}`)});

boot();

}
