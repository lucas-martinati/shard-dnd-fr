# Fichiers intermédiaires générés

`npm run build` reconstruit ces JSON à partir des packs, dictionnaires, sources de génération et extraits SRD. Ne pas modifier directement ces résultats : corriger la source correspondante.

`feature-texts.json` contient les variantes de personnage ; `feat-texts.json` assemble les descriptions des corpus 2014 et PHB 2024 sans mélanger leurs sources éditables. Les autres fichiers contiennent les classes, options, sous-sections de sorts et descriptions complètes assemblées.

Les résultats techniques de couverture SRD sont dans `audit/generes/`, avec les autres données d’audit. Le rapport destiné à la consultation est dans `audit/couverture-traductions.json`.
