const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/reports-classes-feats-equipment-11734.json', 'utf8'));
const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#book', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main'), cases = [];
for (const row of fixture.cases) for (let i = 0; i < row.occurrences; i++) {
  const el = d.createElement(row.kind === 'term' ? 'button' : 'p'); el.textContent = row.en;
  if (row.en.startsWith('When you roll a d20 for a D20 Test')) el.innerHTML = el.innerHTML.replace('D20 Test', '<a href="#book?id=3bfzqjt4vyvj3bk6&amp;fragment=yohiicj4u5w7p28e">D20 Test</a>');
  main.append(el); cases.push({ ...row, el });
}
const companions = fixture.companions.rows.map(row => {
  const section = d.createElement('section'); section.innerHTML = row.html; main.append(section);
  [...section.querySelectorAll('.pre-wrap p')].forEach((el, i) => { assert.equal(el.textContent, row.paragraphs[i].en); cases.push({ ...row.paragraphs[i], el }); });
  return section;
});
const tools = fixture.toolLayouts.map(row => {
  const section = d.createElement('div'); section.className = 'stdcontent'; section.innerHTML = row.html; main.append(section);
  const fields = []; let nodes = [];
  for (const child of section.querySelector('p').childNodes) { if (child.nodeName === 'BR') { fields.push(nodes); nodes = []; } else nodes.push(child); }
  fields.push(nodes);
  assert.equal(fields.length, row.fields.length);
  const text = nodes => nodes.map(node => node.textContent).join('').trim();
  fields.forEach((nodes, i) => assert.equal(text(nodes), row.fields[i].en));
  return { ...row, section, nodeGroups: fields, text };
});
// Le même mot Save garde son sens de commande hors du tableau de caractéristiques.
const save = d.createElement('button'); save.textContent = 'Save'; main.append(save);
const ordinary = d.createElement('table'); ordinary.innerHTML = '<tbody><tr><td>Save</td></tr></tbody>'; main.append(ordinary);
const unknown = d.createElement('span'); unknown.textContent = 'Enemies carry an unknown object weighing 3 lb.'; main.append(unknown);
const unknownFormula = d.createElement('p'); unknownFormula.textContent = 'Enemies gain an unknown benefit equal to {proficiency}.'; main.append(unknownFormula);
const field = d.createElement('input'); field.value = 'PRIVATE_FIELD {summoner wis}'; main.append(field);
const editor = d.createElement('div'); editor.setAttribute('contenteditable', 'true'); editor.textContent = 'You gain PRIVATE_NOTES'; main.append(editor);
const original = main.innerHTML;
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
const formulas = text => (text.match(/\{[^{}]*\}/g) || []).sort();
const signatures = cases.map(row => numbers(row.en)), variableSignatures = cases.map(row => formulas(row.en));
const numericCells = companions.flatMap(el => [...el.querySelectorAll('td')].filter(td => /^[+-]?\d+$/.test(td.textContent)));
const cellValues = numericCells.map(el => el.textContent);
const tableShapes = companions.map(el => [...el.querySelectorAll('tr')].map(tr => tr.children.length));
const links = [...main.querySelectorAll('a')], hrefs = links.map(a => a.getAttribute('href'));
const dice = [...main.querySelectorAll('.dodieroll')], dieValues = dice.map(el => el.textContent);
const strongVariables = [...main.querySelectorAll('strong')].filter(el => el.textContent.includes('{'));
const originalVariables = strongVariables.map(el => el.textContent);
let clicks = 0, blob;
for (const el of [...links, ...dice, ...strongVariables, save]) el.addEventListener('click', event => { event.preventDefault(); clicks++; });
w.GM_getValue = (key, fallback) => key === 'shard-fr-v1' ? JSON.stringify({ analysisResultLimit: 0, analysisNodeLimit: 0 }) : fallback;
w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = () => { throw Error('Les rapports doivent être traduits hors ligne'); };
w.URL.createObjectURL = value => { blob = value; return 'blob:book-reports'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { if (this.href !== 'blob:book-reports') this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 1200 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify({ cases: cases.filter(row => row.el.textContent !== row.fr).map(row => ({ en: row.en, expected: row.fr, actual: row.el.textContent })), tools: tools.flatMap(row => row.nodeGroups.flatMap((nodes, i) => row.text(nodes) === row.fields[i].fr ? [] : [{ en: row.fields[i].en, expected: row.fields[i].fr, actual: row.text(nodes) }])) }, null, 2)); }
(async () => { try {
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
  await wait(() => cases.every(row => row.el.textContent === row.fr) && tools.every(row => row.nodeGroups.every((nodes, i) => row.text(nodes) === row.fields[i].fr)) && save.textContent === 'Enregistrer' && companions.every(el => [...el.querySelectorAll('tr:first-child td')].filter(td => td.textContent === 'Sauvegarde').length === 2));
  assert.equal(ordinary.querySelector('td').textContent, 'Enregistrer');
  cases.forEach((row, i) => { assert.deepEqual(numbers(row.el.textContent), signatures[i], row.en); assert.deepEqual(formulas(row.el.textContent), variableSignatures[i], row.en); });
  numericCells.forEach((el, i) => assert.equal(el.textContent, cellValues[i]));
  companions.forEach((el, i) => assert.deepEqual([...el.querySelectorAll('tr')].map(tr => tr.children.length), tableShapes[i]));
  tools.forEach(row => { assert.equal(row.section.querySelectorAll('br').length, 2); row.nodeGroups.forEach((nodes, i) => assert.deepEqual(numbers(row.text(nodes)), numbers(row.fields[i].en))); });
  strongVariables.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.textContent, originalVariables[i].replace(/^DC /, 'DD ')); });
  dice.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.textContent, dieValues[i]); });
  links.forEach((a, i) => { assert.ok(a.isConnected); assert.equal(a.getAttribute('href'), hrefs[i]); });
  for (const el of [...links, ...dice, ...strongVariables, save]) el.click();
  assert.equal(clicks, links.length + dice.length + strongVariables.length + 1);
  assert.equal(field.value, 'PRIVATE_FIELD {summoner wis}'); assert.equal(editor.textContent, 'You gain PRIVATE_NOTES');
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  root.getElementById('scanMissing').click(); await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();
  const report = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.readAsText(blob); });
  assert.equal(report.truncated, false); assert.doesNotMatch(JSON.stringify(report), /PRIVATE_/);
  assert.ok(report.missing.some(row => row.en === unknown.textContent), 'Une phrase contenant un poids reste analysée');
  assert.ok(report.missing.some(row => row.en === unknownFormula.textContent), 'Une règle contenant une variable reste analysée');
  const sourceCandidates = new Set(fixture.cases.map(row => row.en));
  assert.deepEqual(report.missing.filter(row => sourceCandidates.has(row.en)), [], 'Tous les candidats fournis sont corrigés ou reconnus comme poids conservés');
  assert.deepEqual(report.missing.filter(row => row.en !== unknown.textContent && row.en !== unknownFormula.textContent), [], 'Les profils ne gardent aucun reliquat signalé');
  assert.ok(cases.filter(row => row.preservedWeight).every(row => !row.el.hasAttribute('data-shard-fr-diagnostic')));
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change')); await wait(() => main.innerHTML === original);
  console.log(`PASS rapports PHB : 17 classes, 11 dons, 90 équipements, ${cases.length} blocs avec occurrences, trois compagnons, formules/statistiques/poids inchangés, Save contextuel, liens et restauration exacte.`);
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
