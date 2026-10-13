"""Aligner les options nommées EN/FR du SRD, indépendamment de leur ordre."""
import json
import re
import runpy
from pathlib import Path
from translation_sources import source
from translation_packs import key, signature, load_packs

ROOT = Path(__file__).resolve().parent.parent
shared = runpy.run_path(str(ROOT/'work/make-class-texts.py'))
flat, units = shared['flat'], shared['units']
texts = {lang:(ROOT/f'data/srd-5.2.1/classes-{lang}.txt').read_text() for lang in ['en','fr']}
names = {}
for path in sorted((ROOT/'translations').rglob('*.tsv')):
    for line in path.read_text().splitlines():
        if line.count('|') == 1:
            en, fr = line.split('|')
            if len(en) < 100:names[en] = fr
for line in source('canonical-combat.tsv').read_text().splitlines():
    en,fr=line.split('|');names[en]=fr
names.update({'Devil’s Sight':'Vision du diable','Fiendish Vigor':'Vigueur fiélonne','Otherworldly Leap':'Saut d’outre-monde','Witch Sight':'Vision sorcière','Misty Visions':'Visions embrumées','Visions of Distant Realms':'Royaumes lointains'})
RANGES = {
    'metamagic': {'en':('Metamagic Options','Sorcerer Spell List'),'fr':('Options de Métamagie','Liste des sorts d’Ensorceleur')},
    'invocation': {'en':('Eldritch Invocation Options','Warlock Spell List'),'fr':('Options de Manifestation occulte','Liste des sorts d’Occultiste')},
}


def heading(name):
    return re.escape(name).replace(r'\ ',r'\s+').replace('’',"['’]").replace("'", "['’]") if '’' not in name else re.escape(name).replace(r'\ ',r'\s+').replace('’',"['’]")


def section(lang, bounds):
    text = texts[lang]
    start = re.search(r'^'+re.escape(bounds[0])+r'$',text,re.M)
    if not start:raise ValueError(f'Section introuvable : {bounds}')
    end = re.search(r'^'+re.escape(bounds[1])+r'$',text[start.end():],re.M)
    if not start or not end:raise ValueError(f'Section introuvable : {bounds}')
    return text[start.end():start.end()+end.start()]


pairs, records = [], []
editorial={}
for path in sorted((ROOT/'translations').rglob('*.tsv')):
    for line in path.read_text().splitlines():
        if line.count('|')==1:
            en,fr=line.split('|')
            if len(en)>=35:editorial[key(en)]=fr
editorial.update({key(r['en']):r['fr'] for r in load_packs() if r['kind']=='description'})
for kind, bounds in RANGES.items():
    content = {lang:section(lang,bounds[lang]) for lang in bounds}
    found = []
    for en,fr in names.items():
        a=re.search(r'^'+heading(en)+r'$',content['en'],re.M);b=re.search(r'^'+heading(fr)+r'$',content['fr'],re.M)
        if a and b and not any(key(old[0])==key(en) for old in found):found.append((en,fr,a,b))
    # Tous les titres détectés doivent être délimités, même si leur traduction est ensuite refusée.
    ends = {lang:sorted((row[2 if lang=='en' else 3].start() for row in found)) for lang in bounds}
    for en,fr,a,b in found:
        blocks={}
        for lang,match in [('en',a),('fr',b)]:
            stop=next((pos for pos in ends[lang] if pos>match.start()),len(content[lang]))
            blocks[lang]=flat(content[lang][match.end():stop],lang)
        translated=editorial.get(key(blocks['en']),units(blocks['fr']))
        if signature(blocks['en'])!=signature(translated):
            records.append({'kind':kind,'en':en,'fr':fr,'description':False,'pending':'valeurs à vérifier'});continue
        dice=lambda s:[d.rstrip('s') for d in re.findall(r'\b(?:\d+)?d\d+s?\b',s.lower())]
        if dice(blocks['en'])!=dice(translated):
            records.append({'kind':kind,'en':en,'fr':fr,'description':False,'pending':'ordre des dés à vérifier'});continue
        source_label='SRD 5.2.1 EN/FR · CC-BY-4.0 · '+kind
        pairs.append({'en':blocks['en'],'fr':translated,'source':source_label})
        # La fiche Shard peut présenter le coût/prérequis dans un champ séparé.
        starts = {
            'en':r'(?<!\w)(?:When you|You |Choose |The |Once per|Whenever |As a |If |While )',
            'fr':r'(?<!\w)(?:Lorsque |Vous |Choisissez |Une fois |Quand |Chaque fois |Par une |Si |Tant que |L’attaque supplémentaire)',
        }
        ea=re.search(starts['en'],blocks['en']);fa=re.search(starts['fr'],translated)
        if ea and fa and ea.start()>0 and fa.start()>0:
            body_en,body_fr=blocks['en'][ea.start():],translated[fa.start():]
            if signature(body_en)==signature(body_fr) and dice(body_en)==dice(body_fr):pairs.append({'en':body_en,'fr':body_fr,'source':source_label})
        records.append({'kind':kind,'en':en,'fr':fr,'description':True,'pending':None})
    minimum=10 if kind=='metamagic' else 20
    if len(found)<minimum:raise ValueError(f'{kind}: trop peu de titres reconnus ({len(found)})')
pairs=[{**row,'fr':editorial.get(key(row['en']),row['fr'])} for row in pairs]
(ROOT/'work/option-texts.json').write_text(json.dumps(pairs,ensure_ascii=False,indent=2)+'\n')
(ROOT/'work/option-coverage.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(f'{len(records)} options nommées ; {len(pairs)} blocs complets et corps sans prérequis/coût')
