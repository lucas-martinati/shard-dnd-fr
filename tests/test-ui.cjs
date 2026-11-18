const fs = require('node:fs');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync('outputs/shard-ui.user.js', 'utf8');
const fixture = fs.readFileSync('tests/fixtures/campaign-settings.html', 'utf8');
const w = new JSDOM(`<main>${fixture}</main>`, {url:'https://play.shardtabletop.com/', runScripts:'outside-only', pretendToBeVisual:true}).window;
const d = w.document, main = d.querySelector('main');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => { try {
  const input = main.querySelector('input'), button = main.querySelector('button');
  input.value = 'Valeur utilisateur';
  const original = d.body.innerHTML;
  let clicks = 0; button.addEventListener('click', () => clicks++);
  for (const name of ['GM_getValue','GM_setValue','GM_registerMenuCommand']) {
    w[name] = () => { throw new Error('The UI script must not access settings or create commands'); };
  }
  w.eval(source);
  assert.equal(d.body.innerHTML, original, 'UI must leave the entire body untouched');
  assert.equal(d.documentElement.attributes.length, 0, 'No persisted theme flags');
  assert.equal(main.querySelector('input'), input);
  button.click(); assert.equal(clicks, 1);
  assert.equal(input.value, 'Valeur utilisateur');
  assert.equal(d.querySelectorAll('style#shard-ui-theme').length, 1);
  w.eval(source);
  assert.equal(d.querySelectorAll('style#shard-ui-theme').length, 1, 'Idempotent injection');
  const added = d.createElement('section');
  added.className = 'characterSheet';
  added.innerHTML = '<div class="statBlock"><div><button>21 / 21</button></div></div><div class="description">Description sans agrandissement</div>';
  d.body.append(added);
  const hp = added.querySelector('button'); let hpClicks = 0;
  hp.onclick = () => hpClicks++;
  hp.click(); assert.equal(hpClicks, 1);
  assert.equal(added.querySelector('button'), hp);
  const section = d.createElement('div');
  section.className = 'skillBlock';
  section.innerHTML = '<div><div class="theader">Skills</div><table><tbody><tr><td><button>Roll</button></td></tr></tbody></table></div>';
  added.append(section);
  await pause(60);
  const fold = section.querySelector('.sui-fold'), roll = section.querySelector('table button');
  assert.ok(fold, 'Dynamic section receives accordion');
  let rolls = 0; roll.onclick = () => rolls++;
  fold.click();
  assert.equal(fold.getAttribute('aria-expanded'), 'false');
  assert.ok(section.firstElementChild.hasAttribute('data-sui-folded'));
  fold.click(); roll.click(); assert.equal(rolls, 1);
  assert.equal(section.querySelector('table button'), roll);
  assert.equal(d.querySelector('.sui-section-icon'), null, 'No decorative icons');
  const heading = section.querySelector('.theader');
  heading.click(); assert.equal(fold.getAttribute('aria-expanded'), 'false', 'Whole heading collapses');
  const title = d.createElement('span'); title.textContent = 'Skills'; heading.append(title);
  title.click(); assert.equal(fold.getAttribute('aria-expanded'), 'true', 'Nested title expands');
  const filter = d.createElement('div'); filter.setAttribute('role', 'combobox');
  filter.innerHTML = '<span>All</span>'; heading.append(filter);
  filter.firstChild.click(); assert.equal(fold.getAttribute('aria-expanded'), 'true', 'Filters remain independent');
  // Existing controls in a header must not collapse the section.
  const pick = d.createElement('button'); pick.textContent = 'Pick';
  section.querySelector('.theader').append(pick);
  pick.click(); assert.equal(fold.getAttribute('aria-expanded'), 'true');
  fold.click();
  const nav = d.createElement('div'); nav.className = 'tourCharacterNav';
  nav.innerHTML = '<table><tbody><tr><td>Skills</td></tr></tbody></table>';
  d.body.insertBefore(nav, added);
  nav.querySelector('td').click();
  assert.equal(fold.getAttribute('aria-expanded'), 'true', 'Native navigation reveals folded sections');
  // Simulate React replacing the header while the section is closed.
  fold.click();
  section.querySelector('.theader').outerHTML = '<div class="theader">Compétences</div>';
  await pause(60);
  assert.equal(section.querySelectorAll('.sui-fold').length, 1);
  assert.equal(section.querySelector('.sui-fold').getAttribute('aria-expanded'), 'false');
  section.querySelector('.sui-fold').click();
  const native = d.createElement('div'); native.className = 'spellBlock';
  native.innerHTML = '<div><div class="theader"><span class="fa-minus-square"></span>Spells</div><p>Existing accordion</p></div>';
  added.append(native); await pause(60);
  assert.equal(native.querySelector('.sui-fold'), null, 'Do not duplicate a native accordion');
  const siblingNative = d.createElement('div'); siblingNative.className = 'spellBlock';
  siblingNative.innerHTML = '<div><div class="flex items-center"><div class="flex-auto theader">Class Features</div><div><span class="fa-minus-square"></span></div></div><p>Sibling native accordion</p></div>';
  added.append(siblingNative); await pause(60);
  assert.equal(siblingNative.querySelector('.sui-fold'), null, 'Do not duplicate a sibling native accordion');
  const extraBlocks = [
    ['savingThrows', 'Jets de sauvegarde'],
    ['attuneBlock', 'Harmonisation'],
    ['profBlock', 'Maîtrises'],
    ['companionBlock', 'Compagnons']
  ];
  for (const [cls, label] of extraBlocks) {
    const blk = d.createElement('div'); blk.className = cls;
    blk.innerHTML = `<div><div class="theader">${label}</div><div>Contenu</div></div>`;
    added.append(blk);
  }
  await pause(60);
  for (const [cls] of extraBlocks) {
    const foldBtn = added.querySelector(`.${cls} .sui-fold`);
    assert.ok(foldBtn, `Extended section .${cls} receives accordion`);
  }
  const css = d.querySelector('style#shard-ui-theme').textContent;
  assert.ok(css.includes('--bookChapterColor'), 'Dark book TOC contrast fix included');
  assert.ok(css.includes('body.darkT .m24:not(.lightT .m24) .m24c11'), 'Dark 2024 statblock excludes nested .lightT');
  assert.ok(css.includes('.stdcontent table:not(.m24 table)'), 'Reference table spacing included');
  assert.ok(css.includes('translateY(-50%)'), 'Fold button centers vertically on tall headers');
  // Verify Shard's outer .darkT wrapper never forces light text onto nested .lightT statblocks.
  const shell = d.createElement('div');
  shell.className = 'darkT';
  shell.innerHTML = '<div class="lightT"><div class="m24"><table><tbody><tr><td>MOD</td></tr><tr><td class="m24c11">20</td></tr></tbody></table></div></div><div class="m24 darkOnly"><table><tbody><tr><td>MOD</td></tr><tr><td class="m24c11">20</td></tr></tbody></table></div>';
  d.body.append(shell);
  const parchmentCell = shell.querySelector('.lightT .m24c11');
  const darkCell = shell.querySelector('.darkOnly .m24c11');
  d.body.className = 'lightT';
  assert.equal(w.getComputedStyle(parchmentCell).color, 'rgb(27, 25, 22)', 'Light mode book statblock keeps dark ink despite outer .darkT');
  d.body.className = 'darkT';
  assert.equal(w.getComputedStyle(parchmentCell).color, 'rgb(27, 25, 22)', 'Nested .lightT statblock inside dark mode keeps dark ink');
  assert.equal(w.getComputedStyle(darkCell).color, 'rgb(242, 236, 224)', 'True dark statblock receives high-contrast light ink');
  d.body.removeAttribute('class');
  shell.remove();
  const tracker = d.createElement('section'); tracker.className = 'tourAdventureTracker';
  tracker.innerHTML = '<table class="encountertable"><thead><tr><th><i class="fas fa-heart" title="Hit Points"></i></th></tr></thead><tbody><tr><td><button>24</button></td></tr></tbody></table>';
  d.body.append(tracker); await pause(60);
  assert.equal(tracker.querySelector('.sui-column-label').textContent, 'PV');
  const hpButton = tracker.querySelector('button'); let changes = 0;
  hpButton.onclick = () => changes++;
  hpButton.click(); assert.equal(changes, 1);
  tracker.querySelector('thead').innerHTML = '<tr><th><i class="fas fa-shield-alt"></i></th></tr>';
  await pause(60);
  assert.equal(tracker.querySelector('.sui-column-label').textContent, 'CA');
  assert.equal(tracker.querySelector('button'), hpButton);
  tracker.remove();
  const map = d.createElement('section'); map.className = 'tourAdventureMap';
  map.innerHTML = '<div class="maptool"><span class="toolnormal"><span title="Mesurer"></span></span><span class="toolnormal" title="Grille"></span></div><canvas></canvas>';
  d.body.append(map); await pause(60);
  const [tool, directTool] = map.querySelectorAll('.toolnormal'), canvas = map.querySelector('canvas');
  assert.equal(directTool.getAttribute('aria-label'), 'Grille', 'Direct title on map tool supported');
  let actions = 0; tool.onclick = () => actions++;
  assert.equal(tool.getAttribute('aria-label'), 'Mesurer');
  assert.equal(tool.tabIndex, 0);
  tool.dispatchEvent(new w.KeyboardEvent('keydown', {key:'Enter',bubbles:true}));
  assert.equal(actions, 1);
  tool.dispatchEvent(new w.Event('pointerenter'));
  assert.equal(d.querySelector('#sui-map-hint').textContent, 'Mesurer');
  assert.equal(d.querySelector('#sui-map-hint').hidden, false);
  assert.equal(tool.getAttribute('aria-describedby'), 'sui-map-hint');
  const unrelated = d.createElement('div'); d.body.append(unrelated);
  await pause(60);
  assert.equal(d.querySelector('#sui-map-hint').hidden, false, 'Unrelated DOM updates keep the tooltip open');
  unrelated.remove();

  tool.dispatchEvent(new w.Event('pointerleave'));
  assert.equal(d.querySelector('#sui-map-hint').hidden, true);
  assert.equal(map.querySelector('canvas'), canvas);
  map.remove(); d.querySelector('#sui-map-hint').remove();
  added.remove(); nav.remove();
  w.GM_getValue = (key, fallback) => fallback;
  w.GM_setValue = () => {};
  w.GM_registerMenuCommand = () => {};
  w.eval(fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'));
  for (let i=0; i<200 && main.querySelector('.titletext').textContent !== 'Paramètres de la campagne'; i++) await pause(25);
  assert.equal(main.querySelector('.titletext').textContent, 'Paramètres de la campagne');
  assert.equal(input.value, 'Valeur utilisateur');
  button.click(); assert.equal(clicks, 2);
  assert.equal(d.querySelectorAll('#shard-ui-controls').length, 0);
  const liveTracker = d.createElement('aside'); liveTracker.className = 'tourAdventureTracker';
  liveTracker.innerHTML = '<table class="encountertable"><tbody><tr><td>1 <span class="fa-square"></span></td><td><span class="draginfo">Wolf</span></td></tr></tbody></table>';
  const liveMap = d.createElement('section'); liveMap.className = 'tourAdventureMap';
  liveMap.innerHTML = '<div class="maptool"><span class="toolselect"><i class="fa-arrows-alt"></i></span></div><div class="konvajs-content"><canvas></canvas></div>';
  d.body.append(liveTracker, liveMap);
  const liveBox = liveTracker.querySelector('.fa-square');
  liveBox.onclick = () => { liveBox.className = liveBox.classList.contains('fa-check-square') ? 'fa-square' : 'fa-check-square'; };
  const surface = liveMap.querySelector('.konvajs-content'), liveCanvas = liveMap.querySelector('canvas');
  surface.getBoundingClientRect = () => ({left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200});
  const wolfGroup = {cInfo: {tokenType: 'nametoken', number: 1, displayName: 'Wolf'}, isVisible: () => true, getAbsolutePosition: () => ({x: 50, y: 50})};
  w.Konva = {stages: [{container: () => surface, width: () => 200, height: () => 200, find: () => [wolfGroup], getIntersection: () => wolfGroup}]};
  for (let i = 0; i < 80 && liveTracker.querySelector('.draginfo').textContent !== 'Loup'; i++) await pause(25);
  assert.equal(liveTracker.querySelector('.draginfo').textContent, 'Loup', 'Tracker monster translated to French');
  for (const type of ['pointerdown', 'pointerup']) {
    const ev = new w.MouseEvent(type, {bubbles: true, cancelable: true, clientX: 50, clientY: 50, button: 0, shiftKey: true});
    Object.defineProperties(ev, {pointerId: {value: 1}, pointerType: {value: 'mouse'}});
    liveCanvas.dispatchEvent(ev);
  }
  assert.ok(liveBox.classList.contains('fa-check-square'), 'Canvas selection still matches Wolf after French translation');
  console.log('PASS UI: no settings, preserved values/handlers, dynamic accordions, React updates, native navigation, translation coexistence');
} finally { w.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
