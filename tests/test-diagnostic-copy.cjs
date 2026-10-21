const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const body = 'The creature uses 2 unknown arcs with Fire Bolt.';
const full = 'Multiattack. ' + body;
const profile = name => `<div class="monstersimple"><div class="titletext">${name}</div><p><b class="titletext"><i>Multiattack.</i></b> The creature uses <b class="dodieroll">2</b> unknown arcs with <a href="#spell?id=bolt">Fire Bolt</a>.<span hidden>PRIVATE_HIDDEN</span><span style="display:none">PRIVATE_CSS</span><input value="PRIVATE_INPUT"><span contenteditable="true">PRIVATE_EDITOR</span></p></div>`;
const w = new JSDOM(profile('Wolf') + profile('Ape') + '<table><tbody><tr><td class="hoverhighlight w-100"><div>Quartz Relic</div></td></tr></tbody></table>', { url: 'https://play.shardtabletop.com/#item?private=PRIVATE_URL', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, copied = [], native = [], pending = [];
let blob, downloads = 0, requests = 0;
w.GM_getValue = (key, fallback) => fallback; w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = options => { requests++; options.onerror(); };
w.GM_setClipboard = (text, type, done) => { assert.equal(type, 'text'); copied.push(text); done(); };
Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: async text => { native.push(text); }, readText: () => { throw Error('Ne jamais lire le presse-papiers'); } } });
w.URL.createObjectURL = value => { blob = value; return 'blob:diagnostic-copy'; }; w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { downloads++; };
d.querySelector('td').onclick = () => {
  const dialog = d.createElement('div'); dialog.setAttribute('role', 'dialog');
  dialog.innerHTML = '<div class="MuiDialogTitle-root"><div class="titletext">Quartz Relic</div></div><div class="MuiDialogContent-root"><div class="pre-wrap"><p>You invoke a DESCRIPTION_ONLY unknown effect.</p><input value="PRIVATE_DESCRIPTION"></div></div><div class="MuiDialogActions-root"><button>Close</button></div>';
  dialog.querySelector('button').onclick = () => dialog.remove(); d.body.append(dialog);
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 500 && !check(); i++) await pause(20); assert.ok(check(), 'Clipboard diagnostic timed out'); }
(async () => { try {
  const code = fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'); assert.match(code, /@grant\s+GM_setClipboard/);
  w.eval(code);
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('copyMissing'));
  const el = id => root.getElementById(id), copyPage = () => el('copyMissing').click();
  async function scan() { el('scanMissing').click(); await wait(() => !el('exportMissing').disabled); }
  async function exported(id) { el(id).click(); return new Promise(resolve => { const reader = new w.FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob); }); }
  assert.ok(el('copyMissing').disabled); assert.ok(el('copyDescriptions').disabled); copyPage(); assert.equal(copied.length, 0);
  await scan(); assert.equal(copied.length, 0, 'Aucune copie automatique pendant l’analyse');
  const pageJSON = await exported('exportMissing'), page = JSON.parse(pageJSON);
  const fragment = page.missing.find(row => row.blocks?.some(block => block.en === full)); assert.ok(fragment, 'Le paragraphe complet accompagne le fragment');
  assert.notEqual(fragment.en, full); assert.equal(fragment.occurrences, 2); assert.equal(fragment.context, 'Wolf');
  assert.deepEqual(fragment.blocks.map(({en,context})=>({en,context})), [{ en: full, context: 'Wolf' }, { en: full, context: 'Ape' }]);
  assert.equal(typeof fragment.displayed, 'string'); assert.match(fragment.displayed, /Trait de feu/);
  fragment.blocks.forEach(block=>{ assert.match(block.displayed, /Attaques multiples/); assert.match(block.displayed, /Trait de feu/); });
  assert.doesNotMatch(pageJSON, /PRIVATE_/); assert.equal(page.scope, 'visible-page');
  const beforeRequests = requests, beforeDownloads = downloads;
  copyPage(); await wait(() => el('copyMissingStatus').textContent.includes('Analyse copiée'));
  assert.equal(copied.at(-1), pageJSON, 'Copie et fichier ont exactement le même JSON'); assert.equal(native.length, 0);
  assert.equal(downloads, beforeDownloads); assert.equal(requests, beforeRequests); assert.equal(el('copyMissingStatus').getAttribute('role'), 'status');
  const toggle = el('showDescriptionStatus'); toggle.checked = true; toggle.dispatchEvent(new w.Event('change')); el('inspectDescriptions').click();
  await wait(() => el('descriptionStatus').textContent.includes('terminée'));
  const descriptionJSON = await exported('exportDescriptions'); el('copyDescriptions').click(); await wait(() => el('copyDescriptionsStatus').textContent.includes('Analyse copiée'));
  assert.equal(copied.at(-1), descriptionJSON); assert.equal(JSON.parse(descriptionJSON).scope, 'catalogue-descriptions'); assert.ok(JSON.parse(descriptionJSON).missing.every(row=>typeof row.displayed==='string')); assert.doesNotMatch(descriptionJSON, /PRIVATE_/);
  assert.equal(await exported('exportMissing'), pageJSON, 'Les deux analyses restent séparées');
  // Repli natif si l’API de l’extension manque ou lève une erreur.
  w.GM_setClipboard = undefined; copyPage(); await wait(() => !el('copyMissing').disabled); assert.equal(native.at(-1), pageJSON);
  w.GM_setClipboard = () => { throw Error('Unavailable manager'); }; copyPage(); await wait(() => !el('copyMissing').disabled); assert.equal(native.length, 2);
  w.navigator.clipboard.writeText = async () => { throw Error('NotAllowedError'); };
  copyPage(); await wait(() => el('copyMissingStatus').textContent.includes('Copie impossible')); assert.equal(el('copyMissing').disabled, false);
  assert.equal(await exported('exportMissing'), pageJSON, 'Un échec de copie préserve l’export');
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: undefined }); w.GM_setClipboard = undefined;
  copyPage(); await wait(() => el('copyMissingStatus').textContent.includes('Copie impossible'));
  // Reprise réussie, puis effacement et réanalyse pendant une copie asynchrone.
  w.GM_setClipboard = (text, type, done) => { copied.push(text); done(); };
  copyPage(); await wait(() => el('copyMissingStatus').textContent.includes('Analyse copiée'));
  w.GM_setClipboard = (text, type, done) => pending.push({ text, done });
  copyPage(); assert.ok(el('copyMissing').disabled); el('clearMissing').click(); assert.ok(el('copyMissing').disabled);
  pending.shift().done(); await pause(0); assert.equal(el('copyMissingStatus').textContent, ''); assert.ok(el('copyMissing').disabled);
  assert.equal(el('copyDescriptions').disabled, false, 'Effacer la page ne désactive pas la copie des fiches');
  await scan(); copyPage(); const old = pending.shift(); await scan(); copyPage(); const latest = pending.shift();
  old.done(); await pause(0); assert.equal(el('copyMissingStatus').textContent, 'Copie en cours…'); assert.ok(el('copyMissing').disabled);
  latest.done(); await wait(() => el('copyMissingStatus').textContent.includes('Analyse copiée')); assert.equal(el('copyMissing').disabled, false);
  el('copyDescriptions').click(); const stale = pending.shift(); w.dispatchEvent(new w.HashChangeEvent('hashchange')); stale.done(); await pause(0);
  for (const kind of ['Missing', 'Descriptions']) { assert.ok(el('copy' + kind).disabled); assert.equal(el('copy' + kind + 'Status').textContent, ''); }
  assert.equal(d.querySelector('input').value, 'PRIVATE_INPUT'); assert.equal(d.querySelector('[contenteditable]').textContent, 'PRIVATE_EDITOR');
  console.log('PASS copie JSON : page/fiches, égalité avec les fichiers, API Tampermonkey et repli natif, erreurs et reprise, copies en attente, effacement/navigation, blocs complets et contextes, champs privés exclus, aucun téléchargement ni réseau lors de la copie.');
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
