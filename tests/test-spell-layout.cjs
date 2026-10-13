const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const reference=JSON.parse(fs.readFileSync('translations/sorts/spell-reference.json','utf8')).find(r=>r.en==='Elementalism');
const labels=[['Beckon Air','Appel d’air'],['Beckon Earth','Appel de terre'],['Beckon Fire','Appel de feu'],['Beckon Water','Appel d’eau'],['Sculpt Element','Façonnage élémentaire']];
function split(text,names){const offsets=names.map(name=>({name,at:text.indexOf(name+'. ')}));assert.ok(offsets.every(o=>o.at>=0));offsets.sort((a,b)=>a.at-b.at);return {intro:text.slice(0,offsets[0].at).trim(),effects:new Map(offsets.map((o,i)=>[o.name,text.slice(o.at+o.name.length+2,offsets[i+1]?.at??text.length).trim()]))};}
const english=split(reference.englishBody,labels.map(r=>r[0])),french=split(reference.frenchBody,labels.map(r=>r[1]));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const content='<p>'+escape(english.intro)+'</p>'+labels.map(([en])=>'<p><b><i>'+en+'.</i></b> '+escape(english.effects.get(en)).replace('torches','<a href="#torch">torches</a>')+'</p>').join('');
const compact=escape(english.intro)+' '+labels.map(([en])=>'<b><i>'+en+'.</i></b> '+escape(english.effects.get(en))).join(' ');
const breaks=escape(english.intro)+'<br>'+labels.map(([en])=>'<b><i>'+en+'.</i></b> '+escape(english.effects.get(en))).join('<br>');
const unknownParts=['A silver cloud gathers around the tower.','The tower changes color until sunrise.'];
const page='<article role="dialog"><h2>Elementalism</h2><div class="pre-wrap"><span>'+content+'</span></div><p id="unknown">You invented a new elemental technique that no reference describes.</p></article><div id="compact" class="pre-wrap"><p>'+compact+'</p></div><div id="breaks" class="description">'+breaks+'</div><div id="unmatched" class="pre-wrap"><p>'+unknownParts[0]+'</p><p>'+unknownParts[1]+'</p></div>';
const catalog=JSON.parse(fs.readFileSync('work/aidedd-catalog.json','utf8'));
const frURL='https://www.aidedd.org/spell/fr/elementalisme',enURL='https://www.aidedd.org/spell/elementalism';
// Références simulées : ordre FR différent, exception absente, variante EN distincte.
// Les formulations de base sont celles du corpus SRD CC-BY-4.0 du projet.
const onlineFrench=new Map(french.effects);onlineFrench.set('Appel de terre',onlineFrench.get('Appel de terre').replace('Vous produisez','Vous façonnez').replace(' ou vous faites apparaître','. Vous pouvez aussi faire apparaître'));
onlineFrench.set('Façonnage élémentaire',onlineFrench.get('Façonnage élémentaire').replace('celle d’une créature','celle d’une créature ou d’un objet'));
onlineFrench.set('Appel d’air',onlineFrench.get('Appel d’air').split(/(?<=\.)\s+/)[0]);
const remoteIntro='Vous façonnez les éléments pour produire l’un des effets suivants à portée :';
function remote(lang){
 const order=lang==='en'?labels:[labels[3],labels[1],labels[0],labels[2],labels[4]];
 const intro=lang==='en'?english.intro.replace(/\.$/,':'):remoteIntro;
 const body=escape(intro)+'<br>'+order.map(([en,fr])=>'<strong>'+escape(lang==='en'?en:fr)+'</strong>. '+escape(lang==='en'?english.effects.get(en).replace('such as that of a creature)','such as that of a creature or an object)'):onlineFrench.get(fr))+'<br>').join('');
 const url=lang==='en'?enURL:frURL,other=lang==='en'?frURL:enURL;
 return '<link rel="canonical" href="'+url+'"><div class="col1"><h1>'+ (lang==='en'?'Elementalism':'Élémentalisme')+'</h1><div class="trad"><a href="'+other+'">['+(lang==='en'?'FR':'EN')+']</a></div><div class="r">'+(lang==='en'?'Range: 30 feet':'Portée : 9 m')+'</div><div class="description">'+body+'<script>throw Error("Untrusted remote script")</script><iframe src="https://invalid.example"></iframe></div></div>';
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(f,label){for(let i=0;i<350&&!f();i++)await pause(20);assert.ok(f(),label||'Layout update timed out');}
const key=s=>s.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
(async()=>{
 const saved=new Map(),requests=[];
 const w=new JSDOM(page,{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,box=d.querySelector('.pre-wrap');
 const layouts=[box,d.getElementById('compact'),d.getElementById('breaks'),d.getElementById('unmatched')],originals=layouts.map(e=>e.innerHTML);
 const original=box.innerHTML,paragraphs=[...box.querySelectorAll('p')],styles=[...box.querySelectorAll('b,i')],link=box.querySelector('a');let clicks=0;link.onclick=e=>{e.preventDefault();clicks++};
 w.GM_getValue=(k,f)=>k==='shard-fr-aidedd-v1'?JSON.stringify({savedAt:Date.now(),rows:catalog}):k==='shard-fr-descriptions-v18'?JSON.stringify({savedAt:Date.now(),pairs:[[unknownParts.join(' '),'Cette traduction indivisible couvre les deux paragraphes.']]}):f;w.GM_setValue=(k,v)=>saved.set(k,v);w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=options=>requests.push(options);
 try{
  w.eval(code);
  await wait(()=>paragraphs.every((p,i)=>i===0?!p.textContent.includes('You exert'):key(p.querySelector('b').textContent)===key(labels[i-1][1]+'.')),'Offline named options');
  await wait(()=>[...d.querySelectorAll('#compact b,#breaks b')].every((e,i)=>key(e.textContent)===key(labels[i%5][1]+'.')),'Formatted options within one P or separated by BR');
  assert.equal(d.querySelectorAll('#compact p').length,1);assert.equal(d.querySelectorAll('#breaks br').length,5);
  assert.deepEqual([...d.querySelectorAll('#unmatched p')].map(e=>e.textContent),unknownParts,'An unaligned whole-block cache must not redistribute paragraphs');
  assert.equal(box.querySelectorAll('p').length,6);styles.forEach(el=>assert.ok(el.isConnected));paragraphs.forEach(p=>assert.ok(p.isConnected));
  assert.match(paragraphs[1].textContent,/ne sont pas affectés/);assert.doesNotMatch(paragraphs[2].textContent,/20 cl/);assert.match(paragraphs[3].textContent,/fumée/);assert.match(paragraphs[4].textContent,/20 cl/);assert.match(paragraphs[5].textContent,/1 foot/);
  assert.equal(d.getElementById('unknown').textContent,'You invented a new elemental technique that no reference describes.');
  await wait(()=>requests.some(r=>r.url===frURL),'French reference request');
  requests.find(r=>r.url===frURL).onload({status:200,finalUrl:frURL,responseText:remote('fr')});
  await wait(()=>requests.some(r=>r.url===enURL),'English reference request');
  requests.find(r=>r.url===enURL).onload({status:200,finalUrl:enURL,responseText:remote('en')});
  await wait(()=>key(paragraphs[0].textContent)===key(remoteIntro)&&paragraphs[2].textContent.includes('Vous façonnez'),'Verified AideDD takes priority over SRD');
  assert.equal(box.querySelectorAll('p').length,6);styles.forEach(el=>assert.ok(el.isConnected));
  labels.forEach(([,fr],i)=>assert.equal(key(paragraphs[i+1].querySelector('b').textContent),key(fr+'.'),'Each effect keeps its own formatted heading'));
  assert.match(paragraphs[1].textContent,/ne sont pas affectés/,'An incomplete FR reference must not remove the EN exception');
  assert.match(paragraphs[4].textContent,/20 cl/);assert.doesNotMatch(paragraphs[2].textContent,/20 cl/,'The remote paragraph order must not interchange effects');
  assert.equal(box.querySelectorAll('script,iframe').length,0);assert.ok(link.isConnected);assert.equal(link.getAttribute('href'),'#torch');link.click();assert.equal(clicks,1);
  const cache=JSON.parse(saved.get('shard-fr-descriptions-v18'));assert.ok(cache.sources.some(([en,url])=>en.includes('you exert control')&&url===frURL),'Provenance stored for verified cache');
  const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');
  enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>layouts.every((el,i)=>el.innerHTML===originals[i]),'Exact HTML restoration');
  enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>paragraphs[2].textContent.includes('Vous façonnez'));styles.forEach(el=>assert.ok(el.isConnected));
  // Le cache validé doit conserver sa priorité lors du prochain chargement.
  const next=new JSDOM(page,{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window;
  try{next.GM_getValue=(k,f)=>saved.get(k)||f;next.GM_setValue=()=>{};next.GM_registerMenuCommand=()=>{};next.eval(code);await wait(()=>next.document.querySelectorAll('.pre-wrap p')[2].textContent.includes('Vous façonnez'),'Preferred reference cache after reload');}finally{next.close();}
  console.log('PASS spell layout: 6 paragraphes, gras/italique, effets appariés par titre, priorité AideDD vérifiée et persistée, exception conservée, liens et restauration.');
 }catch(e){console.error(box.innerHTML);throw e;}finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
