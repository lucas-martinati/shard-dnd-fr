const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/background-fields-2024.json', 'utf8'));
const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#backgrounds', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main'), cases = [];
for (const row of fixture.rows) {
  const card = d.createElement('article'); card.className = 'stdcontent';
  for (const field of row.fields) {
    const block = d.createElement('div'); block.className = 'mb1';
    block.innerHTML = '<span class="stdcontent"><span><span class="b i"></span></span><span class="pre-wrap"><span class="inlinefirstp"><p></p></span></span></span>';
    const heading = block.querySelector('.b.i');
    let p = block.querySelector('p');
    // Shard rend certains champs liés du Criminel sans paragraphe intermédiaire.
    if (row.name === 'Criminal' && ['Feat.', 'Skill Proficiencies.', 'Tool Proficiency.'].includes(field.label)) {
      const span = d.createElement('span'); p.replaceWith(span); p = span;
    }
    heading.textContent = field.label + '\u00a0'; p.textContent = field.en;
    if (field.en.startsWith('Choose A or B:')) p.innerHTML = p.innerHTML.replace('Choose A or B:', '<i>Choose A or B:</i>');
    if (field.label === 'Skill Proficiencies.') {
      p.innerHTML = p.innerHTML.replace(/Insight|Religion|Sleight of Hand|Stealth|Athletics|Perception|Acrobatics|Performance|Animal Handling|Nature|Investigation|Persuasion|Medicine|History|Arcana|Intimidation|Deception/g, name => `<a href="#skills?id=${encodeURIComponent(name)}">${name}</a>`);
    }
    card.append(block); cases.push({ name: row.name, field, block, p, heading });
  }
  main.append(card);
}
const weights = ['2 lb.', '0.5 lb.', '50 lb.'].map(value => { const p = d.createElement('p'); p.textContent = value; main.append(p); return p; });
const original = main.innerHTML, links = [...main.querySelectorAll('a')], hrefs = links.map(a => a.getAttribute('href'));
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
const numericSignatures = cases.map(row => numbers(row.p.textContent));
let blob, clicks = 0;
links.forEach(a => a.addEventListener('click', e => { e.preventDefault(); clicks++; }));
w.GM_getValue = (key, fallback) => fallback; w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = () => { throw Error('Les historiques doivent être traduits hors ligne'); };
w.URL.createObjectURL = value => { blob = value; return 'blob:backgrounds'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { if (this.href !== 'blob:backgrounds') this.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 600 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify(cases.filter(row => row.p.textContent !== row.field.fr).map(row => ({ name: row.name, en: row.field.en, actual: row.p.textContent, expected: row.field.fr })))); }
(async () => { try {
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
  await wait(() => cases.every(row => row.p.textContent === row.field.fr && row.heading.textContent.trim() === row.field.labelFr));
  for (const [i, row] of cases.entries()) { assert.equal(row.heading.textContent.trim(), row.field.labelFr, row.name); assert.deepEqual(numbers(row.p.textContent), numericSignatures[i]); }
  for (const i of main.querySelectorAll('p > i')) assert.equal(i.textContent, 'Choisissez A ou B :');
  links.forEach((a, i) => { assert.ok(a.isConnected); assert.equal(a.getAttribute('href'), hrefs[i]); a.click(); }); assert.equal(clicks, links.length);
  assert.deepEqual(weights.map(el => el.textContent), ['2 lb.', '0.5 lb.', '50 lb.']);
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  root.getElementById('scanMissing').click(); await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();
  const report = await new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.readAsText(blob); });
  assert.equal(report.truncated, false); assert.deepEqual(report.missing, []);
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change')); await wait(() => main.innerHTML === original);
  console.log(`PASS historiques : 16 fiches PHB, ${cases.length} champs, titres et choix en italique, ${links.length} liens, quantités, monnaies et poids conservés, diagnostic et restauration exacte.`);
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
