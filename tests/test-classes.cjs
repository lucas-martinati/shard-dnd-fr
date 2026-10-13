const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const rows=JSON.parse(fs.readFileSync('work/class-texts.json','utf8'));
const complete=JSON.parse(fs.readFileSync('work/complete-texts.json','utf8'));
const classes=['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard'];
assert.equal(rows.length,232);assert.deepEqual([...new Set(rows.map(r=>r.class))],classes);
const options=JSON.parse(fs.readFileSync('work/option-texts.json','utf8'));
const coverage=JSON.parse(fs.readFileSync('work/option-coverage.json','utf8'));
assert.equal(coverage.filter(r=>r.kind==='metamagic'&&r.description).length,10);
assert.equal(coverage.filter(r=>r.kind==='invocation'&&r.description).length,28);
rows.push(...options.map((r,i)=>({...r,class:'option',name:'option '+i})));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#play?mode=character',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const key=s=>s.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
const expected=rows.map(row=>{const matches=complete.filter(r=>key(r.en)===key(row.en));return (matches.filter(r=>r.source.startsWith('Traduction de')).at(-1)||matches[0]).fr});
for(const row of rows){const p=d.createElement('p');p.textContent=row.en;p.dataset.class=row.class;p.innerHTML=p.innerHTML.replace(/\b(?:\d+)?d\d+\b/gi,value=>`<b class="dodieroll">${value}</b>`);main.append(p);}
const original=main.innerHTML,blocks=[...main.children],dice=[...main.querySelectorAll('.dodieroll')],values=dice.map(e=>e.textContent);let clicks=0;dice.forEach(e=>e.onclick=()=>clicks++);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<300&&!f();i++)await pause(25);assert.ok(f(),'Translation timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>blocks.every(p=>!/^You |^When |^While |^As |^If |^Your |^Whenever |^At /.test(p.textContent)));
 blocks.forEach((p,i)=>assert.equal(key(p.textContent),key(expected[i]),rows[i].class+': '+rows[i].name));
 dice.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.textContent,values[i]);e.click()});assert.equal(clicks,dice.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');
 enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);
 console.log(`PASS classes: 232 aptitudes des 12 classes SRD et ${options.length} blocs d’options, ${dice.length} dés préservés, restauration exacte.`);
 }finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
