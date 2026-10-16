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
 // Menu d’équipement observé dans Shard : libellé et effet d’encre séparés.
 const treasure=d.createElement('ul');treasure.setAttribute('role','menu');
 treasure.innerHTML='<li role="menuitem" tabindex="-1" aria-disabled="false">Put in Shared Treasure<span class="MuiTouchRipple-root"></span></li><li role="menuitem">Put in the Shared Treasure</li>';
 const treasureOriginal=treasure.innerHTML,deposit=treasure.firstElementChild,ripple=deposit.firstElementChild;let deposits=0;deposit.onclick=()=>deposits++;main.append(treasure);
 await wait(()=>[...treasure.children].every(e=>e.textContent==='Déposer dans le trésor partagé'));
 assert.equal(treasure.firstElementChild,deposit);assert.equal(deposit.firstElementChild,ripple);assert.equal(deposit.getAttribute('aria-disabled'),'false');deposit.click();assert.equal(deposits,1);
 const rest=d.createElement('section');rest.innerHTML=fs.readFileSync('tests/fixtures/long-rest.html','utf8');main.append(rest);
 const restOriginal=rest.innerHTML,restInput=rest.querySelector('input'),restButtons=[...rest.querySelectorAll('button')],restLinks=[...rest.querySelectorAll('a')];
 let restClicks=0;for(const el of [...restButtons,...restLinks])el.onclick=()=>restClicks++;
 await wait(()=>rest.querySelector('.titletext').textContent==='Repos long'&&restButtons[0].textContent==='Terminer le repos long'&&restButtons[1].textContent==='Annuler');
 assert.ok(rest.querySelector('.hk-well').textContent.includes('au moins 8 heures'));
 assert.ok(rest.querySelector('.hk-well').textContent.includes('monter la garde pendant 2 heures au maximum.'));
 assert.ok(rest.querySelector('.hk-well').textContent.includes('À la fin d’un repos long, un personnage récupère tous ses points de vie perdus.'));
 assert.equal(rest.querySelectorAll('br').length,2);
 assert.equal(rest.querySelector('[aria-haspopup=listbox]').textContent,'Récupérer tous vos dés de vie');
 assert.ok(rest.textContent.includes('Aptitudes récupérées'));
 assert.ok(rest.textContent.includes('Équipement dont les aptitudes sont récupérées'));
 assert.ok(rest.textContent.includes('Emplacements de sort, '));
 assert.equal(restButtons[1].textContent,'Annuler');assert.equal(restInput.value,'1');assert.equal(rest.querySelector('input'),restInput);
 assert.deepEqual([...rest.querySelectorAll('a')],restLinks);
 for(const el of [...restButtons,...restLinks])el.click();assert.equal(restClicks,6);
 const restOptions=d.createElement('ul');restOptions.setAttribute('role','listbox');restOptions.innerHTML='<li role="option" data-value="0">Regains up to half of your Hit Dice (rules as written)</li><li role="option" data-value="1" aria-selected="true">Regain all of your Hit Dice</li>';rest.append(restOptions);
 const optionsOriginal=restOptions.innerHTML;
 // Le parcours peut céder la main entre les deux options : attendre les deux.
 await wait(()=>restOptions.children[0].textContent==='Récupérer jusqu’à la moitié de vos dés de vie (règles telles qu’écrites)'&&restOptions.children[1].textContent==='Récupérer tous vos dés de vie');
 assert.equal(restOptions.children[1].textContent,'Récupérer tous vos dés de vie');assert.equal(restOptions.children[1].getAttribute('aria-selected'),'true');assert.equal(restOptions.children[1].getAttribute('data-value'),'1');
 const short=d.createElement('section');short.innerHTML=fs.readFileSync('tests/fixtures/short-rest.html','utf8');
 // Reproduire les nœuds texte séparés de React, sans commentaires entre eux.
 const diceRow=short.querySelector('[data-test=dice]'),die=diceRow.querySelector('b'),spend=diceRow.querySelector('button');
 const count=d.createTextNode('4');diceRow.replaceChildren(die,d.createTextNode(' with '),count,d.createTextNode(' left'),spend);
 const hp=short.querySelector('[data-test=hp]'),maximum=short.querySelector('[data-test=maximum]');
 hp.replaceChildren(...['You have ','20',' hit points out of a maximum of ','27','.'].map(t=>d.createTextNode(t)));
 maximum.replaceChildren(...['You are at maximum hit points ','27','.'].map(t=>d.createTextNode(t)));
 const shortOriginal=short.innerHTML;let spendClicks=0;spend.onclick=()=>spendClicks++;main.append(short);
 await wait(()=>short.querySelector('.titletext').textContent==='Repos court'&&diceRow.textContent.includes('dont 4 disponibles')&&short.querySelector('.MuiDialogActions-root button').textContent==='Terminer le repos court');
 assert.ok(short.querySelector('.hk-well').textContent.includes('au moins 1 heure'));
 assert.ok(short.querySelector('.hk-well').textContent.includes('Vous récupérez un nombre de points de vie égal au total.'));
 assert.equal(hp.textContent,'Vous avez 20 points de vie sur un maximum de 27.');
 assert.equal(maximum.textContent,'Vos points de vie sont au maximum : 27.');
 assert.equal(die.textContent,'4d6');assert.equal(short.querySelector('b'),die);assert.equal(count.data,'4');
 assert.equal(spend.textContent,'Dépenser un dé de vie');spend.click();assert.equal(spendClicks,1);
 assert.equal(short.querySelector('.MuiDialogActions-root button').textContent,'Terminer le repos court');
 count.data='1';await wait(()=>diceRow.textContent==='4d6 dont 1 disponibleDépenser un dé de vie');
 count.data='4';await wait(()=>diceRow.textContent.includes('dont 4 disponibles'));
 const whole=d.createElement('div');whole.textContent='You have 8 hit points out of a maximum of 12.';short.querySelector('[role=dialog]').append(whole);
 await wait(()=>whole.textContent==='Vous avez 8 points de vie sur un maximum de 12.');
 // Textes MJ fournis : panneaux ajoutés après chargement, paragraphes et BR séparés.
 const encounters=d.createElement('section');encounters.innerHTML=fs.readFileSync('tests/fixtures/dm-encounters.html','utf8');
 const encountersOriginal=encounters.innerHTML,encounterInput=encounters.querySelector('input'),encounterButtons=[...encounters.querySelectorAll('button')],encounterIcons=[...encounters.querySelectorAll('.fas,.MuiTouchRipple-root')],finishEmphasis=encounters.querySelector('strong');
 const noTreasure='Aucun trésor n’a été défini pour cette rencontre.',prepareTreasure='Pour le préparer, ajoutez du trésor aux créatures ou aux pions de trésor des rencontres prévues.',addTreasure='Vous pouvez aussi ajouter du trésor directement maintenant.';
 const randomHelp='Vous pouvez commencer une rencontre en sélectionnant une rencontre aléatoire ou simplement en choisissant des monstres.',plannedHelp='Les rencontres prévues peuvent être lancées ici, depuis des repères ou depuis un livre.';
 const encounterExpected={
  'encounter-start':'Commencer','encounter-finish':'Terminer','treasure-add':'Ajouter','random-encounter':'Rencontre aléatoire','encounter-cancel':'Annuler',
  'treasure-intro':noTreasure+' '+prepareTreasure,'treasure-now':addTreasure,
  'treasure-no':noTreasure,'treasure-prepare':prepareTreasure,'treasure-corrected':noTreasure+' '+prepareTreasure,'treasure-full':noTreasure+' '+prepareTreasure+' '+addTreasure,'treasure-lines':noTreasure+prepareTreasure+addTreasure,
  'encounter-intro':randomHelp+' '+plannedHelp,'encounter-random-help':randomHelp,'encounter-planned-help':plannedHelp,
  'encounter-finish-help':'Cliquez sur le bouton Terminer en mode aventure une fois la rencontre terminée pour retirer les monstres et préparer la rencontre suivante.',
  'empty-encounters':'Liste vide','choose-encounter':'Choisir une rencontre','select-encounter':'Choisir une rencontre'
 };
 let encounterClicks=0;for(const el of encounterButtons)el.onclick=()=>encounterClicks++;main.append(encounters);
 await wait(()=>Object.entries(encounterExpected).every(([id,fr])=>encounters.querySelector('[data-test="'+id+'"]').textContent.trim()===fr));
 assert.deepEqual([...encounters.querySelectorAll('.titletext')].map(el=>el.textContent),['Attribuer le trésor','Choisir une rencontre']);
 assert.equal(encounters.querySelector('label').textContent,'Nom');assert.equal(encounterInput.placeholder,'Nom');assert.equal(encounterInput.getAttribute('aria-label'),'Nom');assert.equal(encounterInput.value,'Start');assert.equal(encounters.querySelector('input'),encounterInput);
 assert.equal(encounters.querySelector('[data-test=encounter-start]').title,'Commencer');assert.equal(encounters.querySelector('[data-test=encounter-finish]').getAttribute('aria-label'),'Terminer');
 assert.equal(encounters.querySelector('strong'),finishEmphasis);assert.equal(finishEmphasis.textContent,'Terminer');assert.equal(encounters.querySelectorAll('br').length,2);
 assert.deepEqual([...encounters.querySelectorAll('.fas,.MuiTouchRipple-root')],encounterIcons);
 assert.equal(encounters.querySelector('[data-test=encounter-unknown]').textContent,'You can start an encounter with private rules chosen by your gamemaster.');
 assert.equal(encounters.querySelector('textarea').value,'Click Finish button in adventuring mode when encounter completes to clear monsters for next encounter.');assert.equal(encounters.querySelector('[contenteditable]').textContent,'No treasure has been defined for this encounter.');
 for(const el of encounterButtons)el.click();assert.equal(encounterClicks,encounterButtons.length);
 const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(e=>e.shadowRoot).find(r=>r?.getElementById('enabled')),enabled=root.getElementById('enabled');
 enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
 // Attendre la restauration du dernier bloc avant de retirer les dialogues :
 // le parcours asynchrone utilise encore leurs nœuds pour atteindre ce bloc.
 await wait(()=>whole.textContent==='You have 8 hit points out of a maximum of 12.');
 await wait(()=>menu.innerHTML===menuOriginal&&sheet.innerHTML===sheetOriginal);
 await wait(()=>encounters.innerHTML===encountersOriginal);
 enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));await wait(()=>Object.entries(encounterExpected).every(([id,fr])=>encounters.querySelector('[data-test="'+id+'"]').textContent.trim()===fr));
 enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));await wait(()=>encounters.innerHTML===encountersOriginal);encounters.remove();
 await wait(()=>treasure.innerHTML===treasureOriginal);treasure.remove();
 await wait(()=>restOptions.innerHTML===optionsOriginal);restOptions.remove();assert.equal(rest.innerHTML,restOriginal);rest.remove();
 whole.remove();assert.equal(short.innerHTML,shortOriginal);short.remove();
 menu.remove();sheet.remove();assert.equal(main.innerHTML,original);
 console.log('PASS interface : campagne, menus dynamiques, trésor et rencontres MJ, fiche, repos court et long, compteurs React variables, infobulles, interactions et restauration exacte.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
