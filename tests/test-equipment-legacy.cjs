const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const entries = require('./translation-fixtures.cjs').entries();
const byId = new Map(entries.map(row => [row.id, row]));
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/equipment-legacy.json', 'utf8'));
const modernAcid = JSON.parse(fs.readFileSync('translations/objets/equipment-texts.json', 'utf8')).find(row => row.name === 'Acid');
const w = new JSDOM('<main></main>', {
  url: 'https://play.shardtabletop.com/#item', runScripts: 'outside-only', pretendToBeVisual: true
}).window;
const d = w.document, main = d.querySelector('main');
const cards = fixture.items.map(item => {
  const card = d.createElement('section');
  card.className = 'stdcontent';
  const title = d.createElement('h2');
  title.textContent = item.name;
  card.append(title);
  const content = d.createElement('div');
  content.innerHTML = item.html;
  card.append(content);
  main.append(card);
  return {item, card, title, content};
});
const modern = d.createElement('div');
modern.className = 'pre-wrap';
modern.innerHTML = modernAcid.en.replace('2d6', '<b class="dodieroll">2d6</b>');
main.append(modern);
const edit = d.createElement('button');
edit.textContent = 'Edit Attributes';
main.append(edit);
const clear = d.createElement('button');
clear.setAttribute('aria-label', 'Clear');
clear.title = 'Clear';
main.append(clear);
const empty = d.createElement('div');
empty.textContent = 'Empty List';
main.append(empty);
const search = d.createElement('input');
search.placeholder = 'search';
search.value = 'Acid (vial)';
main.append(search);
const unknown = d.createElement('div');
unknown.className = 'pre-wrap';
unknown.textContent = 'As an action, you can splash the contents of this vial onto a creature within 50 feet of you or throw the vial up to 200 feet. The target takes 8d6 acid damage.';
main.append(unknown);
const original = main.innerHTML;
const links = [...main.querySelectorAll('a')], dice = [...main.querySelectorAll('.dodieroll')];
const hrefs = links.map(a => a.getAttribute('href')), rolls = dice.map(die => die.textContent);
let clicks = 0;
links.forEach(a => a.addEventListener('click', e => {e.preventDefault(); clicks++;}));
dice.forEach(die => die.addEventListener('click', () => clicks++));
const headings = [...main.querySelectorAll('b > i')];
w.GM_getValue = (k, fallback) => fallback;
w.GM_setValue = () => {};
w.GM_registerMenuCommand = () => {};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(predicate) {
  for (let i = 0; i < 250 && !predicate(); i++) await pause(25);
  assert.ok(predicate(), 'Equipment translation timed out');
}
const translated = ({item, title, content}) => title.textContent === item.frName &&
  item.sections.every(id => {
    assert.ok(byId.has(id), 'Missing equipment section: ' + id);
    return content.textContent.includes(byId.get(id).fr);
  });
(async () => {
  try {
    w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
    await wait(() => cards.every(translated) && edit.textContent === 'Modifier les attributs' && clear.title === 'Effacer');
    assert.equal(clear.getAttribute('aria-label'), 'Effacer');
    assert.equal(empty.textContent, 'Liste vide');
    assert.equal(search.placeholder, 'Rechercher');
    assert.equal(search.value, 'Acid (vial)');
    assert.equal(unknown.textContent, 'As an action, you can splash the contents of this vial onto a creature within 50 feet of you or throw the vial up to 200 feet. The target takes 8d6 acid damage.');
    // L'Acide ancien utilise une attaque improvisée, le texte 2024 un remplacement
    // d'attaque et une sauvegarde. Les deux doivent garder leurs propres effets.
    const acid = cards.find(({item}) => item.name === 'Acid (vial)').content.textContent;
    assert.match(acid, /arme improvisée/);
    assert.doesNotMatch(acid, /jet de sauvegarde|remplacer/);
    await wait(() => modern.textContent.includes('remplacer'));
    assert.match(modern.textContent, /jet de sauvegarde de Dextérité/);
    assert.match(modern.textContent, /20 feet/);
    assert.doesNotMatch(modern.textContent, /arme improvisée/);
    assert.deepEqual(headings.map(el => el.textContent.trim()), ['Finesse.', 'Légère.', 'Lancer.']);
    headings.forEach(el => assert.ok(el.isConnected && el.parentElement.tagName === 'B'));
    links.forEach((a, i) => {assert.ok(a.isConnected); assert.equal(a.getAttribute('href'), hrefs[i]); a.click();});
    dice.forEach((die, i) => {assert.ok(die.isConnected); assert.equal(die.textContent, rolls[i]); die.click();});
    assert.equal(clicks, links.length + dice.length);
    const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('enabled'));
    const enabled = root.getElementById('enabled');
    enabled.checked = false;
    enabled.dispatchEvent(new w.Event('change'));
    await wait(() => main.innerHTML === original);
    enabled.checked = true;
    enabled.dispatchEvent(new w.Event('change'));
    await wait(() => cards.every(translated));
    console.log(`PASS equipment legacy: ${cards.length} fiches Shard, paragraphes imbriqués, propriétés anciennes, éditions distinctes, ${links.length} liens et ${dice.length} dés intacts, attributs, champs et restauration exacte.`);
  } catch (error) {
    console.error(cards.filter(card => !translated(card)).map(({item, content}) => ({name: item.name, text: content.textContent})));
    throw error;
  } finally {w.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
