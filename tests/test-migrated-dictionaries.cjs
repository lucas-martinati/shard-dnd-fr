const fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync('outputs/shard-dnd-fr.user.js','utf8');
const constant=name=>JSON.parse(code.match(new RegExp('^const '+name+' = (.*);$','m'))[1]);
const normalize=s=>s.normalize('NFC').replace(/[’‘ʼ]/g,"'").replace(/[‐‑–]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();
const rows=constant('TRANSLATION_TERMS'),terms=new Map(rows.map(row=>[normalize(row.en),row]));
const before=require('./fixtures/migrated-dictionaries.json');
for(const row of before.rows){const current=terms.get(normalize(row.en));assert.equal(normalize(current?.fr||''),normalize(row.fr),row.en);for(const usage of row.usage)assert.ok(current.usage.includes(usage),row.en+' : '+usage);for(const alias of row.aliases)assert.ok(current.aliases.some(a=>normalize(a)===normalize(alias)),row.en+' : '+alias);}
const published=new Map(JSON.parse(fs.readFileSync('outputs/lexique-en-fr.json','utf8')).entries.map(row=>[normalize(row.en),row]));
for(const row of before.publishedAliases){const current=published.get(normalize(row.en)),names=[current?.fr,...current?.aliases||[]].filter(Boolean).map(normalize);for(const alias of row.aliases)assert.ok(names.includes(normalize(alias)),'Ancien alias publié : '+row.en+' / '+alias);}
assert.equal(new Set(constant('COMPLETE_TEXTS').map(r=>normalize(r.en).replace(/\s*([.,;:!?()+])\s*/g,'$1'))).size,constant('COMPLETE_TEXTS').length,'Descriptions uniques');
for(const name of ['MONSTERS','SPELLS','TERMS','EQUIPMENT','INTERFACE','RULES2024','MAGICITEMS','GM','EXPANSION','DESCRIPTIONS','DRUID','CREATION','CANONICAL_SPELLS','CANONICAL_FEATURES','CANONICAL_COMBAT','COMBAT_DESCRIPTIONS','FEATURE_TERMS','REFERENCE_ALIASES','SPELL_REFERENCE','LEGACY_CATALOG','TERM_META'])assert.doesNotMatch(code,new RegExp('^const '+name+' =','m'));
assert.doesNotMatch(fs.readFileSync('work/runtime.js','utf8'),/referenceByEnglish|referenceBodies/);
const completeKeys=new Set(constant('COMPLETE_TEXTS').map(row=>normalize(row.en)));
for(const spell of JSON.parse(fs.readFileSync('translations/dnd-2024/phb/sorts/reference-srd.json','utf8')))assert.ok(completeKeys.has(normalize(spell.englishBody)),'Corps SRD conservé : '+spell.en);
const reported=require('./fixtures/guide-equipment-report-11736.json');
assert.equal(reported.cases.length,reported.reportedCount);
const pairs=[...rows,...constant('COMPLETE_TEXTS')].map(row=>[row.en,row.fr]);
for(const row of reported.cases)assert.ok(pairs.some(([en,fr])=>normalize(en)===normalize(row.en)&&normalize(fr)===normalize(row.fr)),'Extrait du rapport : '+row.en);
console.log(`PASS migration : ${before.rows.length} correspondances historiques, anciens alias et usages préservés ; constantes obsolètes retirées et descriptions uniques.`);
