const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const rows = JSON.parse(fs.readFileSync('tests/fixtures/spell-paragraphs-2024.json', 'utf8'));
// Shard Player’s Guide conserve aussi la formulation de 2014 : les dés
// cliquables omis par le copier-coller doivent rester dans le texte traduit.
rows.push({
  id: 'spell.2014.hellish-rebuke.description',
  spell: 'Hellish Rebuke',
  en: 'You point your finger, and the creature that damaged you is momentarily surrounded by hellish flames. The creature must make a Dexterity saving throw. It takes 2d10 fire damage on a failed save, or half as much damage on a successful one.',
  fr: 'Vous pointez le doigt, et la créature qui vous a infligé des dégâts se retrouve un court instant entourée de flammes infernales. Elle doit effectuer un jet de sauvegarde de Dextérité. Elle subit 2d10 dégâts de feu en cas d’échec, ou la moitié de ces dégâts en cas de réussite.'
});
// Attente indépendante des JSON générés : le défaut d’extraction ne doit pas devenir la référence.
const monk = {
  en: 'At the start of your turn, you can expend 3 Focus Points to bolster yourself against harm for 1 minute or until you have the Incapacitated condition. During that time, you have Resistance to all damage except Force damage.',
  fr: 'Au début de votre tour, vous pouvez dépenser 3 points de Credo pour consolider votre corps pendant 1 minute (l’effet prend fin si vous subissez l’état Neutralisé). Durant cet intervalle, vous bénéficiez de la Résistance à tous les dégâts hormis ceux de force.'
};
const w = new JSDOM('<main></main>', {url: 'https://play.shardtabletop.com/#spell', runScripts: 'outside-only', pretendToBeVisual: true}).window;
const d = w.document, main = d.querySelector('main');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const blocks = [...rows, monk].map(row => {
  const p = d.createElement('p');
  p.innerHTML = '<span>' + escape(row.en)
    .replace(/\b\d+d\d+\b/g, dice => `<b class="dodieroll"><svg aria-hidden="true"></svg><span>${dice}</span></b>`)
    .replace(/\b(Incapacitated|Polymorph|Influence)\b/g, name => `<a href="#reference-${name}"><strong>${name}</strong></a>`) + '</span>';
  const section = d.createElement('section');
  section.className = 'stdcontent';
  const title = d.createElement('h2');
  title.textContent = row.spell || 'Level 18: Superior Defense';
  section.append(title, p); main.append(section);
  return p;
});
const unknown = d.createElement('p');
// Une valeur de dé différente n’est pas une nouvelle règle à déduire automatiquement.
unknown.textContent = rows.find(row => row.id === 'spell.2024.witch-bolt.subsequent-turns').en.replace('1d12', '1d20');
main.append(unknown);
const original = main.innerHTML;
const interactive = [...main.querySelectorAll('a,.dodieroll')];
const dice = [...main.querySelectorAll('.dodieroll')], diceText = dice.map(node => node.textContent);
const links = [...main.querySelectorAll('a')], hrefs = links.map(node => node.getAttribute('href'));
let clicks = 0;
interactive.forEach(node => node.addEventListener('click', event => {event.preventDefault(); clicks++;}));
w.GM_getValue = (key, fallback) => fallback;
w.GM_setValue = () => {};
w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = () => {throw Error('Réseau désactivé pour ce test');};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(predicate) {
  for (let i = 0; i < 240 && !predicate(); i++) await pause(25);
  assert.ok(predicate(), 'Translation/restoration timed out');
}
(async () => {
  try {
    w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
    await wait(() => blocks.every((p, i) => p.textContent === [...rows, monk][i].fr));
    assert.equal(blocks.at(-1).parentElement.querySelector('h2').textContent, 'Niveau 18 : Défense supérieure');
    assert.equal(unknown.textContent, rows.find(row => row.id === 'spell.2024.witch-bolt.subsequent-turns').en.replace('1d12', '1d20'));
    dice.forEach((node, i) => {assert.ok(node.isConnected); assert.equal(node.textContent, diceText[i]); assert.ok(node.querySelector('svg'));});
    links.forEach((node, i) => {assert.ok(node.isConnected); assert.equal(node.getAttribute('href'), hrefs[i]);});
    interactive.forEach(node => node.click()); assert.equal(clicks, interactive.length);
    const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(node => node.shadowRoot).find(root => root?.getElementById('enabled'));
    const enabled = root.getElementById('enabled');
    enabled.checked = false; enabled.dispatchEvent(new w.Event('change'));
    await wait(() => main.innerHTML === original);
    console.log(`PASS paragraphes de sorts : ${rows.length} extraits/variantes de ${new Set(rows.map(row => row.spell)).size} sorts hors ligne, Représailles infernales 2014, Défense supérieure lisible, dés/icônes/liens intacts, valeurs inconnues conservées et restauration exacte.`);
  } catch (error) {
    console.error(blocks.map((p, i) => ({id: rows[i]?.id || 'monk', expected: [...rows, monk][i].fr, actual: p.textContent})).filter(row => row.actual !== row.expected));
    throw error;
  } finally {w.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
