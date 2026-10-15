// Audit hors ligne des seuls textes publics de sorts, sans champs de campagne.
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const script=option('--script',path.join(root,'outputs/shard-dnd-fr.user.js')),output=option('--output',path.join(root,'audit/generes/sorts-phb-2024.json'));
const rows=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/phb-spells-2024.json'),'utf8'));
const w=new JSDOM('<main></main>',{url:'https://play.shardtabletop.com/#spell',runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document,cases=[];
for(const row of rows){const section=d.createElement('section');section.innerHTML='<h2></h2>'+row.html;section.querySelector('h2').textContent=row.name;d.querySelector('main').append(section);for(const p of section.querySelectorAll('.pre-wrap p,.pre-wrap li'))if(!p.querySelector('p,li'))cases.push({name:row.name,p,en:p.textContent});}
const sentinel=d.createElement('button');sentinel.textContent='Close';d.querySelector('main').append(sentinel);
w.GM_getValue=(k,f)=>f;w.GM_setValue=()=>{};w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=()=>{};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{w.eval(fs.readFileSync(script,'utf8'));for(let i=0;i<3000&&sentinel.textContent!=='Fermer';i++)await pause(250);if(sentinel.textContent!=='Fermer')throw Error('Audit incomplet : parcours DOM non terminé');
 const unchanged=cases.filter(({p,en})=>p.textContent===en&&/[a-z]{3}/.test(en));
 const report={date:'2026-10-15',source:'Fiches Shard du livre D&D 2024 PHB relevées le 15 octobre 2026',scriptVersion:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,fiches:rows.length,paragraphes:cases.length,paragraphesInchanges:unchanged.length,fichesAvecCandidats:new Set(unchanged.map(r=>r.name)).size,note:'Candidats : textes anglais inchangés, y compris légendes, noms propres ou formulations anciennes importées. Ce compteur ne prouve pas à lui seul qu’une fiche est intégralement traduite.',aVerifier:unchanged.map(({name,en})=>({sort:name,en}))};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(`${report.fiches} sorts, ${report.paragraphes} blocs, ${report.paragraphesInchanges} candidats inchangés ; ${path.relative(root,output)}`);
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
