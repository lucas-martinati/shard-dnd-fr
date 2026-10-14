const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const rows=require('./translation-fixtures.cjs').entries();
const get=id=>rows.find(e=>e.id==='barbarian.high.'+id);
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#play?mode=character',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const cases=[
 ['forceful-blow', 'Forceful Blow', '<strong>Forceful Blow.</strong> ',get('forceful-blow').en,'Coup appuyé.'],
 ['frenzy','Frenzy','<b><i>Frenzy.</i></b> ',get('frenzy').en.replace('Reckless Attack','<strong>Reckless Attack</strong>').replace('d6s','<b class="dodieroll">d6</b>s'),'Frénésie.'],
 ['persistent-rage.2','Persistent Rage','<strong>Persistent Rage.</strong> ',get('persistent-rage.2').en.replace('Unconscious','<a href="#condition-unconscious">Unconscious</a>').replace('Incapacitated','<a href="#condition-incapacitated">Incapacitated</a>'),'Rage persistante.'],
 ['brutal-strike','Brutal Strike','<strong>Brutal Strike.</strong> ',get('brutal-strike').en.replace('1d10','<b class="dodieroll">1d10</b>'),'Coup brutal.'],
 ['actor.impersonation','Impersonation','<em><strong>Impersonation.</strong></em> ',get('actor.impersonation').en,'Imposture.']
];
const example=fs.readFileSync('translations/anciens/commun/classes/metamagic-descriptions.tsv','utf8').split('\n').find(line=>line.startsWith('To be eligible')).split('|');
rows.push({id:'barbarian.high.test.spell-link',en:example[0],fr:example[1]});
cases.push(['test.spell-link','Metamagic','<strong>Metamagic.</strong> ',example[0].replace('magic missile','<a href="#spell-magic-missile"><strong>magic missile</strong></a>'),'Métamagie.']);
for(const [id,title,label,en]of cases){const p=d.createElement('p');p.dataset.id=id;p.innerHTML=label+en;main.append(p);}
const original=main.innerHTML,blocks=[...main.children],elements=[...main.querySelectorAll('b,strong,i,em,a')],links=[...main.querySelectorAll('a')],hrefs=links.map(a=>a.getAttribute('href')),dice=[...main.querySelectorAll('.dodieroll')],values=dice.map(e=>e.textContent);let clicks=0;dice.forEach(e=>e.onclick=()=>clicks++);links.forEach(e=>e.addEventListener('click',e=>{e.preventDefault();clicks++}));
w.GM_getValue=(k,f)=>k==='shard-fr-v1'?JSON.stringify({bilingual:true}):f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<240&&!f();i++)await pause(25);assert.ok(f(),'DOM update timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>blocks.every((p,i)=>p.textContent.includes(get(cases[i][0]).fr)));
 blocks.forEach((p,i)=>{
  assert.equal(p.querySelector('strong,b,em').textContent,cases[i][4],'Formatted heading stays short');
  assert.ok(p.childNodes[p.childNodes.length-1].textContent.trim().length>0,'Description remains outside heading');
 });
 assert.equal(blocks[1].querySelector('strong').textContent,'Témérité');
 assert.equal(blocks.at(-1).querySelector('a strong').textContent,'Projectile magique','Bilingual names do not prevent full French descriptions or link formatting');
 elements.forEach(e=>assert.ok(e.isConnected));dice.forEach((e,i)=>{assert.equal(e.textContent,values[i]);e.click();});links.forEach((e,i)=>{assert.equal(e.getAttribute('href'),hrefs[i]);e.click();});assert.equal(clicks,dice.length+links.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');
 enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);
 enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>blocks[0].querySelector('strong').textContent==='Coup appuyé.');
 console.log('PASS formatting: titres gras/italiques et terme en gras conservés, dés et liens cliquables intacts, restauration exacte du HTML, réactivation.');
 }catch(e){console.error(main.innerHTML);throw e;}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
