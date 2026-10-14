const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {pack}=require('./translation-fixtures.cjs');
const rules=pack('regles').entries,species=pack('especes').entries;
const catalogue=JSON.parse(fs.readFileSync('audit/inventaires/commun/etats-2024.json','utf8'));
assert.equal(catalogue.conditions.length,15);
const byId=new Map(rules.map(r=>[r.id,r]));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#customtable?type=Conditions',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const cases=[];
for(const state of catalogue.conditions){
 const article=d.createElement('article');article.className='stdcontent';article.dataset.condition=state.en;
 const h=d.createElement('h2');h.textContent=state.en;article.append(h);
 for(const id of state.sections){
  const row=byId.get(id);assert.ok(row,'Section référencée absente : '+id);
  const p=d.createElement('p'),cut=row.en.indexOf('.');
  p.innerHTML='<i><strong>'+esc(row.en.slice(0,cut+1))+'</strong></i> '+esc(row.en.slice(cut+1).trim());
  if(row.en.includes('You have the Incapacitated condition.'))p.innerHTML=p.innerHTML.replace('the Incapacitated condition','the <a href="#state-incapacitated">Incapacitated</a> condition');
  if(row.en.includes('Your Speed is 0'))p.innerHTML=p.innerHTML.replace('Your Speed','Your <a href="#speed">Speed</a>');
  article.append(p);cases.push({p,row});
 }
 main.append(article);
}
// Shard rend les titres d'espèce avec les classes Tachyons b/i.
const stone=species.find(r=>r.en.startsWith('When you take damage, you can take a Reaction to roll 1d12.'));
assert.ok(stone);
const styled=d.createElement('p');styled.className='pre-wrap';styled.innerHTML='<span class="b i">Stone’s Endurance (Stone Giant).</span> '+esc(stone.en).replace('1d12','<b class="dodieroll"><span class="fas fa-dice-d20"></span>1d12</b>');main.append(styled);
const inline=d.createElement('p');inline.innerHTML='<span class="b i">Attacks Affected.</span> Attack rolls against you have Advantage.';main.append(inline);
const use=species.find(r=>r.id==='species.goliath.feature-uses');assert.ok(use);
const ascendants=[];
for(const prefix of ['Cloud','Fire','Frost','Hill','Stone','Storm']){
 const heading=species.find(r=>r.id==='species.goliath.heading.'+prefix.toLowerCase());assert.ok(heading);
 const row=species.find(r=>r.id.startsWith('species.2024.goliath.')&&r.en.startsWith(({Cloud:'As a Bonus Action, you magically teleport',Fire:'When you hit a target with an attack roll and deal damage to it, you can also deal 1d10',Frost:'When you hit a target with an attack roll and deal damage to it, you can also deal 1d6',Hill:'When you hit a Large or smaller creature',Stone:'When you take damage, you can take a Reaction to roll 1d12',Storm:'When you take damage from a creature within 60 feet'})[prefix]));assert.ok(row);
 const card=d.createElement('span');card.className='stdcontent';card.innerHTML='<span><span class="b i">'+esc(heading.en)+'.&nbsp;</span></span><span class="pre-wrap"><span class="inlinefirstp"><p>'+esc(row.en+' '+use.en).replace(/\b\d+d\d+\b/g,die=>'<strong class="dodieroll">'+die+'</strong>')+'</p></span></span>';main.append(card);ascendants.push({card,heading,row});
}
const labels=[['Campaigns','Campagnes'],['Library','Bibliothèque'],['Races/Species','Races / Espèces'],['Advanced Filter','Filtres avancés'],['My Creations','Mes créations']];
const buttons=labels.map(([en])=>{const el=d.createElement('button');el.textContent=en;main.append(el);return el;});
const search=d.createElement('input');search.placeholder='search';search.value='Private campaign notes';main.append(search);
const privateText=d.createElement('div');privateText.contentEditable='true';privateText.setAttribute('contenteditable','true');privateText.textContent='When you take damage, you can take a Reaction to roll 1d12.';main.append(privateText);
const unknown=d.createElement('p');unknown.textContent='You gain an unknown power that deals 2d12 damage.';main.append(unknown);
// Même nom pour une propriété d'arme et le trait humain.
const weapon=d.createElement('div');weapon.innerHTML='<span>Versatile</span> <em>1d8 Slashing, Two-Handed</em>';main.append(weapon);
const human=d.createElement('div');human.innerHTML='<h3>Human</h3><span>Versatile</span>';main.append(human);
const oldStun=d.createElement('li');oldStun.textContent="A stunned creature is incapacitated, can't move, and can speak only falteringly.";main.append(oldStun);
const oldStunFR='Une créature étourdie est Neutralisée, ne peut pas se déplacer et ne peut parler que de façon hésitante.';
const original=main.innerHTML,links=[...main.querySelectorAll('a')],hrefs=links.map(a=>a.getAttribute('href')),dice=styled.querySelector('.dodieroll'),icon=dice.firstChild,title=styled.firstChild,ancestorDice=ascendants.flatMap(({card})=>[...card.querySelectorAll('.dodieroll')]),dieValues=ancestorDice.map(die=>die.textContent);let clicks=0;
dice.addEventListener('click',()=>clicks++);links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();clicks++;}));
ancestorDice.forEach(die=>die.addEventListener('click',()=>clicks++));
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<350&&!f();i++)await pause(25);assert.ok(f(),'General categories translation timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>cases.every(({p,row})=>p.textContent===row.fr)&&styled.textContent.endsWith(stone.fr)&&inline.querySelector('.b.i').textContent==='Effet sur les attaques.'&&ascendants.every(({card,row})=>card.querySelector('p').textContent===row.fr+' '+use.fr)&&buttons.every((b,i)=>b.textContent===labels[i][1])&&search.placeholder==='Rechercher'&&weapon.querySelector('span').textContent==='Polyvalente'&&human.querySelector('span').textContent==='Polyvalent');
 for(const {p,row}of cases){assert.equal(p.querySelector('strong').textContent,row.fr.slice(0,row.fr.indexOf('.')+1));assert.ok(p.querySelector('strong').parentElement.tagName==='I');}
 assert.equal(title.textContent,'Endurance de la pierre (géant des pierres).');assert.equal(title.className,'b i');
 assert.equal(inline.querySelector('.b.i').textContent,'Effet sur les attaques.');assert.equal(inline.textContent,'Effet sur les attaques. Les jets d’attaque contre vous ont l’Avantage.');
 ascendants.forEach(({card,heading})=>assert.equal(card.querySelector('.b.i').textContent.trim(),heading.fr+'.'));ancestorDice.forEach((die,i)=>{assert.ok(die.isConnected);assert.equal(die.textContent,dieValues[i]);die.click();});
 buttons.forEach((b,i)=>assert.equal(b.textContent,labels[i][1]));assert.equal(search.placeholder,'Rechercher');assert.equal(search.value,'Private campaign notes');
 assert.equal(privateText.textContent,'When you take damage, you can take a Reaction to roll 1d12.');assert.equal(unknown.textContent,'You gain an unknown power that deals 2d12 damage.');
 assert.equal(weapon.querySelector('span').textContent,'Polyvalente');assert.equal(human.querySelector('span').textContent,'Polyvalent');
 // Ne pas réécrire l'état Étourdi 2014 avec les effets 2024.
 await wait(()=>oldStun.textContent===oldStunFR);
 assert.equal(oldStun.textContent,oldStunFR);
 const exhaustion=main.querySelector('[data-condition="Exhaustion"]');assert.match(exhaustion.textContent,/2 fois votre niveau/);assert.match(exhaustion.textContent,/5 fois votre niveau/);assert.match(exhaustion.textContent,/1 de vos niveaux/);
 const stunned=main.querySelector('[data-condition="Stunned"]');assert.doesNotMatch(stunned.textContent,/Vitesse 0|parler|déplacer/);
 assert.ok(dice.isConnected&&icon.isConnected);assert.equal(dice.textContent,'1d12');dice.click();
 links.forEach((a,i)=>{assert.ok(a.isConnected);assert.equal(a.getAttribute('href'),hrefs[i]);a.click();});assert.equal(clicks,links.length+1+ancestorDice.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
 await wait(()=>main.innerHTML===original);enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>styled.textContent.endsWith(stone.fr));
 console.log(`PASS general: 15 états 2024, ${cases.length} sections, 6 ascendances Shard avec utilisations, titres b/i, liens, dés et icône intacts, navigation, champs privés, éditions, restauration exacte.`);
 }catch(e){console.error(cases.filter(({p,row})=>p.textContent!==row.fr).map(({p,row})=>({id:row.id,actual:p.textContent,expected:row.fr})));console.error(styled.outerHTML);throw e;}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
