const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const rows=JSON.parse(fs.readFileSync('tests/fixtures/phb-spell-layouts.json','utf8')),names=JSON.parse(fs.readFileSync('tests/fixtures/phb-item-names.json','utf8'));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');const paragraphs=[];
for(const row of rows){const s=d.createElement('section');s.innerHTML='<h2></h2>'+row.html;s.querySelector('h2').textContent=row.name;main.append(s);for(const p of s.querySelectorAll('.pre-wrap p,.pre-wrap li'))if(!p.querySelector('p,li'))paragraphs.push({p,en:p.textContent,name:row.name});}
const itemEls=names.map(row=>{const el=d.createElement('button');el.textContent=row.en;main.append(el);return el;});
const unknown=d.createElement('p');unknown.textContent='Whenever a creature makes an attack roll against you before the spell ends, the attacker subtracts 1d20 from the attack roll.';main.append(unknown);
const field=d.createElement('input');field.value='Airship';main.append(field);const sentinel=d.createElement('button');sentinel.textContent='Close';main.append(sentinel);
const original=main.innerHTML,dice=[...main.querySelectorAll('.dodieroll')],diceText=dice.map(e=>e.textContent),links=[...main.querySelectorAll('a')],hrefs=links.map(e=>e.getAttribute('href')),cells=[...main.querySelectorAll('td,th')],spans=cells.map(e=>[e.rowSpan,e.colSpan]);let clicks=0;
for(const e of [...dice,...links])e.onclick=event=>{event.preventDefault();clicks++;};
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=()=>{throw Error('Ce contrôle doit fonctionner hors ligne');};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<2400&&!f();i++)await pause(25);assert.ok(f(),'PHB layout timed out');}
const numbers=s=>(s.match(/\d+(?:[.,]\d+)?/g)||[]).sort();
(async()=>{try{w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>sentinel.textContent==='Fermer');
 for(const {p,en,name}of paragraphs){if(/[A-Za-z]{3}/.test(en))assert.notEqual(p.textContent,en,name+': '+en);assert.deepEqual(numbers(p.textContent),numbers(en),name+': valeurs numériques');}
 itemEls.forEach((el,i)=>assert.equal(el.textContent,names[i].fr,names[i].en));assert.equal(field.value,'Airship');assert.match(unknown.textContent,/subtracts 1d20/);
 dice.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.textContent,diceText[i]);e.click();});links.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.getAttribute('href'),hrefs[i]);e.click();});assert.equal(clicks,dice.length+links.length);cells.forEach((e,i)=>{assert.ok(e.isConnected);assert.deepEqual([e.rowSpan,e.colSpan],spans[i]);});
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);
 console.log(`PASS PHB réel : ${rows.length} sorts, ${paragraphs.length} paragraphes/cellules, ${names.length} noms d’objets, ${dice.length} dés, ${links.length} liens, tableaux, valeurs, champs privés et restauration exacte.`);
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
