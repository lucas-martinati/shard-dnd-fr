"""Découper les aptitudes par titres bilingues et générer les variantes de référence Shard."""
import json
import re
from translation_sources import tsv_sources
from pathlib import Path
from translation_packs import key, signature, load_packs
from translation_sources import source as translation_source, DICTIONARIES

ROOT = Path(__file__).resolve().parent.parent
TABLE = json.loads((ROOT/'translations/dnd-2024/phb/classes/sections-bilingues.json').read_text())['headings']
ROWS = json.loads((ROOT/'work/generated/class-texts.json').read_text())
existing_pairs={key(r['en']):r['fr'] for r in load_packs() if r['kind']=='description'}
reserved=set(existing_pairs)
for path in tsv_sources():
    for line in path.read_text().splitlines():
        if line.count('|')==1 and len(line.split('|')[0])>=35:
            en,fr=line.split('|');reserved.add(key(en));existing_pairs.setdefault(key(en),fr)
for filename in ['work/generated/feat-texts.json','translations/dnd-2024/phb/objets/descriptions-srd.json']:
    for row in json.loads((ROOT/filename).read_text()):
        reserved.add(key(row['en']));existing_pairs[key(row['en'])]=row['fr']
pairs, ambiguous = {}, set()
canonical={}
for _,name in DICTIONARIES:
    for line in translation_source(name+'.tsv').read_text().splitlines():
        if line.count('|')==1:
            en,fr=line.split('|');canonical[key(en)]=fr
canonical.update({key(row['en']):row['fr'] for row in load_packs() if row['kind']=='term'})


def add(en, fr, source):
    en,fr=en.strip(),fr.strip()
    if not en or not fr or key(en) in reserved or key(en) in ambiguous:return
    dice=lambda text:[s.rstrip('s').lower() for s in re.findall(r'\b(?:\d+)?[dD]\d+s?\b',text)]
    if signature(en)!=signature(fr) or dice(en)!=dice(fr):return
    normalized=key(en)
    if normalized in pairs and key(pairs[normalized]['fr'])!=key(fr):
        pairs.pop(normalized);ambiguous.add(normalized);return
    pairs[normalized]={'en':en,'fr':fr,'source':source}


def positions(text, language):
    hits=[]
    for heading in TABLE:
        names=[heading['en']] if language=='en' else list(dict.fromkeys(heading['fr']+[canonical.get(key(heading['en']),heading['fr'][0])]))
        matches=[]
        for name in names:
            pattern=r'(?:^|(?<=[.!?:])\s+)('+re.escape(name)+r'(?: \((?:Cost|coût) :?\s*[^)]+\))?\.)\s+'
            pattern=pattern.replace('Cost|coût','Cost:|coût :')
            matches.extend(re.finditer(pattern,text,re.I))
        unique={m.start(1):m for m in matches}
        if len(unique)==1:
            m=next(iter(unique.values()));hits.append({'id':heading['en'],'start':m.start(1),'end':m.end(),'label':m[1]})
    hits.sort(key=lambda hit:hit['start'])
    return hits


class_order=list(dict.fromkeys(row['class'] for row in ROWS))
subclass_names=[line.split('|') for line in translation_source('creation-2024.tsv').read_text().splitlines()[:48]]
subclass_groups={cls:subclass_names[i*4:(i+1)*4] for i,cls in enumerate(class_order)}
for row in ROWS:
    source='SRD 5.2.1 EN/FR · sous-section de '+row['class']+' / '+row['name']
    en,fr=row['en'],row['fr']
    # Les titres restent compatibles avec les libellés déjà traduits dans les balises de gras.
    replacements=[]
    for hit in positions(fr,'fr'):
        label=hit['label'];heading=next(h for h in TABLE if h['en']==hit['id'])
        target=canonical.get(key(hit['id']),heading['fr'][0])
        old=next((name for name in heading['fr'] if label.lower().startswith(name.lower())),None)
        if old:replacements.append((hit['start'],hit['start']+len(old),target))
    for start,end,value in sorted(replacements,reverse=True):fr=fr[:start]+value+fr[end:]
    # La référence au chapitre est une variante éditoriale précise, sans modifier les règles.
    if 'See “Spells” for the rules on spellcasting.' in en and 'Reportez-vous à la section « Sorts » pour les règles d’incantation.' in fr:
        add(en.replace('See “Spells” for the rules on spellcasting.','See chapter 7 for the rules on spellcasting.'),fr.replace('Reportez-vous à la section « Sorts » pour les règles d’incantation.','Reportez-vous au chapitre 7 pour les règles d’incantation.'),source)
    hits={lang:positions(text,lang) for lang,text in [('en',en),('fr',fr)]}
    sections={}
    for lang,text in [('en',en),('fr',fr)]:
        sections[lang]={}
        for i,hit in enumerate(hits[lang]):
            end=hits[lang][i+1]['start'] if i+1<len(hits[lang]) else len(text)
            sections[lang][hit['id']]={'full':text[hit['start']:end].strip(),'body':text[hit['end']:end].strip(),'label':hit['label']}
    if hits['en'] and hits['fr']:
        intro_en=en[:hits['en'][0]['start']].strip();intro_fr=fr[:hits['fr'][0]['start']].strip()
        add(intro_en,intro_fr,source)
        if 'See “Spells”' in intro_en and 'Reportez-vous à la section « Sorts »' in intro_fr:
            add(intro_en.replace('See “Spells”','See chapter 7'),intro_fr.replace('Reportez-vous à la section « Sorts »','Reportez-vous au chapitre 7'),source)
    for label in sorted(sections['en'].keys() & sections['fr'].keys()):
        a,b=sections['en'][label],sections['fr'][label]
        body=existing_pairs.get(key(a['body']),b['body'])
        add(a['full'],b['label']+' '+body,source)
        add(a['body'],body,source)
        add(a['label'],b['label'],source)
    if row['name'].endswith('Subclass'):
        en_short=re.sub(r' The .+? subclass is detailed after this class’s description\.','',en)
        fr_short=re.sub(r' La sous-classe .+? est détaillée après la description de cette classe\.','',fr)
        add(en_short,fr_short,source)
        english_names=[name[0] for name in subclass_groups[row['class']]]
        french_names=[name[1] for name in subclass_groups[row['class']]]
        en_listing=', '.join(english_names[:-1])+', and '+english_names[-1]
        fr_listing=', '.join(french_names[:-1])+' et '+french_names[-1]
        en_full=en_short.replace('. ','. The '+en_listing+' subclasses are detailed after this class’s description. ',1)
        fr_full=fr_short.replace('. ','. Les sous-classes '+fr_listing+' sont détaillées après la description de cette classe. ',1)
        add(en_full,fr_full,source)
        # Les trois phrases génériques peuvent être affichées séparément dans toutes les classes.
        ens=re.split(r'(?<=[.])\s+',en_short);frs=re.split(r'(?<=[.])\s+',fr_short)
        if len(ens)==len(frs)==3:
            for a,b in zip(ens,frs):add(a,b,source)
(ROOT/'work/generated/class-sections.json').write_text(json.dumps(list(pairs.values()),ensure_ascii=False,indent=2)+'\n')
print(f'{len(pairs)} sous-sections et variantes des 12 classes ; {len(ambiguous)} ambiguïtés exclues')
