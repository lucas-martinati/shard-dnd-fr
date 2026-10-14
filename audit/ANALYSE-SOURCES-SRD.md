# Utilité des sources SRD dans data/

Analyse du 14 octobre 2026, après le commit `96c7d23`. Cette analyse décrit l’état avant migration. Les résultats ci-dessous ont motivé la conversion désormais réalisée ; ils sont conservés comme relevé historique.

## Ce que contenait le dossier avant migration

`data/` contient seulement les quatre fichiers de `srd-5.2.1/`, pour environ 445 ko au total. Il ne contient pas tout le SRD ni tout le PHB.

| Fichier | Rôle actuel | Nécessaire à l’exécution du userscript ? |
| --- | --- | --- |
| `classes-en.txt` | Texte anglais extrait du PDF : les générateurs y découpent les aptitudes de classes et les options | Non |
| `classes-fr.txt` | Texte français correspondant, avec les coupures et défauts d’extraction du PDF | Non |
| `classes-index.json` | 232 intitulés EN/FR, associés à leur classe et niveau ; vérifie que les bons blocs sont mis en correspondance | Non |
| `README.md` | Explication, attribution du contenu et liens des sources | Non ; document de provenance |

Les trois premiers fichiers sont lus pendant la génération. Le README n’est pas lu par les générateurs ; son attribution et ses liens restent utiles et doivent être conservés si les sources sont réorganisées.

Les textes anglais et français ne sont pas simplement deux listes de noms : ils contiennent les paragraphes qui servent à produire les traductions. L’index évite de relier par erreur un paragraphe anglais à une autre aptitude française. Tous les champs de l’index n’ont pas un rôle technique : son champ `source`, par exemple, documente la provenance mais n’est pas utilisé pour l’alignement.

## Chemin jusqu’au script

1. `work/make-class-texts.py` lit les deux textes et l’index, reconnaît les classes, niveaux et titres, puis produit `work/generated/class-texts.json`.
2. `work/make-option-texts.py` lit les sections de métamagie et de manifestations occultes dans les mêmes textes. Il produit `work/generated/option-texts.json`, avec les variantes où les coûts et prérequis sont affichés à part.
3. `work/make-class-sections.py` découpe les aptitudes en sous-sections et ajoute des variantes exactes de référence à un chapitre ou de liste de sous-classes. Il produit `work/generated/class-sections.json`.
4. `work/make-complete-texts.py` ajoute seulement les formulations anglaises qui ne sont pas déjà couvertes par les autres descriptions.
5. `work/build.py` intègre les correspondances dans `outputs/shard-dnd-fr.user.js`.

Le navigateur utilise les données déjà embarquées dans le userscript. Il n’ouvre pas `data/`, ne consulte pas ces fichiers et ne traduit pas les PDF à la volée.

## Apport mesuré, au-delà des autres descriptions

L’assemblage a été rejoué en mémoire jusqu’à l’ajout de ces trois corpus, puis comparé au résultat final, sans modifier les fichiers générés.

| Corpus dérivé de data/ | Blocs générés | Déjà couverts avant leur ajout | Formulations anglaises ajoutées |
| --- | ---: | ---: | ---: |
| Descriptions complètes de classes | 232 | 36 | 196 |
| Métamagies et manifestations occultes, avec variantes | 70 | 1 | 69 |
| Sous-sections et variantes de classes | 288 | 0 | 288 |
| Total | 590 | 37 | **553** |

Le corpus final contient 4 720 formulations anglaises distinctes de descriptions et champs. Les autres sources en apportent 4 167 ; les corpus dérivés de `data/` ajoutent les 553 restantes. Les doublons des descriptions sont comptés une seule fois, selon la normalisation du chargeur.

Ces nombres comptent des formulations et variantes, pas 553 règles indépendantes. Une aptitude peut être couverte en plusieurs paragraphes ailleurs tout en nécessitant ici sa version complète ; une sous-section peut aussi avoir une version avec et sans titre. Sur les 553 ajouts, 547 n’ont pas non plus de correspondance TSV exacte. Cette mesure ne prédit pas combien de fiches perdraient toute traduction si le corpus était retiré, car le moteur sait aussi traduire certaines sous-parties.

Exemples concrets : description complète de Rage ; Bottes d’arme du Barbare ; options de métamagie avec leur coût ; sous-sections d’Incantation ; formulations faisant référence au chapitre 7. Les formulations françaises éditoriales déjà connues sont réutilisées lorsque le texte anglais correspond exactement.

## Vérification par retrait de fichiers

Les générateurs ont été exécutés dans une copie temporaire complète de leurs dépendances, avec un fichier retiré à la fois, puis restauré dans cette copie.

| Fichier retiré | Générateur de classes | Générateur d’options |
| --- | --- | --- |
| `classes-en.txt` | Échec : fichier absent | Échec : fichier absent |
| `classes-fr.txt` | Échec : fichier absent | Échec : fichier absent |
| `classes-index.json` | Échec : fichier absent | Échec : fichier absent |
| `README.md` | Réussite : 232 descriptions | Réussite : 38 options, 70 blocs |

L’index est aussi requis par le générateur d’options parce que celui-ci importe des fonctions du générateur de classes, qui charge l’index à l’importation. C’est une dépendance technique de l’implémentation actuelle, pas un besoin intrinsèque de ces options.

## Limites et simplification recommandée

Les fichiers sont utiles dans le fonctionnement actuel, mais leur forme n’est pas indispensable. Ils contiennent aussi des tableaux, listes de sorts, textes d’introduction et en-têtes de PDF que les générateurs ignorent ou écartent. Tout le texte conservé n’est donc pas injecté dans le userscript.

L’extraction française présente des défauts visibles : `Vouspouvezvousanimerd’uneforceprimitiveappelée` au début de Rage et `Lorsquevous lancez un sortquicontraintd’autres` dans une option de métamagie. Certains de ces défauts subsistent dans les correspondances générées. Les contrôles de nombres, dés et alignement des titres ne vérifient pas la qualité typographique de chaque phrase française.

La simplification recommandée est de convertir une fois les 232 descriptions de classes et les 70 blocs d’options en données bilingues structurées, éditables dans le PHB 2024, avec leur source précise. Les métadonnées de classe, niveau et titre doivent rester disponibles pour la génération des sous-sections et les tests. Il faut ensuite comparer les formulations et leurs traductions avant/après, adapter les générateurs, puis retirer la dépendance aux extraits PDF. Les 288 sous-sections peuvent rester générées depuis les données structurées.

Cette migration permettrait de supprimer `data/` du build sans perdre ses traductions. L’attribution et les liens de provenance doivent alors être déplacés avec les données ou leur documentation. La correction des mots collés nécessite une relecture explicite des paires concernées ; elle ne doit pas être confondue avec le simple déplacement des sources.

## Migration réalisée

Les 232 aptitudes et les 38 options (70 blocs) ont été converties en données bilingues éditables dans `translations/dnd-2024/phb/classes/descriptions-srd.json` et `options-srd.json`. Leurs métadonnées de classe, niveau et titres sont conservées ; les 288 sous-sections restent générées. L’ancien dossier `data/` et les parseurs PDF ont été retirés du build et du dépôt. Les corpus intermédiaires et inventaires techniques sont reconstruits depuis les nouvelles sources.

Les formulations ont été conservées pour cette migration ; les mots collés identifiés plus haut restent à relire séparément. L’attribution et les liens des documents d’origine sont maintenant dans [SOURCES-SRD.md](../translations/dnd-2024/phb/SOURCES-SRD.md).

La vérification finale comprend une reconstruction dans une copie temporaire sans dossier `data/`, sans JSON intermédiaires et sans fichiers JavaScript/JSON distribués préexistants. Le userscript, les exports du lexique et des références, les corpus de classes/options/sous-sections/descriptions complètes et les deux inventaires techniques reconstruits sont strictement identiques avant/après migration. Les 24 tests Python ainsi que les tests ciblés de publication, classes, sous-sections, métamagie et segments de sorts passent.
