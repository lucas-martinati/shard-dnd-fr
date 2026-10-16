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

Le [relevé des données embarquées](docs/DONNEES-GENEREES.md) décrit les sept constantes générées depuis les packs, les priorités et le retrait des anciens dictionnaires et index inutilisés. L’export `lexique-en-fr.json` contient le lexique ; les descriptions complètes sont assemblées dans `COMPLETE_TEXTS` et ne figurent pas toutes dans cet export.

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

La 1.17.32 complète 32 textes du rapport utilisateur 1.17.24 : 25 traits et libellés d’espèce (aasimar, drakéide, elfe, gnome, humain et tieffelin), ainsi que 7 titres du PHB. Les cinq souffles conservent chacun leur type de dégâts. `npm run test:species` vérifie les formulations signalées, leurs occurrences, les titres combinés aux descriptions, les dés et liens cliquables, le diagnostic et la restauration exacte de l’anglais dans un HTML simulé. Le nom de source « D&D 2024 PHB » est conservé. Ce contrôle ne valide pas toutes les fiches d’espèce dans Shard.

La 1.17.33 traduit le bouton **Subclasses → Sous-classes**. L’analyseur ignore automatiquement les libellés complets Source/Sources, Shard Tabletop, les références PHB/MM/DMG, les SRD et les guides Shard, ainsi que les titres de livres attestés par les mentions Source de la page. Cela comprend leurs attributs d’affichage et les lignes « Source. Nom du livre ». Ces exclusions n’altèrent pas l’affichage et ne masquent pas un paragraphe de règles qui cite un livre ou l’application.

La 1.17.34 ajoute des limites d’analyse mémorisées pour les résultats, les éléments examinés et les fiches par passage ; 0 supprime la limite correspondante. Les paragraphes longs restent analysés et les exports indiquent les réglages utilisés. Elle complète 80 champs des 16 historiques PHB 2024 relevés dans les fiches publiques : caractéristiques, dons, compétences, outils et choix d’équipement, avec leurs quantités et monnaies. `npm run test:backgrounds` vérifie les titres, italiques, liens, poids et la restauration. Elle ajoute aussi 16 paragraphes de 8 sorts repérés par l’audit local : Protection contre le mal et le bien, Bouclier, Perception bestiale, Agrandissement/Rapetissement, Petite hutte de Léomund, Lenteur, Flétrissement et Compulsion. Les formulations anciennes importées gardent leurs règles exactes. Ces ajouts ne valident pas la traduction intégrale des dons, équipements, sorts ou historiques anciens.

La 1.17.35 traite les rapports PHB 1.17.34 de classes (17 candidats), dons (11) et équipement (90). Les profils des trois compagnons du rôdeur restent rangés avec les classes du PHB. Leurs statistiques, dés et variables `{proficiency}`, `{summoner wis}` et `{summoner proficiency}` sont conservés ; les colonnes SAVE deviennent « Sauvegarde » dans les tableaux de caractéristiques, tandis que les commandes Save gardent « Enregistrer ». Le lien D20 Test permet désormais d’appliquer la traduction existante de Chanceux. Les poids isolés en lb et les fragments composés uniquement de variables et de calculs sont ignorés par le diagnostic, sans masquer les phrases qui les contiennent. `npm run test:book-reports` vérifie les 118 entrées signalées avec leurs occurrences, les tableaux des compagnons, les liens et le retour exact à l’anglais. Les nombres et unités des charges des véhicules sont également conservés.

La 1.17.36 traite les deux rapports de sorts du livre PHB fournis le 16 octobre (244 et 789 signalements). Elle ajoute 464 correspondances de paragraphes, rubriques, composantes et titres ; les règles, nombres, dés et unités de Shard sont conservés. Les corrections locales vérifiées priment sur le cache distant, ce qui évite qu’une ancienne formulation bloque le lien « Test de d20 » du don Chanceux. L’analyse de page attend la fin du traitement des traductions et peut être annulée par effacement ou navigation. `npm run test:book-reports` vérifie les 1 033 signalements, les rubriques du livre, les dés et liens cliquables, Chanceux avec un ancien cache, les vrais textes inconnus et la restauration exacte. Ces contrôles couvrent les extraits fournis, sans attester tout le catalogue de sorts.

La 1.17.37 corrige les 23 signalements du rapport utilisateur suivant, pour 12 sorts. Les descriptions de métamorphose animale, coquille antivie, convocations, contrôle du climat, création, demi-plan, colonne de flamme, festin des héros et tempête de radiance sont complétées. La phrase d’Aliénation conserve l’ordre de ses trois liens de sorts ; le temps d’incantation de Frappe piégeuse est reconnu aussi avec une action Bonus liée. `tests/test-spell-book-report-11736.cjs` vérifie les HTML relevés, les nombres, les dés, les liens, le diagnostic et la restauration exacte. Le relevé des constantes documente leur origine et les doublons, sans modifier leur organisation.

1. Ouvrir la fiche ou la liste concernée dans Shard, avec la traduction activée.
2. Ouvrir D&D FR (bouton ou `Alt + Maj + F`) puis **Repérer les traductions manquantes**.
3. Cliquer sur **Analyser la page**. Les candidats sont entourés en orange et regroupés dans le panneau avec leur contexte et une cause possible : formulation absente, structure non reconnue, référence indisponible ou conflit.
4. Cliquer sur **Exporter le rapport JSON** pour enregistrer le relevé, ou sur **Effacer** pour retirer les repères.

L’analyse porte sur les textes affichés et les attributs d’affichage, pas sur les valeurs des champs ou les éditeurs. Elle n’envoie rien et ne sauvegarde pas le rapport automatiquement. Elle peut relever des noms propres et des textes personnalisés : les candidats doivent être triés avant d’ajouter une traduction ou de partager le rapport. Un changement de page efface les repères ; après un changement de contenu ou la fin d’un chargement AideDD, relancer l’analyse. Par défaut, le relevé est limité à 200 candidats distincts et 10 000 éléments examinés. Les champs « Nombre maximal de résultats » et « Éléments à examiner » permettent d’augmenter ces limites ; 0 les supprime. Le champ « Fiches par passage » règle aussi le parcours des descriptions (100 par défaut, 0 pour toutes les fiches chargées). Les réglages sont mémorisés et les exports indiquent les limites utilisées. Un rapport indique lorsqu’il a été tronqué. Il ne mesure pas la couverture de tous les écrans de Shard.

L’[état de couverture](docs/AUDIT-COUVERTURE.md) distingue les pages observées avec Tampermonkey, les corpus locaux et les zones encore à examiner. La version 1.17.2 complète notamment la navigation, les 15 états SRD 2024 et les traits/lignages d'espèce ; la 1.17.3 ajoute les variantes des ascendances de goliath repérées dans Shard. Les tests vérifient aussi les titres Shard rendus avec les classes CSS de gras/italique.

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

La 1.17.38 intègre les anciens dictionnaires TSV aux packs JSON, réorganise les phrases du druide et retire les constantes et index redondants. Les compléments du Shard Player’s Guide Volume 1 couvrent les chapitres Équipement et Objets magiques, 239 notices et 1 372 fiches d’équipement, avec leurs variantes. `npm run test:guide` vérifie le relevé HTML hors ligne, les tableaux, liens, dés, poids et la restauration du contenu anglais. `npm run test:migration` contrôle les anciennes correspondances, les alias et les usages conservés. Voir [les données générées](docs/DONNEES-GENEREES.md) et [la provenance du guide](translations/2014/shard-players-guide-v1/README.md).

La 1.17.39 ajoute les cinq descriptions signalées dans le rapport 1.17.38 : les trois traits et actions de l’avatar de la mort et les deux paragraphes du carquois. Le test des rapports d’objets contrôle aussi les titres en gras, les dés cliquables, le poids original de 2 pounds et le retour exact à l’anglais.

La 1.17.40 présente le panneau comme un grimoire, avec des accents bordeaux et dorés et un bouton compact orné d’un dé à vingt faces. Quatre boutons disposés en grille permettent de choisir le coin de l’écran ; le choix est mémorisé et le masquage reste disponible. `Alt + Maj + F` ouvre ou ferme le panneau, et `Échap` le ferme. Les tests du panneau vérifient ces commandes, les états accessibles, les quatre emplacements et le maintien des interactions de recherche et de traduction.

La 1.17.41 complète les textes MJ fournis pour le trésor et les rencontres sur une carte : « Start → Commencer », « Finish → Terminer », le sélecteur de rencontre et ses aides. Le texte du trésor est reconnu aussi lorsqu’il est découpé en phrases ou paragraphes, avec ou sans la coquille anglaise « enounters ». `npm run test:interface` vérifie ces extraits dans un HTML simulé, les sauts de ligne, le gras, les boutons et infobulles, la conservation des champs privés et le retour exact à l’anglais. Ce contrôle couvre les textes fournis, sans attester tous les écrans du MJ.

La 1.17.42 traduit la composante matérielle de Nuée de dagues : « a sliver of glass → un éclat de verre ». Le contrôle des paragraphes de sorts couvre le matériau seul, les composantes complètes et leur libellé en gras, y compris lorsqu’il est déjà en français, avec restauration exacte de l’anglais.

La 1.17.43 relie les paragraphes SRD de Gardien de la foi et Suggestion de groupe aux quatre passages du rapport utilisateur 1.17.41 ; les 10 feet et les valeurs 20, 60 et 25 sont conservés. Le diagnostic reconnaît aussi les fragments anglais courts tels que « a sliver of glass » et « a pinch of salt », y compris dans un bloc partiellement traduit. Les tests vérifient des matériaux inconnus, les libellés mixtes, l’absence de signalement sur les exemples français, la traduction des quatre passages et leur disparition du diagnostic, ainsi que la restauration exacte. Cette détection reste fondée sur des indices de langue et ne garantit pas de repérer tout fragment anglais.
