const fs=require('fs'),{JSDOM}=require('jsdom'),assert=require('node:assert/strict');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(f){for(let i=0;i<150&&!f();i++)await pause(25);assert.ok(f(),'DOM update timed out');}
function setup(settings={}){
 const w=new JSDOM('<div role="dialog"><div class="MuiDialogTitle-root"><div class="titletext">Fire Bolt</div></div><div class="stdcontent"><div class="pre-wrap">You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes <b class="dodieroll">1d10</b> fire damage. A flammable object hit by this spell ignites if it isn\'t being worn or carried.</div><p id="range">Range: 120 feet</p></div></div><span id="backpack">Backpack</span><input type="search" aria-label="Search" value="">',{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window;
 const saved=new Map([['shard-fr-v1',JSON.stringify(settings)]]),menus=new Map(),opened=[];w.GM_getValue=(k,f)=>saved.get(k)||f;w.GM_setValue=(k,v)=>saved.set(k,v);w.GM_registerMenuCommand=(k,f)=>menus.set(k,f);w.open=(...args)=>opened.push(args);w.eval(code);const host=w.document.querySelector('[data-shard-fr-ignore]'),root=host.shadowRoot;return {w,root,host,menus,saved,opened};
}
(async()=>{
 const {w,root,host,menus,saved,opened}=setup({aideddNames:false,aideddInline:false,panelAutoV15:true,custom:{'Fire Bolt':'Traduction incorrecte'}});
 try{
 await wait(()=>w.document.querySelector('.titletext').textContent==='Trait de feu');
 assert.equal(host.style.top,'16px');assert.equal(host.style.right,'16px');assert.equal(root.getElementById('panel').hidden,true);
 assert.equal(root.getElementById('panel').querySelector('input').id,'enabled');assert.equal(root.querySelectorAll('input[type=checkbox]').length,2);
 for(const id of ['aideddAuto','aideddNames','aideddOnline','aideddInline','corrections','english','french','save','remove','json','import','export','reference','aideddReader'])assert.equal(root.getElementById(id),null,id);
 assert.equal(menus.size,3);assert.equal([...menus.keys()].filter(s=>/désactiver|masquer/.test(s)).length,2);
 const button=root.getElementById('badge');button.click();assert.equal(root.getElementById('panel').hidden,false);
 const pos=root.getElementById('buttonPosition');pos.value='hidden';pos.dispatchEvent(new w.Event('change'));assert.equal(button.hidden,true);root.getElementById('close').click();menus.get('D&D FR — Ouvrir la configuration')();assert.equal(root.getElementById('panel').hidden,false);assert.equal(button.hidden,true);
 root.getElementById('close').click();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{altKey:true,shiftKey:true,code:'KeyF',bubbles:true}));assert.equal(root.getElementById('panel').hidden,false);
 for(const p of ['top-left','top-right','bottom-left','bottom-right']){pos.value=p;pos.dispatchEvent(new w.Event('change'));assert.equal(host.style[p.startsWith('top')?'top':'bottom'],'16px');assert.equal(host.style[p.endsWith('right')?'right':'left'],'16px');}
 assert.equal(JSON.parse(saved.get('shard-fr-v1')).buttonPosition,'bottom-right');
 await wait(()=>w.document.querySelector('[data-shard-fr-link] a'));const direct=w.document.querySelector('[data-shard-fr-link] a');assert.equal(direct.href,'https://www.aidedd.org/spell/fr/trait-de-feu');assert.equal(direct.target,'_blank');assert.match(direct.rel,/noopener/);
 const en=root.getElementById('enabled');en.checked=false;en.dispatchEvent(new w.Event('change'));await wait(()=>w.document.querySelector('.titletext').textContent==='Fire Bolt');assert.ok(direct.isConnected);en.checked=true;en.dispatchEvent(new w.Event('change'));
 const bilingual=root.getElementById('bilingual');bilingual.checked=true;bilingual.dispatchEvent(new w.Event('change'));await wait(()=>w.document.querySelector('.titletext').textContent==='Trait de feu (Fire Bolt)');await wait(()=>/\(Backpack\)/.test(w.document.getElementById('backpack').textContent));assert.match(w.document.getElementById('backpack').textContent,/\(Backpack\)/);
 assert.equal(w.document.getElementById('range').textContent,'Portée : 120 feet');
 const search=root.getElementById('search'),form=root.getElementById('referenceSearch');
 for(const q of ['Witch Bolt','Trait ensorcelé','trait ensorcele']){search.value=q;search.dispatchEvent(new w.Event('input'));form.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(opened.at(-1)[0],'https://www.aidedd.org/spell/fr/trait-ensorcele');assert.equal(opened.at(-1)[1],'_blank');assert.match(opened.at(-1)[2],/noopener/);}
 const n=opened.length;for(const q of ['dragon','sort inconnu totalement','']){search.value=q;form.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(opened.length,n);assert.ok(root.getElementById('searchStatus').textContent);}
 search.value='loup';search.dispatchEvent(new w.Event('input'));const result=[...root.querySelectorAll('#results a')].find(a=>a.href==='https://www.aidedd.org/monster/fr/loup');assert.ok(result);assert.equal(result.target,'_blank');
 const title=w.document.querySelector('.titletext');title.textContent='Wolf';await wait(()=>w.document.querySelector('[data-shard-fr-link] a')?.href==='https://www.aidedd.org/monster/fr/loup');assert.equal(w.document.querySelectorAll('[data-shard-fr-link]').length,1);
 title.textContent='Bag of Holding';await wait(()=>w.document.querySelector('[data-shard-fr-link] a')?.href==='https://www.aidedd.org/magic-item/fr/sac-sans-fond');
 title.textContent='Private homebrew item';await wait(()=>!w.document.querySelector('[data-shard-fr-link]'));
 assert.equal(JSON.parse(saved.get('shard-fr-v1')).custom['Fire Bolt'],'Traduction incorrecte','Old stored data retained without applying it');
 console.log('PASS 1.9: simplified UI, mandatory AideDD, two quick settings + configuration, hide/shortcut/menu/four corners, bilingual gear, feet, exact/ambiguous search, safe links, reused Shard dialog.');
 }finally{w.close();}
 const hidden=setup({showButton:false,buttonPosition:'top-left'});try{assert.equal(hidden.root.getElementById('badge').hidden,true);hidden.menus.get('D&D FR — Ouvrir la configuration')();assert.equal(hidden.root.getElementById('panel').hidden,false);assert.equal(hidden.host.style.left,'16px');}finally{hidden.w.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
