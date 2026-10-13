const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const rows=require('./translation-fixtures.cjs').entries(),byId=new Map(rows.map(r=>[r.id,r]));
const manifest=JSON.parse(fs.readFileSync('translations/descriptions-visibles.json','utf8')).fiches;
const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/narrative-cards.json','utf8'));
assert.equal(manifest.filter(f=>f.type==='species'&&f.edition==='2024').length,10);
assert.equal(manifest.filter(f=>f.type==='subspecies'&&f.edition==='2024').length,24);
assert.equal(manifest.filter(f=>f.type==='class'&&f.edition==='2024').length,12);
assert.equal(manifest.filter(f=>f.type==='subclass').length,48);
assert.equal(manifest.filter(f=>f.type==='background'&&f.edition==='2024').length,16);
const expectedNames=fs.readFileSync('translations/classes/creation-2024.tsv','utf8').split('\n').slice(0,48).map(line=>line.split('|')[0]).sort();
assert.deepEqual(manifest.filter(f=>f.type==='subclass').map(f=>f.name).sort(),expectedNames);
for(const name of ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'])assert.equal(manifest.filter(f=>f.type==='subclass'&&f.class===name).length,4);
assert.deepEqual(fixtures.map(f=>f.id),manifest.map(f=>f.id));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#class',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const cases=[];
function cardHTML(fixture){const card=d.createElement('article');card.className='stdcontent hoverhighlight';card.dataset.fixture=fixture.id;card.innerHTML=fixture.html;return card;}
for(const fixture of fixtures){
 const card=cardHTML(fixture);main.append(card);
 let blocks=[...card.querySelectorAll('p,li')].filter(el=>!el.querySelector('p,li')&&el.textContent.trim());
 if(!blocks.length&&card.textContent.trim())blocks=[card.querySelector('.pre-wrap')||card];
 assert.equal(blocks.length,fixture.paragraphes.length,fixture.id+' : structure de paragraphes');
 blocks.forEach((p,i)=>{const row=byId.get(fixture.paragraphes[i]);assert.ok(row,fixture.id+' : référence manquante');assert.equal(p.textContent.trim().replace(/\s+/g,' '),row.en,fixture.id+' : anglais exact');cases.push({p,row,id:fixture.id});});
}
// Même texte affiché dans une carte tronquée et dans une fiche ouverte.
const aasimar=fixtures.find(f=>f.id===manifest.find(m=>m.type==='species'&&m.name==='Aasimar').id);
const preview=d.createElement('div');preview.className='pre-wrap ll-8';preview.innerHTML=aasimar.html;main.append(preview);
const dialog=d.createElement('div');dialog.setAttribute('role','dialog');dialog.innerHTML=aasimar.html;main.append(dialog);
const aasimarRows=aasimar.paragraphes.map(id=>byId.get(id));
// Repères de mise en forme et lien au milieu d'un paragraphe de présentation.
const goliath=byId.get(manifest.find(m=>m.type==='species'&&m.name==='Goliath').paragraphes[0]);
const linked=d.createElement('p');linked.textContent=goliath.en;linked.innerHTML=linked.innerHTML.replace('goliaths','<strong>goliaths</strong>').replace('giants.','<a href="#monsters-giants">giants</a>.');main.append(linked);
const link=linked.querySelector('a'),emphasis=linked.querySelector('strong'),href=link.getAttribute('href');let clicks=0;link.addEventListener('click',e=>{e.preventDefault();clicks++;});
const ignored=d.createElement('div');ignored.setAttribute('contenteditable','true');ignored.textContent=aasimarRows[0].en;main.append(ignored);
const original=main.innerHTML,elements=[...main.querySelectorAll('p,li,i,b,strong,em,a,ul')],italics=[...main.querySelectorAll('p>i')];
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<600&&!f();i++)await pause(25);assert.ok(f(),'Narrative translation timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>cases.every(({p,row})=>p.textContent.trim()===row.fr)&&linked.textContent.trim()===goliath.fr);
 for(const node of elements)assert.ok(node.isConnected,'Le moteur conserve les éléments du relevé');
 for(const italic of italics)assert.ok(italic.textContent.trim(),'Une accroche en italique ne doit pas être vidée');
 for(const container of [preview,dialog])assert.deepEqual([...container.querySelectorAll('p')].map(p=>p.textContent.trim()),aasimarRows.map(r=>r.fr));
 assert.equal(emphasis.textContent,'goliaths');assert.equal(link.textContent,'géants');assert.equal(link.getAttribute('href'),href);link.click();assert.equal(clicks,1);
 assert.equal(ignored.textContent,aasimarRows[0].en);
 const height=byId.get('narrative.species.elf.2024.1');assert.match(height.fr,/750 ans/);assert.match(aasimarRows[1].fr,/160 ans/);
 const devotion=manifest.find(f=>f.name==='Oath of Devotion'),card=main.querySelector('[data-fixture="'+devotion.id+'"]');assert.equal(card.querySelectorAll('li').length,3);assert.ok([...card.querySelectorAll('li')].every(li=>!/^Let |^Protect /.test(li.textContent)));
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
 await wait(()=>main.innerHTML===original);enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>cases.every(({p,row})=>p.textContent.trim()===row.fr));
 console.log(`PASS narratives: ${fixtures.length} fiches, ${cases.length} paragraphes/puces, 10 espèces et 24 lignages 2024, 48 sous-classes, 12 classes, 16 historiques, aperçus/fiches, italiques et liens, restauration exacte.`);
 }catch(e){console.error(cases.filter(({p,row})=>p.textContent.trim()!==row.fr).map(({id,row,p})=>({id,entry:row.id,actual:p.textContent.slice(0,100)})));throw e;}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
