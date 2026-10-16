const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/custom-references.json', 'utf8'));
const code = fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8');
const w = new JSDOM('<main></main><input value="PRIVATE_VALUE"><textarea>PRIVATE_NOTES</textarea>', {
  url: 'https://play.shardtabletop.com/#customtable', runScripts: 'outside-only', pretendToBeVisual: true
}).window;
const d = w.document, main = d.querySelector('main');
const norm = text => text.normalize('NFC').replace(/[’‘ʼ]/g, "'").replace(/[‐‑–]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const detailSelector = 'h2,h3,h4,p,li,td,th,.stdcontent.f4 > .i.mb1';
const listSelector = '.f1.titlecolor,p,li,td,th,.i';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(predicate, label) {
  for (let i = 0; i < 600 && !predicate(); i++) await pause(25);
  assert.ok(predicate(), label);
}
let blob, clicks = 0, diceCount = 0, linksCount = 0, checkedBlocks = 0;
w.GM_getValue = (key, fallback) => fallback;
w.GM_setValue = () => {};
w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = options => options.onerror();
w.URL.createObjectURL = value => {blob = value; return 'blob:local-reference-audit';};
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () {};
async function exported(root) {
  await wait(() => !root.getElementById('exportMissing').disabled); root.getElementById('exportMissing').click();
  return new Promise((resolve, reject) => {
    const reader = new w.FileReader(); reader.onload = () => resolve(JSON.parse(reader.result)); reader.onerror = reject; reader.readAsText(blob);
  });
}
function nodesFor(container, selector) {
  return [...container.querySelectorAll(selector)].filter(node => !node.querySelector('h2,h3,h4,p,li,td,th,.f1.titlecolor') && node.textContent.trim());
}
const reports = [], failures = [];
const properSources = new Set(fixture.groups.flatMap(group => group.cards.map(card => card.source)));
function metadataCandidate(row) {
  return properSources.has(row.en) || [...properSources].some(source => row.en === 'Source. ' + source) || /^\d+d\d+$/.test(row.en);
}
async function checkBatch(group, cards, root) {
  main.replaceChildren();
  const cases = [];
  for (const card of cards) for (const [view, html, blocks, selector] of [
    ['detail', card.html, card.blocks, detailSelector], ['list', card.listHtml, card.listBlocks, listSelector]
  ]) {
    const wrapper = d.createElement('section'); wrapper.innerHTML = html; main.append(wrapper);
    const nodes = nodesFor(wrapper, selector);
    assert.equal(nodes.length, blocks.length, `${group.type}/${card.name}/${view}: structure du relevé`);
    nodes.forEach((node, i) => {
      assert.equal(norm(node.textContent), norm(blocks[i].en), `${card.name}: anglais original`);
      cases.push({node, row: blocks[i], name: card.name, view});
    });
  }
  const sentinel = d.createElement('p'); sentinel.textContent = 'Character Sheet'; main.append(sentinel);
  const original = main.innerHTML;
  const links = [...main.querySelectorAll('a')], hrefs = links.map(node => node.getAttribute('href'));
  const dice = [...main.querySelectorAll('.dodieroll')], rolls = dice.map(node => node.textContent);
  const cells = [...main.querySelectorAll('td,th')], spans = cells.map(node => [node.rowSpan, node.colSpan]);
  for (const node of [...links, ...dice]) node.addEventListener('click', event => {event.preventDefault(); clicks++;});
  const enabled = root.getElementById('enabled'); enabled.checked = true; enabled.dispatchEvent(new w.Event('change'));
  await wait(() => sentinel.textContent === 'Fiche de personnage', group.type + ': parcours incomplet');
  // Une seconde frame laisse les groupes inline terminer leur mise en forme.
  await new Promise(resolve => w.requestAnimationFrame(() => w.requestAnimationFrame(resolve)));
  for (const {node, row, name, view} of cases) {
    checkedBlocks++;
    if (norm(node.textContent) !== norm(row.fr)) failures.push({type: group.type, name, view, en: row.en, expected: row.fr, actual: node.textContent});
  }
  links.forEach((node, i) => {assert.ok(node.isConnected); assert.equal(node.getAttribute('href'), hrefs[i]); node.dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true}));});
  dice.forEach((node, i) => {assert.ok(node.isConnected); assert.equal(node.textContent, rolls[i]); node.dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true}));});
  cells.forEach((node, i) => {assert.ok(node.isConnected); assert.deepEqual([node.rowSpan, node.colSpan], spans[i]);});
  linksCount += links.length; diceCount += dice.length;
  root.getElementById('scanMissing').click();
  const report = await exported(root);
  assert.equal(report.truncated, false, group.type + ': analyser par lots sans tronquer le rapport');
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_/);
  reports.push({type: group.type, fiches: cards.length, missing: report.missing.filter(row => !metadataCandidate(row)), metadataCandidates: report.missing.filter(metadataCandidate)});
  root.getElementById('clearMissing').click();
  enabled.checked = false; enabled.dispatchEvent(new w.Event('change'));
  await wait(() => main.innerHTML === original, group.type + ': restauration du HTML anglais');
}
(async () => {
  try {
    w.eval(code);
    const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(node => node.shadowRoot).find(root => root?.getElementById('scanMissing'));
    const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change'));
    for (const group of fixture.groups) {
      for (let i = 0; i < group.cards.length; i += 8) await checkBatch(group, group.cards.slice(i, i + 8), root);
      console.log(`Références ${group.type}: ${group.cards.length} fiches + cartes vérifiées.`);
    }
    const remaining = reports.flatMap(report => report.missing.map(row => ({type: report.type, ...row})));
    const report = {date: fixture.date, scriptVersion: JSON.parse(fs.readFileSync('package.json')).version,
      fiches: fixture.groups.reduce((n, group) => n + group.cards.length, 0), blocsVerifies: checkedBlocks, liensVerifies: linksCount, desVerifies: diceCount,
      candidatsRestants: remaining, ecartsDeTraduction: failures, metadonneesEtDes: reports.flatMap(report => report.metadataCandidates),
      groupes: fixture.groups.map(group => ({type: group.type, fiches: group.cards.length, cartesEtFichesVerifiees: !failures.some(row => row.type === group.type) && !remaining.some(row => row.type === group.type)})),
      limites: ['Validation locale des HTML relevés ; le userscript installé dans Tampermonkey n’a pas été contrôlé en direct.', 'Le relevé couvre les entrées accessibles dans les dix rubriques le 15 octobre 2026 ; les ajouts futurs et les autres bibliothèques restent à vérifier.']};
    fs.writeFileSync('audit/generes/references-personnalisees.json', JSON.stringify(report, null, 2) + '\n');
    if (failures.length || remaining.length) console.error(JSON.stringify({failures: failures.slice(0, 15), remaining: remaining.slice(0, 15)}, null, 2));
    assert.equal(failures.length, 0, 'Blocs non traduits ou différents des attentes');
    assert.equal(remaining.length, 0, 'Reliquats signalés par le même analyseur que le panneau');
    assert.equal(clicks, linksCount + diceCount);
    assert.equal(d.querySelector('input').value, 'PRIVATE_VALUE');
    assert.equal(d.querySelector('textarea').value, 'PRIVATE_NOTES');
    console.log(`PASS références : ${report.fiches} fiches et cartes, ${checkedBlocks} blocs, ${linksCount} liens et ${diceCount} dés, tableaux et restauration exacte ; aucun reliquat hors métadonnées.`);
  } finally {w.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
