"""Lire les aptitudes et options bilingues éditables du PHB, sans extrait PDF."""
import json
import re
from translation_packs import ROOT, signature

CLASSES = ('barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin',
           'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard')
DIRECTORY = ROOT / 'translations/dnd-2024/phb/classes'


def read_corpus(name, directory=None):
    path = (directory or DIRECTORY) / name
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict) or set(data) != {'edition', 'source', 'entries'}:
        raise ValueError(f'{name}: edition, source et entries attendus')
    if data['edition'] != '2024' or not isinstance(data['source'], str) or not data['source'].strip():
        raise ValueError(f'{name}: source ou édition invalide')
    if not isinstance(data['entries'], list) or not data['entries']:
        raise ValueError(f'{name}: entries doit être une liste non vide')
    return data


def text_fields(row, fields, where):
    if any(not isinstance(row.get(field), str) or not row[field].strip() for field in fields):
        raise ValueError(f'{where}: texte obligatoire ({", ".join(fields)})')


def pair(row, where):
    text_fields(row, ['en', 'fr'], where)
    if signature(row['en']) != signature(row['fr']):
        raise ValueError(f'{where}: nombres différents entre anglais et français')
    # Conserver les dés dans leur ordre, y compris leurs formes plurielles.
    dice = lambda text: [d.rstrip('s') for d in re.findall(r'\b(?:\d+)?d\d+s?\b', text.lower())]
    if dice(row['en']) != dice(row['fr']):
        raise ValueError(f'{where}: dés différents ou réordonnés')


def class_texts(directory=None):
    data = read_corpus('descriptions-srd.json', directory)
    rows, ids = [], set()
    for entry in data['entries']:
        if not isinstance(entry, dict) or set(entry) != {'id', 'class', 'level', 'name', 'frName', 'en', 'fr'}:
            raise ValueError('descriptions-srd.json: champs d’aptitude invalides')
        text_fields(entry, ['id', 'name', 'frName'], 'aptitude')
        if entry['id'] in ids:
            raise ValueError(f'Identifiant d’aptitude dupliqué : {entry["id"]}')
        ids.add(entry['id'])
        if entry['class'] not in CLASSES or type(entry['level']) is not int or not 1 <= entry['level'] <= 20:
            raise ValueError(f'{entry["id"]}: classe ou niveau invalide')
        pair(entry, entry['id'])
        rows.append({**entry, 'source': data['source']})
    if tuple(dict.fromkeys(row['class'] for row in rows)) != CLASSES:
        raise ValueError('Les 12 classes doivent apparaître dans leur ordre de référence')
    return rows


def option_texts(directory=None):
    data = read_corpus('options-srd.json', directory)
    rows, coverage, names = [], [], set()
    for entry in data['entries']:
        if not isinstance(entry, dict) or set(entry) != {'kind', 'name', 'frName', 'blocks'}:
            raise ValueError('options-srd.json: champs d’option invalides')
        text_fields(entry, ['name', 'frName'], 'option')
        if entry['kind'] not in ['metamagic', 'invocation']:
            raise ValueError(f'{entry["name"]}: type d’option invalide')
        identity = (entry['kind'], entry['name'])
        if identity in names:
            raise ValueError(f'Option dupliquée : {entry["name"]}')
        names.add(identity)
        if not isinstance(entry['blocks'], list) or not entry['blocks']:
            raise ValueError(f'{entry["name"]}: blocs de traduction manquants')
        for block in entry['blocks']:
            if not isinstance(block, dict) or set(block) != {'en', 'fr'}:
                raise ValueError(f'{entry["name"]}: champs de bloc invalides')
            pair(block, entry['name'])
            rows.append({**block, 'source': data['source'] + ' · ' + entry['kind']})
        coverage.append({'kind': entry['kind'], 'en': entry['name'], 'fr': entry['frName'],
                         'description': True, 'pending': None})
    if {entry['kind'] for entry in data['entries']} != {'metamagic', 'invocation'}:
        raise ValueError('Les métamagies et manifestations doivent être présentes')
    return rows, coverage
