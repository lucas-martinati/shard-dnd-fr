const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'),types=JSON.parse(fs.readFileSync('tests/fixtures/monster-type-lines-20261020.json','utf8'));
const pause=ms=>new Promise(r=>setTimeout(r,ms)),plain=s=>s.replace(/[\uE000-\uF8FF]/g,'').replace(/\s+/g,' ').trim();
async function wait(fn){for(let i=0;i<700&&!fn();i++)await pause(20);assert.ok(fn(),'Fragment diagnostics timed out');}
function setup(html,enabled,saved=new Map()){
 const w=new JSDOM(html,{url:'https://play.shardtabletop.com/#item?private=PRIVATE_URL',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;let blob;
 if(!saved.has('shard-fr-v1'))saved.set('shard-fr-v1',JSON.stringify({enabled,analysisResultLimit:0,analysisNodeLimit:0}));
 w.GM_getValue=(k,f)=>saved.get(k)??f;w.GM_setValue=(k,v)=>saved.set(k,v);w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=o=>o.onerror();w.URL.createObjectURL=b=>{blob=b;return'blob:fragments';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 w.eval(code);const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('analysisDeep')),el=id=>root.getElementById(id);
 async function report(){el('scanMissing').click();await wait(()=>!el('exportMissing').disabled);el('exportMissing').click();return new Promise(r=>{const reader=new w.FileReader();reader.onload=()=>r(JSON.parse(reader.result));reader.readAsText(blob);});}
 function deep(on){el('analysisDeep').checked=on;el('analysisDeep').dispatchEvent(new w.Event('change'));}
 return{w,d,el,report,deep,saved,blob:()=>blob};
}
(async()=>{
 const positives=['Moyenne or small Humanoïde, Neutre','Moyenne or Petite Humanoïde, Neutre','M or P Humanoïde','dégâts slashing','vision darkvision 60 feet','télépathie avec une créature undead','la cible est grappled','petit ooze inconnu','self only','at will','up to 30 feet','dégâts necrotic'];
 const negatives=['Une large rivière traverse la forêt.','Un anneau en or repose ici.','La valeur {cast spell level} reste inchangée.','Trait de feu (Fire Bolt)','Bouclier (Shield)','2d6','{caster spell attack}','Une créature se repose.'];
 const t=setup(positives.map((s,i)=>`<p id="p${i}">${s}</p>`).join('')+negatives.map((s,i)=>`<p id="n${i}">${s}</p>`).join('')+'<p id="uncertain">Frail wings shudder silently.</p><p hidden>You gain PRIVATE_HIDDEN</p><div contenteditable="true">You gain PRIVATE_EDITOR</div><input value="PRIVATE_VALUE"><button title="Moyenne or small Humanoïde, Neutre">Loup</button>',false);
 try{
  let r=await t.report();assert.equal(r.analysisMode,'standard');for(const s of positives)assert.ok(r.missing.some(x=>x.en===s),s);
  for(const s of negatives)assert.ok(!r.missing.some(x=>x.en===s),s);assert.ok(!r.missing.some(x=>x.en==='Frail wings shudder silently.'));assert.doesNotMatch(JSON.stringify(r),/PRIVATE_/);
  assert.ok(r.missing.some(x=>x.attribute==='title'&&x.en===positives[0]));
  t.deep(true);assert.ok(t.el('copyMissing').disabled);r=await t.report();assert.equal(r.analysisMode,'deep');
  assert.ok(r.missing.some(x=>x.en==='Frail wings shudder silently.'&&x.reason==='language-unverified'));
  assert.ok(r.missing.some(x=>x.en===negatives[0]&&x.reason==='language-unverified'));
  for(const s of ['Trait de feu (Fire Bolt)','Bouclier (Shield)','2d6','{caster spell attack}'])assert.ok(!r.missing.some(x=>x.en===s),s);
  assert.doesNotMatch(JSON.stringify(r),/PRIVATE_/);assert.equal(JSON.parse(t.saved.get('shard-fr-v1')).analysisDeep,true);
  t.el('analysisResultLimit').value='1';t.el('analysisResultLimit').dispatchEvent(new t.w.Event('change'));r=await t.report();assert.equal(r.missingCount,1);assert.equal(r.truncated,true);
  const reloaded=setup('<p>Frail wings shudder silently.</p>',false,t.saved);try{assert.equal(reloaded.el('analysisDeep').checked,true);assert.equal((await reloaded.report()).analysisMode,'deep');}finally{reloaded.w.close();}
 }finally{t.w.close();}
 const html=types.map((r,i)=>`<div class="monstersimple" data-test="${i}"><div class="titletext">${r.name}</div>${r.html}</div>`).join('');
 const mixed='Moyenne or small Humanoïde, Neutre',originalProse='Cast Level 2 Spell: You gain an unfamiliar trick.';
 const quiet='Cast Level 2 Spell: Frail wings shudder silently.';
 const live=setup(html+`<section><div id="mixed">${mixed}</div><div id="split"><span>Moyenne</span> or <span>small</span> Humanoïde, Neutre</div><p id="prose">${originalProse}</p><p id="quiet">${quiet}</p></section>`,true);
 try{
  const rows=[...live.d.querySelectorAll('.monstersimple .i.pb1')],before=rows.map(e=>e.innerHTML);let clicks=0;rows.forEach(e=>e.addEventListener('click',()=>clicks++));
  const r=await live.report();
  for(let i=0;i<rows.length;i++){assert.notEqual(plain(rows[i].textContent),plain(types[i].en),types[i].name);assert.doesNotMatch(rows[i].textContent,/\b(?:tiny|small|medium|large|huge|gargantuan|swarm|humanoid|undead|wizard|cleric)\b/i);rows[i].click();assert.ok(!rows[i].hasAttribute('data-shard-fr-diagnostic'),types[i].name);}
  assert.equal(clicks,rows.length);
  const byName=name=>rows[types.findIndex(r=>r.name===name)].textContent;
  assert.equal(byName('Noble'),'Humanoïde de taille M ou P, Neutre');assert.equal(byName('Mage'),'Humanoïde (Magicien) de taille M ou P, Neutre');
  assert.equal(byName('Shadow Dragon'),'Dragon de taille TG ou G, Chaotique mauvais');
  assert.equal(byName('Swarm of Stirges'),'Nuée de taille M de Monstruosités de taille TP, Sans alignement');
  assert.ok(r.missing.some(x=>x.en===mixed&&x.reason==='unrecognized-layout'));
  assert.ok(r.missing.some(x=>x.en===originalProse&&x.reason==='unrecognized-layout'),JSON.stringify({text:live.d.getElementById('prose').textContent,missing:r.missing}));assert.notEqual(live.d.getElementById('prose').textContent,originalProse);
  assert.notEqual(live.d.getElementById('quiet').textContent,quiet);live.deep(true);const deeper=await live.report();assert.ok(deeper.missing.some(row=>row.en===quiet),'Le mode approfondi couvre aussi un nœud partiellement traduit sans indice anglais restant');rows.forEach((row,i)=>assert.ok(!row.hasAttribute('data-shard-fr-diagnostic'),types[i].name));
  live.el('enabled').checked=false;live.el('enabled').dispatchEvent(new live.w.Event('change'));await wait(()=>rows.every((e,i)=>e.innerHTML===before[i]));assert.equal(live.d.getElementById('mixed').textContent,mixed);
 }finally{live.w.close();}
 const saved=new Map([['shard-fr-v1',JSON.stringify({enabled:true,analysisDeep:true,analysisResultLimit:0,analysisNodeLimit:0})]]);
 const catalogue=setup('<table><tbody><tr><td class="hoverhighlight w-100"><div>Quartz Relic</div></td></tr></tbody></table>',true,saved);
 try{
  catalogue.d.querySelector('td').onclick=()=>{
   const dialog=catalogue.d.createElement('div');dialog.setAttribute('role','dialog');dialog.innerHTML='<div class="MuiDialogTitle-root"><div class="titletext">Quartz Relic</div></div><div class="MuiDialogContent-root"><div class="pre-wrap"><p>Frail wings shudder silently.</p><input value="PRIVATE_DESCRIPTION"></div></div><div class="MuiDialogActions-root"><button>Close</button></div>';
   dialog.querySelector('button').onclick=()=>dialog.remove();catalogue.d.body.append(dialog);
  };
  const toggle=catalogue.el('showDescriptionStatus');toggle.checked=true;toggle.dispatchEvent(new catalogue.w.Event('change'));catalogue.el('inspectDescriptions').click();assert.ok(catalogue.el('analysisDeep').disabled);
  await wait(()=>catalogue.el('descriptionStatus').textContent.includes('terminée'));assert.equal(catalogue.el('analysisDeep').disabled,false);
  catalogue.el('exportDescriptions').click();const r=await new Promise(resolve=>{const reader=new catalogue.w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(catalogue.blob());});
  assert.equal(r.scope,'catalogue-descriptions');assert.equal(r.analysisMode,'deep');assert.ok(r.missing.some(row=>row.en==='Frail wings shudder silently.'&&row.reason==='language-unverified'));assert.doesNotMatch(JSON.stringify(r),/PRIVATE_/);
  catalogue.deep(false);assert.ok(catalogue.el('exportDescriptions').disabled);assert.ok(catalogue.el('copyDescriptions').disabled);
 }finally{catalogue.w.close();}
 console.log(`PASS fragments : ${positives.length} cas anglais/mêlés et contre-exemples français/bilingues/formules, nœuds partiels et spans, attributs, mode approfondi persistant et borné, ${types.length} lignes réelles de type/taille/nuée, interactions et restauration exacte.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
