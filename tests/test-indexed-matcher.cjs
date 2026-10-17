const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const hook='  queue(document.body);\n  if(aideddOnline';
assert.ok(code.includes(hook));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/',runScripts:'outside-only'}).window;
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
try{
  // Accès réservé à cette copie de test : aucune API de debug dans le userscript.
  w.eval(code.replace(hook,`  window.matcherTest={textMatcher,pattern,compile,custom,matcherCache,get keys(){return [tokenMatcherIndex.keys,phraseMatcherIndex.keys]}};\n  if(aideddOnline`));
  const api=w.matcherTest;
  const reference=api.keys.map(keys=>new RegExp('(?<![\\p{L}\\p{N}_])(?:'+keys.map(api.pattern).join('|')+')(?![\\p{L}\\p{N}_])','giu'));
  const matches=(source,re)=>Array.from(source.matchAll(re),m=>[m[0],m.index]);
  const samples=[
    '', '???', 'xyzzy', 'Fireball Fire Bolt Fireball', 'AC 12, HP 30, 60 ft., 2 gp',
    'Hit: 2d6 + 3 fire damage', "Tasha’s\u00a0Hideous\tLaughter", 'TWO–HANDED',
    'ÉFireball Fireballé _Fireball Fireball_ 1Fireball Fireball1',
    'ſleep Knock', '😀Fireball😀', 'Duration: Concentration, up to 10 minutes',
    'You discover an unfamiliar mechanism. '.repeat(16),
    'Fireball; '.repeat(80), 'Aucune traduction partielle de cette phrase française.',
    'Unknown '.repeat(40)+' Magic Missile '+' unknown'.repeat(40)
  ];
  // Comparaison des positions ET des alternatives retenues, avec l’expression
  // complète précédente comme oracle (y compris les paragraphes > 256 caractères).
  for(let i=0;i<api.keys[0].length;i+=113){
    const terms=api.keys[0].slice(i,i+3);
    samples.push(terms.join(' / '),terms.join(' / ').toUpperCase().replace(/ /g,'\u00a0').replace(/'/g,'ʼ').replace(/-/g,'‑'));
  }
  for(const source of samples)for(const prose of [false,true]){
    assert.deepEqual(matches(source,api.textMatcher(source,prose)),matches(source,reference[+prose]),source);
  }
  // Chaque libellé du lexique doit encore se reconnaître, sans omission due
  // aux ancres, y compris les variantes Unicode des lettres ASCII en mode iu.
  const keyCount=api.keys[0].length;
  for(const source of api.keys[0]){
    const variant=source.toUpperCase().replace(/S/g,'ſ').replace(/K/g,'K').replace(/ /g,'\n\t').replace(/'/g,'‘').replace(/-/g,'–');
    assert.equal(matches(source,api.textMatcher(source))[0]?.[0],source);
    assert.equal(matches(variant,api.textMatcher(variant))[0]?.[0],variant);
  }
  assert.ok(api.matcherCache.size<=128,'Cache borné malgré les textes uniques');
  api.custom['Nebulous testword']='Nébuleuse';api.compile();
  assert.equal(matches('Nebulous testword',api.textMatcher('Nebulous testword'))[0][0],'Nebulous testword','Index renouvelé après compilation');
  assert.ok(api.matcherCache.size<=1,'Les anciens motifs sont invalidés');
  console.log(`PASS moteur indexé : ${samples.length} textes comparés au moteur complet dans les deux modes, ${keyCount} libellés et variantes Unicode, priorités, frontières, cache et recompilation.`);
}finally{w.close();}
