const $=id=>document.getElementById(id);
const S={levels:[],i:0,coins:0,hint:10,hammer:5,words:[],all:new Set(),found:new Set(),bonus:new Set(),cells:new Map(),letters:[],pos:[],sel:[],drag:false,hm:false,rows:0,cols:0,done:false};
const wheel=$("wheel"),cv=$("path"),cx=cv.getContext("2d");
const save=()=>{try{localStorage.setItem("pop10",JSON.stringify({i:S.i,coins:S.coins,hint:S.hint,hammer:S.hammer}))}catch(e){}};
const msg=t=>{$("msg").textContent=t};
const mix=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

async function init(){
 try{const r=await fetch("data/levels.json");S.levels=(await r.json()).levels;
  try{Object.assign(S,JSON.parse(localStorage.getItem("pop10"))||{})}catch(e){}
  if(!S.levels[S.i])S.i=0;load();addEventListener("resize",()=>{buildWheel();drawBoard()})}
 catch(e){msg("Seviyeler yüklenemedi: "+e.message)}}

function load(){
 const L=S.levels[S.i],all=[...new Set([3,4,5,6].flatMap(n=>L.words[n]||[]))];
 const lay=layout(all,L.id*977+13);
 S.all=new Set(all);S.words=lay.words;S.rows=lay.rows;S.cols=lay.cols;
 S.found=new Set();S.bonus=new Set();S.cells=new Map();S.done=false;S.hm=false;
 S.words.forEach(o=>[...o.w].forEach((ch,k)=>{const key=(o.r+(o.d?k:0))+","+(o.c+(o.d?0:k));if(!S.cells.has(key))S.cells.set(key,{ch,on:false})}));
 S.letters=mix(L.letters);msg("");$("levelNumber").textContent=L.id;setBg(L.id);
 buildWheel();drawBoard();ui();save()}

function setBg(id){
 const t=S.bgT=(S.bgT||0)+1,tries=[`image/${id}.jpg`,`image/${id}.png`,`image/default.jpg`,`image/default.png`];
 document.body.style.background="";
 const next=()=>{const u=tries.shift();if(!u||t!==S.bgT)return;
  const im=new Image();im.onload=()=>{if(t===S.bgT)document.body.style.background=`url(${u}) center/cover no-repeat`};im.onerror=next;im.src=u};
 next()}

function drawBoard(){
 const b=$("board");b.innerHTML="";b.classList.toggle("pick",S.hm);
 const cs=Math.max(24,Math.min(54,Math.floor((innerWidth-28-(S.cols-1)*4)/S.cols),Math.floor((b.clientHeight-(S.rows-1)*4)/S.rows)));
 b.style.setProperty("--cs",cs+"px");
 b.style.gridTemplateColumns=`repeat(${S.cols},${cs}px)`;b.style.gridAutoRows=cs+"px";
 for(let r=0;r<S.rows;r++)for(let c=0;c<S.cols;c++){
  const d=document.createElement("div"),cell=S.cells.get(r+","+c);
  if(cell){d.className="cell"+(cell.on?" on":"");d.dataset.k=r+","+c;if(cell.on)d.textContent=cell.ch}
  b.appendChild(d)}}

$("board").addEventListener("click",e=>{
 const k=e.target.dataset.k;if(!S.hm||!k||S.cells.get(k).on)return;
 S.hm=false;$("hammerBtn").classList.remove("act");drawBoard();S.hammer--;reveal(k)});

function reveal(k){
 const c=S.cells.get(k);if(!c||c.on)return;c.on=true;
 const el=document.querySelector(`[data-k="${k}"]`);if(el){el.textContent=c.ch;el.classList.add("on")}
 S.words.forEach(o=>{if(S.found.has(o.w))return;
  const ok=[...o.w].every((_,j)=>S.cells.get((o.r+(o.d?j:0))+","+(o.c+(o.d?0:j))).on);
  if(ok)S.found.add(o.w)});
 ui();save();
 if(!S.done&&S.found.size===S.words.length){S.done=true;S.coins+=10;msg("Bölüm tamamlandı! +10");ui();save();
  setTimeout(()=>{if(S.i<S.levels.length-1){S.i++;load()}},1600)}}

function revealWord(w){const o=S.words.find(x=>x.w===w);
 [...w].forEach((_,j)=>reveal((o.r+(o.d?j:0))+","+(o.c+(o.d?0:j))))}

function submit(w){
 if(S.found.has(w))return msg("Bu kelime zaten bulundu");
 if(S.words.some(o=>o.w===w)){S.coins+=2;msg("Doğru! +2");revealWord(w)}
 else if(S.all.has(w)){if(S.bonus.has(w))msg("Bonus kelime zaten bulundu");else{S.bonus.add(w);S.coins++;msg("Bonus kelime! +1");ui();save()}}
 else msg("Bu kelime listede yok")}

function ui(){
 $("coins").textContent=S.coins;$("hintN").textContent=S.hint;$("hammerN").textContent=S.hammer;
 $("progressText").textContent=S.found.size+"/"+S.words.length;
 const tot=S.all.size-S.words.length;$("bonusN").textContent=S.bonus.size;
 $("bonus").style.setProperty("--p",tot?100*S.bonus.size/tot:0)}

// ---- Harf çarkı ----
function buildWheel(){
 const W=Math.round(Math.min(innerWidth*.72,300));
 $("app").style.setProperty("--w",W+"px");
 const R=W/2,dx=($("app").clientWidth-28)/2-30,need=R+38;
 $("app").style.setProperty("--h",Math.ceil(Math.max(2*R+12,R+100+Math.sqrt(Math.max(0,need*need-dx*dx))))+"px");
 cv.width=W*devicePixelRatio;cv.height=W*devicePixelRatio;cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
 wheel.querySelectorAll(".letter").forEach(e=>e.remove());
 const n=S.letters.length,rad=W*.34;S.pos=[];
 S.letters.forEach((ch,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,x=W/2+Math.cos(a)*rad,y=W/2+Math.sin(a)*rad;
  S.pos.push({x,y});const e=document.createElement("div");e.className="letter";e.textContent=ch;e.style.left=x+"px";e.style.top=y+"px";wheel.appendChild(e)});
 S.sel=[];paint()}

const hit=e=>{const r=wheel.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
 return S.pos.findIndex(p=>Math.hypot(p.x-x,p.y-y)<32)};

function paint(e){
 const W=wheel.clientWidth;cx.clearRect(0,0,W,W);
 wheel.querySelectorAll(".letter").forEach((el,i)=>el.classList.toggle("on",S.sel.includes(i)));
 const w=S.sel.map(i=>S.letters[i]).join("");$("preview").textContent=w;$("preview").style.visibility=w?"visible":"hidden";
 if(!S.sel.length)return;
 cx.strokeStyle="#7c5cd6";cx.lineWidth=9;cx.lineCap=cx.lineJoin="round";cx.beginPath();
 S.sel.forEach((i,k)=>k?cx.lineTo(S.pos[i].x,S.pos[i].y):cx.moveTo(S.pos[i].x,S.pos[i].y));
 if(e&&S.drag){const r=wheel.getBoundingClientRect();cx.lineTo(e.clientX-r.left,e.clientY-r.top)}
 cx.stroke()}

wheel.addEventListener("pointerdown",e=>{const h=hit(e);if(h<0)return;S.drag=true;S.sel=[h];msg("");paint(e)});
addEventListener("pointermove",e=>{if(!S.drag)return;const h=hit(e);
 if(h>=0){const n=S.sel.length;if(h===S.sel[n-2])S.sel.pop();else if(!S.sel.includes(h))S.sel.push(h)}paint(e)});
const end=()=>{if(!S.drag)return;S.drag=false;const w=S.sel.map(i=>S.letters[i]).join("");S.sel=[];paint();
 if(w.length>=3)submit(w);else if(w.length)msg("En az 3 harf")};
addEventListener("pointerup",end);addEventListener("pointercancel",end);

// ---- Butonlar ----
$("shuffleBtn").onclick=()=>{S.letters=mix(S.letters);buildWheel()};
const spend=k=>{if(S[k]>0){S[k]--;return true}if(S.coins>=25){S.coins-=25;return true}msg("Yetersiz hak (25 altın = 1 hak)");return false};
$("hintBtn").onclick=()=>{
 const off=[...S.cells.keys()].filter(k=>!S.cells.get(k).on);if(!off.length||S.done)return;
 if(spend("hint"))reveal(off[Math.floor(Math.random()*off.length)])};
$("hammerBtn").onclick=()=>{
 if(S.done)return;if(S.hm){S.hm=false}else{if(S.hammer<=0&&S.coins<25)return msg("Yetersiz hak (25 altın = 1 hak)");
  if(S.hammer<=0){S.coins-=25;S.hammer++}S.hm=true;msg("Açmak istediğin kutuya dokun")}
 $("hammerBtn").classList.toggle("act",S.hm);drawBoard();ui()};
$("prevBtn").onclick=()=>{if(S.i>0){S.i--;load()}};
$("nextBtn").onclick=()=>{if(S.i<S.levels.length-1){S.i++;load()}};
init();
