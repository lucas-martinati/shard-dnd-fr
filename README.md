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

Les catalogues de noms et de références sont indexés au démarrage. Les listes de correspondances de descriptions sont réutilisées jusqu’à leur prochaine modification. `npm run benchmark` mesure l’initialisation dans JSDOM ; il ne mesure pas le chargement complet de Shard ni les appels réseau.

L'[audit de couverture du 13 octobre 2026](docs/AUDIT-COUVERTURE.md) distingue les pages observées avec Tampermonkey, les corpus locaux et les zones encore à examiner. La version 1.17.2 complète notamment la navigation, les 15 états SRD 2024 et les traits/lignages d'espèce ; la 1.17.3 ajoute les variantes des ascendances de goliath repérées dans Shard. Les tests vérifient aussi les titres Shard rendus avec les classes CSS de gras/italique.

La 1.17.4 traduit les descriptions de présentation relevées dans les catalogues : 10 espèces et 24 lignages 2024, 12 classes, 48 sous-classes et 16 historiques, ainsi que les présentations anciennes disponibles. Les 248 paragraphes et puces des cartes sont testés avec leur HTML d'origine, y compris les accroches en italique et les préceptes des paladins. Le catalogue `translations/descriptions-visibles.json` distingue cette couverture des descriptions d'aptitudes.

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
