const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const fixture=fs.readFileSync('tests/fixtures/campaign-settings.html','utf8');
const w=new JSDOM('<main>'+fixture+'</main>',{url:'https://play.shardtabletop.com/#adventure',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,main=d.querySelector('main');
// Les menus s’ajoutent après le chargement : observer réellement cette mutation.
const menuPairs=[['Huddle Monsters','Rassembler les monstres'],['Huddle Characters','Rassembler les personnages'],['Select All Monsters','Sélectionner tous les monstres'],['Select All Characters','Sélectionner tous les personnages'],['Add Map Object','Ajouter un objet de carte'],['New Pin','Nouveau repère']];
const values=[...main.querySelectorAll('input')].map(e=>({e,value:e.value,checked:e.checked}));
const selects=[...main.querySelectorAll('[aria-haspopup="listbox"]')];
const link=main.querySelector('a'),href=link.href;let clicks=0;link.onclick=e=>{e.preventDefault();clicks++;};
const original=main.innerHTML;
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(f){for(let i=0;i<300&&!f();i++)await pause(25);assert.ok(f(),'Interface translation timed out');}
(async()=>{try{
 w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
 await wait(()=>main.querySelector('.titletext').textContent==='Paramètres de la campagne'&&main.textContent.includes('Le mode spectateur permet de suivre une partie en cours.'));
 assert.deepEqual([...main.querySelectorAll('.infoheader')].map(e=>e.textContent),['Système de jeu par défaut','Mode de vision','Permissions sur les personnages','Affichage des noms','Initiative des monstres','Extensions','Packs de la campagne','Contenu privilégié','Mode spectateur']);
 assert.deepEqual(selects.map(e=>e.textContent),['D&D 5E (2024)','Éclairage dynamique uniquement','Les joueurs peuvent consulter tous les personnages sans les modifier','Afficher les noms complets des personnages','Grouper les initiatives des monstres']);
 assert.ok(main.textContent.includes('Choisissez comment révéler les cartes aux joueurs ; consultez le tutoriel pour en savoir plus.'));
 assert.ok(main.textContent.includes('Les packs désactivés sont toujours exclus.'));
 assert.ok(main.textContent.includes('le contenu exclu n’apparaît pas.'));
 assert.ok(main.textContent.includes('Campagne de démonstration'));
 assert.ok([...main.querySelectorAll('button')].some(e=>e.textContent==='Inviter'));
 assert.equal(main.querySelector('a'),link);assert.equal(link.href,href);link.click();assert.equal(clicks,1);
 for(const {e,value,checked}of values){assert.ok(e.isConnected);assert.equal(e.value,value);assert.equal(e.checked,checked);}
 const menu=d.createElement('div');menu.setAttribute('role','menu');const buttons=menuPairs.map(([en])=>{const el=d.createElement('button');el.textContent=en;el.onclick=()=>clicks++;menu.append(el);return el;});main.append(menu);
 const sheet=d.createElement('section');sheet.innerHTML='<button>Shared Treasure</button><span>Brutal Strikes</span><input placeholder="Name" value="Shared Treasure"><textarea>Brutal Strikes</textarea><div contenteditable="true">Shared Treasure</div><i title="Region Fog &amp; Lighting" aria-label="Group Actions"></i><span class="fas fa-eye" title="Hide"></span><button data-action="hide">Hide</button>';main.append(sheet);
 const menuOriginal=menu.innerHTML,sheetOriginal=sheet.innerHTML;
 await wait(()=>buttons.every((el,i)=>el.textContent===menuPairs[i][1])&&sheet.querySelector('span').textContent==='Coups brutaux'&&sheet.querySelector('.fa-eye').title==='Masquer'&&sheet.querySelector('[data-action=hide]').textContent==='Se cacher');
 assert.equal(sheet.querySelector('button').textContent,'Trésor partagé');assert.equal(sheet.querySelector('input').value,'Shared Treasure');assert.equal(sheet.querySelector('textarea').value,'Brutal Strikes');assert.equal(sheet.querySelector('[contenteditable]').textContent,'Shared Treasure');
 assert.equal(sheet.querySelector('.fa-eye').title,'Masquer');assert.equal(sheet.querySelector('[data-action=hide]').textContent,'Se cacher');
 assert.equal(sheet.querySelector('i').title,'Brouillard et éclairage de la zone');assert.equal(sheet.querySelector('i').getAttribute('aria-label'),'Actions de groupe');
 for(const button of buttons)button.click();assert.equal(clicks,1+buttons.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');
 enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
 await wait(()=>menu.innerHTML===menuOriginal&&sheet.innerHTML===sheetOriginal);
 menu.remove();sheet.remove();assert.equal(main.innerHTML,original);
 console.log('PASS interface : panneau de campagne réel, aides et lien, choix sans modification des valeurs, menus dynamiques, fiche, infobulles, interactions et restauration exacte.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
