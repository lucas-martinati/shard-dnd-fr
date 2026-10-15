from translation_sources import source as translation_source, DICTIONARIES
from pathlib import Path
import json,re,unicodedata
from translation_packs import load_packs
from version import sync_lock
root=Path(__file__).resolve().parent.parent
out=root/'outputs';work=root/'work'
version=sync_lock(root)
pack_rows=load_packs()
pack_terms={row['en']:row for row in pack_rows if row['kind']=='term'}
# Ordre explicite : références vérifiées prioritaires, puis corrections personnelles à l’exécution.
modules=DICTIONARIES
def norm(s):return re.sub(r'\s+',' ',re.sub('[‐‑–]','-',re.sub('[’‘ʼ]',"'",unicodedata.normalize('NFC',s)))).strip().lower()
meta={};records={};parts=[]
oldheader=(work/'header.txt').read_text().replace('{{VERSION}}',version)
metadata=re.match(r'\A// ==UserScript==\r?\n[\s\S]*?^// ==/UserScript==\s*$',oldheader,re.M)
if not metadata:raise ValueError('Bloc de métadonnées Tampermonkey absent de work/header.txt')
parts=[oldheader,'(() => {\n"use strict";\n']
def emit_constant(name,value):
 # Toutes les données générées occupent une ligne ; les retours des textes
 # restent échappés dans les chaînes et les sources JSON restent lisibles.
 literal=json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('\u2028',r'\u2028').replace('\u2029',r'\u2029')
 parts.append('const '+name+' = '+literal+';\n')
emit_constant('SCRIPT_VERSION',version)
for const,name in modules:
 data=translation_source(name+'.tsv').read_text()
 if name=='feature-terms' and pack_terms:data=data.rstrip()+'\n'+'\n'.join(r['en']+'|'+r['fr'] for r in pack_terms.values())+'\n'
 lines=data.strip().splitlines()
 for i,line in enumerate(lines):
  assert line.count('|')==1,(name,line)
  en,fr=line.split('|');key=norm(en)
  source='Traduction proposée ou usuelle (non vérifiée intégralement)';category='vocabulaire'
  if name.startswith('canonical') or name=='combat-descriptions':source='SRD officiel 5.2.1 FR · CC-BY-4.0'
  elif name=='creation-2024' and i<48:source='AideDD · index des sous-classes 2024 (noms)'
  if name=='feature-terms' and en in pack_terms:source=pack_terms[en]['source']
  if en=='Dungeon Delver':source='AideDD · index des dons 2014 (nom)'
  if 'spells' in name:category='sort'
  elif name=='creation-2024':category='création de personnage'
  elif name=='canonical-features':category='aptitude de classe'
  elif name=='canonical-combat':category='combat'
  elif name=='monsters':category='monstre'
  elif name in ['equipment','magic-items']:category='équipement'
  elif 'description' in name:category='description'
  if name=='feature-terms' and en in pack_terms:category={'armes':'équipement','objets':'équipement','classes':'aptitude de classe','sorts':'sort','monstres':'monstre','dons':'don','especes':'trait d’espèce','regles':'règles','interface':'interface'}.get(pack_terms[en]['category'],category)
  previous=records.get(key,{})
  aliases=previous.get('aliases',[])
  if previous.get('fr') and norm(previous['fr'])!=norm(fr):aliases=list(dict.fromkeys(aliases+[previous['fr']]))
  if name=='feature-terms' and en in pack_terms:aliases=list(dict.fromkeys(aliases+pack_terms[en].get('aliases',[])))
  records[key]={'en':en,'fr':fr,'category':category,'source':source,'aliases':aliases}
  meta[key]={'source':source,'category':category,'aliases':aliases}
 emit_constant(const,data)
refs=json.loads(translation_source('spell-reference.json').read_text())
# La version officielle peut employer des noms génériques pour les sorts nommés.
for r in refs:r.pop('english',None)
aliases={"Bigby's Hand":"Arcane Hand","Mordenkainen's Sword":"Arcane Sword","Tasha's Hideous Laughter":"Hideous Laughter","Nystul's Magic Aura":"Arcanist's Magic Aura","Melf's Acid Arrow":"Acid Arrow","Leomund's Secret Chest":"Secret Chest","Leomund's Tiny Hut":"Tiny Hut","Tenser's Floating Disk":"Floating Disk","Rary's Telepathic Bond":"Telepathic Bond","Mordenkainen's Private Sanctum":"Private Sanctum","Mordenkainen's Magnificent Mansion":"Magnificent Mansion","Mordenkainen's Faithful Hound":"Faithful Hound","Evard's Black Tentacles":"Black Tentacles","Otiluke's Resilient Sphere":"Resilient Sphere","Otiluke's Freezing Sphere":"Freezing Sphere","Otto's Irresistible Dance":"Irresistible Dance","Drawmij's Instant Summons":"Instant Summons"}
known={r['en'] for r in refs}
assert all(v in known for v in aliases.values()),set(aliases.values())-known
emit_constant('REFERENCE_ALIASES',aliases)
emit_constant('SPELL_REFERENCE',refs)
emit_constant('TERM_META',meta)
catalog=json.loads((root/'sources-generation/catalogues/aidedd-2024.json').read_text())
for r in catalog:
 if r['en']=='Witch Bolt':r['aliases'].append('Éclair de sorcière')
emit_constant('AIDEDD_CATALOG',catalog)
emit_constant('LEGACY_CATALOG',json.loads((root/'sources-generation/catalogues/2014.json').read_text()))
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
print(len(records),'entrées ;',len(refs),'descriptions ;',len(''.join(parts)),'caractères')
