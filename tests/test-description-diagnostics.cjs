const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const known='You exert control over the elements, creating one of the following effects within range.';
const unknown='You summon an unknown clockwork dragon beyond the moon.';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,label){for(let i=0;i<250&&!fn();i++)await pause(25);assert.ok(fn(),label||'Description diagnostic timed out');}
function setup(kind='item',remote=false){
 const w=new JSDOM('<main><table><tbody></tbody></table></main>',{url:`https://play.shardtabletop.com/#${kind}`,runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;
 let edits=0,blob,downloads=0,network=0;const clicks=[];
 const fixtures=[['Fire Bolt',`<p>${known}</p>`],['Mysterious Clock',`<p>${known}</p><p>${unknown}</p><input value="PRIVATE_INPUT"><div contenteditable="true">You gain PRIVATE_EDITOR</div><p hidden>You gain PRIVATE_HIDDEN</p>`],['Empty Relic','<span></span>'],['Plain French Relic','<p>Cette relique produit une lumière douce.</p>']];
 const cells=fixtures.map(([name,html])=>{
  const row=d.createElement('tr'),cell=d.createElement('td');cell.className='hoverhighlight w-100';cell.innerHTML=`<div>${name}<div class="i f8 pl1 ttl">Adventuring Gear, 2 gp</div></div>`;row.append(cell);d.querySelector('tbody').append(row);
  cell.onclick=()=>{clicks.push(name);const dialog=d.createElement('div');dialog.setAttribute('role','dialog');dialog.innerHTML=`<div class="MuiDialogTitle-root"><div class="titletext">${name}</div></div><div class="MuiDialogContent-root"><div class="stdcontent"><div>Weight 2 lb.</div><div class="pre-wrap">${html}</div><div>Source. A book</div></div></div><div class="MuiDialogActions-root"><button>Edit Attributes</button><button>Close</button></div>`;const buttons=dialog.querySelectorAll('button');buttons[0].onclick=()=>edits++;buttons[1].onclick=()=>dialog.remove();d.body.append(dialog);};return cell;
 });
 w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};if(remote)w.GM_xmlhttpRequest=()=>{network++;};w.URL.createObjectURL=b=>{blob=b;return 'blob:local';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads++;};
 w.eval(code);const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('inspectDescriptions'));
 const toggle=on=>{root.getElementById('showDescriptionStatus').checked=on;root.getElementById('showDescriptionStatus').dispatchEvent(new w.Event('change'));};
 const report=async()=>{root.getElementById('exportMissing').click();return new Promise(resolve=>{const r=new w.FileReader();r.onload=()=>resolve(JSON.parse(r.result));r.readAsText(blob);});};
 return {w,d,root,cells,clicks,toggle,report,network:()=>network,edits:()=>edits};
}
(async()=>{
 const t=setup();try{
  await pause(300);assert.equal(t.d.querySelectorAll('[data-shard-fr-description-status]').length,0,'Option inactive par défaut');assert.equal(t.clicks.length,0);
  assert.equal(t.root.getElementById('scanDescriptions'),null,'Le mode par nom est supprimé');
  assert.doesNotMatch(code,/DESCRIPTION_CATALOG|catalogue-associations|association non renseignée/);
  t.toggle(true);await pause(250);assert.equal(t.d.querySelectorAll('[data-shard-fr-description-status]').length,0,'Aucun état ne doit être déduit du nom avant lecture');assert.equal(t.clicks.length,0);
  t.root.getElementById('inspectDescriptions').click();await wait(()=>t.root.getElementById('descriptionStatus').textContent.includes('terminée'),'Automatic inspection finishes');
  assert.deepEqual(t.clicks,['Fire Bolt','Mysterious Clock','Empty Relic','Plain French Relic']);assert.equal(t.edits(),0);assert.equal(t.d.querySelector('[role="dialog"]'),null);
  const report=await t.report();assert.equal(report.scope,'catalogue-descriptions');assert.ok(report.descriptions.every(r=>!('association' in r)),'Le rapport ne contient plus d’associations');assert.deepEqual(report.descriptions.map(r=>r.status),['clear','incomplete','empty','clear']);
  assert.ok(report.descriptions[1].missing.some(r=>r.en===unknown));assert.equal(report.descriptions[1].missing.some(r=>r.en===known),false);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_|Weight|2 lb\.|Source\. A book/,'Exclusion des champs, masques et caractéristiques hors description');
  assert.match(t.cells[1].textContent,/Description : à compléter/);
  // Ouvrir manuellement la fiche réexamine son contenu et met à jour le même badge.
  t.cells[1].click();await wait(()=>t.d.querySelector('[role="dialog"] .pre-wrap p').textContent!==known);
  const paragraphs=t.d.querySelectorAll('[role="dialog"] .pre-wrap p');paragraphs[1].textContent='Cette horloge invoque un dragon.';
  await wait(()=>t.cells[1].textContent.includes('aucun anglais repéré'),'Manual opening refreshes result');
  t.d.querySelector('[role="dialog"] .MuiDialogActions-root button:last-child').click();
  // Un passage suivant ignore les fiches déjà examinées ; le rapport reste local.
  t.root.getElementById('inspectDescriptions').click();assert.equal(t.clicks.length,5);
  // Une ligne réutilisée pour un autre nom ne garde pas le résultat précédent.
  t.cells[0].firstElementChild.firstChild.data='Mysterious Clock';t.cells[0].onclick=t.cells[1].onclick;
  t.root.getElementById('inspectDescriptions').click();await wait(()=>t.root.getElementById('descriptionStatus').textContent.includes('terminée'));assert.match(t.cells[0].textContent,/à compléter/);
  // Un long paragraphe hors borne ne doit jamais devenir un succès silencieux.
  t.cells[0].click();await wait(()=>t.d.querySelector('[role="dialog"] .pre-wrap p'));t.d.querySelector('[role="dialog"] .pre-wrap p').textContent=(unknown+' ').repeat(200);t.d.querySelectorAll('[role="dialog"] .pre-wrap p')[1].textContent='Une autre phrase française.';
  await wait(()=>t.cells[0].textContent.includes('vérification impossible'));t.d.querySelector('[role="dialog"] .MuiDialogActions-root button:last-child').click();
  t.root.getElementById('clearMissing').click();assert.equal(t.d.querySelectorAll('[data-shard-fr-description-status]').length,0);assert.equal(t.root.getElementById('exportMissing').disabled,true);
  t.toggle(false);assert.equal(t.root.getElementById('inspectDescriptions').disabled,true);
 }finally{t.w.close();}
 const stopped=setup('spell');try{
  stopped.toggle(true);stopped.root.getElementById('inspectDescriptions').click();await wait(()=>stopped.d.querySelector('[role="dialog"]'));
  stopped.root.getElementById('stopDescriptions').click();await wait(()=>stopped.root.getElementById('stopDescriptions').disabled);
  assert.equal(stopped.clicks.length,1,'L’arrêt ne parcourt pas les fiches suivantes');assert.equal(stopped.d.querySelector('[role="dialog"]'),null,'La fiche ouverte automatiquement est refermée');assert.match(stopped.root.getElementById('descriptionStatus').textContent,/arrêtée/);assert.equal(stopped.d.querySelectorAll('[data-shard-fr-description-status]').length,0,'Pas d’état pour une fiche interrompue avant examen');
  stopped.root.getElementById('inspectDescriptions').click();await wait(()=>stopped.d.querySelector('[role="dialog"]'));
  stopped.w.location.hash='#home';await wait(()=>stopped.root.getElementById('stopDescriptions').disabled);assert.equal(stopped.root.getElementById('exportMissing').disabled,true);assert.equal(stopped.d.querySelectorAll('[data-shard-fr-description-status]').length,0);
 }finally{stopped.w.close();}
 const manual=setup('monster');try{
  manual.toggle(true);manual.cells[1].click();await wait(()=>manual.cells[1].textContent.includes('à compléter'));
  manual.root.getElementById('inspectDescriptions').click();assert.match(manual.root.getElementById('descriptionStatus').textContent,/Ferme la fiche/);assert.equal(manual.clicks.length,1);
  const report=await manual.report();assert.equal(report.descriptions.length,1);
  manual.toggle(false);assert.equal(manual.d.querySelectorAll('[data-shard-fr-description-status]').length,0);assert.ok(manual.d.querySelector('[role="dialog"]'),'La fiche ouverte manuellement reste ouverte');
 }finally{manual.w.close();}
 const pendingReference=setup('spell',true);try{
  pendingReference.toggle(true);pendingReference.cells[0].click();await wait(()=>pendingReference.d.querySelector('[role="dialog"] .pre-wrap p')?.textContent!==known);
  pendingReference.d.querySelector('[role="dialog"] .MuiDialogActions-root button:last-child').click();pendingReference.root.getElementById('clearMissing').click();
  const before=pendingReference.network();pendingReference.root.getElementById('inspectDescriptions').click();await wait(()=>pendingReference.root.getElementById('descriptionStatus').textContent.includes('terminée'));
  assert.equal(pendingReference.network(),before,'Le parcours ne déclenche pas de nouvelles références distantes');assert.equal((await pendingReference.report()).descriptions[0].status,'clear','Une référence distante en attente ne masque pas un texte déjà traduit');
 }finally{pendingReference.w.close();}
 const bounded=setup('feat');try{
  for(let i=0;i<101;i++){const row=bounded.d.createElement('tr');row.innerHTML='<td class="hoverhighlight w-100"><div>Extra Relic '+i+'</div></td>';bounded.d.querySelector('tbody').append(row);}
  bounded.toggle(true);bounded.root.getElementById('inspectDescriptions').click();assert.match(bounded.root.getElementById('descriptionStatus').textContent,/1 \/ 100/);
  bounded.root.getElementById('stopDescriptions').click();await wait(()=>bounded.root.getElementById('stopDescriptions').disabled);
 }finally{bounded.w.close();}
 console.log('PASS descriptions : option volontaire, badges, parcours automatique, traduction partielle, français, fiche vide, actualisation manuelle, export local, champs exclus, arrêt, navigation et aucune édition.');
})().catch(e=>{console.error(e);process.exitCode=1;});
