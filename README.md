# Shard Tabletop — D&D FR

Script Tampermonkey de traduction française pour [Shard Tabletop](https://play.shardtabletop.com/).

## Installation

1. Installer Tampermonkey dans le navigateur.
2. Créer un script et y copier le contenu de [`outputs/shard-dnd-fr.user.js`](outputs/shard-dnd-fr.user.js).
3. Enregistrer puis recharger Shard. Garder un seul exemplaire actif.
4. Autoriser `www.aidedd.org` si Tampermonkey le demande.

Consulter le [guide complet](outputs/INSTALLATION.md) pour les réglages, les recherches en français et les liens AideDD.

## Mises à jour automatiques

`npm run build` génère aussi `outputs/shard-dnd-fr.meta.js`, qui contient uniquement le header du script, avec la même version et les mêmes métadonnées. Tampermonkey consulte ce petit fichier via `@updateURL`, puis télécharge le script complet via `@downloadURL` lorsqu’une nouvelle version est disponible.

Pour préparer une mise à jour, exécuter `npm run version:patch` puis `npm test`. La commande augmente la version dans `package.json` et reconstruit les livrables ; le build synchronise aussi `package-lock.json`. Aucun numéro n’est à recopier dans le header, le panneau ou le lexique. Pour choisir un numéro précis : `npm run version:set -- 1.18.0`, puis `npm run build`. Commit et pousser les fichiers générés sur `main`, y compris le `.meta.js`, rend ensuite la mise à jour disponible.

Les utilisateurs ayant une ancienne installation par copier-coller doivent remplacer une fois leur script par la version contenant ces liens. Ensuite, les vérifications et installations de mises à jour suivent leurs réglages Tampermonkey. Le fichier `.meta.js` ne s’installe pas : le fichier à installer reste le [script complet](https://raw.githubusercontent.com/lucas-martinati/shard-dnd-fr/main/outputs/shard-dnd-fr.user.js).

## Fonctionnalités

- Traduction dans les pages : sorts, monstres, objets, dons, aptitudes, métamagie et création de personnage.
- Paramètres de campagne (choix et aides), trésor partagé, commandes de fiche et menus contextuels du MJ sur la carte.
- Catalogue de noms AideDD 2024 et descriptions locales, avec consultation des références publiques à la demande.
- Recherche française, noms bilingues optionnels et lien direct AideDD.
- Bouton déplaçable ou masquable, panneau accessible par `Alt + Maj + F`.
- Conservation des éléments interactifs, des dés et des valeurs de jeu ; restauration de l’anglais à la désactivation.
- Diagnostic volontaire : contours orange pour la page, rouges pour les descriptions incomplètes, avec rapports et exports JSON séparés.
- Contrôle facultatif du texte des descriptions depuis les listes, avec progression, arrêt, priorité aux sources 2024 et états réservés aux fiches examinées.

La couverture reste partielle pour les suppléments et contenus maison. Les descriptions anciennes et 2024 sont distinguées d’après leur texte. Les traductions proposées ne sont pas toutes des formulations officielles.

L’objectif est la traduction intégrale de toutes les références accessibles depuis l’accueil, avec au minimum les six rubriques d’options du personnage et les dix types personnalisés. Le [périmètre à compléter](docs/AUDIT-COUVERTURE.md#objectif-minimal--toutes-les-références-accessibles-depuis-laccueil) distingue les résumés déjà traduits des fiches complètes restant à vérifier.

## Développement

Prérequis : Python 3 et Node.js 22 ou supérieur.

```sh
npm ci
npm run build
npm test
```

Les traductions sont organisées dans `translations/dnd-2024/phb/`, `translations/dnd-2024/mm/` et `translations/2014/`, avec l’interface séparée. Les règles du joueur 2024 issues du SRD sont rangées avec le PHB ; le corpus historique et le lexique de compatibilité sont regroupés sous 2014. Voir [l’organisation des traductions](translations/README.md). Les inventaires et le suivi des livres sont dans [audit/](audit/README.md), les entrées techniques dans [sources-generation/](sources-generation/README.md), les outils dans `work/` et leurs résultats intermédiaires dans `work/generated/`. Les aptitudes et options SRD sont des données bilingues éditables dans le PHB ; [leur provenance](translations/dnd-2024/phb/SOURCES-SRD.md) est conservée. Le build ne dépend plus d’extraits PDF. Les fichiers Tampermonkey distribués sont générés dans `outputs/`.

Les constantes de données du userscript sont toutes sérialisées au format JSON compact, une déclaration par ligne. Les fichiers sources JSON restent indentés pour faciliter leur édition ; les retours à la ligne contenus dans les traductions sont conservés sous forme échappée.

Les tests sont regroupés dans `tests/`, avec les extraits HTML dans `tests/fixtures/`. `npm test` lance les suites JavaScript et Python. Les tests inclus couvrent la configuration, la recherche et les liens, les aptitudes de personnages, les variantes de métamagie, les interactions, la migration du cache et le retour au texte anglais.

`npm run test:interface` vérifie le panneau de paramètres de campagne relevé dans Shard, les menus ajoutés dynamiquement, les libellés de fiche, les dialogues de repos court et long et les infobulles. Il contrôle aussi la conservation des valeurs, des cases cochées, des liens et des interactions, les compteurs de dés de vie et de PV, puis la restauration exacte de l’anglais.

`npm run test:spells` vérifie les paragraphes de sorts, leurs découpages SRD et 17 fiches HTML relevées dans le PHB Shard, avec les nombres, les dés, les liens et les tableaux. Cette suite contrôle aussi les 77 noms d’objets examinés. Les frontières de paragraphes EN/FR sont éditables dans `translations/dnd-2024/phb/sorts/decoupage-srd.json` : chaque frontière est associée explicitement à son équivalent, même si leur ordre diffère entre les deux langues.

`npm run test:mm` contrôle les dix premiers profils MM complétés dans Shard : 33 paragraphes de traits et d’actions, dés, liens et retour exact à l’anglais. L’inventaire des 469 profils du livre importé est dans `audit/inventaires/mm/shard-2024.json` ; il ne signifie pas que ces 469 profils sont intégralement traduits.

`npm run test:catalogue-names` vérifie les deux rapports utilisateur du 15 octobre : 92 candidats de monstres, 200 libellés d’objets et 110 variantes supplémentaires. Il relance le diagnostic pour vérifier que les noms corrigés n’y figurent plus, et contrôle les noms propres conservés, les champs privés, les clics et le retour exact à l’anglais. Le rapport d’objets reçu est tronqué à 200 candidats ; il ne constitue pas un inventaire de tous les noms ou descriptions manquants.

`npm run audit:spells` analyse hors ligne les 391 fiches publiques relevées le 15 octobre 2026 et écrit `audit/generes/sorts-phb-2024.json`. Ce contrôle complet peut prendre plusieurs minutes. Il recense les paragraphes restés identiques à l’anglais, y compris les légendes et noms propres à vérifier ; il ne mesure pas à lui seul l’exactitude de toutes les traductions. Il ne lit aucun champ de personnage ou de campagne et ne fait aucune requête réseau. Pour comparer un autre script : `node work/audit-spells.cjs --script /chemin/script.user.js --output /chemin/rapport.json`.

Les catalogues de noms et de références sont indexés au démarrage. Les listes de correspondances de descriptions sont réutilisées jusqu’à leur prochaine modification. `npm run benchmark` mesure l’initialisation, la traduction de 400 blocs, 100 mutations et la restauration dans JSDOM ; il ne mesure pas le chargement complet de Shard ni les appels réseau.

La vérification GitHub Actions reconstruit le script et refuse les livrables désynchronisés de leurs sources avant de lancer les tests. Après chaque modification, régénérer et versionner les fichiers produits par `npm run build`.

La 1.17.7 permet de traduire les portions connues autour des boutons et champs intégrés à une description, sans modifier leurs valeurs ni leurs gestionnaires. Les correspondances distantes vérifient les nombres, les dés, les négations explicites et la complétude des phrases. Les aptitudes de monstres exigent un titre bilingue attesté ; une signature numérique unique ne suffit plus. Les introductions légendaires restent appariées par leur rubrique et leur rôle explicite. Ces contrôles sont conservateurs et ne prouvent pas l’équivalence de deux règles. Les anciennes paires distantes en cache sont rechargées avec les nouveaux contrôles.

La 1.17.8 ajoute les deux paragraphes d’Inspiration héroïque fournis : relance immédiate de n’importe quel dé avec obligation de conserver le nouveau résultat, et perte de l’Inspiration reçue en double sauf transfert à un personnage joueur qui n’en a pas. Cette règle 2024 reste distincte de l’ancienne Inspiration qui donne l’Avantage.

La 1.17.9 complète 20 paragraphes relevés sur 16 fiches d’équipement dans Shard : 15 objets usuels (fioles, billes, chausse-trappes, trousse de soins, piège, menottes, pied-de-biche, antitoxine, boîte à amadou et lanternes) et la dague en adamantium. Elle ajoute aussi 9 noms exacts et 4 libellés d’interface. Les règles anciennes restent distinctes des versions 2024, même lorsque Shard rattache une ancienne description au livre 2024. Les liens, dés, titres en gras/italique et la restauration exacte de ces extraits sont vérifiés localement ; cet échantillon ne couvre pas tout le catalogue d’objets.

La 1.17.10 ajoute 1 972 correspondances pour les aptitudes, dons et armes après ouverture des 60 fiches de classes/sous-classes, des 131 dons et de 48 armes représentatives. Les 450 noms du catalogue d’armes sont vérifiés localement. Elle centralise aussi la version dans `package.json`, avec `npm run version:patch` pour incrémenter et reconstruire. Le [complément d’audit](docs/AUDIT-COUVERTURE.md) précise le périmètre et les limites.

La 1.17.11 corrige les espaces manquants dans six aptitudes SRD et une métamagie, dont Défense supérieure du Moine. Elle ajoute 23 paragraphes et variantes locaux pour Communication avec les animaux, Trait ensorcelé, Rayon de lune, Animation des morts et Terrain hallucinatoire. `npm run test:corpus` permet de lancer les validations du corpus et ces régressions ciblées sans parcourir tout le catalogue Shard ; `npm test` conserve les autres simulations de fiches.

La 1.17.12 ajoute 347 correspondances pour les dix rubriques de références personnalisées et les paragraphes du Manoir somptueux de Mordenkainen. Les 192 cartes et fiches intégrales accessibles ont été relevées et vérifiées localement : maladies, ascendances draconiques, manifestations, styles, manœuvres, propriétés de botte, métamagie, Magie sauvage, pactes et bottes d’arme. `npm run test:references` vérifie leur rendu et exécute le même analyseur que le panneau. Les objets restent hors de cette passe ; le [relevé détaillé](audit/inventaires/references-personnalisees.json) précise les sources et limites.

## Repérer un passage non traduit

1. Ouvrir la fiche ou la liste concernée dans Shard, avec la traduction activée.
2. Ouvrir D&D FR (bouton ou `Alt + Maj + F`) puis **Repérer les traductions manquantes**.
3. Cliquer sur **Analyser la page**. Les candidats sont entourés en orange et regroupés dans le panneau avec leur contexte et une cause possible : formulation absente, structure non reconnue, référence indisponible ou conflit.
4. Cliquer sur **Exporter le rapport JSON** pour enregistrer le relevé, ou sur **Effacer** pour retirer les repères.

L’analyse porte sur les textes affichés et les attributs d’affichage, pas sur les valeurs des champs ou les éditeurs. Elle n’envoie rien et ne sauvegarde pas le rapport automatiquement. Elle peut relever des noms propres et des textes personnalisés : les candidats doivent être triés avant d’ajouter une traduction ou de partager le rapport. Un changement de page efface les repères ; après un changement de contenu ou la fin d’un chargement AideDD, relancer l’analyse. Le relevé est limité à 200 candidats distincts et indique lorsqu’il a été tronqué. Il ne mesure pas la couverture de tous les écrans de Shard.

L'[audit de couverture du 13 octobre 2026](docs/AUDIT-COUVERTURE.md) distingue les pages observées avec Tampermonkey, les corpus locaux et les zones encore à examiner. La version 1.17.2 complète notamment la navigation, les 15 états SRD 2024 et les traits/lignages d'espèce ; la 1.17.3 ajoute les variantes des ascendances de goliath repérées dans Shard. Les tests vérifient aussi les titres Shard rendus avec les classes CSS de gras/italique.

La 1.17.4 traduit les descriptions de présentation relevées dans les catalogues : 10 espèces et 24 lignages 2024, 12 classes, 48 sous-classes et 16 historiques, ainsi que les présentations anciennes disponibles. Les 248 paragraphes et puces des cartes sont testés avec leur HTML d'origine, y compris les accroches en italique et les préceptes des paladins. Le catalogue `audit/inventaires/descriptions-visibles.json` distingue cette couverture des descriptions d'aptitudes.

La 1.17.5 complète les 48 fiches relevées dans le catalogue Conditions : états anciens, états 2024 et effets Shard tels que Vision dans le noir, En sang, encombrement, abris, agrandissement et rapetissement. Les règles affichées restent celles de chaque fiche, y compris les différences d’Épuisement et d’Étourdi entre éditions. Les tableaux, liens et dés sont testés à partir du HTML réel ; `audit/inventaires/conditions-shard.json` inventorie ce corpus.

La 1.17.6 couvre localement les descriptions des 75 dons PHB 2024, dont les 12 faveurs épiques, avec les styles de combat, les prérequis et les variantes anciennes relevées. Les tests portent sur 131 cartes Shard, 20 fiches ouvertes et les descriptions détaillées complétées par les références anglaises et l’extrait utilisateur. Ce corpus comprend 223 extraits et 739 blocs/champs ; les 75 fiches détaillées n’ont pas toutes été vérifiées en direct dans Shard.

Pour le bestiaire, cette version traduit localement la tarasque entière et 217 traits communs relevés sur 183 créatures. Elle ajoute aussi 628 titres d’aptitudes pour améliorer la traduction des descriptions chargées à la consultation. L’audit des 498 références identifie 1 912 appariements sur 2 171 blocs anglais ; ces appariements ne prouvent pas une traduction complète de tous les monstres dans Shard. Les descriptions absentes ou incompatibles restent à compléter. Gras, italiques, liens, paragraphes et dés avec leurs icônes sont testés, ainsi que le retour exact à l’anglais.

## Ajouter des traductions

Tous les fichiers `traductions.json` sous `translations/`, y compris dans les dossiers de livres, sont détectés automatiquement à la génération. Ajouter un texte anglais, son français et sa source suffit ; aucun changement du moteur n’est nécessaire.

Voir le [guide d’ajout de traductions](docs/AJOUTER-DES-TRADUCTIONS.md), qui explique les variantes, les libellés et l’audit d’extraits HTML.

```sh
npm run translations:check
npm run translations:coverage
npm run translations:audit -- /chemin/extrait.html
npm run build
npm test
```

## Licences et attribution

Le code est sous licence MIT ; les textes SRD et autres contenus gardent leurs licences respectives. Voir [LICENSE](LICENSE) et [NOTICE.md](NOTICE.md). Projet indépendant, non affilié à Shard Tabletop, AideDD ou Wizards of the Coast.

`npm run test:diagnostics` vérifie les deux modes d’analyse : page visible et parcours du texte des descriptions. Les contrôles couvrent les exports et effacements indépendants, les contours rouges, les 118 passages récupérés des rapports de sorts 1.17.19/1.17.20 (dont 23 déjà couverts), l’absence du mode par nom, le choix de la source 2024 (dont Bouclier), les états, l’arrêt, les changements de page, les références distantes en attente, l’exclusion des champs et les 93 candidats du rapport d’objets 1.17.17.
