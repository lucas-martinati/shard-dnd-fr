const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/monk-character-features-2024.json'),'utf8'));
const args=process.argv.slice(2),option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const code=fs.readFileSync(option('--script','outputs/shard-dnd-fr.user.js'),'utf8'),auditOnly=args.includes('--audit-only');
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#play?mode=character',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
const cases=fixture.rows.map(row=>{const card=d.createElement('article');card.setAttribute('role','dialog');card.innerHTML='<div class="MuiDialogTitle-root"><h3 class="titletext"></h3></div><div class="MuiDialogContent-root"><div class="stdcontent"></div></div>';card.querySelector('h3').textContent=row.name;card.querySelector('.stdcontent').innerHTML=row.html;main.append(card);return {row,card};});
const focus=cases.find(x=>x.row.name==='Level 2: Monk’s Focus').card;
const patient=[...focus.querySelectorAll('p')].find(p=>p.textContent.startsWith('Patient Defense.'));
assert.equal(patient.querySelectorAll('strong').length,3,'Le titre réel est découpé entre trois emphases');
const sentinel=d.createElement('button');sentinel.textContent='Close';main.append(sentinel);
const original=main.innerHTML,styles=[...main.querySelectorAll('b,strong,i,em')],links=[...main.querySelectorAll('a')],hrefs=links.map(a=>a.getAttribute('href'));
const numbers=s=>(s.match(/\d+(?:[.,]\d+)?/g)||[]).sort();const signatures=cases.map(x=>numbers(x.card.textContent));let clicks=0,blob;
links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();clicks++;}));
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=()=>{throw Error('Le contrôle doit fonctionner hors ligne');};
w.URL.createObjectURL=b=>{blob=b;return 'blob:audit-local';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){if(this.href==='blob:audit-local')return;this.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));};
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function wait(fn,label){for(let i=0;i<1200&&!fn();i++)await pause(25);assert.ok(fn(),label||'Parcours DOM incomplet');}
(async()=>{try{
 w.eval(code);await wait(()=>sentinel.textContent==='Fermer');
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('scanMissing'));
 root.getElementById('scanMissing').click();root.getElementById('exportMissing').click();
 const report=await new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(JSON.parse(reader.result));reader.readAsText(blob);});
 assert.equal(report.truncated,false,'L’audit doit couvrir toutes les descriptions');
 if(!auditOnly){
  assert.equal(report.missingCount,0,JSON.stringify(report.missing,null,2));
  assert.match(patient.textContent,/^Défense patiente\. Vous pouvez/);
  assert.equal([...patient.querySelectorAll('strong')].map(el=>el.textContent).join(''),'Défense patiente.','Le titre reste en gras sans englober la description');
  assert.match(patient.querySelector('span').textContent,/Vous pouvez/);
  for(const {card,row}of cases){const source=new JSDOM(row.html);const en=source.window.document.body.textContent;source.window.close();if(en.length>35)assert.notEqual(card.querySelector('.stdcontent').textContent,en,row.name||row.parent);}
  assert.equal(cases.find(x=>x.row.name==='Deflect Attack').card.querySelector('h3').textContent,'Déviation d’assaut');
  assert.equal(cases.find(x=>x.row.name==='Strike Back').card.querySelector('h3').textContent,'Riposte');
 }
 cases.forEach((x,i)=>assert.deepEqual(numbers(x.card.textContent),signatures[i],x.row.name+': chiffres et dés'));styles.forEach(el=>assert.ok(el.isConnected));
 links.forEach((a,i)=>{assert.ok(a.isConnected);assert.equal(a.getAttribute('href'),hrefs[i]);a.click();});assert.equal(clicks,links.length);
 const reportPath=option('--report',null);if(reportPath){const result={...report,scope:'character-features',source:fixture.source,checked:cases.map(x=>({id:x.row.id,name:x.row.name,parent:x.row.parent,kind:x.row.kind})),checkedCount:cases.length};fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');}
 root.getElementById('clearMissing').click();const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>main.innerHTML===original,'Restauration exacte du HTML');
 console.log(`${auditOnly?'AUDIT':'PASS'} fiche du moine : ${cases.length} descriptions, ${report.missingCount} candidats, titres découpés, valeurs, ${links.length} liens et restauration.`);
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
