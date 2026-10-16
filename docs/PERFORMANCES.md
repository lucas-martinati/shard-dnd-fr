# Performances du moteur et détection

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

## Changements

- Les recherches de blocs complets utilisent un index de fragments de six caractères, choisis parmi le début, le milieu et la fin de chaque texte. Chaque candidat est ensuite vérifié avec la même correspondance exacte qu’auparavant. Le choix entre passages imbriqués conserve la priorité au premier passage rencontré, puis au plus long.
- Les recherches par expression régulière sur les textes courts écartent les libellés littéraux trop longs pour y correspondre. Quatre seuils (32, 64, 128 et 256 caractères) conservent l’ordre des correspondances, les frontières et les variantes typographiques. Ces expressions sont créées à la demande et invalidées lors d’une modification du lexique.
- Un index lexical permet aussi de rejeter rapidement un texte court contenant un mot absent de tous les libellés possibles. Ce rejet conserve le texte anglais entier ; les durées et formats de statistiques gardent leurs traitements existants. Les écritures non ASCII conservent le moteur Unicode complet.
- Les résultats de traduction sont conservés en mémoire pour au plus 256 textes, avec quatre contextes par texte. La page, le mode bilingue et la révision des dictionnaires invalident ces résultats. Les textes longs restent hors de ce cache. Le cache des blocs conserve au plus 600 résultats, avec éviction progressive.
- Le diagnostic attribue les nœuds texte à leurs blocs en un seul parcours. Son index des formulations françaises est réutilisé tant que les dictionnaires restent inchangés.
- La détection des composantes tient compte du champ `V, S, M (…)`, des articles anglais et du vocabulaire matériel. Elle contrôle aussi le résultat visible lorsqu’une substitution a seulement traduit quelques mots d’un même nœud. Le rapport conserve alors le texte original avec la cause « structure à vérifier ». Les contenus masqués et les champs éditables restent exclus.

La détection reste fondée sur des indices de langue ; elle ne prouve ni une couverture complète ni la qualité d’une traduction.

Les tests du panneau vérifient que le cache distingue les contextes arme/sort, les noms de don/monstre selon la page et les changements du mode bilingue. Les tests du diagnostic couvrent les nouveaux composants courts, les substitutions partielles, les exemples français et les contenus masqués. Les suites de corpus vérifient les traductions, les valeurs, les dés, les éléments interactifs et le retour exact à l’anglais.
