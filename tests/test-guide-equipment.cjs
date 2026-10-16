if(process.argv[2]===undefined){require('./guide-equipment-runner.cjs');return;}
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const fixture=require('./fixtures/shard-players-guide-v1.json'),code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
assert.equal(fixture.items.length,1372);assert.equal(new Set(fixture.items.map(r=>r.name)).size,1372);assert.equal(fixture.magic.length,239);
const magicStart=fixture.chapters.magic.indexOf('<h2>Magic Item Descriptions'),magicEnd=fixture.chapters.magic.indexOf('</h2>',magicStart)+5,magicFooter=fixture.chapters.magic.match(/<div class="mv2 i">[\s\S]*$/)?.[0]||'';
const allRows=[{name:'Équipement',category:'chapitre',html:fixture.chapters.equipment},{name:'Introduction objets magiques',category:'chapitre',html:fixture.chapters.magic.slice(0,magicEnd)+magicFooter},{name:'Liste d’équipement',category:'liste',html:fixture.chapters.list},...fixture.magic.map(r=>({...r,category:'notice'})),...fixture.items.map(r=>({...r,category:'fiche'}))];
const part=Number(process.argv[2]),rows=allRows.filter((_,index)=>index%4===part);
const w=new JSDOM('<main/>',{url:fixture.url,runScripts:'outside-only'}).window,d=w.document,main=d.querySelector('main');
w.GM_getValue=(key,fallback)=>key==='shard-fr-v1'?JSON.stringify({analysisResultLimit:0,analysisNodeLimit:0}):fallback;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
let instrumented=code.replace('  queue(document.body);\n  if(aideddOnline','  observer.disconnect();pending.clear();window.__guide={scan,collectDiagnostics,lookupPair,inlineKey,translate,preserveFeet,setEnabled(value){enabled=value;if(!value)restoreInline();}};\n  if(aideddOnline');
assert.notEqual(instrumented,code,'Point d’instrumentation du test');
// Toutes les données sont fixes et hors ligne ; éviter de reconstruire ce set pour chaque fiche.
instrumented=instrumented.replace('    const knownFrench=new Set([...entries.values()].map(row=>inlineKey(row.fr)));','    const knownFrench=window.__knownFrench||new Set([...entries.values()].map(row=>inlineKey(row.fr)));').replace('    for(const fr of [...completePairs.values(),...inlinePairs.values()])if(fr)knownFrench.add(inlineKey(fr));','    if(!window.__knownFrench){for(const fr of [...completePairs.values(),...inlinePairs.values()])if(fr)knownFrench.add(inlineKey(fr));window.__knownFrench=knownFrench;}');
w.eval(instrumented);const api=w.__guide,failures=[],diagnostics=[],norm=text=>api.inlineKey(text).replace(/\s+/g,' ').trim();
const sameLanguage=new Set(['Totem','Service','Communication','Face','Golem','Arcanaloth','Cambion','Dao','Mezzoloth','Nycaloth','Ultroloth'].map(norm));
const constant=name=>JSON.parse(code.match(new RegExp('^const '+name+' = (.*);$','m'))[1]);
for(const [en,fr] of constant('TRANSLATION_TERMS'))if(norm(en)===norm(fr))sameLanguage.add(norm(en));
for(const {en,fr} of [...constant('COMPLETE_TEXTS'),...constant('AIDEDD_CATALOG')])if(norm(en)===norm(fr))sameLanguage.add(norm(en));
function shardHTML(){const copy=main.cloneNode(true);copy.querySelectorAll('[data-shard-fr-link]').forEach(node=>node.remove());return copy.innerHTML;}
const notation=text=>sameLanguage.has(norm(text))||/^[\d\s.,/½¾¼×+–—-]+(?:lb\.?|ft\.?|feet|mph|ounces?|gallons?|quart)(?:\s*×\s*[\d\s.]+ft\.?)?$/i.test(text)||/^[\d\sd+×.,-]+$/i.test(text)||/^10 Piton$/.test(text)||!/[a-z]/i.test(text);
function groups(root){const result=[];for(const el of root.querySelectorAll('p,li,td,th,.pre-wrap,h1,h2,h3,h4,h5,h6')){let nodes=[];const flush=()=>{const en=nodes.map(n=>n.data).join('').replace(/\s+/g,' ').trim();if(en)result.push({en,nodes:[...nodes],heading:el.matches('h1,h2,h3,h4,h5,h6'),context:el.closest('tr')?.textContent||en});nodes=[];};function visit(n){if(n.nodeType===3){nodes.push(n);return;}if(n.nodeType!==1||n.matches('button,input,textarea,script,style,svg,[data-shard-fr-ignore]'))return;const boundary=n!==el&&n.matches('p,li,td,th,div,br');if(boundary)flush();for(const child of n.childNodes)visit(child);if(boundary)flush();}visit(el);flush();}return result;}
let linksChecked=0,diceChecked=0,blocksChecked=0,weightsChecked=0;
try{for(let i=0;i<rows.length;i++){const row=rows[i];main.innerHTML='<article role="dialog"><div class="MuiDialogTitle-root"><h3 class="titletext"></h3></div><div class="MuiDialogContent-root"></div></article>';let card;if(row.category==='chapitre'||row.category==='liste'){main.innerHTML=row.html;card=main;}else{card=main.firstChild;card.querySelector('h3').textContent=row.name;card.querySelector('.MuiDialogContent-root').innerHTML=row.category==='fiche'?row.html:'<div class="stdcontent"><div class="pre-wrap">'+row.html+'</div></div>';}
 const original=main.innerHTML,blocks=groups(main),links=[...main.querySelectorAll('a')],dice=[...main.querySelectorAll('.dodieroll')],hrefs=links.map(n=>n.getAttribute('href')),rolls=dice.map(n=>n.textContent);const weights=[...main.querySelectorAll('span')].filter(n=>/^\s*lb\.?\s*$/.test(n.textContent)&&n.previousElementSibling&&/^[\d.,/½¼¾ –-]+$/.test(n.previousElementSibling.textContent)).map(n=>({unit:n,amount:n.previousElementSibling,text:n.previousElementSibling.textContent,unitText:n.textContent}));let clicked=0;for(const n of [...links,...dice])n.addEventListener('click',event=>{event.preventDefault();clicked++;});
 for(const step of api.scan(main)){}
 for(const block of blocks){const current=block.nodes.map(n=>n.data).join(''),pair=api.lookupPair(norm(block.en)),expected=pair?api.preserveFeet(block.en,pair):api.translate(block.en,row.name==='Équipement'&&block.en==='Light'?'light weapon':block.context);blocksChecked++;if(block.heading)continue;
  if(norm(current)!==norm(expected)&&!notation(block.en))failures.push({name:row.name,en:block.en,expected,actual:current});
  if(norm(current)===norm(block.en)&&norm(expected)===norm(block.en)&&!notation(block.en))failures.push({name:row.name,en:block.en,reason:'Bloc sans traduction explicite'});
 }
 for(const weight of weights){assert.equal(weight.amount.textContent,weight.text,'Poids : '+row.name);assert.equal(weight.unit.textContent,weight.unitText,'Unité de poids : '+row.name);}weightsChecked+=weights.length;
 const report=api.collectDiagnostics(card,false,false);for(const missing of report.missing)diagnostics.push({name:row.name,...missing});
 links.forEach((node,j)=>{assert.ok(node.isConnected);assert.equal(node.getAttribute('href'),hrefs[j]);node.click();});dice.forEach((node,j)=>{assert.ok(node.isConnected);assert.equal(node.textContent,rolls[j]);node.click();});assert.equal(clicked,links.length+dice.length,row.name);linksChecked+=links.length;diceChecked+=dice.length;
 api.setEnabled(false);for(const step of api.scan(main)){};assert.equal(shardHTML(),original,'Restauration du contenu Shard : '+row.name);api.setEnabled(true);
 if(i%200===0)console.log(`Guide : ${i}/${rows.length}`);
 }
 const report={date:fixture.date,scriptVersion:constant('SCRIPT_VERSION'),source:fixture.url,chapitres:2,listes:1,notices:239,fiches:1372,blocsControles:blocksChecked,poidsControles:weightsChecked,liensControles:linksChecked,desControles:diceChecked,anglaisRepere:diagnostics.length,ecartsDeRendu:failures.length,restaurationExacte:true};
 fs.writeFileSync(process.argv[3],JSON.stringify({report,failures,diagnostics}));
 if(failures.length||diagnostics.length){console.error(JSON.stringify({failures:failures.slice(0,12),diagnostics:diagnostics.slice(0,12)},null,2));}
 assert.equal(failures.length,0,'Tous les blocs du guide doivent être traduits, hors notations et noms identiques');assert.equal(diagnostics.length,0,'Aucun candidat anglais dans le relevé complet');
 console.log(`Guide : partie ${part+1}/4 terminée.`);
}finally{w.close();}
