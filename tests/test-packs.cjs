const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const entries=require('./translation-fixtures.cjs').entries();
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#play?mode=character',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
for(const entry of entries){const p=d.createElement('p');p.textContent=entry.en;p.innerHTML=p.innerHTML.replace(/\b(?:\d+)?d\d+\b/g,dice=>`<b class="dodieroll">${dice}</b>`);main.append(p);}
const original=main.textContent,blocks=[...main.children],dice=[...main.querySelectorAll('.dodieroll')],values=dice.map(e=>e.textContent);let clicks=0;dice.forEach(e=>e.onclick=()=>clicks++);
// Titre scindé, texte complet et sous-parties : même paire, DOM Shard différent.
const composite=d.createElement('div');composite.className='pre-wrap';
const inspiration=entries.filter(e=>/^bard\.inspiration\.[12]$/.test(e.id));composite.innerHTML='<p><strong>Inspiration bardique.</strong> '+inspiration[0].en+'</p><p><strong>Using Bardic Inspiration.</strong> '+inspiration[1].en+'</p>';d.body.append(composite);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<250&&!f();i++)await pause(25);assert.ok(f(),'Translation timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>blocks.every((p,i)=>p.textContent===entries[i].fr));
 await wait(()=>composite.textContent.includes('Utiliser l’Inspiration bardique.')&&inspiration.every(e=>composite.textContent.includes(e.fr)));
 dice.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.textContent,values[i]);e.click();});assert.equal(clicks,dice.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');
 enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.textContent===original);
 console.log(`PASS packs: ${entries.length} nouvelles traductions, paragraphes et titres combinés, ${dice.length} dés cliquables conservés, restauration exacte.`);
 }finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
