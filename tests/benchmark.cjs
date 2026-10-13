const fs=require('node:fs'),{performance}=require('node:perf_hooks'),{JSDOM}=require('jsdom');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function setup(html){
  const w=new JSDOM(html,{url:'https://play.shardtabletop.com/',runScripts:'outside-only',pretendToBeVisual:true}).window;
  w.GM_getValue=(key,fallback)=>fallback;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};return w;
}
async function until(fn){const deadline=performance.now()+30000;while(!fn()){if(performance.now()>deadline)throw Error('Le parcours du DOM dépasse 30 secondes');await pause(10);}}
(async()=>{
  const startupMs=[],domRuns=[];
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
  console.log(JSON.stringify({startupMs,medianMs:median(startupMs),domRuns,medianFirstScanMs:median(domRuns.map(row=>row.firstScanMs)),note:'JSDOM sur la même machine, sans réseau : initialisation, traduction de 400 blocs, 100 mutations et restauration. Les délais incluent les timers ; ce benchmark ne remplace pas une mesure dans Shard.'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
