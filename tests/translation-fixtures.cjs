const fs=require('node:fs');
const categories=['classes','dons','sorts','especes','armes','objets','monstres','regles','interface'];
const pack=category=>JSON.parse(fs.readFileSync(`translations/${category}/traductions.json`,'utf8'));
module.exports={pack,entries:()=>categories.flatMap(category=>pack(category).entries)};
