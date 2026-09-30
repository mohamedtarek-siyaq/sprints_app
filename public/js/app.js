const $=s=>document.querySelector(s);
function h(t,a,...k){const e=document.createElement(t);for(const[n,v]of Object.entries(a||{})){if(v==null||v===false)continue;if(n==='on')for(const[ev,f]of Object.entries(v))e.addEventListener(ev,f);else if(n==='class')e.className=v;else e.setAttribute(n,v)}for(const c of k.flat())if(c!=null&&c!==false)e.append(c.nodeType?c:document.createTextNode(c));return e}
const DN=['Su','Mo','Tu','We','Th','Fr','Sa'],WS=0; // week starts Sunday (work week Sun–Thu)
let me,G=null,M={},N=[],C=[],notified=new Set(),names={},first=true,tt,prev={},view='',poll,HIST=null,tab='now',LAST={},lastFocus,lastSig='',offline=false;
const put=(el,...k)=>el.replaceChildren(...k.filter(Boolean));
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('s');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('s'),2600)}
function modal(title,...body){const m=$('#modal');lastFocus=document.activeElement;m.replaceChildren(h('div',{class:'box',role:'dialog','aria-modal':'true','aria-labelledby':'mt'},h('strong',{id:'mt'},title),...body));m.classList.add('open');const f=m.querySelector('input,textarea,select,button');f&&f.focus()}
document.addEventListener('keydown',e=>{const m=$('#modal');if(e.key!=='Tab'||!m.classList.contains('open'))return;const f=[...m.querySelectorAll('button,input,textarea,select,a[href]')].filter(x=>!x.disabled);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
function closeM(){$('#modal').classList.remove('open')}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeM()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeM()});
function theme(){const r=document.documentElement,d=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);r.dataset.theme=d?'light':'dark';try{localStorage.setItem('th',r.dataset.theme)}catch(e){}}
try{const t=localStorage.getItem('th');if(t)document.documentElement.dataset.theme=t}catch(e){}

function wk(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()-WS+7)%7);return d.getTime()}
function stats(m){const w=wk(),ss=((m&&m.sessions)||[]).filter(s=>s.s>=w);const mins=ss.reduce((a,s)=>a+s.m,0);const days=new Set(ss.map(s=>new Date(s.s).getDay()));
 const today=(new Date().getDay()-WS+7)%7,ds=G.days,before=ds.filter(d=>(d-WS+7)%7<today).length;
 const exp=G.goal*before/Math.max(ds.length,1);
 const st=mins>=G.goal?'done':mins<exp?'behind':'ok';return{mins,days,st}}
function nm(uid){const ids=G.members,n=names[uid]||'Someone';const same=ids.filter(i=>(names[i]||'Someone')===n);return same.length>1?n+' ('+(same.indexOf(uid)+1)+')':n}
async function api(a,d){
 const app = $('#app'), bg = a !== 'state';
 if (bg && app) { app.style.pointerEvents = 'none'; app.style.opacity = '0.7'; }
 try {
  const r=await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({a,...d})});const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||'Something went wrong');e.status=r.status;throw e}return j
 } finally {
  if (bg && app) { app.style.pointerEvents = ''; app.style.opacity = '1'; }
 }
}
const mine=()=>M[me.id]||{sessions:[],course:null,running:null,cheat:null};
async function save(patch){const old=M[me.id];M[me.id]={...mine(),...patch};render();try{await api('save',{patch})}catch(e){M[me.id]=old;render();toast(e.message)}}

function ring(p,uid){const c=2*Math.PI*26,s=h('span');s.innerHTML='<svg class="ring" role="img" aria-label="Weekly progress" width="64" height="64" viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="26"/><circle class="fg" cx="32" cy="32" r="26" transform="rotate(-90 32 32)" stroke-dasharray="'+c+'" stroke-dashoffset="'+c*(1-Math.min(prev[uid]||0,1))+'"/></svg>';const f=s.querySelector('.fg');requestAnimationFrame(()=>requestAnimationFrame(()=>f.style.strokeDashoffset=c*(1-Math.min(p,1))));prev[uid]=p;return s}
const fmt=m=>m>=60?Math.floor(m/60)+'h '+(m%60)+'m':m+'m';

function card(uid){const m=M[uid]||{sessions:[],course:null,running:null,cheat:null},s=stats(m),own=uid===me.id,c=m.course;
 const label={done:'✓ Done',ok:'○ On track',behind:'! Behind'}[s.st];
 const acts=[];
 if(own){
  if(!c||c.status==='complete')acts.push(h('button',{class:'p',on:{click:courseForm}},c?'Start new course':'Add your course'));
  else{
   acts.push(...timerBtns(m.running));
   acts.push(h('button',{on:{click:()=>add(15)}},'+15'),h('button',{on:{click:()=>add(30)}},'+30'),h('button',{on:{click:manual}},'Manual'));
   acts.push(h('button',{on:{click:cheatForm}},m.cheat?'Cheat sheet ✓':'Add cheat sheet'));
   acts.push(h('button',{disabled:m.cheat?null:'',title:m.cheat?'':'Attach a cheat sheet first',on:{click:complete}},'Mark complete'));
  }
 }else{
  if(s.st==='behind')acts.push(h('button',{on:{click:()=>nudge(uid)}},'👋 Nudge'));
  if(m.cheat)acts.push(h('button',{on:{click:()=>viewCheat(uid)}},'View cheat sheet'));
 }
 if(own)acts.push(h('button',{on:{click:pgForm}},'🎯 My goal'));else acts.push(h('button',{on:{click:()=>cheer(uid)}},'👏 Cheer'));
 return h('div',{class:'card'},
  h('div',{class:'top'},ring(s.mins/G.goal,uid),h('div',{},
   h('div',{class:'name'},nm(uid)+(own?' (you)':'')),
   h('div',{class:'sub'},c?c.title+(c.domain?' · '+c.domain:'')+(c.status==='complete'?' — completed':''):'No course yet'),
   h('div',{class:'sub'},fmt(s.mins)+' of '+fmt(G.goal)),m.pg&&m.pg.text?h('div',{class:'sub'},'🎯 '+m.pg.text):null,
   h('span',{class:'tag'},label),' ',m.cheers?h('span',{class:'tag'},'👏 '+m.cheers):null,' ',m.running?h('span',{class:'tag live','data-uid':uid},runLabel(uid)):null)),
  h('div',{class:'dots'},G.days.slice().sort((a,b)=>((a-WS+7)%7)-((b-WS+7)%7)).map(d=>h('div',{class:'dot'+(s.days.has(d)?' on':'')},DN[d]))),
  h('div',{class:'row'},acts))}

function render(){
 const a=$('#app');if(!G){return}
 if(document.activeElement&&document.activeElement.tagName==='SELECT'&&a.contains(document.activeElement))return;
 const lead=G.leaderId===me.id,live=Object.values(M).flat().length;
 const feed=[];for(const uid of G.members)for(const s of ((M[uid]||{}).sessions||[]))if(Date.now()-s.s<6048e5)feed.push({uid,...s,c:(M[uid].course||{}).title});
 feed.sort((x,y)=>y.s-x.s);
 put(a,
  h('header',{},h('div',{},h('h1',{},G.name),h('div',{class:'sub'},'Invite code: '+G.code+' · goal '+fmt(G.goal)+'/week')),
   h('div',{class:'row'},
    h('button',{on:{click:bell}},'🔔 '+(N.length+C.length)),
    nav(),lead?h('button',{on:{click:goalForm}},'Edit goal'):null,
    h('button',{on:{click:()=>{try{navigator.clipboard.writeText(G.code);toast('Code copied')}catch(e){toast(G.code)}}}},'Copy code'),
    h('button',{on:{click:theme}},'◐ Theme'),h('button',{'aria-label':'Settings',on:{click:settings}},'⚙'),h('button',{on:{click:logout}},'Log out'))),
  tab==='now'&&recap(),
  tab==='hist'?histView():tab==='board'?boardView():h('div',{class:'grid'},G.members.map(card)),
  tab==='now'&&h('h2',{},'Recent activity'),
  tab==='now'&&h('div',{class:'feed'},feed.length?feed.slice(0,8).map(f=>h('div',{},nm(f.uid)+' logged '+fmt(f.m)+(f.c?' · '+f.c:'')+' — '+new Date(f.s).toLocaleDateString(undefined,{weekday:'short'}))):h('div',{class:'sub'},'Nothing logged yet this week. Be the first.')))
 tick()}

const PRE={'25/5':[25,5],'50/10':[50,10],'90/15':[90,15]};let pre='25/5',lb='week';
const adv=(r,now)=>{if(!r||!r.pomo)return r;r={...r};
 if(r.ph==='work'&&now>=r.pt+r.pomo.w*6e4){const e=r.pt+r.pomo.w*6e4;r.acc+=e-r.seg;r.seg=null;r.ph='break';r.pt=e}
 if(r.ph==='break'&&now>=r.pt+r.pomo.b*6e4){r.pt+=r.pomo.b*6e4;r.ph='ready'}
 return r};
const studied=(r,now)=>r.acc+(r.seg?now-r.seg:0);
const mmss=ms=>{const t=Math.max(0,Math.ceil(ms/1e3));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
function runLabel(uid){const now=Date.now(),r=adv((M[uid]||{}).running,now);if(!r)return'';const t=fmt(Math.floor(studied(r,now)/6e4));
 if(r.pomo){if(r.ph==='work')return'🍅 focus '+mmss(r.pt+r.pomo.w*6e4-now)+' · '+t;if(r.ph==='break')return'☕ break '+mmss(r.pt+r.pomo.b*6e4-now)+' · '+t;return'☕ next round? · '+t}
 return r.seg?'● studying now · '+t:'⏸ on a break · '+t}
const setRun=r=>save({running:r});
function start(){const n=Date.now();setRun({s:n,acc:0,seg:n,pomo:null})}
function startPomo(){const[w,b]=PRE[pre],n=Date.now();setRun({s:n,acc:0,seg:n,pomo:{w,b},ph:'work',pt:n})}
function pause(){const r=mine().running,n=Date.now();setRun({...r,acc:r.acc+n-r.seg,seg:null})}
function resume(){setRun({...mine().running,seg:Date.now()})}
function nextRound(){const n=Date.now();setRun({...adv(mine().running,n),seg:n,ph:'work',pt:n})}
function stop(){const r0=mine().running;if(!r0)return;const n=Date.now(),r=adv(r0,n),raw=Math.round(studied(r,n)/6e4),m=Math.min(240,raw);
 M[me.id]={...mine(),running:null,sessions:m>0?[...mine().sessions,{s:r0.s,m}]:mine().sessions};render();
 if(m>0)api('log',{s:r0.s,m,stop:1}).catch(e=>toast(e.message));else save({running:null});
 toast(raw>240?'Timer ran long — capped at 4h':m>0?'Logged '+fmt(m):'Under a minute — not logged')}
function timerBtns(r0){const r=adv(r0,Date.now());
 if(!r0)return[h('button',{class:'p',on:{click:start}},'▶ Start timer'),h('button',{on:{click:startPomo}},'🍅 Pomodoro'),(()=>{const s=h('select',{style:'width:auto',title:'Focus / break minutes'},Object.keys(PRE).map(k=>h('option',{value:k,selected:k===pre?'':null},k)));s.addEventListener('change',()=>{pre=s.value});return s})()];
 const o=[];
 if(r.pomo){if(r.ph==='ready')o.push(h('button',{class:'p',on:{click:nextRound}},'▶ Next round'));else if(r.ph==='break')o.push(h('button',{on:{click:nextRound}},'Skip break'))}
 else o.push(r.seg?h('button',{on:{click:pause}},'⏸ Break'):h('button',{class:'p',on:{click:resume}},'▶ Resume'));
 o.push(h('button',{on:{click:stop}},'■ Stop & log'));return o}
function tick(){if(!me||!G)return;const now=Date.now();document.querySelectorAll('[data-uid]').forEach(e=>{e.textContent=runLabel(e.dataset.uid)});
 const r=mine().running;if(r&&r.pomo){const q=adv(r,now);if(q.ph!==r.ph){setRun(q);toast(q.ph==='break'?'☕ Focus round done — take a break':'🍅 Break over — ready for the next round');try{navigator.vibrate&&navigator.vibrate(200)}catch(e){}}}}
setInterval(tick,1000);
function pgForm(){const t=h('input',{maxlength:120,placeholder:'e.g. Finish the SQL course by Thursday'});t.value=(mine().pg||{}).text||'';modal('My goal',h('div',{class:'sub'},'Your teammates see this on your card and can cheer you on.'),t,h('div',{class:'row'},h('button',{class:'p',on:{click:()=>{save({pg:{text:t.value.trim().slice(0,120)}});closeM()}}},'Save'),h('button',{on:{click:closeM}},'Cancel')));t.focus()}
async function cheer(uid){try{const r=await api('cheer',{to:uid});toast(r.already?'You already cheered '+nm(uid)+' today':'👏 Cheered '+nm(uid));refresh()}catch(e){toast(e.message)}}
const nav=()=>[['now','Team'],['board','🏆 Board'],['hist','History']].map(([t,l])=>h('button',{class:tab===t?'p':'',on:{click:()=>{tab=t;t==='now'?render():loadHist()}}},l));
const wkOf=t=>{const d=new Date(+t);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()-WS+7)%7);return d.getTime()};
function aggr(){const W={},T={};for(const x of HIST.sessions){const w=wkOf(x.s),m=Number(x.m);W[w]=W[w]||{};W[w][x.uid]=(W[w][x.uid]||0)+m;T[x.uid]=(T[x.uid]||0)+m}return{W,T,weeks:Object.keys(W).map(Number).sort((a,b)=>b-a)}}
function boardView(){if(!HIST)return h('p',{class:'sub'},'Loading leaderboard…');
 const{W,T,weeks}=aggr(),cur=wk(),goal=G.goal;
 const rows=G.members.map(uid=>{const wm=(W[cur]||{})[uid]||0;let met=0;for(const w of weeks)if(((W[w]||{})[uid]||0)>=goal)met++;
  let streak=0;for(let w=cur,i=0;i<520;i++){const v=(W[w]||{})[uid]||0;if(v>=goal)streak++;else if(w!==cur)break;const d=new Date(w);d.setDate(d.getDate()-7);w=d.getTime()}
  const done=HIST.done.filter(d=>d.uid===uid).length;
  const best=Math.max(0,...weeks.map(w=>(W[w]||{})[uid]||0));
  return{uid,wm,streak,done,best,wp:wm+(wm>=goal?60:0),ap:(T[uid]||0)+60*met+100*done}});
 const key=lb==='week'?'wp':'ap';rows.sort((a,b)=>b[key]-a[key]);const top=Math.max(1,rows[0][key]),medal=['🥇','🥈','🥉'];
 return h('div',{},
  h('div',{class:'row',style:'margin-bottom:12px'},h('button',{class:lb==='week'?'p':'',on:{click:()=>{lb='week';render()}}},'This week'),h('button',{class:lb==='all'?'p':'',on:{click:()=>{lb='all';render()}}},'All time')),
  h('div',{class:'grid',style:'grid-template-columns:1fr'},rows.map((r,i)=>h('div',{class:'card',style:r.uid===me.id?'border-color:var(--pr)':''},
   h('div',{class:'row',style:'justify-content:space-between'},h('span',{class:'name'},(medal[i]||'#'+(i+1))+'  '+nm(r.uid)+(r.uid===me.id?' (you)':'')),h('strong',{},r[key]+' pts')),
   h('div',{style:'height:6px;border-radius:99px;background:var(--ol);margin:8px 0'},h('div',{style:'height:100%;border-radius:99px;background:var(--pr);transition:width .6s;width:'+Math.round(r[key]/top*100)+'%'})),
   h('div',{class:'sub'},fmt(r.wm)+' this week'+(r.streak?' · 🔥 '+r.streak+'-week streak':'')+' · best week '+fmt(r.best)+' · '+r.done+' course'+(r.done===1?'':'s')+' completed')))),
  h('p',{class:'sub'},'Points: 1 per minute studied, +60 for each week the goal is met, +100 per completed course.'))}
function add(m){const s=Date.now();M[me.id]={...mine(),sessions:[...mine().sessions,{s,m}]};render();api('log',{s,m}).catch(e=>toast(e.message));toast('+'+m+' min')}
function manual(){const i=h('input',{type:'number',min:1,max:600,placeholder:'Minutes'});modal('Log time',i,h('div',{class:'row'},h('button',{class:'p',on:{click:()=>{const v=Math.round(+i.value);if(v>0&&v<=600){add(v);closeM()}}}},'Save'),h('button',{on:{click:closeM}},'Cancel')));i.focus()}
function courseForm(){const t=h('input',{placeholder:'Course title'}),d=h('input',{placeholder:'Domain (e.g. Data, Law, Design)'});modal('Your course',t,d,h('div',{class:'row'},h('button',{class:'p',on:{click:()=>{if(!t.value.trim())return;save({course:{title:t.value.trim().slice(0,80),domain:d.value.trim().slice(0,40),status:'active'},cheat:null});closeM()}}},'Save'),h('button',{on:{click:closeM}},'Cancel')));t.focus()}
function complete(){const m=mine();if(!m.cheat)return;save({course:{...m.course,status:'complete',completedAt:Date.now()}});toast('Course complete 🎉')}
function settings(){const lead=G.leaderId===me.id;
 const mem=lead?[h('strong',{},'Members'),...G.members.filter(u=>u!==me.id).map(u=>h('div',{class:'row',style:'justify-content:space-between'},h('span',{},nm(u)),h('span',{class:'row'},h('button',{on:{click:()=>lead2('promote',u,'Make '+nm(u)+' the leader? You will become a regular member.')}},'Make leader'),h('button',{on:{click:()=>reset(u)}},'Reset password'),h('button',{on:{click:()=>lead2('remove',u,'Remove '+nm(u)+' from the group?')}},'Remove'))))]:[];
 modal('Settings',h('button',{on:{click:pwForm}},'Change password'),h('button',{on:{click:exportCsv}},'Export my data (CSV)'),h('button',{on:{click:leave}},'Leave group'),...mem,h('button',{class:'p',on:{click:closeM}},'Close'))}
async function lead2(a,u,msg){if(!confirm(msg))return;try{await api(a,{to:u});closeM();refresh();toast('Done')}catch(e){toast(e.message)}}
async function reset(u){if(!confirm('Reset the password for '+nm(u)+'?'))return;try{const r=await api('resetpw',{to:u});modal('Temporary password',h('div',{},nm(u)+' can log in with:'),h('code',{style:'font-size:20px;user-select:all'},r.temp),h('div',{class:'sub'},'Share it privately. They should change it in Settings after logging in.'),h('button',{class:'p',on:{click:closeM}},'Done'))}catch(e){toast(e.message)}}
async function leave(){if(!confirm('Leave this group? Your history is kept if you rejoin.'))return;try{await api('leave');closeM();tab='now';HIST=null;view='';refresh()}catch(e){toast(e.message)}}
function pwForm(){const o=h('input',{type:'password',placeholder:'Current password'}),n=h('input',{type:'password',placeholder:'New password (6+ characters)'});modal('Change password',o,n,h('div',{class:'row'},h('button',{class:'p',on:{click:async()=>{try{await api('passwd',{old:o.value,new:n.value});closeM();toast('Password changed')}catch(e){toast(e.message)}}}},'Save'),h('button',{on:{click:closeM}},'Cancel')))}
async function exportCsv(){try{const H=HIST||await api('history');const rows=['started_at,minutes',...H.sessions.filter(x=>x.uid===me.id).map(x=>new Date(+x.s).toISOString()+','+x.m)];const a=h('a',{href:URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})),download:'cohort-my-sessions.csv'});document.body.append(a);a.click();a.remove()}catch(e){toast(e.message)}}
function mySess(){const mine=HIST.sessions.filter(x=>x.uid===me.id).slice(-15).reverse();
 return h('div',{},h('h2',{},'My recent sessions'),mine.length?h('div',{class:'feed'},mine.map(x=>h('div',{class:'row',style:'justify-content:space-between'},h('span',{},new Date(+x.s).toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' · '+fmt(Number(x.m))),h('span',{class:'row'},h('button',{on:{click:()=>editS(x)}},'Edit'),h('button',{on:{click:()=>delS(x)}},'Delete'))))):h('div',{class:'sub'},'No sessions yet.'))}
async function reloadHist(){HIST=await api('history');render();refresh()}
function editS(x){const i=h('input',{type:'number',min:1,max:600,value:String(x.m)});modal('Edit session',h('div',{class:'sub'},'Change the minutes studied.'),i,h('div',{class:'row'},h('button',{class:'p',on:{click:async()=>{const v=Math.round(+i.value);if(!(v>0&&v<=600))return;try{await api('editsession',{s:x.s,m:v});closeM();await reloadHist()}catch(e){toast(e.message)}}}},'Save'),h('button',{on:{click:closeM}},'Cancel')))}
async function delS(x){if(!confirm('Delete this session?'))return;try{await api('delsession',{s:x.s});await reloadHist()}catch(e){toast(e.message)}}
function chart(W,uid){const cur=wk(),pts=[];let w=cur;for(let i=0;i<12;i++){pts.unshift({w,v:(W[w]||{})[uid]||0});const d=new Date(w);d.setDate(d.getDate()-7);w=d.getTime()}
 const mx=Math.max(G.goal,...pts.map(p=>p.v))*1.1,bw=36,ww=pts.length*(bw+6),gy=110-Math.round(G.goal/mx*100);
 const bars=pts.map((p,i)=>{const ht=Math.max(1,Math.round(p.v/mx*100));return '<rect x="'+(i*(bw+6)+3)+'" y="'+(110-ht)+'" width="'+bw+'" height="'+ht+'" rx="3" fill="'+(p.v>=G.goal?'var(--pr)':'var(--sec)')+'" stroke="var(--ol)"/>'}).join('');
 const s=h('div',{style:'overflow-x:auto'});s.innerHTML='<svg viewBox="0 0 '+ww+' 116" width="100%" style="min-width:'+ww+'px;max-height:160px" role="img" aria-label="Your weekly study minutes for the last 12 weeks; dark bars met the goal">'+bars+'<line x1="0" x2="'+ww+'" y1="'+gy+'" y2="'+gy+'" stroke="var(--tx)" stroke-dasharray="4 4" opacity=".5"/><text x="4" y="'+(gy-4)+'" font-size="10" fill="var(--tx)">goal</text></svg>';return s}
function recap(){const ids=G.members,met=ids.filter(u=>(LAST[u]||0)>=G.goal),top=ids.slice().sort((a,b)=>(LAST[b]||0)-(LAST[a]||0))[0];if(!(LAST[top]>0))return null;
 return h('div',{class:'card',style:'margin-bottom:12px'},h('strong',{},'Last week'),h('div',{class:'sub'},met.length+' of '+ids.length+' hit the goal'+(met.length===ids.length?' 🎉':'')+' · top: '+nm(top)+' with '+fmt(LAST[top])))}
function fileData(file){return new Promise((res,rej)=>{if(file.type==='application/pdf'){if(file.size>1e6)return rej(new Error('PDF must be under 1 MB'));const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Could not read the file'));r.readAsDataURL(file);return}
 if(!file.type.startsWith('image/'))return rej(new Error('Choose a photo or a PDF'));const img=new Image(),u=URL.createObjectURL(file);
 img.onload=()=>{const sc=Math.min(1,1400/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);let q=.8,d=cv.toDataURL('image/jpeg',q);while(d.length>1.3e6&&q>.3){q-=.15;d=cv.toDataURL('image/jpeg',q)}d.length>1.3e6?rej(new Error('Image is too large')):res(d)};
 img.onerror=()=>rej(new Error('Could not read the image'));img.src=u})}
function cheatForm(){const k=h('select',{},h('option',{value:'note'},'Typed note'),h('option',{value:'link'},'Link'),h('option',{value:'file'},'Photo / PDF')),t=h('textarea',{rows:4,placeholder:'Your cheat sheet, or a link to it'}),f=h('input',{type:'file',accept:'image/*,application/pdf'});
 const sync=()=>{t.style.display=k.value==='file'?'none':'';f.style.display=k.value==='file'?'':'none'};k.addEventListener('change',sync);sync();const c0=mine().cheat;if(c0&&c0.kind!=='file')t.value=c0.text;
 modal('Cheat sheet',k,t,f,h('div',{class:'sub'},'Photos are shrunk automatically. PDFs up to 1 MB.'),h('div',{class:'row'},h('button',{class:'p',on:{click:async()=>{try{
  if(k.value==='file'){const file=f.files[0];if(!file)return toast('Choose a file first');const data=await fileData(file);await api('save',{patch:{cheat:{kind:'file',text:file.name,data}}});M[me.id]={...mine(),cheat:{kind:'file',text:file.name}};render()}
  else{const v=t.value.trim().slice(0,4000);if(!v)return;await save({cheat:{kind:k.value,text:v}})}
  closeM();toast('Cheat sheet attached')}catch(e){toast(e.message)}}}},'Attach'),h('button',{on:{click:closeM}},'Cancel')))}
async function viewCheat(uid){const c=(M[uid]||{}).cheat;if(!c)return;
 if(c.kind==='file'){modal('Cheat sheet · '+nm(uid),h('div',{class:'sub'},'Loading…'));try{const r=await api('cheatfile',{to:uid});modal('Cheat sheet · '+nm(uid),r.data&&r.data.startsWith('data:image')?h('img',{src:r.data,alt:c.text,style:'max-width:100%;border-radius:8px'}):h('a',{href:r.data||'#',download:c.text},'Download '+c.text),h('button',{on:{click:closeM}},'Close'))}catch(e){closeM();toast(e.message)}return}
 const ok=c.kind==='link'&&/^https?:\/\//.test(c.text);modal('Cheat sheet · '+nm(uid),ok?h('a',{href:c.text,target:'_blank',rel:'noopener noreferrer'},c.text):h('div',{style:'white-space:pre-wrap'},c.text),h('button',{on:{click:closeM}},'Close'))}
async function nudge(uid){try{const r=await api('nudge',{to:uid});toast(r.already?'Already nudged today':'Nudge sent to '+nm(uid))}catch(e){toast(e.message)}}
function bell(){modal('Notifications',...(N.length||C.length?[...N.map(n=>h('div',{},'👋 '+nm(n.from)+' nudged you')),...C.map(c=>h('div',{},'👏 '+nm(c.from)+' cheered you on'))]:[h('div',{class:'sub'},'No new notifications.')]),h('button',{on:{click:async()=>{closeM();try{await api('seen')}catch(e){}refresh()}}},'Mark all seen'))}
function goalForm(){const g=h('input',{type:'number',min:.5,max:40,step:.5,value:G.goal/60}),ds=[0,1,2,3,4,5,6].map(d=>h('label',{},h('input',{type:'checkbox',value:d,checked:G.days.includes(d)?'':null,style:'width:auto;margin-right:4px'}),DN[d]));
 modal('Weekly goal',h('label',{},'Hours per week'),g,h('div',{class:'row'},ds),h('div',{class:'row'},h('button',{class:'p',on:{click:async()=>{const days=ds.map(l=>l.firstChild).filter(i=>i.checked).map(i=>+i.value);if(!days.length||!(g.value>0))return toast('Pick a goal and at least one day');try{await api('goal',{goal:Math.round(g.value*60),days});closeM();refresh()}catch(e){toast(e.message)}}}},'Save'),h('button',{on:{click:closeM}},'Cancel')))}

function histView(){if(!HIST)return h('p',{class:'sub'},'Loading history…');
 const ids=G.members,{W,T,weeks}=aggr(),pd='padding:6px 8px;';
 const cell=v=>h('td',{style:pd+'text-align:right'},v?fmt(v):'–'),th=t=>h('th',{style:pd+'text-align:right;font-weight:600'},t);
 return h('div',{},h('h2',{},'My last 12 weeks'),chart(W,me.id),h('h2',{},'Weekly totals (all time)'),
  weeks.length?h('div',{style:'overflow-x:auto'},h('table',{style:'border-collapse:collapse;width:100%'},
   h('tr',{},h('th',{style:pd+'text-align:left'},'Week of'),ids.map(i=>th(nm(i))),th('Goal met')),
   weeks.map(w=>h('tr',{style:'border-top:1px solid var(--ol)'},h('td',{style:pd},new Date(w).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})),ids.map(i=>cell(W[w][i])),h('td',{style:pd+'text-align:right'},ids.filter(i=>(W[w][i]||0)>=G.goal).length+'/'+ids.length))),
   h('tr',{style:'border-top:2px solid var(--pr);font-weight:600'},h('td',{style:pd},'All time'),ids.map(i=>cell(T[i])),h('td')))):h('div',{class:'sub'},'No study time logged yet.'),
  mySess(),h('h2',{},'Completed courses'),
  HIST.done.length?h('div',{class:'feed'},HIST.done.map(d=>h('div',{},nm(d.uid)+' — '+d.title+(d.domain?' · '+d.domain:'')+' — '+new Date(+d.at).toLocaleDateString()+(d.cheat_name?' — 📄 '+d.cheat_name:'')))):h('div',{class:'sub'},'None yet.'))}
async function loadHist(){render();try{HIST=await api('history')}catch(e){toast(e.message)}render()}
function gate(){
 const n=h('input',{placeholder:'Group name'}),c=h('input',{placeholder:'Invite code'});
 const go=(a,d)=>async()=>{try{await api(a,d());view='';refresh()}catch(e){toast(e.message)}};
 $('#app').replaceChildren(h('header',{},h('h1',{},'Cohort'),h('button',{on:{click:logout}},'Log out')),h('p',{class:'sub'},'Study together. Small weekly goal, everyone can see progress.'),
  h('div',{class:'grid'},
   h('div',{class:'card',style:'display:grid;gap:10px'},h('strong',{},'Create a group'),n,h('button',{class:'p',on:{click:go('create',()=>({name:n.value}))}},'Create')),
   h('div',{class:'card',style:'display:grid;gap:10px'},h('strong',{},'Join with a code'),c,h('button',{class:'p',on:{click:go('join',()=>({code:c.value}))}},'Join'))))}
function auth(){clearInterval(poll);me=null;view='auth';
 const u=h('input',{placeholder:'Username',autocomplete:'username'}),p=h('input',{type:'password',placeholder:'Password (6+ characters)',autocomplete:'current-password'});
 const go=a=>async()=>{try{await api(a,{username:u.value,password:p.value});begin()}catch(e){toast(e.message)}};
 p.addEventListener('keydown',e=>{if(e.key==='Enter')go('login')()});
 $('#app').replaceChildren(h('header',{},h('h1',{},'Cohort')),h('div',{class:'card',style:'display:grid;gap:10px;max-width:340px'},u,p,h('div',{class:'row'},h('button',{class:'p',on:{click:go('login')}},'Log in'),h('button',{on:{click:go('signup')}},'Sign up'))))}
async function logout(){try{await api('logout')}catch(e){}G=null;M={};N=[];auth()}
async function refresh(){try{const d0=new Date(wk());d0.setDate(d0.getDate()-7);const s=await api('state',{w0:d0.getTime(),w1:wk()});me=s.me;if(offline){offline=false;toast('Back online')}
 if(!s.group){G=null;lastSig='';if(view!=='gate'){view='gate';gate()}return}
 const sig=JSON.stringify([s.group,s.members,s.nudges,s.last]);if(view==='app'&&G&&sig===lastSig)return;lastSig=sig;
 view='app';G={...s.group,members:s.members.map(m=>m.uid)};M={};names={};LAST=s.last||{};s.members.forEach(m=>{M[m.uid]=m;names[m.uid]=m.name});
 if(!first){
  let toNotify=[];
  (s.nudges||[]).forEach(n=>{if(!notified.has('n_'+n.id)){notified.add('n_'+n.id);toNotify.push('👋 '+nm(n.from)+' nudged you');}});
  (s.newCheers||[]).forEach(c=>{if(!notified.has('c_'+c.id)){notified.add('c_'+c.id);toNotify.push('👏 '+nm(c.from)+' cheered you on');}});
  if(toNotify.length){
   toNotify.forEach((msg,i)=>setTimeout(()=>toast(msg),i*3000));
   try{const actx=new(window.AudioContext||window.webkitAudioContext)();const osc=actx.createOscillator(),gain=actx.createGain();osc.connect(gain);gain.connect(actx.destination);osc.type='sine';osc.frequency.setValueAtTime(523.25,actx.currentTime);osc.frequency.setValueAtTime(659.25,actx.currentTime+0.1);gain.gain.setValueAtTime(0,actx.currentTime);gain.gain.linearRampToValueAtTime(0.3,actx.currentTime+0.05);gain.gain.exponentialRampToValueAtTime(0.01,actx.currentTime+0.5);osc.start(actx.currentTime);osc.stop(actx.currentTime+0.5)}catch(e){}
  }
 }
 first=false;N=s.nudges||[];C=s.newCheers||[];render()}
 catch(e){if(e.status===401)auth();else if(!offline){offline=true;toast('Connection problem — retrying…')}}}
function begin(){clearInterval(poll);lastSig='';view='';refresh();poll=setInterval(()=>{if(!document.hidden&&me)refresh()},8000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&me)refresh()});
begin();
