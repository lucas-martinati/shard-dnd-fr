# Shard Tabletop — D&D FR

## Installer la mise à jour

1. Ouvre ton script existant dans Tampermonkey.
2. Remplace tout son contenu par celui de **shard-dnd-fr.user.js**.
3. Enregistre avec **Ctrl+S**, puis recharge Shard. Garde un seul exemplaire activé.
4. Autorise **www.aidedd.org** si Tampermonkey le demande.
5. Désactive la traduction automatique du navigateur sur Shard.

## Repérer les passages à compléter

Dans le panneau D&D FR, ouvre **Repérer les traductions manquantes**, puis clique sur **Analyser la page**. Les candidats sont regroupés avec leur contexte et une cause possible. **Exporter le rapport JSON** enregistre le relevé sur ton ordinateur ; **Effacer** retire les repères. Relance l’analyse après avoir ouvert une autre fiche ou attendu une référence AideDD.

**Descriptions depuis la liste :** coche **Afficher l’état des descriptions vérifiées**, puis utilise **Contrôler le contenu des fiches** si tu souhaites parcourir les descriptions. Ce contrôle ouvre puis referme les fiches chargées, par lots de 100 au maximum. **Arrêter** l’interrompt. Fais défiler la liste pour charger les suivantes, puis relance. Le contrôle utilise les traductions locales sans attendre la file globale ni de nouvelles références distantes. Ouvrir une fiche manuellement actualise également son état.

Les états apparaissent uniquement après examen du texte : **à compléter**, **aucun anglais repéré**, **sans description** ou **vérification impossible**. Les fiches non examinées ne portent pas d’indicateur. Le mode d’association par nom a été retiré car son index était trop incomplet. Le repérage repose sur des indices de langue et ne certifie pas l’exactitude du français. Les états restent en mémoire pour cette page et sont inclus dans l’export JSON. Un changement de page ou **Effacer** remet le relevé à zéro.

Le diagnostic n’envoie rien et ne lit pas les valeurs des champs ni les éditeurs. Il peut inclure des noms propres ou du contenu personnalisé affiché : vérifie le rapport avant de le partager. Il est limité à 200 candidats et ne constitue pas un pourcentage de couverture du site.

## Mises à jour suivantes

Le header contient désormais deux liens vers le dépôt GitHub : Tampermonkey vérifie la version dans `shard-dnd-fr.meta.js` et télécharge `shard-dnd-fr.user.js` si une version plus récente est publiée. Ce mécanisme sera disponible après publication des deux fichiers sur la branche `main`.

Une ancienne installation par copier-coller doit être remplacée une première fois par cette version pour enregistrer les liens. Les mises à jour suivantes dépendent des réglages de vérification et d’installation de Tampermonkey ; elles ne sont pas nécessairement immédiates. Le `.meta.js` sert uniquement à vérifier la version : n’installe pas ce fichier à la place du script complet.

## Configuration

Le bouton apparaît **en haut à droite par défaut**. Une position déjà choisie dans une version précédente est conservée.

Le panneau contient :

- L’interrupteur principal **Traduction activée / désactivée**, placé tout en haut.
- **Afficher aussi les noms anglais (sorts, monstres, objets)** : affiche les noms français suivis du nom anglais, y compris pour l’équipement courant.
- Le choix des quatre coins de l’écran et **Ne pas afficher**.
- La recherche de fiches AideDD.
- **Repérer les traductions manquantes** : analyse volontaire de la page, repères orange et export JSON local des candidats à vérifier.

**Ne pas afficher** masque uniquement le bouton. Pour ouvrir la configuration, utilise **Alt + Maj + F** ou **Tampermonkey → D&D FR — Ouvrir la configuration**.

Le menu Tampermonkey contient deux réglages rapides : activer/désactiver la traduction et afficher/masquer le bouton. Une entrée de navigation séparée ouvre la configuration.

Les corrections manuelles, l’import/export JSON de corrections, les lecteurs intégrés et l’ouverture automatique du panneau ont été retirés. Les anciens réglages de source sont remplacés par **AideDD 2024 obligatoire pour les noms référencés**. Les anciennes corrections personnelles restent sauvegardées dans Tampermonkey, mais ne sont plus appliquées.

## Rechercher et ouvrir une fiche

Saisis un nom français ou anglais dans le panneau, puis appuie sur **Entrée** ou **Ouvrir ↗**. Une correspondance exacte ou unique ouvre directement la fiche AideDD dans un nouvel onglet. Les accents et les alias sont reconnus. Si plusieurs fiches correspondent, choisis le résultat voulu dans la liste.

Une fiche Shard reconnue de sort, de monstre ou d’objet magique reçoit également un lien **AideDD ↗** près du titre. Il ouvre la référence 2024 dans un nouvel onglet. Aucun lien n’est inventé pour une entrée absente du catalogue. Le lien suit les changements de fiche, même lorsque Shard réutilise la même fenêtre.

La recherche française dans les champs Shard reste active automatiquement : choisis une suggestion pour transmettre au champ son nom anglais attendu par Shard.

## Traduction et références

Les noms utilisent les cinq index AideDD 2024, avec un catalogue intégré de **1 341 correspondances**. La traduction directe conserve les références locales et le chargement à la demande des descriptions publiques, y compris leurs variantes anciennes lorsque le texte Shard correspond. Les fiches consultées sur AideDD s’ouvrent désormais hors du panneau.

Les données enregistrées dans Shard et les commandes de dés ne sont pas modifiées. Les traductions inconnues, les contenus maison et les textes de certains suppléments peuvent rester en anglais.

## Listes, Rage et armes · version 1.15

Complément de **44 descriptions et 10 libellés** : Rage 2024 complète (résistances, dégâts, durée et trois façons de la prolonger), Vol draconique, Souffle et résistance draconique, propriétés d’armes anciennes et 2024, puces de Thaumaturgie et compléments de Prestidigitation. « Blink Steps » reçoit le nom proposé « Pas éclair » ; aucun effet non fourni n’est inventé pour cette capacité.

Les **19 descriptions de propriétés d’armes** couvrent notamment Lourde, Légère, Lancer, Deux mains, Finesse, Allonge, Chargement, Portée, Polyvalente et Munitions. Les versions anciennes et 2024 restent distinctes : la propriété Lourde ancienne concerne les petites créatures, alors que sa version 2024 utilise des seuils de Force ou de Dextérité.

Un nouveau générateur produit **435 correspondances de segments SRD** : effets séparés, introductions et titres de sorts, ainsi que paragraphes d’amélioration et d’emplacements supérieurs. Les options nommées de Thaumaturgie, Prestidigitation, Druidisme, Injonction, Illusion mineure, Modification d’apparence, Détection des pensées, Main arcanique, Invocation de céleste, Glyphe de garde, Symbole et les puces de Malédiction sont appariées explicitement. Les titres d’amélioration sont reconnus dans 124 sorts. Les morceaux dont les dés ne correspondent pas, ou changent d’ordre entre les langues, ne sont pas ajoutés comme blocs complets ; les options connues restent traduisibles séparément.

Les tests vérifient les puces réellement présentes dans les listes, les titres gras, les liens, les commandes de dés, la distinction entre le sort Lumière et la propriété Légère, ainsi que le retour exact au HTML anglais. Les traductions dépendent toujours du texte affiché ; certains suppléments et variantes peuvent rester inconnus.

## Mise en forme et capacités · version 1.14

Les titres et termes reconnus placés dans des balises de gras ou d’italique restent dans leurs balises après traduction. Le moteur conserve les éléments HTML, les liens et les commandes de dés ; un titre en gras ne reçoit plus tout le paragraphe français. Une emphase sur un fragment inconnu ou reformulé sans correspondance identifiable peut encore demander une traduction ciblée.

Ajout de **22 descriptions et 7 libellés** pour les capacités du Barbare et du Berserker à haut niveau, la récupération de Présence intimidante et les effets Usurpation d’identité et Imitation du don Comédien. Les quatre effets de Coup brutal utilisent les noms du SRD français : Coup appuyé, Coup au jarret, Coup stupéfiant et Coup déchirant.

Les dés absents d’un copier-coller sont vérifiés dans les passages SRD correspondants : Frénésie utilise des d6, Coup brutal 1d10 puis 2d10, et Coup déchirant accorde +5. La traduction s’applique au texte correspondant réellement présent dans le DOM ; aucune valeur n’est déduite du niveau du personnage.

## Bottes d’arme · version 1.13.1

Les descriptions des huit bottes sont intégrées : **Enchaînement, Écorchure, Coup double, Poussée, Sape, Ralentissement, Renversement et Ouverture**. Les noms proviennent des correspondances SRD déjà présentes ; les nouvelles descriptions sont des adaptations françaises du SRD 5.2.1 anglais, avec les distances conservées en feet.

Le nom anglais « Slow » est reconnu comme **Ralentissement** dans le contexte d’une arme ou d’une description de botte. Le sort reste **Lenteur**, avec son lien AideDD. Les termes et descriptions inconnus ne sont pas rapprochés approximativement.

## Ajouts de traduction · version 1.13

Le complément comprend **41 descriptions** pour le Guerrier, le Barde, le Paladin, l’Elfe, le Gnome, le Halfelin et l’Humain, ainsi que **4 libellés**. Les descriptions sont des adaptations françaises des passages du SRD 5.2.1 anglais.

Les nouvelles traductions sont organisées en fichiers thématiques détectés automatiquement pendant la génération. Le projet comprend une validation des contradictions et des dés, un audit local des passages anglais inconnus et un guide d’ajout. L’installation utilise toujours le seul fichier `shard-dnd-fr.user.js`.

Les optimisations du moteur sont incluses : catalogues indexés, correspondances de descriptions réutilisées et migration des anciennes clés de cache.

## Organisation et corpus · version 1.16

Les traductions sont regroupées par grandes catégories dans le dépôt. L’installation utilise toujours uniquement `shard-dnd-fr.user.js`.

Le corpus local comprend désormais la prose des 232 aptitudes indexées des 12 classes SRD, des 10 métamagies et des 28 manifestations occultes. Les descriptions existantes sont conservées lorsqu’elles couvrent déjà le même texte. Les dés cliquables gardent aussi leur casse originale.

Le rapport `audit/couverture-traductions.json` à la racine du dépôt distingue les noms AideDD, les descriptions locales et les limites. Les sources SRD ne contiennent pas tous les suppléments ni toutes les sous-classes. Les autres fiches publiques AideDD restent chargées à la consultation ; une variante Shard différente peut rester en anglais.

## Armes et sous-sections · version 1.17

Le catalogue des 38 armes SRD 2024 est testé avec toutes les propriétés et bottes associées. Les variantes de propriétés sans exemple sont prises en charge, notamment Légère.

Les rubriques d’aptitudes sont reliées par leur titre dans les deux langues. Cela ajoute 284 sous-sections et variantes des 12 classes : rubriques d’incantation, options, références au chapitre 7 et introductions génériques de sous-classe. Briseur de hordes et le Manteau d’inspiration fourni sont pris en charge avec leur texte complet. Les aptitudes de toutes les sous-classes hors SRD restent à compléter ; la traduction de leurs noms ne garantit pas celle de leurs descriptions.

## Mise en forme des sorts · version 1.17.1

Les effets nommés et paragraphes sont maintenant traités séparément. Élémentalisme conserve ses six paragraphes, ses titres en gras et en italique, et chaque effet reste à sa place. Le script ne découpe plus une traduction complète en phrases réparties arbitrairement sur la fiche.

Les passages AideDD correspondants sont prioritaires sur la traduction SRD locale, y compris après rechargement grâce au cache. Certaines fiches AideDD sont abrégées ou ne correspondent pas exactement au texte anglais de Shard : le passage SRD reste alors disponible pour conserver les règles. Les noms et les valeurs de jeu de la fiche ne sont pas remplacés par ceux d’une autre version.

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
