const fs=require('node:fs'),assert=require('node:assert/strict');
const script=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const meta=fs.readFileSync('outputs/shard-dnd-fr.meta.js','utf8');
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const header=/^\/\/ ==UserScript==\n[\s\S]*?^\/\/ ==\/UserScript==$/m.exec(script);
assert.ok(header,'Missing userscript metadata');
assert.equal(meta,header[0]+'\n','The update file must contain only the exact userscript metadata');
const fields=new Map();
for(const match of meta.matchAll(/^\/\/ @(\S+)\s+(.+)$/gm)){
  if(['name','namespace','version','updateURL','downloadURL'].includes(match[1])){
    assert.ok(!fields.has(match[1]),'Duplicate '+match[1]);
    fields.set(match[1],match[2]);
  }
}
assert.ok(fields.get('name'));assert.ok(fields.get('namespace'));
assert.equal(fields.get('version'),version);
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
assert.equal(lock.version,version);
assert.equal(lock.packages[''].version,version);
assert.equal(JSON.parse(fs.readFileSync('outputs/lexique-en-fr.json','utf8')).version,version);
assert.ok(script.includes('const SCRIPT_VERSION = '+JSON.stringify(version)+';'));
assert.match(fs.readFileSync('work/header.txt','utf8'),/^\/\/ @version\s+\{\{VERSION\}\}$/m);
const base='https://raw.githubusercontent.com/lucas-martinati/shard-dnd-fr/main/outputs/';
assert.equal(fields.get('updateURL'),base+'shard-dnd-fr.meta.js');
assert.equal(fields.get('downloadURL'),base+'shard-dnd-fr.user.js');
console.log('PASS release: métadonnées identiques, version du package, URLs de mise à jour et téléchargement.');
