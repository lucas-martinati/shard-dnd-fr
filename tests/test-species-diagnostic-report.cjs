const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/diagnostic-species-11724.json', 'utf8'));
// Le rapport utilisateur contient du texte, pas le HTML original : ces structures
// simulent les paragraphes, emphases, liens et dés de Shard.
const w = new JSDOM('<main></main>', {
  url: 'https://play.shardtabletop.com/#species', runScripts: 'outside-only', pretendToBeVisual: true,
}).window;
const d = w.document, main = d.querySelector('main');
const spellNames = /Dancing Lights|Faerie Fire|Darkness|Prestidigitation|Detect Magic|Misty Step|Druidcraft|Longstrider|Pass Without Trace|Mending|Poison Spray|Ray of Sickness|Hold Person|Chill Touch|False Life|Ray of Enfeeblement|\blight\b/g;
function formatText(el, text) {
  el.textContent = text;
  el.innerHTML = el.innerHTML
    .replace(/\d+d\d+|\bd\d+/g, die => `<b class="dodieroll">${die}</b>`)
    .replace(spellNames, name => `<a href="#spell?id=${encodeURIComponent(name)}">${name}</a>`);
}
const cases = fixture.cases.flatMap(row => Array.from({ length: row.occurrences }, () => {
  const el = d.createElement(row.kind === 'term' ? 'button' : 'p');
  formatText(el, row.en);
  main.append(el);
  return { ...row, el };
}));
for (const [title, body] of [['Superior Darkvision.', 'The range of your Darkvision'], ['Create Clockwork Devices.', 'You can spend 10 minutes']]) {
  const heading = fixture.cases.find(row => row.en === title);
  const description = fixture.cases.find(row => row.en.startsWith(body));
  const el = d.createElement('p'), strong = d.createElement('strong'), span = d.createElement('span');
  strong.textContent = title;
  formatText(span, description.en);
  el.append(strong, ' ', span);
  main.append(el);
  cases.push({ en: `${title} ${description.en}`, fr: `${heading.fr} ${description.fr}`, el });
}
const source = d.createElement('div');
source.className = 'mv1 titletext';
source.innerHTML = '<i><b title="D&amp;D 2024 PHB">Source. </b><a>D&amp;D 2024 PHB</a></i>';
main.append(source);
const sentinel = d.createElement('button');
sentinel.textContent = 'Close';
main.append(sentinel);
const original = main.innerHTML;
const links = [...main.querySelectorAll('a')], hrefs = links.map(el => el.getAttribute('href'));
const dice = [...main.querySelectorAll('.dodieroll')], dieValues = dice.map(el => el.textContent);
const emphasis = [...main.querySelectorAll('strong')];
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
const signatures = cases.map(row => numbers(row.en));
let clicks = 0, blob;
[...links, ...dice].forEach(el => el.addEventListener('click', event => { event.preventDefault(); clicks++; }));
w.GM_getValue = (key, fallback) => fallback;
w.GM_setValue = () => {};
w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = () => { throw Error('Le rapport doit être traduit hors ligne'); };
w.URL.createObjectURL = value => { blob = value; return 'blob:species-report'; };
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () {
  if (this.href !== 'blob:species-report') this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) {
  for (let i = 0; i < 600 && !check(); i++) await pause(25);
  assert.ok(check(), 'Traduction ou restauration du rapport incomplète');
}
(async () => {
  try {
    w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
    await wait(() => sentinel.textContent === 'Fermer');
    await wait(() => cases.every(row => row.el.textContent === row.fr));
    cases.forEach((row, i) => assert.deepEqual(numbers(row.el.textContent), signatures[i], row.en));
    dice.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.textContent, dieValues[i]); el.click(); });
    links.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.getAttribute('href'), hrefs[i]); el.click(); });
    assert.equal(clicks, dice.length + links.length);
    assert.deepEqual(emphasis.map(el => el.textContent), ['Vision dans le noir supérieure.', 'Création d’appareils mécaniques.']);
    emphasis.forEach(el => assert.ok(el.isConnected));
    assert.equal(source.querySelector('a').textContent, fixture.preservedSources[0]);
    const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
    root.getElementById('scanMissing').click();
    await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();
    const report = await new Promise(resolve => {
      const reader = new w.FileReader();
      reader.onload = () => resolve(JSON.parse(reader.result));
      reader.readAsText(blob);
    });
    assert.equal(report.truncated, false);
    assert.deepEqual(report.missing, [], 'Les textes corrigés et les métadonnées ne sont plus signalés');
    const enabled = root.getElementById('enabled');
    enabled.checked = false;
    enabled.dispatchEvent(new w.Event('change'));
    await wait(() => main.innerHTML === original);
    console.log(`PASS rapport espèces : 32 textes corrigés, ${cases.length} blocs, ${dice.length} dés, ${links.length} liens, titres et source conservés, diagnostic et restauration exacte.`);
  } finally { w.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
