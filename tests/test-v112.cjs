const fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('node:assert/strict');
const fixture=fs.readFileSync('tests/fixtures/metamagic-v112.html','utf8');
const w=new JSDOM('<main>'+fixture+'</main>',{url:'https://play.shardtabletop.com/#play?mode=character',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;
const rows=fs.readFileSync('work/metamagic-descriptions.tsv','utf8').trim().split('\n').map(l=>l.split('|'));
const key=s=>s.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();const pairs=new Map(rows.map(([en,fr])=>[key(en),fr]));
const ps=[...d.querySelectorAll('p')],before=ps.map(e=>e.textContent),cards=[...d.querySelectorAll('.stdcontent')],controls=[...d.querySelectorAll('.tc.f2 span')],classes=controls.map(e=>e.className),dice=d.querySelector('.dodieroll');
let clicks=0;controls.forEach(e=>e.onclick=()=>clicks++);dice.onclick=()=>clicks++;
const known=fs.readFileSync('work/descriptions.tsv','utf8').trim().split('\n').map(l=>l.split('|'));
const more=d.createElement('div');more.id='extra';d.querySelector('main').append(more);
// Les variantes n’affectent que la formulation anglaise, jamais les chiffres.
const expanded=s=>s.replace(/you’ve/g,'you have').replace(/you can’t/g,'you cannot').replace(/You can’t/g,'You cannot').replace(/aren’t/g,'are not');
const variants=known.filter(([en])=>/you’ve|you can’t|You can’t|aren’t/.test(en)).map(([en,fr])=>[expanded(en),fr]);
for(const [en,fr] of variants){const p=d.createElement('p');p.textContent=en;more.append(p);}
const extra=[...more.children];
const unknown=d.createElement('p');unknown.textContent="You've invented a mysterious unknown feature and can't predict what it does.";more.append(unknown);
const unknownBefore=unknown.textContent;
const negative=d.createElement('p');negative.textContent="You can use only two Metamagic options on a spell when you cast it unless otherwise noted in one of those options.";more.append(negative);const negativeBefore=negative.textContent;
rows.slice(9).forEach(([en])=>{const p=d.createElement('p');p.textContent=en;more.append(p)});
const additional=[...more.children].slice(extra.length+2);
const original=d.querySelector('main').textContent;
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f,msg){for(let i=0;i<160&&!f();i++)await pause(100);assert.ok(f(),msg);}
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>ps.every((p,i)=>key(p.textContent)===key(pairs.get(key(before[i]))||before[i])),'All 18 metamagic cards translated');
 await wait(()=>extra.every((p,i)=>key(p.textContent)===key(variants[i][1])),'Contractions in existing class features');
 await wait(()=>additional.every((p,i)=>key(p.textContent)===key(rows[i+9][1])),'Font of Magic and Flexible Casting');
 assert.equal(cards.length,18);assert.equal(controls.length,18);assert.equal(dice.textContent,'d20');assert.ok(dice.isConnected);
 controls.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.className,classes[i]);e.click();});dice.click();assert.equal(clicks,19);
 const oldHeight=cards[4].querySelector('.pre-wrap').textContent,newHeight=cards[12].querySelector('.pre-wrap').textContent;
 assert.match(oldHeight,/3 points de sorcellerie.*premier jet/);assert.match(newHeight,/2 points de sorcellerie/);assert.doesNotMatch(newHeight,/premier/);
 assert.doesNotMatch(cards[0].textContent,/aucun dégât/);assert.match(cards[8].textContent,/aucun dégât/);
 assert.match(cards[7].textContent,/seconde créature/);assert.match(cards[17].textContent,/niveau effectif de 1/);
 assert.equal(unknown.textContent,unknownBefore);assert.equal(negative.textContent,negativeBefore,'Different rule is not matched');
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled'));assert.equal(root.getElementById('panel').hidden,true);
 const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>d.querySelector('main').textContent===original,'Exact restore, including contractions');
 enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>ps.every((p,i)=>key(p.textContent)===key(pairs.get(key(before[i]))||before[i])),'Reactivation');
 console.log(`PASS 1.12: 18 cartes métamagie, ${variants.length} variantes d’aptitudes, Source de magie/Incantation flexible, éditions distinctes, cases et dé cliquables, règles inconnues intactes, restauration exacte.`);
 }finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
