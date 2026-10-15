# Sources de génération

Ce dossier contient le registre technique et les catalogues de références utilisés par le build et le script, distincts des inventaires d’audit et des packs éditables.

| Emplacement | Utilisation |
| --- | --- |
| `chemins.json` | Registre des chemins et ordre de lecture des dictionnaires ; conserve les priorités lors d’un déplacement |
| `catalogues/aidedd-2024.json` | Noms, traductions et liens des références AideDD 2024 |
| `catalogues/2014.json` | Références historiques utilisées pour les anciens contenus |

Les catalogues restent ici car ils associent les noms aux types de références, alias et liens AideDD. Le catalogue 2024 sert aussi à traduire les noms ; il ne contient pas les descriptions des fiches et ne relève pas de l’interface Shard.

Les paragraphes de personnage 2024 sont maintenus dans les packs `translations/dnd-2024/phb/classes/traductions.json` et `especes/traductions.json`, sans copie intermédiaire spécifique. Les variantes d’Attaque sournoise sont explicites dans le pack des classes. Les titres EN/FR utilisés pour découper les aptitudes sont dans `translations/dnd-2024/phb/classes/sections-bilingues.json`.

Les outils sont dans `work/`. Leurs résultats intermédiaires sont dans `work/generated/` ; les fichiers distribués pour Tampermonkey restent dans `outputs/`. Le rapport de couverture est produit dans `audit/`.

Les aptitudes et options issues du SRD sont désormais éditables dans `translations/dnd-2024/phb/classes/descriptions-srd.json` et `options-srd.json`. Les générateurs les lisent directement ; `data/` et le découpage des PDF ont été retirés. Voir [leur provenance](../translations/dnd-2024/phb/SOURCES-SRD.md).
