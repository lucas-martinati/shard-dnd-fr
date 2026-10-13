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

Pour publier une mise à jour, augmenter la version dans `package.json`, exécuter `npm run build` et `npm test`, puis commit et pousser les fichiers générés sur `main`, y compris le `.meta.js`. Les liens de mise à jour deviennent disponibles après cette publication.

Les utilisateurs ayant une ancienne installation par copier-coller doivent remplacer une fois leur script par la version contenant ces liens. Ensuite, les vérifications et installations de mises à jour suivent leurs réglages Tampermonkey. Le fichier `.meta.js` ne s’installe pas : le fichier à installer reste le [script complet](https://raw.githubusercontent.com/lucas-martinati/shard-dnd-fr/main/outputs/shard-dnd-fr.user.js).

## Fonctionnalités

- Traduction dans les pages : sorts, monstres, objets, dons, aptitudes, métamagie et création de personnage.
- Catalogue de noms AideDD 2024 et descriptions locales, avec consultation des références publiques à la demande.
- Recherche française, noms bilingues optionnels et lien direct AideDD.
- Bouton déplaçable ou masquable, panneau accessible par `Alt + Maj + F`.
- Conservation des éléments interactifs, des dés et des valeurs de jeu ; restauration de l’anglais à la désactivation.
- Diagnostic volontaire des passages à examiner : surlignage, causes possibles et export JSON local.

La couverture reste partielle pour les suppléments et contenus maison. Les descriptions anciennes et 2024 sont distinguées d’après leur texte. Les traductions proposées ne sont pas toutes des formulations officielles.

## Développement

Prérequis : Python 3 et Node.js 22 ou supérieur.

```sh
npm ci
npm run build
npm test
```

Les traductions et dictionnaires sont rangés par grandes catégories dans `translations/` : sorts, dons, classes, espèces, objets, armes, monstres, règles et interface. Les outils de génération se trouvent dans `work/`, les sources SRD dans `data/`. `work/build.py` produit le userscript et les catalogues dans `outputs/`. `work/header.txt` contient les métadonnées Tampermonkey. Les fichiers générés sont versionnés pour faciliter l’installation.

Les tests sont regroupés dans `tests/`, avec les extraits HTML dans `tests/fixtures/`. `npm test` lance les suites JavaScript et Python. Les tests inclus couvrent la configuration, la recherche et les liens, les aptitudes de personnages, les variantes de métamagie, les interactions, la migration du cache et le retour au texte anglais.

Les catalogues de noms et de références sont indexés au démarrage. Les listes de correspondances de descriptions sont réutilisées jusqu’à leur prochaine modification. `npm run benchmark` mesure l’initialisation, la traduction de 400 blocs, 100 mutations et la restauration dans JSDOM ; il ne mesure pas le chargement complet de Shard ni les appels réseau.

La vérification GitHub Actions reconstruit le script et refuse les livrables désynchronisés de leurs sources avant de lancer les tests. Après chaque modification, régénérer et versionner les fichiers produits par `npm run build`.

La 1.17.7 permet de traduire les portions connues autour des boutons et champs intégrés à une description, sans modifier leurs valeurs ni leurs gestionnaires. Les correspondances distantes vérifient les nombres, les dés, les négations explicites et la complétude des phrases. Les aptitudes de monstres exigent un titre bilingue attesté ; une signature numérique unique ne suffit plus. Les introductions légendaires restent appariées par leur rubrique et leur rôle explicite. Ces contrôles sont conservateurs et ne prouvent pas l’équivalence de deux règles. Les anciennes paires distantes en cache sont rechargées avec les nouveaux contrôles.

La 1.17.8 ajoute les deux paragraphes d’Inspiration héroïque fournis : relance immédiate de n’importe quel dé avec obligation de conserver le nouveau résultat, et perte de l’Inspiration reçue en double sauf transfert à un personnage joueur qui n’en a pas. Cette règle 2024 reste distincte de l’ancienne Inspiration qui donne l’Avantage.

## Repérer un passage non traduit

1. Ouvrir la fiche ou la liste concernée dans Shard, avec la traduction activée.
2. Ouvrir D&D FR (bouton ou `Alt + Maj + F`) puis **Repérer les traductions manquantes**.
3. Cliquer sur **Analyser la page**. Les candidats sont entourés en orange et regroupés dans le panneau avec leur contexte et une cause possible : formulation absente, structure non reconnue, référence indisponible ou conflit.
4. Cliquer sur **Exporter le rapport JSON** pour enregistrer le relevé, ou sur **Effacer** pour retirer les repères.

L’analyse porte sur les textes affichés et les attributs d’affichage, pas sur les valeurs des champs ou les éditeurs. Elle n’envoie rien et ne sauvegarde pas le rapport automatiquement. Elle peut relever des noms propres et des textes personnalisés : les candidats doivent être triés avant d’ajouter une traduction ou de partager le rapport. Un changement de page efface les repères ; après un changement de contenu ou la fin d’un chargement AideDD, relancer l’analyse. Le relevé est limité à 200 candidats distincts et indique lorsqu’il a été tronqué. Il ne mesure pas la couverture de tous les écrans de Shard.

L'[audit de couverture du 13 octobre 2026](docs/AUDIT-COUVERTURE.md) distingue les pages observées avec Tampermonkey, les corpus locaux et les zones encore à examiner. La version 1.17.2 complète notamment la navigation, les 15 états SRD 2024 et les traits/lignages d'espèce ; la 1.17.3 ajoute les variantes des ascendances de goliath repérées dans Shard. Les tests vérifient aussi les titres Shard rendus avec les classes CSS de gras/italique.

La 1.17.4 traduit les descriptions de présentation relevées dans les catalogues : 10 espèces et 24 lignages 2024, 12 classes, 48 sous-classes et 16 historiques, ainsi que les présentations anciennes disponibles. Les 248 paragraphes et puces des cartes sont testés avec leur HTML d'origine, y compris les accroches en italique et les préceptes des paladins. Le catalogue `translations/descriptions-visibles.json` distingue cette couverture des descriptions d'aptitudes.

La 1.17.5 complète les 48 fiches relevées dans le catalogue Conditions : états anciens, états 2024 et effets Shard tels que Vision dans le noir, En sang, encombrement, abris, agrandissement et rapetissement. Les règles affichées restent celles de chaque fiche, y compris les différences d’Épuisement et d’Étourdi entre éditions. Les tableaux, liens et dés sont testés à partir du HTML réel ; `translations/regles/conditions-shard.json` inventorie ce corpus.

La 1.17.6 couvre localement les descriptions des 75 dons PHB 2024, dont les 12 faveurs épiques, avec les styles de combat, les prérequis et les variantes anciennes relevées. Les tests portent sur 131 cartes Shard, 20 fiches ouvertes et les descriptions détaillées complétées par les références anglaises et l’extrait utilisateur. Ce corpus comprend 223 extraits et 739 blocs/champs ; les 75 fiches détaillées n’ont pas toutes été vérifiées en direct dans Shard.

Pour le bestiaire, cette version traduit localement la tarasque entière et 217 traits communs relevés sur 183 créatures. Elle ajoute aussi 628 titres d’aptitudes pour améliorer la traduction des descriptions chargées à la consultation. L’audit des 498 références identifie 1 912 appariements sur 2 171 blocs anglais ; ces appariements ne prouvent pas une traduction complète de tous les monstres dans Shard. Les descriptions absentes ou incompatibles restent à compléter. Gras, italiques, liens, paragraphes et dés avec leurs icônes sont testés, ainsi que le retour exact à l’anglais.

## Ajouter des traductions

Les fichiers `translations/<catégorie>/traductions.json` sont détectés automatiquement à la génération. Ajouter un texte anglais, son français et sa source suffit ; aucun changement du moteur n’est nécessaire.

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
