const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const en='Languages Abyssal; telepathy 60 ft. (works only with creatures that understand Abyssal)';
const fr='Langues Abyssal ; télépathie 60 ft. (uniquement avec les créatures qui comprennent l’abyssal)';
const swarm='Large swarm (of small fiends demon), Chaotic Evil';
// Lignes reconstruites à partir du rapport et des dispositions Shard déjà relevées.
const w=new JSDOM('<main><div class="mb1" id="languages"><span><span><b>Languages </b>'+en.slice(10)+'</span></span></div><div class="mb1" id="second">'+en+'</div><div class="monstersimple"><div class="i pb1" id="swarm">'+swarm+'</div><div class="i pb1" id="devils">Medium swarm (of tiny fiends devils), Lawful Evil</div></div><button>Close</button></main>',{url:'https://play.shardtabletop.com/#book?id=42kx3bk4mrh7f61i',runScripts:'outside-only',pretendToBeVisual:true}).window;
const d=w.document,main=d.querySelector('main'),original=main.innerHTML,elements=[...main.querySelectorAll('*')];let blob,clicks=0;
const fields=['languages','second','swarm','devils'].map(id=>d.getElementById(id));fields.forEach(el=>el.addEventListener('click',()=>clicks++));
w.GM_getValue=(key,fallback)=>key==='shard-fr-v1'?JSON.stringify({analysisNodeLimit:0,analysisResultLimit:0}):key==='shard-fr-descriptions-v18'?JSON.stringify({savedAt:Date.now(),validationVersion:2,pairs:[[en,null],[en.slice(10),null]]}):fallback;
w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=o=>o.onerror();w.URL.createObjectURL=b=>{blob=b;return'blob:dretch';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));async function wait(fn){for(let i=0;i<600&&!fn();i++)await pause(20);assert.ok(fn(),main.textContent);}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>d.querySelector('button').textContent==='Fermer');
 assert.equal(fields[0].textContent,fr);assert.equal(fields[1].textContent,fr);assert.equal(fields[2].textContent,'Nuée de taille G de Fiélons (Démons) de taille P, Chaotique mauvais');assert.equal(fields[3].textContent,'Nuée de taille M de Fiélons (Diables) de taille TP, Loyal mauvais');
 elements.forEach(el=>assert.ok(el.isConnected));fields.forEach(el=>el.click());assert.equal(clicks,4);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('scanMissing')),el=id=>root.getElementById(id);
 async function report(){el('scanMissing').click();await wait(()=>!el('exportMissing').disabled);el('exportMissing').click();return new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(blob);});}
 let r=await report();assert.equal(r.truncated,false);assert.deepEqual(r.missing,[]);
 el('analysisDeep').checked=true;el('analysisDeep').dispatchEvent(new w.Event('change'));r=await report();assert.equal(r.analysisMode,'deep');assert.deepEqual(r.missing,[]);
 el('enabled').checked=false;el('enabled').dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);
 console.log('PASS dretches : deux lignes de télépathie conditionnelle, nuées avec sous-type démon/diable, cache en conflit, diagnostic standard/approfondi, interactions et restauration exacte.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
