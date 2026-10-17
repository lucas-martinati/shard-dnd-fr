// JSDOM par défaut. Chromium optionnel via une installation externe de Playwright :
// --playwright /chemin/vers/playwright --browser /chemin/vers/chrome
const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{JSDOM}=require('jsdom');
const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const scriptPath=option('--script','outputs/shard-dnd-fr.user.js'),groups=Number(option('--groups','200')),runs=Number(option('--runs','3'));
assert.ok(Number.isSafeInteger(groups)&&groups>0&&Number.isSafeInteger(runs)&&runs>0);
const playwrightPath=option('--playwright'),browserPath=option('--browser');
const code=fs.readFileSync(scriptPath,'utf8');
const known=JSON.parse(fs.readFileSync('tests/fixtures/spell-paragraphs-2024.json','utf8')).find(row=>row.en.length>100);
const unknown=i=>`You discover an unfamiliar lunar mechanism numbered ${i}. Its shimmering gears reveal an unexplained secret beneath the ancient sky.`+' You can use your action to investigate this mysterious mechanism and learn its hidden properties.'.repeat(5);
const html='<button id="visible">Close</button><main>'+Array.from({length:groups},(_,i)=>`<div><div><div class="pre-wrap"><p>${known.en}</p><p>${unknown(i)}</p><p><b>Components:</b> V, S, M (fine unnamed mineral dust)</p></div></div></div>`).join('')+'</main>';
// La copie instrumentée distingue l’attente de traduction de l’analyse elle-même.
// Les fonctions et les temporisations du userscript restent celles du fichier testé.
assert.ok(code.includes('  function collectDiagnostics(root=document.body,mark=true,attributes=true){'));
const instrumented=code.replace('  function collectDiagnostics(root=document.body,mark=true,attributes=true){','  function collectDiagnostics(root=document.body,mark=true,attributes=true){\n    window.diagnosticBench.analysisStart=performance.now();')
  .replace('    return {missing,truncated};','    window.diagnosticBench.result={missing,truncated};return {missing,truncated};');
async function measure({code}){
  const w=window,d=w.document;
  w.GM_getValue=(key,fallback)=>key==='shard-fr-v1'?JSON.stringify({analysisResultLimit:0,analysisNodeLimit:0}):fallback;
  w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};
  w.diagnosticBench={};
  const until=async fn=>{const start=performance.now();while(!fn()){if(performance.now()-start>300000)throw Error('Délai supérieur à cinq minutes');await new Promise(resolve=>setTimeout(resolve,10));}};
  const start=performance.now();w.eval(code);const initialized=performance.now();
  await until(()=>d.getElementById('visible').textContent==='Fermer');const visible=performance.now();
  const root=[...d.querySelectorAll('[data-shard-fr-ignore]')].map(el=>el.shadowRoot).find(r=>r?.getElementById('scanMissing'));
  const click=performance.now();root.getElementById('scanMissing').click();
  await until(()=>!root.getElementById('scanMissing').disabled);const complete=performance.now();
  return {startupMs:initialized-start,firstVisibleMs:visible-initialized,translationWaitMs:w.diagnosticBench.analysisStart-click,analysisAndRenderMs:complete-w.diagnosticBench.analysisStart,clickToReportMs:complete-click,result:w.diagnosticBench.result};
}
(async()=>{
  let browser;const measurements=[];
  try{
    if(playwrightPath){browser=await require(playwrightPath).chromium.launch({headless:true,...(browserPath?{executablePath:browserPath}:{})});}
    for(let i=0;i<runs;i++){
      let measurement;
      if(browser){const page=await browser.newPage();try{await page.setContent(html);measurement=await page.evaluate(measure,{code:instrumented});}finally{await page.close();}}
      else{
        const w=new JSDOM(html,{url:'https://play.shardtabletop.com/',runScripts:'outside-only',pretendToBeVisual:true}).window;
        try{measurement=await w.eval('('+measure.toString()+')')({code:instrumented});}finally{w.close();}
      }
      const {result,...timings}=measurement;
      assert.equal(result.truncated,false);
      assert.equal(result.missing.length,groups+1,'Tous les paragraphes inconnus et le matériau, sans faux positifs connus');
      const rows=new Map(result.missing.map(row=>[row.en,row]));
      for(let j=0;j<groups;j++)assert.equal(rows.get(unknown(j))?.occurrences,1);
      assert.equal(result.missing.find(row=>row.en.includes('fine unnamed mineral dust'))?.occurrences,groups);
      measurements.push({...timings,missingCount:result.missing.length,reportSHA256:createHash('sha256').update(JSON.stringify(result)).digest('hex')});
      console.error(`Mesure ${i+1}/${runs} : attente ${Math.round(timings.translationWaitMs)} ms, rapport ${Math.round(timings.clickToReportMs)} ms.`);
    }
    const median=key=>measurements.map(row=>row[key]).sort((a,b)=>a-b)[Math.floor(runs/2)];
    console.log(JSON.stringify({scriptPath,environment:browser?'Chromium '+await browser.version():'Node '+process.version+' / JSDOM',groups,blocks:groups*3,measurements,medianTranslationWaitMs:median('translationWaitMs'),medianClickToReportMs:median('clickToReportMs'),note:'Même HTML hors ligne, limites désactivées. Clic dès le premier libellé visible traduit, avant la fin du parcours. Ne mesure ni Shard connecté ni les références réseau.'},null,2));
  }finally{await browser?.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
