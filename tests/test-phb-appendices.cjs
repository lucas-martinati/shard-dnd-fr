const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/phb-appendices-reports.json', 'utf8'));
assert.equal(fixture.coverage.length, 88); assert.equal(fixture.coverage.reduce((sum, row) => sum + row.occurrences, 0), 187);
const byId = new Map(fixture.cases.map(row => [row.id, row]));
fixture.reports.forEach(report => { assert.equal(report.truncated, false); assert.equal(fixture.coverage.filter(row => row.report === report.name).length, report.rows.length); });
fixture.coverage.forEach(row => row.targets.forEach(id => assert.ok(byId.has(id), id)));
const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#book?id=7uiobn2myo8nmfdv', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main'), cases = [];
const plain = text => text.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
const formulas = text => text.match(/\{[^{}]*\}/g) || [];
const knownStates = /^(Prone|Grappled|Restrained|Incapacitated|Poisoned|Unconscious|Frightened|Charmed|Paralyzed|Darkness|Darkvision|Resistance)$/;
function makeCase(row, occurrence) {
  const section = d.createElement('section'); section.dataset.case = row.id;
  let el;
  if (row.html) { section.innerHTML = row.html; el = section.querySelector('p'); }
  else if (row.id.startsWith('label-')) { el = d.createElement('div'); el.className = 'titletext'; el.textContent = row.en; section.append(el); }
  else {
    el = d.createElement('p'); let body = row.en;
    const heading = /^(.{1,100}?)\.\s+/.exec(body);
    // Une introduction de prose n’est pas un titre d’aptitude.
    if (heading && !/^This appendix|^The following stat/.test(body)) {
      const strong = d.createElement('b'), em = d.createElement('i'); em.textContent = heading[1] + '.'; strong.append(em); el.append(strong, ' '); body = body.slice(heading[0].length);
    }
    for (const part of body.split(/(\{[^{}]*\}|\b\d+d\d+(?: \+ \d+)?\b|\b(?:Prone|Grappled|Restrained|Incapacitated|Poisoned|Unconscious|Frightened|Charmed|Paralyzed|Darkness|Darkvision|Resistance)\b)/g)) {
      if (/^\{/.test(part)) { const strong = d.createElement('strong'); strong.textContent = part; el.append(strong); }
      else if (/^\d+d/.test(part)) { const die = d.createElement('b'); die.className = 'dodieroll'; die.innerHTML = '<span class="fas">\uf6cf</span>'; die.append(part); el.append(die); }
      else if (knownStates.test(part)) { const a = d.createElement('a'); a.href = '#customlist?type=Conditions&id=test-' + part; a.textContent = part; el.append(a); }
      else el.append(part);
    }
    section.append(el);
  }
  assert.equal(plain(el.textContent), plain(row.en), row.id);
  main.append(section); cases.push({ ...row, occurrence, el });
}
// Tous les paragraphes canoniques, puis chaque occurrence du signalement.
fixture.cases.forEach(row => makeCase(row, 'canonical'));
fixture.coverage.forEach(row => { for (let i = 0; i < row.occurrences; i++) makeCase(byId.get(row.targets[i % row.targets.length]), `${row.report}:${row.index}:${i}`); });
const privateBlock = d.createElement('div'); privateBlock.innerHTML = '<input value="PRIVATE_FIELD {caster spell attack}"><div contenteditable="true">PRIVATE_NOTES The spirit makes unknown attacks.</div>'; main.append(privateBlock);
const unknown = d.createElement('p'); unknown.textContent = 'The summoned spirit has an unfamiliar power lasting 19 minutes.'; main.append(unknown);
const sentinel = d.createElement('button'); sentinel.textContent = 'Close'; main.append(sentinel);
const original = main.innerHTML, elements = [...main.querySelectorAll('*')], dice = [...main.querySelectorAll('.dodieroll')], diceHTML = dice.map(el => el.innerHTML), links = [...main.querySelectorAll('a')], hrefs = links.map(el => el.getAttribute('href'));
let clicks = 0, blob;
[...dice, ...links].forEach(el => el.addEventListener('click', event => { event.preventDefault(); clicks++; }));
const leap = byId.get('b-12');
w.GM_getValue = (key, fallback) => key === 'shard-fr-v1' ? JSON.stringify({ analysisNodeLimit: 0, analysisResultLimit: 0 }) : key === 'shard-fr-descriptions-v18' ? JSON.stringify({ savedAt: Date.now(), validationVersion: 2, pairs: [[leap.en, null]] }) : fallback;
w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {}; w.GM_xmlhttpRequest = options => options.onerror();
w.URL.createObjectURL = value => { blob = value; return 'blob:phb-appendices'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { if (this.href !== 'blob:phb-appendices') this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 1600 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify(cases.filter(row => plain(row.el.textContent) !== plain(row.fr)).slice(0,18).map(row => ({ id: row.id, occurrence: row.occurrence, en: row.en, expected: row.fr, actual: plain(row.el.textContent) })), null, 2)); }
(async () => { try {
  const script = fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'), hook = '  queue(document.body);\n  if(aideddOnline'; assert.ok(script.includes(hook));
  w.eval(script.replace(hook, '  window.appendixTestTranslate=translate;\n' + hook));
  await wait(() => sentinel.textContent === 'Fermer' && cases.every(row => plain(row.el.textContent) === plain(row.fr)));
  cases.forEach(row => { assert.deepEqual(numbers(plain(row.el.textContent)), numbers(row.en), row.id); assert.deepEqual(formulas(row.el.textContent), formulas(row.en), row.id); });
  // Les fragments tronqués ne reçoivent pas une traduction qui inventerait les liens ou valeurs absents.
  for (const fragment of ['The spirit makes', 'The insect makes', 'Magical doesn’t impede the imp’s .', 'Shared Resistances. You have to Acid.']) assert.equal(w.appendixTestTranslate(fragment), fragment);
  elements.forEach(el => assert.ok(el.isConnected));
  dice.forEach((el, i) => { assert.equal(el.innerHTML, diceHTML[i]); el.click(); });
  links.forEach((el, i) => { assert.equal(el.getAttribute('href'), hrefs[i]); assert.ok(el.textContent.trim()); el.click(); }); assert.equal(clicks, dice.length + links.length);
  assert.equal(privateBlock.querySelector('input').value, 'PRIVATE_FIELD {caster spell attack}'); assert.match(privateBlock.querySelector('[contenteditable]').textContent, /^PRIVATE_NOTES/);
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  root.getElementById('scanMissing').click(); await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();
  const report = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.readAsText(blob); });
  assert.equal(report.truncated, false); assert.doesNotMatch(JSON.stringify(report), /PRIVATE_/);
  assert.ok(report.missing.some(row => row.en === unknown.textContent));
  assert.deepEqual(report.missing.filter(row => row.en !== unknown.textContent), [], 'Aucun reliquat sur les signalements corrigés, y compris Inspiration et D&D 2024');
  cases.forEach(row => assert.equal(row.el.hasAttribute('data-shard-fr-diagnostic'), false, row.id));
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change')); await wait(() => main.innerHTML === original);
  console.log(`PASS annexes PHB : 88 signalements / 187 occurrences, ${fixture.cases.length} cas complets, fragments reliés au HTML, cinq types de souffle, cache en conflit, nombres/formules/dés/liens, diagnostic et restauration exacte.`);
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
