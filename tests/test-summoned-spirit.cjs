const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#monster', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main');
// Reconstitution du profil fourni ; les formules restent des expressions Shard.
main.innerHTML = `<article class="monstersimple"><h2>Bestial Spirit Water</h2><div class="i pb1"><span>Small </span><span>beast</span><span>, Neutral</span></div><div class="ac"><b>AC</b> 11 (<span>+ the spell’s level</span>)</div><div class="m24"><table><tr><td></td><td></td><td>MOD</td><td><span>SAVE</span></td></tr><tr><td>STR</td><td>18</td><td>+4</td><td>+4</td></tr><tr><td>INT</td><td>4</td><td>-3</td><td>-3</td></tr></table></div><div class="stdcontent"><div class="pre-wrap"><p id="breathing"><b><i>Respiration aquatique.</i></b> The spirit can breathe only underwater.</p><p id="multi"><b><i>Multiattack.</i></b> The spirit makes <b>{Cast Spell Level/2}</b> <a href="#monster?action=rend">Rend</a> attacks.</p><p id="rend"><b><i>Rend.</i></b> <i>Melee Attack Roll:</i> <b class="dodieroll">{caster spell attack}</b>, reach 5 ft. <i>Hit:</i> <b class="dodieroll">1d8 + 4 + {Cast Spell Level}</b> Piercing damage.</p></div></div></article><p id="lowercase">The spirit makes {cast spell level/2} Rend attacks.</p><p id="single">{Cast Spell Level/2}</p><p id="split"><b>{</b><span>Cast Spell</span> <i>Level</i><b>/2}</b></p><p id="unknown">Uncatalogued formula {Cast Spell Level/2} remains unknown.</p><p id="cached">Unknown power {Cast Spell Level}.</p><p id="mixed">AC {Cast Spell Level} + {Save}</p><span id="attr" title="{Cast Spell Level/2}"></span><input value="PRIVATE_VALUE"><button id="save">Save</button><button id="sentinel">Close</button>`;
// Cas où React crée plusieurs nœuds texte au lieu de balises.
const adjacent = d.createElement('p'); adjacent.id = 'adjacent'; adjacent.append('{', 'Cast Spell', ' Level', '/2}'); main.append(adjacent);
const expected = new Map([
  ['breathing', 'Respiration aquatique. L’esprit ne peut respirer que sous l’eau.'],
  ['multi', 'Attaques multiples. L’esprit effectue {Cast Spell Level/2} attaques de Saignée.'],
  ['rend', 'Saignée. Jet d’attaque au corps à corps : {caster spell attack}, allonge 5 ft. Touché : 1d8 + 4 + {Cast Spell Level} dégâts perforants.'],
  ['lowercase', 'L’esprit effectue {cast spell level/2} attaques de Saignée.'],
  ['single', '{Cast Spell Level/2}'], ['split', '{Cast Spell Level/2}'], ['adjacent', '{Cast Spell Level/2}'],
  ['unknown', 'Uncatalogued formula {Cast Spell Level/2} remains unknown.'],
  ['cached', 'Unknown power {Cast Spell Level}.'], ['mixed', 'CA {Cast Spell Level} + {Save}']
]);
const original = main.innerHTML, formulas = text => text.match(/\{[^{}]*\}/g) || [];
const signatures = new Map([...expected].map(([id]) => [id, formulas(d.getElementById(id).textContent)]));
const protectedNodes = [...d.querySelectorAll('#split *')].map(el => [el, el.textContent]);
const elements = [...main.querySelectorAll('*')], links = [...main.querySelectorAll('a')], hrefs = links.map(el => el.getAttribute('href'));
const dice = [...main.querySelectorAll('.dodieroll')], diceHTML = dice.map(el => el.innerHTML);
const cells = [...main.querySelectorAll('td')].filter(el => /^[+-]?\d+$/.test(el.textContent)), values = cells.map(el => el.textContent);
let clicks = 0; for (const el of [...links, ...dice]) el.addEventListener('click', event => { event.preventDefault(); clicks++; });
w.GM_getValue = (key, fallback) => key === 'shard-fr-descriptions-v18' ? JSON.stringify({ savedAt: Date.now(), validationVersion: 2, pairs: [['Unknown power {Cast Spell Level}.', 'Pouvoir inconnu {Lancer le sort Niveau}.']] }) : fallback;
w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {}; w.GM_xmlhttpRequest = options => options.onerror();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 600 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify([...expected].filter(([id, fr]) => d.getElementById(id).textContent !== fr).map(([id, fr]) => ({ id, expected: fr, actual: d.getElementById(id).textContent })), null, 2)); }
(async () => { try {
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
  await wait(() => d.getElementById('sentinel').textContent === 'Fermer' && [...expected].every(([id, fr]) => d.getElementById(id).textContent === fr));
  assert.equal(main.querySelector('.ac').textContent, 'CA 11 (+ le niveau du sort)');
  assert.equal(main.querySelector('.i.pb1').textContent, 'Bête de taille P, Neutre');
  assert.equal(main.querySelector('table tr:first-child td:last-child').textContent, 'Sauvegarde');
  assert.equal(d.getElementById('save').textContent, 'Enregistrer');
  assert.equal(d.getElementById('attr').title, '{Cast Spell Level/2}');
  for (const [id] of expected) assert.deepEqual(formulas(d.getElementById(id).textContent), signatures.get(id), id);
  protectedNodes.forEach(([el, text]) => assert.equal(el.textContent, text));
  cells.forEach((el, i) => assert.equal(el.textContent, values[i]));
  elements.forEach(el => assert.ok(el.isConnected));
  links.forEach((el, i) => { assert.equal(el.getAttribute('href'), hrefs[i]); el.click(); });
  dice.forEach((el, i) => { assert.equal(el.innerHTML, diceHTML[i]); el.click(); }); assert.equal(clicks, links.length + dice.length);
  assert.equal(main.querySelector('input').value, 'PRIVATE_VALUE');
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('enabled')), enabled = root.getElementById('enabled');
  enabled.checked = false; enabled.dispatchEvent(new w.Event('change'));
  const restored = () => { const clone = main.cloneNode(true); clone.querySelectorAll('[data-shard-fr-link]').forEach(el => el.remove()); return clone.innerHTML; };
  await wait(() => restored() === original);
  enabled.checked = true; enabled.dispatchEvent(new w.Event('change'));
  await wait(() => [...expected].every(([id, fr]) => d.getElementById(id).textContent === fr));
  console.log('PASS esprit invoqué : respiration, attaques, Saignée, CA, taille et sauvegardes ; formules exactes, casse, nœuds fragmentés, cache incorrect refusé, dés/liens/champs intacts et restauration.');
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
