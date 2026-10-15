const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'),sourceHTML=fs.readFileSync('tests/fixtures/shard-source-choice.html','utf8'),shieldHTML=fs.readFileSync('tests/fixtures/shield-2024-dialog.html','utf8');
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn){for(let i=0;i<250&&!fn();i++)await pause(20);assert.ok(fn(),'Source choice timed out');}
function setup(){
 const w=new JSDOM('<table><tbody></tbody></table>',{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;let blob,edits=0;const opened=[],selected=[],dialogs=[];
 const fromHTML=html=>{const template=d.createElement('template');template.innerHTML=html;return template.content.firstElementChild;};
 function openDialog(name){const dialog=fromHTML(shieldHTML);dialog.querySelector('.MuiDialogTitle-root .titletext').textContent=name;if(name!=='Shield')dialog.querySelector('.pre-wrap').innerHTML='<p>Cette description est en français.</p>';const buttons=[...dialog.querySelectorAll('.MuiDialogActions-root button')];buttons.slice(0,-1).forEach(b=>b.onclick=()=>edits++);buttons.at(-1).onclick=()=>dialog.remove();dialogs.push(dialog);d.body.append(dialog);}
 function openSources(name,available=true){const popup=fromHTML(sourceHTML),menu=popup.querySelector('[role="menu"]');menu.addEventListener('keydown',e=>{if(e.key==='Escape')popup.remove();});for(const item of menu.querySelectorAll('[role="menuitem"]')){const book=item.querySelector('b[title]').title;if(!available&&book.includes('2024'))item.setAttribute('aria-disabled','true');item.onclick=()=>{selected.push(book);setTimeout(()=>{popup.remove();openDialog(name);},80);};}d.body.append(popup);}
 const cells=['Shield','Old Relic','Next Reference'].map(name=>{const row=d.createElement('tr'),cell=d.createElement('td');cell.className='hoverhighlight w-100';const label=d.createElement('div');label.textContent=name;cell.append(label);cell.onclick=()=>{opened.push(name);if(name==='Next Reference')openDialog(name);else openSources(name,name==='Shield');};row.append(cell);d.querySelector('tbody').append(row);return cell;});
 w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.URL.createObjectURL=b=>{blob=b;return'blob:local';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 w.eval(code);const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('inspectDescriptions'));
 const on=root.getElementById('showDescriptionStatus');on.checked=true;on.dispatchEvent(new w.Event('change'));
 return {w,d,root,cells,opened,selected,dialogs,edits:()=>edits,report:async()=>{root.getElementById('exportDescriptions').click();return new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(blob);});}};
}
(async()=>{
 const t=setup();try{
  t.root.getElementById('inspectDescriptions').click();await wait(()=>t.root.getElementById('descriptionStatus').textContent.includes('terminée'));
  assert.deepEqual(t.opened,['Shield','Old Relic','Next Reference']);assert.deepEqual(t.selected,['D&D 2024 PHB'],'La source principale 2024 gagne sur la fiche ancienne mentionnant aussi 2024');assert.equal(t.edits(),0);assert.equal(t.d.querySelector('[role="menu"],[role="dialog"]'),null);
  const report=await t.report();assert.equal(report.descriptions.length,3);assert.equal(report.descriptions[0].sourceBook,'D&D 2024 PHB');assert.equal(report.descriptions[0].status,'clear');assert.equal(report.descriptions[1].status,'edition-unavailable');assert.equal(report.descriptions[2].status,'clear');assert.match(t.root.getElementById('descriptionStatus').textContent,/1 sans version 2024/);
  const shield=t.dialogs[0];assert.equal(shield.querySelector('.dodieroll').textContent,'+5');assert.equal(shield.querySelector('a[href^="#spell"]').getAttribute('href'),'#spell?id=70hykf7fy9pp80p2');
 }finally{t.w.close();}
 const stopped=setup();try{
  stopped.root.getElementById('inspectDescriptions').click();await wait(()=>stopped.d.querySelector('[role="menu"]'));stopped.root.getElementById('stopDescriptions').click();await wait(()=>stopped.root.getElementById('stopDescriptions').disabled);
  assert.equal(stopped.selected.length,0);assert.equal(stopped.opened.length,1);assert.equal(stopped.d.querySelector('[role="menu"],[role="dialog"]'),null,'Arrêter ferme aussi le choix de source ouvert par le parcours');
 }finally{stopped.w.close();}
 const unrelated=setup();try{
  unrelated.cells[0].onclick=()=>{const menu=unrelated.d.createElement('ul');menu.setAttribute('role','menu');menu.innerHTML='<li role="menuitem"><b title="D&D 2024 PHB">Delete</b></li>';menu.firstChild.onclick=()=>unrelated.selected.push('WRONG');unrelated.d.body.append(menu);};
  unrelated.root.getElementById('inspectDescriptions').click();await wait(()=>unrelated.d.querySelector('[role="menu"]'));await pause(200);unrelated.root.getElementById('stopDescriptions').click();await wait(()=>unrelated.root.getElementById('stopDescriptions').disabled);assert.equal(unrelated.selected.length,0,'Un autre menu ne doit jamais être utilisé comme un choix de livre');assert.ok(unrelated.d.querySelector('[role="menu"]'));
 }finally{unrelated.w.close();}
 console.log('PASS sources : menu Shard réel, Bouclier PHB 2024 prioritaire, option ancienne mixte ignorée, choix unique, dés/liens, absence de 2024 et poursuite, arrêt et menus sans rapport préservés.');
})().catch(e=>{console.error(e);process.exitCode=1;});
