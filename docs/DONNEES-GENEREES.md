# Données embarquées et sources des constantes

Relevé du 16 octobre 2026, version 1.17.37. Les constantes de `outputs/shard-dnd-fr.user.js` sont écrites par [work/build.py](../work/build.py). Ce fichier est généré : les corrections se font dans les sources, puis avec `npm run build`.

Le découpage actuel conserve les noms des anciens fichiers. Il ne représente pas les catégories éditoriales actuelles ni un fichier par classe. `DRUID` est ainsi un ancien lot de phrases du druide et quelques traits d’elfe ; les autres classes ont été ajoutées ensuite dans les packs et corpus structurés.

## Dictionnaires issus des TSV

Ces 17 constantes sont toutes chargées par `compile()` dans [work/runtime.js](../work/runtime.js). Les lignes du dernier dictionnaire chargé remplacent les précédentes pour une même clé anglaise. Les noms AideDD sont ensuite prioritaires. Les anciennes traductions alimentent aussi les alias ; les listes de noms servent au mode bilingue et à la reconnaissance des sorts dans les phrases.

Les compteurs ci-dessous décrivent les données embarquées, avant les priorités AideDD et les descriptions complètes.

| Constante | Lignes | Source |
| --- | ---: | --- |
| `MONSTERS` | 382 | [monsters.tsv](../translations/2014/monstres/monsters.tsv) |
| `SPELLS` | 510 | [spells.tsv](../translations/2014/sorts/spells.tsv) |
| `TERMS` | 490 | [terms.tsv](../translations/2014/regles/terms.tsv) |
| `EQUIPMENT` | 278 | [equipment.tsv](../translations/2014/objets/equipment.tsv) |
| `INTERFACE` | 218 | [interface.tsv](../translations/interface/interface.tsv) |
| `RULES2024` | 211 | [2024.tsv](../translations/dnd-2024/phb/regles/2024.tsv) |
| `MAGICITEMS` | 232 | [magic-items.tsv](../translations/2014/objets/magic-items.tsv) |
| `GM` | 341 | [gm.tsv](../translations/2014/regles/gm.tsv) |
| `EXPANSION` | 144 | [expansion.tsv](../translations/dnd-2024/phb/regles/expansion.tsv) |
| `DESCRIPTIONS` | 117 | [descriptions.tsv](../translations/2014/regles/descriptions.tsv) |
| `DRUID` | 66 | [druid-descriptions.tsv](../translations/dnd-2024/phb/classes/druid-descriptions.tsv) |
| `CREATION` | 296 | [creation-2024.tsv](../translations/dnd-2024/phb/classes/creation-2024.tsv) |
| `CANONICAL_SPELLS` | 339 | [canonical-spells.tsv](../translations/dnd-2024/phb/sorts/canonical-spells.tsv) |
| `CANONICAL_FEATURES` | 188 | [canonical-features.tsv](../translations/dnd-2024/phb/classes/canonical-features.tsv) |
| `CANONICAL_COMBAT` | 61 | [canonical-combat.tsv](../translations/dnd-2024/phb/regles/canonical-combat.tsv) |
| `COMBAT_DESCRIPTIONS` | 5 | [combat-descriptions.tsv](../translations/dnd-2024/phb/regles/combat-descriptions.tsv) |
| `FEATURE_TERMS` | 1844 | [feature-terms.tsv](../translations/dnd-2024/phb/classes/feature-terms.tsv) + tous les libellés des packs `traductions.json` |

`FEATURE_TERMS` contient 12 lignes du TSV et 1 832 libellés issus des packs détectés récursivement sous `translations/`. Les noms d’espèces, de dons, d’armes, d’objets, de classes et les libellés d’interface ajoutés récemment arrivent donc dans cette constante malgré son nom historique.

Les descriptions des packs ne sont pas ajoutées à `FEATURE_TERMS` : elles rejoignent `COMPLETE_TEXTS`.

## Descriptions, index et catalogues

| Constante | Entrées | Origine | Utilisation actuelle |
| --- | ---: | --- | --- |
| `REFERENCE_ALIASES` | 17 | Table écrite directement dans `work/build.py` | Remplit uniquement `referenceByEnglish`, index jamais consulté ; aucun effet actuel sur les traductions |
| `SPELL_REFERENCE` | 339 | [reference-srd.json](../translations/dnd-2024/phb/sorts/reference-srd.json) ; le build retire le champ `english` | Remplit cet index et `referenceBodies`, repli des descriptions complètes |
| `TERM_META` | 5 004 | Métadonnées calculées par `build.py` depuis les 17 dictionnaires et les libellés des packs | Sources, catégories et alias du lexique ; utilisé aussi par la recherche et les priorités locales |
| `AIDEDD_CATALOG` | 1 342 | [catalogues/aidedd-2024.json](../sources-generation/catalogues/aidedd-2024.json), avec l’alias historique de Trait ensorcelé ajouté au build | Noms AideDD prioritaires, catégories, alias, liens, recherche et synchronisation |
| `LEGACY_CATALOG` | 1 365 | [catalogues/2014.json](../sources-generation/catalogues/2014.json) | Choix de références pour les anciennes formulations ; ce sont des références, pas 1 365 descriptions traduites |
| `COMPLETE_TEXTS` | 8 378 | [make-complete-texts.py](../work/make-complete-texts.py) → `work/generated/complete-texts.json` | Traduction des paragraphes et champs complets, avec conservation des liens, emphases et dés |
| `MONSTER_ACTION_TITLES` | 628 | [titres-aptitudes.json](../translations/dnd-2024/mm/monstres/titres-aptitudes.json) | Appariement par titre des actions de monstres ; les règles et valeurs doivent aussi être compatibles |

`COMPLETE_TEXTS` rassemble les corps de sorts et champs SRD, les descriptions d’équipement, les descriptions de dons 2014/2024, les anciennes métamagies, les segments de sorts et toutes les entrées `kind: description` des packs. Les aptitudes, options et sous-sections des classes structurées complètent cet ensemble quand l’anglais n’y est pas déjà présent.

Les données des packs sont donc réellement utilisées, mais dans deux voies différentes : **libellés → FEATURE_TERMS**, **descriptions → COMPLETE_TEXTS**. Les autres constantes apportent les dictionnaires historiques, les références SRD et les catalogues AideDD.

## Doublons et éléments réellement inutilisés

### DRUID reste utile

Ses 66 phrases sont encore chargées. Aucune n’a la même clé anglaise qu’une ligne d’un autre TSV. Une seule a une correspondance exacte dans `COMPLETE_TEXTS`, avec le même français ; les 65 autres apportent des formulations distinctes.

Plusieurs de ces phrases appartiennent aussi, sur le plan du sens, à des descriptions complètes plus longues. Cela ne les rend pas automatiquement inutiles : le moteur reconnaît des textes anglais précis et Shard affiche des paragraphes, fragments et variantes différents.

Ce fichier peut être intégré au corpus de classes pour supprimer le groupe spécial `DRUID`, à condition de conserver les 66 formulations, leurs sources et leurs priorités. Le supprimer directement ferait perdre ces correspondances.

### Les dictionnaires se recouvrent

Les 17 constantes contiennent **5 722 lignes pour 5 004 clés anglaises distinctes**, soit **718 lignes au-delà de la première occurrence**. Parmi les clés, **135 ont plusieurs formulations françaises**. Ce sont des collisions de priorité à examiner, pas forcément des erreurs : certains dictionnaires remplacent volontairement un ancien nom ou une traduction proposée par une formulation SRD, puis AideDD reprend la priorité sur les noms.

Exemple : `CANONICAL_SPELLS` retrouve 338 noms déjà présents dans les dictionnaires chargés avant lui ; 310 ont le même français et 28 un français différent. Les constantes de noms servent également au bilingue et à la reconnaissance en prose. Fusionner ces dictionnaires doit préserver ces usages et les alias, au-delà du simple résultat d’une `Map`.

### COMPLETE_TEXTS contient des répétitions exactes

Ses **8 378 entrées correspondent à 6 191 clés anglaises distinctes** selon la normalisation des descriptions. Il y a **2 187 répétitions supplémentaires**, concentrées sur **95 clés**, sans divergence de français après cette normalisation. Elles viennent surtout des champs répétés entre sorts : temps d’incantation, composantes, portée et durée.

Exemples : `Casting Time: Action` apparaît 240 fois et `Components: V, S` 109 fois. Le moteur les regroupe déjà en mémoire, mais leurs copies restent dans le fichier livré.

Un dédoublonnage pendant la génération est possible. Il doit conserver la provenance et la priorité des corrections locales : une même traduction provenant d’un pack vérifié peut avoir priorité sur le cache distant, même si le français est identique à celui d’une autre source.

### REFERENCE_ALIASES et son index sont du code mort

`referenceByEnglish` est construit depuis `SPELL_REFERENCE`, complété avec `REFERENCE_ALIASES`, puis n’est jamais lu hors de cette initialisation. La table d’alias et cet index peuvent donc être retirés ensemble. Cela ne signifie pas que tous les alias du projet sont inutiles : ceux des catalogues AideDD, des packs et des métadonnées servent réellement à la recherche.

### SPELL_REFERENCE est redondant dans le script livré

Les 339 corps anglais de `SPELL_REFERENCE` sont aussi présents dans `COMPLETE_TEXTS`. `translate()` consulte d’abord les correspondances complètes ; pour ces 339 textes, elles existent déjà avant d’atteindre le repli `referenceBodies`. Ce repli n’apporte donc pas de traduction supplémentaire dans cette version.

Les autres champs de `SPELL_REFERENCE` — nom français, édition, niveau, source, URL et fiche `french` — ne sont pas lus par le moteur actuel, en dehors du stockage dans l’index mort. Le champ `french` représente à lui seul environ 335 000 caractères de valeurs JSON dupliquant notamment la prose déjà fournie par `frenchBody`.

C’est un candidat au retrait de la **sortie JavaScript** après vérification des comportements et des priorités. Le fichier source `reference-srd.json` reste nécessaire aux générateurs de segments, de champs et de descriptions complètes : il ne doit pas être supprimé.

## Pourquoi la liste consultable semble incomplète

[lexique-en-fr.json](../outputs/lexique-en-fr.json) contient **5 299 entrées** du lexique après priorité AideDD. Il ne constitue pas un export de toutes les descriptions du script. **6 101 des 6 191 clés de descriptions complètes n’y figurent pas** ; quelques descriptions historiques présentes dans les TSV sont néanmoins exportées dans ce lexique.

Les descriptions de packs sont assemblées dans `work/generated/complete-texts.json` et embarquées dans `COMPLETE_TEXTS`. Pour les modifier, revenir à leur fichier dans `translations/`, dont la source de chaque paire permet de retrouver l’origine. La [couverture](../audit/couverture-traductions.json) distingue les compteurs de noms, libellés, blocs et fiches ; les nombres de constantes ne mesurent pas la couverture de Shard.

## Portée de ce relevé

Ce relevé identifie les sources, les dépendances et les doublons dans la version générée. Il n’a pas supprimé ni fusionné les constantes. Le correctif 1.17.37 porte sur les 23 signalements de sorts et l’ordre des liens d’Aliénation ; une réorganisation des données devra préserver les traductions et être vérifiée séparément.
