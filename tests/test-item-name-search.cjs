const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const report=JSON.parse(fs.readFileSync('audit/inventaires/noms-objets-aidedd.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('sources-generation/catalogues/aidedd-2024.json','utf8'));
const lexicon=JSON.parse(fs.readFileSync('outputs/lexique-en-fr.json','utf8')).entries;
const norm=s=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const byEnglish=new Map(lexicon.map(e=>[norm(e.en),e]));
const ring=catalog.find(e=>e.en==='Ring of Elemental Command');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(f){for(let i=0;i<400&&!f();i++)await pause(25);assert.ok(f(),'Item name update timed out');}
(async()=>{
 const w=new JSDOM('<main></main><input type="search" aria-label="Search">',{url:'https://play.shardtabletop.com/#item',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;
 try{
  w.eval(fs.readFileSync('work/aidedd-parser.js','utf8'));
  assert.equal(w.aideddURL(ring.url,'magic-item'),ring.url);
  assert.equal(w.aideddURL(decodeURI(ring.url),'magic-item'),ring.url);
  for(const url of ['https://evil.example/magic-item/fr/anneau','https://www.aidedd.org/magic-item/fr/anneau?secret=x','https://www.aidedd.org/magic-item/fr/a%2Fb','https://www.aidedd.org/magic-item/fr/%ZZ','https://www.aidedd.org/magic-item/fr/a%3Fb','https://user@www.aidedd.org/magic-item/fr/anneau'])assert.equal(w.aideddURL(url,'magic-item'),null,url);
  const html='<table>'+report.modern.map(r=>'<tr><td></td><td><a href="'+r.url+'">'+r.fr+'</a></td><td></td><td></td><td>'+r.en+'</td><td>Wondrous Item</td></tr>').join('')+'</table>';
  const parsed=w.parseAideDDCatalog(html,'magic-item');assert.equal(parsed.length,350);assert.equal(parsed.find(r=>r.en===ring.en).url,ring.url);
  // Simuler l’ancien index en cache : l’anneau ajouté doit rester accessible.
  w.GM_getValue=(k,f)=>k==='shard-fr-aidedd-v1'?JSON.stringify({savedAt:Date.now(),rows:catalog.filter(r=>r.en!==ring.en)}):f;
  w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
  const cases=[...report.modern,...report.correctedNames].map(e=>{const button=d.createElement('button');button.textContent=e.en;d.querySelector('main').append(button);return{...e,button};});
  const sentinel=d.createElement('button');sentinel.textContent='Close';d.querySelector('main').append(sentinel);const original=d.querySelector('main').innerHTML;
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));await wait(()=>sentinel.textContent==='Fermer');
  cases.forEach(e=>assert.equal(e.button.textContent,e.fr,e.en));
  const roots=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).filter(Boolean);
  const search=roots.find(r=>r.querySelector('[aria-label="Suggestions de recherche D&D en français"]'));
  const config=roots.find(r=>r.getElementById('enabled')),input=d.querySelector('input[type=search]');let received;
  input.addEventListener('change',()=>received=input.value);
  const queries=[...report.modern,...report.legacy.filter(r=>r.en!=='Perfume of Bwitching'),...report.correctedNames.flatMap(r=>[{en:r.en,fr:r.before},{en:r.en,fr:r.fr}])];
  for(const row of queries){
   input.value=row.fr;input.dispatchEvent(new w.Event('input',{bubbles:true}));
   const button=[...search.querySelectorAll('button')].find(b=>norm(b.querySelector('small').textContent)===norm(row.en));
   assert.ok(button,'Recherche absente : '+row.fr+' → '+row.en);
   assert.equal(button.querySelector('strong').textContent,byEnglish.get(norm(row.en)).fr);
   button.click();assert.equal(norm(received),norm(row.en));
  }
  const enabled=config.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>d.querySelector('main').innerHTML===original);
  console.log(`PASS noms objets : 350 références 2024, 322 anciennes recherches, 15 corrections avec alias, cache ancien, accent des URLs et restauration exacte (${queries.length} recherches).`);
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
