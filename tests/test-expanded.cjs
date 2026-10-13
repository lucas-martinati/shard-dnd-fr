const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const all=require('./translation-fixtures.cjs').entries();
const rage=all.filter(r=>r.id.startsWith('rage-dragon-2024.')),oldWeapons=all.filter(r=>r.id.startsWith('proprietes-armes-2014.')),newWeapons=all.filter(r=>r.id.startsWith('proprietes-armes-2024.')),thauma=all.filter(r=>r.id.startsWith('thaumaturgie-puces-2014.')&&!r.id.endsWith('.multiple'));
const sections=JSON.parse(fs.readFileSync('work/spell-sections.json'));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#play?mode=character',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function paragraph(parent,source,id){const p=d.createElement('p');p.id=id;p.textContent=source;parent.append(p);return p;}
const magic=d.createElement('div');magic.className='pre-wrap';magic.id='thauma';main.append(magic);paragraph(magic,'Vous simulez une chose extraordinaire, un signe de puissance surnaturelle.','intro-fr');const ul=d.createElement('ul');magic.append(ul);thauma.forEach((r,i)=>{const li=d.createElement('li');li.id='thauma'+i;li.textContent=r.en;ul.append(li);});
const rageBody=d.createElement('div');rageBody.id='rage';rageBody.className='pre-wrap';main.append(rageBody);
const labels={'rage.damage':'Rage Damage','rage.advantage':'Strength Advantage','rage.no-spells':'No Concentration or Spells','rage.resistance':'Damage Resistance','rage.duration':'Duration'};
rage.filter(r=>r.id.startsWith('rage-dragon-2024.rage.')).forEach((r,i)=>{const p=paragraph(rageBody,r.en,'rage'+i),id=r.id.replace('rage-dragon-2024.','');p.innerHTML=(labels[id]?'<i><strong>'+labels[id]+'.</strong></i> ':'')+escape(r.en).replace('Incapacitated','<a href="#incapacitated">Incapacitated</a>');});
const weapons=d.createElement('div');main.append(weapons);const weaponBlocks=[];
for(const [edition,rows]of [['old',oldWeapons],['new',newWeapons]])for(const r of rows){const p=d.createElement('p');p.className='description';const label=r.id.split('.').at(-1).replace('two-handed','Two-Handed');p.innerHTML='<strong>'+label.charAt(0).toUpperCase()+label.slice(1)+'.</strong> '+escape(r.en);weapons.append(p);weaponBlocks.push({p,row:r});}
// Les options SRD sont réordonnées en français : tester leur correspondance par titre.
const selected=['Command','Symbol','Thaumaturgy','Druidcraft','Prestidigitation'];const sectionBlocks=[];
for(const row of sections){if(!selected.some(name=>row.source.includes('section de '+name)))continue;const li=d.createElement('li');li.textContent=row.en;main.append(li);sectionBlocks.push({p:li,row});}
const lightSpell=d.createElement('div');lightSpell.innerHTML='<h2 id="spell-light">Light</h2><p>Evocation cantrip</p>';main.append(lightSpell);
const flight=rage.find(r=>r.id.endsWith('dragon.flight'));const flightBlock=paragraph(main,flight.en,'flight');
const original=main.innerHTML,links=[...main.querySelectorAll('a')],hrefs=links.map(a=>a.getAttribute('href'));let clicks=0;links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();clicks++}));
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f,msg){for(let i=0;i<400&&!f();i++)await pause(25);assert.ok(f(),msg||'DOM update timed out');}
const isTranslated=(p,r)=>p.textContent.includes(r.fr);
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>thauma.every((r,i)=>d.getElementById('thauma'+i).textContent===r.fr),'Thaumaturgy bullets');
 await wait(()=>rage.filter(r=>r.id.includes('.rage.')).every((r,i)=>d.getElementById('rage'+i).textContent.includes(r.fr)),'Full Rage including labels');
 await wait(()=>weaponBlocks.every(({p,row})=>isTranslated(p,row)),'Old and new weapon properties');
 await wait(()=>flightBlock.textContent===flight.fr,'Draconic Flight');
 assert.equal(d.getElementById('intro-fr').textContent,'Vous simulez une chose extraordinaire, un signe de puissance surnaturelle.');assert.equal(d.getElementById('spell-light').textContent,'Lumière');
 const oldLight=weaponBlocks.find(({row})=>row.id==='proprietes-armes-2014.light').p;assert.equal(oldLight.querySelector('strong').textContent,'Légère.');
 const oldHeavy=weaponBlocks.find(({row})=>row.id==='proprietes-armes-2014.heavy').p,newHeavy=weaponBlocks.find(({row})=>row.id==='proprietes-armes-2024.heavy').p;assert.match(oldHeavy.textContent,/Petite/);assert.doesNotMatch(oldHeavy.textContent,/13/);assert.match(newHeavy.textContent,/13/);
 // Comparer les segments sans conversion de distance. Les tests de pieds couvrent séparément les autres.
 const plain=sectionBlocks.filter(({row})=>!/(?:feet|foot)\b/.test(row.en));await wait(()=>plain.every(({p,row})=>p.textContent===row.fr),'Named SRD options including reordered effects');
 const foot=sectionBlocks.find(({row})=>row.en.startsWith('Approach.'));await wait(()=>foot.p.textContent.includes('5 feet'));assert.match(foot.p.textContent,/Approche/);
 links.forEach((a,i)=>{assert.ok(a.isConnected);assert.equal(a.getAttribute('href'),hrefs[i]);a.click();});assert.equal(clicks,links.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original,'Exact restore');
 console.log(`PASS expanded: 6 puces Thaumaturgie, Rage complète et listes, Vol draconique, ${weaponBlocks.length} propriétés d’armes anciennes/2024, ${sectionBlocks.length} segments de sorts, Light arme/sort, gras/liens et restauration.`);
 }catch(e){console.error('Remaining weapons',weaponBlocks.filter(({p,row})=>!isTranslated(p,row)).map(({p})=>p.textContent.slice(0,130)));throw e;}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
