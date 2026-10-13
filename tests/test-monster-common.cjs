const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const corpus=JSON.parse(fs.readFileSync('translations/monstres/traits-communs-2024.json','utf8')).traits;
assert.equal(corpus.length,217);assert.equal(new Set(corpus.map(r=>r.monster)).size,183);assert.equal(new Set(corpus.map(r=>r.family)).size,9);
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#monster',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const cases=corpus.map(row=>{
 const p=d.createElement('p'),heading=d.createElement('strong'),em=d.createElement('em');em.textContent=row.heading+'.';heading.append(em);p.append(heading,d.createTextNode(' '+row.en));main.append(p);
 // Un état reste un lien Shard ; les dés conservent leur icône et leur clic.
 const body=p.lastChild,parts=body.data.split(/(\b\d+d\d+\b|Incapacitated)/g);body.remove();
 for(const part of parts){if(/^\d+d\d+$/.test(part)){const die=d.createElement('b');die.className='dodieroll';die.innerHTML='<span class="fas">\uf6cf</span>'+part;p.append(die);}else if(part==='Incapacitated'){const link=d.createElement('a');link.href='#customlist?type=Conditions&id=common-neutralized';link.textContent=part;p.append(link);}else p.append(d.createTextNode(part));}
 return {p,row,heading:em};
});
const unknown=d.createElement('p');unknown.textContent='The arcanaloth has Advantage on saving throws against spells and other magical effects. This trait ends when the silver bell rings.';main.append(unknown);
const different=d.createElement('p');different.textContent="The baboon has Advantage on an attack roll against a creature if at least one of the baboon's allies is within 15 feet of the creature and the ally doesn't have the Incapacitated condition.";main.append(different);
const original=main.innerHTML,elements=[...main.querySelectorAll('p,strong,em,a,b,span')],dice=[...main.querySelectorAll('.dodieroll')],diceHTML=dice.map(el=>el.innerHTML),links=[...main.querySelectorAll('a')],hrefs=links.map(el=>el.getAttribute('href'));let clicks=0;
for(const el of [...dice,...links])el.addEventListener('click',e=>{e.preventDefault();clicks++;});
w.GM_getValue=(key,fallback)=>fallback;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const clean=s=>s.replace(/[\uE000-\uF8FF]/g,'').replace(/\s+/g,' ').trim();
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn){for(let i=0;i<600&&!fn();i++)await pause(25);assert.ok(fn(),'Common monster traits timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>cases.every(({p,row})=>clean(p.textContent)===row.fullFR));
 cases.forEach(({heading,row})=>assert.equal(clean(heading.textContent),row.frHeading+'.',row.monster));
 elements.forEach(el=>assert.ok(el.isConnected));dice.forEach((el,i)=>{assert.equal(el.innerHTML,diceHTML[i]);el.click();});links.forEach((el,i)=>{assert.equal(el.getAttribute('href'),hrefs[i]);assert.equal(el.textContent,'Neutralisé');el.click();});assert.equal(clicks,dice.length+links.length);
 assert.match(unknown.textContent,/This trait ends when the silver bell rings/);assert.doesNotMatch(unknown.textContent,/Cette créature/);assert.match(different.textContent,/15 feet/);assert.doesNotMatch(different.textContent,/à 5 feet/);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);
 console.log(`PASS traits communs: ${corpus.length} traits de 183 créatures, neuf familles, fonctionnement sans réseau, titres gras/italique, états liés, dés et icônes, exceptions inconnues et distances différentes conservées, restauration exacte.`);
 }catch(error){console.error(cases.filter(({p,row})=>clean(p.textContent)!==row.fullFR).slice(0,12).map(({p,row})=>({monster:row.monster,expected:row.fullFR,actual:clean(p.textContent)})));throw error;}finally{w.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
