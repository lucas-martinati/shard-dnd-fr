// Index publics uniquement : noms et liens, aucune description stockée dans le catalogue.
const AIDEDD_KINDS = ['spell','monster','feat','invocation','magic-item'];
function aideddURL(value, kind, index=false) {
  try {
    const u=new URL(value,'https://www.aidedd.org');
    const legacyFile={spell:'sorts',monster:'monstres',feat:'dons',invocation:'invocations','magic-item':'om'}[kind];
    if(index==='legacy-en'||index==='legacy-fr'){const param=index==='legacy-en'?'vo':'vf';return u.protocol==='https:'&&u.hostname==='www.aidedd.org'&&!u.username&&!u.password&&!u.port&&!u.hash&&u.pathname===`/dnd/${legacyFile}.php`&&[...u.searchParams].length===1&&/^[a-z0-9-]+$/.test(u.searchParams.get(param)||'')?u.href:null;}
    return u.protocol==='https:' && u.hostname==='www.aidedd.org' && !u.username && !u.password && !u.port && !u.search && !u.hash && AIDEDD_KINDS.includes(kind) &&
      (index==='en' ? new RegExp(`^/${kind}/[a-z0-9-]+/?$`).test(u.pathname) : index ? u.pathname===`/${kind}/fr/` : new RegExp(`^/${kind}/fr/[a-z0-9-]+/?$`).test(u.pathname)) ? u.href : null;
  } catch {return null;}
}
function parseAideDDCatalog(html,kind) {
  const doc=new DOMParser().parseFromString(html,'text/html'), rows=[];
  for(const tr of doc.querySelectorAll('tr')) {
    const cells=tr.querySelectorAll(':scope > td'), link=cells[1]?.querySelector('a[href]');
    const url=link && aideddURL(link.getAttribute('href'),kind);
    if(!url || cells.length<5)continue;
    const en=cells[4].textContent.trim(), alternatives=link.textContent.trim().split('|').map(s=>s.trim()).filter(Boolean),fr=alternatives[0];
    if(!en || !fr || en.length>150 || fr.length>180)continue;
    rows.push({en,fr,kind,url,aliases:alternatives.slice(1)});
  }
  const unique=new Map(rows.map(r=>[r.en.toLowerCase(),r]));
  if(unique.size<10)throw Error('Index AideDD incomplet ou format modifié : '+kind);
  return [...unique.values()];
}
function parseAideDDPage(html, row) {
  const doc=new DOMParser().parseFromString(html,'text/html');
  const content=doc.querySelector('.col1'),title=content?.querySelector('h1')?.textContent.trim();
  if(!content || !title)throw Error('Fiche indisponible ou format AideDD modifié.');
  const canonical=doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if(canonical && aideddURL(canonical,row.kind,row.edition==='2014'?'legacy-'+(row.lang||'fr'):row.lang==='en'?'en':false)!==row.url)throw Error('La fiche reçue ne correspond pas au lien demandé.');
  const base=new URL(doc.querySelector('base[href]')?.getAttribute('href')||'.',row.url).href;
  const enLink=[...content.querySelectorAll('.trad a[href]')].find(a=>/\[EN\]/.test(a.textContent)||a.getAttribute('href').includes('?vo='));
  const frLink=[...content.querySelectorAll('.trad a[href]')].find(a=>/\[FR\]/.test(a.textContent)||a.getAttribute('href').includes('?vf='));
  const frenchURL=frLink?aideddURL(new URL(frLink.getAttribute('href'),base).href,row.kind,row.edition==='2014'?'legacy-fr':false):null;
  const englishURL=enLink?aideddURL(new URL(enLink.getAttribute('href'),base).href,row.kind,row.edition==='2014'?'legacy-en':'en'):null;
  // Ne conserver que le texte de la fiche : ni scripts, ni images, ni publicités, ni HTML distant actif.
  content.querySelectorAll('script,style,iframe,object,embed,form,input,button,svg,img,link,meta,.trad,.noprint').forEach(n=>n.remove());
  function plain(node) {
    if(node.nodeType===3)return node.textContent;
    if(node.nodeType!==1)return '';
    if(node.tagName==='BR')return '\n';
    const value=Array.from(node.childNodes,plain).join('');
    if(['TD','TH'].includes(node.tagName))return value+'\t';
    return /^(DIV|P|H[1-6]|TR|TABLE|LI|UL|SECTION)$/.test(node.tagName)?'\n'+value+'\n':value;
  }
  const text=plain(content).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(text.length<30 || text.length>100000)throw Error('Contenu de fiche inattendu.');
  const clean=node=>plain(node).replace(/\s+/g,' ').trim();
  const description=content.querySelector('.description');
  // Garder les limites visuelles et les titres. Aucun HTML distant n’est réinjecté.
  const blocks=[];let buffer='',heading='';
  function flushBlock(){const value=buffer.replace(/\s+/g,' ').trim();if(value)blocks.push({text:value,heading,body:heading?value.slice(heading.length).replace(/^[\s.:]+/,''):value});buffer='';heading='';}
  function collectBlocks(node){
    if(node.nodeType===3){buffer+=node.textContent;return;}
    if(node.nodeType!==1)return;
    if(node.tagName==='TABLE'){flushBlock();return;}
    if(node.tagName==='BR'){flushBlock();return;}
    const boundary=/^(P|DIV|LI|UL|OL|SECTION|H[1-6])$/.test(node.tagName);
    if(boundary)flushBlock();
    if(/^(STRONG|B)$/.test(node.tagName)&&!buffer.trim()){
      const title=clean(node);if(title.length<=150)heading=title;
    }
    for(const child of node.childNodes)collectBlocks(child);
    if(boundary)flushBlock();
  }
  if(description){collectBlocks(description);flushBlock();}
  // Ne pas associer les paragraphes d’un monstre par simple position : les versions peuvent différer.
  const paragraphs=row.kind==='monster'?[]:(description?plain(description).split(/\n+/).map(x=>x.trim()).filter(Boolean):[]);
  const actions=[];
  if(row.kind==='monster'){
    // Les traits, réactions et introductions légendaires ne sont pas dans
    // .description. Garder leurs rubriques et leurs limites de paragraphes.
    let group='traits';
    const groups={'traits':'traits','actions':'actions','bonus actions':'bonus','actions bonus':'bonus','reactions':'reactions','réactions':'reactions','legendary actions':'legendary','actions légendaires':'legendary','lair actions':'lair','actions d’antre':'lair'};
    for(const el of content.querySelectorAll('.sansSerif > *')){
      if(el.matches('h2,h3')){group=groups[clean(el).toLowerCase()]||'other';continue;}
      if(!el.matches('p,.legend'))continue;
      let heading=el.matches('.legend')?'':el.querySelector('strong,b')?.textContent.trim()||'';
      // Certaines fiches mettent tout le paragraphe en gras.
      if(heading.length>150)heading=/^(.{1,100}?)\.\s/.exec(heading)?.[1]||'';
      const text=clean(el),body=heading?text.slice(heading.length).replace(/^[\s.:]+/,''):text;
      if(text)actions.push({heading,text,body,group,paragraphs:plain(el).split(/\n+/).map(s=>s.trim()).filter(Boolean)});
    }
  }
  const fields={};for(const cls of ['t','r','c','d','prerequis']){const el=content.querySelector(':scope > .'+cls);if(el){const full=clean(el);fields[cls]={full,value:full.replace(/^[^:]+:\s*/, '')};}}
  const tables=description?[...description.querySelectorAll('table')].map(t=>[...t.rows].map(r=>[...r.cells].map(clean))):[];
  return {title,text,englishURL,frenchURL,fields,description:description?clean(description):'',paragraphs,blocks,actions,tables};
}
