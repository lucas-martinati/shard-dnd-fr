# Ajouter des traductions

Les nouvelles traductions se placent dans `translations/<catégorie>/traductions.json`. Chaque fichier est chargé automatiquement pendant `npm run build` : aucun ajout au moteur JavaScript ni à une liste de modules n’est nécessaire. Le fichier généré reste le seul fichier à copier dans Tampermonkey.

## Une traduction par entrée

Ajouter une entrée dans `translations/classes/traductions.json` avec cette structure :

```json
{
  "$schema": "../../docs/translation-pack.schema.json",
  "schemaVersion": 1,
  "edition": "2024",
  "source": "Traduction proposée à partir de l’extrait fourni",
  "entries": [
    {
      "id": "ma-classe.mon-aptitude.description",
      "en": "The exact English paragraph displayed by Shard.",
      "fr": "Le paragraphe français correspondant."
    }
  ]
}
```

Le schéma fournit l’aide à la saisie dans les éditeurs compatibles JSON Schema. Les identifiants doivent être uniques dans tous les packs. `edition` accepte `2014`, `2024` ou `any` : c’est une information de provenance. La sélection à l’affichage repose sur le texte anglais exact ; le script ne déduit pas l’édition d’une règle à partir du personnage.

Pour un petit libellé, ajouter `"kind": "term"`. Pour une description, `kind` est facultatif. Les noms déjà référencés par AideDD conservent la priorité AideDD.

## Paragraphes, variantes et valeurs

- Copier le texte anglais complet tel qu’il apparaît dans Shard, avec ses valeurs et ses dés.
- Créer une entrée par paragraphe. Le moteur sait les recombiner avec les titres et les balises de la fiche.
- Ajouter `"variants": ["Another exact English wording."]` uniquement si cette formulation a exactement la même traduction et les mêmes règles.
- Les apostrophes, espaces, contractions anglaises reconnues et guillemets typographiques ne nécessitent pas de variantes.
- Conserver les nombres écrits en chiffres et les dés dans la traduction. Les contrôles automatiques refusent leurs modifications ; ils ne remplacent pas une vérification du sens.
- Conserver les distances en feet. Ne pas réécrire une ancienne règle avec les effets de sa version 2024.
- Une négation, un coût, une durée ou un nombre de cibles différent exige une traduction distincte.

Les références de source sont obligatoires. Indiquer clairement si le texte français est une adaptation ou une traduction proposée plutôt qu’une formulation officielle. Les contenus SRD restent soumis à CC-BY-4.0 et les autres contenus à leurs propres conditions.

## Garder le gras et l’italique

Le moteur garde les balises de mise en forme et les éléments interactifs existants. Les titres et termes déjà connus servent de repères pour placer leur français dans le gras ou l’italique d’origine.

Si un titre de capacité reste en anglais ou perd son emphase, ajouter aussi son libellé exact avec `kind: term`. Une traduction complète du paragraphe ne fournit pas forcément une correspondance pour chacun de ses petits fragments en gras. Les fragments dont le français ne peut pas être identifié ne sont pas alignés approximativement.

## Vérifier et générer

```sh
npm run translations:check
npm run build
npm test
```

`translations:check` refuse les JSON invalides, champs inconnus, identifiants dupliqués, traductions contradictoires et nombres ou dés modifiés. La génération exécute aussi ces contrôles. Une entrée contradictoire bloque la génération au lieu d’être choisie arbitrairement.

Les nouveaux paragraphes et libellés sont testés à partir des packs dans un DOM comportant des dés cliquables. Les tests contrôlent la traduction, la conservation des éléments interactifs et le retour au texte anglais.

`package.json` est l’unique source de la version. Le build synchronise automatiquement les deux versions du projet dans `package-lock.json` et génère la version des métadonnées Tampermonkey, du userscript, de son panneau et du lexique. Le modèle `work/header.txt` contient `{{VERSION}}` : ne pas y recopier de numéro. Les versions des dépendances et les anciennes notes de publication restent indépendantes.

Pour une correction ou un ajout de traductions, cette commande incrémente le dernier numéro et reconstruit tous les livrables :

```sh
npm run version:patch
npm test
```

Pour choisir une version particulière : `npm run version:set -- 1.18.0`, puis `npm run build`. Il est aussi possible de modifier uniquement `version` dans `package.json` et de lancer le build. Un changement du numéro mineur ou majeur est réservé à une évolution plus importante ; il ne suit pas automatiquement chaque commit.

## Repérer les manques dans un HTML

Enregistrer l’extrait HTML dans un fichier local, puis lancer :

```sh
npm run translations:audit -- /chemin/extrait.html
npm run translations:audit -- /chemin/extrait.html --output /chemin/manques.json
npm run translations:audit -- /chemin/extrait.html --labels
npm run translations:audit -- /chemin/extrait.html --labels --all
```

Le filtre habituel repère des indices anglais ; `--all` liste tous les blocs inconnus, même sans ces indices. Il peut donc inclure du français et des noms propres. `--labels` ajoute les libellés et les attributs d’affichage. Les valeurs des champs, éditeurs et blocs masqués par `hidden` ou `aria-hidden` sont exclus. Les textes directs avant et après un paragraphe imbriqué sont conservés dans le relevé.

Le panneau D&D FR propose aussi **Repérer les traductions manquantes → Analyser la page**. Il utilise le texte original conservé par le moteur, repère les reliquats dans les blocs partiellement traduits et fournit un rapport JSON local avec le contexte, les occurrences et une cause possible. Il ne traduit pas automatiquement les candidats. Les causes liées au HTML ou aux références distantes sont des diagnostics à vérifier, pas la preuve qu’une traduction est absente du corpus.

L’outil rassemble les textes des paragraphes malgré les balises et les dés, ignore les champs éditables et compare aux traductions connues. Il fournit des **candidats anglais à vérifier**, pas une traduction automatique ni une preuve de couverture complète. Les textes déjà partiellement traduits ou découpés différemment peuvent nécessiter une inspection manuelle. Certains noms inconnus ne sont pas détectés par cette heuristique.

Le traitement reste local. Les rapports peuvent contenir des textes de partie : les garder hors du dépôt et de `translations/` jusqu’à leur tri. Le rapport d’audit n’est pas un pack prêt à charger : il faut écrire les traductions et leur source.

`--labels` inclut les boutons, liens, options avec valeur et attributs d'affichage inconnus. Il sert à repérer les commandes de navigation que l'heuristique de prose ne voit pas. Ses candidats peuvent être des noms propres ou des textes déjà français : il faut les trier. Les valeurs des champs et les éditeurs restent exclus, et les noms du catalogue AideDD sont reconnus.

Tous les dictionnaires et descriptions sont rangés dans les catégories de `translations/`. `work/` contient les outils et leurs fichiers intermédiaires générés. Les textes SRD utilisés par les générateurs sont conservés dans `data/srd-5.2.1/`.

Les catégories sont `sorts`, `dons`, `classes`, `especes`, `objets`, `armes`, `monstres`, `regles` et `interface`. Il ne faut plus créer de fichier par personnage, niveau ou correction. Les aptitudes, sous-classes, métamagies et manifestations vont dans `classes/` ; les styles de combat et dons dans `dons/`.

Chaque entrée peut préciser `source` et `edition` pour remplacer les valeurs par défaut du fichier. Les éditions restent séparées par les textes exacts, même dans une catégorie commune.

`npm run translations:coverage` affiche l’inventaire des noms et descriptions disponibles, avec les limites explicites. Ce rapport est aussi régénéré dans `outputs/couverture-traductions.json` pendant le build. Un nom traduit ne compte pas comme une description traduite.

Le champ `objectifReferencesAccueil` reprend `translations/perimetre-references.json` : les six rubriques d’options du personnage et les dix types personnalisés constituent le minimum à traduire intégralement. Vérifier toutes les fiches, pas seulement leurs noms et résumés, avant de valider une rubrique. La liste `aVerifier` concerne les appariements SRD ; son absence de candidats ne prouve pas que toutes les références de Shard sont traduites. Le détail des contrôles attendus figure dans l’[audit de couverture](AUDIT-COUVERTURE.md#objectif-minimal--toutes-les-références-accessibles-depuis-laccueil).

## Sorts découpés en options et puces

Le générateur `work/make-spell-sections.py` relie les titres de sous-sections anglais et français du SRD, puis produit `work/spell-sections.json`. Il est exécuté par `npm run build`. Pour compléter un sort déjà référencé dans le SRD, ajouter les titres correspondants dans sa table et vérifier les limites de chaque effet. La position d’un effet dans une liste ne suffit pas : les listes françaises peuvent avoir un ordre différent. Certains sorts comportent un paragraphe commun après les options ; celui-ci doit être isolé avant leur appariement.

Les descriptions non SRD et les variantes anciennes peuvent toujours être ajoutées dans un pack JSON, une entrée par puce. Un test doit reproduire la liste HTML, ses titres et ses dés cliquables. Les segments dont les dés sont absents, différents ou réordonnés sont exclus de la génération automatique plutôt qu’appliqués approximativement.

## Aptitudes présentées en sous-sections

`translations/classes/sections.json` relie explicitement les titres anglais et français. `work/make-class-sections.py` découpe chaque version indépendamment, puis relie les sections par ces titres, avec validation des nombres et de l’ordre des dés. Cela couvre aussi des options que le français présente dans un autre ordre, comme les proies du Chasseur.

Le générateur conserve les traductions préexistantes et refuse les correspondances ambiguës. Il produit une paire pour le titre, le corps et la section complète lorsque les valeurs concordent. Les nouveaux titres doivent correspondre aux libellés connus afin de conserver leur gras. Les variantes de référence au chapitre 7 et les introductions génériques de sous-classe sont générées pour toutes les classes concernées.

## Couverture des armes

`translations/armes/catalogue-2024.json` énumère les 38 armes du SRD et relie chacune à ses propriétés et à sa botte. Ajouter une arme à ce catalogue implique de fournir aussi les traductions de ses règles dans `traductions.json`. Les règles privées ou de suppléments ne sont pas déduites d’un nom d’arme. Un exemple facultatif doit avoir sa propre paire afin que la règle reste traduisible lorsque Shard omet cet exemple.

## Paragraphes des sorts et priorité des références

Pour un sort à effets nommés, relier ses titres EN/FR dans `work/make-spell-sections.py`. Fournir les corps, les sections complètes et les titres ponctués permet de garder le gras existant. Les titres non ponctués sont reconnus comme repères de mise en forme sans devenir des traductions globales de mots courants tels que « Drop ».

Le moteur traite chaque P/LI/BR et les sous-titres reconnus avant d’essayer un bloc complet. Il ne partage jamais une traduction entre plusieurs paragraphes par simple nombre de phrases. Une correspondance manquante demande un ajout explicite ou une référence distante compatible.

Le parseur AideDD fournit des blocs de texte et leurs titres, sans réinjecter de HTML distant. Les sections nommées sont reliées au lexique, indépendamment de leur ordre ; les paragraphes non titrés gardent un contrôle de structure. Une référence plus courte en nombre de phrases est conservativement refusée pour ne pas effacer une exception. Ce contrôle ne prouve pas une équivalence sémantique : les versions doivent toujours être vérifiées.

Seules les paires validées pendant le chargement des fiches publiques reçoivent une provenance permettant de remplacer le SRD. Les anciens caches restent lisibles, mais ne sont pas promus automatiquement en références prioritaires. Les valeurs courtes d’un champ distant ne changent pas les noms connus du lexique.
