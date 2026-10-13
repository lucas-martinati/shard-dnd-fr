# Traductions par catégorie

Toutes les traductions locales sont regroupées par sujet, indépendamment du personnage qui a permis de repérer un manque.

| Dossier | Contenu |
| --- | --- |
| `sorts/` | Noms, descriptions, composantes, effets et variantes anciennes des sorts |
| `dons/` | Dons et styles de combat |
| `classes/` | Aptitudes de toutes les classes, sous-classes, métamagies, manifestations et choix de création |
| `especes/` | Espèces et traits d’espèce |
| `objets/` | Équipement, objets usuels et magiques |
| `armes/` | Propriétés et bottes d’arme |
| `monstres/` | Bestiaire |
| `regles/` | Combat, conditions, vocabulaire commun et MJ |
| `interface/` | Libellés généraux de Shard |

Pour un ajout, modifier le `traductions.json` de la catégorie concernée. Chaque entrée conserve son texte anglais exact, son français, sa source et son édition. Ne pas créer de fichier par personnage, niveau, bug ou série de corrections.

Les dictionnaires TSV et références JSON préexistants se trouvent aussi dans ces dossiers. Leur ordre historique reste conservé par la génération pour éviter les régressions de terminologie. Les noms AideDD 2024 gardent leur priorité à l’affichage.

`data/srd-5.2.1/` contient les extraits bilingues et leur attribution. Les outils de `work/` en tirent automatiquement le corpus des 12 classes et leurs options. Les fichiers intermédiaires de `work/` sont régénérés ; les compléments éditoriaux vont dans les catégories ci-dessus.

Lancer `npm run build`, puis `npm test`. `npm run translations:coverage` distingue les noms traduits, les blocs locaux et les corpus vérifiés. Une catégorie présente ne signifie pas que tous les contenus de tous les suppléments sont disponibles en français.

Voir [le guide détaillé](../docs/AJOUTER-DES-TRADUCTIONS.md).

Les descriptions de présentation des espèces et lignages se trouvent dans `especes/`, celles des classes et sous-classes dans `classes/`, et celles des historiques dans `regles/`. Leurs identifiants commencent par `narrative.`. `descriptions-visibles.json` relie chaque fiche relevée à ses paragraphes ou puces pour mesurer la couverture des textes, séparément de celle des noms.

`regles/conditions-shard.json` inventorie les 48 fiches du catalogue Conditions relevé, avec les références des paragraphes, puces et cellules chargés depuis `regles/traductions.json`. Il comprend les états anciens et 2024 et les effets généraux Shard. Le livre indiqué par Shard peut associer un effet ancien au PHB 2024 : le texte exact fait foi, sans substitution des mécanismes par ceux d’une autre édition. Métamorphose n’a pas de présentation en carte ; sa description de Transformation est visible dans la fiche ouverte et testée séparément.
