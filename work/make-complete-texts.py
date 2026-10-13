import json,re
from pathlib import Path
root=Path('work');pairs=[]
def add(en,fr,source):
 if en and fr:pairs.append({'en':en,'fr':fr,'source':source})
def flat(s):return re.sub(r'\s+',' ',s).strip()
for r in json.loads((root/'spell-reference.json').read_text()):
 add(r['englishBody'],r['frenchBody'],'SRD 5.2.1 FR')
 en=flat(r['english']);fr=flat(r['french']);en=en.split(flat(r['englishBody'])[:70])[0];fr=fr.split(flat(r['frenchBody'])[:70])[0]
 labels=[('Casting Time','Temps d’incantation'),('Range','Portée'),('Components','Composantes'),('Duration','Durée')]
 for i,(a,b) in enumerate(labels):
  ae=re.escape(labels[i+1][0])+r'\s*:' if i<3 else '$';be=re.escape(labels[i+1][1])+r'\s*:' if i<3 else '$'
  x=re.search(re.escape(a)+r'\s*:\s*(.*?)(?='+ae+')',en);y=re.search(re.escape(b)+r'\s*:\s*(.*?)(?='+be+')',fr)
  if x and y:
   v=x[1].strip();w=y[1].strip();add(a+': '+v,b+' : '+w,'SRD 5.2.1 FR');add(v,w,'SRD 5.2.1 FR')
# Traduction rédigée à partir de l’extrait transmis ; conserver la formulation 2014.
en=["One creature or loose object of your choice that you can see within range rises vertically, up to 20 feet, and remains suspended there for the duration. The spell can levitate a target that weighs up to 500 pounds. An unwilling creature that succeeds on a Constitution saving throw is unaffected.","The target can move only by pushing or pulling against a fixed object or surface within reach (such as a wall or a ceiling), which allows it to move as if it were climbing. You can change the target's altitude by up to 20 feet in either direction on your turn. If you are the target, you can move up or down as part of your move. Otherwise, you can use your action to move the target, which must remain within the spell's range.","When the spell ends, the target floats gently to the ground if it is still aloft."]
fr=["Une créature ou un objet non fixé de votre choix, que vous voyez à portée, s’élève verticalement jusqu’à 20 pieds et reste en suspension pendant la durée du sort. Le sort peut faire léviter une cible pesant jusqu’à 500 livres. Une créature non consentante qui réussit un jet de sauvegarde de Constitution n’est pas affectée.","La cible ne peut se déplacer qu’en poussant ou en tirant sur un objet ou une surface fixe à sa portée, comme un mur ou un plafond, ce qui lui permet de se déplacer comme si elle grimpait. À votre tour, vous pouvez modifier son altitude de 20 pieds au maximum, vers le haut ou vers le bas. Si vous êtes la cible, vous pouvez monter ou descendre dans le cadre de votre déplacement. Sinon, vous pouvez utiliser votre action pour déplacer la cible, qui doit rester à portée du sort.","À la fin du sort, la cible redescend doucement au sol si elle est encore en l’air."]
for a,b in zip(en,fr):add(a,b,'Traduction de l’extrait utilisateur · 2014')
add(' '.join(en),' '.join(fr),'Traduction de l’extrait utilisateur · 2014')
c='V, S, M (either a small leather loop or a piece of golden wire bent into a cup shape with a long shank on one end)';f='V, S, M (une petite boucle de cuir ou un fil d’or plié en forme de coupe, avec une longue tige à une extrémité)'
add(c,f,'Traduction de l’extrait utilisateur · 2014');add('Components: '+c,'Composantes : '+f,'Traduction de l’extrait utilisateur · 2014')
# Extrait Trait de feu fourni par l’utilisateur, valeurs vérifiées dans le DOM Shard.
fire_en="You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn't being worn or carried."
fire_fr="Vous projetez une flammèche vers une créature ou un objet à portée. Effectuez une attaque de sort à distance contre la cible. Si l’attaque touche, la cible subit 1d10 dégâts de feu. Un objet inflammable touché par ce sort s’embrase s’il n’est ni porté ni transporté."
add(fire_en,fire_fr,'Traduction de l’extrait utilisateur · 2014')
for row in json.loads((root/'equipment-texts.json').read_text()):add(row['en'],row['fr'],row['source'])
for row in json.loads((root/'feature-texts.json').read_text()):add(row['en'],row['fr'],row['source'])
for row in json.loads((root/'feat-texts.json').read_text()):add(row['en'],row['fr'],row['source'])
for line in (root/'metamagic-descriptions.tsv').read_text().splitlines():
 en,fr=line.split('|');add(en,fr,'Traduction de l’extrait utilisateur · métamagie et Source de magie anciennes')
(root/'complete-texts.json').write_text(json.dumps(pairs,ensure_ascii=False,separators=(',',':')))
print(len(pairs),'paires de descriptions et champs complets')
