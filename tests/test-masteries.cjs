const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const pack=JSON.parse(fs.readFileSync('translations/bottes-armes-2024.json'));
const slow=pack.entries.find(e=>e.id==='mastery.slow');
const w=new JSDOM(`<main><table><tbody><tr><td>Longbow</td><td><span>Piercing</span><span id="weapon">Slow</span></td></tr></tbody></table><div id="explicit">Mastery: Slow</div><article id="mastery"><h2>Slow</h2><p>${slow.en}</p></article><article id="spell"><h2>Slow</h2><p>Casting Time: 1 action</p><p>Range: 120 feet</p><p>Duration: Concentration, up to 1 minute</p><p>Source. D&amp;D 2024 Player’s Handbook</p></article></main>`,{url:'https://play.shardtabletop.com/#item',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;
const original=d.querySelector('main').textContent;w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f){for(let i=0;i<200&&!f();i++)await pause(25);assert.ok(f(),'DOM update timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>d.getElementById('weapon').textContent==='Ralentissement');
 await wait(()=>d.querySelector('#mastery h2').textContent==='Ralentissement'&&d.querySelector('#spell h2').textContent==='Lenteur');
 assert.equal(d.getElementById('explicit').textContent,'Botte d’arme: Ralentissement');
 await wait(()=>d.querySelector('#spell [data-shard-fr-link] a'));
 assert.equal(d.querySelector('#spell [data-shard-fr-link] a').href,'https://www.aidedd.org/spell/fr/lenteur');assert.equal(d.querySelector('#mastery [data-shard-fr-link]'),null);
 assert.equal(d.querySelector('#mastery p').textContent,slow.fr);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
 // Les liens sont ajoutés par le script : comparer les textes hors lien.
 await wait(()=>d.getElementById('weapon').textContent==='Slow'&&d.querySelector('#mastery p').textContent===slow.en);
 console.log('PASS bottes: Slow arme/table/description ≠ sort Lenteur, lien AideDD réservé au sort, retour anglais.');
 }catch(e){console.error(d.querySelector('#spell').outerHTML);throw e;}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1});
