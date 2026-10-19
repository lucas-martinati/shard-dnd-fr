const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/barbarian-effects-2024.json', 'utf8'));
const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#class', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main'), cases = [];
for (const row of fixture.cases) for (const layout of ['description', 'modifier']) {
  const section = d.createElement('section'); section.setAttribute('role', 'dialog');
  section.innerHTML = layout === 'description'
    ? '<div class="titletext">Frenzy Damage</div><div class="stdcontent"><div class="pre-wrap"><span class="inlinefirstp"><p></p></span></div></div>'
    : '<div class="titletext">Dégâts de Frénésie</div><div class="mb1"><span><button>Item Modifiers</button>&nbsp;</span></div>';
  let el;
  if (layout === 'description') {
    el = section.querySelector('p'); el.textContent = row.en;
    if (row.id === 'frenzy.description') el.innerHTML = el.innerHTML.replace('Reckless Attack', '<a href="#reckless-attack">Reckless Attack</a>');
  } else {
    const span = section.querySelector('.mb1 > span'); span.append(d.createTextNode(row.en)); el = span.lastChild;
  }
  main.append(section); cases.push({ ...row, el, layout });
}
const controls = fixture.labels.map(row => {
  const button = d.createElement('button'); button.textContent = row.en; main.append(button);
  const hint = d.createElement('span'); hint.title = row.en; main.append(hint);
  return { ...row, button, hint };
});
// Structure des champs relevée dans Feature Options : valeurs et éditeur exclus.
const editor = d.createElement('div'); editor.className = 'mv1 stdcontent';
editor.innerHTML = '<input placeholder="feature name" value="Frenzy Damage"><input type="hidden" value="hide"><input type="number" value="1"><div class="relative pre-wrap"><div contenteditable="true" role="textbox" data-lexical-editor="true"><p class="editor-paragraph">Add additional damage to your first attack each round while using Reckless Attack.</p></div></div><input value="PRIVATE_VALUE {rage damage}">';
main.append(editor);
const opaque = d.createElement('p'); opaque.innerHTML = '<b>{rage damage}</b>d6'; main.append(opaque);
const unknown = d.createElement('p'); unknown.textContent = 'Add unexpected damage to your first attack each round while using Reckless Attack.'; main.append(unknown);
const save = d.createElement('button'); save.textContent = 'Save'; main.append(save);
const sentinel = d.createElement('button'); sentinel.textContent = 'Close'; main.append(sentinel);
const original = main.innerHTML, editorHTML = editor.innerHTML;
const links = [...main.querySelectorAll('a')], hrefs = links.map(el => el.getAttribute('href'));
const buttons = [...main.querySelectorAll('button')]; let clicks = 0, blob;
[...links, ...buttons].forEach(el => el.addEventListener('click', event => { event.preventDefault(); clicks++; }));
w.GM_getValue = (key, fallback) => fallback; w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = options => options.onerror(); w.URL.createObjectURL = value => { blob = value; return 'blob:effects'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { if (this.href !== 'blob:effects') this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const formulas = text => text.match(/\{[^{}]*\}/g) || [];
const numbers = text => (text.match(/\d+/g) || []).sort();
const text = row => row.el.nodeType === 3 ? row.el.data.trim() : row.el.textContent;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 600 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify(cases.filter(row => text(row) !== row.fr).map(row => ({ id: row.id, layout: row.layout, actual: text(row), expected: row.fr })), null, 2)); }
(async () => { try {
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
  await wait(() => sentinel.textContent === 'Fermer' && cases.every(row => text(row) === row.fr) && controls.every(row => row.button.textContent === row.fr && row.hint.title === row.fr));
  assert.ok([...main.querySelectorAll('.titletext')].every(el => el.textContent === 'Dégâts de Frénésie'));
  cases.forEach(row => { assert.deepEqual(formulas(text(row)), formulas(row.en)); assert.deepEqual(numbers(text(row)), numbers(row.en)); });
  assert.equal(editor.innerHTML, editorHTML, 'L’éditeur et ses valeurs ne sont jamais traduits');
  assert.equal(opaque.textContent, '{rage damage}d6'); assert.equal(save.textContent, 'Enregistrer');
  links.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.getAttribute('href'), hrefs[i]); assert.equal(el.textContent, 'Attaque téméraire'); el.click(); });
  buttons.forEach(el => { assert.ok(el.isConnected); el.click(); }); assert.equal(clicks, links.length + buttons.length);
  assert.equal(unknown.textContent, 'Add unexpected damage to your first attack each round while using Reckless Attack.');
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  root.getElementById('scanMissing').click(); await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();
  const report = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.readAsText(blob); });
  assert.ok(report.missing.some(row => row.en === unknown.textContent));
  const known = new Set([...fixture.cases, ...fixture.labels].map(row => row.en));
  assert.deepEqual(report.missing.filter(row => known.has(row.en)), []); assert.doesNotMatch(JSON.stringify(report), /PRIVATE_VALUE/);
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change'));
  await wait(() => main.innerHTML === original);
  console.log('PASS effets Barbare PHB 2024 : six descriptions/résumés, deux dispositions, 27 libellés et infobulles, liens, formules et valeurs exactes, éditeur privé exclu, diagnostic et restauration.');
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
