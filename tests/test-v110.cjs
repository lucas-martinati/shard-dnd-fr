const fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('node:assert/strict');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const rows=JSON.parse(fs.readFileSync('work/generated/feature-texts.json','utf8'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(f,message){for(let i=0;i<250&&!f();i++)await sleep(25);assert.ok(f(),message||'DOM update timed out');}
const w=new JSDOM('<main><div id="sheet"><span id="sneakLabel">Sneak Attack</span><div class="stdcontent" id="features"></div><div id="labels"></div></div></main>',{url:'https://play.shardtabletop.com/#play?mode=character',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;
const menus=new Map();w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=(k,f)=>menus.set(k,f);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const names=['Danger Sense','Reckless Attack','Primal Knowledge'];
rows.forEach((r,i)=>{
 const p=d.createElement('p');p.id='f'+i;
 let source=escape(r.en).replace(/\b\d+d6\b/g,s=>`<b class="dodieroll">${s}</b>`);
 // Simuler les descriptions Shard : balises inline, légende et dés cliquables.
 p.innerHTML=(i<3?`<strong>${names[i]}.</strong> `:'')+`<span>${source}</span>`;d.getElementById('features').append(p);
});
d.getElementById('labels').innerHTML='<div id="spellList"></div><span id="all">all</span><span id="toggle">Toggle Effects</span><span id="bonus">Cast as Bonus Action</span><span id="rage">Rages Rage Damage +2</span><span id="see">see description</span><div id="weapon"><span>Slashing</span> | <span id="weaponLight">Light, Thrown</span></div><div><span id="light">Light</span> <span>Evocation</span></div><div id="shortHeading"><span>Cantrips</span></div><p id="unknown">You can admire <em>Light</em> as a symbol of your character’s unusual personal story.</p><textarea>Danger Sense</textarea><input value="Sneak Attack">';
const split=d.getElementById('spellList');split.append(d.createTextNode('Spell'),d.createComment('React separator'),d.createTextNode(' List'));
const mixed=d.createElement('div');mixed.id='mixed';mixed.className='pre-wrap';
const heads={8:'Weapon Mastery Dagger, Shortbow, Shortsword',10:'Spellcasting',11:'Cantrips',14:'Spell Slots',15:'Prepared Spells of Level 1+',17:'Changing Your Prepared Spells',18:'Spellcasting Ability',19:'Spellcasting Focus',20:'Mage Hand Legerdemain',21:'Dwarven Resilience',22:'Stonecunning'};
mixed.innerHTML=Object.entries(heads).map(([i,title])=>`<p id="mixed${i}"><strong>${title}.</strong> <span>${escape(rows[i].en)}</span></p>`).join('');d.querySelector('main').append(mixed);
const dice=[...d.querySelectorAll('.dodieroll')],values=dice.map(n=>n.textContent),original=d.querySelector('main').textContent;let clicks=0;dice.forEach(n=>n.onclick=()=>clicks++);
(async()=>{try{
 w.eval(code);
 await wait(()=>rows.every((r,i)=>d.getElementById('f'+i).textContent.includes(r.fr)),rows.filter((r,i)=>!d.getElementById('f'+i).textContent.includes(r.fr)).map(r=>r.en.slice(0,50)).join('\n'));
 for(const i of Object.keys(heads))await wait(()=>d.getElementById('mixed'+i).textContent.includes(rows[i].fr),'Composite feature '+i);
 assert.match(d.getElementById('mixed8').textContent,/Dague.*Arc court.*Épée courte/i);
 assert.match(d.getElementById('mixed11').textContent,/Sorts mineurs/);
 assert.match(d.getElementById('mixed20').textContent,/Escamotage de main de mage/);
 const expected={sneakLabel:'Attaque sournoise',spellList:'Liste des sorts',all:'Tous',toggle:'Activer / désactiver les effets',bonus:'Lancer par une action Bonus',rage:'Rages Dégâts de Rage +2',see:'Voir la description',weaponLight:'Légère, Lancer',light:'Lumière',shortHeading:'Sorts mineurs'};
 await wait(()=>Object.entries(expected).every(([id,fr])=>d.getElementById(id).textContent===fr),'Labels: '+Object.entries(expected).map(([id])=>id+'='+d.getElementById(id).textContent).join('; '));
 for(const [id,fr] of Object.entries(expected))assert.equal(d.getElementById(id).textContent,fr,id);
 assert.match(d.getElementById('f0').textContent,/Sens du danger\./);assert.match(d.getElementById('f1').textContent,/Témérité\./);
 assert.equal(d.getElementById('unknown').textContent,'You can admire Light as a symbol of your character’s unusual personal story.','Unknown prose stays intact');
 assert.equal(d.querySelector('textarea').value,'Danger Sense');assert.equal(d.querySelector('input').value,'Sneak Attack');
 dice.forEach((n,i)=>{assert.ok(n.isConnected);assert.equal(n.textContent,values[i]);n.click();});assert.equal(clicks,10);
 const stone=d.getElementById('f22').textContent;assert.match(stone,/60 feet/);assert.match(stone,/10 minutes/);assert.match(stone,/Repos long/);
 const rogue=d.getElementById('f16').textContent;assert.match(rogue,/niveau 7/);assert.match(rogue,/cinq sorts/);assert.match(rogue,/niveau 1 ou 2/);
 // Texte exact mis à jour au passage de niveau, sans dériver les dés nous-mêmes.
 const p=d.getElementById('f36');p.innerHTML=escape(rows.find(r=>r.en.includes('extra 4d6')).en).replace('4d6','<b class="dodieroll">4d6</b>');
 await wait(()=>p.textContent.includes('4d6 dégâts supplémentaires'));assert.equal(p.querySelector('.dodieroll').textContent,'4d6');
 const host=[...d.querySelectorAll('[data-shard-fr-ignore]')].find(e=>e.shadowRoot?.getElementById('enabled')),toggle=host.shadowRoot.getElementById('enabled');
 toggle.checked=false;toggle.dispatchEvent(new w.Event('change'));
 await wait(()=>d.getElementById('sneakLabel').textContent==='Sneak Attack'&&d.getElementById('f0').textContent.startsWith('Danger Sense. You'));
 for(let i=0;i<rows.length;i++)if(i!==36)assert.equal(d.getElementById('f'+i).textContent,(i<3?names[i]+'. ':'')+rows[i].en,'Restore '+i);
 await wait(()=>split.textContent==='Spell List','Restore split label');
 assert.equal(split.textContent,'Spell List');assert.equal(split.childNodes.length,3);
 toggle.checked=true;toggle.dispatchEvent(new w.Event('change'));await wait(()=>d.getElementById('sneakLabel').textContent==='Attaque sournoise');
 console.log(`PASS 1.10: ${rows.length} paragraphes/variantes, titres voisins, libellé React fragmenté, Light arme/sort, dés 1d6–10d6, changement de niveau, pieds, champs privés, retour anglais exact.`);
 }finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
