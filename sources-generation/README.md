# Sources de génération

Ce dossier contient les entrées techniques utilisées par les générateurs, distinctes des inventaires d’audit et des packs éditables.

| Emplacement | Utilisation |
| --- | --- |
| `chemins.json` | Registre des chemins et ordre de lecture des dictionnaires ; conserve les priorités lors d’un déplacement |
| `catalogues/aidedd-2024.json` | Noms, traductions et liens des références AideDD 2024 |
| `catalogues/2014.json` | Références historiques utilisées pour les anciens contenus |
| `classes/sections-bilingues.json` | Titres EN/FR qui permettent de découper les aptitudes sans apparier leurs paragraphes au hasard |
| `personnage-2024/feature-descriptions.tsv` | Textes bilingues de départ des paragraphes et variantes de personnage générés |

Les outils sont dans `work/`. Leurs résultats intermédiaires sont dans `work/generated/` ; les fichiers distribués pour Tampermonkey restent dans `outputs/`. Le rapport de couverture est produit dans `audit/`.

Les aptitudes et options issues du SRD sont désormais éditables dans `translations/dnd-2024/phb/classes/descriptions-srd.json` et `options-srd.json`. Les générateurs les lisent directement ; `data/` et le découpage des PDF ont été retirés. Voir [leur provenance](../translations/dnd-2024/phb/SOURCES-SRD.md).
