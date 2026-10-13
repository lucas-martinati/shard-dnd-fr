/* Traduction d’affichage locale ; index et fiches publiques AideDD via GM_xmlhttpRequest. */
(() => {
  'use strict';
  const KEY = 'shard-fr-v1';
  const normalize = s => String(s).normalize('NFC').replace(/[’‘ʼ]/g, "'").replace(/[‐‑–]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
  const searchKey=s=>normalize(s).normalize('NFD').replace(/\p{M}/gu,'').replace(/œ/g,'oe').replace(/æ/g,'ae');
  const escapeRE = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = s => escapeRE(s).replace(/'/g, "['’‘ʼ]").replace(/ /g, '\\s+').replace(/-/g, '[-‐‑–]');
  const parse = raw => raw.trim().split('\n').map(line => { const i = line.indexOf('|'); return [line.slice(0,i), line.slice(i+1)]; });
  let settings;
  try { settings = JSON.parse(GM_getValue(KEY, '{}')); } catch { settings = {}; }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) settings = {};
  let enabled = settings.enabled !== false;
  let bilingual = settings.bilingual === true;
  const searchAssist=true, custom={};
  const aideddNames=true, aideddOnline=true, aideddInline=true;
  let showButton=settings.showButton!==false;
  const positions=['top-left','top-right','bottom-left','bottom-right'];
  let buttonPosition=positions.includes(settings.buttonPosition)?settings.buttonPosition:'top-right';
  const AIDEDD_CACHE_KEY='shard-fr-aidedd-v1';
  const AIDEDD_LABELS={spell:'sort',monster:'monstre',feat:'don',invocation:'manifestation','magic-item':'objet magique'};
  let aideddCache={};
  try {aideddCache=JSON.parse(GM_getValue(AIDEDD_CACHE_KEY,'{}'));}catch{}
  if(!aideddCache || typeof aideddCache!=='object')aideddCache={};
  const validRows=rows=>Array.isArray(rows)&&rows.length>=1000&&rows.length<10000&&rows.every(r=>r&&typeof r.en==='string'&&r.en.length>0&&r.en.length<=150&&typeof r.fr==='string'&&r.fr.length>0&&r.fr.length<=180&&aideddURL(r.url,r.kind));
  let aideddRows=validRows(aideddCache.rows)?aideddCache.rows:AIDEDD_CATALOG;
  let entries, tokenRE, phraseRE, names, customKeys, effectiveMeta, aideddIndex;
  const bundledIndex=new Map(AIDEDD_CATALOG.map(row=>[normalize(row.en)+'|'+row.kind,row]));
  const legacyIndex=new Map();
  for(const row of LEGACY_CATALOG){
    const key=normalize(row.en);
    if(!legacyIndex.has(key))legacyIndex.set(key,[]);
    legacyIndex.get(key).push(row);
  }
  let referenceIndex=new Map(),referenceSearchRows=[];
  function termMeta(key){return effectiveMeta[key]||TERM_META[key]||{};}

  const tokenState = new WeakMap();
  const attrState = new WeakMap();
  let revision = 0;
  function compile() {
    aideddIndex=new Map();
    for(const row of aideddRows){const key=normalize(row.en);if(!aideddIndex.has(key))aideddIndex.set(key,[]);aideddIndex.get(key).push(row);}
    entries = new Map();
    customKeys = new Set(Object.keys(custom).map(normalize));
    for (const data of [MONSTERS, SPELLS, TERMS, EQUIPMENT, INTERFACE, RULES2024, MAGICITEMS, GM, EXPANSION, DESCRIPTIONS, DRUID, CREATION, CANONICAL_SPELLS, CANONICAL_FEATURES, CANONICAL_COMBAT, COMBAT_DESCRIPTIONS, FEATURE_TERMS]) {
      for (const [en,fr] of parse(data)) entries.set(normalize(en), {en,fr});
    }
    effectiveMeta={...TERM_META};
    if(aideddNames)for(const row of aideddRows){
      const key=normalize(row.en),previous=entries.get(key),old=effectiveMeta[key]||{};
      const bundled=bundledIndex.get(key+'|'+row.kind);
      const aliases=[...new Set([...(old.aliases||[]),...(bundled?.aliases||[]),...(bundled?[bundled.fr]:[]),...(Array.isArray(row.aliases)?row.aliases:[]),...(previous?[previous.fr]:[])])].filter(a=>a!==row.fr);
      effectiveMeta[key]={source:'AideDD · index 2024',category:AIDEDD_LABELS[row.kind],aliases,url:row.url};
      entries.set(key,{en:row.en,fr:row.fr});
    }
    for (const [en,fr] of Object.entries(custom)) {
      if (en.trim() && typeof fr === 'string') entries.set(normalize(en), {en,fr});
    }
    names = new Set([SPELLS, CANONICAL_SPELLS, MONSTERS, MAGICITEMS, EQUIPMENT].flatMap(data => parse(data).map(([en]) => normalize(en))));
    if(aideddNames)for(const row of aideddRows)names.add(normalize(row.en));
    const keys = [...entries.keys()].sort((a,b) => b.length-a.length);
    // Un seul remplacement par passe : aucun remplacement récursif du français produit.
    tokenRE = new RegExp('(?<![\\p{L}\\p{N}_])(?:' + keys.map(pattern).join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');
    // Dans une phrase inconnue, ne traduire que les groupes de mots D&D explicites.
    const explicitNames = new Set([SPELLS,CANONICAL_SPELLS].flatMap(data=>parse(data).map(([en])=>normalize(en))));
    if(aideddNames)for(const row of aideddRows)if(row.kind==='spell')explicitNames.add(normalize(row.en));
    // Les mots courants anglais pouvant aussi désigner un sort restent ambigus en prose.
    const ambiguous = new Set(['light','aid','alarm','command','friends','jump','sleep','fear','darkness','web','daylight','silence','message','wish','gate','hex','detect','move','charge']);
    const proseKeys = keys.filter(k => k === 'hit:' || (explicitNames.has(k) && !ambiguous.has(k)) || (k.includes(' ') && (k.length > 30 || !/^(pick |select |add |remove |new |set |show |at |per )/.test(k))));
    phraseRE = new RegExp('(?<![\\p{L}\\p{N}_])(?:' + proseKeys.map(pattern).join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');
    referenceIndex=new Map();
    referenceSearchRows=aideddRows.map(row=>{
      const labels=[...new Set([row.en,row.fr,...(row.aliases||[]),...(termMeta(normalize(row.en)).aliases||[])].map(searchKey))];
      for(const label of labels){
        if(!referenceIndex.has(label))referenceIndex.set(label,[]);
        referenceIndex.get(label).push(row);
      }
      return {row,labels};
    });
    revision++;
  }
  const referenceByEnglish = new Map(SPELL_REFERENCE.map(r=>[normalize(r.en),r]));
  for (const [alias,canonical] of Object.entries(REFERENCE_ALIASES)) {
    const ref=referenceByEnglish.get(normalize(canonical));if(ref)referenceByEnglish.set(normalize(alias),ref);
  }
  const referenceBodies = new Map(SPELL_REFERENCE.map(r=>[normalize(r.englishBody),r.frenchBody]));
  const ordinal = n => n === '1' ? '1er' : n+'e';
  function preserveFeet(source,french){
    // Remettre les distances attestées dans le texte anglais, sans toucher aux dés
    // ni convertir les valeurs de la fiche. Aucun rapprochement approximatif de règles.
    const lengths=[...String(source).matchAll(/\b(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)\+?\s*-?\s*(feet|foot|ft\.?|inches|inch|miles?)(?![a-z])/gi)].flatMap(m=>m[1].split('/').map(Number).map(value=>({value,unit:/^in/i.test(m[2])?'inch':/^mi/i.test(m[2])?'mile':'foot'})));
    if(!lengths.length)return french;
    return french.replace(/\b(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*(centimètres?|cm|kilomètres?|kilometers?|km|mètres?|meters?|m)(?![\p{L}\d²³]|\s+(?:carr|cub))/giu,(whole,values,unit)=>{
      const scale=/^(?:c|cent)/i.test(unit)?100:/^k/i.test(unit)?0.001:1, converted=[];
      for(const raw of values.split('/')){
        const value=Number(raw.trim().replace(',','.'));
        const rates={foot:[0.3,0.3048],inch:[0.025,0.0254],mile:[1500,1609.344]};
        const tolerance=scale===100?0.011:0.011*scale;
        const matches=[...new Map(lengths.filter(length=>rates[length.unit].some(rate=>Math.abs(length.value*rate*scale-value)<tolerance)).map(length=>[length.value+' '+length.unit,length])).values()];
        if(matches.length!==1)return whole;converted.push(matches[0]);
      }
      if(converted.some(length=>length.unit!==converted[0].unit))return whole;
      const kind=converted[0].unit,singular=converted.length===1&&converted[0].value===1;
      return converted.map(length=>length.value).join('/')+' '+(singular?kind:kind==='foot'?'feet':kind==='inch'?'inches':'miles');
    });
  }
  const weaponMasteryContext=text=>/(?:\bmastery\b|bottes? d.armes?|propriétés? (?:de )?botte|this weapon|cette arme|slashing|piercing|bludgeoning|tranchant|perforant|contondant|two-handed|à deux mains)/i.test(text);
  function translate(source, context = source) {
    if (!enabled || !source.trim() || source.length > 50000) return source;
    const originalSource=source;
    const exact = entries.get(normalize(source));
    const complete=lookupPair(inlineKey(source));
    if(complete&&!customKeys.has(normalize(source)))return preserveFeet(source,complete);
    const fullDescription=referenceBodies.get(normalize(source));
    if (fullDescription && !customKeys.has(normalize(source))) return preserveFeet(source,fullDescription);
    const output = (entry, matched, allowBilingual) => {
      const key = normalize(matched);
      if (!customKeys.has(key)) {
        if(aideddNames && ['tough','piercer'].includes(key)){
          const choices=aideddChoices(key);
          const monster=/(?:monster|encounter|combat)/i.test(location.hash)||/(?:Hit Points|Challenge|Armor Class|Points de vie|FP \d)/i.test(context);
          const row=choices.find(r=>r.kind===(monster?'monster':'feat'));if(row)entry=row;
        }
        if (key === 'light' && /(?:slashing|piercing|bludgeoning|tranchant|perforant|contondant|armor|armure|finesse|two-handed|à deux mains|light weapon|arme légère)/i.test(context)) return 'Légère';
        if (key === 'slow' && weaponMasteryContext(context)) return 'Ralentissement';
        if (key === 'versatile' && weaponMasteryContext(context)) return 'Polyvalente';
        if (key === 'save' && /\b(?:STR|DEX|CON|INT|WIS|CHA|FOR|SAG)\s*(?:DC|DD|[0-9])/i.test(context)) return 'Sauvegarde';
      }
      if (entry.fr === entry.en) return /^[A-Z]{2,4}$/.test(entry.fr) ? entry.fr : matched;
      return entry.fr + (allowBilingual && bilingual && names.has(normalize(matched)) && normalize(entry.fr) !== normalize(matched) ? ` (${entry.en})` : '');
    };
    if (exact) return source.match(/^\s*/)[0] + output(exact, source.trim(), true) + source.match(/\s*$/)[0];
    const cast=/^Cast\s+(?:Level\s+)?([1-9])(?:st|nd|rd|th)?(?:[- ]level)?\s+Spell\s*:\s*(.+)$/i.exec(source.trim());
    if(cast)return `Lancer le sort de niveau ${cast[1]} : ${translate(cast[2])}`;
    source = source.replace(/\bCast\s+(?:Level\s+)?([1-9])(?:st|nd|rd|th)?(?:[- ]level)?\s+Spell\s*:/gi, (_,n) => `Lancer le sort de niveau ${n} :`).replace(/\b([1-9])(?:st|nd|rd|th)[-\s]level\b/gi, (_,n) => `Niveau ${n}`).replace(/\bDC(?=\d)/g, 'DD');
    // Reconnaître les lignes de statistiques uniquement si tous les mots sont connus.
    const residual = source.replace(tokenRE, '').replace(/\b(?:Niveau|DD\d+)\b/g, '').replace(/\b\d+(?:st|nd|rd|th)(?:[-\s]level)?\b/gi, '').replace(/\b\d*(?:ft|feet|foot|lb|lbs|d\d+)\b\.?/gi, '').replace(/\b(?:C|L|V|S|M)\b/g, '').replace(/[^\p{L}]/gu, '');
    const structured = source.length < 450 && residual.length === 0;
    // Une phrase inconnue reste entière en anglais. Ne jamais produire un mélange de langues.
    if(!structured){
      const duration=translateDuration(source);if(duration!==null)return duration;
      const covered=source.replace(phraseRE,'').replace(/[^\p{L}]/gu,'');
      if(covered)return originalSource;
    }
    const matcher = structured ? tokenRE : phraseRE;
    // Conserver les chiffres et les unités de jeu ; ft et lb ne sont pas convertis.
    const segments = [];
    let last = 0;
    source.replace(matcher, (match, offset) => {
      if (offset > last) segments.push({text:source.slice(last,offset), original:true});
      segments.push({text:output(entries.get(normalize(match)),match,structured), original:false});
      last=offset+match.length;
      return match;
    });
    segments.push({text:source.slice(last), original:true});
    return segments.map(s => !s.original ? s.text : s.text
      .replace(/\b([1-9])(?:st|nd|rd|th)[-\s]level\b/gi, (_, n) => `Niveau ${n}`)
      .replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, (whole,n) => structured ? ordinal(n) : whole)
    ).join('');
  }
  compile();

  const SKIP = 'script,style,noscript,template,textarea,input,code,pre,kbd,samp,svg,canvas,iframe,[contenteditable]:not([contenteditable="false"]),[role="textbox"],.ql-editor,.ProseMirror,.CodeMirror,.monaco-editor,[data-shard-fr-ignore]';
  const ATTRS = ['title','aria-label','placeholder','alt'];
  function excluded(el) {
    return !el || !!el.closest(SKIP) || el.isContentEditable || (el.tagName === 'OPTION' && !el.hasAttribute('value'));
  }
  function processText(node) {
    if(maintainInline(node))return;
    if(node.parentElement?.closest('p,li,td,th,.description,.pre-wrap,.stdcontent')){let el=node.parentElement;for(let depth=0;el&&depth<3;depth++,el=el.parentElement){processInline(el);if(maintainInline(node))return;}}
    if (!node.isConnected || excluded(node.parentElement)) return;
    const current = node.data;
    const prev = tokenState.get(node);
    if (prev && current === prev.output && prev.revision === revision && prev.enabled === enabled && prev.bilingual === bilingual) return;
    const original = prev && current === prev.output ? prev.original : current;
    // Contexte court seulement : ne pas confondre le sort Lumière avec une propriété d’arme.
    let context = original;
    if (/\b(light|slow|save|tough|piercer|versatile)\b/i.test(original) && original.length < 100) {
      let el=node.parentElement;
      for (let depth=0; el && depth<(/\bslow\b/i.test(original)?4:3); depth++,el=el.parentElement) {
        if (el.textContent.length > (/\bslow\b/i.test(original)?600:240) || el.matches('button,[role="button"]')) break;
        context=el.textContent;
        if(/\bslow\b/i.test(original)&&el.matches('article,[role="dialog"],tr,.stdcontent'))break;
      }
    }
    if(processSplitLabel(node))return;
    discoverInline(node,original);
    // Une cellule est un bloc autonome, même dans un tableau de description.
    let prose=node.parentElement.closest('p,li,td,th,.description,.pre-wrap');
    if(!prose){
      const local=node.parentElement.closest('div');
      // Un conteneur de fiche n’est pas un paragraphe : ses titres, tableaux
      // et contrôles se traduisent indépendamment des descriptions voisines.
      if(local&&!local.querySelector('div,p,li,table,h1,h2,h3,input,button,.description,.pre-wrap'))prose=local;
    }
    if(node.parentElement.closest('h1,h2,h3,[role="heading"],.titletext,button'))prose=null;
    const proseText=prose?blockEnglish(prose):'';
    const fragments=proseText.match(/\b(?:the|you|your|a|an|can|must|within|that|of|is|to|and|or|for|with)\b/gi)||[];
    const partialProse=fragments.length>=3 && proseText.length>35 && proseText.length<6000 && inlineKey(proseText)!==inlineKey(original) && !completePairs.has(inlineKey(proseText));
    const translated=partialProse&&!completePairs.has(inlineKey(original))&&!customKeys.has(normalize(original))?original:translate(original,context);
    tokenState.set(node,{original,output:translated,revision,enabled,bilingual});
    if (translated !== current) node.data = translated;
  }
  function processSplitLabel(node){
    if(!enabled)return false;
    const parent=node.parentElement;
    if(!parent||excluded(parent)||parent.childNodes.length>8||parent.children.length)return false;
    // Seuls les nœuds texte adjacents d’un même libellé exact sont regroupés.
    const nodes=[...parent.childNodes].filter(n=>n.nodeType===3);
    if(nodes.length<2)return false;
    const source=nodes.map(originalNode).join('');
    if(source.length>100||!entries.has(normalize(source)))return false;
    const translated=translate(source);
    for(let i=0;i<nodes.length;i++){
      const item=nodes[i],original=originalNode(item),output=i===0?translated:'';
      tokenState.set(item,{original,output,revision,enabled,bilingual});
      if(item.data!==output)item.data=output;
    }
    return true;
  }
  function processAttrs(el) {
    if (!el.isConnected || el.closest('[data-shard-fr-ignore],script,style,iframe,svg')) return;
    let states = attrState.get(el);
    if (!states) { states = new Map(); attrState.set(el,states); }
    for (const key of ATTRS) {
      const current = el.getAttribute(key);
      if (current === null) { states.delete(key); continue; }
      const prev = states.get(key);
      const original = prev && current === prev.output ? prev.original : current;
      const translated = translate(original);
      states.set(key,{original,output:translated});
      if (translated !== current) el.setAttribute(key,translated);
    }
  }
  function* scan(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE) { discoverRegion(root);processText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    discoverRegion(root);
    processAttrs(root);
    processInline(root);
    if (excluded(root)) return;
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,{
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && excluded(node)) {
          // Les attributs des champs sont traduisibles, jamais leurs valeurs.
          processAttrs(node);
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node=walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) processText(node);
      else {if(node.matches('article,[role="dialog"],.pre-wrap,.stdcontent,.description'))discoverRegion(node);processAttrs(node);processInline(node);}
      yield;
    }
  }
  const pending = new Set();
  let scheduled = false;
  let active = null;
  function queue(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === 1 && root.closest('[data-shard-fr-ignore]')) return;
    if (root.nodeType === 3 && root.parentElement?.closest('[data-shard-fr-ignore]')) return;
    if (pending.has(document.body)) return;
    if (root === document.body) pending.clear();
    pending.add(root);
    if (!scheduled) { scheduled=true; setTimeout(flush,30); }
  }
  function flush() {
    for(const record of [...inlineBlocks])if(!record.el.isConnected)releaseInline(record);
    const start=performance.now();
    while (performance.now()-start < 9) {
      if (!active) {
        const root=pending.values().next().value;
        if (!root) break;
        pending.delete(root);
        active=scan(root);
      }
      if (active.next().done) active=null;
    }
    if (active || pending.size) setTimeout(flush,16);
    else scheduled=false;
  }
  function restore(root) {
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while ((node=walker.nextNode())) {
      const state=tokenState.get(node);
      if (state && node.data===state.output && state.output!==state.original) node.data=state.original;
      tokenState.delete(node);
    }
  }
  const observer=new MutationObserver(records => {
    for(const record of [...inlineBlocks])if(!record.items.every(i=>i.node.isConnected&&record.el.contains(i.node)&&i.node.data===i.output))releaseInline(record);
    for (const r of records) {
      if (r.type==='characterData') {
        const previous=tokenState.get(r.target);
        if (!previous || r.target.data!==previous.output) queue(r.target);
      } else if (r.type==='childList') {
        for (const n of r.addedNodes) queue(n);
      } else if (r.attributeName==='contenteditable') {
        if (excluded(r.target)) restore(r.target);
        else queue(r.target);
      } else {
        const state=attrState.get(r.target)?.get(r.attributeName);
        if (!state || r.target.getAttribute(r.attributeName)!==state.output) queue(r.target);
      }
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...ATTRS,'contenteditable']});
  document.addEventListener('focusin',event => {
    const el=event.target;
    if (el instanceof Element && (el.isContentEditable || el.matches('[role="textbox"]'))) restore(el);
  },true);
  document.addEventListener('focusout',event => queue(event.target),true);
  window.addEventListener('hashchange',()=>queue(document.body));

  const host=document.createElement('div');
  host.setAttribute('data-shard-fr-ignore','');
  host.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;';
  const shadow=host.attachShadow({mode:'open'});
  const style=document.createElement('style');
  style.textContent=`:host{font:14px/1.5 system-ui,sans-serif;color:#e8edf4;color-scheme:dark}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer;background:#263751;color:#fff;border:1px solid #607492;border-radius:8px;padding:9px 12px}button:hover{background:#3a5171}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #81ceff;outline-offset:3px}#badge{background:#19384c;font-weight:700;box-shadow:0 3px 16px #0006}#panel{background:#131e2d;border:1px solid #64758f;border-radius:16px;padding:20px;width:min(400px,calc(100vw - 32px));max-height:80vh;overflow:auto;box-shadow:0 6px 30px #0008;margin:8px 0}h2{font-size:18px;margin:20px 0 12px}p{margin:8px 0}label{display:block;margin:12px 0}input[type=search],select{width:100%;background:#0c1420;color:#fff;border:1px solid #64758f;border-radius:8px;padding:10px}input[type=checkbox]{accent-color:#57cda6;width:18px;height:18px;flex-shrink:0}.primary{margin:0;padding:15px;background:#123d37;border:1px solid #53b49a;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:18px;font-weight:700}.secondary{display:flex;align-items:flex-start;gap:10px}.secondary span{flex:1}small{color:#becbdb;font-size:12px}.row{display:flex;gap:8px;margin:12px 0}.row input{min-width:0;flex:1}.result{display:block;border:1px solid #34435a;border-radius:8px;padding:10px;margin:7px 0;color:#e8edf4;text-decoration:none}.result:hover{background:#263751}.result small{display:block}#searchStatus{color:#b5d9ea}footer{display:flex;justify-content:flex-end;margin-top:16px}[hidden]{display:none!important}`;
  shadow.append(style);
  const panel=document.createElement('section'); panel.id='panel'; panel.hidden=true; panel.setAttribute('aria-label','Traduction D&D en français');
  // Cette interface est créée une fois, à l’écart du DOM géré par Shard.
  panel.innerHTML=`<label class="primary"><span id="enabledLabel">Traduction activée</span><input id="enabled" type="checkbox" role="switch" aria-label="Activer la traduction"></label><h2>D&D FR · Configuration</h2><label class="secondary"><input id="bilingual" type="checkbox"><span>Ajouter également les trads en anglais <small>(sorts, monstres, objets)</small></span></label><label for="buttonPosition">Bouton D&D FR</label><select id="buttonPosition"><option value="top-right">En haut à droite</option><option value="top-left">En haut à gauche</option><option value="bottom-right">En bas à droite</option><option value="bottom-left">En bas à gauche</option><option value="hidden">Ne pas afficher</option></select><p><small>Configuration accessible via le menu Tampermonkey ou Alt + Maj + F.</small></p><form id="referenceSearch"><label for="search">Rechercher une fiche AideDD</label><div class="row"><input id="search" type="search" placeholder="Nom français ou anglais…" autocomplete="off"><button type="submit">Ouvrir ↗</button></div></form><p id="searchStatus" role="status"></p><div id="results"></div>`;
  shadow.append(panel);
  const badge=document.createElement('button'); badge.id='badge'; badge.type='button'; badge.textContent='D&D FR'; badge.setAttribute('aria-label','Ouvrir les réglages de traduction'); shadow.append(badge);
  document.body.append(host);
  const $=id=>shadow.getElementById(id);
  let aideddStatus='';
  const networkStatus=message=>{aideddStatus=message;};
  // Aide locale à la recherche : aucune requête réseau, aucun accès aux données internes de Shard.
  const searchHost=document.createElement('div');
  searchHost.setAttribute('data-shard-fr-ignore','');
  searchHost.style.cssText='position:fixed;z-index:2147483647;display:none;';
  const searchRoot=searchHost.attachShadow({mode:'open'});
  const searchStyle=document.createElement('style');
  searchStyle.textContent=`:host{font:14px/1.4 system-ui,sans-serif;color:#172635}section{box-sizing:border-box;background:#fff;border:1px solid #52738e;border-radius:9px;box-shadow:0 5px 24px #0004;max-height:310px;overflow:auto;padding:9px}p{font-size:12px;margin:3px 3px 8px;color:#41566a}button{display:block;text-align:left;box-sizing:border-box;width:100%;font:inherit;border:0;border-radius:5px;padding:8px;background:white;color:#152d40;cursor:pointer}button:hover,button:focus-visible,button.active{background:#dceefa;outline:2px solid #457da0;outline-offset:-2px}small{color:#4d6577}strong{display:block}`;
  const searchBox=document.createElement('section');searchBox.setAttribute('aria-label','Suggestions de recherche D&D en français');
  searchRoot.append(searchStyle,searchBox);document.body.append(searchHost);
  let nativeTarget=null, nativeHits=[], activeHit=-1, applyingSearch=false;
  const searchableKeys=new Set([SPELLS,MONSTERS,EQUIPMENT,MAGICITEMS,TERMS,EXPANSION,CREATION,CANONICAL_SPELLS,CANONICAL_FEATURES,CANONICAL_COMBAT].flatMap(data=>parse(data).filter(([en])=>en.length<100).map(([en])=>normalize(en))));
  function isSearchInput(el) {
    if (!(el instanceof HTMLInputElement) || el.disabled || el.readOnly || el.closest('[data-shard-fr-ignore]')) return false;
    if (!['text','search'].includes(el.type)) return false;
    const placeholder=attrState.get(el)?.get('placeholder')?.original || el.getAttribute('placeholder') || '';
    const label=attrState.get(el)?.get('aria-label')?.original || el.getAttribute('aria-label') || '';
    return el.type==='search' || el.getAttribute('role')==='searchbox' || /^(search|search by name|search spells|search monsters|search items|rechercher|recherche)(?:\s|[.…:]|$)/i.test(placeholder) || /^(search|rechercher|recherche)(?:\s|[.…:]|$)/i.test(label);
  }
  function hideNativeSearch(){searchHost.style.display='none';nativeHits=[];activeHit=-1;}
  function placeNativeSearch(){
    if (!nativeTarget?.isConnected) {hideNativeSearch();return;}
    const r=nativeTarget.getBoundingClientRect();
    if (r.bottom<0 || r.top>innerHeight) {hideNativeSearch();return;}
    const width=Math.min(Math.max(r.width,330),Math.max(180,innerWidth-16));
    searchHost.style.width=width+'px';searchHost.style.left=Math.max(8,Math.min(r.left,innerWidth-width-8))+'px';
    const below=innerHeight-r.bottom;
    searchHost.style.top=(below>=180?Math.max(8,r.bottom+5):Math.max(8,r.top-Math.min(320,r.top-8)))+'px';
    searchBox.style.maxHeight=Math.max(100,Math.min(310,below>=180?below-15:r.top-16))+'px';
  }
  function useNativeHit(entry){
    const input=nativeTarget;
    if (!input?.isConnected || !isSearchInput(input)) {hideNativeSearch();return;}
    applyingSearch=true;
    // Passer par le setter natif déclenche aussi onChange des champs contrôlés React.
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    setter.call(input,entry.en);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    hideNativeSearch();input.focus();applyingSearch=false;
  }
  function suggestNativeSearch(input){
    if (applyingSearch || !enabled || !searchAssist || !isSearchInput(input)) return hideNativeSearch();
    nativeTarget=input;
    const q=searchKey(input.value);
    if(q.length<2) return hideNativeSearch();
    const words=q.split(/\s+/);
    const candidates=[...entries.entries()].filter(([key,e])=>(searchableKeys.has(key)||customKeys.has(key)||(aideddNames&&aideddIndex.has(key))) && e.en.length<100 && words.every(word=>[e.fr,e.en,...(termMeta(key).aliases||[])].some(value=>searchKey(value).includes(word))));
    const rank=e=>searchKey(e.fr)===q?0:searchKey(e.en)===q?1:searchKey(e.fr).startsWith(q)?2:3;
    candidates.sort((a,b)=>rank(a[1])-rank(b[1]) || a[1].fr.length-b[1].fr.length || a[1].en.localeCompare(b[1].en));
    nativeHits=candidates.slice(0,20).map(([,e])=>e);activeHit=-1;
    if(!nativeHits.length)return hideNativeSearch();
    searchBox.replaceChildren();
    const note=document.createElement('p');note.textContent='Recherche FR → EN · choisis un nom (↑ ↓ Entrée). Échap ferme. Ces suggestions viennent du lexique ; les résultats disponibles dépendent de tes livres et filtres.';searchBox.append(note);
    nativeHits.forEach((entry,i)=>{
      const button=document.createElement('button');button.type='button';
      const fr=document.createElement('strong');fr.textContent=entry.fr;
      const en=document.createElement('small');en.textContent=entry.en;
      button.append(fr,en);button.addEventListener('mousedown',e=>e.preventDefault());button.onclick=()=>useNativeHit(entry);searchBox.append(button);
    });
    if(candidates.length>20){const note=document.createElement('p');note.textContent=`${candidates.length} correspondances : précise ta recherche pour réduire la liste.`;searchBox.append(note);}
    searchHost.style.display='block';placeNativeSearch();
  }
  document.addEventListener('input',e=>{if(isSearchInput(e.target) && !e.isComposing)suggestNativeSearch(e.target);},true);
  document.addEventListener('compositionend',e=>{if(isSearchInput(e.target))suggestNativeSearch(e.target);},true);
  document.addEventListener('focusin',e=>{if(isSearchInput(e.target))suggestNativeSearch(e.target);},true);
  document.addEventListener('keydown',e=>{
    if(e.target!==nativeTarget || searchHost.style.display==='none' || e.isComposing)return;
    if(e.key==='Escape'){hideNativeSearch();e.preventDefault();e.stopPropagation();return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();e.stopPropagation();activeHit=(activeHit+(e.key==='ArrowDown'?1:-1)+nativeHits.length)%nativeHits.length;
      [...searchBox.querySelectorAll('button')].forEach((b,i)=>{b.classList.toggle('active',i===activeHit);if(i===activeHit)b.scrollIntoView?.({block:'nearest'});});
    } else if(e.key==='Enter'){
      const exact=nativeHits.filter(hit=>searchKey(hit.fr)===searchKey(nativeTarget.value));
      const entry=activeHit>=0?nativeHits[activeHit]:exact.length===1?exact[0]:null;
      if(entry){e.preventDefault();e.stopPropagation();useNativeHit(entry);}
    }
  },true);
  document.addEventListener('pointerdown',e=>{if(!e.composedPath().includes(searchHost)&&e.target!==nativeTarget)hideNativeSearch();},true);
  document.addEventListener('focusin',e=>{if(e.target!==nativeTarget&&!e.composedPath().includes(searchHost))hideNativeSearch();},true);
  window.addEventListener('resize',()=>{if(searchHost.style.display!=='none')placeNativeSearch();});
  window.addEventListener('scroll',()=>{if(searchHost.style.display!=='none')placeNativeSearch();},true);
  window.addEventListener('hashchange',()=>{nativeTarget=null;hideNativeSearch();});

  function persist() {
    // Les anciennes corrections restent sauvegardées mais ne remplacent plus AideDD.
    settings={...settings,enabled,bilingual,showButton,buttonPosition};
    GM_setValue(KEY,JSON.stringify(settings));
    updateControls();hideNativeSearch();
    if(!enabled)restoreInline();
    applyPlacement();queue(document.body);
  }
  function updateControls(){
    $('enabled').checked=enabled;$('bilingual').checked=bilingual;
    $('enabledLabel').textContent=enabled?'Traduction activée':'Traduction désactivée';
    badge.textContent=enabled?'D&D FR':'D&D EN';
  }
  function openPanel(){panel.hidden=!panel.hidden;if(!panel.hidden)search();}
  function referenceRows(source){
    const q=searchKey(source);
    if(!q)return [];
    return referenceIndex.get(q)||[];
  }
  function searchMatches(){
    const q=searchKey($('search').value);if(!q)return [];
    return referenceSearchRows.filter(({labels})=>labels.some(label=>label.includes(q))).map(({row})=>row);
  }
  function referenceLink(row,label){
    const a=document.createElement('a');a.href=row.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;
  }
  function search(){
    const hits=searchMatches();$('results').replaceChildren();$('searchStatus').textContent='';
    for(const row of hits.slice(0,25)){
      const link=referenceLink(row,`${row.fr} — ${row.en} ↗`);link.className='result';
      const detail=document.createElement('small');detail.textContent=AIDEDD_LABELS[row.kind]+' · AideDD 2024';link.append(detail);$('results').append(link);
    }
    if($('search').value.trim()&&!hits.length)$('searchStatus').textContent='Aucune fiche AideDD correspondante.';
    else if(hits.length>25)$('searchStatus').textContent='Affinez la recherche pour afficher les autres fiches.';
  }
  $('referenceSearch').onsubmit=e=>{
    e.preventDefault();search();
    const exact=referenceRows($('search').value),hits=exact.length?exact:searchMatches();
    if(hits.length===1)window.open(hits[0].url,'_blank','noopener,noreferrer');
    else if(hits.length>1)$('searchStatus').textContent='Plusieurs fiches correspondent : choisissez un résultat ci-dessous.';
    else if(!$('search').value.trim())$('searchStatus').textContent='Saisissez le nom d’un sort, d’un monstre ou d’un objet.';
  };
  const directLinks=new WeakMap();
  function updateDirectLink(region){
    let title,rows=[];
    for(const candidate of [...region.querySelectorAll('h1,h2,h3,[role="heading"],.titletext')].slice(0,8)){
      const source=blockEnglish(candidate).trim();if(source.length>150)continue;
      if(normalize(source)==='slow'&&weaponMasteryContext(blockEnglish(region)))continue;
      const choices=referenceRows(source);
      // Perceur/Piercer est aussi bien un don qu’un monstre. Un titre seul
      // ne permet pas d’ajouter le lien de l’autre catégorie.
      if(new Set(choices.map(r=>r.kind)).size>1)continue;
      const found=choices.filter(r=>['spell','monster','magic-item'].includes(r.kind));
      if(found.length){title=candidate;rows=found;break;}
    }
    let existing=directLinks.get(region);
    if(!title){existing?.remove();directLinks.delete(region);return;}
    const signature=rows.map(r=>r.url).join('|');
    if(existing?.isConnected&&existing.dataset.references===signature)return;
    existing?.remove();const box=document.createElement('span');box.setAttribute('data-shard-fr-ignore','');box.dataset.shardFrLink='';box.dataset.references=signature;box.className='self-center';box.style.cssText='display:inline-flex;align-self:center;align-items:center;vertical-align:middle;gap:6px;flex-wrap:wrap;margin:0 8px;flex-shrink:0;';
    for(const row of rows){const link=referenceLink(row,'AideDD ↗'+(rows.length>1?' · '+AIDEDD_LABELS[row.kind]:''));link.setAttribute('aria-label',`Ouvrir ${row.fr} sur AideDD dans un nouvel onglet`);link.style.cssText='display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;font:600 12px/1.4 system-ui;padding:5px 9px;border:1px solid #527b99;border-radius:6px;background:#17384c;color:#fff;text-decoration:none;';box.append(link);}
    title.after(box);directLinks.set(region,box);
  }
  document.addEventListener('click',event=>{
    let el=event.target;if(!enabled||!(el instanceof Element)||excluded(el))return;
    for(let depth=0;el&&depth<4;depth++,el=el.parentElement){
      if(el.textContent.length>500)break;
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,examined=0;
      while((node=walker.nextNode())&&examined++<20)requestInline(inlineChoices(normalize(tokenState.get(node)?.original||node.data)));
    }
  },true);

  // AideDD fournit les noms et les fiches publiques, jamais les données du personnage.
  function requestAideDD(url,kind,index=false) {
    if(!aideddURL(url,kind,index))return Promise.reject(Error('Adresse AideDD refusée.'));
    if(typeof GM_xmlhttpRequest!=='function')return Promise.reject(Error('Accès AideDD indisponible. Mets à jour le script dans Tampermonkey et autorise www.aidedd.org.'));
    return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,anonymous:true,timeout:15000,
      onload:r=>{
        if(r.status!==200 || (r.finalUrl && !aideddURL(r.finalUrl,kind,index)))return reject(Error('AideDD indisponible (HTTP '+r.status+').'));
        if(typeof r.responseText!=='string'||r.responseText.length>3000000)return reject(Error('Réponse AideDD inattendue.'));
        resolve(r.responseText);
      },onerror:()=>reject(Error('Connexion à AideDD impossible. Le lexique hors ligne reste disponible.')),
      ontimeout:()=>reject(Error('AideDD ne répond pas. Réessaie plus tard.'))
    }));
  }
  let syncRunning=false;
  async function syncAideDD(force=false) {
    if(syncRunning || !aideddOnline || !enabled)return;
    if(!force && Date.now()-(aideddCache.attemptedAt||0)<86400000)return;
    if(!force && Date.now()-(aideddCache.savedAt||0)<7*86400000)return;
    syncRunning=true;networkStatus('Vérification des cinq index AideDD…');
    aideddCache.attemptedAt=Date.now();GM_setValue(AIDEDD_CACHE_KEY,JSON.stringify(aideddCache));
    const rows=[];
    try {
      // Une seule requête à la fois ; mise à jour atomique si les cinq index sont valides.
      for(const kind of AIDEDD_KINDS){
        if(!aideddOnline || !enabled)throw Error('Synchronisation interrompue.');
        const found=parseAideDDCatalog(await requestAideDD(`https://www.aidedd.org/${kind}/fr/`,kind,true),kind);
        if(found.length < AIDEDD_CATALOG.filter(r=>r.kind===kind).length*0.8)throw Error('Index AideDD anormalement incomplet ; catalogue précédent conservé.');
        for(const row of found){const previous=aideddRows.find(r=>r.en===row.en&&r.kind===row.kind);if(previous)row.aliases=[...new Set([...row.aliases,...(previous.aliases||[]),previous.fr])].filter(a=>a!==row.fr);}
        rows.push(...found);
      }
      if(!aideddOnline || !enabled)return;
      aideddRows=rows;aideddCache={savedAt:Date.now(),attemptedAt:Date.now(),rows};
      GM_setValue(AIDEDD_CACHE_KEY,JSON.stringify(aideddCache));compile();queue(document.body);search();
      networkStatus(`${rows.length} correspondances AideDD mises à jour.`);
    }catch(e){networkStatus(e.message);}
    finally{syncRunning=false;}
  }
  const aideddPages=new Map();
  function loadAideDDPage(row){
    let result=aideddPages.get(row.url);
    if(!result){result=requestAideDD(row.url,row.kind).then(html=>parseAideDDPage(html,row)).catch(e=>{aideddPages.delete(row.url);throw e;});aideddPages.set(row.url,result);if(aideddPages.size>30)aideddPages.delete(aideddPages.keys().next().value);}
    return result;
  }
  function aideddChoices(key){return aideddIndex.get(key)||[];}
  // Les paires distantes ne servent qu’à des correspondances EN exactes, jamais à remplacer une fiche entière.
  const completePairs=new Map(),inlinePairs=new Map(),inlineSources=new Map(),liveInline=new Set(), inlineOwners=new WeakMap(), inlineBlocks=new Set();
  const inlineLoads=new Map(), inlineJobs=[];let inlineBusy=false;
  // Reconnaître les contractions non ambiguës, sans toucher au texte affiché
  // ni rapprocher des valeurs ou des règles différentes (2014 / 2024).
  const contractions={"you've":"you have","we've":"we have","they've":"they have","can't":"cannot","cannot":"cannot","don't":"do not","doesn't":"does not","didn't":"did not","isn't":"is not","aren't":"are not","wasn't":"was not","weren't":"were not","hasn't":"has not","haven't":"have not","hadn't":"had not","won't":"will not","wouldn't":"would not","couldn't":"could not","shouldn't":"should not","mustn't":"must not"};
  const contractionRE=new RegExp('\\b(?:'+Object.keys(contractions).map(escapeRE).join('|')+')\\b','g');
  const inlineKey=s=>normalize(s).replace(/[\uE000-\uF8FF]/g,'').replace(/[“”]/g,'"').replace(contractionRE,m=>contractions[m]).replace(/\b(\d+(?:\.\d+)?)\s*-\s*foot\b/g,'$1 feet').replace(/\b(?:ft|feet|foot)\b\.?/g,'feet').replace(/\s*([.,;:!?()+])\s*/g,'$1').replace(/\s+/g,' ');
  function inlinePriority(key){return inlineSources.has(key)&&(key.length>=35||/[.:]$/.test(key)||key.includes(':')||!entries.has(normalize(key)));}
  function lookupPair(key){
    // Les valeurs courtes d’un champ distant ne remplacent pas un nom du lexique.
    if(aideddInline&&inlineSources.has(key)&&!inlinePriority(key))return completePairs.get(key);
    if(aideddInline&&inlinePriority(key)&&inlinePairs.get(key))return inlinePairs.get(key);
    return completePairs.get(key)||(aideddInline?inlinePairs.get(key):null);
  }
  function originalNode(node){const state=tokenState.get(node);return state&&node.data===state.output?state.original:node.data;}
  let headingRevision=-1,headingEntries=new Map();
  function knownHeading(source){
    const match=/^\s*(.{1,150}?)[.:]\s*$/.exec(source);if(!match)return null;
    if(headingRevision!==revision){headingEntries=new Map([...entries.values()].filter(e=>e.en.length<=150).map(e=>[inlineKey(e.en),e]));headingRevision=revision;}
    return headingEntries.get(inlineKey(match[1]));
  }
  function translateHeading(source,context=source){
    const entry=knownHeading(source);if(!entry)return null;
    const punctuation=/([.:])\s*$/.exec(source)[1];
    return source.match(/^\s*/)[0]+translate(entry.en,context)+punctuation+source.match(/\s*$/)[0];
  }
  function blockNodes(el){
    const nodes=[], walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>excluded(n.parentElement)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let n;while((n=walker.nextNode()))nodes.push(n);return nodes;
  }
  function blockEnglish(el){
    function read(n){if(n.nodeType===3)return originalNode(n);if(n.nodeType!==1||excluded(n))return '';if(n.tagName==='BR')return ' ';return [...n.childNodes].map(read).join('')+(/^(P|DIV|LI)$/.test(n.tagName)?' ':'');}
    return read(el);
  }
  function releaseInline(record){
    for(const item of record.items){inlineOwners.delete(item.node);if(item.node.data===item.output)item.node.data=item.original;tokenState.delete(item.node);}
    inlineBlocks.delete(record);
  }
  function maintainInline(node){
    const record=inlineOwners.get(node);if(!record)return false;
    if(enabled&&aideddInline&&record.revision===revision&&record.bilingual===bilingual&&!excluded(record.el)&&record.items.every(i=>i.node.isConnected&&record.el.contains(i.node)&&i.node.data===i.output))return true;
    releaseInline(record);return false;
  }
  function restoreInline(){for(const record of [...inlineBlocks])releaseInline(record);}
  function processInline(el){
    if(!enabled||!aideddInline||excluded(el)||!el.matches('p,li,td,th,.description,.pre-wrap,.stdcontent'))return;
    if(el.querySelector('input,textarea,select,button,[role="textbox"],[contenteditable="true"]'))return;
    const visible=el.textContent;if(visible.length>50000)return;
    if(visible.length<35&&!completePairs.has(inlineKey(visible))&&!inlinePairs.has(inlineKey(visible)))return;
    const nodes=blockNodes(el);if(!nodes.length||nodes.length>300)return;
    // Une fiche inchangée peut être visitée par plusieurs racines de mutation.
    // Éviter de recalculer tous ses blocs à chaque passage.
    if(nodes.every(n=>{const p=tokenState.get(n);return p&&n.data===p.output&&p.revision===revision&&p.enabled===enabled&&p.bilingual===bilingual;}))return;
    // Shard mélange texte direct, spans, paragraphes et cellules. Chaque portion
    // visuelle doit pouvoir se traduire même si une autre portion l’est déjà.
    const groups=[],allowed=new Set(nodes);let current=null;
    function visit(n){
      if(n.nodeType===3){
        if(!allowed.has(n))return;
        const scope=n.parentElement.closest('p,li,td,th')||el;
        if(!current||current.scope!==scope){current={scope,nodes:[]};groups.push(current);}
        current.nodes.push(n);return;
      }
      if(n.nodeType!==1||excluded(n))return;
      const boundary=n!==el&&/^(BR|P|DIV|LI|TD|TH)$/.test(n.tagName);
      if(boundary)current=null;
      if(n.matches('b,strong,.b')&&!n.closest('a,button,[role="button"],.dodieroll,[onclick]')){
        const label=blockEnglish(n).trim(),before=current?.nodes.map(originalNode).join('')||'';
        const punctuation=/[.:]$/.test(label)||/^[.:]/.test(n.nextSibling?.textContent||'');
        if(punctuation&&(!before.trim()||/[.!?:]\s*$/.test(before))&&(lookupPair(inlineKey(label))||lookupPair(inlineKey(label+'.'))||knownHeading(label)||knownHeading(label+'.')))current=null;
      }
      for(const child of n.childNodes)visit(child);
      if(boundary)current=null;
    }
    visit(el);
    // Traduire les paragraphes et options avant d’envisager un bloc complet.
    // Une traduction FR peut ordonner les effets différemment de la fiche EN.
    for(const group of groups)processInlineNodes(el,group.nodes,group.nodes.map(originalNode).join(''));
    // La référence peut ne fournir qu’un texte complet. Aucun tableau ne doit
    // être aplati : les cellules et leurs valeurs restent à leur place.
    if(groups.length>1&&!el.querySelector('table')&&!nodes.some(n=>inlineOwners.has(n)))processInlineNodes(el,nodes,blockEnglish(el),groups);
  }
  function processInlineNodes(el,nodes,source,visualGroups=null){
    if(nodes.some(n=>maintainInline(n)))return;
    const key=inlineKey(source),translated=lookupPair(key)||translateDuration(source)||translateHeading(source,blockEnglish(el))||translateCompleteBlock(source);
    const fr=translated&&preserveFeet(source,translated);
    if(!fr||customKeys.has(normalize(source))||nodes.some(n=>customKeys.has(normalize(originalNode(n)))))return;
    // Conserver chaque élément interactif et ses gestionnaires. Seuls les nœuds texte changent.
    const protectedElements=[];
    for(const node of nodes){const owner=node.parentElement.closest('a,button,[role="button"],.dodieroll,[onclick]');if(owner&&el.contains(owner)&&!protectedElements.includes(owner))protectedElements.push(owner);}
    // Les emphases reconnues sont des repères comme les liens, sans recréer
    // leurs éléments. Un titre traduit reste dans son <strong>, pas tout le paragraphe.
    function inlineVariants(en){
      const trimmed=en.trim(),match=/^(.*?)([.:]?)$/.exec(trimmed);
      const entry=entries.get(normalize(match[1]));
      const heading=lookupPair(inlineKey(match[1]+'.'))?.replace(/[.:]$/,'')||lookupPair(inlineKey(match[1]))||entry?.fr;
      // Les descriptions restent françaises, même si les noms isolés sont bilingues.
      return [...new Set([translate(en,source),heading?heading+match[2]:null,entry?entry.fr+match[2]:null,...(heading&&match[2]?[heading+'.',heading+':']:[]),en,en.replace(/[\uE000-\uF8FF]/g,'')].filter(Boolean).map(s=>s.trim()))];
    }
    const formatted=[];
    for(const node of nodes){
      const owner=node.parentElement.closest('strong,b,em,i,u,mark,.b,.i');
      if(!owner||owner===el||!el.contains(owner)||formatted.includes(owner)||protectedElements.some(p=>p.contains(owner)||owner.contains(p)))continue;
      const en=nodes.filter(n=>owner.contains(n)).map(originalNode).join('');
      if(inlineVariants(en).some(value=>value&&new RegExp(pattern(value),'iu').test(fr)))formatted.push(owner);
    }
    // Seules les emphases trouvées dans le bon ordre sont conservées comme repères.
    // Les ancres interactives restent obligatoires et gardent leur priorité.
    let formatCursor=0;
    for(const owner of formatted){
      const en=nodes.filter(n=>owner.contains(n)).map(originalNode).join('');
      const matches=inlineVariants(en).filter(Boolean).map(value=>new RegExp(pattern(value),'iu').exec(fr.slice(formatCursor))).filter(Boolean).sort((a,b)=>a.index-b.index);
      if(matches.length){protectedElements.push(owner);formatCursor+=matches[0].index+matches[0][0].length;}
    }
    protectedElements.sort((a,b)=>nodes.findIndex(n=>a.contains(n))-nodes.findIndex(n=>b.contains(n)));
    const visualScope=new Map();if(visualGroups)visualGroups.forEach((g,i)=>g.nodes.forEach(n=>visualScope.set(n,i)));
    const output=new Map(nodes.map(n=>[n,'']));let cursor=0,lastIndex=0;
    function assign(segment,from,to){
      const available=nodes.slice(from,to).filter(n=>!protectedElements.some(p=>p.contains(n)));
      if(segment&&!available.length)return false;
      if(available.length){
        const groups=[];for(const node of available){const parent=node.parentElement.closest('p,li')||el,scope=visualScope.get(node)??parent;let group=groups.at(-1);if(!group||group.scope!==scope){group={parent,scope,nodes:[]};groups.push(group);}group.nodes.push(node);}
        // Ne jamais répartir arbitrairement des phrases entre plusieurs P/LI/BR.
        // Sans correspondance de paragraphe, conserver le texte jusqu’à sa reconnaissance.
        if(segment.trim()&&groups.length>1)return false;
        const group=groups[0],target=group.nodes.find(n=>n.parentElement===group.parent)||group.nodes[0];output.set(target,segment);
      }return true;
    }
    for(const owner of protectedElements){
      const owned=nodes.filter(n=>owner.contains(n)),first=nodes.indexOf(owned[0]),last=nodes.indexOf(owned.at(-1));
      const en=owned.map(originalNode).join(''),variants=inlineVariants(en);
      let found=null;
      for(const value of variants){const re=new RegExp(pattern(value.trim()).replace(/\\\+/g,'\\s*\\+\\s*'),'iu');const m=re.exec(fr.slice(cursor));if(m){const text=m[0].trim(),index=m.index+m[0].length-m[0].trimStart().length;if(!found||index<found.index)found={index,text};}}
      if(!found||!assign(fr.slice(cursor,cursor+found.index),lastIndex,first))return;
      if(owner.matches('.dodieroll'))for(const node of owned)output.set(node,originalNode(node));
      else output.set(owned[0],found.text);
      cursor+=found.index+found.text.length;lastIndex=last+1;
    }
    if(!assign(fr.slice(cursor),lastIndex,nodes.length))return;
    const record={el,revision,bilingual,items:nodes.map(node=>({node,original:originalNode(node),output:output.get(node)}))};inlineBlocks.add(record);
    for(const item of record.items){inlineOwners.set(item.node,record);tokenState.set(item.node,{original:item.original,output:item.output,revision,enabled,bilingual});item.node.data=item.output;}
  }
  function addInlinePair(en,fr,sourceURL=null){
    if(!en||!fr||en.length<3||en.length>50000)return false;
    const dice=s=>[...s.matchAll(/\b\d+d\d+\b/gi)].map(m=>m[0].toLowerCase()).sort().join(',');
    if(dice(en)!==dice(fr))return false;
    const key=inlineKey(en),previous=inlinePairs.get(key);
    if(previous===null&&!sourceURL)return false;
    if(previous&&inlineKey(previous)!==inlineKey(fr)&&(!sourceURL||liveInline.has(key)||(inlineSources.has(key)&&inlineSources.get(key)!==sourceURL))){inlinePairs.set(key,null);inlineSources.delete(key);return false;}
    if(sourceURL&&previous===null&&liveInline.has(key))return false;
    inlinePairs.set(key,fr);
    if(sourceURL){inlineSources.set(key,sourceURL);liveInline.add(key);}
    return true;
  }
  function referenceSections(page){
    const blocks=page.blocks?.length?page.blocks:(page.paragraphs||[]).map(text=>({text,heading:'',body:text}));
    const sections=[];
    for(const block of blocks){
      if(block.heading||!sections.length)sections.push({heading:block.heading,paragraphs:[]});
      sections.at(-1).paragraphs.push(block);
    }
    return sections.map(section=>({...section,text:section.paragraphs.map(p=>p.text).join(' '),body:section.paragraphs.map((p,i)=>i===0&&section.heading?p.body:p.text).join(' ').trim()}));
  }
  const referenceTitle=s=>inlineKey(s.replace(/[.\s:]+$/,''));
  const monsterTitleIndex=new Map();
  for(const row of MONSTER_ACTION_TITLES){const key=referenceTitle(row.en),labels=monsterTitleIndex.get(key)||[];labels.push(referenceTitle(row.fr));monsterTitleIndex.set(key,labels);}
  function referenceNumbers(text){return (text.match(/\d+(?:[.,]\d+)?/g)||[]).map(v=>Number(v.replace(',','.'))).sort((a,b)=>a-b).join(',');}
  function referenceCompatible(en,fr){
    const adapted=preserveFeet(en,fr);
    const dice=text=>(text.match(/\b\d+d\d+\b/gi)||[]).map(s=>s.toLowerCase()).sort().join(',');
    return referenceNumbers(en)===referenceNumbers(adapted)&&dice(en)===dice(adapted)&&completeSentenceCoverage(en,adapted);
  }
  function matchMonsterActions(english,french){
    const matches=new Map(),used=new Set();
    const candidates=(a,known)=>{const labels=[...headingAliases(a.heading),...(monsterTitleIndex.get(referenceTitle(a.heading))||[])];return french.filter(b=>!used.has(b)&&a.group===b.group&&referenceCompatible(a.text,b.text)&&(!known||labels.includes(referenceTitle(b.heading))));};
    // Commencer par les titres attestés, puis ne retenir une signature de
    // valeurs que si elle est unique dans les deux sens, dans la même rubrique.
    for(const a of english){if(!a.heading)continue;const hits=candidates(a,true);if(hits.length===1){matches.set(a,hits[0]);used.add(hits[0]);}}
    let progress=true;
    while(progress){progress=false;
      for(const a of english){if(matches.has(a))continue;const hits=candidates(a,false);if(hits.length!==1)continue;
        const b=hits[0],reverse=english.filter(other=>!matches.has(other)&&other.group===b.group&&referenceCompatible(other.text,b.text));
        if(reverse.length===1){matches.set(a,b);used.add(b);progress=true;}
      }
    }
    return matches;
  }
  function headingAliases(name){
    const base=name.replace(/[.\s:]+$/,''),entry=entries.get(normalize(base));
    return [base,entry?.fr,lookupPair(inlineKey(base)),lookupPair(inlineKey(base+'.')),...(termMeta(normalize(base)).aliases||[])].filter(Boolean).map(referenceTitle);
  }
  function completeSentenceCoverage(en,fr){
    if(!en.trim()||!fr.trim())return !en.trim()&&!fr.trim();
    const count=text=>text.trim()?text.replace(/\bft\./gi,'feet').split(/[.!?](?:\s+|$)/).filter(s=>s.trim()).length:0;
    // Une fiche FR abrégée ne doit pas faire disparaître une exception de règle EN.
    return count(fr)>=count(en);
  }
  function learnInline(en,fr,row){
    const sourceURL=row.url;
    const add=(a,b)=>{
      const accepted=addInlinePair(a,b,sourceURL);
      // Une ponctuation de fin de paragraphe ne change pas la règle.
      if(accepted&&/[.:]$/.test(a.trim()))addInlinePair(a.trim().replace(/[.:]$/,a.trim().endsWith(':')?'.':':'),b,sourceURL);
      return accepted;
    };
    for(const key of Object.keys(en.fields||{})){const a=en.fields[key],b=fr.fields?.[key];if(b){add(a.full,b.full);add(a.value,b.value);}}
    const english=referenceSections(en),french=referenceSections(fr),used=new Set();let complete=english.length>0;
    const named=english.some(p=>p.heading)||french.some(p=>p.heading);
    for(let i=0;i<english.length;i++){
      const a=english[i];let candidates;
      if(a.heading){const aliases=headingAliases(a.heading);candidates=french.filter(p=>p.heading&&aliases.includes(referenceTitle(p.heading)));}
      else candidates=named?french.filter(p=>!p.heading):(english.length===french.length?[french[i]]:[]);
      if(candidates.length!==1||used.has(candidates[0])){complete=false;continue;}
      const b=candidates[0];used.add(b);
      if(a.heading&&b.heading){
        const label=a.heading.replace(/[.\s:]+$/,''),translated=b.heading.replace(/[.\s:]+$/,'');
        add(label+'.',translated+'.');
      }
      if(!a.body&&!b.body){complete=false;continue;}
      if(!completeSentenceCoverage(a.body,b.body)){complete=false;continue;}
      if(!add(a.text,b.text)){complete=false;continue;}
      if(a.heading&&b.heading&&a.body&&b.body)add(a.body,b.body);
      if(a.paragraphs.length===b.paragraphs.length&&a.paragraphs.every((p,j)=>completeSentenceCoverage(p.body,b.paragraphs[j].body))){
        a.paragraphs.forEach((p,j)=>add(p.text,b.paragraphs[j].text));
        for(let j=0;j<a.paragraphs.length;j++)for(let size=2;size<=4&&j+size<=a.paragraphs.length;size++)add(a.paragraphs.slice(j,j+size).map(p=>p.text).join(' '),b.paragraphs.slice(j,j+size).map(p=>p.text).join(' '));
      }
    }
    if(complete&&used.size===french.length)add(en.description,fr.description);
    if(en.tables?.length===fr.tables?.length)en.tables.forEach((table,i)=>{
      const other=fr.tables[i];
      if(table.length!==other.length||table.some((r,j)=>r.length!==other[j].length))return;
      // Correspondence accepted only when each row retains its dice/numeric values.
      const values=t=>(t.join(' ').match(/\b\d+(?:d\d+)?\b/g)||[]).sort().join(',');
      if(table.some((r,j)=>values(r)!==values(other[j])))return;
      table.forEach((r,j)=>r.forEach((cell,k)=>addInlinePair(cell,other[j][k])));
    });
    if(row.kind==='monster')for(const [a,b]of matchMonsterActions(en.actions,fr.actions)){
      add(a.text,b.text);if(a.body&&b.body)add(a.body,b.body);
      if(a.heading&&b.heading)add(a.heading.replace(/[.\s]+$/,'')+'.',b.heading.replace(/[.\s]+$/,'')+'.');
      // Shard peut séparer en plusieurs P un effet présenté en un seul P sur
      // la référence. N'apprendre les phrases que si chaque paire garde ses valeurs.
      const split=text=>text.replace(/\bft\./gi,'feet').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
      const aa=split(a.body),bb=split(b.body);
      if(aa.length===bb.length&&aa.every((s,i)=>referenceCompatible(s,bb[i])))
        for(let i=0;i<aa.length;i++)for(let size=1;size<=aa.length-i;size++)add(aa.slice(i,i+size).join(' '),bb.slice(i,i+size).join(' '));
    }
    while(inlinePairs.size>1600){const key=inlinePairs.keys().next().value;inlinePairs.delete(key);inlineSources.delete(key);liveInline.delete(key);}
    saveInlineCache();revision++;queue(document.body);
  }
  const INLINE_CACHE_KEY='shard-fr-descriptions-v18';
  function saveInlineCache(){
    try{
      const pairs=[...inlinePairs].slice(-1600);let size=0;
      const bounded=pairs.reverse().filter(p=>{size+=JSON.stringify(p).length+(inlineSources.has(p[0])?JSON.stringify([p[0],inlineSources.get(p[0])]).length:0);return size<1500000;}).reverse();
      const sources=bounded.filter(p=>p[1]&&inlineSources.has(p[0])).map(p=>[p[0],inlineSources.get(p[0])]);
      GM_setValue(INLINE_CACHE_KEY,JSON.stringify({savedAt:Date.now(),pairs:bounded,sources}));
    }catch{} // Un quota de stockage ne doit pas interrompre la traduction.
  }
  function requestInline(rows){
    if(!enabled||!aideddInline||!aideddOnline||!rows.length||typeof GM_xmlhttpRequest!=='function')return;
    if(rows.length>1){for(const row of rows)requestInline([row]);return;}
    const row=rows[0],previous=inlineLoads.get(row.url);
    if(previous&&(previous.state!=='error'||Date.now()-previous.at<60000))return;
    if(inlineJobs.length>=12)return;
    inlineLoads.set(row.url,{state:'pending',at:Date.now()});inlineJobs.push(row);drainInline();
  }
  async function drainInline(){
    if(inlineBusy)return;inlineBusy=true;
    try{while(inlineJobs.length){
      const row=inlineJobs.shift();
      if(!enabled||!aideddInline||!aideddOnline){inlineLoads.delete(row.url);continue;}
      try{
        let en,fr;
        if(row.edition==='2014'){
          en=parseAideDDPage(await requestAideDD(row.url,row.kind,'legacy-en'),row);
          if(!en.frenchURL)throw Error('Traduction française AideDD absente pour cette fiche ancienne.');
          if(!enabled||!aideddInline||!aideddOnline){inlineLoads.delete(row.url);continue;}
          const frrow={...row,url:en.frenchURL,lang:'fr'};
          fr=parseAideDDPage(await requestAideDD(frrow.url,row.kind,'legacy-fr'),frrow);
        }else{
          fr=await loadAideDDPage(row);
          if(!fr.englishURL)throw Error('Lien anglais AideDD absent : traduction directe indisponible.');
          if(!enabled||!aideddInline||!aideddOnline){inlineLoads.delete(row.url);continue;}
          const enrow={...row,url:fr.englishURL,lang:'en'};
          en=parseAideDDPage(await requestAideDD(enrow.url,row.kind,'en'),enrow);
        }
        if(enabled&&aideddInline&&aideddOnline)learnInline(en,fr,row);
        inlineLoads.set(row.url,{state:'done',at:Date.now()});
      }catch(e){inlineLoads.set(row.url,{state:'error',at:Date.now()});networkStatus(e.message);}
    }}finally{inlineBusy=false;}
  }
  function inlineChoices(key){
    const current=aideddChoices(key),legacy=(legacyIndex.get(key)||[]);
    // Un homonyme entre catégories n’est pas une autorisation de charger une fiche arbitraire.
    if(new Set([...current,...legacy].map(r=>r.kind)).size>1)return [];
    return [...current,...legacy];
  }
  function discoverRegion(root){
    const el=root.nodeType===3?root.parentElement:root;
    if(!el||excluded(el))return;
    // Le titre peut être rendu avant le corps par React. Réexaminer le contexte
    // lorsqu’une description arrive, même si le titre est déjà traduit.
    const region=el.closest('[role="dialog"],article');
    if(!region||!region.querySelector('p,.description,.stdcontent,.pre-wrap')||region.textContent.length<100)return;
    updateDirectLink(region);
    if(!enabled)return;
    for(const title of [...region.querySelectorAll('h1,h2,h3,[role="heading"],.titletext')].slice(0,8)){
      const source=blockEnglish(title).trim();
      if(source.length<=150&&!(normalize(source)==='slow'&&weaponMasteryContext(blockEnglish(region))))requestInline(inlineChoices(normalize(source)));
    }
  }
  function discoverInline(node,source){
    if(!enabled||!aideddInline||!aideddOnline||source.length>150)return;
    const title=node.parentElement.closest('h1,h2,h3,[role="heading"],.MuiDialogTitle-root,.titletext');
    if(!title)return;
    const region=title.closest('[role="dialog"],article')||title.parentElement;
    if(!region||!region.querySelector('p,.description,.stdcontent,.pre-wrap')||region.textContent.length<100)return;
    if(!(normalize(source)==='slow'&&weaponMasteryContext(blockEnglish(region))))requestInline(inlineChoices(normalize(source)));
  }

  function translateDuration(source){
    const m=/^(?:(Duration)\s*:\s*)?(?:(Concentration),\s*)?(up to\s+)?(\d+)\s+(round|minute|hour|day)s?\.?$/i.exec(source.trim());
    if(!m)return null;
    const units={round:'round',minute:'minute',hour:'heure',day:'jour'};
    return (m[1]?'Durée : ':'')+(m[2]?'Concentration, ':'')+(m[3]?'jusqu’à ':'')+m[4]+' '+units[m[5].toLowerCase()]+(Number(m[4])>1?'s':'');
  }
  let blockCacheRevision=-1,blockPairs=[];const blockTranslationCache=new Map();
  function translateCompleteBlock(source){
    if(source.length<35)return null;
    if(blockCacheRevision!==revision){
      blockTranslationCache.clear();
      const selected=new Map(completePairs);
      for(const [en,fr]of inlinePairs)if(fr&&!(inlineSources.has(en)&&!inlinePriority(en))&&(inlinePriority(en)||!selected.has(en)))selected.set(en,fr);
      blockPairs=[...selected].filter(([en,fr])=>fr&&en.length>=12).sort((a,b)=>b[0].length-a[0].length);
      blockCacheRevision=revision;
    }
    const key=inlineKey(source);
    if(blockTranslationCache.has(key))return blockTranslationCache.get(key);
    const result=reconstructCompleteBlock(source);
    if(blockTranslationCache.size>600)blockTranslationCache.clear();
    blockTranslationCache.set(key,result);return result;
  }
  function reconstructCompleteBlock(source){
    // Reconstruction de blocs complets (libellés séparés, BR, plusieurs paragraphes).
    let text=inlineKey(source),changed=false;
    const pairs=blockPairs.filter(([en])=>text.includes(en));
    const pieces=[];let rest=text;
    while(rest){let match=null;for(const [en,fr]of pairs){const at=rest.indexOf(en);if(at>=0&&(!match||at<match.at||(at===match.at&&en.length>match.en.length)))match={at,en,fr};}
      if(!match){pieces.push({en:rest});break;}
      if(match.at)pieces.push({en:rest.slice(0,match.at)});pieces.push({fr:match.fr});changed=true;rest=rest.slice(match.at+match.en.length);
    }
    if(!changed)return null;
    for(const piece of pieces)if(piece.en){
      if(!/\p{L}/u.test(piece.en)){piece.fr=piece.en;continue;}
      const translated=translateHeading(piece.en,source)||translate(piece.en,source);
      // Expertise, Invisible ou Inspiration sont des libellés attestés qui
      // s’écrivent de la même manière dans les deux langues.
      if(inlineKey(translated)===inlineKey(piece.en)&&!knownHeading(piece.en)&&!entries.has(normalize(piece.en)))return null;
      piece.fr=translated;
    }
    return pieces.map(p=>p.fr).join(' ');
  }
  for(const {en,fr}of entries.values())if(en.length>=35)completePairs.set(inlineKey(en),fr);
  // Les références SRD sont embarquées ; les corrections de l’extrait utilisateur restent prioritaires.
  for(const pair of COMPLETE_TEXTS){const key=inlineKey(pair.en);if(!completePairs.has(key)||pair.source.startsWith('Traduction de'))completePairs.set(key,pair.fr);}

  // Seules les paires issues des fiches publiques sont mémorisées, jamais le texte de la partie.
  try{
    const raw=GM_getValue(INLINE_CACHE_KEY,'{}');
    if(typeof raw==='string'&&raw.length<1600000){
      const saved=JSON.parse(raw);
      if(Date.now()-saved.savedAt<30*86400000&&Array.isArray(saved.pairs)&&saved.pairs.length<=1600)
        for(const p of saved.pairs)if(Array.isArray(p)&&p.length===2&&typeof p[0]==='string'&&(p[1]===null||typeof p[1]==='string')&&p[0].length<=50000&&(p[1]?.length||0)<=60000){
          // Les anciennes versions stockaient des clés avant la normalisation
          // des contractions. Les migrer, en conservant les conflits explicites.
          const key=inlineKey(p[0]),previous=inlinePairs.get(key);
          if(previous===null||p[1]===null||(previous!==undefined&&inlineKey(previous)!==inlineKey(p[1])))inlinePairs.set(key,null);
          else inlinePairs.set(key,p[1]);
        }
      if(Date.now()-saved.savedAt<30*86400000&&Array.isArray(saved.sources)&&saved.sources.length<=1600)
        for(const pair of saved.sources)if(Array.isArray(pair)&&pair.length===2&&typeof pair[0]==='string'&&typeof pair[1]==='string'&&AIDEDD_KINDS.some(kind=>aideddURL(pair[1],kind)||aideddURL(pair[1],kind,'legacy-en')||aideddURL(pair[1],kind,'legacy-fr'))){const key=inlineKey(pair[0]);if(inlinePairs.get(key))inlineSources.set(key,pair[1]);}
    }
  }catch{}

  function applyPlacement(){
    const top=buttonPosition.startsWith('top'),right=buttonPosition.endsWith('right');
    host.style.top=top?'16px':'auto';host.style.bottom=top?'auto':'16px';host.style.left=right?'auto':'16px';host.style.right=right?'16px':'auto';
    host.style.display='flex';host.style.flexDirection=top?'column-reverse':'column';host.style.alignItems=right?'flex-end':'flex-start';
    badge.hidden=!showButton;$('buttonPosition').value=showButton?buttonPosition:'hidden';
  }
  $('buttonPosition').onchange=()=>{const value=$('buttonPosition').value;showButton=value!=='hidden';if(showButton)buttonPosition=value;persist();};
  document.addEventListener('keydown',e=>{if(e.altKey&&e.shiftKey&&e.code==='KeyF'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();panel.hidden=true;openPanel();}});
  badge.onclick=openPanel;const closeButton=$('close');if(closeButton)closeButton.onclick=()=>{panel.hidden=true;};
  $('enabled').onchange=()=>{enabled=$('enabled').checked;persist();};
  $('bilingual').onchange=()=>{bilingual=$('bilingual').checked;persist();};
  $('search').oninput=search;
  applyPlacement();updateControls();
  if(typeof GM_registerMenuCommand==='function'){
    GM_registerMenuCommand('D&D FR — Activer / désactiver la traduction',()=>{enabled=!enabled;persist();});
    GM_registerMenuCommand('D&D FR — Afficher / masquer le bouton',()=>{showButton=!showButton;persist();});
    // Navigation vers la configuration, en plus des deux réglages rapides.
    GM_registerMenuCommand('D&D FR — Ouvrir la configuration',()=>{panel.hidden=true;openPanel();});
  }
  queue(document.body);
  if(aideddOnline&&enabled&&typeof GM_xmlhttpRequest==='function')syncAideDD();
})();
