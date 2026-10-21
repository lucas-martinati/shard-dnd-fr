const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'),fixture=JSON.parse(fs.readFileSync('tests/fixtures/monster-form-headings-20261021.json','utf8'));
const norm=s=>s.replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/\s*([.:,;()])\s*/g,'$1').toLocaleLowerCase('fr').trim(),pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn){for(let i=0;i<600&&!fn();i++)await pause(20);assert.ok(fn(),'Form headings timed out');}
function setup(html,enabled){
 const w=new JSDOM('<main>'+html+'</main>',{url:'https://play.shardtabletop.com/#book?id=42kx3bk4mrh7f61i',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;let blob;
 w.GM_getValue=(key,f)=>key==='shard-fr-v1'?JSON.stringify({enabled,analysisNodeLimit:0,analysisResultLimit:0}):f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=o=>o.onerror();w.URL.createObjectURL=b=>{blob=b;return'blob:forms';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 const main=d.querySelector('main'),before=main.innerHTML;w.eval(code.replace('  queue(document.body);\n  if(aideddOnline','  window.formHeadingTranslate=translate;\n  queue(document.body);\n  if(aideddOnline'));const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('scanMissing')),el=id=>root.getElementById(id);
 async function report(){el('scanMissing').click();await wait(()=>!el('exportMissing').disabled);el('exportMissing').click();return new Promise(r=>{const reader=new w.FileReader();reader.onload=()=>r(JSON.parse(reader.result));reader.readAsText(blob);});}
 return{w,d,main,before,el,report};
}
(async()=>{
 const mixed=['Rend (Jackal or Hybrid Form Only). Jet d’attaque au corps à corps : allonge 5 ft. Touché : 5 dégâts perforants.','Slam (Human or Hybrid Form Only). Jet d’attaque au corps à corps : allonge 5 ft.','Rend (Unmapped Aspect). Le texte est déjà français.','Étreinte (Unknown Beast Form Only). Le texte est déjà français.'];
 const french=['Saignée (formes de chacal ou hybride uniquement). Le texte est déjà français.','Coup (forme humaine uniquement). Le texte est déjà français.','Parade. Le garou-chacal rend un coup à la cible.','La forme hybride est disponible uniquement pendant le combat.'];
 const t=setup(mixed.map((s,i)=>`<p id="missing${i}"><b><i>${s.slice(0,s.indexOf('. ')+1)}</i></b>${s.slice(s.indexOf('. ')+1)}</p>`).join('')+french.map(s=>'<p>'+s+'</p>').join('')+'<p hidden>Rend (PRIVATE_HIDDEN Form Only).</p><input value="PRIVATE_VALUE"><div contenteditable="true">Rend (PRIVATE_EDITOR Form Only).</div>',false);
 try{const r=await t.report();for(const s of mixed){const row=r.missing.find(row=>norm(row.en)===norm(s));assert.ok(row,s);assert.equal(norm(row.displayed),norm(s));}for(const s of french)assert.ok(!r.missing.some(row=>norm(row.en)===norm(s)),s);assert.doesNotMatch(JSON.stringify(r),/PRIVATE_/);}finally{t.w.close();}
 const live=setup(fixture.cases.map(row=>row.html).join('')+'<p id="split"><b>Rend (Jackal or </b><b>Hybrid Form Only).</b></p><p id="unknown"><b>Rend (Unmapped Aspect Form Only).</b> Le texte est déjà français.</p>',true);
 try{
  assert.equal(live.w.formHeadingTranslate('{Human Form Only}'),'{Human Form Only}');
  assert.equal(live.w.formHeadingTranslate('The unfamiliar ritual has a (Human Form Only) limitation.'),'The unfamiliar ritual has a (Human Form Only) limitation.');
  assert.equal(norm(live.w.formHeadingTranslate('Rend (Jackal Form Only).')),norm('Saignée (forme de chacal uniquement).'));
  const rows=[...live.main.querySelectorAll('p')],dice=[...live.main.querySelectorAll('.dodieroll')],diceHTML=dice.map(el=>el.innerHTML),all=[...live.main.querySelectorAll('*')];let clicks=0;dice.forEach(el=>el.addEventListener('click',()=>clicks++));
  await wait(()=>fixture.cases.every((row,i)=>norm(rows[i].textContent)===norm(row.fr))&&norm(live.d.getElementById('split').textContent)===norm('Saignée (formes de chacal ou hybride uniquement).'));
  assert.equal(norm(live.d.getElementById('split').textContent),norm('Saignée (formes de chacal ou hybride uniquement).'));
  assert.match(live.d.getElementById('unknown').textContent,/Unmapped Aspect Form Only/);
  fixture.cases.forEach((row,i)=>assert.deepEqual(rows[i].textContent.match(/\d+/g),row.en.match(/\d+/g)));all.forEach(el=>assert.ok(el.isConnected));dice.forEach((el,i)=>{assert.equal(el.innerHTML,diceHTML[i]);el.click();});assert.equal(clicks,dice.length);
  let r=await live.report();assert.ok(r.missing.some(row=>row.en.includes('Unmapped Aspect Form Only')));for(let i=0;i<3;i++)assert.ok(!rows[i].hasAttribute('data-shard-fr-diagnostic'),rows[i].textContent);
  live.el('analysisDeep').checked=true;live.el('analysisDeep').dispatchEvent(new live.w.Event('change'));r=await live.report();for(let i=0;i<3;i++)assert.ok(!rows[i].hasAttribute('data-shard-fr-diagnostic'),rows[i].textContent);
  live.el('enabled').checked=false;live.el('enabled').dispatchEvent(new live.w.Event('change'));await wait(()=>live.main.innerHTML===live.before);
 }finally{live.w.close();}
 console.log('PASS restrictions de forme : titres anglais dans des règles françaises détectés, faux positifs français exclus, deux attaques réelles, titre fragmenté, forme inconnue conservée et signalée, dés/valeurs et restauration exacte.');
})().catch(e=>{console.error(e);process.exitCode=1;});
