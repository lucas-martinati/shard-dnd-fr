const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/mm-followup-20261019.json', 'utf8'));
assert.equal(fixture.coverage.length, 139); assert.equal(fixture.coverage.reduce((sum, row) => sum + row.occurrences, 0), 157);
assert.equal(fixture.cases.length, 143);
assert.equal(fixture.cases.filter(row => row.layout === 'observed').length, 134);
const byId = new Map(fixture.cases.map(row => [row.id, row]));
// Le rapport peut omettre les textes des liens et dés, jamais inventer un fragment.
const plain = text => text.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
const sourceTokens = text => plain(text).toLowerCase().replace(/[’‘]/g, "'").match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [];
fixture.coverage.forEach(row => {
  assert.equal(row.targets.length, 1);
  const wanted = sourceTokens(row.en), complete = sourceTokens(byId.get(row.targets[0]).en); let cursor = 0;
  complete.forEach(token => { if (token === wanted[cursor]) cursor++; });
  assert.equal(cursor, wanted.length, `${row.report}:${row.index} doit correspondre au texte complet`);
});
fixture.reports.forEach(report => { assert.equal(report.truncated, false); assert.equal(fixture.coverage.filter(row => row.report === report.name).length, report.rows.length); });
fixture.coverage.forEach(row => row.targets.forEach(id => assert.ok(byId.has(id), id)));
const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#book?id=42kx3bk4mrh7f61i', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main'), cases = [];

const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
const formulas = text => text.match(/\{[^{}]*\}/g) || [];
function makeCase(row, occurrence) {
  const section = d.createElement('section'); section.dataset.case = row.id;
  let el;
  if (row.html) {
    section.innerHTML = row.html; el = section.querySelector('p, li');
  } else {
    assert.equal(row.kind, 'term', 'Chaque description doit disposer du HTML relevé');
    el = d.createElement('div'); el.className = 'titletext'; el.textContent = row.en; section.append(el);
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
const cacheConflicts = fixture.coverage.filter(row => ['conflicting-translations', 'unrecognized-layout'].includes(row.reason)).flatMap(row => [[row.en, null], ...row.targets.map(id => [byId.get(id).en, null])]);
w.GM_getValue = (key, fallback) => key === 'shard-fr-v1' ? JSON.stringify({ analysisNodeLimit: 0, analysisResultLimit: 0 }) : key === 'shard-fr-descriptions-v18' ? JSON.stringify({ savedAt: Date.now(), validationVersion: 2, pairs: cacheConflicts }) : fallback;
w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {}; w.GM_xmlhttpRequest = options => options.onerror();
w.URL.createObjectURL = value => { blob = value; return 'blob:mm-followup'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { if (this.href !== 'blob:mm-followup') this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 1600 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify(cases.filter(row => plain(row.el.textContent) !== plain(row.fr)).slice(0,18).map(row => ({ id: row.id, occurrence: row.occurrence, en: row.en, expected: row.fr, actual: plain(row.el.textContent) })), null, 2)); }
(async () => { try {
  const script = fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'), hook = '  queue(document.body);\n  if(aideddOnline'; assert.ok(script.includes(hook));
  w.eval(script.replace(hook, '  window.mmFollowupTestTranslate=translate;\n' + hook));
  await wait(() => sentinel.textContent === 'Fermer' && cases.every(row => plain(row.el.textContent) === plain(row.fr)));
  cases.forEach(row => { assert.deepEqual(numbers(plain(row.el.textContent)), numbers(row.en), row.id); assert.deepEqual(formulas(row.el.textContent), formulas(row.en), row.id); });
  // Les fragments tronqués ne reçoivent pas une traduction qui inventerait les liens ou valeurs absents.
  for (const fragment of ['+7 7 (1d4 + 5) Piercing damage plus 3 (1d6', 'Psi Blade. +4 9 (2d6 + 2) Slashing damage plus 7 (2d6']) assert.equal(w.mmFollowupTestTranslate(fragment), fragment);
  elements.forEach(el => assert.ok(el.isConnected));
  dice.forEach((el, i) => { assert.equal(el.innerHTML, diceHTML[i]); el.click(); });
  links.forEach((el, i) => { assert.equal(el.getAttribute('href'), hrefs[i]); assert.ok(el.textContent.trim()); el.click(); }); assert.equal(clicks, dice.length + links.length);
  assert.equal(privateBlock.querySelector('input').value, 'PRIVATE_FIELD {caster spell attack}'); assert.match(privateBlock.querySelector('[contenteditable]').textContent, /^PRIVATE_NOTES/);
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  root.getElementById('scanMissing').click(); await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();
  const report = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.readAsText(blob); });
  assert.equal(report.truncated, false); assert.doesNotMatch(JSON.stringify(report), /PRIVATE_/);
  assert.ok(report.missing.some(row => row.en === unknown.textContent));
  assert.deepEqual(report.missing.filter(row => row.en !== unknown.textContent), [], 'Aucun reliquat sur les signalements MM corrigés');
  cases.forEach(row => assert.equal(row.el.hasAttribute('data-shard-fr-diagnostic'), false, row.id));
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change')); await wait(() => main.innerHTML === original);
  console.log(`PASS complément MM : 139 signalements / 157 occurrences, ${fixture.cases.length} cas complets, fragments reliés au HTML, kenku/kobold/hydre, 9 dispositions signalées, kraken/liche, caches en conflit, nombres/formules/dés/liens, diagnostic et restauration exacte.`);
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
