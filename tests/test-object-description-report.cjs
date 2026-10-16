const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/diagnostic-object-descriptions-11717.json','utf8'));
const additions=JSON.parse(fs.readFileSync('tests/fixtures/diagnostic-object-descriptions-11738.json','utf8')).cases;
const w=new JSDOM('<main class="pre-wrap"></main>',{url:'https://play.shardtabletop.com/#item',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');let blob;
const cases=[...fixture.cases,...additions].map(row=>{const el=d.createElement('p');el.textContent=row.en;main.append(el);return{...row,el};});
// Même texte avec titres en gras et dés cliquables, comme dans un profil intégré.
const dice=[];let clicks=0;
for(const row of additions.slice(0,3)){
 const el=d.createElement('p'),title=d.createElement('strong'),boundary=row.en.indexOf('.')+1;
 title.textContent=row.en.slice(0,boundary);el.append(title);
 for(const text of row.en.slice(boundary).split(/(\d+d\d+\s*(?:\+\s*\d+)?)/)){
  if(/^\d+d/.test(text)){const die=d.createElement('span');die.className='dodieroll';die.textContent=text;die.onclick=()=>clicks++;el.append(die);dice.push({die,text});}
  else el.append(d.createTextNode(text));
 }
 main.append(el);cases.push({...row,el});
}
const original=main.innerHTML,sentinel=d.createElement('button');sentinel.textContent='Close';main.append(sentinel);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.URL.createObjectURL=b=>{blob=b;return'blob:local';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn){for(let i=0;i<300&&!fn();i++)await pause(20);assert.ok(fn(),'Object description report timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>sentinel.textContent==='Fermer');
 for(const row of cases)assert.equal(row.el.textContent,row.fr,row.en.slice(0,100));
 for(const {die,text} of dice){assert.ok(die.isConnected);assert.equal(die.textContent,text);die.click();}assert.equal(clicks,dice.length);
 assert.ok(cases.find(row=>row.en.startsWith('Each of the quiver')).el.textContent.includes('2 pounds'),'Poids du carquois conservé');
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('scanMissing'));root.getElementById('scanMissing').click();await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();const report=await new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(blob);});
 assert.equal(report.missingCount,0,'Les anciens candidats et les cinq descriptions du rapport 1.17.38 ne doivent plus être signalés');
 const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>sentinel.textContent==='Close');sentinel.remove();assert.equal(main.innerHTML,original);
 console.log('PASS rapports objets : anciens candidats et 5 descriptions 1.17.38, profils en gras, dés cliquables, poids conservé et retour exact à l’anglais.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
