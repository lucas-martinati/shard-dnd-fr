const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/spell-book-reports-11735.json', 'utf8'));
assert.deepEqual(fixture.reportedCounts, [244, 789]); assert.equal(fixture.cases.length, 1033);
const w = new JSDOM('<main class="stdcontent"></main>', { url: 'https://play.shardtabletop.com/#book', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main');
const dice = [], links = [], labels = [];
const cases = fixture.cases.map(row => {
  const el = d.createElement(row.kind === 'description' ? 'p' : 'div');
  if (el.tagName === 'DIV') el.className = 'i pb1';
  const parts = row.en.split(/(\b\d+d\d+\b|\bDodge\b|\bWish\b)/);
  for (const part of parts) {
    if (/^\d+d\d+$/.test(part)) {
      const b = d.createElement('b'); b.className = 'dodieroll'; b.textContent = part; dice.push({ el: b, text: part }); el.append(b);
    } else if (part === 'Dodge') {
      const a = d.createElement('a'); a.href = '#action?name=Dodge'; a.textContent = part; links.push(a); el.append(a);
    } else if (part === 'Wish') {
      const i = d.createElement('i'); i.textContent = part; el.append(i);
    } else el.append(d.createTextNode(part));
  }
  // Les champs du livre sont des DIV dont le libellé est en gras.
  if (/^(Casting Time|Range|Components|Duration|Classes):/.test(row.en)) {
    const node = el.firstChild, at = node.data.indexOf(':') + 1, b = d.createElement('b'); b.textContent = node.data.slice(0, at); node.data = node.data.slice(at); el.prepend(b); labels.push({ el: b, en: b.textContent });
  }
  // Même structure que les effets nommés du livre, sans réordonner les options.
  if (row.kind === 'description' && /^[A-Z][A-Za-z ’/-]{2,35}\. /.test(row.en) && el.firstChild.nodeType === 3) {
    const node = el.firstChild, at = node.data.indexOf('.') + 1, strong = d.createElement('strong'); strong.textContent = node.data.slice(0, at); node.data = node.data.slice(at); el.prepend(strong);
  }
  main.append(el); return { ...row, el };
});
const lucky = d.createElement('p');
lucky.innerHTML = 'When you roll a d20 for a <a href="#book?id=3bfzqjt4vyvj3bk6&amp;fragment=yohiicj4u5w7p28e">D20 Test</a>, you can spend 1 Luck Point to give yourself Advantage on the roll.';
main.append(lucky); links.push(lucky.querySelector('a'));
const luckyFR = 'Lorsque vous lancez un d20 pour un Test de d20, vous pouvez dépenser 1 Point de chance pour avoir l’Avantage à ce jet.';
// Ancienne référence compatible en valeurs, mais dont le lien a une autre formulation.
const remoteFR = 'Lorsque vous lancez un d20 pour un test d20, vous pouvez dépenser 1 Point de chance pour avoir l’Avantage à ce jet.';
const source = 'https://www.aidedd.org/feat/fr/lucky';
const cache = { savedAt: Date.now(), validationVersion: 2, pairs: [[lucky.textContent, remoteFR]], sources: [[lucky.textContent, source]] };
const unknown = d.createElement('p'); unknown.textContent = 'You gain an unknown SPELL_REPORT_TEST effect for 3 rounds.'; main.append(unknown);
const field = d.createElement('input'); field.value = 'PRIVATE_FIELD 3d10'; main.append(field);
const original = main.innerHTML, hrefs = links.map(a => a.getAttribute('href'));
let clicks = 0, blob;
for (const el of [...links, ...dice.map(row => row.el)]) el.addEventListener('click', event => { event.preventDefault(); clicks++; });
w.GM_getValue = (key, fallback) => key === 'shard-fr-v1' ? JSON.stringify({ analysisResultLimit: 0, analysisNodeLimit: 0 }) : key === 'shard-fr-descriptions-v18' ? JSON.stringify(cache) : fallback;
w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = options => options.onerror();
w.URL.createObjectURL = value => { blob = value; return 'blob:spell-book-reports'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { if (!this.download) this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check, label) { for (let i = 0; i < 3600 && !check(); i++) await pause(25); assert.ok(check(), label); }
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
(async () => { try {
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  // Analyse demandée immédiatement : elle attend la traduction, sans produire de faux manquants.
  root.getElementById('scanMissing').click(); assert.equal(root.getElementById('exportMissing').disabled, true);
  await wait(() => !root.getElementById('exportMissing').disabled, 'Analyse du livre inachevée');
  const errors = cases.filter(row => row.el.textContent !== row.fr);
  assert.deepEqual(errors.map(({ en, fr, el }) => ({ en, fr, actual: el.textContent })), []);
  assert.equal(lucky.textContent, luckyFR, 'La correction locale de Chanceux prime sur le cache distant');
  assert.equal(lucky.querySelector('a').textContent, 'Test de d20');
  for (const row of cases) assert.deepEqual(numbers(row.el.textContent), numbers(row.en), row.en);
  for (const { el, text } of dice) { assert.ok(el.isConnected); assert.equal(el.textContent, text); el.click(); }
  links.forEach((a, i) => { assert.ok(a.isConnected); assert.equal(a.getAttribute('href'), hrefs[i]); a.click(); });
  assert.equal(clicks, dice.length + links.length); assert.equal(field.value, 'PRIVATE_FIELD 3d10');
  for (const { el, en } of labels) assert.ok(el.isConnected && el.textContent.trim().endsWith(':'), 'La rubrique reste en gras : ' + en + ' → ' + el.textContent);
  root.getElementById('exportMissing').click();
  const report = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.readAsText(blob); });
  assert.equal(report.truncated, false); assert.doesNotMatch(JSON.stringify(report), /PRIVATE_/);
  assert.deepEqual(report.missing.map(row => row.en), [unknown.textContent], 'Les vrais textes inconnus restent signalés');
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change'));
  await wait(() => main.innerHTML === original, 'Restauration du livre inachevée');
  // Effacer ou naviguer pendant l’attente annule le rapport en cours.
  enabled.checked = true; enabled.dispatchEvent(new w.Event('change')); root.getElementById('scanMissing').click(); root.getElementById('clearMissing').click();
  await pause(80); assert.equal(root.getElementById('exportMissing').disabled, true); assert.equal(root.getElementById('scanMissing').disabled, false);
  root.getElementById('scanMissing').click(); w.dispatchEvent(new w.HashChangeEvent('hashchange')); await pause(80); assert.equal(root.getElementById('exportMissing').disabled, true);
  console.log(`PASS livre sorts : ${cases.length} signalements, ${dice.length} dés cliquables, champs Shard en gras, liens, Chanceux avec ancien cache, analyse après traduction, annulation et restauration exacte.`);
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
