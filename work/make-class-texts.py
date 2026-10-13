"""Importer toutes les aptitudes de classes du SRD bilingue par classe/niveau/titre.

Les blocs avec tables ou nombres incompatibles restent signalés dans le rapport.
Aucun appariement par position entre classes françaises et anglaises.
"""
import json
import re
from pathlib import Path
from translation_packs import key, signature, load_packs

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data/srd-5.2.1'
INDEX = json.loads((DATA / 'classes-index.json').read_text())
ORDER = {
    'en': ['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard'],
    'fr': ['barbarian','bard','cleric','druid','sorcerer','fighter','wizard','monk','warlock','paladin','ranger','rogue'],
}
HEADINGS = {'en': r'^Level (\d+): (.+)$', 'fr': r'^Niveau (\d+) : (.+)$'}
BOUNDARY = {
    'en': r'^(?:\w+ Subclass:|Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard|Character Origins)$',
    'fr': r'^(?:Sous-classe .+|Barbare|Barde|Clerc|Druide|Ensorceleur|Guerrier|Magicien|Moine|Occultiste|Paladin|Rôdeur|Roublard|Origines des)$',
}


def flat(text, lang):
    text = re.sub(r'(?:System Reference Document|Document de Référence du Système) 5\.2\.1\s+\d+', '', text)
    text = text.replace('\f', '\n').replace('\u00ad', '')
    # Conserver les composés anglais fréquents coupés en fin de ligne.
    text = re.sub(r'(\w+)-\n(?=\w)', lambda m: m[1] + ('-' if lang == 'en' and (m[1].isdigit() or m[1] in ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma','two','one','half','off','self','well','long','short']) else ''), text)
    return re.sub(r'\s+', ' ', text).strip()


def extract(lang):
    text = (DATA / f'classes-{lang}.txt').read_text()
    # Les tables de progression interrompent parfois un paragraphe entre deux pages.
    pattern = r'^\w+ Features\n[\s\S]*?^20 \+6[^\n]*' if lang == 'en' else r'^Aptitudes (?:du Barbare|du Barde|du Clerc|du Druide|de l’Ensorceleur|du Guerrier|du Magicien|du Moine|de l’Occultiste|du Paladin|du Rôdeur|du Roublard)\n[\s\S]*?^20 \+6[^\n]*'
    text = re.sub(pattern, '', text, flags=re.M)
    sidebar = r'^Expanding and Replacing a Spellbook\n[\s\S]*?backup spellbook\.' if lang == 'en' else r'^Étoffer et remplacer son grimoire\n[\s\S]*?grimoire de secours\.'
    text = re.sub(sidebar, '', text, flags=re.M)
    matches = list(re.finditer(HEADINGS[lang], text, re.M))
    groups, group, last = [], [], 0
    for i, match in enumerate(matches):
        level = int(match[1])
        if level == 1 and last > 1:
            groups.append(group)
            group = []
        body = text[match.end():matches[i+1].start() if i+1 < len(matches) else len(text)]
        # Les introductions des sous-classes et de la classe suivante n’appartiennent pas à l’aptitude.
        cut = re.search(BOUNDARY[lang], body, re.M)
        extras = r'^(?:\w+ Spell List|Metamagic Options|Eldritch Invocation Options|Expanding and Replacing a Spellbook)$' if lang == 'en' else r'^(?:Liste des sorts .+|Options de métamagie|Options de Manifestations occultes|Options de manifestation.+|Étoffer et remplacer son grimoire)$'
        extra = re.search(extras, body, re.M | re.I)
        if extra and (not cut or extra.start() < cut.start()):cut = extra
        if lang == 'en':
            subclass = re.search(r'^\w+ Subclass:', body, re.M)
            if subclass and (not cut or subclass.start() < cut.start()):cut = subclass
        if cut:body = body[:cut.start()]
        # Une table portant le même titre clôt la prose, sans faire partie de sa traduction.
        title = re.escape(match[2]).replace(r'\ ', r'\s+')
        table = re.search(r'^'+title+r'\s*$', body, re.M)
        if table:body = body[:table.start()]
        slot_table = r'^Creating Spell Slots$' if lang == 'en' else r'^Création d’emplacements de sort$'
        table = re.search(slot_table, body, re.M)
        if table:body = body[:table.start()]
        group.append({'level':level, 'name':match[2], 'body':flat(body, lang), 'raw':body})
        last = level
    groups.append(group)
    if len(groups) != len(ORDER[lang]):raise ValueError(f'{lang}: nombre de classes inattendu')
    return dict(zip(ORDER[lang], groups))


def units(text):
    # Uniquement les unités métriques définies par les règles, jamais les valeurs de jeu.
    def distance(m):
        meters = float(m[1].replace(',', '.').replace(' ', ''))
        feet = meters / 0.3
        return str(round(feet)) + ' feet' if abs(feet-round(feet)) < 0.001 else m[0]
    text = re.sub(r'\b(\d+(?:[,.]\d+)?)\s*m(?:ètre(?:s)?)?(?![\w²³])', distance, text)
    # Les ordinaux français issus des retours de ligne du PDF.
    text = re.sub(r'\b(\d+)\s+(er|e)\b', r'\1\2', text)
    text = re.sub(r'\b(\d+(?:[,.]\d+)?)\s*kg\b', lambda m: str(float(m[1].replace(',', '.'))*2).removesuffix('.0')+' livres', text)
    return text


def generate():
    corpora = {lang:extract(lang) for lang in ORDER}
    pairs, coverage, seen = [], [], {}
    editorial = {}
    for path in sorted((ROOT/'translations').rglob('*.tsv')):
        for line in path.read_text().splitlines():
            if line.count('|')==1:
                en,fr=line.split('|')
                if len(en)>=35:editorial[key(en)]=fr
    editorial.update({key(r['en']):r['fr'] for r in load_packs() if r['kind']=='description'})
    for cls in ORDER['en']:
        index = [r for r in INDEX if r['class'] == cls]
        enrows, frrows = corpora['en'][cls], corpora['fr'][cls]
        if not len(index) == len(enrows) == len(frrows):raise ValueError(f'{cls}: index non aligné')
        for ordinal, (entry, enrow, frrow) in enumerate(zip(index,enrows,frrows)):
            if entry['level'] != enrow['level'] or entry['level'] != frrow['level'] or key(entry['en']) != key(enrow['name']) or key(entry['fr']) != key(frrow['name']):
                raise ValueError(f'{cls}: titre/niveau incompatible : {entry}')
            en, fr = enrow['body'], units(frrow['body'])
            fr = editorial.get(key(en), fr)
            reason = None
            # Une table au milieu du texte n’est jamais aplatie dans une traduction de prose.
            if any(re.search(r'^\d+\s+[+—\d]', row['raw'], re.M) for row in [enrow,frrow]):reason='table à structurer'
            elif signature(en) != signature(fr):reason='valeurs ou découpages à vérifier'
            elif [d.rstrip('s') for d in re.findall(r'\b(?:\d+)?d\d+s?\b', en.lower())] != [d.rstrip('s') for d in re.findall(r'\b(?:\d+)?d\d+s?\b', fr.lower())]:reason='dés à vérifier'
            if len(en)<20 or len(fr)<20:reason='bloc incomplet'
            if not reason:
                normalized = key(en)
                if normalized in seen and key(seen[normalized]) != key(fr):reason='traductions partagées à harmoniser'
                else:
                    seen[normalized]=fr
                    pairs.append({'id':f'srd.classes.{cls}.{ordinal+1}', 'class':cls, 'level':entry['level'], 'name':entry['en'], 'frName':entry['fr'], 'en':en, 'fr':fr, 'source':'SRD 5.2.1 EN/FR · CC-BY-4.0 · distances remises en feet'})
            coverage.append({'class':cls,'level':entry['level'],'en':entry['en'],'fr':entry['fr'],'description':reason is None,'pending':reason})
    (ROOT/'work/class-texts.json').write_text(json.dumps(pairs,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'work/class-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(pairs)} descriptions de classes SRD sur {len(coverage)} aptitudes indexées ; {len(coverage)-len(pairs)} blocs à vérifier')


if __name__ == '__main__':generate()
