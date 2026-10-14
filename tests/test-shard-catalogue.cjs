const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/shard-catalogue.json', 'utf8'));
const category = process.argv[2];
assert.ok(!category || ['classes', 'dons', 'armes'].includes(category), 'Catégorie de test inconnue');
const items = category ? fixture.items.filter(item => item.category === category) : fixture.items;
const byId = new Map(require('./translation-fixtures.cjs').entries().map(row => [row.id, row]));
const headings = new Map([...byId.values()].filter(row => row.id.startsWith('shard.') && row.kind === 'term' && /[.:]$/.test(row.en)).map(row => [row.en, row.fr]));
const lexicon = JSON.parse(fs.readFileSync('outputs/lexique-en-fr.json', 'utf8')).entries;
const norm = text => text.normalize('NFC').replace(/[’‘ʼ]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const names = new Map(lexicon.map(row => [norm(row.en), row.fr]));
const w = new JSDOM('<main></main>', {
  url: 'https://play.shardtabletop.com/#item', runScripts: 'outside-only', pretendToBeVisual: true
}).window;
const d = w.document, main = d.querySelector('main');
let cards = [], weaponNames = [], linksChecked = 0, diceChecked = 0;
const failures = [];
const missing = () => cards.flatMap(({item, card}) => {
  const text = norm(card.textContent);
  return item.sections.filter(id => !text.includes(norm(byId.get(id).fr))).map(id => ({name: item.name, id}));
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(predicate) {
  for (let i = 0; i < 600 && !predicate(); i++) await pause(50);
  assert.ok(predicate(), 'Translation/restoration timed out');
}
async function checkBatch(items, weapons = []) {
  main.replaceChildren();
  cards = items.map(item => {
    const card = d.createElement('section');
    card.className = 'stdcontent';
    card.innerHTML = item.html;
    main.append(card);
    const index = new Map();
    for (const node of [...card.querySelectorAll('p,li,td,th,div,h1,h2,h3,h4,h5,b,strong')].reverse()) {
      const key = norm(node.textContent);
      if (!index.has(key)) index.set(key, node);
    }
    const targets = new Map(item.sections.map(id => [id, index.get(norm(byId.get(id).en))]));
    const headingNodes = [...card.querySelectorAll('b,strong,.b')].flatMap(node => {
      const expected = headings.get(node.textContent.trim());
      return expected ? [{node, expected}] : [];
    });
    return {item, card, targets, headingNodes};
  });
  weaponNames = weapons.map(name => {
    // Ces noms ont la même orthographe dans les deux langues.
    const identical = /^(?:Trident|Yklwa)(?: \+[123])?$/.test(name);
    assert.ok(names.has(norm(name)) || identical, 'Nom d’arme sans traduction : ' + name);
    const title = d.createElement('h2');
    title.textContent = name;
    main.append(title);
    return {name, title, expected: names.get(norm(name)) || name};
  });
  const sentinel = d.createElement('p');
  sentinel.textContent = 'Armor Class';
  main.append(sentinel);
  const original = main.innerHTML;
  const links = [...main.querySelectorAll('a')], dice = [...main.querySelectorAll('.dodieroll')];
  const hrefs = links.map(node => node.getAttribute('href')), rolls = dice.map(node => node.textContent);
  let clicks = 0;
  for (const node of [...links, ...dice]) node.addEventListener('click', event => {event.preventDefault(); clicks++;});
  await wait(() => norm(sentinel.textContent) === norm(names.get(norm('Armor Class'))));
  for (const row of missing()) {
    const target = cards.find(({item}) => item.name === row.name).targets.get(row.id);
    failures.push({...row, en: byId.get(row.id).en, expected: byId.get(row.id).fr, actual: target?.textContent});
  }
  for (const {item, headingNodes} of cards) for (const {node, expected} of headingNodes) {
    if (norm(node.textContent) !== norm(expected)) failures.push({name: item.name, heading: expected, actual: node.textContent});
  }
  for (const {name, title, expected} of weaponNames) assert.equal(norm(title.textContent), norm(expected), name);
  links.forEach((node, i) => {assert.ok(node.isConnected); assert.equal(node.getAttribute('href'), hrefs[i]); node.click();});
  dice.forEach((node, i) => {assert.ok(node.isConnected); assert.equal(node.textContent, rolls[i]); node.click();});
  assert.equal(clicks, links.length + dice.length);
  linksChecked += links.length; diceChecked += dice.length;
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(node => node.shadowRoot).find(root => root?.getElementById('enabled'));
  const enabled = root.getElementById('enabled');
  enabled.checked = false;
  enabled.dispatchEvent(new w.Event('change'));
  await wait(() => main.innerHTML === original);
  enabled.checked = true;
  enabled.dispatchEvent(new w.Event('change'));
}
w.GM_getValue = (key, fallback) => fallback;
w.GM_setValue = () => {};
w.GM_registerMenuCommand = () => {};
(async () => {
  try {
    w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
    // Petits lots : Shard ouvre une fiche détaillée à la fois.
    for (let i = 0; i < items.length; i += 6) await checkBatch(items.slice(i, i + 6));
    for (let i = 0; i < fixture.weaponNames.length; i += 90) await checkBatch([], fixture.weaponNames.slice(i, i + 90));
    if (failures.length) console.error(JSON.stringify({failures}));
    assert.equal(failures.length, 0, 'Sections non traduites');
    console.log(`PASS Shard catalogue: ${items.length} fiches réelles, ${fixture.weaponNames.length} noms d'armes, ${linksChecked} liens et ${diceChecked} dés conservés, restauration exacte.`);
  } catch (error) {
    console.error('Sections manquantes', missing().slice(0, 30));
    console.error('Noms manquants', weaponNames.filter(({title, expected}) => norm(title.textContent) !== norm(expected)).slice(0, 10));
    throw error;
  } finally {w.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
