const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const code = fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8');
function setup(saved = new Map()) {
  const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#item', runScripts: 'outside-only', pretendToBeVisual: true }).window;
  const d = w.document, main = d.querySelector('main');
  for (let i = 0; i < 251; i++) { const p = d.createElement('p'); p.textContent = `You gain an unknown LIMIT_TEST power number ${i}.`; main.append(p); }
  const weight = d.createElement('p'); weight.textContent = 'Weight 2 lb.'; main.append(weight);
  const field = d.createElement('input'); field.value = 'PRIVATE_VALUE 50 lb.'; main.append(field);
  const editor = d.createElement('div'); editor.contentEditable = 'true'; editor.setAttribute('contenteditable', 'true'); editor.textContent = 'You gain PRIVATE_NOTES'; main.append(editor);
  let blob;
  w.GM_getValue = (key, fallback) => saved.get(key) ?? fallback;
  w.GM_setValue = (key, value) => saved.set(key, value);
  w.GM_registerMenuCommand = () => {};
  w.GM_xmlhttpRequest = () => { throw Error('Analyse locale uniquement'); };
  w.URL.createObjectURL = value => { blob = value; return 'blob:limits'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = () => {};
  w.eval(code);
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
  function set(id, value) { const input = root.getElementById(id); input.value = String(value); input.dispatchEvent(new w.Event('change')); return input; }
  async function report() {
    root.getElementById('scanMissing').click();
    for (let i = 0; i < 1200 && root.getElementById('exportMissing').disabled; i++) await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(root.getElementById('exportMissing').disabled, false);
    root.getElementById('exportMissing').click();
    return new Promise(resolve => { const r = new w.FileReader(); r.onload = () => resolve(JSON.parse(r.result)); r.readAsText(blob); });
  }
  return { w, root, saved, set, report, weight, field, editor };
}
(async () => {
  const t = setup();
  try {
    assert.equal(t.root.getElementById('analysisResultLimit').value, '200');
    assert.equal(t.root.getElementById('analysisNodeLimit').value, '10000');
    assert.equal(t.root.getElementById('descriptionBatchLimit').value, '100');
    let r = await t.report(); assert.equal(r.missingCount, 200); assert.equal(r.truncated, true);
    t.set('analysisResultLimit', 500); r = await t.report();
    assert.equal(r.missing.filter(row => row.en.includes('LIMIT_TEST')).length, 251); assert.equal(r.truncated, false);
    t.set('analysisNodeLimit', 8); r = await t.report(); assert.equal(r.truncated, true); assert.ok(r.missingCount < 251);
    t.set('analysisResultLimit', 0); t.set('analysisNodeLimit', 0); r = await t.report();
    assert.equal(r.missing.filter(row => row.en.includes('LIMIT_TEST')).length, 251); assert.equal(r.truncated, false);
    assert.equal(r.limits.results, 0); assert.equal(r.limits.elements, 0);
    assert.doesNotMatch(JSON.stringify(r), /PRIVATE_/);
    assert.equal(t.field.value, 'PRIVATE_VALUE 50 lb.'); assert.equal(t.editor.textContent, 'You gain PRIVATE_NOTES');
    assert.match(t.weight.textContent, /2 lb\.$/, 'Les poids et leurs unités sont conservés');
    t.set('analysisResultLimit', 1_000_000); assert.equal(JSON.parse(t.saved.get('shard-fr-v1')).analysisResultLimit, 1_000_000);
    for (const value of ['-1', '1.5', '']) {
      const input = t.set('analysisResultLimit', value); assert.equal(input.checkValidity(), false);
      assert.equal(JSON.parse(t.saved.get('shard-fr-v1')).analysisResultLimit, 1_000_000);
    }
    t.set('analysisResultLimit', 0); t.set('descriptionBatchLimit', 0);
    const bilingual = t.root.getElementById('bilingual'); bilingual.checked = true; bilingual.dispatchEvent(new t.w.Event('change'));
    const reloaded = setup(t.saved);
    try { for (const id of ['analysisResultLimit', 'analysisNodeLimit', 'descriptionBatchLimit']) assert.equal(reloaded.root.getElementById(id).value, '0'); }
    finally { reloaded.w.close(); }
    console.log('PASS limites : défauts, plus de 200 résultats, borne des éléments, mode sans limite, valeurs invalides, sauvegarde et rechargement, poids et champs privés conservés.');
  } finally { t.w.close(); }
  const invalid = setup(new Map([['shard-fr-v1', JSON.stringify({ analysisResultLimit: -2, analysisNodeLimit: 'oops', descriptionBatchLimit: 1.5 })]]));
  try { assert.equal(invalid.root.getElementById('analysisResultLimit').value, '200'); assert.equal(invalid.root.getElementById('analysisNodeLimit').value, '10000'); assert.equal(invalid.root.getElementById('descriptionBatchLimit').value, '100'); }
  finally { invalid.w.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
