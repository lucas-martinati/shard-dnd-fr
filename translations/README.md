# Organisation des traductions

Les traductions sont rangées en trois ensembles, avec l’interface Shard séparée :

| Dossier | Contenu |
| --- | --- |
| `dnd-2024/phb/` | Classes, dons, espèces, sorts, équipement et règles du joueur 2024, y compris leur contenu SRD 5.2.1 |
| `dnd-2024/mm/` | Bestiaire 2024 et titres bilingues d’aptitudes de monstres |
| `2014/` | Corpus historique de compatibilité : guide Shard, variantes 2014 et lexique ancien ou non spécifique à une édition |
| `interface/` | Boutons, menus et libellés de l’interface Shard |

Chaque ensemble est organisé par catégorie : classes, dons, espèces, sorts, armes, objets, monstres et règles. Les dossiers `commun`, `anciens` et `a-classer` ont été absorbés dans ces ensembles.

## Rangement et provenance

Le dossier choisit un emplacement de maintenance unique. Il ne déclare pas qu’un texte figure exclusivement dans un livre. Un même nom d’arme ou terme générique peut être utilisé en 2014 et en 2024 : il reste stocké une seule fois et le script le réutilise d’après son anglais exact.

Les sources précises et éditions des entrées sont conservées. `any` signifie que la traduction n’est pas propre à une édition identifiée ; un rangement dans `2014/` ne remplace pas cette information par une attribution 2014. Les noms du catalogue d’armes sans formulation propre à une édition sont rangés dans le lexique historique. Les catégories de dons 2024 et les effets attestés 2024 rejoignent le PHB.

Le guide Shard est une source du corpus historique, fondée majoritairement sur l’ancien SRD. Le dossier `2014/` ne prétend pas reproduire intégralement le PHB 2014, ni faire de tout contenu Shard un extrait de ce livre. Voir [le détail du classement](../audit/classement.json).

## Éditer une traduction

Modifier le `traductions.json` de l’ensemble et de la catégorie concernés. Les packs sont détectés récursivement. L’édition est définie une fois par pack, avec seulement les exceptions dans les entrées. La source précise est obligatoire, au niveau du pack ou de l’entrée. Le format courant est implicite ; les anciens packs avec `schemaVersion` explicite restent acceptés.

Les anciens dictionnaires TSV sont intégrés aux packs JSON ; leurs doublons, alias et usages sont conservés dans ces entrées. Les descriptions de dons sont séparées entre `2014/dons/descriptions.json` et `dnd-2024/phb/dons/descriptions.json`. Les descriptions bilingues de sorts et d’équipement 2024 se trouvent avec le PHB. Les titres bilingues d’aptitudes de monstres sont des données utilisées par le script, dans `dnd-2024/mm/monstres/`.

Les paragraphes de personnage 2024 et les variantes d’Attaque sournoise sont éditables directement dans les packs `dnd-2024/phb/classes/traductions.json` et `dnd-2024/phb/especes/traductions.json`. Les titres bilingues qui guident le découpage des aptitudes sont maintenus auprès des classes, dans `dnd-2024/phb/classes/sections-bilingues.json` ; leur format conserve les différentes formulations françaises reconnues.

## Autres données

- [Audit et inventaires](../audit/README.md) : relevés, dates, suivi des ensembles et contrôles restants.
- [Sources de génération](../sources-generation/README.md) : catalogues et entrées techniques des générateurs.
- [Résultats intermédiaires](../work/generated/README.md) : JSON reconstruits automatiquement.
- [Exports distribués](../outputs/README.md) : userscript, métadonnées et exports JSON générés.
- [Sources bilingues SRD du PHB](dnd-2024/phb/SOURCES-SRD.md) : aptitudes et options structurées, éditables dans `dnd-2024/phb/classes/`, sans dépendance à des extraits PDF.

Les inventaires restent utiles aux tests lorsque leurs textes sont traduits. Exécuter `npm run translations:check`, `npm run build` et `npm test`. Voir [le guide d’ajout](../docs/AJOUTER-DES-TRADUCTIONS.md).
