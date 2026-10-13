"""Inventaire des sources : distinguer les noms, la prose et la couverture vérifiée."""
import argparse
import json
from collections import Counter
from pathlib import Path
from translation_packs import ROOT, load_packs
from translation_sources import source

CATEGORIES = ['sorts','dons','classes','especes','objets','armes','monstres','regles','interface']
CATALOG_CATEGORIES = {'spell':'sorts','feat':'dons','invocation':'classes','magic-item':'objets','monster':'monstres'}


def report():
    packs = load_packs()
    names = Counter(CATALOG_CATEGORIES[row['kind']] for row in json.loads((ROOT/'work/aidedd-catalog.json').read_text()))
    categories = {}
    for category in CATEGORIES:
        directory = ROOT/'translations'/category
        terms = set()
        for path in directory.glob('*.tsv'):
            for line in path.read_text().splitlines():
                if line.count('|')==1 and not line.split('|')[0].isdecimal():terms.add(line.split('|')[0])
        rows = [row for row in packs if row['category']==category]
        categories[category] = {'nomsCatalogueAideDD2024':names[category], 'entreesDictionnaires':len(terms), 'blocsEditables':sum(r['kind']=='description' for r in rows)}
    classes = json.loads((ROOT/'work/class-coverage.json').read_text())
    options = json.loads((ROOT/'work/option-coverage.json').read_text())
    per_class = {}
    for name in dict.fromkeys(row['class'] for row in classes):
        rows = [r for r in classes if r['class']==name]
        per_class[name] = {'aptitudesIndexees':len(rows),'proseAppariee':sum(r['description'] for r in rows)}
    return {
        'categories':categories,
        'corpusLocaux':{
            'classesSRD2024':per_class,
            'optionsSRD2024':{kind:{'indexees':sum(r['kind']==kind for r in options),'proseAppariee':sum(r['kind']==kind and r['description'] for r in options)} for kind in ['metamagic','invocation']},
            'sortsSRD2024':len(json.loads(source('spell-reference.json').read_text())),
            'descriptionsEquipementSRD2024':len(json.loads(source('equipment-texts.json').read_text())),
            'blocsDonsEtStylesHistoriques':len(json.loads(source('feat-texts.json').read_text())),
            'armesSRD2024':len(json.loads((ROOT/'translations/armes/catalogue-2024.json').read_text())['weapons']),
            'sousSectionsEtVariantesClasses':len(json.loads((ROOT/'work/class-sections.json').read_text())),
            'nomsSousClassesPHB2024':48,
        },
        'aVerifier':[r for r in classes+options if r['pending']],
        'limites':[
            'Le corpus de classes est celui du SRD 5.2.1 : 12 classes et leurs sous-classes SRD, pas toutes les sous-classes des suppléments.',
            'Prose appariée ne signifie pas que toutes les variantes Shard et toutes les cellules de tableaux sont couvertes.',
            'Les compteurs de noms AideDD ne mesurent pas la couverture des descriptions.',
            'Les descriptions AideDD de sorts, monstres, dons, manifestations et objets sont chargées à la consultation et dépendent du réseau et de la correspondance du texte anglais.',
            'Les blocs historiques de dons ne disposent pas tous d’un identifiant de don : leur couverture par entité est indéterminée.',
            'Les suppléments, contenus maison et textes Shard non présents dans les sources peuvent rester en anglais.',
        ],
    }


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    text=json.dumps(report(),ensure_ascii=False,indent=2)+'\n'
    if args.output:args.output.write_text(text,encoding='utf-8');print(f'Inventaire enregistré : {args.output}')
    else:print(text,end='')
