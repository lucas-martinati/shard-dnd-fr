# Shard Tabletop — D&D FR

Version **1.12.0** — 13 octobre 2026

## Installer la mise à jour

1. Ouvre ton script existant dans Tampermonkey.
2. Remplace tout son contenu par celui de **shard-dnd-fr.user.js**.
3. Enregistre avec **Ctrl+S**, puis recharge Shard. Garde un seul exemplaire activé.
4. Autorise **www.aidedd.org** si Tampermonkey le demande.
5. Désactive la traduction automatique du navigateur sur Shard.

## Configuration

Le bouton apparaît **en haut à droite par défaut**. Une position déjà choisie dans une version précédente est conservée.

Le panneau contient :

- L’interrupteur principal **Traduction activée / désactivée**, placé tout en haut.
- **Ajouter également les trads en anglais (sorts, monstres, objets)** : affiche les noms français suivis du nom anglais, y compris pour l’équipement courant.
- Le choix des quatre coins de l’écran et **Ne pas afficher**.
- La recherche de fiches AideDD.

**Ne pas afficher** masque uniquement le bouton. Pour ouvrir la configuration, utilise **Alt + Maj + F** ou **Tampermonkey → D&D FR — Ouvrir la configuration**.

Le menu Tampermonkey contient deux réglages rapides : activer/désactiver la traduction et afficher/masquer le bouton. Une entrée de navigation séparée ouvre la configuration.

Les corrections manuelles, l’import/export JSON, les lecteurs intégrés et l’ouverture automatique du panneau ont été retirés. Les anciens réglages de source sont remplacés par **AideDD 2024 obligatoire pour les noms référencés**. Les anciennes corrections personnelles restent sauvegardées dans Tampermonkey, mais ne sont plus appliquées.

## Rechercher et ouvrir une fiche

Saisis un nom français ou anglais dans le panneau, puis appuie sur **Entrée** ou **Ouvrir ↗**. Une correspondance exacte ou unique ouvre directement la fiche AideDD dans un nouvel onglet. Les accents et les alias sont reconnus. Si plusieurs fiches correspondent, choisis le résultat voulu dans la liste.

Une fiche Shard reconnue de sort, de monstre ou d’objet magique reçoit également un lien **AideDD ↗** près du titre. Il ouvre la référence 2024 dans un nouvel onglet. Aucun lien n’est inventé pour une entrée absente du catalogue. Le lien suit les changements de fiche, même lorsque Shard réutilise la même fenêtre.

La recherche française dans les champs Shard reste active automatiquement : choisis une suggestion pour transmettre au champ son nom anglais attendu par Shard.

## Traduction et références

Les noms utilisent les cinq index AideDD 2024, avec un catalogue intégré de **1 341 correspondances**. La traduction directe conserve les références locales et le chargement à la demande des descriptions publiques, y compris leurs variantes anciennes lorsque le texte Shard correspond. Les fiches consultées sur AideDD s’ouvrent désormais hors du panneau.

Les données enregistrées dans Shard et les commandes de dés ne sont pas modifiées. Les traductions inconnues, les contenus maison et les textes de certains suppléments peuvent rester en anglais.

## Nouveautés 1.12

Complément de **14 passages** pour les anciennes formulations de métamagie et les aptitudes associées : Sort prévenant, Sort ample, Sort renforcé, Sort étendu, Sort intensifié, Sort jumeau, Source de magie et Incantation flexible. Les dix options de métamagie 2024 étaient déjà prises en charge ; les **18 cartes** de l’extrait, anciennes et 2024, sont maintenant vérifiées ensemble.

Les formulations anciennes conservent leurs propres règles : par exemple, Sort intensifié coûte 3 points et affecte la première sauvegarde dans le texte ancien fourni, contre 2 points et les sauvegardes dans son texte 2024. Sort jumeau conserve également deux descriptions distinctes.

La reconnaissance des descriptions accepte désormais les contractions anglaises non ambiguës (`you’ve` / `you have`, `can’t` / `cannot`, `aren’t` / `are not`, etc.) et les guillemets typographiques. Cela s’applique aussi aux autres aptitudes, sorts et objets déjà référencés. Ce rapprochement ne supprime pas les négations, ne modifie aucun chiffre et ne traduit pas approximativement les règles inconnues.

Les tests vérifient toutes les cartes de métamagie fournies, six variantes de formulation d’autres aptitudes, les cases de sélection, le dé cliquable, les différences entre éditions et la restauration exacte à la désactivation. Les nouveaux passages sont des traductions de tes extraits ; la couverture des aptitudes de tous les suppléments reste incomplète.

## Nouveautés 1.11

Le lien **AideDD ↗** est centré verticalement dans la barre de titre des panneaux Shard : classe `self-center`, centrage propre au lien et suppression des marges verticales. Les contrôles du panneau restent en place.

Ajout de **196 passages et prérequis** issus des cartes de dons et de styles de combat fournies, soit **218 correspondances** en incluant les variantes de texte. Cela couvre notamment Comédien, Athlète, Explorateur de donjons, Chanceux, Maître d’hast, Mage de guerre, Initié à la magie, Façonneur, Musicien, Interception, Protection et Combat à mains nues.

Ces descriptions sont des traductions rédigées à partir du texte fourni. Une formulation ancienne reste une règle ancienne, même lorsque son nom utilise le catalogue AideDD 2024. Le script ne remplace pas ses effets par ceux de l’édition 2024 et ne complète pas arbitrairement une carte qui ne contient qu’une introduction.

La vérification couvre les **131 cartes du HTML transmis**, leurs descriptions, les prérequis et les noms encore anglais. Les éléments interactifs, leurs liens et leurs dés sont conservés. D’autres dons ou variantes de suppléments peuvent encore nécessiter des traductions.

## Nouveautés 1.10

Ajout de **54 paragraphes et variantes** pour les personnages 2024 : Sens du danger, Témérité, Savoir primal, Langage des animaux, Attaque sournoise, Argot des voleurs, Bottes d’arme, sorts de l’Arnaqueur arcanique, Escamotage de main de mage, Résistance naine et Connaissance de la pierre. Le complément couvre aussi plusieurs aptitudes de progression du Barbare et du Roublard, ainsi que les traits de l’Orc et la Ténacité naine.

Les textes fournis par l’utilisateur sont traduits intégralement. Les nouveaux paragraphes sont des traductions rédigées à partir de ces extraits ou des adaptations du SRD 5.2.1, et non des citations garanties de la VF commerciale. Les noms de sorts intégrés restent alignés sur le catalogue AideDD 2024 ; les deux nouveaux noms d’aptitude absents des références vérifiées sont des traductions proposées.

Les variantes d’Attaque sournoise conservent les dés effectivement présents dans Shard, de 1d6 à 10d6. Le script ne déduit pas les dégâts du niveau et n’ajoute pas de valeur lorsqu’elle manque. Les distances restent en feet.

Correction de « Light, Thrown » sur les armes, des libellés « Rage Damage », « Toggle Effects », « Cast as Bonus Action », « see description » et « all ». Les petits titres ne sont plus bloqués par une description voisine, et « Spell List » est reconnu lorsqu’il est découpé en nœuds texte adjacents.

## Vérifications

Les tests des aptitudes de personnages passent toujours : 54 paragraphes et variantes, descriptions précédées de titres, libellés fragmentés, changement de dés après montée de niveau, commandes de dés cliquables et restauration exacte des textes anglais. Les valeurs des champs de saisie restent intactes et les phrases inconnues ne sont pas traduites mot à mot.

Les tests de configuration 1.9, de recherche et de liens AideDD, l’audit de onze fiches (sorts, monstres, don et objets), ainsi que les tests du Trait de feu, des potions, du Sac sans fond et du cache passent également.

L’aperçu **apercu-v1.11.jpg** montre le script dans une démonstration locale vérifiée au navigateur : structure de barre de titre relevée sur Shard et cartes de dons issues du HTML fourni. Le centrage vertical du lien AideDD a été mesuré au navigateur. Ces essais n’installent pas le script dans Tampermonkey et ne garantissent pas la couverture de toutes les classes ou de tous les suppléments.

## Sources et attribution

- [Sorts AideDD 2024](https://www.aidedd.org/spell/fr/)
- [Monstres AideDD 2024](https://www.aidedd.org/monster/fr/)
- [Dons](https://www.aidedd.org/feat/fr/), [manifestations](https://www.aidedd.org/invocation/fr/) et [objets magiques](https://www.aidedd.org/magic-item/fr/)
- [Lévitation — ancienne formulation](https://www.aidedd.org/dnd/sorts.php?vo=levitate)
- [Trait ensorcelé — Witch Bolt](https://www.aidedd.org/spell/fr/trait-ensorcele)
- [Dons anciens AideDD — nom Explorateur de donjons](https://www.aidedd.org/dnd-filters/dons.php)
- [Classes et sous-classes AideDD 2024](https://www.aidedd.org/regles-24/classes/)
- [SRD officiels](https://www.dndbeyond.com/srd) et [SRD français 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/FR_SRD_CC_v5.2.1.pdf)
- HTML et textes fournis dans la conversation, plus exploration antérieure du personnage de test 2024 sur Shard.

Ce travail utilise des termes et passages adaptés des System Reference Documents 5.1 et 5.2.1 de Wizards of the Coast LLC, disponibles sur https://www.dndbeyond.com/srd sous licence Creative Commons Attribution 4.0 International : https://creativecommons.org/licenses/by/4.0/. Les descriptions françaises SRD intégrées proviennent du SRD français ; leur mise en forme est adaptée à l’affichage. Les autres traductions et la segmentation des passages anglais sont des adaptations.

Code du script : MIT. Les contenus SRD et ceux consultés sur AideDD conservent leurs propres conditions ; la licence du code ne s’y substitue pas. Projet indépendant, non affilié à Shard Tabletop, AideDD ou Wizards of the Coast.
