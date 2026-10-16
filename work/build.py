from pathlib import Path
import json,re,unicodedata
from translation_packs import load_packs
from version import sync_lock
root=Path(__file__).resolve().parent.parent
out=root/'outputs';work=root/'work'
version=sync_lock(root)
def norm(s):return re.sub(r'\s+',' ',re.sub('[‐‑–]','-',re.sub('[’‘ʼ]',"'",unicodedata.normalize('NFC',s)))).strip().lower()
labels={'armes':'équipement','objets':'équipement','classes':'aptitude de classe','sorts':'sort','monstres':'monstre','dons':'don','especes':'trait d’espèce','regles':'règles','interface':'interface'}
records={};terms=[]
for row in load_packs():
 usage=row.get('usage', ['search'] if row['kind']=='term' and row['category'] in ['armes','objets','classes','sorts','monstres','dons','especes'] else [])
 if row['kind']!='term' and 'inline' not in usage:continue
 en,fr=row['en'],row['fr'];key=norm(en)
 category=row.get('labelCategory',labels.get(row['category'],'vocabulaire'))
 metadata={'source':row['source'],'category':category,'aliases':row.get('aliases',[]),'usage':usage}
 records[key]={'en':en,'fr':fr,**{k:v for k,v in metadata.items() if k!='usage'}}
 terms.append({'en':en,'fr':fr,**metadata})
oldheader=(work/'header.txt').read_text().replace('{{VERSION}}',version)
metadata=re.match(r'\A// ==UserScript==\r?\n[\s\S]*?^// ==/UserScript==\s*$',oldheader,re.M)
if not metadata:raise ValueError('Bloc de métadonnées Tampermonkey absent de work/header.txt')
parts=[oldheader,'(() => {\n"use strict";\n']
def emit_constant(name,value):
 literal=json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('\u2028',r'\u2028').replace('\u2029',r'\u2029')
 parts.append('const '+name+' = '+literal+';\n')
emit_constant('SCRIPT_VERSION',version)
emit_constant('TRANSLATION_TERMS',terms)
catalog=json.loads((root/'sources-generation/catalogues/aidedd-2024.json').read_text())
for r in catalog:
 if r['en']=='Witch Bolt':r['aliases'].append('Éclair de sorcière')
emit_constant('AIDEDD_CATALOG',catalog)
emit_constant('REFERENCE_CATALOG_2014',json.loads((root/'sources-generation/catalogues/2014.json').read_text()))
emit_constant('COMPLETE_TEXTS',json.loads((work/'generated/complete-texts.json').read_text()))
monster_titles=json.loads((root/'translations/dnd-2024/mm/monstres/titres-aptitudes.json').read_text())['entries']
emit_constant('MONSTER_ACTION_TITLES',monster_titles)
parts.append((work/'aidedd-parser.js').read_text())
parts.append((work/'runtime.js').read_text());parts.append('\n})();\n')
(out/'shard-dnd-fr.user.js').write_text(''.join(parts))
# Tampermonkey vérifie ce petit fichier avant de télécharger le script complet.
# Extraire le bloc final garantit la même version, identité et URLs dans les deux fichiers.
(out/'shard-dnd-fr.meta.js').write_text(metadata[0].rstrip()+'\n',encoding='utf-8')
# Le lexique livré reflète le mode AideDD par défaut ; le SRD reste accessible séparément.
srd_corrections={r['en']:r['fr'] for r in records.values() if r['source'].startswith('SRD officiel')}
labels={'spell':'sort','monster':'monstre','feat':'don','invocation':'manifestation','magic-item':'objet magique'}
for r in catalog:
 key=norm(r['en']);previous=records.get(key,{})
 aliases=list(dict.fromkeys(previous.get('aliases',[])+r.get('aliases',[])+([previous['fr']] if previous.get('fr') else [])))
 records[key]={'en':r['en'],'fr':r['fr'],'category':labels[r['kind']],'source':'AideDD · index 2024','url':r['url'],'aliases':[a for a in aliases if a!=r['fr']]}
(out/'catalogue-aidedd-2024.json').write_text(json.dumps({'date':'2026-10-12','entries':catalog},ensure_ascii=False,indent=2))
(out/'lexique-en-fr.json').write_text(json.dumps({'version':version,'reference':'Noms AideDD 2024 prioritaires. Références SRD disponibles séparément. Autres entrées identifiées.','license':'Code MIT ; contenu SRD CC-BY-4.0 https://creativecommons.org/licenses/by/4.0/','sources':['https://www.dndbeyond.com/srd','https://www.aidedd.org/regles-24/classes/'],'entries':list(records.values())},ensure_ascii=False,indent=2))
(out/'corrections-srd-2024.json').write_text(json.dumps(srd_corrections,ensure_ascii=False,indent=2))
print(len(records),'entrées ;',len(json.loads((work/'generated/complete-texts.json').read_text())),'descriptions ;',len(''.join(parts)),'caractères')
