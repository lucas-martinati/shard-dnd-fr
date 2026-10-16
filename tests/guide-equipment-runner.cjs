const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'shard-guide-test-'));
(async()=>{try{
 const statuses=await Promise.all([0,1,2,3].map(part=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,'test-guide-equipment.cjs'),String(part),path.join(directory,part+'.json')],{stdio:'inherit'});child.on('error',reject);child.on('close',resolve);})));
 const results=[0,1,2,3].map(part=>JSON.parse(fs.readFileSync(path.join(directory,part+'.json'),'utf8'))),failures=results.flatMap(r=>r.failures),diagnostics=results.flatMap(r=>r.diagnostics),report={...results[0].report};
 for(const key of ['blocsControles','poidsControles','liensControles','desControles','anglaisRepere','ecartsDeRendu'])report[key]=results.reduce((sum,r)=>sum+r.report[key],0);
 fs.writeFileSync('audit/generes/guide-equipment.json',JSON.stringify(report,null,2)+'\n');
 if(failures.length||diagnostics.length)fs.writeFileSync('/tmp/shard-guide-test-failures.json',JSON.stringify({failures,diagnostics},null,2));
 assert.ok(statuses.every(code=>code===0),'Contrôle du guide : '+failures.length+' écarts et '+diagnostics.length+' candidats');
 console.log(`PASS guide : 2 chapitres et liste, 239 notices, 1372 fiches ; ${report.blocsControles} blocs, ${report.liensControles} liens et ${report.desControles} dés ; poids et contenu anglais restauré.`);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
