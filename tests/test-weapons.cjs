const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const catalog=JSON.parse(fs.readFileSync('audit/inventaires/phb/armes-srd-2024.json'));
const entries=require('./translation-fixtures.cjs').pack('armes').entries;
assert.equal(catalog.weapons.length,38);
const properties=new Map(entries.filter(r=>/^proprietes-armes-2024\.[a-z-]+$/.test(r.id)).map(r=>[r.id.split('.')[1],r]));
const masters=new Map(entries.filter(r=>/^mastery\.[a-z]+$/.test(r.id)).map(r=>[r.id.split('.')[1],r]));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#item',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const cards=[];
function para(card,label,en){const p=d.createElement('p');p.innerHTML='<strong>'+label+'.</strong> ';const span=d.createElement('span');span.textContent=en;p.append(span);card.append(p);return p;}
for(const weapon of catalog.weapons){
 const card=d.createElement('section');card.className='stdcontent';const title=d.createElement('h2');title.textContent=weapon.en;card.append(title);
 const type=d.createElement('em');type.textContent=weapon.type.replace(' Weapons',' weapon');card.append(type);
 const dice=d.createElement('b');dice.className='dodieroll';dice.textContent=weapon.damage.split(' ')[0];card.append(dice);
 const rules=[];
 for(const name of weapon.properties){const row=properties.get(name.toLowerCase());assert.ok(row,'Missing property '+name);const en=row.en.split('For example')[0].trim();rules.push({p:para(card,name,en),en});}
 const master=masters.get(weapon.mastery.toLowerCase());assert.ok(master,'Missing mastery '+weapon.mastery);rules.push({p:para(card,weapon.mastery,master.en),en:master.en});
 main.append(card);cards.push({card,title,weapon,dice,rules});
}
const original=main.innerHTML,dice=cards.map(c=>c.dice),values=dice.map(e=>e.textContent);let clicks=0;dice.forEach(e=>e.onclick=()=>clicks++);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<300&&!f();i++)await pause(25);assert.ok(f(),'Weapons translation timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>cards.every(c=>c.title.textContent===c.weapon.fr&&c.rules.every(r=>!r.p.textContent.includes(r.en))));
 for(const c of cards){assert.equal(c.title.textContent,c.weapon.fr);for(const r of c.rules)assert.doesNotMatch(r.p.textContent,/\b(?:When you|You can|That extra attack|This property|If you|For example)\b/,c.weapon.en);}
 const handaxe=cards.find(c=>c.weapon.en==='Handaxe');assert.match(handaxe.card.textContent,/Légère\./);assert.doesNotMatch(handaxe.card.textContent,/Lumière/);
 dice.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.textContent,values[i]);e.click()});assert.equal(clicks,38);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);
 console.log('PASS weapons: 38 armes 2024, toutes leurs propriétés et bottes, variantes sans exemple, dés et retour exact.');
 }catch(e){console.error('Remaining',cards.filter(c=>c.rules.some(r=>r.p.textContent.includes(r.en))).map(c=>c.weapon.en));throw e;}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
