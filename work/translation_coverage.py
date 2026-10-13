"""Inventaire des sources : distinguer les noms, la prose et la couverture vérifiée."""
import argparse
import json
from collections import Counter
from pathlib import Path
from translation_packs import ROOT, load_packs
from translation_packs import key
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
        categories[category] = {'nomsCatalogueAideDD2024':names[category], 'entreesDictionnaires':len(terms), 'libellesEditables':sum(r['kind']=='term' for r in rows), 'blocsEditables':sum(r['kind']=='description' for r in rows)}
    classes = json.loads((ROOT/'work/class-coverage.json').read_text())
    options = json.loads((ROOT/'work/option-coverage.json').read_text())
    per_class = {}
    for name in dict.fromkeys(row['class'] for row in classes):
        rows = [r for r in classes if r['class']==name]
        per_class[name] = {'aptitudesIndexees':len(rows),'proseAppariee':sum(r['description'] for r in rows)}
    conditions = json.loads((ROOT/'translations/regles/etats-2024.json').read_text())['conditions']
    complete = json.loads((ROOT/'work/complete-texts.json').read_text())
    presentations = json.loads((ROOT/'translations/descriptions-visibles.json').read_text())['fiches']
    shard_catalogue = json.loads((ROOT/'translations/regles/conditions-shard.json').read_text())
    shard_conditions = shard_catalogue['fiches']
    condition_details = shard_catalogue['fichesOuvertes']
    pack_ids = {r['id'] for r in packs}
    if any(ident not in pack_ids for f in presentations for ident in f['paragraphes']):
        raise ValueError('Le catalogue des descriptions visibles référence un bloc absent des packs')
    if any(ident not in pack_ids for f in shard_conditions + condition_details for ident in f['sections']):
        raise ValueError('Le catalogue des conditions Shard référence un bloc absent des packs')
    return {
        'categories':categories,
        'corpusLocaux':{
            'descriptionsEtChampsLocauxUniques':len({key(r['en']) for r in complete}),
            'presentationsShard':{
                'fichesRelevees':len(presentations),
                'avecDescription':sum(bool(f['paragraphes']) for f in presentations),
                'paragraphesEtPucesReferences':sum(len(f['paragraphes']) for f in presentations),
                'blocsUniques':len({ident for f in presentations for ident in f['paragraphes']}),
                'parType':{kind:{'fiches2024':sum(f['type']==kind and f['edition']=='2024' for f in presentations),'autresFiches':sum(f['type']==kind and f['edition']!='2024' for f in presentations)} for kind in ['species','subspecies','class','subclass','background']},
            },
            'etatsSRD2024':{'etatsIndexes':len(conditions),'sectionsReferencees':sum(len(c['sections']) for c in conditions),'sectionsUniques':len({ident for c in conditions for ident in c['sections']})},
            'conditionsShard':{'fichesRelevees':len(shard_conditions),'avecDescriptionEnCarte':sum(bool(c['sections']) for c in shard_conditions),'blocsEtCellulesReferences':sum(len(c['sections']) for c in shard_conditions),'blocsUniques':len({ident for c in shard_conditions for ident in c['sections']}),'blocsSupplementairesEnFicheOuverte':sum(len(c['sections']) for c in condition_details)},
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
            'Les présentations Shard sont celles des cartes relevées : espèces et lignages, classes, 48 sous-classes PHB 2024 et historiques. Elles ne représentent pas toutes les descriptions d’aptitudes des sous-classes ni tous les livres.',
            'Les libellés et blocs éditables comptent les correspondances anglaises distinctes, y compris les variantes ; plusieurs blocs peuvent appartenir à une seule règle.',
            'Les états 2024 sont vérifiés sur des reproductions HTML locales. Les noms du catalogue ne prouvent pas la couverture des états et effets personnalisés de Shard.',
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
