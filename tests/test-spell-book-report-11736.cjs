const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/spell-book-report-11736.json', 'utf8'));
const originals = JSON.parse(fs.readFileSync('tests/fixtures/phb-spells-2024.json', 'utf8'));
assert.equal(fixture.reportedCount, 23); assert.equal(fixture.cases.length, 23);
const w = new JSDOM('<main class="stdcontent"></main>', { url: 'https://play.shardtabletop.com/#book', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main'), cases = [];
for (const row of [...fixture.cases, { name: 'Jallarzi’s Storm of Radiance', ...fixture.higherLevel }]) {
  const source = originals.find(r => r.name === row.name); assert.ok(source, row.name);
  const temp = d.createElement('div'); temp.innerHTML = source.html;
  let el = [...temp.querySelectorAll('p,.i.pb1')].find(el => el.textContent === row.en);
  if (row.en === fixture.cases.at(-1).en) {
    el = [...temp.querySelectorAll('p')].find(el => el.textContent === fixture.higherLevel.en);
    assert.ok(el); el.firstElementChild.remove(); el.firstChild.data = el.firstChild.data.trimStart();
  }
  assert.ok(el, 'Le texte exact figure dans la fiche publique : ' + row.en); assert.equal(el.textContent, row.en);
  const section = d.createElement('section'); section.className = 'pre-wrap'; section.append(el); main.append(section);
  cases.push({ ...row, el });
}
// Shard peut aussi rendre le temps d’incantation avec un lien déjà traduit.
const casting = cases.find(r => r.name === 'Ensnaring Strike'), linked = casting.el.cloneNode(true);
linked.innerHTML = linked.innerHTML.replace('bonus action', '<a href="#book?fragment=bonus-action">Bonus Action</a>');
main.append(linked); cases.push({ en: linked.textContent, fr: casting.fr, el: linked });
const unknown = d.createElement('p'); unknown.textContent = 'You conjure an unknown SPELL_REPORT_11736 effect for 13 rounds.'; main.append(unknown);
const field = d.createElement('input'); field.value = 'PRIVATE_FIELD 10d12'; main.append(field);
const original = main.innerHTML, links = [...main.querySelectorAll('a')], hrefs = links.map(a => a.getAttribute('href'));
const dice = [...main.querySelectorAll('.dodieroll')], values = dice.map(el => el.innerHTML), styles = [...main.querySelectorAll('b,strong,i,em')];
let clicks = 0, blob;
for (const el of [...links, ...dice]) el.addEventListener('click', event => { event.preventDefault(); clicks++; });
w.GM_getValue = (key, fallback) => key === 'shard-fr-v1' ? JSON.stringify({ analysisResultLimit: 0, analysisNodeLimit: 0 }) : fallback;
w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = options => options.onerror();
w.URL.createObjectURL = value => { blob = value; return 'blob:spell-book-report-11736'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { if (!this.download) this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 1200 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify(cases.filter(r => r.el.textContent !== r.fr).map(r => ({ en: r.en, expected: r.fr, actual: r.el.textContent })), null, 2)); }
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
(async () => { try {
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  root.getElementById('scanMissing').click(); await wait(() => !root.getElementById('exportMissing').disabled);
  cases.forEach(row => { assert.equal(row.el.textContent, row.fr); assert.deepEqual(numbers(row.el.textContent), numbers(row.en)); });
  const befuddlement = cases.find(r => r.name === 'Befuddlement').el;
  assert.deepEqual([...befuddlement.querySelectorAll('a')].map(a => a.textContent), ['restauration suprême', 'guérison', 'souhait']);
  assert.equal(linked.querySelector('a').textContent, 'action Bonus');
  dice.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.innerHTML, values[i]); el.click(); });
  links.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.getAttribute('href'), hrefs[i]); el.click(); });
  assert.equal(clicks, dice.length + links.length); styles.forEach(el => assert.ok(el.isConnected)); assert.equal(field.value, 'PRIVATE_FIELD 10d12');
  root.getElementById('exportMissing').click();
  const report = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.readAsText(blob); });
  assert.equal(report.truncated, false); assert.deepEqual(report.missing.map(r => r.en), [unknown.textContent]);
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change')); await wait(() => main.innerHTML === original);
  console.log(`PASS rapport 1.17.36 : 23 signalements de 12 sorts, HTML réel, ${dice.length} dés et ${links.length} liens préservés, ordre des trois sorts d’Aliénation, action Bonus liée, diagnostic et restauration exacte.`);
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
