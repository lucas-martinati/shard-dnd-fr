const fs=require('node:fs'),{performance}=require('node:perf_hooks'),{JSDOM}=require('jsdom');
const scriptFlag=process.argv.indexOf('--script'),scriptPath=scriptFlag>=0?process.argv[scriptFlag+1]:'outputs/shard-dnd-fr.user.js';
if(!scriptPath)throw Error('--script attend un chemin de userscript');
const code=fs.readFileSync(scriptPath,'utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function setup(html){
  const w=new JSDOM(html,{url:'https://play.shardtabletop.com/',runScripts:'outside-only',pretendToBeVisual:true}).window;
  w.GM_getValue=(key,fallback)=>fallback;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};return w;
}
async function until(fn){const deadline=performance.now()+30000;while(!fn()){if(performance.now()>deadline)throw Error('Le parcours du DOM dépasse 30 secondes');await pause(10);}}
(async()=>{
  const startupMs=[],domRuns=[],descriptionRuns=[];
  for(let i=0;i<5;i++){const w=setup('<div>Character</div>');try{const start=performance.now();w.eval(code);startupMs.push(performance.now()-start);}finally{w.close();}}
  for(let run=0;run<3;run++){
    const count=400,w=setup('<main>'+('<p>Fireball</p><p>Character</p>').repeat(count/2)+'</main>'),blocks=[...w.document.querySelectorAll('main p')];
    let timer;
    try{
      let last=performance.now(),maxEventLoopDelayMs=0;
      timer=setInterval(()=>{const now=performance.now();maxEventLoopDelayMs=Math.max(maxEventLoopDelayMs,now-last-10);last=now;},10);
      const start=performance.now();w.eval(code);const initialized=performance.now();
      await until(()=>blocks.every((el,i)=>el.textContent===(i%2?'Personnage':'Boule de feu')));const translated=performance.now();
      for(const el of blocks.slice(0,100))el.textContent='Fire Bolt';
      await until(()=>blocks.slice(0,100).every(el=>el.textContent==='Trait de feu'));const mutated=performance.now();
      const root=[...w.document.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(root=>root?.getElementById('enabled'));
      const enabled=root.getElementById('enabled');enabled.checked=false;enabled.dispatchEvent(new w.Event('change'));
      await until(()=>blocks.every((el,i)=>el.textContent===(i<100?'Fire Bolt':i%2?'Character':'Fireball')));
      domRuns.push({blocks:count,mutatedBlocks:100,startupMs:initialized-start,firstScanMs:translated-initialized,mutationScanMs:mutated-translated,restoreMs:performance.now()-mutated,maxEventLoopDelayMs});
    }finally{clearInterval(timer);w.close();}
  }
  // Même corpus avant/après : textes complets, paragraphes inconnus uniques,
  // composants partiellement traduits et conteneurs imbriqués comme un livre.
  const known=JSON.parse(fs.readFileSync('tests/fixtures/spell-paragraphs-2024.json','utf8')).find(row=>row.en.length>100);
  for(let run=0;run<3;run++){
    const html=Array.from({length:20},(_,i)=>'<div><div><div><p>'+known.en+'</p><p>You discover an unfamiliar lunar mechanism numbered '+i+'. Its shimmering gears reveal an unexplained secret beneath the ancient sky.</p><p><b>Components:</b> V, S, M (fine unnamed mineral dust)</p></div></div></div>').join('');
    const w=setup('<main>'+html+'<button id="sentinel">Close</button></main>');
    try{
      const start=performance.now();w.eval(code);const initialized=performance.now();
      await until(()=>w.document.getElementById('sentinel').textContent==='Fermer');
      const translated=performance.now(),root=[...w.document.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('scanMissing'));
      const diagnosticMs=[];
      for(let i=0;i<3;i++){const scan=performance.now();root.getElementById('scanMissing').click();await until(()=>!root.getElementById('scanMissing').disabled);diagnosticMs.push(performance.now()-scan);}
      descriptionRuns.push({blocks:60,startupMs:initialized-start,firstScanMs:translated-initialized,diagnosticMs,diagnosticStatus:root.getElementById('missingStatus').textContent});
    }finally{w.close();}
  }
  console.log(JSON.stringify({scriptPath,startupMs,medianMs:median(startupMs),domRuns,medianFirstScanMs:median(domRuns.map(row=>row.firstScanMs)),medianMutationScanMs:median(domRuns.map(row=>row.mutationScanMs)),descriptionRuns,medianDescriptionScanMs:median(descriptionRuns.map(row=>row.firstScanMs)),medianDiagnosticMs:median(descriptionRuns.flatMap(row=>row.diagnosticMs)),note:'JSDOM sur la même machine, sans réseau : 400 libellés, 100 mutations, restauration, 60 blocs de description imbriqués et trois analyses de page. Les délais incluent les timers ; ce benchmark ne remplace pas une mesure dans Shard.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
