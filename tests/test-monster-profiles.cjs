const fs = require('node:fs'), assert = require('node:assert/strict'), { JSDOM } = require('jsdom');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/monsters-water-wolf.json', 'utf8'));
const pack = JSON.parse(fs.readFileSync('translations/dnd-2024/mm/monstres/traductions.json', 'utf8')).entries;
const w = new JSDOM('<main></main>', { url: 'https://play.shardtabletop.com/#monster', runScripts: 'outside-only', pretendToBeVisual: true }).window;
const d = w.document, main = d.querySelector('main'), cases = [], tables = [];
const stats = {
  'Water Elemental': [['str', 18, '+4'], ['int', 5, '-3'], ['dex', 14, '+2'], ['wis', 10, '+0'], ['con', 18, '+4'], ['cha', 8, '-1']],
  Wolf: [['str', 14, '+2'], ['int', 3, '-4'], ['dex', 15, '+2'], ['wis', 12, '+1'], ['con', 12, '+1'], ['cha', 6, '-2']]
};
for (const profile of fixture.profiles) {
  // Deux dispositions : valeurs en texte et champs éditables sans les classes Shard.
  for (const standard of [true, false]) {
    const article = d.createElement('article'); article.className = standard ? 'monstersimple' : 'creature-sheet';
    article.innerHTML = `<h2>${profile.name}</h2><div class="${standard ? 'm24' : 'abilities'}"><table><tbody><tr><td></td><td></td><td>MOD</td><td><span>SAVE</span></td><td></td><td></td><td></td><td>MOD</td><td>SAVE</td></tr></tbody></table></div><div class="skills"><b>Skills</b> <span>Perception +5</span>, <span>Stealth +4</span></div><div class="senses"><b>Senses</b> <span>Darkvision 60 ft.; Passive Perception 15</span></div><div class="languages"><b>Languages</b> <span>Primordial (Aquan)</span></div><div class="challenge"><b>CR</b> 5 (1,800 XP; PB +3)</div><div class="stdcontent"><div class="pre-wrap"></div></div>`;
    if (standard) {
      const type = d.createElement('div'); type.className = 'i pb1';
      type.innerHTML = profile.name === 'Wolf' ? '<span>Medium  </span><span>beast</span><span>, Unaligned</span>' : '<span>Large  </span><span>elemental</span><span>, Neutral</span>';
      article.querySelector('h2').after(type);
      const fr = profile.name === 'Wolf' ? 'Bête de taille M, Sans alignement' : 'Élémentaire de taille G, Neutre';
      cases.push({ el: type, en: type.textContent, fr });
    }
    const table = article.querySelector('table'), tbody = table.querySelector('tbody');
    for (let i = 0; i < 6; i += 2) {
      const tr = d.createElement('tr');
      tr.innerHTML = stats[profile.name].slice(i, i + 2).map(([ability, value, mod]) => `<td><b>${ability}</b></td><td>${value}</td><td>${mod}</td><td>${mod}</td>`).join('<td></td>');
      tbody.append(tr);
    }
    const command = d.createElement('tr'); command.innerHTML = '<td colspan="9"><button><span>Save</span></button></td>'; tbody.append(command);
    if (!standard) for (const cell of table.querySelectorAll('td')) if (/^[+-]?\d+$/.test(cell.textContent)) {
      const input = d.createElement('input'); input.type = 'number'; input.value = cell.textContent; cell.replaceChildren(input);
    }
    tables.push(table);
    for (const row of profile.paragraphs) {
      const p = d.createElement('p');
      if (row.heading) { const strong = d.createElement('strong'), em = d.createElement('em'); em.textContent = row.heading + '.'; strong.append(em); p.append(strong, ' '); }
      for (const part of row.en.split(/(\b\d+d\d+(?: \+ \d+)?\b|Prone|Grappled|Restrained)/g)) {
        if (/^\d+d/.test(part)) { const die = d.createElement('b'); die.className = 'dodieroll'; die.innerHTML = '<span class="fas">\uf6cf</span>'; die.append(part); p.append(die); }
        else if (/^(Prone|Grappled|Restrained)$/.test(part)) { const a = d.createElement('a'); a.href = '#customlist?type=Conditions&id=' + part; a.textContent = part; p.append(a); }
        else p.append(part);
      }
      article.querySelector('.pre-wrap').append(p);
      cases.push({ el: p, en: (row.heading ? row.heading + '. ' : '') + row.en, fr: (row.frHeading ? row.frHeading + '. ' : '') + row.fr });
    }
    main.append(article);
  }
}
const variants = pack.flatMap(row => row.id.startsWith('monster.common.pack-tactics.') ? (row.variants || []).map(en => ({ en, fr: row.fr })) : []);
assert.equal(variants.length, 32);
for (const row of variants) {
  const p = d.createElement('p'); p.textContent = row.en;
  // La variante du Loup contient le lien d'état montré dans l'extrait utilisateur.
  p.innerHTML = p.innerHTML.replace('Incapacitated', '<a href="#customlist?type=Conditions&amp;id=jhsnov3jlzaa62ub">Incapacitated</a>');
  main.append(p); cases.push({ ...row, el: p });
}
const exceptions = d.createElement('div');
exceptions.innerHTML = '<button>Save</button><table><tr><td><span>Save</span></td></tr></table><p>The wolf has Advantage on attack rolls against a creature if at least one of the wolf’s allies is within 15 feet of the creature and the ally doesn’t have the Incapacitated condition.</p><p>Water Form. The elemental can enter an enemy’s space and stop there. It can move through a space as narrow as 2 inches without expending extra movement to do so.</p><input value="PRIVATE_CHARACTER"><div contenteditable="true">PRIVATE_NOTES</div>';
main.append(exceptions);
const sentinel = d.createElement('button'); sentinel.textContent = 'Close'; main.append(sentinel);
const numericCells = tables.flatMap(table => [...table.querySelectorAll('td')].filter(td => /^[+-]?\d+$/.test(td.textContent))), values = numericCells.map(td => td.textContent);
const statInputs = [...main.querySelectorAll('table input')], inputValues = statInputs.map(input => input.value);
const skills = [...main.querySelectorAll('.skills span')], skillNumbers = skills.map(el => el.textContent.match(/\+\d+/)[0]);
const links = [...main.querySelectorAll('a')], hrefs = links.map(a => a.getAttribute('href'));
const dice = [...main.querySelectorAll('.dodieroll')], diceHTML = dice.map(el => el.innerHTML);
const elements = [...main.querySelectorAll('*')]; let clicks = 0;
for (const el of [...links, ...dice]) el.addEventListener('click', event => { event.preventDefault(); clicks++; });
const original = main.innerHTML, plain = text => text.replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
const numbers = text => (text.match(/\d+(?:[.,]\d+)?/g) || []).sort();
w.GM_getValue = (key, fallback) => fallback; w.GM_setValue = () => {}; w.GM_registerMenuCommand = () => {};
w.GM_xmlhttpRequest = options => options.onerror();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(check) { for (let i = 0; i < 600 && !check(); i++) await pause(25); assert.ok(check(), JSON.stringify(cases.filter(row => plain(row.el.textContent) !== row.fr).map(row => ({ en: row.en, expected: row.fr, actual: plain(row.el.textContent) })), null, 2)); }
(async () => { try {
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js', 'utf8'));
  await wait(() => sentinel.textContent === 'Fermer' && cases.every(row => plain(row.el.textContent) === row.fr) && tables.every(table => [...table.rows[0].cells].filter(cell => cell.textContent === 'Sauvegarde').length === 2));
  cases.forEach(row => assert.deepEqual(numbers(plain(row.el.textContent)), numbers(row.en), row.en));
  numericCells.forEach((td, i) => assert.equal(td.textContent, values[i]));
  statInputs.forEach((input, i) => assert.equal(input.value, inputValues[i]));
  tables.forEach(table => assert.equal(table.querySelector('button').textContent, 'Enregistrer'));
  skills.forEach((el, i) => { assert.ok(el.textContent.endsWith(skillNumbers[i])); assert.doesNotMatch(el.textContent, /Stealth/); });
  assert.ok([...main.querySelectorAll('.languages')].every(el => /Primordial \(Aquatique\)/.test(el.textContent)));
  assert.ok([...main.querySelectorAll('.challenge')].every(el => /1,800 PX; BM \+3/.test(el.textContent)));
  assert.equal(exceptions.querySelector('button').textContent, 'Enregistrer'); assert.equal(exceptions.querySelector('td').textContent, 'Enregistrer');
  assert.match(exceptions.querySelectorAll('p')[0].textContent, /within 15 feet/); assert.match(exceptions.querySelectorAll('p')[1].textContent, /2 inches/);
  assert.equal(exceptions.querySelector('input').value, 'PRIVATE_CHARACTER'); assert.equal(exceptions.querySelector('[contenteditable]').textContent, 'PRIVATE_NOTES');
  elements.forEach(el => assert.ok(el.isConnected));
  links.forEach((a, i) => { assert.equal(a.getAttribute('href'), hrefs[i]); assert.ok(a.textContent.trim()); a.click(); });
  dice.forEach((el, i) => { assert.equal(el.innerHTML, diceHTML[i]); el.click(); }); assert.equal(clicks, links.length + dice.length);
  // Une mise à jour Shard d'une caractéristique reste la valeur faisant foi.
  numericCells[0].textContent = '19'; await pause(100); assert.equal(numericCells[0].textContent, '19'); numericCells[0].textContent = values[0];
  statInputs[0].value = '19'; statInputs[0].dispatchEvent(new w.Event('input', { bubbles: true })); await pause(100); assert.equal(statInputs[0].value, '19');
  const root = [...d.querySelectorAll('[data-shard-fr-ignore]')].map(el => el.shadowRoot).find(r => r?.getElementById('enabled'));
  const enabled = root.getElementById('enabled'); enabled.checked = false; enabled.dispatchEvent(new w.Event('change'));
  const restored = () => { const copy = main.cloneNode(true); copy.querySelectorAll('[data-shard-fr-link]').forEach(el => el.remove()); return copy.innerHTML; };
  await wait(() => restored() === original);
  assert.equal(statInputs[0].value, '19', 'Désactiver la traduction conserve les modifications de la fiche');
  console.log(`PASS profils monstres : Élémentaire de l’eau et Loup complets, ${variants.length} variantes communes, quatre tableaux dont titres imbriqués, statistiques/compétences/dés/liens conservés, valeurs dynamiques, exceptions et restauration exacte.`);
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
