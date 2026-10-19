# Audit de couverture — état du 16 octobre 2026

Ce document résume les contrôles utiles pour la version 1.17.38. Les anciens bilans de versions et de migrations restent dans l’historique Git. Les traductions sont dans `translations/`, les exemples de non-régression dans `tests/fixtures/` et les inventaires conservés dans [audit/](../audit/README.md).

Les tests locaux vérifient les extraits relevés, leurs règles, leurs liens, leurs dés et leur restauration en anglais. Ils ne valident pas à eux seuls tous les écrans, tous les suppléments ni le rendu de la version installée dans Tampermonkey. Aucun livre n’est déclaré intégralement traduit.

## PHB 2024

Le [suivi du PHB](../audit/livres/phb.json) conserve les chapitres relevés et les contrôles restants. L’adaptation Shard expose les mécaniques du livre ; elle ne reproduit pas tout son texte imprimé.

| Corpus contrôlé localement | Périmètre | Contrôle |
| --- | --- | --- |
| Présentations | 153 fiches, 248 paragraphes ou puces ; dont 10 espèces, 24 lignages, 12 classes, 48 sous-classes et 16 historiques 2024 | `tests/test-narratives.cjs` |
| Classes SRD | 232 aptitudes des 12 classes, 38 options en 70 blocs, 292 sous-sections et variantes | `tests/test-classes.cjs`, `tests/test-class-sections.cjs` |
| Fiche du moine | 37 descriptions d’aptitudes et sous-aptitudes, dont titres découpés entre plusieurs balises | `npm run test:monk` |
| Historiques | 80 champs des 16 historiques PHB : caractéristiques, dons, compétences, outils, équipements | `npm run test:backgrounds` |
| Dons | 75 dons 2024, 131 cartes, 223 extraits et 739 blocs ou champs | `tests/test-feat-catalog.cjs` |
| Armes | 38 armes SRD, propriétés et bottes ; 450 noms du catalogue Shard | `tests/test-weapons.cjs`, `tests/test-shard-catalogue.cjs` |
| Conditions | 48 fiches Shard, états anciens et 2024, tableaux et effets supplémentaires | `tests/test-condition-catalog.cjs` |
| Rapports des annexes PHB du 19 octobre | 88 signalements / 187 occurrences, 97 cas complets ; créatures de l’annexe B, profils de sorts de l’annexe C et libellés de ressources | `npm run test:phb-appendices` |
| Derniers rapports | 17 candidats de classes, 11 de dons, 90 d’équipement, puis 1 033 et 23 signalements de sorts | `npm run test:book-reports` |

Les derniers rapports sont conservés dans les fixtures `reports-classes-feats-equipment-11734.json` et `spell-book-reports-11735.json`, complétées par `spell-book-report-11736.json` pour les 12 sorts du dernier rapport. Les trois compagnons du rôdeur restent dans les classes du PHB. Les poids, statistiques et variables Shard sont conservés. Chanceux est testé avec un ancien cache distant ; sa correction locale et son lien Test de d20 restent cohérents.

Le [rapport des sorts](../audit/generes/sorts-phb-2024.json) est régénéré par `npm run audit:spells` sur les 391 fiches publiques relevées, comprenant 1 309 paragraphes, puces et cellules. Le contrôle du 16 octobre en 1.17.37 conserve 68 blocs encore identiques à l’anglais, répartis sur 18 fiches, contre 88 blocs sur 26 fiches en 1.17.36. Ces candidats incluent des légendes ou noms propres : ce compteur ne mesure ni la qualité du français ni tous les reliquats partiellement traduits. La version testée figure dans le JSON ; les anciens compteurs ne servent plus de liste de travail actuelle.

Le [relevé des noms d’équipement PHB](../audit/inventaires/phb/objets-noms-2024.json) conserve 237 noms, dont les 77 libellés examinés lors du premier lot. Il ne valide pas toutes les descriptions d’objets.

Le [relevé des rapports d’annexes](../tests/fixtures/phb-appendices-reports.json) conserve les trois listes reçues (24, 57 et 7 candidats), leurs occurrences et les liens entre fragments et paragraphes complets. Les introductions et profils de créatures restent dans le PHB, indépendamment de leur présence éventuelle dans le MM. Les formulations abrégées telles que « The spirit makes » ou « Magical doesn’t impede the imp’s . » sont traitées à partir du HTML contenant leurs formules ou liens, sans inventer une règle pour le fragment seul. Les corrections déjà présentes depuis la 1.17.48 sont conservées. Les noms identiques dans les deux langues, Inspiration et D&D 2024, sont déclarés comme tels. Le test de Saut avec élan vérifie que la correction locale prend le pas sur un conflit distant mémorisé. Le contrôle porte sur les passages fournis et les variantes complètes relevées, sans valider toutes les fiches des annexes B, C ou D.

### Effets et actions imbriqués — complément du 19 octobre 2026

La fiche du Berserker atteste la source **D&D 2024 PHB**. Son aptitude « Level 3: Frenzy » contient un effet activable distinct, « Frenzy Damage », dont la description courte n’était pas couverte par la traduction du texte principal. Les effets activés de Rage et l’action Attaque téméraire sont également définis dans des dialogues séparés. Les contrôles des descriptions de classe et du catalogue Conditions ne constituent donc pas un inventaire de ces textes imbriqués.

La 1.17.49 ajoute six descriptions ou résumés relevés dans ces dialogues et 27 libellés d’interface. La [fixture ciblée](../tests/fixtures/barbarian-effects-2024.json) conserve leur provenance et les textes exacts. `npm run test:effects` vérifie deux dispositions d’affichage, les liens, `{rage damage}`, les nombres, les infobulles, le diagnostic et la restauration. Les champs et éditeurs restent exclus de la traduction. Les inspections du site ont été quittées sans enregistrement.

Ce relevé couvre le cas signalé et les textes voisins inspectés du Barbare et du Berserker. Les effets activables, sous-aptitudes, notes d’action et résumés générés des autres classes, sorts et objets restent à inventorier ; aucun décompte de leurs traductions intégrales n’est établi.

## Bestiaire 2024

L’[inventaire Shard du MM](../audit/inventaires/mm/shard-2024.json) recense 469 profils et 2 557 paragraphes relevés dans 24 chapitres ou sections. Le livre était accessible lors du relevé du 15 octobre ; l’ancien constat « Unknown book » n’est plus un blocage actuel.

Les contrôles locaux couvrent la tarasque entière, dix profils MM complets (33 paragraphes), et 217 traits communs de 183 créatures. Ils vérifient aussi les tableaux, les dés, les liens, les titres en gras ou italique, les unités, les exceptions inconnues et le retour à l’anglais. Voir `npm run test:mm`, `tests/test-monster-actions.cjs` et `tests/test-monster-common.cjs`.

L’index contient 628 titres bilingues d’aptitudes. Le [relevé de références](../audit/inventaires/mm/references-2024.json) conserve les 498 références comparées : 2 171 blocs anglais, 1 912 appariements et 259 blocs à vérifier. Ces associations historiques ne prouvent pas leur acceptation par le moteur actuel ni la traduction des 469 profils Shard. Les actions distantes exigent un titre bilingue attesté et des règles compatibles. Le [suivi du MM](../audit/livres/mm.json) conserve les travaux restants.

### Rapports MM du 19 octobre 2026

Le premier complément MM du 19 octobre traite cinq rapports utilisateur en version 1.17.47, non tronqués : 354 lignes, 392 occurrences et 285 textes anglais distincts. Les 262 descriptions correspondent aux paragraphes et listes des chapitres A à E consultés dans le livre Shard ; les 23 autres textes sont des titres de chapitre ou lignes d’équipement. Les fragments de rapport omettant les liens ou les dés sont reliés à leur paragraphe complet, notamment les attaques, listes de sorts et rayons. Le lot ajoute 644 correspondances locales de titres, corps et paragraphes dans le pack MM 2024.

La [fixture des rapports](../tests/fixtures/mm-reports-20261019.json) conserve les signalements, leur nombre d’occurrences, le HTML relevé et les traductions attendues. `npm run test:mm-reports` contrôle chaque cas et chaque occurrence avec le script généré, un cache en conflit, les nombres et dés, les liens et leurs interactions, le diagnostic et le retour exact à l’anglais. Les rayons du tyrannœil et du tyramort restent distincts, ainsi que les valeurs des profils adultes et vénérables des dragons. Les titres répartis sur des balises imbriquées et les auto-liens ambigus de Shard (« blight » pour le lierreux, « Sleep » dans « Sleep Breath ») sont reconnus dans leur contexte, sans changer les sorts isolés ni les cibles des liens. Les distances anglaises sont conservées. Cette validation couvre les extraits reçus ; elle ne constitue pas une validation des chapitres complets ni des 469 profils du MM.

### Complément des chapitres F à L

Les trois fichiers et deux rapports collés suivants, produits en 1.17.51 et non tronqués, apportent 139 signalements et 157 occurrences. Les 134 descriptions sont reliées aux paragraphes du livre Shard consultés ; les cinq libellés concernent l’équipement et l’origine draconique. Le lot ajoute 312 correspondances de titres, corps, paragraphes et précisions de déplacement ou de Main de mage. Les quatre conflits concernent Imitation du kenku, Sensibilité au soleil du kobold, Apnée et Têtes réactives de l’hydre. Les neuf cas « unrecognized-layout » sont testés avec leurs liens et emphases observés, dont Magie protectrice de la liche.

La [fixture du complément](../tests/fixtures/mm-followup-20261019.json) conserve les cinq rapports et leurs paragraphes complets. `npm run test:mm-followup` couvre 143 cas (dont les quatre corps en conflit isolés), chaque occurrence, un cache de conflits, les valeurs et dés, les liens, le diagnostic et le retour exact à l’anglais. Le périmètre reste celui des extraits reçus. La version de travail est ramenée à 1.17.50 à la demande du mainteneur ; les changements de version suivants sont réservés à la préparation du commit de publication.

## Objectif minimal : toutes les références accessibles depuis l’accueil

Le [périmètre structuré](../audit/perimetre-references.json) distingue six catégories de personnage — historiques, classes, dons, espèces, sorts et équipement — et dix types personnalisés. Le PHB puis le MM 2024 restent prioritaires ; le corpus 2014 apporte la compatibilité historique.

Les dix types personnalisés relevés représentent 192 cartes et fiches : maladies (3), ascendances draconiques (10), manifestations occultes (79), styles de combat (12), manœuvres (20), propriétés de botte (8), métamagie (18), Magie sauvage (1), bienfaits de pacte (3) et bottes d’arme (38).

L’[inventaire](../audit/inventaires/references-personnalisees.json) conserve les sources et éditions. `npm run test:references` vérifie les 1 279 blocs, 616 liens, 63 dés et tableaux des HTML relevés, puis écrit le [résultat versionné](../audit/generes/references-personnalisees.json). Les noms de livres, les mentions Source et les dés isolés reconnus sont exclus des signalements. La validation locale reste distincte d’une validation intégrale de toutes les bibliothèques disponibles.

## Noms, corpus anciens et points encore ouverts

Le [relevé des noms d’objets AideDD](../audit/inventaires/noms-objets-aidedd.json) compare 350 noms 2024 et 323 anciens. Les noms 2024 restent prioritaires ; les alias anciens sont recherchables. `npm run test:catalogue-names` vérifie les corrections, les URL accentuées, les recherches, les champs et les rapports de noms utilisateur. Ces contrôles ne valident pas les descriptions.

Quatre noms de supplément restent à contextualiser : **Fuzz Mites**, **Rock Garfin**, **Fuzz Golem** et **Giant Fuzz Golem**. Le fragment `magical , Unknown (Magic)15,` du rapport d’objets reste également à examiner dans sa fiche. Ces éléments ne sont pas déclarés traduits par déduction.

Le [contrôle de l’équipement du guide Shard](../audit/generes/guide-equipment.json) couvre le relevé du 16 octobre : chapitres Équipement et Objets magiques, 239 notices et 1 372 fiches ouvertes individuellement dans la liste d’équipement. `npm run test:guide` contrôle les blocs, tableaux, liens, dés et poids, puis restaure le contenu anglais. Le test de migration contrôle aussi les 5 004 correspondances historiques, leurs alias et leurs usages. Les packs du guide sont dans `translations/2014/shard-players-guide-v1/`. Le [relevé antérieur](../audit/generes/shard-players-guide-v1.json), en version 1.17.28, conserve uniquement les 319 sorts : les anciens signalements d’équipement sont retirés après leur remplacement. Ce travail ne valide pas les autres chapitres du guide.

Les anciennes règles importées conservent leurs effets exacts. Les variantes 2014 et 2024 ne sont pas réécrites les unes à partir des autres ; les noms propres et les textes sans millésime peuvent rester en édition `any`.

## Sources, génération et entretien

Les aptitudes et options SRD sont éditables dans les fichiers structurés du PHB, avec leur [attribution](../translations/dnd-2024/phb/SOURCES-SRD.md). Le build ne dépend plus d’extraits PDF. La [méthode de classement](../audit/classement.json) conserve la provenance éditoriale ; un dossier ne prouve pas la présence exclusive d’un texte dans le livre imprimé.

`npm run build` reconstruit les données, les inventaires techniques `classes-srd.json` et `options-srd.json`, ainsi que la [couverture](../audit/couverture-traductions.json). Celle-ci compte séparément noms, blocs, fiches observées et appariements. Une liste `aVerifier` vide pour les classes/options SRD ne signifie pas que tout Shard est traduit.

Après une correction, relancer les contrôles pertinents et l’audit concerné avant de réutiliser son compteur. Les bilans ponctuels remplacés par des fixtures et tests sont retirés ; les inventaires nécessaires aux tests, les sources et les candidats non revérifiés restent conservés. Le [guide de contribution](AJOUTER-DES-TRADUCTIONS.md) décrit les variantes, la validation et les diagnostics locaux.
