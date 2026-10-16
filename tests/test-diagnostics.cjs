const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const known='You exert control over the elements, creating one of the following effects within range.';
const unknown='Enemies immediately vanish beyond the silver moon.';
const conflict='You invoke the unknown silver bell.';
const html=`<article><h2>Fire Bolt</h2><h3>Une aptitude mystérieuse</h3><div class="pre-wrap" id="controls"><span>${known}</span><button id="button">Close</button><span>${known}</span><input id="field" placeholder="Name" value="PRIVATE_INPUT"><span>${known}</span><textarea>PRIVATE_TEXTAREA</textarea><span>${known}</span></div><p id="unknown">${unknown}</p><p>${unknown}</p><p id="conflict">${conflict}</p><p id="french">Une phrase française nouvelle.<span hidden>You gain PRIVATE_INLINE_HIDDEN</span></p><span id="label">Mystery category</span><input placeholder="Unknown filter" value="PRIVATE_VALUE"><p hidden>Enemies PRIVATE_HIDDEN</p><div style="display:none"><p>Enemies PRIVATE_CSS_HIDDEN</p></div><div contenteditable title="PRIVATE_TITLE">You gain PRIVATE_EDITOR</div><div role="textbox">You gain PRIVATE_ROLE</div><div class="ProseMirror">You gain PRIVATE_PROSEMIRROR</div><script>You gain PRIVATE_SCRIPT</script></article>`;
const w=new JSDOM(html,{url:'https://play.shardtabletop.com/#spell?private=PRIVATE_URL',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;
const metadata=d.createElement('section');
metadata.innerHTML='<button id="subclasses">Subclasses</button><div class="mv1 titletext"><i><b title="Unknown Adventure Guide">Source. </b><a>Unknown Adventure Guide</a></i></div><span title="D&amp;D 2024 PHB" aria-label="Shard Tabletop">Source:</span>';
const ignoredLabels=['D&D 2024 PHB','D&D 2024 MM','D&D 2014 DMG','D&D 2024 Player’s Handbook','Monster Manual (2024)',"Shard Player’s Guide Volume 1",'SRD 5.2.1','Shard Tabletop','Shard Tabletap','Shard','Source','Source.','Sources:','Source. D&D 2024 PHB','Sources: Shard Tabletop','Source: Unknown Adventure Guide','Unknown Adventure Guide'];
const ignoredNodes=ignoredLabels.map(text=>{const el=d.createElement('span');el.textContent=text;metadata.append(el);return el;});
const bookMention='You gain a BOOK_MENTION unknown power from D&D 2024 PHB.';
const appMention='You gain an APP_MENTION unknown power in Shard Tabletop.';
const sourceMention='Source of unknown power';
for(const text of [bookMention,appMention,sourceMention,'Mystery Manual']){const el=d.createElement(text==='Mystery Manual'?'span':'p');el.textContent=text;metadata.append(el);}
d.body.append(metadata);
const subclasses=d.getElementById('subclasses');let subclassClicks=0;subclasses.onclick=()=>subclassClicks++;
const controls=d.getElementById('controls'),original=controls.innerHTML,button=d.getElementById('button'),field=d.getElementById('field');
let clicks=0,networkCalls=0,blob,downloads=0,released=0;
button.onclick=()=>clicks++;
w.GM_getValue=(key,fallback)=>key==='shard-fr-descriptions-v18'?JSON.stringify({savedAt:Date.now(),pairs:[[conflict,null]]}):fallback;
w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=options=>{networkCalls++;options.onerror();};
w.URL.createObjectURL=value=>{blob=value;return 'blob:diagnostic';};w.URL.revokeObjectURL=()=>released++;
w.HTMLAnchorElement.prototype.click=function(){assert.equal(this.download,'shard-dnd-fr-page.json');downloads++;};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(fn){for(let i=0;i<200&&!fn();i++)await pause(25);assert.ok(fn(),'Diagnostic DOM update timed out');}
async function exported(root){await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();return new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.onerror=reject;reader.readAsText(blob);});}
(async()=>{try{
  w.eval(code);
  await wait(()=>[...controls.querySelectorAll('span')].every(el=>el.textContent.includes('contrôle')));
  await wait(()=>subclasses.textContent==='Sous-classes');subclasses.click();assert.equal(subclassClicks,1);
  assert.equal(d.getElementById('button'),button);assert.equal(d.getElementById('field'),field);assert.equal(field.value,'PRIVATE_INPUT');button.click();assert.equal(clicks,1);
  const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('scanMissing'));
  assert.equal(root.getElementById('exportMissing').disabled,true);
  const before=networkCalls;root.getElementById('scanMissing').click();
  assert.equal(networkCalls,before,'Le diagnostic ne déclenche aucune requête');
  const report=await exported(root),row=report.missing.find(row=>row.en===unknown);
  assert.ok(row);assert.equal(row.occurrences,2);assert.equal(row.reason,'reference-unavailable');assert.equal(row.context,'Fire Bolt');
  assert.equal(report.missing.find(row=>row.en===conflict).reason,'conflicting-translations');
  assert.ok(report.missing.some(row=>row.en==='Unknown filter'&&row.attribute==='placeholder'));
  assert.ok(report.missing.some(row=>row.en==='Mystery category'));
  for(const text of [bookMention,appMention,sourceMention])assert.ok(report.missing.some(row=>row.en===text),'Une règle citant une source reste analysée : '+text);
  assert.ok(report.missing.some(row=>row.en==='Mystery Manual'),'Un titre non reconnu comme source reste analysé');
  assert.ok(!report.missing.some(row=>ignoredLabels.includes(row.en)||row.en==='Subclasses'||row.en==='Source. Unknown Adventure Guide'),'Les métadonnées et le bouton traduit sont exclus');
  for(const el of [...ignoredNodes,...metadata.querySelectorAll('[title]')])assert.ok(!el.hasAttribute('data-shard-fr-diagnostic'),'Aucun contour sur les métadonnées');
  assert.equal(metadata.querySelector('b').getAttribute('title'),'Unknown Adventure Guide');
  assert.ok(!report.missing.some(row=>row.en===known||row.en.includes('Une phrase française')||row.en==='Une aptitude mystérieuse'));
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_/,'Champs, éditeurs, scripts, éléments masqués et URL exclus');
  assert.equal(d.getElementById('unknown').hasAttribute('data-shard-fr-diagnostic'),true);
  root.getElementById('clearMissing').click();assert.equal(d.querySelectorAll('[data-shard-fr-diagnostic]').length,0);assert.equal(root.getElementById('exportMissing').disabled,true);
  const unsafe=d.createElement('p');unsafe.textContent='You summon <img src=x onerror=alert(1)> from the moon.';d.body.append(unsafe);
  root.getElementById('scanMissing').click();assert.equal(root.getElementById('missingResults').querySelectorAll('img').length,0,'Les extraits sont du texte, jamais du HTML');
  const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
  root.getElementById('clearMissing').click();await wait(()=>controls.innerHTML===original);
  await wait(()=>subclasses.textContent==='Subclasses');
  root.getElementById('scanMissing').click();await wait(() => !root.getElementById('exportMissing').disabled);assert.match(root.getElementById('missingStatus').textContent,/Active la traduction/);
  assert.equal((await exported(root)).translationEnabled,false);
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.equal(d.querySelectorAll('[data-shard-fr-diagnostic]').length,0);
  // Bornes explicites et dédoublonnage ; l’analyse reste volontaire.
  enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));
  for(let i=0;i<205;i++){const p=d.createElement('p');p.textContent=`Enemies vanish near unknown moon number ${i}.`;d.body.append(p);}
  root.getElementById('scanMissing').click();const bounded=await exported(root);assert.equal(bounded.missingCount,200);assert.equal(bounded.truncated,true);
  await wait(()=>released===downloads);
  console.log('PASS diagnostic: candidats, doublons, causes, export local, champs privés exclus, HTML échappé, bornes, effacement, contrôles interactifs et restauration exacte.');
}finally{w.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
