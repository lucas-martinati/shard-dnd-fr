const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const source="You have learned a unique magical technique from your mentor.";
const french='Votre mentor vous a enseigné une technique magique particulière.';
const knownIntro='You exert control over the elements, creating one of the following effects within range.';
const conflicting="You cannot invoke this mysterious power without your mentor.";
const w=new JSDOM(`<p id="cached">${source}</p><p id="conflict">${conflicting}</p><p id="known">${knownIntro}</p><span id="cachedName">Light</span><input type="search" aria-label="Search"><input placeholder="Name" value="">`,{url:'https://play.shardtabletop.com/',runScripts:'outside-only',pretendToBeVisual:true}).window;
const d=w.document;
w.GM_getValue=(key,fallback)=>key==='shard-fr-descriptions-v18'?JSON.stringify({savedAt:Date.now(),validationVersion:2,pairs:[
 ["you've learned a unique magical technique from your mentor.",french],
 ["you can't invoke this mysterious power without your mentor.",'Une ancienne traduction.'],
 ["you cannot invoke this mysterious power without your mentor.",'Une traduction incompatible.'],
 [knownIntro,'Cache non vérifié prioritaire à tort.'],
 ['light','Une valeur de champ distant']
],sources:[["you've learned a unique magical technique from your mentor.",'https://www.aidedd.org/spell/fr/elementalisme'],[knownIntro,'https://invalid.example/reference'],['light','https://www.aidedd.org/spell/fr/elementalisme']]}):fallback;
w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(fn){for(let i=0;i<160&&!fn();i++)await pause(25);assert.ok(fn(),'DOM update timed out');}
(async()=>{try{
 w.eval(code);await wait(()=>d.getElementById('cached').textContent===french);
 assert.equal(d.getElementById('conflict').textContent,conflicting,'Conflicting normalized cache keys stay untranslated');
 await wait(()=>d.getElementById('known').textContent.includes('contrôle')&&d.getElementById('cachedName').textContent==='Lumière');
 assert.doesNotMatch(d.getElementById('known').textContent,/Cache non vérifié/,'A cache without valid provenance does not override the SRD');
 const roots=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).filter(Boolean);
 const search=roots.find(r=>r.querySelector('[aria-label="Suggestions de recherche D&D en français"]'));
 const config=roots.find(r=>r.getElementById('enabled'));
 const input=d.querySelector('input[type=search]');let received;
 input.addEventListener('input',()=>received=input.value);
 for(const [query,english]of [['boule de feu','Fireball'],['trait ensorcele','Witch Bolt']]){
  input.value=query;input.dispatchEvent(new w.Event('input',{bubbles:true}));
  const button=[...search.querySelectorAll('button')].find(b=>b.querySelector('small').textContent===english);assert.ok(button,query);button.click();
  assert.equal(input.value,english);assert.equal(received,english);
 }
 const enabled=config.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
 await wait(()=>d.getElementById('cached').textContent===source);
 enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>d.getElementById('cached').textContent===french);
 assert.equal(d.getElementById('conflict').textContent,conflicting);
 console.log('PASS runtime: migration des contractions du cache, conflits conservés, suggestions françaises/sans accents, événements de recherche, désactivation/réactivation.');
 }finally{w.close();}})().catch(error=>{console.error(error);process.exitCode=1});
