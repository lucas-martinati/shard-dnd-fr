# Traductions par livre et catégorie

Les livres prioritaires et le guide Shard sont séparés :

- `dnd-2024/phb/<catégorie>/traductions.json` : textes explicitement rattachés au **D&D 2024 PHB**, priorité 1.
- `dnd-2024/mm/<catégorie>/traductions.json` : textes explicitement rattachés au **D&D 2024 MM**, priorité 2.
- `shard-player-guide-volume-1/<catégorie>/traductions.json` : textes propres au guide Shard, secondaire.
- `<catégorie>/` : traductions communes, sources SRD et rattachements encore indéterminés. Une traduction identique reste réutilisable dans plusieurs livres.

[livres.json](livres.json) référence les suivis par livre et les priorités. Chaque dossier de livre conserve un `suivi.json` avec les limites et les contrôles restants. Les compteurs par dossier ne mesurent pas la couverture totale des livres : de nombreuses traductions restent partagées.

Les traductions restent regroupées par sujet dans chaque dossier, indépendamment du personnage qui a permis de repérer un manque.

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

Pour un ajout, modifier le `traductions.json` de la catégorie dans le livre concerné lorsque sa provenance est établie, ou dans le socle commun sinon. Tous ces packs sont détectés récursivement. Chaque entrée conserve son texte anglais exact, son français, sa source et son édition. Ne pas créer de fichier par personnage, niveau, bug ou série de corrections.

Les dictionnaires TSV et références JSON préexistants se trouvent aussi dans ces dossiers. Leur ordre historique reste conservé par la génération pour éviter les régressions de terminologie. Les noms AideDD 2024 gardent leur priorité à l’affichage.

`data/srd-5.2.1/` contient les extraits bilingues et leur attribution. Ce dossier reste nécessaire : `make-class-texts.py` et `make-option-texts.py` le lisent à chaque build. Le SRD est une sélection des règles D&D, distincte du guide Shard. Le Disclaimer du PHB lié dans Shard précise que son contenu complète le SRD 5.2 ; cet import ne remplace donc pas ces fichiers sources. Les outils de `work/` en tirent automatiquement le corpus des 12 classes et leurs options. Les fichiers intermédiaires de `work/` sont régénérés ; les compléments éditoriaux vont dans les catégories ci-dessus.

Lancer `npm run build`, puis `npm test`. `npm run translations:coverage` distingue les noms traduits, les blocs locaux et les corpus vérifiés. Une catégorie présente ne signifie pas que tous les contenus de tous les suppléments sont disponibles en français.

Voir [le guide détaillé](../docs/AJOUTER-DES-TRADUCTIONS.md).

Les descriptions de présentation des espèces et lignages se trouvent dans les packs `especes/` communs ou propres au livre, celles des classes et sous-classes dans les packs `classes/` communs ou propres au livre, et celles des historiques dans les packs `regles/` correspondants. Leurs identifiants commencent par `narrative.`. `descriptions-visibles.json` relie chaque fiche relevée à ses paragraphes ou puces pour mesurer la couverture des textes, séparément de celle des noms.

Les entrées `equipment.2014.*` de `objets/traductions.json` complètent 16 paragraphes anciens relevés sur 15 objets usuels. Les entrées `weapon.2014.*` de `shard-player-guide-volume-1/armes/traductions.json` ajoutent l’effet de l’adamantium et les sections titrées observées sur la dague ; les corps de propriétés déjà connus sont réutilisés. `tests/fixtures/equipment-legacy.json` conserve les extraits HTML des 16 fiches examinées le 14 octobre 2026. L’édition suit les règles du texte, même lorsqu’une fiche est aussi rattachée au D&D 2024 PHB dans Shard. Ce relevé ne représente pas tout l’équipement.

`regles/conditions-shard.json` inventorie les 48 fiches du catalogue Conditions relevé, avec les références des paragraphes, puces et cellules chargés depuis les packs `regles/traductions.json` communs ou propres au livre. Il comprend les états anciens et 2024 et les effets généraux Shard. Le livre indiqué par Shard peut associer un effet ancien au PHB 2024 : le texte exact fait foi, sans substitution des mécanismes par ceux d’une autre édition. Métamorphose n’a pas de présentation en carte ; sa description de Transformation est visible dans la fiche ouverte et testée séparément.

`dons/catalogue-2024.json` indexe les 75 dons PHB 2024, en distinguant les détails relevés dans Shard, les références anglaises et l’extrait utilisateur. Leurs traductions proposées se trouvent dans les packs `dons/traductions.json`, communs ou propres au livre ; les formulations historiques déjà présentes sont réutilisées plutôt que masquées. Les titres ont été harmonisés dans `dons/feat-texts.json` pour préserver leur mise en gras.

`monstres/traits-communs-2024.json` inventorie 217 traits de neuf familles relevés sur 183 créatures. Les corps exacts et leurs versions avec titre sont chargés depuis `dnd-2024/mm/monstres/traductions.json`, qui contient aussi la tarasque complète. Aucun modèle n’est appliqué à une description inconnue. `monstres/titres-aptitudes-2024.json` contient uniquement des titres bilingues pour le rapprochement des descriptions distantes, dans leur rubrique et avec des valeurs compatibles ; il n’ajoute pas ces titres au dictionnaire global des classes. `monstres/couverture-references-2024.json` recense les associations et les blocs à vérifier. Ces deux index ne constituent pas un corpus local de toutes les descriptions du bestiaire.
