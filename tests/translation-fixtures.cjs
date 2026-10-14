const fs=require('node:fs');
const path=require('node:path');
const categories=['classes','dons','sorts','especes','armes','objets','monstres','regles','interface'];
const files=fs.readdirSync('translations',{recursive:true,withFileTypes:true})
 .filter(file=>file.isFile()&&file.name==='traductions.json')
 .map(file=>path.join(file.parentPath,file.name)).sort();
const pack=category=>({entries:files.filter(file=>path.basename(path.dirname(file))===category)
 .flatMap(file=>{
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  return data.entries.map(entry=>({...entry,source:entry.source??data.source,edition:entry.edition??data.edition??'any'}));
 })});
module.exports={pack,entries:()=>categories.flatMap(category=>pack(category).entries)};
