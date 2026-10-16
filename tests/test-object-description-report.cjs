const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/diagnostic-object-descriptions-11717.json','utf8'));
const w=new JSDOM('<main class="pre-wrap"></main>',{url:'https://play.shardtabletop.com/#item',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');let blob;
const cases=fixture.cases.map(row=>{const el=d.createElement('p');el.textContent=row.en;main.append(el);return{...row,el};});
const original=main.innerHTML,sentinel=d.createElement('button');sentinel.textContent='Close';main.append(sentinel);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.URL.createObjectURL=b=>{blob=b;return'blob:local';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn){for(let i=0;i<300&&!fn();i++)await pause(20);assert.ok(fn(),'Object description report timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>sentinel.textContent==='Fermer');
 for(const row of cases)assert.equal(row.el.textContent,row.fr,row.en.slice(0,100));
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('scanMissing'));root.getElementById('scanMissing').click();await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();const report=await new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(blob);});
 assert.equal(report.missingCount,0,'Les 93 candidats, dont les dés et le nom déjà connu, ne doivent plus être signalés');
 const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>sentinel.textContent==='Close');sentinel.remove();assert.equal(main.innerHTML,original);
 console.log('PASS rapport objets : 93 candidats, 90 correspondances, dés non signalés, retour exact à l’anglais.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
