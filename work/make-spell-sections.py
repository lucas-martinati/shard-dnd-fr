from translation_sources import source as translation_source
"""Découper des options SRD vérifiées, en reliant explicitement leurs titres EN/FR.

Les listes FR n’ont pas toujours le même ordre que les listes EN : ne jamais
associer deux effets seulement à partir de leur position.
"""
from pathlib import Path
import json
import re
from translation_packs import key, load_packs

ROOT = Path(__file__).resolve().parent
TABLE = {
    'Elementalism': [('Beckon Air','Appel d’air'),('Beckon Earth','Appel de terre'),('Beckon Fire','Appel de feu'),('Beckon Water','Appel d’eau'),('Sculpt Element','Façonnage élémentaire')],
    'Thaumaturgy': [('Altered Eyes','Yeux modifiés'),('Booming Voice','Voix retentissante'),('Fire Play','Jeu avec le feu'),('Invisible Hand','Main invisible'),('Phantom Sound','Bruit fantôme'),('Tremors','Secousse')],
    'Prestidigitation': [('Sensory Effect','Effet sensoriel'),('Fire Play','Jeu avec le feu'),('Clean or Soil','Nettoyage ou maculage'),('Minor Sensation','Sensation mineure'),('Magic Mark','Marque magique'),('Minor Creation','Création mineure')],
    'Druidcraft': [('Weather Sensor','Capteur climatique'),('Bloom','Floraison'),('Sensory Effect','Effet sensoriel'),('Fire Play','Jeu avec le feu')],
    'Command': [('Approach','Approche'),('Drop','Lâche'),('Flee','Fuis'),('Grovel','Rampe'),('Halt','Halte'),('Using a Higher-Level Spell Slot','Emplacement de niveau supérieur')],
    'Minor Illusion': [('Sound','Son'),('Image','Image')],
    'Alter Self': [('Aquatic Adaptation','Adaptation aquatique'),('Change Appearance','Changement d’aspect'),('Natural Weapons','Armes naturelles')],
    'Detect Thoughts': [('Sense Thoughts','Perception des pensées'),('Read Thoughts','Lecture des pensées')],
    'Arcane Hand': [('Clenched Fist','Poing serré'),('Forceful Hand','Main impérieuse'),('Grasping Hand','Main agrippeuse'),('Interposing Hand','Main interposée'),('Using a Higher-Level Spell Slot','Emplacement de niveau supérieur')],
    'Conjure Celestial': [('Healing Light','Lumière guérisseuse'),('Searing Light','Lumière calcinante'),('Using a Higher-Level Spell Slot','Emplacement de niveau supérieur')],
    'Glyph of Warding': [('Set the Trigger','Déclencheur'),('Explosive Rune','Rune explosive'),('Spell Glyph','Glyphe à sort'),('Using a Higher-Level Spell Slot','Emplacement de niveau supérieur')],
    'Symbol': [('Set the Trigger','Déclencheur'),('Death','Mort'),('Discord','Discorde'),('Fear','Terreur'),('Pain','Douleur'),('Sleep','Sommeil'),('Stunning','Étourdissement')],
}

def sections(text, labels):
    positions = []
    for label in labels:
        marker=label+'. '
        matches=list(re.finditer(r'(?:^|[.!?:]\s+)(?P<label>'+re.escape(marker)+')',text))
        if len(matches)!=1:
            raise ValueError(f'Titre absent ou ambigu dans le SRD : {label}')
        positions.append((matches[0].start('label'),label,marker))
    positions.sort()
    result={}
    for i,(start,label,marker) in enumerate(positions):
        end=positions[i+1][0] if i+1<len(positions) else len(text)
        result[label]=text[start+len(marker):end].strip()
    return text[:positions[0][0]].strip(),result

pairs={}
ambiguous=set()
skipped=[]
reserved={key(row['en']) for row in load_packs() if row['kind']=='description'}
# Les descriptions déjà traduites par le lexique gardent leur formulation.
for filename in (ROOT.parent/'translations').rglob('*.tsv'):
    for line in filename.read_text().splitlines():
        if '|' in line:
            en=line.split('|',1)[0]
            if len(en)>=35:reserved.add(key(en))
for filename in ['feature-texts.json','feat-texts.json','equipment-texts.json']:
    for row in json.loads(translation_source(filename).read_text()):reserved.add(key(row['en']))
def add(en,fr,name,strict=True):
    normalized=key(en)
    if normalized in reserved or normalized in ambiguous:
        return
    dice=lambda s:re.findall(r'\b((?:\d+)?d\d+)s?\b',s.lower())
    if dice(en)!=dice(fr):
        if strict:raise ValueError(f'{name}: dés absents, modifiés ou réordonnés pendant la segmentation')
        skipped.append(name);return
    old=pairs.get(normalized)
    if old and key(old['fr'])!=key(fr):
        if strict:raise ValueError(f'{name}: correspondance de segment contradictoire')
        ambiguous.add(normalized);pairs.pop(normalized);return
    pairs[normalized]={'en':en,'fr':fr,'source':f'SRD officiel 5.2.1 FR · section de {name} · CC-BY-4.0'}

refs={r['en']:r for r in json.loads(translation_source('spell-reference.json').read_text())}
for name,mapping in TABLE.items():
    row=refs[name]
    en_text,fr_text=row['englishBody'],row['frenchBody']
    if name=='Conjure Celestial':
        # Le paragraphe commun suit la dernière option, différente selon la langue.
        a_start=en_text.index('Until the spell ends, Bright Light fills the Cylinder')
        b_start=fr_text.index('Jusqu’à la fin du sort, le Cylindre est empli')
        a_end=en_text.index('Using a Higher-Level Spell Slot.')
        b_end=fr_text.index('Emplacement de niveau supérieur.')
        add(en_text[a_start:a_end].strip(),fr_text[b_start:b_end].strip(),name)
        en_text=en_text[:a_start]+en_text[a_end:]
        fr_text=fr_text[:b_start]+fr_text[b_end:]
    en_intro,en_sections=sections(en_text,[a for a,b in mapping])
    fr_intro,fr_sections=sections(fr_text,[b for a,b in mapping])
    add(en_intro,fr_intro,name)
    for en_label,fr_label in mapping:
        a,b=en_sections[en_label],fr_sections[fr_label]
        add(a,b,name)
        add(en_label+'. '+a,fr_label+'. '+b,name)
        add(en_label+'.',fr_label+'.',name)

# Les quatre puces de Malédiction sont vérifiées dans le même ordre dans les SRD.
row=refs['Bestow Curse']
a=row['englishBody'].split('Using a Higher-Level Spell Slot.')[0].split('•')
b=row['frenchBody'].split('Emplacement de niveau supérieur.')[0].split('•')
if len(a)!=5 or len(b)!=5:
    raise ValueError('Structure des puces de Malédiction modifiée')
for en,fr in zip(a,b):add(en.strip(),fr.strip(),'Bestow Curse')
# Séparer aussi les améliorations de sorts mineurs et les emplacements
# supérieurs pour toutes les références qui portent ces titres explicites.
upgrades=0
for name,row in refs.items():
    for en_label,fr_label in [('Cantrip Upgrade','Amélioration de sort mineur'),('Using a Higher-Level Spell Slot','Emplacement de niveau supérieur')]:
        a_marker,b_marker=en_label+'. ',fr_label+'. '
        if row['englishBody'].count(a_marker)!=1 or row['frenchBody'].count(b_marker)!=1:
            continue
        a_before,a_tail=row['englishBody'].split(a_marker)
        b_before,b_tail=row['frenchBody'].split(b_marker)
        add(a_before.strip(),b_before.strip(),name,strict=False)
        add(a_marker+a_tail,b_marker+b_tail,name,strict=False)
        add(a_tail,b_tail,name,strict=False)
        add(en_label+'.',fr_label+'.',name,strict=False)
        upgrades+=1
print(upgrades,'sorts avec titres d’amélioration ;',len(skipped),'segments exclus pour dés incompatibles ou réordonnés ;',len(ambiguous),'correspondances ambiguës exclues')

(ROOT/'spell-sections.json').write_text(json.dumps(list(pairs.values()),ensure_ascii=False,indent=2)+'\n')
print(len(pairs),'segments SRD de sorts, introductions, options et libellés')
