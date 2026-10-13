# Shard Tabletop — D&D FR

Script Tampermonkey de traduction française pour [Shard Tabletop](https://play.shardtabletop.com/), version **1.12.0**.

## Installation

1. Installer Tampermonkey dans le navigateur.
2. Créer un script et y copier le contenu de [`outputs/shard-dnd-fr.user.js`](outputs/shard-dnd-fr.user.js).
3. Enregistrer puis recharger Shard. Garder un seul exemplaire actif.
4. Autoriser `www.aidedd.org` si Tampermonkey le demande.

Consulter le [guide complet](outputs/INSTALLATION.md) pour les réglages, les recherches en français et les liens AideDD.

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

Les sources et dictionnaires se trouvent dans `work/`. `work/build.py` produit le userscript et les catalogues dans `outputs/`. `work/header.txt` contient les métadonnées Tampermonkey. Les fichiers générés sont versionnés pour faciliter l’installation.

Les tests inclus couvrent la configuration, la recherche et les liens, les aptitudes de personnages, les variantes de métamagie, les interactions et le retour au texte anglais.

## Licences et attribution

Le code est sous licence MIT ; les textes SRD et autres contenus gardent leurs licences respectives. Voir [LICENSE](LICENSE) et [NOTICE.md](NOTICE.md). Projet indépendant, non affilié à Shard Tabletop, AideDD ou Wizards of the Coast.
