# Performances du moteur et détection

## Démarrage du détecteur sur les grandes pages

Le bouton « Analyser la page » attend que `scheduled` repasse à `false`, donc que le parcours de traduction soit terminé. Un premier libellé traduit ne signifie pas que les descriptions plus bas dans le DOM ont été traitées. Le délai observé se situe principalement dans cette file, avant `collectDiagnostics`, et non dans une attente des références AideDD.

Le profilage a mis en évidence trois coûts cumulés :

- Au-delà de 256 caractères, chaque texte non reconnu passait par les expressions régulières du lexique complet. Le cache de résultats ne suffit pas lorsque chaque paragraphe est différent. Sur le scénario exploratoire JSDOM de 600 blocs, les appels à `translate` cumulaient environ 12,7 secondes de calcul.
- Un bloc inconnu était réessayé lors de sa visite, puis depuis plusieurs de ses nœuds texte. Sur ce même scénario, `blockNodes` était appelé 2 000 fois, contre 800 après dédoublonnage du parcours.
- Chaque livraison de `MutationObserver` revalidait toutes les traductions de blocs existantes, y compris celles que les mutations ne concernaient pas. Chaque tranche vérifiait aussi tous les blocs détachés. Ce travail augmentait avec la page déjà traduite et se répétait pendant le traitement du reste de la page.

Le moteur utilise maintenant un index d’ancres littérales de trois caractères pour sélectionner les alternatives possibles, quelle que soit la longueur du texte. Le motif exact d’origine vérifie ensuite ces candidats, dans le même ordre : les espaces, apostrophes, tirets, frontières Unicode et priorités restent inchangés. Les entrées sans ancre ASCII restent systématiquement candidates ; `ſ` et `K` sont pris en compte. Les motifs compilés sont conservés dans un cache borné à 128 ensembles et invalidés à la recompilation du lexique. Les anciens chemins spéciaux pour textes courts sont remplacés par cette recherche commune.

Chaque parcours de traduction mémorise les blocs déjà essayés. Les parcours suivants, notamment après une mutation ou un changement de réglage, repartent avec une mémoire vide. L’observateur retrouve directement les propriétaires des nœuds modifiés ou retirés et ne valide que ceux-ci. Les racines de mutation couvertes par une racine parente en attente sont regroupées. Pendant une analyse demandée par l’utilisateur, la file conserve ses tranches de 9 ms mais cède la main sans ajouter la pause de fond de 16 ms ; la cadence normale revient après annulation ou démarrage de l’analyse.

L’analyse attend toujours la fin du travail de traduction : aucun délai arbitraire ne force son démarrage et aucun texte n’est écarté pour accélérer le résultat. Les mutations encore en attente de livraison sont récupérées avant cette attente, pour éviter un faux positif si le clic suit immédiatement un ajout de contenu. Les limites configurables, les exclusions, les règles de diagnostic et l’affichage de la traduction sont conservés. Aucune dépendance n’a été ajoutée.

### Mesure reproductible

`npm run benchmark:diagnostic` teste par défaut 600 blocs dans JSDOM, en trois exécutions indépendantes. Il déclenche le détecteur dès que le premier bouton est traduit et mesure séparément l’attente avant l’analyse et le temps jusqu’au rapport. Les paragraphes inconnus dépassent 256 caractères et sont tous distincts. Le test désactive les limites, vérifie chaque candidat et chaque occurrence, puis calcule une empreinte du rapport pour comparer les versions.

```sh
git show ca3633d:outputs/shard-dnd-fr.user.js > /tmp/shard-before.user.js
node tests/benchmark-diagnostic-startup.cjs --script /tmp/shard-before.user.js --groups 200 --runs 3
node tests/benchmark-diagnostic-startup.cjs --groups 200 --runs 3
```

Pour mesurer dans Chromium, une installation **externe** de Playwright et un exécutable Chromium peuvent être utilisés, sans modifier les dépendances du projet :

```sh
node tests/benchmark-diagnostic-startup.cjs --groups 1000 --runs 3 \
  --playwright /chemin/absolu/vers/playwright \
  --browser /chemin/absolu/vers/chrome
```

Mesures du 17 octobre 2026 dans Chromium 154.0.8037.57, médianes de trois essais par scénario, sans tests concurrents. La référence est `ca3633d` (1.17.45) et le résultat est le working tree 1.17.46, incluant les compléments d’équipement et le contrôle de leurs champs.

| Scénario | Avant | Après |
| --- | ---: | ---: |
| 3 000 blocs : clic → début de l’analyse | 19,28 s | 0,99 s |
| 3 000 blocs : clic → rapport prêt | 21,66 s | 1,41 s |
| 6 000 blocs : clic → début de l’analyse | Non mesuré | 2,22 s |
| 6 000 blocs : clic → rapport prêt | Non mesuré | 2,97 s |

Sur les 3 000 blocs, l’attente avant analyse diminue de **95 %**. Les six rapports avant/après ont la même empreinte SHA-256 : **1 001 candidats identiques, avec les mêmes occurrences et causes**. Le scénario de 6 000 blocs vérifie ses 2 001 candidats et toutes leurs occurrences. Les limites de nœuds et de résultats sont désactivées dans ces essais, sans modifier les valeurs par défaut de l’application.

Les mesures individuelles, les empreintes des scripts et celles des rapports sont conservées dans [le relevé JSON](../audit/generes/performances-demarrage-detecteur.json). Elles portent sur un HTML simulé hors ligne, pas sur une session Shard connectée ; elles ne reproduisent donc pas exactement les cinq minutes observées sur la page utilisateur.

### Non-régression

`tests/test-indexed-matcher.cjs` compare les textes et positions des correspondances avec les expressions complètes précédentes dans les deux modes de recherche. Il couvre également chaque libellé du lexique et ses variantes typographiques/Unicode, les frontières, les priorités, l’éviction du cache et sa recompilation.

`tests/test-diagnostic-startup.cjs` couvre le clic avant la première traduction, les paragraphes longs inconnus, les mutations synchrones juste avant le clic, les attributs, les racines imbriquées, l’annulation, le retrait et la réinsertion de sous-arbres, les exclusions et la restauration de l’anglais. Un contrôle des accès aux nœuds établit qu’une mutation étrangère ne revalide pas les descriptions déjà traduites ; il ne dépend pas d’un seuil de temps propre à une machine.

## Mesures antérieures : version 1.17.45

Mesures locales du 17 octobre 2026, sous Node.js 22.23.2 et JSDOM 30.1.2, sans réseau. La référence est la version 1.17.44 (`e3216a6`) ; le moteur optimisé est celui de la 1.17.45. Les scénarios avant et après utilisent le même HTML, dans deux processus exécutés successivement, sans autre test en parallèle.

| Scénario | Avant | Après | Réduction du temps |
| --- | ---: | ---: | ---: |
| Initialisation seule | 158 ms | 167 ms | −6 % |
| Première traduction de 400 libellés | 596 ms | 596 ms | ≈ 0 % |
| Mise à jour de 100 libellés | 139 ms | 139 ms | ≈ 0 % |
| Restauration de l’anglais | 239 ms | 264 ms | −10 % |
| Première traduction de 60 blocs de description imbriqués | 1 302 ms | 432 ms | 67 % |
| Première analyse de ces descriptions | 737 ms | 212 ms | 71 % |
| Analyses des descriptions, toutes passes confondues | 727 ms | 77 ms | 89 % |

Les temps sont des médianes de trois exécutions, sauf l’initialisation seule (cinq mesures) et la dernière ligne : chaque exécution comprend trois analyses successives, soit neuf mesures. Aucun gain stable n’est retenu sur les petits libellés. L’initialisation augmente ici de 9 ms et la restauration de 25 ms ; les gains portent sur les descriptions et les analyses. Les initialisations et toutes les mesures individuelles sont conservées dans [le relevé JSON](../audit/generes/performances-11745.json). Le scénario des descriptions contient vingt paragraphes connus, vingt paragraphes inconnus distincts et vingt lignes de composantes identiques. Le diagnostic passe de vingt candidats à vingt et un : il repère désormais aussi le composant anglais, dédoublonné en une entrée.

Ces mesures incluent les temporisations du moteur. Elles décrivent ce corpus hors ligne, pas le temps de chargement de Shard ni celui des références AideDD. Les premières exécutions sont sensibles à l’échauffement du moteur JavaScript ; les gains varient avec les pages.

### Changements de la 1.17.45

- Les recherches de blocs complets utilisent un index de fragments de six caractères, choisis parmi le début, le milieu et la fin de chaque texte. Chaque candidat est ensuite vérifié avec la même correspondance exacte qu’auparavant. Le choix entre passages imbriqués conserve la priorité au premier passage rencontré, puis au plus long.
- Les recherches par expression régulière sur les textes courts écartent les libellés littéraux trop longs pour y correspondre. Quatre seuils (32, 64, 128 et 256 caractères) conservent l’ordre des correspondances, les frontières et les variantes typographiques. Ces expressions sont créées à la demande et invalidées lors d’une modification du lexique.
- Un index lexical permet aussi de rejeter rapidement un texte court contenant un mot absent de tous les libellés possibles. Ce rejet conserve le texte anglais entier ; les durées et formats de statistiques gardent leurs traitements existants. Les écritures non ASCII conservent le moteur Unicode complet.
- Les résultats de traduction sont conservés en mémoire pour au plus 256 textes, avec quatre contextes par texte. La page, le mode bilingue et la révision des dictionnaires invalident ces résultats. Les textes longs restent hors de ce cache. Le cache des blocs conserve au plus 600 résultats, avec éviction progressive.
- Le diagnostic attribue les nœuds texte à leurs blocs en un seul parcours. Son index des formulations françaises est réutilisé tant que les dictionnaires restent inchangés.
- La détection des composantes tient compte du champ `V, S, M (…)`, des articles anglais et du vocabulaire matériel. Elle contrôle aussi le résultat visible lorsqu’une substitution a seulement traduit quelques mots d’un même nœud. Le rapport conserve alors le texte original avec la cause « structure à vérifier ». Les contenus masqués et les champs éditables restent exclus.

La détection reste fondée sur des indices de langue ; elle ne prouve ni une couverture complète ni la qualité d’une traduction.

Les tests du panneau vérifient que le cache distingue les contextes arme/sort, les noms de don/monstre selon la page et les changements du mode bilingue. Les tests du diagnostic couvrent les nouveaux composants courts, les substitutions partielles, les exemples français et les contenus masqués. Les suites de corpus vérifient les traductions, les valeurs, les dés, les éléments interactifs et le retour exact à l’anglais.
