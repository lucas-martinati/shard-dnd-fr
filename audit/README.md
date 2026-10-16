# Audit et inventaires

Ces fichiers décrivent ce qui a été relevé et vérifié ; les traductions sont dans `translations/`.

- [Suivi des livres](livres.json) et `livres/` : PHB, MM et corpus 2014, avec priorités, accès et contrôles restants.
- [Inventaires](inventaires/) : descriptions de présentation, dons, conditions, armes et traits de monstres. Ils relient les fiches aux identifiants des traductions et servent aux tests de non-régression.
- [Périmètre de l’accueil](perimetre-references.json) : six catégories de personnage et dix types personnalisés à couvrir intégralement.
- [Références personnalisées](inventaires/references-personnalisees.json) : les 192 cartes et fiches ouvertes des dix types, leurs livres et éditions observés ; validation locale distincte du contrôle du userscript installé.
- [Sources SRD](../translations/dnd-2024/phb/SOURCES-SRD.md) : provenance des corpus bilingues structurés utilisés par le build.
- [Méthode de classement](classement.json) : preuves utilisées pour ranger les traductions et limites des rattachements.
- `generes/classes-srd.json` et `options-srd.json` : résultats techniques reconstruits pendant le build et utilisés par les tests et le rapport de couverture.
- [Contrôle des références personnalisées](generes/references-personnalisees.json) : produit par `npm run test:references`, avec la version testée et le même analyseur que le panneau.
- [Contrôle des sorts PHB](generes/sorts-phb-2024.json) : produit par `npm run audit:spells`, à relancer après les corrections de sorts.
- [Relevé historique du guide Shard](generes/shard-players-guide-v1.json) : passages de 734 notices et fiches observées avec la version 1.17.28. Les résultats par fiche sont conservés pour une nouvelle vérification ; les copies globales, listes de noms sans candidat et listes Markdown redondantes ont été retirées. Ce relevé ne décrit pas les manques de la version actuelle.
- [Couverture générée](couverture-traductions.json) : résultat de `npm run build`, ou `npm run translations:coverage -- --output audit/couverture-traductions.json`.

Les dates indiquent la date des relevés, pas une expiration des traductions. Une fiche déjà traduite reste dans l’inventaire pour que les tests détectent une régression. Les notes de travail temporaires n’ont pas vocation à rejoindre ces inventaires.

Les bilans ponctuels dont les exemples sont désormais couverts par des tests et les notes de migration terminée sont retirés. Leur historique reste disponible dans Git ; les traductions, fixtures et attributions sont conservées. Un ancien candidat non revérifié reste une piste, même après la correction d’autres rapports.

Les compteurs distinguent noms, paragraphes et fiches observées. Un nombre de blocs ne valide pas un livre entier. Voir [le rapport détaillé](../docs/AUDIT-COUVERTURE.md).
