# Données embarquées et sources des constantes

Depuis la version 1.17.38, les traductions des anciens dictionnaires sont intégrées aux packs de `translations/`, par catégorie et par édition. Il n’existe plus de constante par lot historique ou par classe. Les 19 TSV ont été retirés après migration de leurs correspondances, alias et usages.

Les corrections se font dans les sources éditables, puis avec `npm run build`. Ne pas modifier directement le userscript distribué.

## Les données réellement embarquées

[work/build.py](../work/build.py) produit six constantes :

| Constante | Source et rôle |
| --- | --- |
| `SCRIPT_VERSION` | Version de `package.json` |
| `TRANSLATION_TERMS` | Liste d’objets `{ en, fr, source, category, aliases, usage }`, issue des packs `traductions.json` : libellés, correspondances historiques, recherche et affichage bilingue |
| `AIDEDD_CATALOG` | [Catalogue 2024](../sources-generation/catalogues/aidedd-2024.json) : noms prioritaires, liens, alias et recherche |
| `REFERENCE_CATALOG_2014` | [Catalogue 2014](../sources-generation/catalogues/2014.json) : sélection des références anciennes, toujours utilisée |
| `COMPLETE_TEXTS` | Paragraphes, champs et sections assemblés par [make-complete-texts.py](../work/make-complete-texts.py) |
| `MONSTER_ACTION_TITLES` | [Titres bilingues d’aptitudes](../translations/dnd-2024/mm/monstres/titres-aptitudes.json) nécessaires à l’appariement des monstres |

Les constantes sont des formats de livraison, pas des fichiers de maintenance supplémentaires. Les catalogues contiennent des noms et références ; ils ne constituent pas des traductions de descriptions.

Depuis la 1.17.43, `TERM_META` est intégré à `TRANSLATION_TERMS`. Chaque traduction et ses métadonnées sont livrées ensemble. Le moteur construit un index en mémoire à partir de cette liste pour les remplacements, les alias et les usages `name`, `spell` et `search`. Les noms prioritaires du catalogue AideDD sont appliqués ensuite, comme auparavant.

## Migration des anciens lots

Les 17 dictionnaires historiques (`MONSTERS`, `SPELLS`, `TERMS`, `EQUIPMENT`, `INTERFACE`, `RULES2024`, `MAGICITEMS`, `GM`, `EXPANSION`, `DESCRIPTIONS`, `DRUID`, `CREATION`, `CANONICAL_SPELLS`, `CANONICAL_FEATURES`, `CANONICAL_COMBAT`, `COMBAT_DESCRIPTIONS`, `FEATURE_TERMS`) ont été fusionnés dans les packs existants.

Les anciennes lignes répétées ne sont pas toutes recopiées : la traduction effective est conservée une fois, avec les anciens noms français utiles dans `aliases`. Les usages du mode bilingue, des noms de sorts en prose et des suggestions de recherche sont préservés dans les métadonnées `usage`.

Les phrases du lot `DRUID` rejoignent les classes du PHB ; ses traits d’elfe rejoignent les espèces. Le rattachement des 48 sous-classes à leurs classes est maintenu dans [sous-classes.json](../translations/dnd-2024/phb/classes/sous-classes.json). Ce fichier ne duplique pas leurs traductions : le générateur lit leurs noms français dans le pack des classes. Les métamagies et corrections SRD ne dépendent plus de TSV séparés.

Les valeurs de `usage` décrivent des comportements précis : `name` autorise le nom bilingue, `spell` reconnaît un nom de sort en prose, `search` l’ajoute aux suggestions et `inline` conserve une correspondance historique également utilisée dans les remplacements de texte. Les nouvelles descriptions ordinaires n’ont pas besoin de ces options.

## Code et répétitions retirés

`REFERENCE_ALIASES` et l’index `referenceByEnglish` n’étaient jamais consultés : ils ont été supprimés. `SPELL_REFERENCE` et le repli `referenceBodies` répétaient des descriptions déjà présentes dans `COMPLETE_TEXTS` ; ils ne sont plus livrés. Leur source [reference-srd.json](../translations/dnd-2024/phb/sorts/reference-srd.json) reste nécessaire aux générateurs et est conservée.

`COMPLETE_TEXTS` est dédoublonné selon la normalisation du moteur. La première traduction garde la priorité, sauf correction locale explicite ; les provenances multiples sont réunies dans `sources`. Les répétitions de champs entre sorts ne gonflent plus la sortie. Des paragraphes et phrases de longueurs différentes restent nécessaires lorsque Shard les affiche séparément.

## Équipement du guide Shard

Les compléments sont éditables dans [2014/shard-players-guide-v1](../translations/2014/shard-players-guide-v1/). Leur provenance distingue les traductions du relevé Shard des adaptations du SRD 5.1 français. Les poids et valeurs de jeu du guide sont conservés.

Le relevé HTML et les tests couvrent les chapitres Équipement et Objets magiques, les 239 notices du chapitre et les 1 372 fiches de la liste d’équipement, y compris les variantes. Cela ne valide pas les autres chapitres du guide ni tous les suppléments.

## Lexique et descriptions

[lexique-en-fr.json](../outputs/lexique-en-fr.json) reste un export du lexique après priorité AideDD. Les descriptions sont assemblées séparément dans `work/generated/complete-texts.json` puis livrées dans `COMPLETE_TEXTS`.

La [couverture](../audit/couverture-traductions.json) distingue les noms, libellés, blocs et contrôles par livre. Un nombre d’entrées ne mesure pas à lui seul la couverture de Shard.
