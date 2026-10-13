const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8'),source='https://www.aidedd.org/monster/fr/aboleth';
const cases=[
  ['The moon creature cannot take Reactions for 1 minute.','La créature lunaire ne peut pas effectuer de réactions pendant 1 minute.',true],
  ['The sun creature cannot take Reactions for 2 minutes.','La créature solaire peut effectuer des réactions pendant 2 minutes.',false],
  ['The star creature gains 3 Temporary Hit Points.','La créature stellaire gagne 4 points de vie temporaires.',false],
  ['The void creature deals 3d9 Force damage.','La créature du vide inflige 9d3 dégâts de force.',false],
  ['The cloud creature moves 10 feet.','La créature des nuages se déplace de 10 feet.',false],
  ['The sky creature rolls d6s.','La créature céleste lance des d6.',true],
  ['The sea creature rolls d8.','La créature marine obtient 8.',false],
];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(fn){for(let i=0;i<200&&!fn();i++)await pause(25);assert.ok(fn(),'Cache translation timed out');}
function setup(validationVersion){
  const w=new JSDOM('<main>'+cases.map(([en])=>'<p>'+en+'</p>').join('')+'</main>',{url:'https://play.shardtabletop.com/',runScripts:'outside-only',pretendToBeVisual:true}).window;
  w.GM_getValue=(key,fallback)=>key==='shard-fr-descriptions-v18'?JSON.stringify({savedAt:Date.now(),validationVersion,pairs:cases.map(([en,fr])=>[en,fr]),sources:cases.filter((row,i)=>i!==4).map(([en])=>[en,source])}):fallback;
  w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.eval(code);return w;
}
(async()=>{
  const w=setup(2);
  try{
    const blocks=[...w.document.querySelectorAll('main p')];await wait(()=>cases.every(([en,fr,accepted],i)=>blocks[i].textContent===(accepted?fr:en)));
    cases.forEach(([en,fr,accepted],i)=>assert.equal(blocks[i].textContent,accepted?fr:en));
  }finally{w.close();}
  const old=setup(1);
  try{
    await wait(()=>[...old.document.querySelectorAll('[data-shard-fr-ignore]')].some(el=>el.shadowRoot?.getElementById('enabled')));
    await pause(100);
    assert.deepEqual([...old.document.querySelectorAll('main p')].map(el=>el.textContent),cases.map(([en])=>en),'Les anciennes paires doivent être relues depuis la référence');
  }finally{old.close();}
  console.log('PASS cache distant: provenance obligatoire, nouvelle validation, négations, valeurs et dés incompatibles refusés, paire compatible conservée.');
})().catch(error=>{console.error(error);process.exitCode=1;});
