# Audit de couverture — 13 octobre 2026

## Complément local du 15 octobre 2026 — sorts et noms d’objets

Les 391 fiches de sorts du livre Shard **D&D 2024 PHB** ont été relevées. Elles contiennent 1 309 paragraphes, puces et cellules examinés. Comparé au commit `8af2d6d`, le même rendu hors ligne présente **243 blocs supplémentaires traduits** : les candidats entièrement inchangés en anglais passent de 845 à 602. Ces candidats incluent aussi des légendes, des noms propres et des textes anciens importés ; ce chiffre ne prouve ni l’absence ni l’exactitude d’une traduction. Le [rapport détaillé](../audit/generes/sorts-phb-2024.json) conserve les passages à vérifier. Aucun livre n’est déclaré intégralement traduit.

Les cinq signalements (Aura magique de Nystul, Clignotement, Arme élémentaire, Localisation de créature et Éveil) sont intégralement traduits dans les fiches relevées. Les ajouts comprennent 53 correspondances éditables et le découpage explicite de 77 références SRD, qui porte les segments générés de 449 à 660. Les frontières anglaises et françaises sont associées par leur sens, même lorsque les effets ne sont pas présentés dans le même ordre. Les variantes du PHB sont conservées séparément ; les formulations différentes ne sont pas assimilées automatiquement au SRD.

Le catalogue d’objets filtré sur ce livre présente 237 noms. Parmi les 77 libellés examinés, **66 reçoivent une traduction différente** et 11 sont déjà français ou des noms propres conservés. Ce contrôle porte sur les noms ; il ne valide pas toutes les descriptions d’objets. Voir [l’inventaire](../audit/inventaires/phb/objets-noms-2024.json).

Le livre MM 2024 n’est pas proposé dans les filtres de la session utilisée pour ce relevé. Le lot d’environ 92 monstres signalé par l’utilisateur n’est donc pas déclaré traité. Les sources de bestiaire et les descriptions déjà présentes restent chargées.

`npm run test:spells` vérifie les paragraphes, les segments SRD et 11 fiches HTML réelles : 53 paragraphes et cellules, 12 dés et 11 liens, les tableaux, les nombres, les champs privés et le retour exact à l’anglais. Les 77 noms d’objets sont inclus. Les contrôles de packs, de mise en forme, d’équipement ancien et de métadonnées passent également. Le nouveau script n’a pas été installé dans Tampermonkey pendant ce contrôle. Ce lot est préparé pour la version 1.17.14 ; les contrôles portent sur le script local généré.

## Priorité par livre — clarification du 14 octobre 2026

L’objectif principal est le **D&D 2024 PHB**, puis le **D&D 2024 MM**. Les traductions des règles du joueur 2024, y compris les parties issues du SRD 5.2.1, sont dans `translations/dnd-2024/phb/` ; le bestiaire reste dans `translations/dnd-2024/mm/`. Le corpus historique, dont le guide Shard, et les noms de compatibilité sont regroupés dans `translations/2014/`. L’interface Shard reste séparée.

Le rangement éditorial ne remplace pas la provenance : les sources et éditions sont conservées, notamment `any` pour les libellés non spécifiques. Le classement des 406 anciennes entrées de `a-classer` est terminé selon cette convention. Certains noms et effets personnalisés restent sans livre imprimé identifié ; leur emplacement ne prétend pas résoudre cette attribution bibliographique. Voir [la méthode](../audit/classement.json).

Le [suivi par livre](../audit/livres.json) est repris dans `suiviLivres` du rapport de couverture. Le sommaire du PHB a été relevé, mais ses chapitres complets restent à vérifier. Son Disclaimer indique que cet import contient les mécaniques absentes du SRD 5.2 et ne reproduit pas tout le texte du livre imprimé. Les traductions bilingues correspondantes sont désormais structurées dans les fichiers `descriptions-srd.json` et `options-srd.json` du PHB. Les générateurs ne lisent plus les extraits PDF de l’ancien dossier `data/` ; l’attribution est conservée dans [SOURCES-SRD.md](../translations/dnd-2024/phb/SOURCES-SRD.md).

Le lien MM fourni affiche **Unknown book** dans la session du 14 octobre 2026 : aucun inventaire intégral de ce livre n’est validé. Les traductions locales du bestiaire restent chargées. L’introduction et les crédits du guide Shard indiquent une origine majoritairement SRD sous OGL ; ce guide est distinct des sources SRD 5.2.1 du projet.

Les compteurs de packs rattachés ne comptent que les entrées de ces dossiers. Ils ne mesurent ni toutes les correspondances communes utilisables dans un livre, ni la traduction de toutes ses fiches. Aucun livre n’est déclaré intégralement traduit. Les 16 rubriques ci-dessous restent le minimum final, à traiter d’abord pour le PHB et le MM.

## Objectif minimal : toutes les références accessibles depuis l’accueil

L’objectif final est de traduire **le contenu intégral de toutes les références accessibles depuis l’accueil de Shard**, pour les livres et éditions disponibles. Les 16 rubriques ci-dessous constituent un minimum ; toute autre référence proposée par l’accueil doit également rejoindre cet inventaire.

Une rubrique reste **à vérifier et compléter** tant que ses fiches intégrales n’ont pas toutes été contrôlées. Un nom, une description brève, une correspondance SRD ou une référence AideDD disponible ne suffit pas à la déclarer entièrement traduite. Les présentations des classes et sous-classes relevées sont traduites et de nombreuses aptitudes détaillées sont déjà couvertes ; le contenu complet de toutes les classes, sous-classes, options et variantes accessibles reste à compléter ou vérifier.

### Options du personnage

| Référence | Contenu intégral à vérifier ou compléter |
| --- | --- |
| [Historiques](https://play.shardtabletop.com/#backgrounds) | Aptitudes, dons, compétences, langues, équipement et variantes. |
| [Classes](https://play.shardtabletop.com/#class) | Classes et sous-classes, tous les niveaux, aptitudes, options, prérequis et tableaux. Les résumés traduits ne valident pas ces contenus. |
| [Dons](https://play.shardtabletop.com/#feats) | Prérequis, effets détaillés, choix et variantes de chaque édition et livre. |
| [Objets](https://play.shardtabletop.com/#item) | Objets usuels et magiques, armes, armures, propriétés, bottes, charges, harmonisation et tableaux. Les noms d’armes ne valident pas leurs descriptions. |
| [Races / Espèces](https://play.shardtabletop.com/#race) | Traits, lignages, ascendances, options et variantes. |
| [Sorts](https://play.shardtabletop.com/#spell) | Paramètres, composantes, effets, cibles, options, améliorations et tableaux. |

### Types personnalisés

| Référence | Contenu intégral à vérifier ou compléter |
| --- | --- |
| [Diseases](https://play.shardtabletop.com/#customtable?type=Diseases) | Toutes les maladies, effets, durées et moyens de guérison. |
| [Draconic Ancestries](https://play.shardtabletop.com/#customtable?type=Draconic%20Ancestries) | Toutes les ascendances draconiques, effets, choix et tableaux. |
| [Manifestations occultes](https://play.shardtabletop.com/#customtable?type=Eldritch%20Invocations) | Toutes les manifestations, prérequis, effets, choix et évolutions. |
| [Styles de combat](https://play.shardtabletop.com/#customtable?type=Fighting%20Styles) | Tous les styles, avec leurs règles et variantes. |
| [Manœuvre Options](https://play.shardtabletop.com/#customtable?type=Maneuver%20Options) | Toutes les manœuvres, coûts, déclencheurs, choix et effets. |
| [Propriétés de botte](https://play.shardtabletop.com/#customtable?type=Mastery%20Properties) | Chaque propriété et sa règle complète, dans ce catalogue spécifique. |
| [Métamagie](https://play.shardtabletop.com/#customtable?type=Metamagic) | Toutes les options, coûts, restrictions, effets et variantes. |
| [Reference Cards](https://play.shardtabletop.com/#customtable?type=Reference%20Cards) | Toutes les règles, états, actions, effets et tableaux, y compris les fiches liées depuis les aptitudes. |
| [Warlock Pact Boons](https://play.shardtabletop.com/#customtable?type=Warlock%20Pact%20Boons) | Tous les pactes, effets, options, prérequis et variantes. |
| [Bottes d’arme](https://play.shardtabletop.com/#customtable?type=Weapon%20Masteries) | Chaque entrée et sa règle complète ; ce contrôle reste distinct de Mastery Properties. |

Pour chaque rubrique, inventorier toutes les entrées puis vérifier séparément les **noms et résumés** et les **fiches complètes** : paragraphes, sous-sections, listes, choix, tableaux et contenus chargés à l’ouverture ou par les liens. Contrôler le rendu avec le userscript actif dans Shard, les chiffres, dés et unités de jeu, les liens et la restauration de l’anglais. Une entrée sans description ou inaccessible doit être signalée comme telle ; aucun texte ne doit être inventé.

Le [périmètre structuré](../audit/perimetre-references.json) conserve les objectifs et l’état de validation de ces rubriques. Il est repris dans `objectifReferencesAccueil` par `npm run translations:coverage` et dans `audit/couverture-traductions.json`. Les validations intégrales restent ouvertes : cela ne signifie pas que tous les textes de ces rubriques sont absents du corpus. La liste `aVerifier` des appariements SRD ne mesure pas ce périmètre ; elle peut être vide alors que des fiches Shard restent partiellement en anglais.

## Complément du 14 octobre 2026 — aptitudes, dons, armes et version 1.17.10

Le catalogue public de Shard a été parcouru pour ouvrir les 12 classes et leurs 48 sous-classes 2024, les 131 fiches détaillées de dons disponibles, ainsi que 48 fiches d’armes représentatives. La liste des armes a fourni 450 lignes, soit 449 noms distincts, avec les variantes +1/+2/+3, en adamantium, argentées et les grandes familles d’armes magiques.

Cette passe ajoute 1 972 correspondances exactes : 1 402 pour les classes et aptitudes, 49 pour les dons et 521 pour les armes et leurs pluriels. Elles couvrent des paragraphes, options, champs, titres de niveau, cellules de tableaux et noms complets. Les règles communes des armes magiques sont réutilisées lorsque leur anglais est identique. Les chiffres, dés et distances de Shard sont conservés ; une propriété ancienne n’est pas réécrite selon sa version 2024. Les traductions proposées et leur provenance sont identifiées par entrée.

`tests/fixtures/shard-catalogue.json` conserve les 239 extraits HTML ouverts et les 450 noms de la liste. Le test du catalogue les traite par petits lots, vérifie les nouvelles correspondances, l’identité des liens et dés, leurs clics et la restauration du HTML anglais. Les autres suites continuent de vérifier les descriptions préexistantes et les différences entre éditions. Les lignes de description en DIV sans classe, avec des fragments en gras, bénéficient aussi du traitement des paragraphes.

Ce relevé des fiches anglaises dans le navigateur et ses tests locaux ne constituent pas une vérification en direct du nouveau userscript installé dans Tampermonkey. Les descriptions des 450 armes n’ont pas toutes été ouvertes : le contrôle détaillé porte sur 48 fiches et les textes qu’elles partagent. Les autres suppléments, contenus maison et descriptions de monstres restent des zones de couverture partielle.

La version de publication vient uniquement de `package.json`. `npm run version:patch` augmente le correctif et reconstruit les livrables ; `npm run build` synchronise le verrou npm et génère les versions du userscript, des métadonnées, du panneau et du lexique. Les anciennes notes de publication gardent leurs numéros historiques.

## Complément du 14 octobre 2026 — équipement, version 1.17.9

Examen de l’accueil, des filtres du catalogue d’objets et de 18 fiches dans la session Shard accessible au navigateur intégré : Abacus, Acid, Acid (vial), Alchemist’s Fire (flask), Ball Bearings (Bag of 1,000), Caltrops (20), Holy Water (flask), Oil (flask), Basic Poison (vial), Healer’s Kit, Hunting Trap, Manacles, Crowbar, Antitoxin, Tinderbox, Bullseye Lantern, Hooded Lantern et Adamantine Dagger. Aucun personnage, objet ou contenu de campagne n’a été modifié.

La fiche Abacus ne contient pas de description ; aucun texte n’y a été ajouté. Acid utilise la description 2024 déjà couverte. Les 15 autres objets usuels présentent 16 paragraphes absents du corpus local, désormais ajoutés dans les packs d’objets anciens et partagés. La dague en adamantium ajoute son effet sur les objets et trois sections titrées de propriétés, dont les corps existaient déjà. Neuf noms exacts manquants et quatre libellés observés sont ajoutés : modification des attributs, liste vide, effacement d’un filtre et vérification de la connexion.

Les fiches Feu grégeois, Poison simple, Trousse de soins, Pied-de-biche, Antitoxine et les deux lanternes associent une ancienne formulation au D&D 2024 PHB. Les entrées sont documentées comme règles 2014 d’après le texte exact, sans remplacer l’attaque improvisée, l’action requise ou une exception par un mécanisme 2024. Distances, volumes, valeurs numériques et dés restent ceux affichés dans Shard.

`tests/fixtures/equipment-legacy.json` conserve uniquement les extraits de description et noms des 16 fiches complétées. `test-equipment-legacy.cjs` vérifie leurs traductions, le paragraphe imbriqué du rituel d’eau bénite, les titres en gras/italique, trois liens, six dés cliquables (dont le témoin Acide 2024), les attributs d’affichage, la conservation d’une valeur de recherche et le retour exact à l’anglais. Un texte inconnu aux valeurs différentes reste intact. La traduction française a été vérifiée avec le userscript généré dans JSDOM ; cette version n’a pas été installée dans Tampermonkey pendant cet examen. Ce relevé ciblé ne constitue pas une couverture complète du catalogue ni de tous les écrans Shard.

## Périmètre observé

Audit du dépôt en version 1.17.1, puis de Shard connecté : accueil, navigation de référence, bibliothèque, filtres, historiques, espèces et états. Le navigateur intégré a servi à examiner l'anglais ; Brave, avec Tampermonkey et le script déjà actif, a permis de constater les manques de traduction. Aucun personnage ni contenu de campagne n'a été modifié.

Cet échantillon n'est pas un audit exhaustif de tous les écrans. Le jeu en campagne, les éditeurs de cartes, les achats, les fonctions d'abonnement, le contenu de tous les livres et les suppléments restent à examiner. Les livres disponibles diffèrent entre les deux sessions de navigateur.

## Couverture avant les ajouts

Les références embarquées comprennent 391 noms de sorts, 75 dons, 28 manifestations, 349 objets magiques et 498 monstres AideDD 2024. Ce sont des **noms**, pas autant de descriptions traduites.

La prose locale comprend notamment 339 sorts SRD, 232 aptitudes des 12 classes SRD, 10 options de métamagie, 28 manifestations, 72 descriptions d'équipement et des segments supplémentaires de sorts et de classes. Les 38 armes SRD ont un catalogue et des descriptions de propriétés/bottes testés. Les sous-classes hors SRD ne sont pas toutes couvertes : leurs noms traduits ne garantissent pas leur prose.

Le pack interface était vide, même si des TSV traduisaient déjà la fiche de personnage. La bibliothèque et des commandes d'accueil restaient en anglais dans Brave. Le pack espèces n'exposait que 15 descriptions, mais des traits supplémentaires existaient déjà dans les anciennes sources : le nombre du pack sous-estimait donc aussi ce corpus. Les descriptions des états 2024 observées étaient largement absentes.

## Mécanismes et limites

1. Les TSV et les libellés des packs alimentent un dictionnaire. Les noms AideDD ont priorité. Une ligne structurée peut être composée de plusieurs termes connus ; une phrase inconnue n'est pas traduite mot à mot.
2. Les descriptions locales sont reconnues par leur texte anglais, avec normalisation des espaces, apostrophes et contractions. L'édition du pack documente la source : elle ne choisit pas automatiquement les règles d'un personnage.
3. Les paragraphes, puces et cellules sont traités séparément. Les titres connus servent de repères. Le français n'est pas réparti arbitrairement entre plusieurs paragraphes.
4. Seuls les nœuds texte et les attributs d'affichage changent. Les éléments de lien, de dé et de mise en forme conservent leur identité et leurs gestionnaires. Les champs éditables et notes restent exclus.
5. Les références AideDD distantes dépendent du réseau et d'une compatibilité du texte et de la structure. Elles ne prouvent pas que tous les contenus d'une fiche ou d'un livre sont traduits.
6. La désactivation restaure les textes et attributs originaux. Les mutations Shard sont rescannées sans modifier les données de jeu.

Les sources historiques peuvent utiliser un autre terme français que les nouveaux libellés AideDD, notamment pour certaines actions. Il faut harmoniser leurs sources, en respectant leur édition, plutôt qu'empiler une traduction contradictoire. Les valeurs et dés concordants ne prouvent pas à eux seuls l'équivalence d'une règle.

## Compléments de la 1.17.2

- Navigation générale, bibliothèque et filtres : catégories `interface/`.
- Les 15 états du SRD 2024, avec corps, sous-titres, sections et variantes avec/sans introduction : catégorie `regles/`. Le catalogue `etats-2024.json` relie les sections effectivement chargées, y compris les sections communes à plusieurs états.
- Espèces : lignages elfiques et gnomes, six ascendances de goliath, formes et carrure, traits d'orc, héritages fiélons, tailles et Vision dans le noir. Les traductions déjà présentes sont réutilisées. Les récits d'origine et les traits hors SRD ne sont pas tous couverts.
- Repérage des titres Shard en `<span class="b i">` et des titres ponctués connus dans le lexique, même lorsqu'ils ne sont pas des descriptions autonomes.
- Distinction du trait humain « Polyvalent » et de la propriété d'arme « Polyvalente » suivant le contexte.

Les ajouts sont des traductions proposées du SRD anglais sous CC-BY-4.0 et des libellés observés ; ils ne sont pas présentés comme des formulations officielles AideDD. Les distances restent celles de Shard en feet.

## Complément de la 1.17.3 issu de l'essai dans Brave

Les fiches Shard des sous-espèces de goliath ajoutent la phrase de récupération des utilisations dans le même paragraphe que l'effet. Le SRD la place dans l'introduction commune de l'Ascendance gigante. Les fiches observées du feu et des pierres ont confirmé cette variante. La 1.17.3 ajoute cette phrase commune, les six titres courts et les petits libellés de descendance. Un test reconstruit les six fiches avec les classes `stdcontent`, `pre-wrap`, `inlinefirstp`, `b i` et `dodieroll` observées.

## Vérification

### Priorité aux descriptions de présentation — 1.17.4

Le relevé a été étendu aux textes de présentation complets, et pas seulement aux noms et traits. Il comprend les 10 espèces et 24 lignages/sous-espèces du PHB 2024, les 12 classes et leurs 48 sous-classes, ainsi que les 16 historiques 2024. Les introductions, accroches en italique et préceptes en puces des sous-classes sont inclus. Les descriptions anciennes et propres au guide Shard visibles dans les mêmes catalogues sont également traduites.

Au total, le relevé contient 153 fiches et 248 paragraphes ou puces. Quatre fiches anciennes n'ont pas de description dans Shard ; aucun texte n'a été inventé pour les remplir. Les 149 fiches qui comportent une présentation ont une correspondance pour chaque bloc. Le catalogue `audit/inventaires/descriptions-visibles.json` relie les fiches aux identifiants réellement chargés. Ces chiffres décrivent le relevé des présentations ; ils ne signifient pas que toutes les aptitudes des 48 sous-classes sont traduites.

Les textes anglais ont été relevés avec la traduction temporairement désactivée, puis celle-ci a été réactivée. Les cartes conservent leur texte complet dans le DOM même quand leur aperçu est tronqué par `ll-8` ou `ll-10`. Les traductions sont placées par paragraphe dans `especes/`, `classes/` et `regles/` pour les historiques. Les textes sont des traductions proposées des contenus observés, avec leur livre source et leur édition ; ils ne sont pas étiquetés comme du SRD lorsqu'ils n'en proviennent pas.

`tests/fixtures/narrative-cards.json` conserve le HTML des présentations relevées, sans données de personnage ou de campagne. `test-narratives.cjs` contrôle les 248 blocs, les 48 noms de sous-classe, les listes de préceptes, les italiques imbriqués, la présentation en carte et en fiche ouverte, un lien et un terme en gras, les valeurs de longévité et la restauration exacte du HTML.

`npm run build` régénère les livrables et l'inventaire. `npm test` inclut les tests des packs et la suite `test-general-categories.cjs` : états avec liens, gras/italique, titres CSS Shard, dé avec icône, navigation, champs privés, règle inconnue, distinction des éditions et restauration exacte du HTML.

L'inventaire `audit/couverture-traductions.json` sépare les libellés des blocs et compte aussi les descriptions/champs locaux uniques. Aucun pourcentage « tout Shard » n'est donné sans dénominateur connu.

La 1.17.2 a été chargée manuellement dans Brave et ses traductions d'états ont été vérifiées sur la page réelle : titres en gras, paragraphes séparés et liens de Vitesse, Neutralisé et jets de sauvegarde. Les traits Forme de géant et Forte carrure et les tailles en feet ont également été vérifiés sur une fiche d'espèce. Les anciennes règles 2014 et les effets personnalisés de la liste ne sont pas remplacés par les descriptions 2024. Les effets En sang/Vision dans le noir/abris étaient alors à compléter ; ils sont couverts à partir de la 1.17.5, et les récits d'espèce relevés à partir de la 1.17.4.

La 1.17.3 a ensuite été chargée et la fiche du goliath des pierres vérifiée dans Brave : descendance, titres en gras/italique, effet, phrase de récupération des utilisations, distances en feet et élément de dé `1d12` sont présents en français. Une capture a été conservée localement hors du dépôt. Les gestionnaires de clic des dés sont vérifiés dans les tests locaux ; aucun jet n'a été envoyé dans une partie pendant l'audit.

La 1.17.4 a été chargée manuellement puis vérifiée dans Brave : les 19 cartes d'espèce de base affichent leurs 32 paragraphes en français, la fiche ouverte de l'aasimar reprend ses trois paragraphes complets, et les 29 cartes d'historique affichent leurs présentations traduites. Le sélecteur des quatre serments du paladin 2024 a également été contrôlé : accroches en italique, paragraphes complets et douze préceptes en puces sont traduits. Des captures locales des espèces et du sélecteur de sous-classe ont été conservées hors du dépôt. Les 48 présentations de sous-classe sont couvertes par les fixtures et tests ; le contrôle en direct de cette version a porté sur les quatre serments, pas sur les 48 fiches ouvertes individuellement. Les titres et paragraphes ajoutés à une fenêtre apparaissent progressivement pendant le parcours asynchrone du moteur.

L'accès automatisé au tableau de bord Tampermonkey (`chrome-extension://`) est bloqué par la politique du navigateur. Les nouvelles versions doivent donc être chargées manuellement avant de vérifier leur rendu en direct dans Brave ; les tests locaux ne remplacent pas cette étape.

### Catalogue des conditions et effets — 1.17.5

Le relevé complet du catalogue Conditions contient 48 fiches : les 15 états anciens, les 15 états 2024 et les effets supplémentaires ou répétés entre livres. Les 47 fiches ayant une description en carte contiennent 122 paragraphes, puces et cellules non vides, dont six cellules numériques inchangées. Le catalogue `audit/inventaires/conditions-shard.json` référence les 116 blocs textuels et leurs 93 correspondances distinctes. La carte de Métamorphose n’a pas de description ; sa fiche ouverte contient une description de Transformation, auparavant traduite par la référence AideDD à la consultation et désormais couverte localement et incluse dans les fixtures.

La 1.17.5 ajoute 60 blocs distincts, dont les trois libellés du tableau d’Épuisement, et six noms généraux. Les traductions respectent les effets affichés : Épuisement 2014 conserve son tableau et ses conditions de récupération, Étourdi 2014 conserve l’interdiction de se déplacer et la parole hésitante, tandis que les états 2024 gardent leurs effets propres. Les effets Inspiration et Renvoi affichés dans plusieurs livres restent les règles effectivement présentes, même lorsque Shard les associe au PHB 2024. Les pieds, chiffres et dés ne sont pas convertis.

Les tests utilisent le HTML original des 48 cartes et de la fiche Transformation. Ils vérifient le tableau, les paragraphes et puces, les liens avec leurs adresses et gestionnaires, les deux dés `1d4` avec leurs icônes, les différences entre éditions et la restauration exacte de l’anglais. Une correction générale du moteur reconnaît les cellules de tableau comme des blocs autonomes : des libellés courts tels que Niveau, Effet et Mort n’étaient auparavant pas traduits lorsqu’ils se trouvaient dans un tableau entouré d’une longue description.

Après chargement manuel de la 1.17.5 dans Brave, les 48 cartes ont été comparées au corpus : les 122 blocs non vides correspondent exactement aux attentes françaises, sans écart. La fiche ouverte d’Épuisement ancien confirme les sept lignes du tableau et les quatre paragraphes qui suivent ; celle de Métamorphose confirme le titre Transformation et sa description locale. Des captures du catalogue et du tableau ont été conservées hors du dépôt. Aucun état n’a été appliqué à un personnage et aucun jet n’a été envoyé dans une partie. `npm test`, `npm run translations:check` et `git diff --check` passent.

### Dons et aptitudes de monstres — 1.17.6

Deux catégories distinctes sont traitées : les dons de personnage, et les traits/actions du bestiaire. Le travail ne se limite pas à la tarasque.

Le catalogue Dons de Shard a fourni 131 cartes et 20 fiches détaillées avant l’interruption du contrôle de Brave. Les descriptions détaillées manquantes sont complétées à partir des références anglaises publiques des dons 2024 et de l’extrait des faveurs épiques transmis par l’utilisateur. Les 75 dons PHB 2024, dont les 12 faveurs épiques et les styles de combat, disposent ainsi d’une description locale testée. Les cartes anciennes relevées restent distinctes des règles 2024, notamment Alerte. Les prérequis et les augmentations de caractéristique sont inclus. Les formulations françaises sont proposées ; elles ne sont pas présentées comme une transcription officielle des descriptions AideDD indisponibles. Les noms et termes français suivent les références AideDD disponibles.

`audit/inventaires/phb/dons-2024.json` documente les sources. `tests/fixtures/feat-catalog.json` contient 223 extraits et 739 blocs ou champs attendus : cartes, fiches ouvertes, références détaillées et deux extraits utilisateur pour les Faveurs de compétence et de vitesse. Les trous laissés par les dés dans le texte copié ne sont pas interprétés comme des valeurs absentes des règles : les fiches détaillées et références anglaises servent à vérifier les dés. Une erreur OCR « S feet » de la référence de Télékinésiste est corrigée en « 5 feet », distance confirmée par les 1,50 m de la référence française ; l’adaptation est indiquée dans la fixture.

La tarasque complète est traduite localement : quatre traits, cinq actions, Engloutissement en action bonus, l’introduction des actions légendaires et leurs deux options. Les 13 sections comportent 14 paragraphes, puisque l’évasion d’Engloutissement forme un paragraphe séparé dans l’extrait utilisateur. Le test conserve dix dés interactifs avec leurs icônes, les liens des sorts et états, les titres gras/italiques, les valeurs et les distances de Shard.

Le bestiaire gagne également 217 traits locaux relevés sur 183 créatures, répartis entre neuf familles : Résistance à la magie, Résistance légendaire, Amphibie, Forme immuable, Pattes d’araignée, Monstre de siège, Repli aérien, Tactique de meute et Déplacement intangible. Les corps anglais exacts sont enregistrés dans le pack `monstres/` ; aucune expression générique ne traduit automatiquement une règle inconnue. Des traductions existantes sont réutilisées lorsque le corps est déjà connu. Ces traits ne rendent pas toutes les autres aptitudes des 183 créatures disponibles hors ligne. Le catalogue `traits-communs-2024.json` et son test contrôlent chaque corps avec son titre, les états liés, les dés, les différences de distance et les exceptions supplémentaires inconnues.

Le rapprochement des références distantes a été étendu aux traits, actions, actions bonus, réactions et introductions légendaires. Les rubriques sont conservées ; les paragraphes ne sont pas associés par simple position. Les titres attestés sont utilisés en priorité, puis une signature de valeurs doit être unique dans les deux sens pour permettre une association sans titre connu. Les descriptions trop courtes ou présentant des valeurs incompatibles sont rejetées. Ce contrôle de structure et de valeurs ne constitue pas à lui seul une vérification sémantique de toute la traduction.

L’index comprend 628 titres bilingues d’aptitudes. L’audit des 498 références publiques compte 2 171 blocs anglais, dont 1 912 associés et 259 à vérifier ; 30 références n’ont aucun bloc d’action français exploitable. D’autres références n’offrent que des fragments, ou diffèrent dans leurs règles ou valeurs. Ces chiffres mesurent les associations entre références, pas le rendu effectif de toutes les fiches Shard. Les listes de sorts et les autres structures hors paragraphes ne sont pas comptées comme des blocs d’action autonomes par ce relevé. Le corpus français complet du bestiaire n’est pas embarqué dans cet index.

Le moteur reconnaît désormais les icônes de dés sans les déplacer ou les effacer, les abréviations `ft.`, les distances `30+ feet`, les inches et les miles présents dans l’anglais. Les références métriques compatibles reprennent les unités anglaises de Shard. Un libellé de don « Piercer » n’entraîne plus l’ajout du lien du monstre homonyme. Les termes identiques dans les deux langues, tels qu’Expertise, peuvent appartenir à un bloc traduit sans faire échouer sa reconstruction. Les doublons de formulations sont harmonisés dans leurs sources, en conservant notamment « Médecin de bataille » et « Imposture ».

Les nouveaux tests vérifient également une référence distante simulée avec des titres inconnus, des paragraphes français dans un ordre différent, une introduction légendaire hors `.description`, deux traits sans chiffres qui nécessitent leurs titres attestés, des unités métriques et des valeurs incompatibles à refuser. Les clics des liens et des dés, leur identité DOM et la restauration exacte restent contrôlés sans envoyer de jet dans une partie.

La 1.17.6 n’a pas encore été contrôlée en direct avec Tampermonkey. Brave continue de renvoyer « User unavailable » après les reconnexions signalées ; le chargement de cette version et son rendu restent à vérifier. Les 75 fiches détaillées de dons n’ont donc pas toutes été ouvertes dans Shard. Les descriptions des autres monstres, les aptitudes hors SRD des sous-classes et les contenus des suppléments restent des zones de couverture à poursuivre.

Validation locale de la 1.17.6 : `npm run build`, `npm run translations:check`, l’ensemble de `npm test` et `git diff --check` passent. Les trois nouvelles suites couvrent les dons, la tarasque et les références distantes, puis les traits communs hors ligne. Le contrôle en direct reste en attente du chargement manuel et du retour de l’accès à Brave.

## Espacement et paragraphes de sorts — 15 octobre 2026

Les exemples utilisateur ont révélé deux défauts que les anciens tests ne distinguaient pas : une traduction française issue du PDF pouvait être mal espacée tout en correspondant à la source attendue par le test ; une description complète connue pouvait ne pas être reconnue lorsque Shard l’affichait en paragraphes séparés.

La 1.17.11 corrige six descriptions structurées (Rage et Amélioration de caractéristique du Barbare, Sorts et Amélioration de caractéristique du Clerc, Sorts du Druide, Défense supérieure du Moine) et Sort prévenant. La recherche de mots fusionnés dans les corpus structurés a été suivie d’une correction manuelle ; aucune règle ne découpe automatiquement des mots français à l’exécution.

Le pack `translations/dnd-2024/phb/sorts/traductions.json` ajoute 23 paragraphes et variantes vérifiés pour Communication avec les animaux, Trait ensorcelé, Rayon de lune, Animation des morts et Terrain hallucinatoire. Il conserve les distances anglaises, distingue l’annexe B du PHB du chapitre « Monstres » du SRD et prévoit les variantes sans dé visible relevées dans l’extrait utilisateur. Les paragraphes sont explicitement traduits, sans appariement par simple position.

La fixture `tests/fixtures/spell-paragraphs-2024.json` et `tests/test-spell-paragraphs.cjs` vérifient ces textes hors ligne, avec liens, dés cliquables et icônes, une valeur de dé inconnue à laisser intacte et la restauration exacte du HTML anglais. Défense supérieure possède une attente lisible indépendante des données générées. Les tests Python contrôlent aussi les autres défauts d’espacement corrigés. Le raccourci `npm run test:corpus` exécute ces contrôles et la validation des sources ; la suite complète reste `npm test`.

Cette passe vérifie les exemples signalés et les défauts similaires repérés dans les sources structurées. Elle ne constitue pas une relecture de tous les sorts ni une vérification en direct de cette version installée dans Tampermonkey. Les autres descriptions découpées différemment ou absentes du SRD peuvent encore nécessiter des paragraphes locaux explicites.

## Dix rubriques de références personnalisées — 15 octobre 2026

Le relevé de la 1.17.12 couvre les cartes et les fiches intégrales des dix types demandés. Les listes ont été parcourues jusqu’à leur fin, notamment les manifestations chargées progressivement. Les titres, sources et paragraphes des cartes ont été comparés aux fiches ouvertes.

| Rubrique | Fiches ouvertes |
| --- | ---: |
| Maladies | 3 |
| Ascendances draconiques | 10 |
| Manifestations occultes | 79 |
| Styles de combat | 12 |
| Options de manœuvre | 20 |
| Propriétés de botte | 8 |
| Métamagie | 18 |
| Fiches de référence : Magie sauvage | 1 |
| Bienfaits de pacte de l’Occultiste | 3 |
| Bottes d’arme | 38 |
| Total | 192 |

347 correspondances sont ajoutées, y compris les prérequis séparés ou entre parenthèses, les variantes des paragraphes du Manoir et la graphie corrigée « battleaxe » en complément de « batteaxe » observée dans Shard. Les effets des versions anciennes et 2024 ne sont pas réécrits les uns à partir des autres. Le nom précis du livre est conservé ; les textes du guide Shard sans millésime restent `any`, même dans le corpus historique.

Le navigateur intégré n’exposait pas le panneau Tampermonkey. Le même analyseur du userscript a donc été exécuté localement sur les HTML relevés, puis relancé après les ajouts. Les 192 cartes et fiches représentent 1 279 blocs contrôlés, 616 liens et 63 dés cliquables. Les cellules, fusions de lignes et colonnes de la table de Magie sauvage et la restauration exacte du HTML anglais sont vérifiées. Les candidats restants de l’analyseur sont les noms de livres et la notation d’un dé ; aucun reliquat de description n’est conservé.

Ce contrôle a également révélé que la graphie « œil du mage » d’une description SRD ne concordait pas avec le nom « Oeil du mage » utilisé par un lien AideDD. Le moteur reconnaît désormais ces variantes de ligature pour conserver le lien et traduire le paragraphe entier.

L’inventaire est dans `audit/inventaires/references-personnalisees.json`, les HTML et attentes dans `tests/fixtures/custom-references.json`, et le résultat de `npm run test:references` dans `audit/generes/references-personnalisees.json`. `validationLocale` est renseignée pour les dix rubriques du périmètre ; `traductionIntegraleValidee` reste distincte. Les autres bibliothèques, les fiches cibles des liens de sorts et monstres et le rendu de la version installée dans Tampermonkey restent à contrôler. Les objets ne font pas partie de cette passe.
