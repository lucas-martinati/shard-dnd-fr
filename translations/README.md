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

Les entrées `equipment.2014.*` de `objets/traductions.json` complètent 16 paragraphes anciens relevés sur 15 objets usuels. Les entrées `weapon.2014.*` de `armes/traductions.json` ajoutent l’effet de l’adamantium et les sections titrées observées sur la dague ; les corps de propriétés déjà connus sont réutilisés. `tests/fixtures/equipment-legacy.json` conserve les extraits HTML des 16 fiches examinées le 14 octobre 2026. L’édition suit les règles du texte, même lorsqu’une fiche est aussi rattachée au D&D 2024 PHB dans Shard. Ce relevé ne représente pas tout l’équipement.

`regles/conditions-shard.json` inventorie les 48 fiches du catalogue Conditions relevé, avec les références des paragraphes, puces et cellules chargés depuis `regles/traductions.json`. Il comprend les états anciens et 2024 et les effets généraux Shard. Le livre indiqué par Shard peut associer un effet ancien au PHB 2024 : le texte exact fait foi, sans substitution des mécanismes par ceux d’une autre édition. Métamorphose n’a pas de présentation en carte ; sa description de Transformation est visible dans la fiche ouverte et testée séparément.

`dons/catalogue-2024.json` indexe les 75 dons PHB 2024, en distinguant les détails relevés dans Shard, les références anglaises et l’extrait utilisateur. Leurs traductions proposées se trouvent dans `dons/traductions.json` ; les formulations historiques déjà présentes sont réutilisées plutôt que masquées. Les titres ont été harmonisés dans `dons/feat-texts.json` pour préserver leur mise en gras.

`monstres/traits-communs-2024.json` inventorie 217 traits de neuf familles relevés sur 183 créatures. Les corps exacts et leurs versions avec titre sont chargés depuis `monstres/traductions.json`, qui contient aussi la tarasque complète. Aucun modèle n’est appliqué à une description inconnue. `monstres/titres-aptitudes-2024.json` contient uniquement des titres bilingues pour le rapprochement des descriptions distantes, dans leur rubrique et avec des valeurs compatibles ; il n’ajoute pas ces titres au dictionnaire global des classes. `monstres/couverture-references-2024.json` recense les associations et les blocs à vérifier. Ces deux index ne constituent pas un corpus local de toutes les descriptions du bestiaire.
