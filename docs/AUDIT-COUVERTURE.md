# Audit de couverture — 13 octobre 2026

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

Au total, le relevé contient 153 fiches et 248 paragraphes ou puces. Quatre fiches anciennes n'ont pas de description dans Shard ; aucun texte n'a été inventé pour les remplir. Les 149 fiches qui comportent une présentation ont une correspondance pour chaque bloc. Le catalogue `translations/descriptions-visibles.json` relie les fiches aux identifiants réellement chargés. Ces chiffres décrivent le relevé des présentations ; ils ne signifient pas que toutes les aptitudes des 48 sous-classes sont traduites.

Les textes anglais ont été relevés avec la traduction temporairement désactivée, puis celle-ci a été réactivée. Les cartes conservent leur texte complet dans le DOM même quand leur aperçu est tronqué par `ll-8` ou `ll-10`. Les traductions sont placées par paragraphe dans `especes/`, `classes/` et `regles/` pour les historiques. Les textes sont des traductions proposées des contenus observés, avec leur livre source et leur édition ; ils ne sont pas étiquetés comme du SRD lorsqu'ils n'en proviennent pas.

`tests/fixtures/narrative-cards.json` conserve le HTML des présentations relevées, sans données de personnage ou de campagne. `test-narratives.cjs` contrôle les 248 blocs, les 48 noms de sous-classe, les listes de préceptes, les italiques imbriqués, la présentation en carte et en fiche ouverte, un lien et un terme en gras, les valeurs de longévité et la restauration exacte du HTML.

`npm run build` régénère les livrables et l'inventaire. `npm test` inclut les tests des packs et la suite `test-general-categories.cjs` : états avec liens, gras/italique, titres CSS Shard, dé avec icône, navigation, champs privés, règle inconnue, distinction des éditions et restauration exacte du HTML.

L'inventaire `outputs/couverture-traductions.json` sépare les libellés des blocs et compte aussi les descriptions/champs locaux uniques. Aucun pourcentage « tout Shard » n'est donné sans dénominateur connu.

La 1.17.2 a été chargée manuellement dans Brave et ses traductions d'états ont été vérifiées sur la page réelle : titres en gras, paragraphes séparés et liens de Vitesse, Neutralisé et jets de sauvegarde. Les traits Forme de géant et Forte carrure et les tailles en feet ont également été vérifiés sur une fiche d'espèce. Les anciennes règles 2014 et les effets personnalisés de la liste ne sont pas remplacés par les descriptions 2024. Les effets En sang/Vision dans le noir/abris et certains contenus Shard restent à compléter ; les récits d'espèce relevés sont couverts à partir de la 1.17.4.

La 1.17.3 a ensuite été chargée et la fiche du goliath des pierres vérifiée dans Brave : descendance, titres en gras/italique, effet, phrase de récupération des utilisations, distances en feet et élément de dé `1d12` sont présents en français. Une capture a été conservée localement hors du dépôt. Les gestionnaires de clic des dés sont vérifiés dans les tests locaux ; aucun jet n'a été envoyé dans une partie pendant l'audit.

La 1.17.4 a été chargée manuellement puis vérifiée dans Brave : les 19 cartes d'espèce de base affichent leurs 32 paragraphes en français, la fiche ouverte de l'aasimar reprend ses trois paragraphes complets, et les 29 cartes d'historique affichent leurs présentations traduites. Le sélecteur des quatre serments du paladin 2024 a également été contrôlé : accroches en italique, paragraphes complets et douze préceptes en puces sont traduits. Des captures locales des espèces et du sélecteur de sous-classe ont été conservées hors du dépôt. Les 48 présentations de sous-classe sont couvertes par les fixtures et tests ; le contrôle en direct de cette version a porté sur les quatre serments, pas sur les 48 fiches ouvertes individuellement. Les titres et paragraphes ajoutés à une fenêtre apparaissent progressivement pendant le parcours asynchrone du moteur.

L'accès automatisé au tableau de bord Tampermonkey (`chrome-extension://`) est bloqué par la politique du navigateur. Les nouvelles versions doivent donc être chargées manuellement avant de vérifier leur rendu en direct dans Brave ; les tests locaux ne remplacent pas cette étape.
