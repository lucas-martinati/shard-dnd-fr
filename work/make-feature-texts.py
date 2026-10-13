from pathlib import Path
import json
w=Path(__file__).resolve().parent
pairs=[]
for line in (w/'feature-descriptions.tsv').read_text().splitlines():
 en,fr=line.split('|')
 fr=fr.replace('Éclat d’esprit','Piqûre mentale')
 pairs.append(dict(en=en,fr=fr,source='Traduction de textes de personnage 2024 · extraits utilisateur et SRD 5.2.1'))
en='You know how to strike subtly and exploit a foe’s distraction. Once per turn, you can deal an extra {dice} damage to one creature you hit with an attack roll if you have Advantage on the roll and the attack uses a Finesse or a Ranged weapon. The extra damage’s type is the same as the weapon’s type.'
fr='Vous savez frapper avec subtilité et exploiter la distraction d’un adversaire. Une fois par tour, vous pouvez infliger {dice} dégâts supplémentaires à une créature que vous touchez avec un jet d’attaque si vous avez l’Avantage au jet et utilisez une arme dotée de la propriété Finesse ou une arme à distance. Les dégâts supplémentaires sont du même type que ceux de l’arme.'
# Conserver les dés fournis par Shard ; ne jamais les déduire du niveau.
for n in range(11):
 dice=f'{n}d6' if n else ''
 pairs.append(dict(en=en.format(dice=dice),fr=fr.format(dice=dice),source='Traduction de l’extrait utilisateur · Attaque sournoise 2024'))
(w/'feature-texts.json').write_text(json.dumps(pairs,ensure_ascii=False,indent=2))
print(len(pairs),'paragraphes et variantes de personnage')
