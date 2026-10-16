from translation_sources import source as translation_source
import json,re
from pathlib import Path
from translation_packs import load_packs, check_existing, key
root=Path(__file__).resolve().parent/'generated';pairs=[]
def add(en,fr,source):
 if en and fr:pairs.append({'en':en,'fr':fr,'source':source})
def flat(s):return re.sub(r'\s+',' ',s).strip()
adaptations=json.loads(translation_source('spell-reference.json').with_name('decoupage-srd.json').read_text()).get('frenchReplacements',{})
for r in json.loads(translation_source('spell-reference.json').read_text()):
 fr_body=r['frenchBody']
 for before,after in adaptations.get(r['en'],[]):fr_body=fr_body.replace(before,after)
 add(r['englishBody'],fr_body,'SRD 5.2.1 FR · adapté aux valeurs et unités de Shard · CC-BY-4.0' if fr_body!=r['frenchBody'] else 'SRD 5.2.1 FR')
 en=flat(r['english']);fr=flat(r['french']);en=en.split(flat(r['englishBody'])[:70])[0];fr=fr.split(flat(r['frenchBody'])[:70])[0]
 labels=[('Casting Time','Temps d’incantation'),('Range','Portée'),('Components','Composantes'),('Duration','Durée')]
 for i,(a,b) in enumerate(labels):
  ae=re.escape(labels[i+1][0])+r'\s*:' if i<3 else '$';be=re.escape(labels[i+1][1])+r'\s*:' if i<3 else '$'
  x=re.search(re.escape(a)+r'\s*:\s*(.*?)(?='+ae+')',en);y=re.search(re.escape(b)+r'\s*:\s*(.*?)(?='+be+')',fr)
  if x and y:
   v=x[1].strip();w=y[1].strip();add(a+': '+v,b+' : '+w,'SRD 5.2.1 FR');add(v,w,'SRD 5.2.1 FR')
for row in json.loads(translation_source('equipment-texts.json').read_text()):add(row['en'],row['fr'],row['source'])
for row in json.loads(translation_source('feat-texts.json').read_text()):add(row['en'],row['fr'],row['source'])
for line in translation_source('metamagic-descriptions.tsv').read_text().splitlines():
 en,fr=line.split('|');add(en,fr,'Traduction de l’extrait utilisateur · métamagie et Source de magie anciennes')
for row in json.loads((root/'spell-sections.json').read_text()):add(row['en'],row['fr'],row['source'])
pack_rows=load_packs()
check_existing(pack_rows,pairs)
for row in pack_rows:
 if row['kind']=='description':add(row['en'],row['fr'],row['source'])
# Le corpus de classes complète les sources existantes sans les remplacer.
known={key(row['en']) for row in pairs}
for row in json.loads((root/'class-texts.json').read_text())+json.loads((root/'option-texts.json').read_text())+json.loads((root/'class-sections.json').read_text()):
 if key(row['en']) not in known:
  add(row['en'],row['fr'],row['source']);known.add(key(row['en']))
(root/'complete-texts.json').write_text(json.dumps(pairs,ensure_ascii=False,separators=(',',':')))
print(len(pairs),'paires de descriptions et champs complets')
