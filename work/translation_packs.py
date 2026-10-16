"""Chargement déterministe des traductions éditables (sans dépendance Python)."""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTRACTIONS = {"you've": "you have", "we've": "we have", "they've": "they have", "can't": "cannot", "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "hasn't": "has not", "haven't": "have not", "hadn't": "had not", "won't": "will not", "wouldn't": "would not", "couldn't": "could not", "shouldn't": "should not", "mustn't": "must not"}


def key(text):
    text = unicodedata.normalize('NFC', text).translate(str.maketrans({'’': "'", '‘': "'", 'ʼ': "'", '‐': '-', '‑': '-', '–': '-', '“': '"', '”': '"'})).lower()
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r"\b(?:" + '|'.join(map(re.escape, CONTRACTIONS)) + r")\b", lambda m: CONTRACTIONS[m[0]], text)
    return re.sub(r'\s*([.,;:!?()+])\s*', r'\1', text)


def signature(text):
    # Les nombres écrits en chiffres et les dés doivent rester inchangés.
    return sorted(re.findall(r'\d+(?:[.,]\d+)?', text))


def load_packs(directory=None):
    rows, seen, ids = [], {}, set()
    directory = Path(directory) if directory is not None else ROOT / 'translations'
    paths = directory.rglob('traductions.json') if directory.resolve() == (ROOT / 'translations').resolve() else directory.glob('*.json')
    # Le livre ne doit pas changer la priorité entre catégories historiques.
    for path in sorted(paths, key=lambda p: (p.parent.name, str(p))):
        try:
            pack = json.loads(path.read_text(encoding='utf-8'))
        except (ValueError, OSError) as exc:
            raise ValueError(f'{path.name}: JSON invalide : {exc}') from exc
        if not isinstance(pack, dict) or type(pack.get('schemaVersion', 1)) is not int or pack.get('schemaVersion', 1) != 1:
            raise ValueError(f'{path.name}: schemaVersion doit valoir 1')
        unknown = set(pack) - {'$schema', 'schemaVersion', 'source', 'edition', 'entries'}
        if unknown:
            raise ValueError(f'{path.name}: champs inconnus : {sorted(unknown)}')
        if 'source' in pack and (not isinstance(pack['source'], str) or not pack['source'].strip()):
            raise ValueError(f'{path.name}: source de pack invalide')
        if pack.get('edition', 'any') not in ['2014', '2024', 'any']:
            raise ValueError(f'{path.name}: edition doit valoir 2014, 2024 ou any')
        if not isinstance(pack.get('entries'), list):
            raise ValueError(f'{path.name}: entries doit être une liste')
        for i, entry in enumerate(pack['entries']):
            where = f'{path.name}: entrée {i + 1}'
            if not isinstance(entry, dict):
                raise ValueError(f'{where}: objet attendu')
            unknown = set(entry) - {'id', 'kind', 'en', 'fr', 'variants', 'aliases', 'source', 'edition', 'usage', 'labelCategory'}
            if unknown:
                raise ValueError(f'{where}: champs inconnus : {sorted(unknown)}')
            ident, kind = entry.get('id'), entry.get('kind', 'description')
            usage = entry.get('usage')
            if usage is not None and (not isinstance(usage, list) or any(u not in ['name', 'spell', 'search', 'inline'] for u in usage) or len(set(usage)) != len(usage)):
                raise ValueError(f'{where}: usage doit contenir des modes distincts name, spell, search ou inline')
            label_category = entry.get('labelCategory')
            if label_category is not None and (not isinstance(label_category, str) or not label_category.strip()):
                raise ValueError(f'{where}: labelCategory invalide')
            source = entry.get('source', pack.get('source'))
            edition = entry.get('edition', pack.get('edition', 'any'))
            if not isinstance(source, str) or not source.strip() or edition not in ['2014', '2024', 'any']:
                raise ValueError(f'{where}: source ou édition invalide')
            if not isinstance(ident, str) or not ident.strip() or ident in ids:
                raise ValueError(f'{where}: id manquant ou dupliqué ({ident})')
            ids.add(ident)
            if kind not in ['term', 'description']:
                raise ValueError(f'{where}: kind doit valoir term ou description')
            for field in ['en', 'fr']:
                if not isinstance(entry.get(field), str) or not entry[field].strip():
                    raise ValueError(f'{where}: {field} doit contenir un texte')
            variants = entry.get('variants', [])
            if not isinstance(variants, list) or any(not isinstance(v, str) or not v.strip() for v in variants):
                raise ValueError(f'{where}: variants doit contenir des textes anglais non vides')
            aliases = entry.get('aliases', [])
            if not isinstance(aliases, list) or any(not isinstance(v, str) or not v.strip() for v in aliases) or (aliases and kind != 'term' and 'inline' not in (usage or [])):
                raise ValueError(f'{where}: aliases doit contenir des noms alternatifs non vides pour un libellé')
            for en in [entry['en'], *variants]:
                if kind == 'term' and ('|' in en or '|' in entry['fr'] or '\n' in en or '\n' in entry['fr']):
                    raise ValueError(f'{where}: un libellé ne peut contenir de barre verticale ou de saut de ligne')
                if signature(en) != signature(entry['fr']):
                    raise ValueError(f'{where}: nombres ou dés différents entre anglais et français')
                # Shard peut coller un dé chiffré au mot précédent (takes1d10).
                # Conserver le dé entier sans accepter un suffixe de 11d10.
                dice = lambda text: sorted(re.findall(r'(?<!\d)(\d+d\d+|(?<!\w)d\d+)s?\b', text.lower()))
                if dice(en) != dice(entry['fr']):
                    raise ValueError(f'{where}: dés différents entre anglais et français')
                formulas = lambda text: sorted(re.findall(r'\{[^{}]*\}', text))
                if formulas(en) != formulas(entry['fr']):
                    raise ValueError(f'{where}: formules entre accolades différentes entre anglais et français')
                normalized = key(en)
                if normalized in seen:
                    old = seen[normalized]
                    if key(old['fr']) != key(entry['fr']) or old['kind'] != kind:
                        raise ValueError(f'{where}: traduction contradictoire avec {old["id"]} pour {en[:80]!r}')
                    if usage is not None:
                        old['usage'] = list(dict.fromkeys(old.get('usage', []) + usage))
                    if aliases:
                        old['aliases'] = list(dict.fromkeys(old.get('aliases', []) + aliases))
                    continue
                row = {'id': ident, 'kind': kind, 'en': en, 'fr': entry['fr'], 'source': source, 'edition': edition, 'category': path.parent.name if path.name == 'traductions.json' else 'test'}
                if usage is not None:
                    row['usage'] = usage
                if label_category is not None:
                    row['labelCategory'] = label_category
                if aliases:
                    row['aliases'] = list(dict.fromkeys(aliases))
                rows.append(row)
                seen[normalized] = row
    return rows


def check_existing(rows, existing):
    """Refuser qu’un pack masque une ancienne description contradictoire."""
    index = {}
    for row in existing:
        index.setdefault(key(row['en']), set()).add(key(row['fr']))
    for row in rows:
        if row['kind'] != 'description':
            continue
        previous = index.get(key(row['en']))
        if previous and key(row['fr']) not in previous:
            raise ValueError(f"{row['id']}: traduction différente d’une description existante ; corriger sa source au lieu de la masquer")


def deduplicate_descriptions(rows):
    """Priorité du moteur : première paire, puis dernière correction locale."""
    unique = {}
    for row in rows:
        # Même clé que inlineKey() : icônes et notations équivalentes de pieds.
        english = re.sub(r'[\uE000-\uF8FF]', '', row['en'])
        english = re.sub(r'\b(\d+(?:\.\d+)?)\s*-\s*foot\b', r'\1 feet', english, flags=re.I)
        english = re.sub(r'\b(?:ft|feet|foot)\b\.?', 'feet', english, flags=re.I)
        normalized = key(english)
        old = unique.get(normalized)
        sources = list(dict.fromkeys((old.get('sources', [old['source']]) if old else []) + [row['source']]))
        if old is None or re.match(r'^Traduction (?:de|proposée)\b', row['source']):
            unique[normalized] = dict(row)
        if len(sources) > 1:
            unique[normalized]['sources'] = sources
    return list(unique.values())
