# Fichiers générés et distribués

Tous les fichiers JavaScript et JSON de ce dossier sont reconstruits par `npm run build`. Les fichiers Markdown expliquent leur utilisation.

| Fichier | Rôle |
| --- | --- |
| `shard-dnd-fr.user.js` | Userscript autonome à installer dans Tampermonkey ; contient les traductions et références nécessaires |
| `shard-dnd-fr.meta.js` | Métadonnées utilisées par Tampermonkey pour vérifier les mises à jour |
| `lexique-en-fr.json` | Export consultable des traductions, catégories, sources, alias et liens |
| `catalogue-aidedd-2024.json` | Export des références AideDD 2024 : noms EN/FR, types, alias et liens |
| `corrections-srd-2024.json` | Export des correspondances françaises officielles SRD, avant la priorité des noms AideDD dans le lexique final |

Les deux derniers fichiers sont des exports de données, pas des notes ni des listes de traductions restant à faire. Le userscript contient déjà les données qu’il utilise : il ne télécharge pas ces JSON à l’exécution. Ils permettent de consulter ou de réutiliser les données sans analyser le JavaScript généré.

Le champ `date` du catalogue désigne la date du relevé de référence, pas celle de chaque génération. Modifier les sources dans `translations/` ou `sources-generation/`, puis reconstruire. Le rapport de couverture et les inventaires sont dans `audit/`.

Voir [les instructions d’installation](INSTALLATION.md).
