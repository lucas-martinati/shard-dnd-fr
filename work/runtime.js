/* Traduction d’affichage locale ; index et fiches publiques AideDD via GM_xmlhttpRequest. */
(() => {
  'use strict';
  const KEY = 'shard-fr-v1';
  const normalize = s => String(s).normalize('NFC').replace(/[’‘ʼ]/g, "'").replace(/[‐‑–]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
  const searchKey=s=>normalize(s).normalize('NFD').replace(/\p{M}/gu,'').replace(/œ/g,'oe').replace(/æ/g,'ae');
  const escapeRE = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = s => escapeRE(s).replace(/'/g, "['’‘ʼ]").replace(/ /g, '\\s+').replace(/-/g, '[-‐‑–]');
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
  const readAnalysisLimit=(value,fallback)=>Number.isSafeInteger(value)&&value>=0?value:fallback;
  let analysisResultLimit=readAnalysisLimit(settings.analysisResultLimit,200);
  let analysisNodeLimit=readAnalysisLimit(settings.analysisNodeLimit,10000);
  let descriptionBatchLimit=readAnalysisLimit(settings.descriptionBatchLimit,100);
  const analysisLimits=()=>({results:analysisResultLimit,elements:analysisNodeLimit,descriptions:descriptionBatchLimit});
  const AIDEDD_CACHE_KEY='shard-fr-aidedd-v1';
  const AIDEDD_LABELS={spell:'sort',monster:'monstre',feat:'don',invocation:'manifestation','magic-item':'objet magique'};
  let aideddCache={};
  try {aideddCache=JSON.parse(GM_getValue(AIDEDD_CACHE_KEY,'{}'));}catch{}
  if(!aideddCache || typeof aideddCache!=='object')aideddCache={};
  const validRows=rows=>Array.isArray(rows)&&rows.length>=1000&&rows.length<10000&&rows.every(r=>r&&typeof r.en==='string'&&r.en.length>0&&r.en.length<=150&&typeof r.fr==='string'&&r.fr.length>0&&r.fr.length<=180&&aideddURL(r.url,r.kind));
  // Une ancienne synchronisation ne doit pas masquer les références ajoutées au script.
  let aideddRows=validRows(aideddCache.rows)?[...new Map([...AIDEDD_CATALOG,...aideddCache.rows].map(r=>[normalize(r.en)+'|'+r.kind,r])).values()]:AIDEDD_CATALOG;
  let entries, names, customKeys, effectiveMeta, aideddIndex;
  let tokenMatcherIndex,phraseMatcherIndex;
  const matcherCache=new Map();
  function structuredRemainder(source){
    return source.replace(/\b(?:Niveau|DD\d+)\b/g,'').replace(/\b\d+(?:st|nd|rd|th)(?:[-\s]level)?\b/gi,'').replace(/\b\d*(?:ft|feet|foot|lb|lbs|d\d+)\b\.?/gi,'').replace(/\b(?:C|L|V|S|M)\b/g,'');
  }
  function indexTextMatchers(keys){
    // Une ancre ASCII littérale est nécessaire, jamais suffisante. Les espaces,
    // apostrophes et tirets restent vérifiés par le motif exact d’origine.
    const anchors=keys.map(key=>[...new Set(key.match(/[a-z0-9]{3}/g)||[])]),frequencies=new Map();
    for(const grams of anchors)for(const gram of grams)frequencies.set(gram,(frequencies.get(gram)||0)+1);
    const buckets=new Map(),fallback=[];
    anchors.forEach((grams,i)=>{
      if(!grams.length){fallback.push(i);return;}
      const anchor=grams.reduce((best,gram)=>frequencies.get(gram)<frequencies.get(best)?gram:best);
      if(!buckets.has(anchor))buckets.set(anchor,[]);buckets.get(anchor).push(i);
    });
    return {keys,buckets,fallback};
  }
  function textMatcher(source,prose=false){
    const index=prose?phraseMatcherIndex:tokenMatcherIndex,candidates=new Set(index.fallback),visited=new Set();
    // En mode iu, ſ et K peuvent correspondre aux lettres ASCII s et k.
    // toLowerCase couvre K ; les autres caractères restent dans le motif final.
    const text=source.toLowerCase().replace(/ſ/g,'s');
    for(let i=0;i<=text.length-3;i++){
      const gram=text.slice(i,i+3),bucket=index.buckets.get(gram);
      if(!bucket||visited.has(gram))continue;visited.add(gram);
      for(const id of bucket)candidates.add(id);
    }
    // Conserver la priorité des alternatives (longueur puis ordre du lexique).
    const ids=[...candidates].sort((a,b)=>a-b),key=(prose?'p:':'t:')+ids.join(',');
    if(!matcherCache.has(key)){
      if(matcherCache.size>=128)matcherCache.delete(matcherCache.keys().next().value);
      const alternatives=ids.map(id=>pattern(index.keys[id])).join('|')||'(?!)';
      matcherCache.set(key,new RegExp('(?<![\\p{L}\\p{N}_])(?:'+alternatives+')(?![\\p{L}\\p{N}_])','giu'));
    }
    const matcher=matcherCache.get(key);matcher.lastIndex=0;return matcher;
  }
  const baseTerms=new Map(TRANSLATION_TERMS.map(row=>[normalize(row.en),row]));
  const bundledIndex=new Map(AIDEDD_CATALOG.map(row=>[normalize(row.en)+'|'+row.kind,row]));
  const legacyIndex=new Map();
  for(const row of REFERENCE_CATALOG_2014){
    const key=normalize(row.en);
    if(!legacyIndex.has(key))legacyIndex.set(key,[]);
    legacyIndex.get(key).push(row);
  }
  let referenceIndex=new Map(),referenceSearchRows=[];
  function termMeta(key){return effectiveMeta[key]||baseTerms.get(key)||{};}

  const tokenState = new WeakMap();
  const attrState = new WeakMap();
  let revision = 0;
  function compile() {
    aideddIndex=new Map();
    for(const row of aideddRows){const key=normalize(row.en);if(!aideddIndex.has(key))aideddIndex.set(key,[]);aideddIndex.get(key).push(row);}
    entries = new Map(baseTerms);
    customKeys = new Set(Object.keys(custom).map(normalize));
    effectiveMeta=Object.fromEntries(baseTerms);
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
    names = new Set([...baseTerms].filter(([,row])=>row.usage.includes('name')).map(([key])=>key));
    if(aideddNames)for(const row of aideddRows)names.add(normalize(row.en));
    const keys = [...entries.keys()].sort((a,b) => b.length-a.length);
    tokenMatcherIndex=indexTextMatchers(keys);matcherCache.clear();
    // Dans une phrase inconnue, ne traduire que les groupes de mots D&D explicites.
    const explicitNames = new Set([...baseTerms].filter(([,row])=>row.usage.includes('spell')).map(([key])=>key));
    if(aideddNames)for(const row of aideddRows)if(row.kind==='spell')explicitNames.add(normalize(row.en));
    // Les mots courants anglais pouvant aussi désigner un sort restent ambigus en prose.
    const ambiguous = new Set(['light','aid','alarm','command','friends','jump','sleep','fear','darkness','web','daylight','silence','message','wish','gate','hex','detect','move','charge']);
    const proseKeys = keys.filter(k => k === 'hit:' || (explicitNames.has(k) && !ambiguous.has(k)) || (k.includes(' ') && (k.length > 30 || !/^(pick |select |add |remove |new |set |show |at |per )/.test(k))));
    phraseMatcherIndex=indexTextMatchers(proseKeys);
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
  const translationCache=new Map();let translationCacheRevision=-1,translationCacheBilingual=null,translationCacheRoute='';
  function translate(source, context = source) {
    if (!enabled || !source.trim() || source.length > 50000) return source;
    // Le résultat dépend aussi du contexte (Light, Save, etc.) et de la page.
    // Cache en mémoire uniquement, borné à 256 textes et 4 contextes par texte.
    if(translationCacheRevision!==revision||translationCacheBilingual!==bilingual||translationCacheRoute!==location.hash){
      translationCache.clear();translationCacheRevision=revision;translationCacheBilingual=bilingual;translationCacheRoute=location.hash;
    }
    const cacheable=source.length<=4000&&context.length<=4000,contexts=cacheable?translationCache.get(source):null;
    if(contexts?.has(context))return contexts.get(context);
    const translated=translateUncached(source,context);
    if(cacheable){
      const values=contexts||new Map();
      if(!contexts){if(translationCache.size>=256)translationCache.delete(translationCache.keys().next().value);translationCache.set(source,values);}
      if(values.size>=4)values.delete(values.keys().next().value);
      values.set(context,translated);
    }
    return translated;
  }
  function translateUncached(source,context){
    const originalSource=source;
    const exact = entries.get(normalize(source));
    const complete=lookupPair(inlineKey(source))||lookupFieldPair(inlineKey(source));
    const surround = text => source.match(/^\s*/)[0] + text + source.match(/\s*$/)[0];
    if(complete&&!customKeys.has(normalize(source)))return surround(preserveFeet(source,complete));
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
        if (key === 'hide' && context === 'map token visibility') return 'Masquer';
        if (key === 'save' && (context === 'creature ability saving throws' || /\b(?:STR|DEX|CON|INT|WIS|CHA|FOR|SAG)\s*(?:DC|DD|[0-9])/i.test(context))) return 'Sauvegarde';
      }
      if (entry.fr === entry.en) return /^[A-Z]{2,4}$/.test(entry.fr) ? entry.fr : matched;
      return entry.fr + (allowBilingual && bilingual && names.has(normalize(matched)) && normalize(entry.fr) !== normalize(matched) ? ` (${entry.en})` : '');
    };
    if (exact) return source.match(/^\s*/)[0] + output(exact, source.trim(), true) + source.match(/\s*$/)[0];
    const cast=/^Cast\s+(?:Level\s+)?([1-9])(?:st|nd|rd|th)?(?:[- ]level)?\s+Spell\s*:\s*(.+)$/i.exec(source.trim());
    if(cast)return `Lancer le sort de niveau ${cast[1]} : ${translate(cast[2])}`;
    source = source.replace(/\bCast\s+(?:Level\s+)?([1-9])(?:st|nd|rd|th)?(?:[- ]level)?\s+Spell\s*:/gi, (_,n) => `Lancer le sort de niveau ${n} :`).replace(/\b([1-9])(?:st|nd|rd|th)[-\s]level\b/gi, (_,n) => `Niveau ${n}`).replace(/\bDC(?=\d)/g, 'DD');
    // Reconnaître les lignes de statistiques uniquement si tous les mots sont connus.
    const tokens=textMatcher(source);
    const residual = structuredRemainder(source.replace(tokens,'')).replace(/[^\p{L}]/gu,'');
    const structured = source.length < 450 && residual.length === 0;
    // Une phrase inconnue reste entière en anglais. Ne jamais produire un mélange de langues.
    if(!structured){
      const duration=translateDuration(source);if(duration!==null)return duration;
      const covered=source.replace(textMatcher(source,true),'').replace(/[^\p{L}]/gu,'');
      if(covered)return originalSource;
    }
    const matcher = structured ? tokens : textMatcher(source,true);
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
  function creatureSavingThrowCell(el,source){
    return normalize(source)==='save'&&el?.matches('td,th')&&!!el.closest('.monstersimple .m24 table');
  }
  function processText(node,inlineVisited) {
    if(maintainInline(node))return;
    if(node.parentElement?.closest('p,li,td,th,.description,.pre-wrap,.stdcontent')){let el=node.parentElement;for(let depth=0;el&&depth<3;depth++,el=el.parentElement){processInline(el,inlineVisited);if(maintainInline(node))return;}}
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
    if(creatureSavingThrowCell(node.parentElement,original))context='creature ability saving throws';
    if(processRestLabel(node)||processSplitLabel(node))return;
    discoverInline(node,original);
    // Une cellule est un bloc autonome, même dans un tableau de description.
    let prose=node.parentElement.closest('p,li,td,th,.description,.pre-wrap');
    if(!prose){
      const local=node.parentElement.closest('div');
      // Un conteneur de fiche n’est pas un paragraphe : ses titres, tableaux
      // et contrôles se traduisent indépendamment des descriptions voisines.
      if(local&&!local.querySelector('div,p,li,table,h1,h2,h3,h4,h5,h6,input,button,.description,.pre-wrap'))prose=local;
    }
    if(node.parentElement.closest('h1,h2,h3,h4,h5,h6,[role="heading"],.titletext,button'))prose=null;
    const proseText=prose?blockEnglish(prose):'';
    const fragments=proseText.match(/\b(?:the|you|your|a|an|can|must|within|that|of|is|to|and|or|for|with)\b/gi)||[];
    const partialProse=fragments.length>=3 && proseText.length>35 && proseText.length<6000 && inlineKey(proseText)!==inlineKey(original) && !completePairs.has(inlineKey(proseText));
    const translated=partialProse&&!completePairs.has(inlineKey(original))&&!customKeys.has(normalize(original))?original:translate(original,context);
    tokenState.set(node,{original,output:translated,revision,enabled,bilingual});
    if (translated !== current) node.data = translated;
  }
  function processRestLabel(node){
    if(!enabled||excluded(node.parentElement))return false;
    const dialog=node.parentElement.closest('[role="dialog"]'),title=dialog?.querySelector('.MuiDialogTitle-root,.titletext');
    if(!title||!/^short rest$/i.test(blockEnglish(title).trim()))return false;
    // React sépare les nombres du texte. Garder chaque nœud pour ses mises à jour.
    const nodes=[node];let sibling=node.previousSibling;
    while(sibling?.nodeType===3){nodes.unshift(sibling);sibling=sibling.previousSibling;}
    sibling=node.nextSibling;while(sibling?.nodeType===3){nodes.push(sibling);sibling=sibling.nextSibling;}
    const source=nodes.map(originalNode).join(''),count=/^\s*with\s+(\d+)\s+left\s*$/i.exec(source);
    const hp=/^\s*You have \d+ hit points out of a maximum of \d+\.\s*$/i.test(source);
    const max=/^\s*You are at maximum hit points\s+\d+\.\s*$/i.test(source);
    if(!count&&!hp&&!max)return false;
    for(const item of nodes){
      const original=originalNode(item),output=count?original.replace(/\bwith\b/i,'dont').replace(/\bleft\b/i,Number(count[1])>1?'disponibles':'disponible'):original.replace('You have','Vous avez').replace('hit points out of a maximum of','points de vie sur un maximum de').replace('You are at maximum hit points','Vos points de vie sont au maximum :');
      tokenState.set(item,{original,output,revision,enabled,bilingual});if(item.data!==output)item.data=output;
    }
    return true;
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
      const context = key === 'title' && el.matches('span.fa-eye') ? 'map token visibility' : original;
      const translated = translate(original, context);
      states.set(key,{original,output:translated});
      if (translated !== current) el.setAttribute(key,translated);
    }
  }
  function* scan(root) {
    const inlineVisited=new WeakSet();
    if (!root || !root.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE) { discoverRegion(root);processText(root,inlineVisited); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    discoverRegion(root);
    processAttrs(root);
    processInline(root,inlineVisited);
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
      if (node.nodeType === Node.TEXT_NODE) processText(node,inlineVisited);
      else {if(node.matches('article,[role="dialog"],.pre-wrap,.stdcontent,.description'))discoverRegion(node);processAttrs(node);processInline(node,inlineVisited);}
      yield;
    }
  }
  const pending = new Set();
  let scheduled = false, pageScanWaiting = false;
  let active = null;
  function queue(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === 1 && root.closest('[data-shard-fr-ignore]')) return;
    if (root.nodeType === 3 && root.parentElement?.closest('[data-shard-fr-ignore]')) return;
    for(let ancestor=root;ancestor;ancestor=ancestor.parentNode)if(pending.has(ancestor))return;
    if (root === document.body) pending.clear();
    pending.add(root);
    if (!scheduled) { scheduled=true; setTimeout(flush,30); }
  }
  function flush() {
    const start=performance.now();
    while (performance.now()-start < 9) {
      if (!active) {
        const root=pending.values().next().value;
        if (!root) break;
        pending.delete(root);
        // Un parent ajouté après ses enfants couvre leurs anciennes tâches.
        let covered=false;
        for(let ancestor=root.parentNode;ancestor;ancestor=ancestor.parentNode)if(pending.has(ancestor)){covered=true;break;}
        if(covered)continue;
        active=scan(root);
      }
      if (active.next().done) active=null;
    }
    // Une analyse demandée par l’utilisateur rend cette file prioritaire.
    // Garder les tranches de 9 ms et céder la main, sans la pause de fond de 16 ms.
    if (active || pending.size) setTimeout(flush,pageScanWaiting?0:16);
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
  function handleMutations(records){
    // Ne valider que les traductions touchées par une mutation. Revalider
    // toutes les descriptions après chaque tranche rendait le travail quadratique.
    const touched=new Set();
    const touch=node=>{const owner=inlineOwners.get(node);if(owner)touched.add(owner);};
    for(const r of records){
      if(r.type==='characterData')touch(r.target);
      else if(r.type==='childList')for(const removed of r.removedNodes){
        touch(removed);
        const walker=document.createTreeWalker(removed,NodeFilter.SHOW_TEXT);
        let node;while((node=walker.nextNode()))touch(node);
      }
    }
    for(const record of touched)if(!record.items.every(i=>i.node.isConnected&&record.el.contains(i.node)&&i.node.data===i.output))releaseInline(record);
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
    scheduleDescriptionStatus();
  }
  const observer=new MutationObserver(handleMutations);
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
  style.textContent=`
    :host{--ink:#f3ead9;--muted:#b5aa99;--gold:#d7b777;--line:#b996583d;font:14px/1.5 system-ui,sans-serif;color:var(--ink);color-scheme:dark}
    *{box-sizing:border-box}button,input,select{font:inherit}button,a,input,select,summary{-webkit-tap-highlight-color:transparent}
    button{cursor:pointer;background:linear-gradient(135deg,#803c43,#612b35);color:#fff2e2;border:1px solid #b8766b;border-radius:8px;padding:10px 14px;font-weight:600;transition:background .16s,border-color .16s,box-shadow .16s}
    button:hover{background:#91434b;border-color:var(--gold);box-shadow:0 2px 12px #0003}button:active{background:#602a34}
    button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
    button:disabled{opacity:.4;cursor:default;box-shadow:none}button:disabled:hover{background:linear-gradient(135deg,#803c43,#612b35);border-color:#b8766b}
    svg{display:block;flex-shrink:0;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
    #badge{display:flex;align-items:center;gap:7px;min-height:36px;padding:6px 10px 6px 8px;font-size:12px;border:1px solid #bb945e;border-radius:9px;background:linear-gradient(135deg,#48252d,#241d24);color:#f3dfb4;box-shadow:inset 0 1px #f8dfad1c,0 5px 22px #0006;letter-spacing:.05em}
    #badge:hover,#badge[aria-expanded=true]{background:linear-gradient(135deg,#6d303b,#35212b);border-color:#efd39a;box-shadow:0 0 0 3px #d7b77715,0 6px 24px #0006}
    #badge .dice{width:22px;height:22px;color:var(--gold)}.badge-status{width:6px;height:6px;border-radius:50%;background:#91c2a4;box-shadow:0 0 7px #91c2a440}
    #badge[data-enabled=false] .badge-status{background:#b5aa99;box-shadow:none}
    #panel{width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 106px);max-height:calc(100dvh - 106px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#796448 #211d22;margin:10px 0;border:1px solid #a58552;border-radius:16px;background:radial-gradient(ellipse at 10% 0,#6a30382b,transparent 65%),#211d22;box-shadow:inset 0 0 0 4px #d7b77706,0 16px 60px #0008;animation:grimoire-in .18s ease-out}
    .panel-header{display:flex;align-items:center;gap:13px;padding:22px 22px 19px;border-bottom:1px solid var(--line);background:linear-gradient(110deg,#73333b20,transparent)}
    .crest{display:grid;place-items:center;width:46px;height:52px;color:var(--gold);background:linear-gradient(145deg,#d7b7771c,#d7b77704);border:1px solid var(--line);border-radius:12px 12px 18px 18px}.crest svg{width:32px;height:32px}
    .panel-heading{flex:1;min-width:0}.eyebrow{margin:0 0 3px;color:var(--gold);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
    h2{font:600 25px/1.2 Georgia,'Times New Roman',serif;margin:0;letter-spacing:-.02em}h3{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:0 0 16px}h3 svg{width:17px;height:17px}
    #close{align-self:flex-start;display:grid;place-items:center;flex-shrink:0;width:30px;height:30px;padding:0;color:var(--muted);background:transparent;border:1px solid transparent;font-size:24px;font-weight:400;line-height:1}
    #close:hover{color:var(--ink);border-color:var(--line);background:#ffffff08}
    .panel-body{padding:20px 22px 4px}.primary{margin:0;padding:15px;background:linear-gradient(115deg,#30423870,#30423820);border:1px solid #7eaa8259;border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer}
    .primary[data-enabled=false]{background:#ffffff03;border-color:var(--line)}#enabledLabel{display:block;font-weight:650;font-size:15px}.primary small{display:block;margin-top:3px;font-size:11px}
    input[type=checkbox]{accent-color:var(--gold);width:18px;height:18px;margin:2px 0;flex-shrink:0;cursor:pointer}
    #enabled{appearance:none;position:relative;display:block;width:40px;height:24px;margin:0;border:1px solid #8e8476;border-radius:20px;background:#433c40;transition:background .16s}
    #enabled::before{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#c8bfb2;transition:transform .16s}
    #enabled:checked{background:#769b7b;border-color:#9ec4a2}#enabled:checked::before{transform:translateX(16px);background:#fff5e3}
    label{display:block;margin:10px 0 7px;font-size:13px}.secondary{display:flex;align-items:flex-start;gap:10px;cursor:pointer}.secondary span{flex:1}.secondary small{display:block;margin-top:3px}
    small{color:var(--muted);font-size:12px}p{margin:8px 0}.settings-section{border-bottom:1px solid var(--line);padding:21px 0}.settings-section:last-child{border-bottom:0;padding-bottom:12px}
    input[type=search],input[type=number],select{width:100%;min-height:42px;background:#18161b;color:var(--ink);border:1px solid #756449;border-radius:8px;padding:10px 12px;transition:border-color .16s}
    input::placeholder{color:#a59b8b;opacity:1}input:hover,select:hover{border-color:var(--gold)}select{cursor:pointer}select option{background:#211d22}
    .position-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 8px;font-size:13px}
    #buttonPosition{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .position-choice{display:flex;align-items:center;gap:8px;min-height:48px;padding:8px;font-size:12px;font-weight:500;background:#18161b;color:var(--muted);border-color:#756449}
    .position-choice svg{width:24px;height:24px}.position-choice circle{fill:currentColor;stroke:none}
    .position-choice:hover{background:#d7b7770d;color:var(--ink)}.position-choice[aria-pressed=true]{background:#d7b77716;border-color:var(--gold);color:var(--gold);box-shadow:inset 0 0 0 1px #d7b77730}
    #hideButton{background:transparent;border-color:transparent;padding:4px 8px;font-size:11px;font-weight:500;color:var(--muted)}#hideButton:hover{background:#ffffff08;color:var(--ink)}#hideButton[aria-pressed=true]{border-color:var(--gold);color:var(--gold)}
    .row{display:flex;gap:8px;margin:12px 0}.row input{min-width:0;flex:1}#referenceSearch .row{margin:8px 0 0}#referenceSearch button{white-space:nowrap}#referenceSearch label{color:var(--muted);font-size:12px}
    #results:empty,#searchStatus:empty{display:none}.result{display:block;border:1px solid var(--line);border-radius:8px;padding:11px 12px;margin:8px 0;color:var(--ink);text-decoration:none;overflow-wrap:anywhere;background:#d7b77705}
    .result:hover{border-color:var(--gold);background:#d7b77710}.result small{display:block;margin-top:3px}#searchStatus{color:var(--gold);font-size:12px}
    details{margin:0 22px;border-top:1px solid var(--line);padding:16px 0}summary{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:600;color:var(--muted);list-style:none}summary::-webkit-details-marker{display:none}
    summary::before{content:'◇';color:var(--gold);font-size:18px}summary::after{content:'+';margin-left:auto;color:var(--gold);font-size:19px;font-weight:400}details[open]>summary::after{content:'−'}summary:hover{color:var(--ink)}
    details p{font-size:12px;color:var(--muted)}fieldset{min-width:0;border:1px solid var(--line);border-radius:10px;padding:12px;margin:18px 0 4px}legend{font:600 17px Georgia,serif;color:var(--gold);padding:0 6px}
    fieldset .row{flex-wrap:wrap}fieldset .row button{flex:1;min-width:110px;font-size:12px;padding:9px 10px}#clearMissing,#clearDescriptions,#stopDescriptions{background:transparent;border-color:#756449;color:var(--muted)}
    #clearMissing:hover,#clearDescriptions:hover,#stopDescriptions:hover{background:#ffffff08;color:var(--ink)}
    #missingResults,#descriptionResults{padding-left:22px;max-height:240px;overflow:auto;font-size:12px}#missingResults li,#descriptionResults li{margin:10px 0;overflow-wrap:anywhere}#missingResults small{display:block}#descriptionSummary{color:var(--muted)}#descriptionResults li[data-state="incomplete"]{border-left:3px solid #ef7773;padding-left:8px}
    .panel-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 22px;border-top:1px solid var(--line);background:#15131755;color:var(--muted);font-size:10px;letter-spacing:.04em}
    .shortcut{display:flex;align-items:center;gap:4px}kbd{font:10px system-ui,sans-serif;border:1px solid #756449;border-bottom-width:2px;border-radius:4px;padding:2px 4px;color:#d8c9ae}
    [hidden]{display:none!important}@keyframes grimoire-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:380px){.panel-header{padding:17px 16px}.panel-body{padding:16px 16px 4px}details{margin:0 16px}.panel-footer{padding:12px 16px}h2{font-size:23px}.crest{width:40px}.primary{padding:12px}.panel-footer{letter-spacing:0}.position-choice{font-size:11px}}
    @media(prefers-reduced-motion:reduce){*,*::before{animation:none!important;transition:none!important}}
    @media(forced-colors:active){#enabled{appearance:auto}#enabled::before{display:none}.badge-status{background:ButtonText}}
  `;
  shadow.append(style);
  const panel=document.createElement('section'); panel.id='panel'; panel.hidden=true; panel.setAttribute('aria-label','Traduction D&D en français');
  // Cette interface est créée une fois, à l’écart du DOM géré par Shard.
  const diceIcon='<svg class="dice" viewBox="0 0 32 36" aria-hidden="true"><path d="M16 2 30 10v16L16 34 2 26V10Z M16 2 9 14l14 0L16 2 M2 10l7 4-7 12 M30 10l-7 4 7 12 M9 14l7 14 7-14 M2 26l14 2 14-2 M16 28v6"/></svg>';
  panel.innerHTML=`
    <header class="panel-header"><div class="crest">${diceIcon}</div><div class="panel-heading"><p class="eyebrow">Shard Tabletop · D&D FR</p><h2>Grimoire français</h2></div><button id="close" type="button" aria-label="Fermer la configuration" title="Fermer (Échap)">×</button></header>
    <div class="panel-body">
      <label class="primary"><span><span id="enabledLabel">Traduction activée</span><small>Vos aventures, en français.</small></span><input id="enabled" type="checkbox" role="switch" aria-label="Activer la traduction"></label>
      <section class="settings-section" aria-labelledby="displayHeading"><h3 id="displayHeading">Préférences d’affichage</h3>
        <label class="secondary"><input id="bilingual" type="checkbox"><span>Afficher aussi les noms anglais<small>Sorts, monstres et objets</small></span></label>
        <div class="position-heading"><span id="positionLabel">Emplacement du bouton</span><button id="hideButton" type="button" aria-pressed="false" title="Masquer le bouton ; le raccourci reste accessible">Masquer</button></div>
        <div id="buttonPosition" role="group" aria-labelledby="positionLabel">
          <button type="button" class="position-choice" data-position="top-left" aria-pressed="false" aria-label="Placer le bouton en haut à gauche"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="7" cy="8" r="2.5"/></svg><span>Haut gauche</span></button>
          <button type="button" class="position-choice" data-position="top-right" aria-pressed="false" aria-label="Placer le bouton en haut à droite"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="17" cy="8" r="2.5"/></svg><span>Haut droite</span></button>
          <button type="button" class="position-choice" data-position="bottom-left" aria-pressed="false" aria-label="Placer le bouton en bas à gauche"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="7" cy="16" r="2.5"/></svg><span>Bas gauche</span></button>
          <button type="button" class="position-choice" data-position="bottom-right" aria-pressed="false" aria-label="Placer le bouton en bas à droite"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="17" cy="16" r="2.5"/></svg><span>Bas droite</span></button>
        </div>
      </section>
      <section class="settings-section" aria-labelledby="referenceHeading"><h3 id="referenceHeading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16"/></svg>Les archives d’AideDD</h3>
        <form id="referenceSearch"><label for="search">Rechercher une fiche en français ou en anglais</label><div class="row"><input id="search" type="search" placeholder="Boule de feu, dragon, épée…" autocomplete="off"><button type="submit">Ouvrir ↗</button></div></form><p id="searchStatus" role="status"></p><div id="results"></div>
      </section>
    </div>`;
  shadow.append(panel);
  const diagnostics=document.createElement('details');
  diagnostics.innerHTML="<summary>Repérer les traductions manquantes</summary>\n<p>Rapports locaux. Les résultats sont des candidats à vérifier ; les valeurs des champs et les éditeurs sont exclus.</p>\n<fieldset><legend>Page affichée</legend>\n<p>Analyse uniquement les textes actuellement visibles.</p>\n<label for=\"analysisResultLimit\">Nombre maximal de résultats (0 = sans limite)</label><input id=\"analysisResultLimit\" type=\"number\" min=\"0\" step=\"1\">\n<label for=\"analysisNodeLimit\">Éléments à examiner (0 = sans limite)</label><input id=\"analysisNodeLimit\" type=\"number\" min=\"0\" step=\"1\">\n<div class=\"row\"><button id=\"scanMissing\" type=\"button\">Analyser la page</button><button id=\"clearMissing\" type=\"button\">Effacer la page</button></div>\n<p id=\"missingStatus\" role=\"status\"></p><ol id=\"missingResults\"></ol>\n<button id=\"exportMissing\" type=\"button\" disabled>Exporter la page (JSON)</button>\n</fieldset>\n<fieldset><legend>Descriptions des fiches</legend>\n<label class=\"secondary\"><input id=\"showDescriptionStatus\" type=\"checkbox\"><span>Marquer les descriptions à compléter</span></label>\n<p>Les descriptions à compléter sont entourées en rouge. Le contrôle privilégie 2024 et parcourt les fiches déjà chargées. Tu peux l’arrêter ou ouvrir les fiches manuellement.</p>\n<label for=\"descriptionBatchLimit\">Fiches par passage (0 = toutes les fiches chargées)</label><input id=\"descriptionBatchLimit\" type=\"number\" min=\"0\" step=\"1\">\n<div class=\"row\"><button id=\"inspectDescriptions\" type=\"button\" disabled>Contrôler les fiches</button><button id=\"stopDescriptions\" type=\"button\" disabled>Arrêter</button></div>\n<p id=\"descriptionStatus\" role=\"status\"></p><p id=\"descriptionSummary\"></p><ol id=\"descriptionResults\"></ol>\n<div class=\"row\"><button id=\"exportDescriptions\" type=\"button\" disabled>Exporter les descriptions (JSON)</button><button id=\"clearDescriptions\" type=\"button\">Effacer les descriptions</button></div>\n</fieldset>\n";
  panel.append(diagnostics);
  const footer=document.createElement('footer');footer.className='panel-footer';
  footer.innerHTML=`<span>D&D FR · v${SCRIPT_VERSION}</span><span class="shortcut" aria-label="Ouvrir ou fermer le panneau : Alt + Maj + F" title="Ouvrir ou fermer le panneau"><kbd>Alt</kbd> + <kbd>Maj</kbd> + <kbd>F</kbd></span>`;
  footer.title='Configuration également accessible via le menu Tampermonkey';panel.append(footer);
  const badge=document.createElement('button'); badge.id='badge'; badge.type='button'; badge.innerHTML=diceIcon+'<span id="badgeLabel">D&D FR</span><span class="badge-status" aria-hidden="true"></span>'; badge.setAttribute('aria-label','Ouvrir les réglages de traduction');badge.setAttribute('aria-controls','panel');badge.setAttribute('aria-expanded','false');badge.title='Ouvrir ou fermer le grimoire français · Alt + Maj + F';shadow.append(badge);
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
  searchStyle.textContent=`:host{font:14px/1.4 system-ui,sans-serif;color:#f3ead9;color-scheme:dark}section{box-sizing:border-box;background:#211d22;border:1px solid #a58552;border-radius:10px;box-shadow:0 8px 28px #0006;max-height:310px;overflow:auto;padding:9px;scrollbar-width:thin;scrollbar-color:#796448 #211d22}p{font-size:12px;margin:3px 3px 8px;color:#b5aa99}button{display:block;text-align:left;box-sizing:border-box;width:100%;font:inherit;border:1px solid transparent;border-radius:6px;padding:9px;background:transparent;color:#f3ead9;cursor:pointer}button:hover,button:focus-visible,button.active{background:#d7b77712;outline:2px solid #d7b777;outline-offset:-2px}small{color:#b5aa99}strong{display:block;font-weight:600}`;
  const searchBox=document.createElement('section');searchBox.setAttribute('aria-label','Suggestions de recherche D&D en français');
  searchRoot.append(searchStyle,searchBox);document.body.append(searchHost);
  let nativeTarget=null, nativeHits=[], activeHit=-1, applyingSearch=false;
  const searchableKeys=new Set([...baseTerms].filter(([,row])=>row.usage.includes('search')).map(([key])=>key));
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
    settings={...settings,enabled,bilingual,showButton,buttonPosition,analysisResultLimit,analysisNodeLimit,descriptionBatchLimit};
    GM_setValue(KEY,JSON.stringify(settings));
    updateControls();hideNativeSearch();
    clearDiagnostics();
    if(!enabled)restoreInline();
    applyPlacement();queue(document.body);
  }
  function updateControls(){
    $('enabled').checked=enabled;$('bilingual').checked=bilingual;
    $('enabledLabel').textContent=enabled?'Traduction activée':'Traduction désactivée';
    $('badgeLabel').textContent=enabled?'D&D FR':'D&D EN';
    badge.dataset.enabled=String(enabled);$('enabled').closest('.primary').dataset.enabled=String(enabled);
  }
  function closePanel(){panel.hidden=true;badge.setAttribute('aria-expanded','false');badge.setAttribute('aria-label','Ouvrir les réglages de traduction');if(!badge.hidden)badge.focus();}
  function openPanel(){if(!panel.hidden){closePanel();return;}panel.hidden=false;badge.setAttribute('aria-expanded','true');badge.setAttribute('aria-label','Fermer les réglages de traduction');search();$('close').focus();}
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
    for(const row of rows){const link=referenceLink(row,'AideDD ↗'+(rows.length>1?' · '+AIDEDD_LABELS[row.kind]:''));link.setAttribute('aria-label',`Ouvrir ${row.fr} sur AideDD dans un nouvel onglet`);link.style.cssText='display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;font:600 12px/1.4 system-ui;padding:5px 9px;border:1px solid #a58552;border-radius:6px;background:#38252d;color:#f3dfb4;text-decoration:none;';box.append(link);}
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
  const completePairs=new Map(),localCorrections=new Set(),inlinePairs=new Map(),inlineSources=new Map(),liveInline=new Set(), inlineOwners=new WeakMap(), inlineBlocks=new Set();
  const inlineLoads=new Map(), inlineJobs=[];let inlineBusy=false;
  // Reconnaître les contractions non ambiguës, sans toucher au texte affiché
  // ni rapprocher des valeurs ou des règles différentes (2014 / 2024).
  const contractions={"you've":"you have","we've":"we have","they've":"they have","can't":"cannot","cannot":"cannot","don't":"do not","doesn't":"does not","didn't":"did not","isn't":"is not","aren't":"are not","wasn't":"was not","weren't":"were not","hasn't":"has not","haven't":"have not","hadn't":"had not","won't":"will not","wouldn't":"would not","couldn't":"could not","shouldn't":"should not","mustn't":"must not"};
  const contractionRE=new RegExp('\\b(?:'+Object.keys(contractions).map(escapeRE).join('|')+')\\b','g');
  const inlineKey=s=>normalize(s).replace(/[\uE000-\uF8FF]/g,'').replace(/[“”]/g,'"').replace(contractionRE,m=>contractions[m]).replace(/\b(\d+(?:\.\d+)?)\s*-\s*foot\b/g,'$1 feet').replace(/\b(?:ft|feet|foot)\b\.?/g,'feet').replace(/\s*([.,;:!?()+])\s*/g,'$1').replace(/\s+/g,' ');
  function inlinePriority(key){return inlineSources.has(key)&&(key.length>=35||/[.:]$/.test(key)||key.includes(':')||!entries.has(normalize(key)));}
  function lookupPair(key){
    // Une correction vérifiée du texte utilisateur reste prioritaire sur le cache distant.
    if(localCorrections.has(key))return completePairs.get(key);
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
  function lookupFieldPair(key){
    // Un libellé déjà français ne change pas l’identité de sa valeur anglaise.
    // Réutiliser seulement une paire exacte du champ complet, sans traduire
    // des morceaux arbitraires d’une phrase ni changer ses règles.
    const field=/^(caractéristique|utilisation|fabrication|variantes):(.+)$/.exec(key);
    if(!field)return null;
    const labels={'caractéristique':'ability',utilisation:'utilize',fabrication:'craft',variantes:'variants'};
    return lookupPair(labels[field[1]]+':'+field[2]);
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
  function processInline(el,visited){
    // Un échec sur un paragraphe inconnu vaut pour tout ce parcours, pas pour
    // chaque nœud et chacun de ses ancêtres. Une mutation ouvre un nouveau parcours.
    if(visited?.has(el))return;
    visited?.add(el);
    if(!enabled||!aideddInline||excluded(el))return;
    // Certaines lignes Shard sont des DIV sans classe contenant uniquement
    // des spans/gras/liens. Les traiter comme un paragraphe de la description.
    const descriptionLine=el.tagName==='DIV'&&el.closest('.description,.pre-wrap,.stdcontent')&&!el.querySelector('div,p,li,table');
    if(!descriptionLine&&!el.matches('p,li,td,th,.description,.pre-wrap,.stdcontent'))return;
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
      if(n.nodeType!==1)return;
      // Un contrôle sépare les portions de prose, sans bloquer le reste du bloc.
      // Sa valeur et ses gestionnaires restent sous le contrôle de Shard.
      if(n!==el&&n.matches('input,textarea,select,button,[role="button"],[role="textbox"],[contenteditable]:not([contenteditable="false"])')){current=null;return;}
      if(excluded(n)){current=null;return;}
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
    if(groups.length>1&&!el.querySelector('table,input,textarea,select,button,[role="button"],[role="textbox"],[contenteditable]:not([contenteditable="false"])')&&!nodes.some(n=>inlineOwners.has(n)))processInlineNodes(el,nodes,blockEnglish(el),groups);
  }
  function processInlineNodes(el,nodes,source,visualGroups=null){
    if(nodes.some(n=>maintainInline(n)))return;
    const key=inlineKey(source),translated=lookupPair(key)||lookupFieldPair(key)||translateDuration(source)||translateHeading(source,blockEnglish(el))||translateCompleteBlock(source);
    const fr=translated&&preserveFeet(source,translated);
    if(!fr||customKeys.has(normalize(source))||nodes.some(n=>customKeys.has(normalize(originalNode(n)))))return;
    const formatGroups=new Map();
    const ownerContains=(owner,node)=>(formatGroups.get(owner)||[owner]).some(part=>part.contains(node));
    // Conserver chaque élément interactif et ses gestionnaires. Seuls les nœuds texte changent.
    const protectedElements=[];
    for(const node of nodes){const owner=node.parentElement.closest('a,button,[role="button"],.dodieroll,[onclick]');if(owner&&el.contains(owner)&&!protectedElements.includes(owner))protectedElements.push(owner);}
    // Les emphases reconnues sont des repères comme les liens, sans recréer
    // leurs éléments. Un titre traduit reste dans son <strong>, pas tout le paragraphe.
    function inlineVariants(en){
      const trimmed=en.trim(),match=/^(.*?)([.:,;]?)$/.exec(trimmed);
      const entry=entries.get(normalize(match[1]));
      const heading=lookupPair(inlineKey(match[1]+'.'))?.replace(/[.:]$/,'')||lookupPair(inlineKey(match[1]))||entry?.fr;
      // Les descriptions restent françaises, même si les noms isolés sont bilingues.
      // Le lien d’action peut être nommé « Esquiver » dans le lexique,
      // alors que le SRD et les paragraphes utilisent « l’action Esquive ».
      const actionNoun=normalize(match[1])==='dodge'?'Esquive':null;
      const armorHide=normalize(match[1])==='hide'&&/\bmedium armor\b/i.test(source)?'peaux':null;
      const aliases=(termMeta(normalize(match[1])).aliases||[]).map(alias=>alias+match[2]);
      // Un lien Shard peut porter le possessif anglais d’un nom propre.
      // Le français conserve le nom, mais exprime la possession hors du lien.
      const possessive=/^([\p{L} -]+)['’]s$/u.exec(match[1]);
      const properName=possessive&&(entries.has(normalize(possessive[1]))||/^[A-Z]/.test(possessive[1]))?translate(possessive[1],source):null;
      const values=[translate(en,source),armorHide,actionNoun?actionNoun+match[2]:null,heading?heading+match[2]:null,entry?entry.fr+match[2]:null,...aliases,properName,...(heading&&match[2]?[heading+'.',heading+':']:[]),...(/[,;]/.test(match[2])?[heading,entry?.fr]:[]),en,en.replace(/[\uE000-\uF8FF]/g,'')].filter(Boolean);
      // Le SRD écrit « œil » là où certains noms AideDD emploient « oeil ».
      // Reconnaître les deux graphies pour garder le lien dans le paragraphe traduit.
      return [...new Set(values.flatMap(value=>[value,value.replace(/œ/gi,'oe'),value.replace(/oe/gi,'œ')]).map(s=>s.trim()))];
    }
    // Les rubriques françaises ajoutent une espace avant « : ».
    const inlinePattern=value=>pattern(value).replace(/:/g,'\\s*:');
    const formatted=[];
    for(const node of nodes){
      const owner=node.parentElement.closest('strong,b,em,i,u,mark,.b,.i');
      if(!owner||owner===el||!el.contains(owner)||formatted.some(p=>ownerContains(p,owner))||protectedElements.some(p=>p.contains(owner)||owner.contains(p)))continue;
      // Shard peut découper un seul titre entre plusieurs emphases :
      // <strong>Patient </strong><strong>Defense.</strong><strong> </strong>.
      // Le traduire comme un seul repère permet d’inverser les mots en français
      // tout en gardant les éléments et la prose à leur place.
      const parts=[owner];let sibling=owner.nextSibling,headingParts=null;
      for(let count=0;sibling&&count<6;count++,sibling=sibling.nextSibling){
        const whitespace=sibling.nodeType===3&&!originalNode(sibling).trim();
        const emphasis=sibling.nodeType===1&&sibling.matches('strong,b,em,i,u,mark,.b,.i')&&!excluded(sibling)&&!sibling.querySelector('a,button,[role="button"],.dodieroll,[onclick]');
        if(!whitespace&&!emphasis)break;
        if(emphasis&&blockEnglish(sibling).trim()&&!['b,strong,.b','em,i,.i','u','mark'].every(selector=>owner.matches(selector)===sibling.matches(selector)))break;
        parts.push(sibling);
        const label=nodes.filter(n=>parts.some(part=>part.contains(n))).map(originalNode).join('');
        // L’espace non stylé reste disponible avant un dé ou un lien ; une
        // emphase vide fait toujours partie du titre découpé par Shard.
        if(emphasis&&knownHeading(label))headingParts=parts.slice();
      }
      if(headingParts)formatGroups.set(owner,headingParts);
      const en=nodes.filter(n=>ownerContains(owner,n)).map(originalNode).join('');
      if(inlineVariants(en).some(value=>value&&new RegExp(inlinePattern(value),'iu').test(fr)))formatted.push(owner);
    }
    // Seules les emphases trouvées dans le bon ordre sont conservées comme repères.
    // Les ancres interactives restent obligatoires et gardent leur priorité.
    let formatCursor=0;
    for(const owner of formatted){
      const en=nodes.filter(n=>ownerContains(owner,n)).map(originalNode).join('');
      const matches=inlineVariants(en).filter(Boolean).map(value=>new RegExp(inlinePattern(value),'iu').exec(fr.slice(formatCursor))).filter(Boolean).sort((a,b)=>a.index-b.index);
      if(matches.length){protectedElements.push(owner);formatCursor+=matches[0].index+matches[0][0].length;}
    }
    protectedElements.sort((a,b)=>nodes.findIndex(n=>ownerContains(a,n))-nodes.findIndex(n=>ownerContains(b,n)));
    const visualScope=new Map();if(visualGroups)visualGroups.forEach((g,i)=>g.nodes.forEach(n=>visualScope.set(n,i)));
    const output=new Map(nodes.map(n=>[n,'']));let cursor=0,lastIndex=0;
    function assign(segment,from,to){
      const available=nodes.slice(from,to).filter(n=>!protectedElements.some(p=>ownerContains(p,n)));
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
      const owned=nodes.filter(n=>ownerContains(owner,n)),first=nodes.indexOf(owned[0]),last=nodes.indexOf(owned.at(-1));
      const en=owned.map(originalNode).join(''),variants=inlineVariants(en);
      let found=null;
      for(const value of variants){const re=new RegExp(inlinePattern(value.trim()).replace(/\\\+/g,'\\s*\\+\\s*'),'iu');const m=re.exec(fr.slice(cursor));if(m){const text=m[0].trim(),index=m.index+m[0].length-m[0].trimStart().length;if(!found||index<found.index)found={index,text};}}
      if(!found)return;
      // Deux spans d’emphase adjacents peuvent porter leur espace dans le
      // second span. Garder cet espace sans créer de nœud ni modifier un dé.
      const gap=fr.slice(cursor,cursor+found.index);
      if(gap&&!gap.trim()&&lastIndex===first&&/^\s/.test(en)&&!owner.matches('.dodieroll')){
        found.text=gap+found.text;found.index=0;
      }
      if(!assign(fr.slice(cursor,cursor+found.index),lastIndex,first))return;
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
    if(sourceURL&&!referenceCompatible(en,fr))return false;
    if(referenceDice(en)!==referenceDice(fr))return false;
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
  function referenceDice(text){return (text.match(/\b(?:\d+)?d\d+s?\b/gi)||[]).map(s=>s.toLowerCase().replace(/s$/,'')).sort().join(',');}
  function referenceCompatible(en,fr){
    const adapted=preserveFeet(en,fr);
    // Filtre conservateur : chiffres et dés identiques ne prouvent pas le sens.
    // Une négation explicite perdue ou ajoutée exige une vérification humaine.
    const negativeEN=/\b(?:cannot|not|never|neither|without|no)\b/.test(inlineKey(en).replace(/\bnot only\b/g,''));
    const negativeFR=/\b(?:pas|jamais|sans|aucun|aucune|ni)\b/.test(inlineKey(fr));
    return negativeEN===negativeFR&&referenceNumbers(en)===referenceNumbers(adapted)&&referenceDice(en)===referenceDice(adapted)&&completeSentenceCoverage(en,adapted);
  }
  function matchMonsterActions(english,french){
    const matches=new Map(),used=new Set();
    const candidates=a=>{const labels=[...headingAliases(a.heading),...(monsterTitleIndex.get(referenceTitle(a.heading))||[])];return french.filter(b=>!used.has(b)&&a.group===b.group&&referenceCompatible(a.text,b.text)&&labels.includes(referenceTitle(b.heading)));};
    // Un titre bilingue attesté est obligatoire. Des nombres uniques ne
    // suffisent pas à associer deux aptitudes qui peuvent avoir un autre effet.
    for(const a of english){
      let hits;
      if(a.heading)hits=candidates(a);
      else if(a.introduction&&['legendary','lair'].includes(a.group)&&english.filter(other=>other.introduction&&other.group===a.group).length===1)
        hits=french.filter(b=>!used.has(b)&&b.introduction&&b.group===a.group&&referenceCompatible(a.text,b.text));
      else continue;
      if(hits.length===1){matches.set(a,hits[0]);used.add(hits[0]);}
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
      table.forEach((r,j)=>r.forEach((cell,k)=>add(cell,other[j][k])));
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
      GM_setValue(INLINE_CACHE_KEY,JSON.stringify({savedAt:Date.now(),validationVersion:2,pairs:bounded,sources}));
    }catch{} // Un quota de stockage ne doit pas interrompre la traduction.
  }
  function requestInline(rows){
    if(!enabled||!aideddInline||!aideddOnline||!rows.length||typeof GM_xmlhttpRequest!=='function'||descriptionRun)return;
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
  let blockCacheRevision=-1,blockPairIndex=new Map();const blockTranslationCache=new Map();
  function indexBlockPairs(pairs){
    // Un fragment de six caractères appartient nécessairement au texte exact.
    // Choisir le plus rare parmi début, milieu et fin évite une recherche globale,
    // sans perdre les correspondances ni modifier les frontières de mots.
    const grams=en=>[...new Set([en.slice(0,6),en.slice(Math.floor((en.length-6)/2),Math.floor((en.length-6)/2)+6),en.slice(-6)])];
    const frequencies=new Map();
    for(const [en]of pairs)for(const gram of grams(en))frequencies.set(gram,(frequencies.get(gram)||0)+1);
    const index=new Map();
    for(const pair of pairs){
      const anchor=grams(pair[0]).reduce((best,gram)=>frequencies.get(gram)<frequencies.get(best)?gram:best);
      if(!index.has(anchor))index.set(anchor,[]);index.get(anchor).push(pair);
    }
    return index;
  }
  function matchingBlockPairs(text){
    const visited=new Set(),matches=[];
    for(let i=0;i<=text.length-6;i++){
      const gram=text.slice(i,i+6),bucket=blockPairIndex.get(gram);
      if(!bucket||visited.has(gram))continue;visited.add(gram);
      for(const pair of bucket)if(text.includes(pair[0]))matches.push(pair);
    }
    return matches;
  }
  function translateCompleteBlock(source){
    if(source.length<35)return null;
    if(blockCacheRevision!==revision){
      blockTranslationCache.clear();
      const selected=new Map(completePairs);
      for(const [en,fr]of inlinePairs)if(fr&&!localCorrections.has(en)&&!(inlineSources.has(en)&&!inlinePriority(en))&&(inlinePriority(en)||!selected.has(en)))selected.set(en,fr);
      blockPairIndex=indexBlockPairs([...selected].filter(([en,fr])=>fr&&en.length>=12));
      blockCacheRevision=revision;
    }
    const key=inlineKey(source);
    if(blockTranslationCache.has(key))return blockTranslationCache.get(key);
    const result=reconstructCompleteBlock(source);
    if(blockTranslationCache.size>=600)blockTranslationCache.delete(blockTranslationCache.keys().next().value);
    blockTranslationCache.set(key,result);return result;
  }
  function reconstructCompleteBlock(source){
    // Reconstruction de blocs complets (libellés séparés, BR, plusieurs paragraphes).
    let text=inlineKey(source),changed=false;
    const pairs=matchingBlockPairs(text);
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
  for(const {en,fr}of entries.values())if(en.length>=35){const key=inlineKey(en);completePairs.set(key,fr);if(/^Traduction (?:de|proposée)\b/.test(termMeta(normalize(en)).source||''))localCorrections.add(key);}
  // Les références SRD sont embarquées ; les corrections de l’extrait utilisateur restent prioritaires.
  for(const pair of COMPLETE_TEXTS){const key=inlineKey(pair.en),correction=/^Traduction (?:de|proposée)\b/.test(pair.source);if(correction)localCorrections.add(key);if(!completePairs.has(key)||correction)completePairs.set(key,pair.fr);}

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
        for(const pair of saved.sources)if(Array.isArray(pair)&&pair.length===2&&typeof pair[0]==='string'&&typeof pair[1]==='string'&&AIDEDD_KINDS.some(kind=>aideddURL(pair[1],kind)||aideddURL(pair[1],kind,'legacy-en')||aideddURL(pair[1],kind,'legacy-fr'))){const key=inlineKey(pair[0]);if(saved.validationVersion!==2||!referenceCompatible(key,inlinePairs.get(key)||'')){inlinePairs.delete(key);continue;}if(inlinePairs.get(key))inlineSources.set(key,pair[1]);}
      // Une ancienne paire sans provenance vérifiable doit être relue depuis
      // sa référence ; elle ne devient pas une traduction locale de confiance.
      for(const [key,value]of inlinePairs)if(value!==null&&!inlineSources.has(key))inlinePairs.delete(key);
    }
  }catch{}

  // Diagnostic local, volontaire : aucune persistance ni envoi du rapport.
  const diagnosticMarks=new Set();let pageDiagnosticReport=null,descriptionDiagnosticReport=null,pageScanToken=0;
  const diagnosticStyle=document.createElement('style');
  diagnosticStyle.textContent='[data-shard-fr-diagnostic]{outline:2px dashed #db921f!important;outline-offset:3px!important}[data-shard-fr-description-missing]{outline:2px solid #ef4444!important;outline-offset:-2px!important}';document.head.append(diagnosticStyle);
  const englishClue=/\b(?:the|this|these|those|you|your|when|whenever|choose|gain|spell|damage|saving|proficiency|prerequisite|enemies|enemy|target|creature|within|must|cannot|while|during|until|against|each|once|twice|unknown|missing)\b/i;
  // Les matériaux brefs (« a sliver of glass », « a pinch of salt ») ne
  // contiennent pas forcément de mot-clé de règles. L’article seul serait
  // ambigu en français ; exiger aussi la construction anglaise « of/with ».
  const englishFragmentClue=/\b(?:a|an)\s+[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,3}\s+(?:of|with)\s+[a-z][a-z'-]*\b/i;
  const hasEnglishClue=source=>englishClue.test(source)||englishFragmentClue.test(source);
  const diagnosticMaterialValue=/^(?:(?:components|composantes)\s*:\s*)?(?:(?:V|S)\s*,\s*)*M\s*\(([^)]+)\)/i;
  const englishMaterialWords=/\b(?:powder|sand|wire|incense|ash|ashes|fur|feathers?|charcoal|salt|silver|gold|iron|copper|diamonds?|rub(?:y|ies)|sul(?:f|ph)ur|dust|glass|wood|leather|thread|rope|worth|consumed|consumes)\b/i;
  const looksEnglishMaterial=source=>/^(?:a|an|some)\s+[a-z]/i.test(source.trim())||englishMaterialWords.test(source);
  const equipmentFieldStart=/^\s*(?:ability|caractéristique|utilize|utilisation|craft|fabrication|variants|variantes)\s*:/i;
  const equipmentEnglishLabel=/\b(?:ability|utilize|craft|variants)\s*:/i;
  const equipmentInstruction=/(?:\b(?:seal|pry|draft|improve|detect|discern|assemble|mend|sew|chisel|add|repair|paint|write|modify|create|build|open|close|remove|replace)|(?:^\s*(?:Intelligence\s+)?|(?:Utilize|Utilisation)\s*:\s*)(?:identify|carve|mimic|duplicate|play|improvise|pick|disarm))\b[^.!?]*\b(?:a|an|the|or|of|to|in|on|its|which|it|that|is|are|with)\b/i;
  function diagnosticBlockContext(el,contexts,visibleCache){
    const block=el.closest('p,li,td,th')||el;
    if(!contexts.has(block))contexts.set(block,blockNodes(block).filter(n=>diagnosticVisible(n.parentElement,visibleCache)).map(originalNode).join(''));
    return contexts.get(block);
  }
  function hasEquipmentEnglish(source,el,contexts,visibleCache){
    // Les champs d’outils contiennent des impératifs et des listes de noms,
    // souvent sans « you/spell/damage ». Le contexte est obligatoire pour ne
    // pas étendre ces indices aux noms propres ou à toute la prose française.
    const knownFrench=knownDiagnosticFrench();
    const englishValue=source.split(/[,;:\n]/).flatMap(value=>[value,...value.split(/\b(?:or|and)\b/i)]).some(value=>{
      // Les variantes d’instruments ajoutent leur prix et leur poids au nom.
      const text=value.trim().replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*(?:gp|sp|cp|ep|pp|po|pa|pc|pe|lb)\b[^)]*\)?\s*$/i,'').trim(),entry=entries.get(normalize(text));
      return entry&&normalize(entry.en)!==normalize(entry.fr)&&!knownFrench.has(inlineKey(text));
    });
    if(!equipmentEnglishLabel.test(source)&&!equipmentInstruction.test(source)&&!englishValue)return false;
    return equipmentFieldStart.test(source)||equipmentFieldStart.test(diagnosticBlockContext(el,contexts,visibleCache));
  }
  function hasDiagnosticEnglish(source,el,contexts,visibleCache){
    if(hasEnglishClue(source)||hasEquipmentEnglish(source,el,contexts,visibleCache))return true;
    const material=diagnosticMaterialValue.exec(source);
    if(material)return looksEnglishMaterial(material[1]);
    if(!looksEnglishMaterial(source))return false;
    // Un span isolé peut contenir le matériau : confirmer le champ Composantes
    // dans son paragraphe, sans lire les valeurs ni les contenus masqués.
    const field=diagnosticMaterialValue.exec(diagnosticBlockContext(el,contexts,visibleCache).trim());
    return !!field&&looksEnglishMaterial(field[1]);
  }
  const frenchClue=/[àâçéèêëîïôùûüÿœæ]|\b(?:le|la|les|des|du|une|un|vos|vous|votre|avec|pour|dans|sont)\b/i;
  const diagnosticSelector='p,li,td,th,h1,h2,h3,h4,h5,h6,[role="heading"],.titletext,button,label,option,.description,.pre-wrap,.stdcontent,div';
  const diagnosticIgnoredLabels=new Set(['source','sources','shard','shard tabletop','shard tabletap']);
  const diagnosticBookLabel=/^(?:d\s*&\s*d(?:\s+(?:2014|2024))?\s+(?:phb|mm|dmg|player's handbook|monster manual|dungeon master's guide)|(?:player's handbook|monster manual|dungeon master's guide)(?:\s*\((?:2014|2024)\))?|srd\s+5\.[12](?:\.\d+)?|shard (?:player's guide|bestiary)(?:\s+volume\s+\d+)?)$/i;
  function ignoredDiagnosticLabel(source,books){
    // Correspondances complètes uniquement : ne pas masquer une règle qui cite un livre.
    const normalized=normalize(source);
    if(diagnosticIgnoredLabels.has(normalized.replace(/[.:]$/,'').trim()))return true;
    const label=normalized.replace(/^sources?(?:\s*[.:]\s*|\s+)/,'').replace(/[.:]$/,'').trim();
    return diagnosticIgnoredLabels.has(label)||books.has(label)||diagnosticBookLabel.test(label)||(/^sources?[.:\s]/.test(normalized)&&label.split(/\s*[,;]\s*/).every(part=>books.has(part)||diagnosticBookLabel.test(part)));
  }
  function diagnosticFormulaOnly(source){
    // Les variables Shard restent opaques, même quand le reste du paragraphe est traduit.
    return /\{[^{}]*\}/.test(source)&&!/\p{L}/u.test(source.replace(/\{[^{}]*\}/g,'').replace(/\d*d\d+s?/gi,''));
  }
  function clearDiagnostics(){clearPageDiagnostics();clearDescriptionDiagnostics();}
  function clearDescriptionDiagnostics(){stopDescriptionCheck(true);resetDescriptionChecks();}
  function clearPageDiagnostics(){
    pageScanToken++;pageScanWaiting=false;$('scanMissing').disabled=!!descriptionRun;
    for(const el of diagnosticMarks)el.removeAttribute('data-shard-fr-diagnostic');
    diagnosticMarks.clear();pageDiagnosticReport=null;$('missingResults').replaceChildren();$('missingStatus').textContent='';$('exportMissing').disabled=true;
  }
  function diagnosticVisible(el,cache){
    if(!el)return true;
    if(cache.has(el))return cache.get(el);
    const css=getComputedStyle(el);
    const visible=!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&css.display!=='none'&&css.visibility!=='hidden'&&css.visibility!=='collapse'&&diagnosticVisible(el.parentElement,cache);
    cache.set(el,visible);return visible;
  }
  function diagnosticReason(el,source){
    if(!enabled)return 'translation-disabled';
    const key=inlineKey(source);
    if(inlinePairs.get(key)===null)return 'conflicting-translations';
    if(lookupPair(key)||translate(source)!==source)return 'unrecognized-layout';
    const region=el.closest('article,[role="dialog"]'),title=region?.querySelector('h1,h2,h3,[role="heading"],.titletext');
    const rows=title?inlineChoices(normalize(blockEnglish(title))):[];
    const states=rows.map(row=>inlineLoads.get(row.url)?.state);
    if(states.includes('pending'))return 'reference-loading';
    if(states.includes('error'))return 'reference-unavailable';
    return 'missing-translation';
  }
  const diagnosticLabels={'translation-disabled':'Traduction désactivée','conflicting-translations':'Traductions contradictoires','unrecognized-layout':'Traduction connue, structure à vérifier','reference-loading':'Référence en cours de chargement','reference-unavailable':'Référence distante indisponible','missing-translation':'Correspondance absente ou formulation différente'};
  let diagnosticFrenchRevision=-1,diagnosticFrenchValues=new Set();
  function knownDiagnosticFrench(){
    if(diagnosticFrenchRevision!==revision){
      diagnosticFrenchValues=new Set([...entries.values()].map(row=>inlineKey(row.fr)));
      for(const fr of [...completePairs.values(),...inlinePairs.values()])if(fr)diagnosticFrenchValues.add(inlineKey(fr));
      diagnosticFrenchRevision=revision;
    }
    return diagnosticFrenchValues;
  }
  function collectDiagnostics(root=document.body,mark=true,attributes=true){
    const resultLimit=analysisResultLimit||Infinity,nodeLimit=analysisNodeLimit||Infinity;
    const knownFrench=knownDiagnosticFrench();
    const missing=[],seen=new Map(),visibleCache=new WeakMap(),blockContexts=new WeakMap();let examined=0,truncated=false;
    const books=new Set();
    // Les titres de suppléments inconnus sont attestés par la mention Source de Shard.
    for(const el of document.querySelectorAll('.titletext[title],.titletext [title]')){
      if(excluded(el)||!diagnosticVisible(el,visibleCache)||!/^sources?[.:]?$/i.test(el.textContent.trim()))continue;
      const title=attrState.get(el)?.get('title')?.original??el.getAttribute('title');
      if(title?.trim())books.add(normalize(title));
    }
    const add=(el,source,attribute=null,displayed=null,residual=false)=>{
      source=source.replace(/\s+/g,' ').trim();
      if(!source||!/[a-zA-Z]/.test(source)||/^(?:\d+)?d\d+$/i.test(source)||/^\d+(?:[.,]\d+)?\s*lb\.?$/i.test(source)||diagnosticFormulaOnly(source)||knownFrench.has(inlineKey(source))||ignoredDiagnosticLabel(source,books))return;
      const expected=lookupPair(inlineKey(source))||translate(source,creatureSavingThrowCell(el,source)?'creature ability saving throws':source);
      const current=attribute?el.getAttribute(attribute):(displayed??el.textContent);
      if(!residual&&inlineKey(current||'')===inlineKey(expected)&&inlineKey(expected)!==inlineKey(source))return;
      const isLabel=attribute||source.length<100&&!el.matches('p,li,.description,.pre-wrap');
      const english=hasDiagnosticEnglish(source,el,blockContexts,visibleCache);
      if(!isLabel&&!english)return;
      if(isLabel&&!english&&frenchClue.test(source))return;
      const reason=residual?'unrecognized-layout':diagnosticReason(el,source),key=inlineKey(source)+'|'+reason+'|'+(attribute||'');
      if(seen.has(key)){seen.get(key).occurrences++;}
      else{
        if(missing.length>=resultLimit){truncated=true;return;}
        const region=el.closest('article,[role="dialog"],section'),heading=region?.querySelector('h1,h2,h3,[role="heading"],.titletext');
        const context=heading&&diagnosticVisible(heading,visibleCache)?blockNodes(heading).filter(n=>diagnosticVisible(n.parentElement,visibleCache)).map(originalNode).join('').trim().slice(0,150):'';
        const row={en:source,kind:isLabel?'term':'description',reason,context,occurrences:1};
        if(attribute)row.attribute=attribute;
        seen.set(key,row);missing.push(row);
      }
      if(mark){el.setAttribute('data-shard-fr-diagnostic','');diagnosticMarks.add(el);}
    };
    // Attribuer chaque nœud à son bloc une seule fois, au lieu de reparcourir
    // le sous-arbre de chacun de ses ancêtres (livres et dialogues imbriqués).
    const ownedNodes=new Map(),walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>{
      if(n.nodeType===1)return excluded(n)||!diagnosticVisible(n,visibleCache)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    }});
    let node;while((node=walker.nextNode())){
      if(excluded(node.parentElement)||!diagnosticVisible(node.parentElement,visibleCache))continue;
      const owner=node.parentElement.closest(diagnosticSelector)||node.parentElement.closest('span,a');
      if(!owner)continue;if(!ownedNodes.has(owner))ownedNodes.set(owner,[]);ownedNodes.get(owner).push(node);
    }
    for(const el of [root,...root.querySelectorAll(diagnosticSelector+',span,a')]){
      if(++examined>nodeLimit){truncated=true;break;}
      if(excluded(el)||!diagnosticVisible(el,visibleCache))continue;
      const nodes=ownedNodes.get(el)||[],source=nodes.map(originalNode).join('');
      // Si une partie du bloc est déjà française, ne rapporter que le reliquat.
      const changed=nodes.some(n=>n.data!==originalNode(n));
      const remainder=changed?nodes.filter(n=>n.data===originalNode(n)).map(n=>n.data).join(''):source;
      const displayed=nodes.map(n=>n.data).join(''),material=changed?diagnosticMaterialValue.exec(displayed.trim()):null;
      // Une substitution de quelques mots dans un même nœud ne prouve pas que
      // tout le champ est traduit. Conserver l’anglais original dans le rapport.
      if(changed&&!knownFrench.has(inlineKey(displayed))&&((material&&looksEnglishMaterial(material[1]))||hasEquipmentEnglish(displayed,el,blockContexts,visibleCache)))add(el,source,null,displayed,true);
      else if(!changed||hasDiagnosticEnglish(remainder,el,blockContexts,visibleCache))add(el,remainder,null,displayed);
    }
    for(const el of attributes?root.querySelectorAll(ATTRS.map(attr=>'['+attr+']').join(',')):[]){
      if(++examined>nodeLimit){truncated=true;break;}
      if(el.closest('[data-shard-fr-ignore],script,style,iframe,svg,textarea,[role="textbox"],[contenteditable]:not([contenteditable="false"]),.ql-editor,.ProseMirror,.CodeMirror,.monaco-editor')||!diagnosticVisible(el,visibleCache))continue;
      for(const attr of ATTRS){const current=el.getAttribute(attr);if(current===null)continue;const state=attrState.get(el)?.get(attr);if(state&&current===state.output&&state.output!==state.original)continue;add(el,current,attr);}
    }
    return {missing,truncated};
  }
  function scanDiagnostics(){
    // Le clic peut suivre une mutation dans la même tâche JavaScript, avant
    // la livraison de MutationObserver. L’inclure dans la file avant d’attendre.
    // Une invalidation peut elle-même restaurer d’autres fragments : les
    // remettre aussi en file avant d’évaluer si la traduction est terminée.
    let mutations;while((mutations=observer.takeRecords()).length)handleMutations(mutations);
    clearPageDiagnostics();
    const token=pageScanToken;
    // Le livre peut contenir des milliers de nœuds encore dans la file de traduction.
    // Attendre leur traitement évite de déclarer absents des textes déjà connus.
    function finish(){
      if(token!==pageScanToken)return;
      if(scheduled){setTimeout(finish,30);return;}
      pageScanWaiting=false;
      const {missing,truncated}=collectDiagnostics();
      pageDiagnosticReport={schemaVersion:1,scriptVersion:SCRIPT_VERSION,scope:'visible-page',translationEnabled:enabled,limits:analysisLimits(),truncated,missingCount:missing.length,missing};
      $('missingStatus').textContent=missing.length+' candidat(s) à vérifier.'+(truncated?' Analyse limitée : augmente les limites ou saisis 0 pour les supprimer, puis relance.':'')+(!enabled?' Active la traduction, puis relance l’analyse.':'');
      for(const row of missing){const item=document.createElement('li'),text=document.createElement('span'),detail=document.createElement('small');text.textContent=row.en;detail.textContent=diagnosticLabels[row.reason]+(row.context?' · '+row.context:'')+(row.occurrences>1?' · '+row.occurrences+' occurrences':'');item.append(text,detail);$('missingResults').append(item);}
      $('exportMissing').disabled=false;$('scanMissing').disabled=false;
    }
    pageScanWaiting=true;$('scanMissing').disabled=true;
    $('missingStatus').textContent='Traduction de la page en cours… Analyse dès la fin du traitement.';
    finish();
  }
  // Les états décrivent uniquement le texte des fiches effectivement examinées.
  let descriptionStates=new WeakMap(),descriptionSelection=null,descriptionRun=null,descriptionTimer=null,descriptionAction=false;
  const descriptionBadges=new Set(),descriptionMarkedCells=new Set(),descriptionChecks=new Map(),descriptionScans=new WeakMap();
  const descriptionLabels={'edition-unavailable':'Version 2024 indisponible',unchecked:'Description : non vérifiée',checking:'Description : vérification…',incomplete:'Description : à compléter',clear:'Description : aucun anglais repéré',empty:'Sans description',unavailable:'Description : vérification impossible',loading:'Description : chargement à vérifier'};
  function catalogueCells(){
    if(!/^#(?:spell|item|monster|feat)(?:\?|$)/.test(location.hash))return [];
    const visibleCache=new WeakMap();
    return [...document.querySelectorAll('td.hoverhighlight.w-100')].filter(el=>!excluded(el)&&!el.closest('[role="dialog"]')&&diagnosticVisible(el,visibleCache));
  }
  function catalogueEntry(cell){
    const node=blockNodes(cell).find(n=>n.data.trim());
    return {cell,name:node?originalNode(node).trim():''};
  }
  function descriptionBadge(entry,status){
    if(!entry.cell.isConnected)return;
    descriptionStates.set(entry.cell,{name:entry.name,status});
    if(status==='incomplete'){entry.cell.setAttribute('data-shard-fr-description-missing','');descriptionMarkedCells.add(entry.cell);}
    else{entry.cell.removeAttribute('data-shard-fr-description-missing');descriptionMarkedCells.delete(entry.cell);}
    let badge=entry.cell.querySelector('[data-shard-fr-description-status]');
    if(status==='clear'||status==='empty'){
      if(badge){badge.remove();descriptionBadges.delete(badge);}return;
    }
    if(!badge){badge=document.createElement('small');badge.setAttribute('data-shard-fr-ignore','');badge.setAttribute('data-shard-fr-description-status','');badge.style.cssText='display:block;font-size:12px;font-weight:600;line-height:1.5;color:inherit';entry.cell.append(badge);descriptionBadges.add(badge);}
    const text=descriptionLabels[status]||descriptionLabels.unchecked;
    if(badge.textContent!==text)badge.textContent=text;
  }
  function removeDescriptionBadge(cell){
    cell.removeAttribute('data-shard-fr-description-missing');descriptionMarkedCells.delete(cell);
    const badge=cell.querySelector('[data-shard-fr-description-status]');if(badge){badge.remove();descriptionBadges.delete(badge);}
    descriptionStates.delete(cell);descriptionChecks.delete(cell);
  }
  function resetDescriptionChecks(){
    clearTimeout(descriptionTimer);descriptionTimer=null;descriptionSelection=null;descriptionStates=new WeakMap();descriptionChecks.clear();
    for(const badge of descriptionBadges)badge.remove();descriptionBadges.clear();
    for(const cell of descriptionMarkedCells)cell.removeAttribute('data-shard-fr-description-missing');descriptionMarkedCells.clear();
    descriptionDiagnosticReport=null;$('exportDescriptions').disabled=true;
    $('descriptionResults').replaceChildren();$('descriptionStatus').textContent='';$('descriptionSummary').textContent='';
  }
  function descriptionDialog(entry){
    const dialogs=[...document.querySelectorAll('[role="dialog"]')].filter(el=>diagnosticVisible(el,new WeakMap()));
    if(dialogs.length!==1)return null;
    const dialog=dialogs[0],title=dialog.querySelector('.MuiDialogTitle-root .titletext');
    return title&&inlineKey(blockEnglish(title))===inlineKey(entry.name)?dialog:null;
  }
  // Shard demande parfois la source dans un menu avant d’ouvrir la fiche.
  // Le premier livre est la source principale : une mention secondaire de 2024
  // dans une ancienne fiche ne suffit pas à en faire une version 2024.
  function descriptionSourceMenu(previous){
    const visibleCache=new WeakMap();
    const menus=[...document.querySelectorAll('[role="menu"]')].filter(menu=>!previous.has(menu)&&diagnosticVisible(menu,visibleCache));
    for(const menu of menus){
      const items=[...menu.querySelectorAll(':scope > [role="menuitem"]')];
      if(!items.length||!items.every(item=>{const source=item.querySelector('b[title]');return source&&/^source\s*\.?\s*$/i.test(blockEnglish(source).trim());}))continue;
      const preferred={spell:'PHB',feat:'PHB',monster:'MM',item:'DMG'}[location.hash.match(/^#([^?]+)/)?.[1]];
      const choices=items.map(item=>({item,book:item.querySelector('b[title]').getAttribute('title').trim()}))
        .filter(row=>!row.item.matches('[aria-disabled="true"],.Mui-disabled')&&!row.item.disabled&&diagnosticVisible(row.item,visibleCache)&&/^D\s*&\s*D\s+2024\b/i.test(row.book))
        .sort((a,b)=>Number(!a.book.includes(preferred))-Number(!b.book.includes(preferred)));
      return {menu,choice:choices[0]||null};
    }
    return null;
  }
  function dismissDescriptionSource(menu){
    if(!menu?.isConnected)return;
    descriptionAction=true;
    try{menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));}
    finally{descriptionAction=false;}
  }
  function descriptionClose(dialog){
    return [...dialog.querySelectorAll('.MuiDialogActions-root button')].find(b=>!b.disabled&&/^(?:close|fermer)$/i.test(blockEnglish(b).trim()));
  }
  function descriptionClick(el){descriptionAction=true;try{el.click();}finally{descriptionAction=false;}}
  function descriptionBusy(dialog){
    let state=descriptionScans.get(dialog);
    if(!state||state.text!==dialog.textContent){state={text:dialog.textContent,iterator:scan(dialog),done:false};descriptionScans.set(dialog,state);}
    const start=performance.now();
    while(!state.done&&performance.now()-start<12)state.done=state.iterator.next().done;
    state.text=dialog.textContent;return !state.done;
  }
  function checkDescription(entry,dialog,loading=false){
    const roots=[...dialog.querySelectorAll('.MuiDialogContent-root .pre-wrap')].filter(el=>!excluded(el)&&diagnosticVisible(el,new WeakMap()));
    if(!roots.length)return {name:entry.name,status:'unavailable',missing:[]};
    const missing=[],seen=new Set();let hasText=false,truncated=false;
    for(const root of roots){
      hasText ||= blockNodes(root).some(n=>diagnosticVisible(n.parentElement,new WeakMap())&&n.data.trim());
      const result=collectDiagnostics(root,false,false);truncated ||= result.truncated;
      for(const row of result.missing){const key=inlineKey(row.en);if(!seen.has(key)){missing.push(row);seen.add(key);}}
    }
    return {name:entry.name,status:!hasText?(loading?'loading':'empty'):missing.length?(loading||missing.some(r=>r.reason==='reference-loading')?'loading':'incomplete'):truncated?'unavailable':'clear',truncated,missing};
  }
  function recordDescription(entry,result){
    result.limits=analysisLimits();
    descriptionBadge(entry,result.status);descriptionChecks.set(entry.cell,result);
    renderDescriptionReport([...descriptionChecks.values()]);
  }
  function renderDescriptionReport(descriptions){
    $('descriptionResults').replaceChildren();
    for(const row of descriptions.filter(row=>row.status!=='clear')){
      const li=document.createElement('li');li.dataset.state=row.status;li.textContent=row.name+' — '+descriptionLabels[row.status]+(row.missing.length?' ('+row.missing.length+' candidat(s))':'');$('descriptionResults').append(li);
    }
    // Même format de candidats que l’analyse de page, plus l’état de chaque fiche.
    const missing=descriptions.flatMap(row=>row.missing);
    descriptionDiagnosticReport={schemaVersion:1,scriptVersion:SCRIPT_VERSION,scope:'catalogue-descriptions',translationEnabled:enabled,limits:analysisLimits(),truncated:descriptions.some(row=>row.truncated),missingCount:missing.length,missing,descriptions};
    $('descriptionSummary').textContent=descriptions.length+' fiche(s) contrôlée(s) · '+descriptions.filter(row=>row.status==='incomplete').length+' à compléter.';
    $('exportDescriptions').disabled=false;
  }
  function scheduleDescriptionStatus(){
    if(!enabled||!$('showDescriptionStatus').checked||descriptionTimer)return;
    descriptionTimer=setTimeout(()=>{
      descriptionTimer=null;
      for(const cell of catalogueCells()){
        const entry=catalogueEntry(cell),state=descriptionStates.get(cell);
        if(state&&state.name!==entry.name){
          removeDescriptionBadge(cell);
        }
      }
      if(descriptionRun||!descriptionSelection||!enabled)return;
      const entry=descriptionSelection,dialog=descriptionDialog(entry);
      if(!entry.cell.isConnected){descriptionSelection=null;return;}
      if(!dialog)return;
      if(descriptionBusy(dialog)){scheduleDescriptionStatus();return;}
      const fingerprint=dialog.textContent;
      if(entry.fingerprint===fingerprint)return;
      recordDescription(entry,checkDescription(entry,dialog));entry.fingerprint=dialog.textContent;
    },200);
  }
  function stopDescriptionCheck(discard=false,close=true){
    if(descriptionRun){descriptionRun.cancelled=true;descriptionRun.discard ||= discard;descriptionRun.close=close;}
  }
  const descriptionPause=()=>new Promise(resolve=>setTimeout(resolve,50));
  async function scanDescriptions(){
    if(descriptionRun)return;
    if(!enabled){$('descriptionStatus').textContent='Active la traduction avant de vérifier les descriptions.';return;}
    if(document.querySelector('[role="dialog"]')){$('descriptionStatus').textContent='Ferme la fiche ouverte avant de lancer la vérification de la liste.';return;}
    const all=catalogueCells().map(catalogueEntry).filter(e=>e.name),pendingEntries=all.filter(e=>{const result=descriptionChecks.get(e.cell);return !result||result.name!==e.name||['loading','unavailable'].includes(result.status);});
    const batchLimit=descriptionBatchLimit,entries=batchLimit?pendingEntries.slice(0,batchLimit):pendingEntries;
    if(!entries.length){$('descriptionStatus').textContent=all.length?'Toutes les entrées chargées ont été vérifiées. Fais défiler la liste pour charger les suivantes.':'Ouvre une liste de sorts, objets, monstres ou dons.';return;}
    const run={cancelled:false,discard:false,close:true,hash:location.hash,dialog:null,entry:null,sourceMenu:null,menusBefore:null,sourceBook:null,skipped:0};descriptionRun=run;
    $('inspectDescriptions').disabled=true;$('stopDescriptions').disabled=false;$('scanMissing').disabled=true;
    for(const id of ['analysisResultLimit','analysisNodeLimit','descriptionBatchLimit'])$(id).disabled=true;
    let checked=0;
    try{
      for(const entry of entries){
        if(run.cancelled||location.hash!==run.hash)break;
        if(!entry.cell.isConnected||catalogueEntry(entry.cell).name!==entry.name){run.cancelled=true;break;}
        if(document.querySelector('[role="dialog"]')){run.cancelled=true;run.close=false;break;}
        run.entry=entry;descriptionBadge(entry,'checking');$('descriptionStatus').textContent='Vérification '+(checked+1)+' / '+entries.length+' : '+entry.name;
        run.menusBefore=new Set(document.querySelectorAll('[role="menu"]'));run.sourceMenu=null;run.sourceBook=null;
        descriptionClick(entry.cell);
        let dialog=null,skipEdition=false;
        for(let attempt=0;attempt<80&&!run.cancelled;attempt++){
          await descriptionPause();if(location.hash!==run.hash){run.cancelled=true;run.close=false;break;}
          if(run.cancelled)break;
          const source=descriptionSourceMenu(run.menusBefore);
          if(source){
            run.sourceMenu=source.menu;
            if(!source.choice){skipEdition=true;dismissDescriptionSource(source.menu);break;}
            if(!run.sourceBook){run.sourceBook=source.choice.book;descriptionClick(source.choice.item);}
            continue;
          }
          dialog=descriptionDialog(entry);if(dialog)break;
        }
        if(run.cancelled)break;
        if(skipEdition){
          for(let attempt=0;attempt<40&&run.sourceMenu?.isConnected&&!run.cancelled;attempt++)await descriptionPause();
          if(run.cancelled)break;
          recordDescription(entry,{name:entry.name,status:'edition-unavailable',missing:[],preferredEdition:'2024'});run.skipped++;
          if(run.sourceMenu?.isConnected){run.cancelled=true;break;}
          run.sourceMenu=null;continue;
        }
        if(!dialog){recordDescription(entry,{name:entry.name,status:'unavailable',missing:[]});run.cancelled=true;break;}
        run.dialog=dialog;
        let stable=0;
        for(let attempt=0;attempt<40&&!run.cancelled;attempt++){
          await descriptionPause();
          if(descriptionDialog(entry)!==dialog){run.cancelled=true;run.close=false;break;}
          stable=descriptionBusy(dialog)?0:stable+1;if(stable>=3)break;
        }
        if(run.cancelled)break;
        const result=checkDescription(entry,dialog,stable<3);if(run.sourceBook)result.sourceBook=run.sourceBook;
        recordDescription(entry,result);checked++;
        const close=descriptionClose(dialog);
        if(!close){run.cancelled=true;run.close=false;break;}
        descriptionClick(close);
        for(let attempt=0;attempt<40&&dialog.isConnected&&!run.cancelled;attempt++)await descriptionPause();
        if(dialog.isConnected){run.cancelled=true;run.close=false;break;}
        run.dialog=null;
      }
    }catch{run.cancelled=true;}
    finally{
      const sourceMenu=run.sourceMenu?.isConnected?run.sourceMenu:run.menusBefore?descriptionSourceMenu(run.menusBefore)?.menu:null;
      if(run.close&&location.hash===run.hash&&sourceMenu)dismissDescriptionSource(sourceMenu);
      const owned=run.entry&&descriptionDialog(run.entry);
      if(run.close&&location.hash===run.hash&&owned&&(!run.dialog||owned===run.dialog)){const close=descriptionClose(owned);if(close)descriptionClick(close);}
      if(!run.discard){
        for(const entry of entries)if(descriptionStates.get(entry.cell)?.status==='checking'){
          const previous=descriptionChecks.get(entry.cell);
          if(previous?.name===entry.name)descriptionBadge(entry,previous.status);else removeDescriptionBadge(entry.cell);
        }
        $('descriptionStatus').textContent=(run.cancelled?'Vérification arrêtée. ':'Vérification terminée. ')+checked+' / '+entries.length+' fiche(s) vérifiée(s).'+(run.skipped?' '+run.skipped+' sans version 2024.':'')+(batchLimit&&pendingEntries.length>batchLimit?' Limite de '+batchLimit+' fiches par passage ; augmente-la ou relance pour poursuivre.':' Fais défiler la liste pour charger les suivantes.');
      }
      descriptionRun=null;$('inspectDescriptions').disabled=!$('showDescriptionStatus').checked;$('stopDescriptions').disabled=true;$('scanMissing').disabled=false;descriptionSelection=null;
      for(const id of ['analysisResultLimit','analysisNodeLimit','descriptionBatchLimit'])$(id).disabled=false;
    }
  }
  $('showDescriptionStatus').onchange=()=>{
    if(!$('showDescriptionStatus').checked)clearDescriptionDiagnostics();
    $('inspectDescriptions').disabled=!$('showDescriptionStatus').checked||!!descriptionRun;scheduleDescriptionStatus();
  };
  $('inspectDescriptions').onclick=scanDescriptions;$('stopDescriptions').onclick=()=>stopDescriptionCheck();
  for(const [id,get,set]of [
    ['analysisResultLimit',()=>analysisResultLimit,value=>analysisResultLimit=value],
    ['analysisNodeLimit',()=>analysisNodeLimit,value=>analysisNodeLimit=value],
    ['descriptionBatchLimit',()=>descriptionBatchLimit,value=>descriptionBatchLimit=value]
  ]){
    const input=$(id);input.value=String(get());
    input.oninput=()=>input.setCustomValidity('');
    input.onchange=()=>{
      const value=input.valueAsNumber;
      if(!input.value.trim()||!Number.isSafeInteger(value)||value<0){input.setCustomValidity('Saisis un entier positif ou 0 pour supprimer la limite.');input.reportValidity();return;}
      input.setCustomValidity('');set(value);
      settings={...settings,analysisResultLimit,analysisNodeLimit,descriptionBatchLimit};GM_setValue(KEY,JSON.stringify(settings));
    };
  }
  // Le clic manuel met aussi l’état à jour, sans imposer un parcours automatique.
  document.addEventListener('click',event=>{
    if(descriptionAction||!$('showDescriptionStatus').checked||event.composedPath().includes(host))return;
    if(descriptionRun)stopDescriptionCheck(false,false);
    const cell=event.target instanceof Element?event.target.closest('td.hoverhighlight.w-100'):null;
    descriptionSelection=cell&&catalogueCells().includes(cell)?catalogueEntry(cell):null;scheduleDescriptionStatus();
  },true);
  for(const type of ['input','change'])document.addEventListener(type,event=>{
    if(descriptionRun&&!event.composedPath().includes(host))stopDescriptionCheck(false,false);
  },true);

  $('scanMissing').onclick=scanDiagnostics;$('clearMissing').onclick=clearPageDiagnostics;$('clearDescriptions').onclick=clearDescriptionDiagnostics;
  function exportDiagnosticReport(report,filename){
    if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('exportMissing').onclick=()=>exportDiagnosticReport(pageDiagnosticReport,'shard-dnd-fr-page.json');
  $('exportDescriptions').onclick=()=>exportDiagnosticReport(descriptionDiagnosticReport,'shard-dnd-fr-descriptions.json');
  window.addEventListener('hashchange',clearDiagnostics);

  function applyPlacement(){
    const top=buttonPosition.startsWith('top'),right=buttonPosition.endsWith('right');
    host.style.top=top?'16px':'auto';host.style.bottom=top?'auto':'16px';host.style.left=right?'auto':'16px';host.style.right=right?'16px':'auto';
    host.style.display='flex';host.style.flexDirection=top?'column-reverse':'column';host.style.alignItems=right?'flex-end':'flex-start';
    badge.hidden=!showButton;
    for(const button of $('buttonPosition').querySelectorAll('[data-position]'))button.setAttribute('aria-pressed',String(showButton&&button.dataset.position===buttonPosition));
    $('hideButton').setAttribute('aria-pressed',String(!showButton));
  }
  for(const button of $('buttonPosition').querySelectorAll('[data-position]'))button.onclick=()=>{buttonPosition=button.dataset.position;showButton=true;persist();};
  $('hideButton').onclick=()=>{showButton=!showButton;persist();};
  document.addEventListener('keydown',e=>{if(e.altKey&&e.shiftKey&&e.code==='KeyF'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(!e.repeat)openPanel();}});
  badge.onclick=openPanel;$('close').onclick=closePanel;
  shadow.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();e.stopPropagation();closePanel();}});
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
