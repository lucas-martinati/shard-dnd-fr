const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const rows=JSON.parse(fs.readFileSync('work/spell-sections.json'));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
for(const row of rows){const p=d.createElement('p');p.textContent=row.en;p.innerHTML=p.innerHTML.replace(/\b(?:\d+)?d\d+(?=s?\b)/g,dice=>`<b class="dodieroll">${dice}</b>`);main.append(p);}
const ps=[...main.children],original=main.innerHTML,dice=[...main.querySelectorAll('.dodieroll')],values=dice.map(e=>e.textContent);let clicks=0;dice.forEach(e=>e.onclick=()=>clicks++);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn){for(let i=0;i<1200&&!fn();i++)await pause(25);assert.ok(fn(),'DOM update timed out');}
const pending=()=>ps.map((p,i)=>({text:p.textContent,row:rows[i]})).filter(({text,row})=>text===row.en&&row.en!==row.fr);
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>!pending().length);
 ps.forEach((p,i)=>{const row=rows[i];if(!/\d+\s*-?\s*(?:feet|foot|ft)\b/i.test(row.en))assert.equal(p.textContent,row.fr,row.en.slice(0,80));});
 dice.forEach((e,i)=>{assert.ok(e.isConnected);assert.equal(e.textContent,values[i]);e.click();});assert.equal(clicks,dice.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original);
 console.log(`PASS spell sections: ${rows.length} segments et libellés, ${dice.length} dés cliquables, restauration exacte du HTML.`);
 }catch(e){console.error('Pending sections:',pending().slice(0,4));throw e;}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
