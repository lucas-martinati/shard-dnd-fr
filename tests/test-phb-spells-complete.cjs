const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');

const code = fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8');
const allSpells = new Map(JSON.parse(fs.readFileSync('tests/fixtures/phb-spells-2024.json', 'utf8')).map(r => [r.name, r.html]));
const targetNames = [
  'Friends', 'Spare the Dying', 'Protection from Evil and Good', 'Shield',
  'Barkskin', 'Cordon of Arrows', 'Enlarge/Reduce', 'Augury', 'Divination',
  'Commune with Nature', 'Cone of Cold', 'Creation', 'Contingency',
  'Guards and Wards', 'Sunbeam', 'Prismatic Spray', 'Teleport',
  'Antipathy/Sympathy', 'Control Weather', 'Sunburst', 'Prismatic Wall', 'Time Stop'
];

const w = new JSDOM('<main></main>', {url: 'https://play.shardtabletop.com/#spell', runScripts: 'outside-only', pretendToBeVisual: true}).window;
const d = w.document, main = d.querySelector('main');
const articles = new Map();
for (const name of targetNames) {
  assert.ok(allSpells.has(name), 'Missing spell in fixture: ' + name);
  const article = d.createElement('article');
  article.innerHTML = '<h2></h2>' + allSpells.get(name);
  article.querySelector('h2').textContent = name;
  main.append(article);
  articles.set(name, article);
}
const clearBtn = d.createElement('button');
clearBtn.id = 'ui-clear';
clearBtn.textContent = 'Clear';
main.append(clearBtn);

const sentinel = d.createElement('button');
sentinel.textContent = 'Close';
main.append(sentinel);

const original = main.innerHTML;
const dice = [...main.querySelectorAll('.dodieroll')], diceText = dice.map(e => e.textContent);
const links = [...main.querySelectorAll('article .pre-wrap a')], hrefs = links.map(e => e.getAttribute('href'));
let clicks = 0;
for (const el of [...dice, ...links]) el.addEventListener('click', event => { event.preventDefault(); clicks++; });

let blob;
w.GM_getValue = (k, f) => k === 'shard-fr-v1' ? JSON.stringify({analysisResultLimit: 0, analysisNodeLimit: 0}) : f;
w.GM_setValue = () => {};
w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = () => { throw Error('Hors ligne uniquement'); };
w.URL.createObjectURL = v => { blob = v; return 'blob:phb-spells'; };
w.URL.revokeObjectURL = () => {};
const origAnchorClick = w.HTMLAnchorElement.prototype.click;
w.HTMLAnchorElement.prototype.click = function () {
  if (!this.download) return origAnchorClick.call(this);
};

const pause = ms => new Promise(r => setTimeout(r, ms));
async function wait(fn) {
  for (let i = 0; i < 400 && !fn(); i++) await pause(15);
  assert.ok(fn(), 'Delai depasse');
}

(async () => {
  try {
    w.eval(code);
    await wait(() => sentinel.textContent === 'Fermer');
    const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('scanMissing'));
    root.getElementById('scanMissing').click();
    await wait(() => !root.getElementById('scanMissing').disabled);
    root.getElementById('exportMissing').click();
    const report = await new Promise(res => {
      const reader = new w.FileReader();
      reader.onload = () => res(JSON.parse(reader.result));
      reader.readAsText(blob);
    });
    assert.equal(report.missingCount, 0, 'Zero candidat attendu : ' + JSON.stringify(report.missing));

    // Bouton d'interface Clear vs table Précipitations de Contrôle du climat
    assert.equal(clearBtn.textContent, 'Effacer');
    const cwCells = [...articles.get('Control Weather').querySelectorAll('td')].map(td => td.textContent.trim());
    assert.ok(cwCells.includes('Ciel dégagé'), 'Clear traduit en Ciel dégagé dans la table Précipitations');
    assert.ok(cwCells.includes('Vent modéré'), 'Moderate wind traduit en Vent modéré');

    // Table Augure : Good / Bad contextualisés
    const augCells = [...articles.get('Augury').querySelectorAll('td')].map(td => td.textContent.trim());
    assert.ok(augCells.includes('Favorable') && augCells.includes('Défavorable'), 'Augury Good/Bad contextualisés');

    // Barkskin : Component singulier issu du SRD
    assert.match(articles.get('Barkskin').textContent, /Composante\s*:\s*V, S, M \(une poignée d’écorce\)/);

    // Time Stop : dé "1d4 + 1" avec espaces préservé dans une phrase traduite
    const timeStop = articles.get('Time Stop');
    assert.match(timeStop.textContent, /tandis que vous prenez 1d4 \+ 1 tours d’affilée/);
    assert.equal(timeStop.querySelector('.dodieroll').textContent, '1d4 + 1');

    // Liens d'états accordés en genre sans suffixe orphelin hors balise <a>
    const sunburstLinks = [...articles.get('Sunburst').querySelectorAll('.pre-wrap a')].map(a => a.textContent);
    assert.ok(sunburstLinks.every(t => t === 'aveuglée'), 'Accords féminins complets dans les liens : ' + JSON.stringify(sunburstLinks));
    for (const a of links) {
      assert.doesNotMatch(a.nextSibling?.nodeType === 3 ? a.nextSibling.data : '', /^[es]{1,2}\b/, 'Aucun suffixe grammatical coupé hors du lien : ' + a.outerHTML);
    }

    // Interactions et restauration exacte
    dice.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.textContent, diceText[i]); el.click(); });
    links.forEach((el, i) => { assert.ok(el.isConnected); assert.equal(el.getAttribute('href'), hrefs[i]); el.click(); });
    assert.equal(clicks, dice.length + links.length);

    const enabled = root.getElementById('enabled');
    enabled.checked = false;
    enabled.dispatchEvent(new w.Event('change'));
    await wait(() => {
      main.querySelectorAll('[data-shard-fr-link]').forEach(el => el.remove());
      return main.innerHTML === original;
    });
    console.log(`PASS sorts PHB complétés : ${targetNames.length} fiches sans candidat, tables/composantes/accords/dés vérifiés et restauration exacte.`);
  } finally {
    w.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
