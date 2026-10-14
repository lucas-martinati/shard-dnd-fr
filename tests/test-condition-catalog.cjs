const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const cards=JSON.parse(fs.readFileSync('tests/fixtures/condition-cards.json','utf8'));
const catalogue=JSON.parse(fs.readFileSync('audit/inventaires/conditions-shard.json','utf8')).fiches;
const rows=require('./translation-fixtures.cjs').entries(),byId=new Map(rows.map(row=>[row.id,row]));
assert.equal(cards.length,48);assert.equal(catalogue.length,48);
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#customtable?type=Conditions',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main'),cases=[],articles=[];
for(const [i,card]of cards.entries()){
 assert.equal(catalogue[i].name,card.name);assert.deepEqual(catalogue[i].sections,card.blocks.filter(b=>b.entry).map(b=>b.entry));
 const article=d.createElement('article');article.className='h-100 hoverhighlight pa1';const title=d.createElement('div');title.className='f1 titlecolor';title.textContent=card.name;article.append(title);article.insertAdjacentHTML('beforeend',card.html);main.append(article);articles.push(article);
 const blocks=[...article.querySelectorAll('p,li,td,th')].filter(el=>!el.querySelector('p,li,td,th')&&el.textContent.trim());assert.equal(blocks.length,card.blocks.length,card.name);
 blocks.forEach((el,j)=>{const expected=card.blocks[j];assert.equal(el.textContent.trim().replace(/\s+/g,' '),expected.en);if(expected.entry)assert.equal(byId.get(expected.entry)?.fr,expected.fr);cases.push({el,...expected,name:card.name,source:card.source});});
}
const polymorphFixture=JSON.parse(fs.readFileSync('tests/fixtures/condition-polymorph.json','utf8'));
const polymorph=d.createElement('section');polymorph.className='stdcontent';polymorph.innerHTML=polymorphFixture.html;main.append(polymorph);
const polymorphRow=byId.get(polymorphFixture.entry);assert.equal(polymorph.querySelector('p').textContent,polymorphRow.en);
// Extrait utilisateur 2024 : relancer n’importe quel dé, sans remplacer
// l’ancienne Inspiration qui accorde l’Avantage dans le catalogue Shard.
const heroic=[
 {en:'If you (a player character) have Heroic Inspiration, you can expend it to reroll any die immediately after rolling it, and you must use the new roll.',fr:'Si vous (un personnage joueur) avez l’Inspiration héroïque, vous pouvez la dépenser pour relancer n’importe quel dé immédiatement après l’avoir lancé, et vous devez utiliser le nouveau résultat.'},
 {en:'If you gain Heroic Inspiration but already have it, it’s lost unless you give it to a player character who lacks it.',fr:'Si vous recevez l’Inspiration héroïque alors que vous l’avez déjà, elle est perdue, à moins que vous ne la donniez à un personnage joueur qui ne l’a pas.'},
];
const heroicDetails=d.createElement('section');heroicDetails.className='stdcontent';heroicDetails.innerHTML='<h3>Heroic Inspiration</h3><div class="pre-wrap">'+heroic.map(row=>'<p>'+row.en.replace('Heroic Inspiration','<a href="#heroic-inspiration">Heroic Inspiration</a>')+'</p>').join('')+'</div>';main.append(heroicDetails);
heroicDetails.querySelectorAll('p').forEach((el,i)=>cases.push({el,...heroic[i],name:'Heroic Inspiration'}));
const heroicBreaks=d.createElement('div');heroicBreaks.className='pre-wrap';heroicBreaks.innerHTML=heroic.map(row=>row.en.replaceAll('’',"'")).join('<br>');main.append(heroicBreaks);
const original=main.innerHTML,structural=[...main.querySelectorAll('p,li,ul,figure,table,tbody,tr,td,th,strong,b,i,a,.dodieroll')],links=[...main.querySelectorAll('a')],hrefs=links.map(a=>a.getAttribute('href')),dice=[...main.querySelectorAll('.dodieroll')],diceHTML=dice.map(el=>el.innerHTML);let clicks=0;
links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();clicks++;}));dice.forEach(el=>el.addEventListener('click',()=>clicks++));assert.equal(dice.length,2);assert.ok(links.length>=5);
w.GM_getValue=(key,fallback)=>fallback;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(check){for(let i=0;i<500&&!check();i++)await pause(25);assert.ok(check(),'Condition catalogue translation timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>cases.every(c=>c.el.textContent.trim()===c.fr)&&polymorph.querySelector('h3').textContent==='Transformation'&&polymorph.querySelector('p').textContent===polymorphRow.fr&&heroicBreaks.textContent===heroic.map(row=>row.fr).join(''));
 assert.equal(heroicDetails.querySelector('h3').textContent,'Inspiration héroïque');assert.equal(heroicBreaks.querySelectorAll('br').length,1);
 assert.match(heroicDetails.textContent,/n’importe quel dé immédiatement/);assert.match(heroicDetails.textContent,/devez utiliser le nouveau résultat/);assert.doesNotMatch(heroicDetails.textContent,/Avantage/);
 const legacyInspiration=articles.find((_,i)=>cards[i].name==='Inspiration');assert.match(legacyInspiration.textContent,/Avantage/);assert.doesNotMatch(legacyInspiration.textContent,/nouveau résultat/);
 structural.forEach(el=>assert.ok(el.isConnected,'Structure conservée'));
 links.forEach((a,i)=>{assert.equal(a.getAttribute('href'),hrefs[i]);assert.ok(a.textContent.trim(),'Lien non vidé');a.click();});dice.forEach((el,i)=>{assert.equal(el.innerHTML,diceHTML[i],'Dé et icône inchangés');el.click();});assert.equal(clicks,links.length+dice.length);
 for(const name of ['Enlarge','Reduce','Turned','Zero Speed','Radiate Light 40'])assert.ok(!articles.find((_,i)=>cards[i].name===name).querySelector('.titlecolor').textContent.includes(name));
 assert.equal(polymorph.querySelectorAll('p').length,1);assert.match(polymorph.querySelector('p').textContent,/La transformation/);assert.match(polymorph.querySelector('p').textContent,/0 point de vie/);
 const oldExhaustion=articles.find((_,i)=>cards[i].name==='Exhaustion'&&!cards[i].source.includes('2024')),newExhaustion=articles.find((_,i)=>cards[i].name==='Exhaustion'&&cards[i].source.includes('2024'));
 assert.equal(oldExhaustion.querySelectorAll('tr').length,7);assert.match(oldExhaustion.textContent,/Maximum de points de vie réduit de moitié/);assert.doesNotMatch(newExhaustion.textContent,/Maximum de points de vie réduit de moitié/);assert.match(newExhaustion.textContent,/2 fois votre niveau/);
 const oldStunned=articles.find((_,i)=>cards[i].name==='Stunned'&&!cards[i].source.includes('2024')),newStunned=articles.find((_,i)=>cards[i].name==='Stunned'&&cards[i].source.includes('2024'));
 assert.match(oldStunned.textContent,/ne peut pas se déplacer/);assert.doesNotMatch(newStunned.textContent,/ne peut pas se déplacer|Vitesse 0/);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>cases.every(c=>c.el.textContent.trim()===c.fr));
 console.log(`PASS conditions: ${cards.length} fiches, ${cases.length} paragraphes/puces/cellules, Inspiration héroïque en paragraphes et BR, éditions 2014 et 2024 distinctes, Métamorphose, tableau d’Épuisement, liens et dés actifs, restauration exacte.`);
 }catch(error){console.error(cases.filter(c=>c.el.textContent.trim()!==c.fr).map(c=>({name:c.name,en:c.en,expected:c.fr,actual:c.el.textContent})));throw error;}finally{w.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
