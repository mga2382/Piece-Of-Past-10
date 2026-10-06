// Kelimelerden çapraz bulmaca yerleşimi üretir (seed'li => her seferinde aynı sonuç)
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function layout(words,seed,MAX=7,MAXW=9){
const R=rng(seed);let best=null;
for(let t=0;t<80;t++){
const g=new Map(),pl=[];let b=null;
const at=(r,c)=>g.get(r+","+c);
const fit=(w,r,c,d)=>{const dr=d,dc=1-d,n=w.length;
if(at(r-dr,c-dc)||at(r+dr*n,c+dc*n))return-1;let x=0;
for(let k=0;k<n;k++){const rr=r+dr*k,cc=c+dc*k,e=at(rr,cc);
if(e){if(e.ch!==w[k]||e.u[d])return-1;x++}else if(at(rr+dc,cc+dr)||at(rr-dc,cc-dr))return-1}
const r2=r+dr*(n-1),c2=c+dc*(n-1);
const nb=b?{a:Math.min(b.a,r),z:Math.max(b.z,r2),l:Math.min(b.l,c),m:Math.max(b.m,c2)}:{a:r,z:r2,l:c,m:c2};
if(nb.z-nb.a+1>MAX||nb.m-nb.l+1>MAX)return-1;return x};
const put=(w,r,c,d)=>{const n=w.length;
for(let k=0;k<n;k++){const rr=r+(d?k:0),cc=c+(d?0:k),key=rr+","+cc;
if(!g.has(key))g.set(key,{ch:w[k],u:[0,0]});g.get(key).u[d]=1}
const r2=r+(d?n-1:0),c2=c+(d?0:n-1);
b=b?{a:Math.min(b.a,r),z:Math.max(b.z,r2),l:Math.min(b.l,c),m:Math.max(b.m,c2)}:{a:r,z:r2,l:c,m:c2};
pl.push({w,r,c,d})};
const pool=[...words].sort((x,y)=>y.length-x.length||R()-.5);
put(pool[0],0,0,R()<.5?0:1);
const rest=pool.slice(1).sort(()=>R()-.5);
for(let pass=0;pass<2;pass++)for(const w of rest){
if(pl.length>=MAXW)break;if(pl.some(p=>p.w===w))continue;
const opts=[];
for(const[key,e]of g){const[r0,c0]=key.split(",").map(Number);
for(let k=0;k<w.length;k++)if(w[k]===e.ch)for(let d=0;d<2;d++){
const r=r0-(d?k:0),c=c0-(d?0:k);if(fit(w,r,c,d)>0)opts.push([r,c,d])}}
if(opts.length){const o=opts[Math.floor(R()*opts.length)];put(w,o[0],o[1],o[2])}}
const rows=b.z-b.a+1,cols=b.m-b.l+1,score=pl.length*10-rows*cols/4;
if(!best||score>best.score)best={score,rows,cols,words:pl.map(p=>({w:p.w,r:p.r-b.a,c:p.c-b.l,d:p.d}))}}
return best}
if(typeof module!=="undefined")module.exports={layout};
