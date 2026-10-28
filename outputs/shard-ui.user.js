// ==UserScript==
// @name         Shard Tabletop — Interface Confort
// @namespace    local.shard.ui
// @version      0.6.1
// @description  Fiches, listes et contrôles plus nets, compacts et fidèles à Shard. Sans panneau ni réglages.
// @match        https://play.shardtabletop.com/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  if (document.getElementById('shard-ui-theme')) return;
  const style = document.createElement('style');
  style.id = 'shard-ui-theme';
  // Keep React-owned nodes and game handlers in place. No settings or network requests.
  style.textContent = `
/* Native palette, with theme-relative separators. No global theme replacement. */
body {
  --sui-line: color-mix(in srgb, var(--mainTextColor, #bbb) 24%, transparent);
  --sui-wash: color-mix(in srgb, var(--mainTextColor, #bbb) 6%, transparent);
  --sui-accent: var(--mainHighlightColor, currentColor);
}
/* Keep the original homepage footprint and artwork. */
:is(#tourCharacters, #tourCampaign, #tourLibrary, #tourReference) {
  border-radius: 9px !important;
  box-shadow: 0 2px 8px #0003, inset 0 0 0 1px var(--sui-line) !important;
}
:is(#tourCharacters, #tourCampaign, #tourLibrary, #tourReference) > .titletext {
  box-shadow: 0 1px 0 var(--sui-line);
}
.homepageblock .titleborder { border-color: var(--sui-line); }
#shardheader { box-shadow: 0 1px 0 var(--sui-line), 0 2px 8px #0002; }

/* Common surfaces: rounding without changing padding, width, height or typography. */
:is(.MuiDialog-paper, .MuiMenu-paper, .MuiPopover-paper, .MuiAutocomplete-paper) {
  border-radius: 9px !important;
  box-shadow: 0 12px 36px #0005, 0 0 0 1px var(--sui-line) !important;
}
.darkT .MuiDialog-paper { --mainTextColor: #d9ddda; --lightMainTextColor: #adb5b1; }
.MuiDialogTitle-root { box-shadow: 0 1px 0 var(--sui-line); }
.MuiDialogActions-root { box-shadow: 0 -1px 0 var(--sui-line); }
.MuiButton-root { border-radius: 5px !important; }
.MuiButton-outlined:not(.Mui-disabled):hover { box-shadow: inset 0 0 0 1px currentColor; }
.MuiInput-root:not(.Mui-disabled) { background-color: var(--sui-wash); border-radius: 4px 4px 0 0; }
.MuiInput-root.Mui-focused { background-color: color-mix(in srgb, var(--sui-accent) 10%, transparent); }
.MuiOutlinedInput-root { border-radius: 5px !important; }
.MuiMenuItem-root:not(.Mui-disabled):hover { box-shadow: inset 3px 0 var(--sui-accent); }
.MuiMenuItem-root.Mui-selected { box-shadow: inset 3px 0 var(--sui-accent); }
:is(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--sui-accent) !important; outline-offset: 2px;
}

/* Catalogues: retain row height and grouping, distinguish supporting labels. */
.stdlist { border-spacing: 0; }
.stdlist > tbody > tr > td.hoverhighlight {
  box-shadow: inset 0 -1px var(--sui-line);
}
.stdlist > tbody > tr > td.hoverhighlight:hover {
  background-color: var(--hoverhighlightColor) !important;
  box-shadow: inset 3px 0 var(--sui-accent), inset 0 -1px var(--sui-line);
}
.darkT .stdlist :is(.near-black, .gray-90) { color: #b3b9b8 !important; }
.lightT .stdlist :is(.near-black, .gray-90) { color: #555b59 !important; }

/* Character sheets: readable ink, quieter frames, existing grid and sizes. */
.darkT :is(.characterSheet, .characterHeader) {
  --mainTextColor: #e0e3df !important;
  --lightMainTextColor: #b2bab7 !important;
  --tableAltRowColor: rgba(168, 177, 170, .08) !important;
}
.characterSheet {
  --sui-sheet-line: color-mix(in srgb, var(--mainBorderColor, #aaa) 45%, transparent);
  --sui-sheet-wash: color-mix(in srgb, var(--mainTextColor) 7%, var(--mainBackgroundColor));
}
/* Replace ornate border images, including their negative-margin compensation. */
.characterSheet :is(.statBlock, .savingThrows, .skillBlock, .weaponsBlock, .featureBlock,
  .spellBlock, .equipmentBlock, .traitBlock, .currentLogBlock, .attuneBlock,
  .createItemBlock, .companionBlock, .shapeBlock, .profBlock, .descBlock, .logBlock) {
  border: 1px solid var(--sui-sheet-line) !important;
  border-image: none !important; border-radius: 8px !important;
  background: var(--mainBackgroundColor); padding: 5px !important;
  box-shadow: 0 1px 3px #0002;
}
.characterSheet :is(.statBlock, .savingThrows, .skillBlock, .weaponsBlock, .featureBlock,
  .spellBlock, .equipmentBlock, .traitBlock, .currentLogBlock, .attuneBlock,
  .createItemBlock, .companionBlock, .shapeBlock, .profBlock, .descBlock, .logBlock) > div {
  margin: 0 !important; border-radius: 4px !important;
}
.characterSheet :is(.statBlockBorderR, .statBlockBorderL) {
  border-color: var(--sui-sheet-line) !important; border-width: 1px !important;
  margin-top: 0 !important; margin-bottom: 0 !important;
}
.characterSheet :is(.statBlockBorderR, .statBlockBorderL) > div { padding-top: 0 !important; }
.characterSheet .statBlock { font-variant-numeric: tabular-nums; }
.characterSheet .statBlock .titlecolor { color: var(--mainHighlightColor); }
.characterSheet .theader {
  background-color: var(--sui-sheet-wash);
  box-shadow: inset 0 -1px var(--sui-sheet-line);
  color: var(--mainHighlightColor); border-radius: 3px 3px 0 0;
}
.characterSheet :is(.modifier, .score, .savingThrow, .hoverroll) { font-variant-numeric: tabular-nums; }
.characterSheet .abilityScore > div {
  background-image: none !important; background-color: var(--mainBackgroundColor);
  border-radius: 8px; box-shadow: inset 0 0 0 1px var(--sui-sheet-line);
}
.characterSheet .score { box-shadow: inset 0 0 0 1px var(--sui-sheet-line); }
.characterSheet .modifier { font-weight: 700; color: var(--mainTextColor); }
.characterSheet .ability { color: var(--mainHighlightColor); }
.characterSheet .score { background-color: var(--mainBackgroundColor); }
.characterSheet .skillBlock .gray-90 { color: var(--lightMainTextColor) !important; }
.characterSheet .skillBlock .backgroundborder { border-color: var(--sui-sheet-line); }
.characterSheet :is(.hoverroll, .hover-bg-contrast):hover {
  box-shadow: inset 0 0 0 1px var(--sui-sheet-line); border-radius: 3px;
}
.characterSheet :is(.weaponsBlock, .spellBlock, .equipmentBlock) table > tbody > tr:hover > td {
  background-color: var(--hoverhighlightColor);
}
.characterSheet .usageaction > span {
  border-radius: 4px; border-color: var(--sui-sheet-line);
  background: var(--sui-sheet-wash); color: var(--mainTextColor);
}
.characterSheet :is(.weaponsBlock, .spellBlock, .equipmentBlock) a {
  text-decoration-color: var(--sui-sheet-line); text-underline-offset: 2px;
}
.characterSheet :is(.weaponsBlock, .spellBlock, .equipmentBlock) a:hover {
  text-decoration-color: currentColor;
}
/* Native sticky navigation remains functional and at its original height. */
.tourCharacterNav .texttools { border-radius: 6px 6px 0 0; box-shadow: 0 2px 5px #0002; }
.tourCharacterNav td { border-radius: 4px; }
.tourCharacterNav td:hover { box-shadow: inset 0 -2px var(--sui-accent); }
/* GM tracker: compact columns, independent selection and current-turn markers. */
.tourAdventureTracker { background-color: var(--mainBackgroundColor) !important; }
.tourAdventureTracker .encountertable { font-variant-numeric: tabular-nums; }
.tourAdventureTracker .encountertable th {
  font-size: 11px; color: var(--mainTextColor); z-index: 2;
  background: var(--mainBackgroundColor); box-shadow: inset 0 -2px var(--sui-line);
}
.tourAdventureTracker .encountertable td { box-shadow: inset 0 -1px var(--sui-wash); }
.tourAdventureTracker .encountertable td + td { border-color: var(--sui-line); }
.tourAdventureTracker .encountertable :is(th,td):nth-child(n+3) {
  text-align: center; white-space: nowrap;
}
.tourAdventureTracker .encountertable td:nth-child(6) { font-weight: 700; }
.tourAdventureTracker .encountertable td:nth-child(2) { line-height: 1.25; }
.tourAdventureTracker .encountertable td:nth-child(2) .draginfo { font-weight: 600; }
.tourAdventureTracker .encountertable tr:has(.fa-arrow-right) > td {
  background-color: color-mix(in srgb, #62b881 14%, var(--mainBackgroundColor));
}
.tourAdventureTracker .encountertable tr:has(.fa-arrow-right) > td:first-child {
  box-shadow: inset 3px 0 #62b881;
}
.tourAdventureTracker .encountertable tr:has(td:first-child .fa-check-square) > td {
  box-shadow: inset 0 1px var(--mainHighlightColor), inset 0 -1px var(--mainHighlightColor);
}
.tourAdventureTracker .encountertable tbody tr:hover > td {
  background-color: color-mix(in srgb, var(--mainHighlightColor) 12%, var(--mainBackgroundColor));
}
/* Separate borders allow rounded row ends without changing cell spacing. */
.tourAdventureTracker .encountertable { border-collapse: separate; border-spacing: 0; }
.tourAdventureTracker .encountertable tbody tr { background: transparent; }
.tourAdventureTracker .encountertable tbody tr.encountertableeven > td { background-color: var(--tableAltRowColor); }
.tourAdventureTracker .encountertable tbody tr > td:first-child { border-radius: 6px 0 0 6px; }
.tourAdventureTracker .encountertable tbody tr > td:last-child { border-radius: 0 6px 6px 0; }
.tourAdventureTracker .encountertable tbody tr:has(.fa-arrow-right) > td {
  background-color: color-mix(in srgb, #62b881 14%, var(--mainBackgroundColor));
}
.tourAdventureTracker .encountertable tbody tr:hover > td {
  background-color: color-mix(in srgb, var(--mainHighlightColor) 12%, var(--mainBackgroundColor));
}
.tourAdventureTracker .encountertable tbody tr:has(td:first-child .fa-check-square) > td:first-child {
  box-shadow: inset 1px 0 var(--mainHighlightColor), inset 0 1px var(--mainHighlightColor), inset 0 -1px var(--mainHighlightColor);
}
.tourAdventureTracker .encountertable tbody tr:has(td:first-child .fa-check-square) > td:last-child {
  box-shadow: inset -1px 0 var(--mainHighlightColor), inset 0 1px var(--mainHighlightColor), inset 0 -1px var(--mainHighlightColor);
}
.tourAdventureTracker .encountertable tbody tr:has(.fa-arrow-right):has(td:first-child .fa-check-square) > td:first-child {
  box-shadow: inset 3px 0 #62b881, inset 0 1px var(--mainHighlightColor), inset 0 -1px var(--mainHighlightColor);
}
.tourAdventureTracker .encountertable td .hover-bg-contrast { border-radius: 4px; }
.tourAdventureTracker .encountertable .fa-caret-square-down { border-radius: 3px; }
.tourAdventureTracker .encountertable .fa-caret-square-down:hover { outline: 1px solid currentColor; }
.sui-column-label { font: 600 10px/1.2 system-ui; }
.maptool { box-shadow: 0 1px 0 var(--sui-line); }
.maptool > :is(.toolnormal,.toolselect) { border-radius: 5px !important; }
.maptool > .toolselect { box-shadow: inset 0 -2px currentColor, inset 0 0 0 1px var(--sui-line); }
.maptool > .toolnormal:hover { background: var(--hoverhighlightColor); box-shadow: inset 0 0 0 1px var(--mainHighlightColor); }
.maptool .toolhp { font-variant-numeric: tabular-nums; font-weight: 700; }
/* Map overlays stay at Shard's coordinates: never resize or filter the canvas. */
.tourAdventureMap .maptool {
  background: #182026 !important; color: #eee7cd; border-color: #69716f;
}
.tourAdventureMap .maptool.shadow-3 {
  border-radius: 8px !important;
  box-shadow: 0 4px 14px #0009, 0 0 0 1px #eee7cd30 !important;
}
.tourAdventureMap .maptool > :is(.toolnormal,.toolselect,.toolhp) {
  cursor: pointer; position: relative;
}
.tourAdventureMap .maptool > .toolhp {
  background: #eee7cd16; border-radius: 4px; box-shadow: inset 1px 0 #eee7cd40, inset -1px 0 #eee7cd40;
}
.tourAdventureMap .maptool .activebutton {
  border-radius: 4px; box-shadow: inset 0 0 0 1px #eee7cd40;
}
.tourAdventureMap .maptool > :is(.toolnormal,.toolselect):focus-visible {
  outline: 2px solid #eee7cd !important; outline-offset: -2px;
}
body:has(.tourAdventureMap) .MuiPopover-paper:has(.MuiMenuItem-root) {
  border: 1px solid var(--sui-line); max-height: calc(100dvh - 24px);
  scrollbar-width: thin;
}
body:has(.tourAdventureMap) .MuiPopover-paper .MuiMenuItem-root {
  font-size: 14px; min-height: 28px; padding: 5px 12px;
  white-space: normal; line-height: 1.35;
}
body:has(.tourAdventureMap) .MuiPopover-paper .MuiMenuItem-root + .MuiMenuItem-root {
  border-top: 1px solid var(--sui-wash);
}
body:has(.tourAdventureMap) .MuiPopover-paper .MuiMenuItem-root:focus-visible {
  outline: 2px solid var(--mainHighlightColor); outline-offset: -2px;
}
#sui-map-hint {
  position: fixed; z-index: 2147483646; pointer-events: none;
  background: #182026; color: #f1ecd9; border: 1px solid #788078;
  border-radius: 6px; padding: 5px 9px; font: 12px/1.4 system-ui;
  max-width: min(280px,calc(100vw - 16px)); box-shadow: 0 4px 12px #0006;
}
#sui-map-hint[hidden] { display: none; }
/* Compact navigation: one scrollable row, a persistent active-tab marker. */
.tourAdventureTabs .tourTabList {
  flex-wrap: nowrap !important; overflow-x: auto; overflow-y: hidden;
  scrollbar-width: thin; background: var(--mainBackgroundColor);
  box-shadow: inset 0 -1px var(--sui-line);
}
.tourAdventureTabs .tourTabList > div {
  flex: 0 0 auto; padding-inline: 6px; white-space: nowrap; cursor: pointer; border-radius: 5px 5px 0 0;
  color: var(--mainTextColor);
}
.tourAdventureTabs .tourTabList > .defaultbackground {
  top: 0; transform: none; font-weight: 600;
  background: var(--sui-wash); box-shadow: inset 0 -2px var(--mainHighlightColor);
}
.tourAdventureTabs .tourTabList > .hoverhighlight:hover {
  background: var(--sui-wash); box-shadow: inset 0 -2px var(--sui-line);
}
.tourCharacterNav { overflow-x: auto; scrollbar-width: thin; }
.tourCharacterNav td { white-space: nowrap; cursor: pointer; }
.tourAdventureTracker .encountertable td:nth-child(2) {
  word-break: normal; overflow-wrap: anywhere;
}
.tourAdventureTracker .encountertable td:nth-child(2) .draginfo {
  word-break: normal; overflow-wrap: normal;
}
.characterSheet [data-sui-heading]:hover {
  box-shadow: inset 3px 0 var(--mainHighlightColor), inset 0 -1px var(--sui-sheet-line);
}
.characterSheet [data-sui-heading]:focus-within {
  outline: 1px solid var(--mainHighlightColor); outline-offset: -1px;
}
.characterSheet :is(.equipmentBlock, .spellBlock, .weaponsBlock) td {
  font-variant-numeric: tabular-nums;
}
.MuiMenuItem-root.Mui-disabled { box-shadow: none; }
/* Visible, theme-aware scroll handles; no invisible scrollbars or layout animation. */
:is(.MuiDialogContent-root, .overflow-y-auto, .overflow-x-auto, .overflow-auto) {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--mainHighlightColor, #aaa) 55%, transparent) transparent;
}
:is(.MuiDialogContent-root, .overflow-y-auto, .overflow-x-auto, .overflow-auto)::-webkit-scrollbar { width: 9px; height: 9px; }
:is(.MuiDialogContent-root, .overflow-y-auto, .overflow-x-auto, .overflow-auto)::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--mainHighlightColor, #aaa) 55%, transparent);
  border: 2px solid transparent; background-clip: padding-box; border-radius: 8px;
}
:is(.MuiDialogContent-root, .overflow-y-auto, .overflow-x-auto, .overflow-auto)::-webkit-scrollbar-thumb:hover {
  background-color: var(--mainHighlightColor, #aaa);
}
:is(.MuiDialogContent-root, .overflow-y-auto, .overflow-x-auto, .overflow-auto)::-webkit-scrollbar-corner { background: transparent; }
/* Distinguish sections from column labels without taller rows. */
.characterSheet .theader { box-shadow: inset 3px 0 var(--sui-sheet-line), inset 0 -1px var(--sui-sheet-line); }
.characterSheet :is(.spellBlock, .equipmentBlock) tr > td[colspan] {
  box-shadow: inset 0 -1px var(--sui-sheet-line);
}
.characterSheet .usageaction { cursor: pointer; }
.characterSheet .usageaction:hover > span {
  background: var(--mainHighlightColor); color: var(--mainBackgroundColor);
}
.characterSheet .featureBlock :is(.fa-minus-square, .fa-plus-square) {
  border-radius: 4px; box-shadow: inset 0 0 0 1px var(--sui-sheet-line);
}
.characterSheet [data-sui-heading] { position: relative; padding-inline: 4px 23px; min-height: 18px; cursor: pointer; }
button.sui-fold {
  position: absolute; inset-inline-end: 1px; top: 0; width: 20px; height: 18px;
  padding: 0; border: 0; border-radius: 3px; font: 14px/18px system-ui;
  background: transparent; color: inherit; cursor: pointer;
}
button.sui-fold:hover { background: var(--hoverhighlightColor); box-shadow: inset 0 0 0 1px var(--sui-sheet-line); }
[data-sui-folded] > :not([data-sui-heading]) { display: none !important; }
@media (forced-colors: active) {
  button.sui-fold { border: 1px solid ButtonText; }
}
@media print {
  [data-sui-folded] > :not([data-sui-heading]) { display: revert !important; }
  .sui-fold { display: none !important; }
  .characterSheet :is(.statBlock, .savingThrows, .skillBlock, .weaponsBlock, .featureBlock,
    .spellBlock, .equipmentBlock, .traitBlock) { box-shadow: none; }
}
`;
  document.head.append(style);

  // Limit enhancement to known, simple sections. Native feature accordions stay native.
  const sections = [
    ['skillBlock', 'compétences'],
    ['spellBlock', 'sorts'],
    ['equipmentBlock', 'équipement'],
    ['traitBlock', 'traits'],
    ['tourCharacterWeapons', 'armes et armures']
  ];
  const selector = sections.map(([cls]) => '.characterSheet .' + cls).join(',');
  const states = new WeakMap();
  const boundHeadings = new WeakSet();
  function expand(block, open) {
    const body = block.firstElementChild;
    if (!body) return;
    states.set(block, open);
    body.toggleAttribute('data-sui-folded', !open);
    const button = body.querySelector(':scope > [data-sui-heading] > .sui-fold');
    if (button) {
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? '▾' : '▸';
      button.setAttribute('aria-label', (open ? 'Replier : ' : 'Déplier : ') + button.dataset.section);
      button.title = button.getAttribute('aria-label');
    }
  }
  function enhance(block) {
    const body = block.firstElementChild;
    const heading = body?.firstElementChild;
    if (!heading?.matches('.theader') || !heading.nextElementSibling) return;
    if (heading.querySelector('.sui-fold, .fa-minus-square, .fa-plus-square, [aria-expanded]')) return;
    const spec = sections.find(([cls]) => block.classList.contains(cls));
    if (!spec) return;
    heading.setAttribute('data-sui-heading', '');
    const button = document.createElement('button');
    button.className = 'sui-fold'; button.type = 'button';
    button.dataset.section = spec[1];
    button.setAttribute('data-shard-fr-ignore', '');
    // Preserve native headings, selectors and Add/Pick buttons in their original position.
    heading.append(button);
    button.addEventListener('click', event => {
      event.stopPropagation();
      expand(block, button.getAttribute('aria-expanded') !== 'true');
    });
    if (!boundHeadings.has(heading)) {
      boundHeadings.add(heading);
      heading.addEventListener('click', event => {
        // Nested controls retain their own actions, including Material UI selectors.
        if (event.defaultPrevented || event.target.closest('button, a, input, select, textarea, label, [role="button"], [role="combobox"], [contenteditable], .MuiFormControl-root, .hoverroll, .dodieroll')) return;
        // Selecting a heading's text should not collapse its contents.
        if (window.getSelection()?.toString()) return;
        event.stopPropagation();
        expand(block, states.get(block) === false);
      });
    }
    expand(block, states.get(block) !== false);
  }
  function enhanceTracker(root) {
    const tables = root.matches?.('.tourAdventureTracker .encountertable') ? [root] : [];
    tables.push(...root.querySelectorAll('.tourAdventureTracker .encountertable'));
    for (const table of tables) {
      const labels = [['fa-low-vision', 'PP', 'Perception passive'], ['fa-shield-alt', 'CA', 'Classe d’armure'], ['fa-heart', 'PV', 'Points de vie'], ['fa-fist-raised', 'Init.', 'Initiative']];
      for (const [icon, label, full] of labels) {
        const original = table.querySelector('thead .' + icon);
        const cell = original?.closest('th');
        if (!cell || cell.querySelector('.sui-column-label')) continue;
        // Keep the original icon and any native handlers; overlay a readable label.
        original.style.display = 'none';
        const text = document.createElement('span');
        text.className = 'sui-column-label'; text.textContent = label;
        text.title = full; text.setAttribute('aria-label', full);
        text.setAttribute('data-shard-fr-ignore', '');
        cell.append(text);
      }
    }
  }
  const mapControls = new WeakSet();
  let hint, hintOwner;
  function hideMapHint() {
    if (hint) hint.hidden = true;
    if (hintOwner) {
      const ids = (hintOwner.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== 'sui-map-hint');
      if (ids.length) hintOwner.setAttribute('aria-describedby', ids.join(' '));
      else hintOwner.removeAttribute('aria-describedby');
      hintOwner = null;
    }
  }
  function enhanceMap(root) {
    const bars = root.matches?.('.tourAdventureMap .maptool') ? [root] : [];
    bars.push(...root.querySelectorAll('.tourAdventureMap .maptool'));
    for (const bar of bars) for (const control of bar.children) {
      if (!control.matches('.toolnormal,.toolselect,.toolhp') || mapControls.has(control)) continue;
      const nativeTitle = control.querySelector('[title]')?.getAttribute('title');
      if (!nativeTitle) continue; // No guessed command names.
      mapControls.add(control);
      if (!control.hasAttribute('tabindex')) control.tabIndex = 0;
      if (!control.hasAttribute('role')) control.setAttribute('role', 'button');
      if (!control.hasAttribute('aria-label')) control.setAttribute('aria-label', nativeTitle);
      function show() {
        hideMapHint();
        if (!hint) {
          hint = document.createElement('div'); hint.id = 'sui-map-hint';
          hint.setAttribute('data-shard-fr-ignore', ''); hint.setAttribute('role', 'tooltip');
          document.body.append(hint);
        }
        hint.textContent = control.querySelector('[title]')?.getAttribute('title') || control.getAttribute('aria-label');
        control.setAttribute('aria-label', hint.textContent);
        hintOwner = control;
        const ids = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        ids.add('sui-map-hint'); control.setAttribute('aria-describedby', [...ids].join(' '));
        hint.hidden = false;
        const r = control.getBoundingClientRect(), h = hint.getBoundingClientRect();
        hint.style.left = Math.max(8, Math.min(r.left, innerWidth - h.width - 8)) + 'px';
        hint.style.top = (r.bottom + h.height + 12 < innerHeight ? r.bottom + 6 : Math.max(8, r.top - h.height - 6)) + 'px';
      }
      control.addEventListener('pointerenter', show);
      control.addEventListener('pointerleave', hideMapHint);
      control.addEventListener('focus', show);
      control.addEventListener('blur', hideMapHint);
      control.addEventListener('click', hideMapHint);
      control.addEventListener('keydown', event => {
        if (event.target !== control) return;
        if (event.key === 'Escape') { hideMapHint(); return; }
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
          event.preventDefault(); event.stopPropagation(); control.click();
        }
      });
    }
  }
  // Shard draws token outlines in Konva, not the DOM. Limit this adapter to
  // portrait-token groups and the unfilled rectangles generated by genRects.
  let tokenOutlinesInstalled = false;
  function installTokenOutlines() {
    const K = window.Konva;
    if (tokenOutlinesInstalled || !K?.Group?.prototype?.add || !K.stages) return;
    tokenOutlinesInstalled = true;
    function round(group, node) {
      if (group.cInfo?.tokenType !== 'nametoken') return;
      const container = group.getStage()?.container();
      if (!container?.closest('.tourAdventureMap')) return;
      const a = node?.attrs;
      const kind = node?.getClassName?.();
      if (kind !== 'Rect') return;
      if (!a || a.fill || !a.stroke || a.cornerRadius || !(a.width > 0) ||
          Math.abs(a.height - a.width - 10) > 0.01 ||
          Math.abs(a.offsetX - a.width / 2) > 0.01 || a.offsetY !== a.offsetX) return;
      node.cornerRadius(Math.min(a.width, a.height) * 0.22);
    }
    const originalAdd = K.Group.prototype.add;
    K.Group.prototype.add = function (...nodes) {
      for (const node of nodes) round(this, node);
      return originalAdd.apply(this, nodes);
    };
    // Also update outlines already drawn before the userscript started.
    for (const stage of K.stages) {
      if (!stage.container()?.closest('.tourAdventureMap')) continue;
      for (const group of stage.find('Group')) {
        for (const node of group.getChildren()) round(group, node);
      }
      stage.batchDraw();
    }
  }
  function scan(root) {
    if (root.nodeType !== 1 && root !== document) return;
    installTokenOutlines();
    enhanceTracker(root);
    enhanceMap(root);
    if (root.matches?.(selector)) enhance(root);
    root.querySelectorAll(selector).forEach(enhance);
  }
  scan(document);
  window.addEventListener('resize', hideMapHint);
  document.addEventListener('scroll', hideMapHint, true);
  // A single batch per frame, only for changed element subtrees; text updates cost no scans.
  const pending = new Set();
  let frame = 0;
  function flush() {
    frame = 0;
    if (hintOwner && !hintOwner.isConnected) hideMapHint();
    const roots = [...pending]; pending.clear();
    for (const root of roots) {
      if (!root.isConnected || roots.some(other => other !== root && other.contains(root))) continue;
      scan(root);
    }
  }
  const observer = new MutationObserver(records => {
    if (hintOwner && !hintOwner.isConnected) hideMapHint();
    for (const record of records) {
      const elements = [...record.addedNodes].filter(node => node.nodeType === 1 && !node.matches('.sui-fold, .sui-column-label, #sui-map-hint'));
      for (const node of elements) pending.add(node);
      // React may replace the heading while leaving the section itself mounted.
      if (elements.length || [...record.removedNodes].some(node => node.nodeType === 1 && node.matches('.sui-fold, [data-sui-heading]'))) {
        const block = record.target.closest?.(selector);
        if (block) pending.add(block);
        const tracker = record.target.closest?.('.tourAdventureTracker .encountertable');
        if (tracker) pending.add(tracker);
        const mapbar = record.target.closest?.('.tourAdventureMap .maptool');
        if (mapbar) pending.add(mapbar);
      }
    }
    if (pending.size && !frame) frame = requestAnimationFrame(flush);
  });
  observer.observe(document.body, {subtree: true, childList: true});
  // Open sections before Shard's own navigation calculates its scroll destination.
  document.addEventListener('click', event => {
    const nav = event.target.closest?.('.tourCharacterNav');
    if (!nav) return;
    const sheet = nav.parentElement.querySelector('.characterSheet');
    sheet?.querySelectorAll('[data-sui-folded]').forEach(body => expand(body.parentElement, true));
  }, true);
})();