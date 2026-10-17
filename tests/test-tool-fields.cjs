const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/tools-equipment-2024.json','utf8'));
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const norm=s=>s.replace(/\s+/g,' ').trim();
const numbers=s=>(s.match(/\d+/g)||[]).sort();
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const gear=[...new Set(fixture.rows.flatMap(row=>row.fields.flatMap(field=>field.en.startsWith('Craft: ')?field.en.slice(7).split(/,\s*/):field.en.startsWith('Variants: ')?Array.from(field.en.slice(10).matchAll(/(?:^|, )([A-Za-z ]+) \(/g),m=>m[1]):[])).concat(['Club','Greatclub','Quarterstaff','Whip','Hide','Medium armor','Heavy armor','Ranged weapons']))].filter(name=>!name.includes('(')&&!name.includes(')')).sort((a,b)=>b.length-a.length);
const gearRE=new RegExp('(?<![\\p{L}\\p{N}])(?:'+gear.map(escape).join('|')+')(?![\\p{L}\\p{N}])','gu');
function setup(html,enabled=true){
 const w=new JSDOM('<main>'+html+'</main>',{url:'https://play.shardtabletop.com/#item',runScripts:'outside-only',pretendToBeVisual:true}).window;
 w.GM_getValue=(key,fallback)=>key==='shard-fr-v1'?JSON.stringify({enabled,analysisResultLimit:0,analysisNodeLimit:0}):fallback;
 w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};let blob;
 w.URL.createObjectURL=b=>{blob=b;return 'blob:tools';};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){if(!this.download)this.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
 w.eval(code);const d=w.document,root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('scanMissing'));
 async function report(){root.getElementById('scanMissing').click();await wait(()=>!root.getElementById('scanMissing').disabled);root.getElementById('exportMissing').click();return new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(blob);});}
 return {w,d,root,report};
}
async function wait(fn){const deadline=Date.now()+30000;while(!fn()){assert.ok(Date.now()<deadline,'Traduction des outils trop lente');await new Promise(r=>setTimeout(r,10));}}
function fieldTexts(card){
 if(card.querySelector('.field'))return [...card.querySelectorAll('.field')].map(el=>norm(el.textContent));
 const result=[''];for(const n of card.querySelector('p').childNodes){if(n.nodeName==='BR')result.push('');else result[result.length-1]+=n.textContent;}return result.map(norm);
}
(async()=>{
 const cards=fixture.rows.flatMap((row,i)=>['plain','links','mixed','divs',...(row.reportEn?['report']:[])].map(layout=>{
  const fields=row.fields.map((field,j)=>{
   const [label,value]=field.en.split(/: (.*)/s),frLabel=field.fr.split(' : ')[0];
   if(layout==='plain'||layout==='report')return field.en;
   const body=layout==='links'&&j===2?value.replace(gearRE,name=>`<a href="#item?id=${encodeURIComponent(name)}">${name}</a>`):value;
   return `<b>${layout==='mixed'?frLabel+' :':label+':'}</b> ${body}`;
  });
  return `<section data-case="${i}" data-layout="${layout}"><h3>${row.name}${row.price===undefined?'':` (${row.price} GP)`}</h3><div class="description">${layout==='divs'?fields.map(f=>'<div class="field">'+f+'</div>').join(''):'<p>'+(layout==='report'?row.reportEn:fields.join(' <br>'))+'</p>'}</div></section>`;
 }));
 const expectedTexts=card=>{const fields=fixture.rows[+card.dataset.case].fields.map(f=>f.fr);return card.dataset.layout==='report'?[fields.join(' ')]:fields;};
 const t=setup(cards.join(''));
 try{
  const main=t.d.querySelector('main'),original=main.innerHTML,signature=numbers(main.textContent),links=[...main.querySelectorAll('a')],hrefs=links.map(a=>a.getAttribute('href'));let clicks=0;
  links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();clicks++;}));
  await wait(()=>[...main.querySelectorAll('section')].every(card=>fieldTexts(card).length===expectedTexts(card).length&&fieldTexts(card).every((text,j)=>text===expectedTexts(card)[j]))).catch(error=>{console.error(JSON.stringify([...main.querySelectorAll('section')].flatMap(card=>fieldTexts(card).flatMap((text,j)=>text===expectedTexts(card)[j]?[]:[{tool:fixture.rows[+card.dataset.case].name,layout:card.dataset.layout,expected:expectedTexts(card)[j],actual:text}])),null,2));throw error;});
  assert.deepEqual(numbers(main.textContent),signature,'Prix, DD et durées conservés');
  links.forEach((a,i)=>{assert.ok(a.isConnected);assert.equal(a.getAttribute('href'),hrefs[i]);a.click();});assert.equal(clicks,links.length);
  for(const b of main.querySelectorAll('b'))assert.match(b.textContent,/^(?:Caractéristique|Utilisation|Fabrication|Variantes)\s*:/,'Les libellés gardent leur gras');
  let report=await t.report();assert.deepEqual(report.missing,[],'Les outils traduits ne produisent aucun faux positif');
  const bilingual=t.root.getElementById('bilingual');bilingual.checked=true;bilingual.dispatchEvent(new t.w.Event('change'));report=await t.report();assert.deepEqual(report.missing,[],'Les noms bilingues restent autorisés');
  const enabled=t.root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new t.w.Event('change'));await wait(()=>main.innerHTML===original);
 }finally{t.w.close();}
 // Vérifier les manques fournis indépendamment de leur correction : avec
 // les libellés français et la traduction coupée, chaque valeur anglaise
 // différente de son français doit être signalée (Intelligence/Rations exclus).
 const untranslated=fixture.rows.flatMap((row,i)=>row.fields.map((field,j)=>({
  id:`raw-${i}-${j}`,fr:field.fr,text:field.fr.split(' : ')[0]+' : '+field.en.split(/: (.*)/s)[1]
 })));
 const raw=setup(untranslated.map(row=>`<p id="${row.id}">${row.text}</p>`).join(''),false);
 try{await raw.report();for(const row of untranslated)assert.equal(raw.d.getElementById(row.id).hasAttribute('data-shard-fr-diagnostic'),norm(row.text).toLowerCase()!==norm(row.fr).toLowerCase(),row.text);}finally{raw.w.close();}
 const missingCases=[
  ['label','Utilize: Une valeur française encore sans libellé traduit.'],
  ['imperative','<b>Utilisation :</b> Draft a map of a mysterious island (DC 17)'],
  ['partial-verb','<b>Utilisation :</b> Sceller ou pry open a mysterious chest (DC 17)'],
  ['ability','<b>Caractéristique :</b> Strength or Dexterity'],
  ['list','<b>Fabrication :</b> Carte, Sling, Whip'],
  ['partial','Fabrication : Map, Moonwidget'],
  ['mixed','<b>Caractéristique :</b> Intelligence<br><b>Utilisation :</b> Discern a crystal’s age (DC 17)<br><b>Fabrication :</b> Rations'],
  ['long','<b>Fabrication :</b> '+('Bourse, '.repeat(15))+'Studded Leather Armor'],
 ];
 const clearCases=[
  ['french','<b>Utilisation :</b> Réparer une robe, puis ajouter un motif au tissu (DD 10)'],
  ['same','<b>Fabrication :</b> Rations, robe'],
  ['list','<b>Fabrication :</b> Carte, fronde, fouet, armure de cuir'],
  ['ability','<b>Caractéristique :</b> Intelligence'],
  ['qualified','<b>Fabrication :</b> Club (association locale)'],
  ['priced','<b>Variantes :</b> Rations (1 po, 1 lb.), robe (2 po, 1 lb.)'],
  ['song','<b>Utilisation :</b> Jouer l’air « Play with Fire » (DD 10)'],
  ['proper','Draft'],['plain-french','Un club de cartographes prépare une carte.'],
 ];
 const render=(rows,prefix)=>rows.map(([id,html])=>`<p id="${prefix}-${id}">${html}</p>`).join('');
 const u=setup(render(missingCases,'missing')+render(clearCases,'clear')+'<p hidden>Utilize: Draft a hidden map</p><textarea>Craft: PRIVATE_VALUE</textarea><div contenteditable="true">Craft: PRIVATE_EDITOR</div>');
 try{
  const report=await u.report();
  for(const [id]of missingCases)assert.ok(u.d.getElementById('missing-'+id).hasAttribute('data-shard-fr-diagnostic'),'Reliquat détecté : '+id);
  for(const [id]of clearCases)assert.ok(!u.d.getElementById('clear-'+id).hasAttribute('data-shard-fr-diagnostic'),'Aucun faux positif : '+id);
  assert.ok(report.missing.some(row=>row.en.includes('Moonwidget')),'Un champ mêlant français et anglais reste signalé');
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_|hidden map/);
  // Le contrôle des descriptions doit utiliser exactement les mêmes règles.
  const instrumented=code.replace('  queue(document.body);\n  if(aideddOnline','  window.toolDescriptionCheck=checkDescription;window.toolPartialCheck=p=>{const node=p.firstChild;tokenState.set(node,{original:"Craft: Map, Moonwidget",output:node.data,revision,enabled,bilingual});return collectDiagnostics(p,false,false);};\n  queue(document.body);\n  if(aideddOnline');
  const v=new JSDOM('<div role="dialog"><div class="MuiDialogContent-root"><div class="pre-wrap"><p>Utilisation : Draft a map of a mysterious island (DC 17)</p></div></div></div>',{url:'https://play.shardtabletop.com/#item',runScripts:'outside-only'}).window;
  try{v.GM_getValue=(k,f)=>f;v.GM_setValue=()=>{};v.GM_registerMenuCommand=()=>{};v.eval(instrumented);const result=v.toolDescriptionCheck({name:'Unknown tool'},v.document.querySelector('[role="dialog"]'));assert.equal(result.status,'incomplete');assert.equal(result.missing.length,1);const p=v.document.createElement('p');p.textContent='Fabrication : Map, Moonwidget';v.document.body.append(p);const partial=v.toolPartialCheck(p);assert.equal(partial.missing.length,1);assert.equal(partial.missing[0].reason,'unrecognized-layout');assert.equal(partial.missing[0].en,'Craft: Map, Moonwidget');}finally{v.close();}
 }finally{u.w.close();}
 console.log(`PASS outils : ${fixture.rows.length} outils, ${fixture.rows.reduce((n,r)=>n+r.fields.length,0)} champs, 4 dispositions et 7 extraits bruts du rapport ; liens, DD/prix/poids, bilingue, restauration exacte et diagnostic.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
