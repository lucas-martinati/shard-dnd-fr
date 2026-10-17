const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const known='You exert control over the elements, creating one of the following effects within range.';
const cut=known.indexOf('creating'),head=known.slice(0,cut),tail=known.slice(cut);
const unknown='You discover an unknown lunar mechanism. '+ 'You can examine its mysterious symbols without revealing their meaning. '.repeat(6);
const count=80;
const w=new JSDOM('<main>'+Array.from({length:count},()=>`<div class="pre-wrap"><p class="known"><span>${head}</span><span>${tail}</span></p></div>`).join('')+`<p id="unknown">${unknown}</p><p hidden>You gain HIDDEN_SECRET</p><input value="PRIVATE_SECRET"><div contenteditable="true">You gain EDITOR_SECRET</div></main>`,{url:'https://play.shardtabletop.com/',runScripts:'outside-only',pretendToBeVisual:true}).window;
const d=w.document;let blob;
w.GM_getValue=(k,f)=>k==='shard-fr-v1'?JSON.stringify({analysisResultLimit:0,analysisNodeLimit:0}):f;
w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
w.URL.createObjectURL=value=>{blob=value;return 'blob:startup';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
const pause=()=>new Promise(r=>setTimeout(r,10));
async function wait(fn){const deadline=Date.now()+30000;while(!fn()){assert.ok(Date.now()<deadline,'Le travail doit terminer');await pause();}}
let root;
async function report(){
  root.getElementById('scanMissing').click();
  await wait(()=>!root.getElementById('scanMissing').disabled);
  assert.equal(w.translationPriority(),false,'La priorité cesse quand le rapport est prêt');
  root.getElementById('exportMissing').click();
  return new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.onerror=reject;reader.readAsText(blob);});
}
(async()=>{try{
  w.eval(code.replace('  queue(document.body);\n  if(aideddOnline','  window.translationPending=()=>scheduled;window.translationPriority=()=>pageScanWaiting;\n  queue(document.body);\n  if(aideddOnline'));
  root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('scanMissing'));
  let result=await report(); // Clic immédiat, avant la première tranche.
  assert.equal(result.truncated,false);
  assert.deepEqual(result.missing.map(r=>r.en),[unknown.trim()]);
  assert.equal(result.missing[0].reason,'missing-translation');
  const paragraphs=[...d.querySelectorAll('.known')];
  assert.ok(paragraphs.every(p=>p.textContent.includes('contrôle')));
  // Une mutation étrangère ne doit pas relire les 80 traductions établies.
  const tracked=new Set(paragraphs.flatMap(p=>[p,p.firstChild.firstChild,p.lastChild.firstChild]));
  const descriptor=Object.getOwnPropertyDescriptor(w.Node.prototype,'isConnected');let reads=0;
  Object.defineProperty(w.Node.prototype,'isConnected',{...descriptor,get(){if(tracked.has(this))reads++;return descriptor.get.call(this);}});
  d.getElementById('unknown').firstChild.data=unknown+' You gain a novel power.';
  await pause();await wait(()=>!w.translationPending());
  assert.equal(reads,0,'Pas de validation globale des traductions à chaque mutation ou tranche');
  Object.defineProperty(w.Node.prototype,'isConnected',descriptor);
  // Muter une traduction répartie doit restituer les autres fragments avant
  // de retraduire. Retirer un sous-arbre doit libérer ses propriétaires.
  const changed=paragraphs[0],removed=paragraphs[1],remaining=changed.lastChild.firstChild;
  changed.firstChild.firstChild.data='You discover a mysterious object. ';
  removed.parentElement.remove();
  await pause();await wait(()=>!w.translationPending());
  assert.equal(remaining.data,tail);
  assert.equal(removed.textContent,known,'Les nœuds détachés retrouvent leur texte original');
  d.querySelector('main').append(removed.parentElement);
  await pause();await wait(()=>!w.translationPending());
  assert.ok(removed.textContent.includes('contrôle'),'Un sous-arbre réinséré est retraduit');
  // Une mutation et un clic dans la même tâche doivent inclure les textes
  // nouveaux et leurs attributs, même avant le callback de MutationObserver.
  const fresh=d.createElement('div');fresh.innerHTML=`<p>${known}</p><p>You gain an unknown SAME_TASK power.</p><button title="Close">Close</button>`;
  d.querySelector('main').append(fresh);
  result=await report();
  assert.ok(fresh.firstChild.textContent.includes('contrôle'));
  assert.equal(fresh.lastChild.title,'Fermer');
  assert.ok(result.missing.some(r=>r.en.includes('SAME_TASK')));
  assert.ok(!result.missing.some(r=>r.en===known||r.en==='Close'));
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_SECRET|HIDDEN_SECRET|EDITOR_SECRET/);
  // Retirer le nœud porteur du français restaure les autres fragments. Ces
  // nouvelles mutations doivent aussi être traitées avant le rapport immédiat.
  const split=d.createElement('p');split.innerHTML=`<span> </span><span>${known}</span>`;d.querySelector('main').append(split);
  await pause();await wait(()=>!w.translationPending());
  assert.ok(split.firstChild.textContent.includes('contrôle'));
  split.firstChild.remove();result=await report();
  assert.ok(split.textContent.includes('contrôle'));
  assert.ok(!result.missing.some(r=>r.en===known));
  // Les racines de mutation qui se recouvrent et l’annulation ne perdent rien.
  const outer=d.createElement('section');d.body.append(outer);
  outer.innerHTML=`<div><p>${known}</p><p>You gain an unknown OVERLAP power.</p></div>`;
  outer.firstChild.append(d.createTextNode('Fireball'));
  root.getElementById('scanMissing').click();root.getElementById('clearMissing').click();
  assert.equal(w.translationPriority(),false,'L’annulation restitue la cadence de fond');
  await pause();await wait(()=>!w.translationPending());await pause();
  assert.equal(root.getElementById('exportMissing').disabled,true);
  result=await report();assert.ok(result.missing.some(r=>r.en.includes('OVERLAP')));
  assert.ok(outer.textContent.includes('Boule de feu'));
  const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
  await pause();await wait(()=>!w.translationPending());
  assert.equal(removed.textContent,known);
  assert.equal(fresh.firstChild.textContent,known);
  assert.equal(fresh.lastChild.title,'Close');
  enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));
  result=await report();assert.ok(!result.missing.some(r=>r.en===known));
  console.log('PASS démarrage diagnostic : attente complète, paragraphes longs, validation ciblée, mutations/réinsertion, clic synchrone, attributs, racines imbriquées, annulation, exclusions et restauration.');
}finally{w.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
