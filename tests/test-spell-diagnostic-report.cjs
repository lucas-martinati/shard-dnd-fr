const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const previous=JSON.parse(fs.readFileSync('tests/fixtures/diagnostic-spell-descriptions-11719.json','utf8'));
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/diagnostic-spell-descriptions-11720.json','utf8'));
const cases=[...fixture.cases,...fixture.extraCases];
assert.equal(fixture.previouslyCovered,23);assert.equal(fixture.newCorrespondences,95);assert.equal(fixture.attachmentTruncated,true);
for(const old of previous){const current=fixture.cases.find(row=>row.en===old.en);assert.ok(current);assert.equal(current.fr,old.fr,'Le lot précédent ne doit pas être réécrit');}
const w=new JSDOM('<main class="pre-wrap"></main>',{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');let blob;const dice=[],links=[];
const rows=cases.map(row=>{const p=d.createElement('p'),parts=row.en.split(/(\b\d+d\d+\b|\bDodge\b)/);for(const part of parts){if(/^\d+d\d+$/.test(part)){const b=d.createElement('b');b.className='dodieroll';b.textContent=part;let clicks=0;b.onclick=()=>clicks++;dice.push({b,text:part,clicked:()=>clicks});p.append(b);}else if(part==='Dodge'){const a=d.createElement('a');a.href='#actions?id=Dodge';a.textContent=part;let clicks=0;a.onclick=e=>{e.preventDefault();clicks++;};links.push({a,clicked:()=>clicks});p.append(a);}else p.append(d.createTextNode(part));}main.append(p);return{...row,p};});
const original=main.innerHTML,sentinel=d.createElement('button');sentinel.textContent='Close';main.append(sentinel);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.URL.createObjectURL=b=>{blob=b;return'blob:local';};w.URL.revokeObjectURL=()=>{};const anchorClick=w.HTMLAnchorElement.prototype.click;w.HTMLAnchorElement.prototype.click=function(){if(!this.download)return anchorClick.call(this);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn){for(let i=0;i<300&&!fn();i++)await pause(20);assert.ok(fn(),'Spell report update timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>sentinel.textContent==='Fermer');for(const {p,en,fr}of rows)assert.equal(p.textContent,fr,en.slice(0,100));for(const {b,text,clicked}of dice){assert.equal(b.textContent,text);b.click();assert.equal(clicked(),1);}
 for(const {a,clicked} of links){assert.ok(a.isConnected);assert.equal(a.getAttribute('href'),'#actions?id=Dodge');assert.equal(a.textContent,'Esquive');a.click();assert.equal(clicked(),1);}
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('scanMissing'));root.getElementById('scanMissing').click();root.getElementById('exportMissing').click();const report=await new Promise(resolve=>{const r=new w.FileReader();r.onload=()=>resolve(JSON.parse(r.result));r.readAsText(blob);});assert.equal(report.missingCount,0);
 const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>sentinel.textContent==='Close');sentinel.remove();assert.equal(main.innerHTML,original);
 console.log(`PASS rapport sorts : ${rows.length} passages, ${new Set(rows.map(r=>r.name)).size} sorts, dés et liens interactifs préservés, diagnostic sans reliquat et restauration exacte.`);
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
