const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const rows=JSON.parse(fs.readFileSync('tests/fixtures/mm-first-profiles.json','utf8'));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#monster',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');const cases=[];
for(const row of rows){const article=d.createElement('article');article.innerHTML=row.html;main.append(article);const ps=[...article.querySelectorAll('.pre-wrap p')];assert.equal(ps.length,row.expectations.length,row.name);ps.forEach((p,i)=>{assert.equal(p.textContent,row.expectations[i].en);cases.push({p,...row.expectations[i],name:row.name});});}
const sentinel=d.createElement('button');sentinel.textContent='Close';main.append(sentinel);const original=main.innerHTML,dice=[...main.querySelectorAll('.dodieroll')],values=dice.map(e=>e.textContent),links=[...main.querySelectorAll('a')],hrefs=links.map(e=>e.getAttribute('href'));let clicks=0;
[...dice,...links].forEach(e=>e.onclick=event=>{event.preventDefault();clicks++;});
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=()=>{throw Error('Le lot MM doit fonctionner sans réseau');};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<1200&&!f();i++)await pause(25);assert.ok(f(),'MM profile translation timed out');}
(async()=>{try{w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>sentinel.textContent==='Fermer');
 const plain=s=>s.replace(/\s+/g,' ').replace(/\s*:\s*/g,': ').trim();
 cases.forEach(({p,fr,name})=>assert.equal(plain(p.textContent),plain(fr),name));dice.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.textContent,values[i]);e.click();});links.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.getAttribute('href'),hrefs[i]);e.click();});assert.equal(clicks,dice.length+links.length);
 // Les liens AideDD restent disponibles quand la traduction est désactivée.
 const restored=()=>{const copy=main.cloneNode(true);copy.querySelectorAll('[data-shard-fr-link]').forEach(e=>e.remove());return copy.innerHTML;};
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>restored()===original);
 console.log(`PASS MM : ${rows.length} profils réels, ${cases.length} paragraphes, ${dice.length} dés et ${links.length} liens, valeurs et retour anglais exact.`);
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
