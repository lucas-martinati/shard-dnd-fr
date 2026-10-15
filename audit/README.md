# Audit et inventaires

Ces fichiers décrivent ce qui a été relevé et vérifié ; les traductions sont dans `translations/`.

- [Suivi des livres](livres.json) et `livres/` : PHB, MM et corpus 2014, avec priorités, accès et contrôles restants.
- [Inventaires](inventaires/) : descriptions de présentation, dons, conditions, armes et traits de monstres. Ils relient les fiches aux identifiants des traductions et servent aux tests de non-régression.
- [Périmètre de l’accueil](perimetre-references.json) : six catégories de personnage et dix types personnalisés à couvrir intégralement.
- [Références personnalisées](inventaires/references-personnalisees.json) : les 192 cartes et fiches ouvertes des dix types, leurs livres et éditions observés ; validation locale distincte du contrôle du userscript installé.
- [Analyse des sources SRD](ANALYSE-SOURCES-SRD.md) : fichiers réellement utilisés, apport mesuré et migration vers les traductions PHB structurées et retrait de la dépendance aux extraits PDF.
- [Méthode de classement](classement.json) : preuves utilisées pour ranger les traductions et limites des rattachements.
- `generes/` : résultats techniques de couverture des classes et options SRD, reconstruits pendant le build. `references-personnalisees.json` est produit par `npm run test:references`, avec le même analyseur que le panneau, les écarts de traduction et les métadonnées conservées.
- [Couverture générée](couverture-traductions.json) : résultat de `npm run build`, ou `npm run translations:coverage -- --output audit/couverture-traductions.json`.

Les dates indiquent la date des relevés, pas une expiration des traductions. Une fiche déjà traduite reste dans l’inventaire pour que les tests détectent une régression. Les notes de travail temporaires n’ont pas vocation à rejoindre ces inventaires.

Les compteurs distinguent noms, paragraphes et fiches observées. Un nombre de blocs ne valide pas un livre entier. Voir [le rapport détaillé](../docs/AUDIT-COUVERTURE.md).
