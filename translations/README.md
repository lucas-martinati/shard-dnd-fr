# Organisation des traductions

Les nouveaux ajouts visent D&D 2024 : PHB en priorité, puis MM. Les trois livres restent distincts.

| Dossier | Rôle |
| --- | --- |
| `dnd-2024/phb/` | Traductions rattachées au D&D 2024 PHB par les sources ou les fiches archivées |
| `dnd-2024/mm/` | Traductions et titres d’aptitudes du D&D 2024 MM |
| `dnd-2024/commun/` | Règles et terminologie 2024 partagées, notamment les références SRD ; attribution à un livre précis non établie pour tous les blocs |
| `anciens/shard-player-guide-volume-1/` | Traductions rattachées au guide Shard, conservées pour compatibilité |
| `anciens/commun/` | Variantes 2014 et dictionnaires historiques réutilisables |
| `interface/` | Boutons, menus et autres libellés de l’interface Shard |
| `commun/` | Correspondances partagées entre plusieurs livres ou éditions |
| `a-classer/` | Correspondances dont le livre et l’édition ne sont pas établis, principalement des noms du catalogue d’armes |

Chaque ensemble conserve ses catégories : classes, dons, espèces, sorts, armes, objets, monstres et règles. Un texte partagé reste stocké une seule fois. Le script choisit sa traduction à partir de l’anglais exact ; le rangement n’actualise jamais les effets d’une ancienne règle.

## Éditer une traduction

Modifier le `traductions.json` du livre et de la catégorie concernés. Les packs sont détectés récursivement. L’édition peut être indiquée une fois par pack ; seules les exceptions la répètent. La source précise est obligatoire, soit dans l’entrée, soit au niveau du pack lorsqu’elle est commune à toutes ses entrées. Le format courant est implicite : `schemaVersion` n’a plus besoin d’être répété. Les anciens packs explicites restent acceptés.

Les TSV sont des dictionnaires de traduction conservés avec leur ordre de priorité. Les descriptions de dons du PHB et du guide sont séparées dans leurs fichiers `dons/descriptions.json`. Les références bilingues de sorts et d’équipement se trouvent dans `dnd-2024/commun/`. Les titres bilingues de monstres sont des données utilisées par le script, conservées dans `dnd-2024/mm/monstres/titres-aptitudes.json`.

## Distinguer les autres fichiers

- [Audit et inventaires](../audit/README.md) : fiches observées, identifiants des paragraphes, dates de relevé, suivi des trois livres et contrôles restants. Ces fichiers servent à la couverture et aux tests ; ils ne sont pas des packs de traductions.
- [Sources de génération](../sources-generation/README.md) : catalogues de référence, correspondances de sections et textes servant à produire des variantes.
- [Fichiers intermédiaires](../work/generated/README.md) : résultats régénérés par les outils ; modifier leurs sources plutôt que leur contenu.
- `data/srd-5.2.1/` : extraits bilingues conservés en place. Leur évolution sera traitée séparément.

Les inventaires restent utiles lorsque leur contenu est traduit : ils permettent aux tests de détecter une régression. La méthode de rattachement et ses limites figurent dans [le classement](../audit/classement.json). Une édition `2024` seule ne prouve pas un livre précis ; les noms sans source vérifiable ne sont pas attribués par supposition.

Exécuter `npm run translations:check`, `npm run build` et `npm test`. Voir [le guide d’ajout](../docs/AJOUTER-DES-TRADUCTIONS.md).
