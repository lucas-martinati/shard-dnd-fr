# Provenance des aptitudes et options SRD

Les fichiers `classes/descriptions-srd.json` et `classes/options-srd.json` contiennent les traductions bilingues structurées provenant des anciens extraits SRD. Ils remplacent les textes extraits des PDF et leur index auparavant rangés dans `data/srd-5.2.1/`.

- `descriptions-srd.json` : 232 aptitudes avec identifiant, classe, niveau, titres anglais et français, description EN/FR.
- `options-srd.json` : 10 métamagies et 28 manifestations occultes, avec 70 blocs et variantes correspondant notamment à l’affichage séparé des coûts et prérequis.

Ces fichiers sont éditables. Le build les valide et prépare les copies intermédiaires sans extraire de PDF. Les 288 sous-sections et variantes de classes restent générées depuis les aptitudes structurées et les titres bilingues de `classes/sections-bilingues.json`. Les autres descriptions déjà présentes conservent leur priorité lors de l’assemblage final.

Les paragraphes courts issus d’extraits utilisateur et du SRD sont maintenus dans les packs `classes/traductions.json` et `especes/traductions.json`, avec leur provenance propre. Les variantes d’Attaque sournoise sont explicites dans le pack des classes : elles traduisent les dés affichés par Shard sans les déduire du niveau du personnage.

## Attribution conservée

Cette œuvre inclut du matériel issu du System Reference Document 5.2.1 (« SRD 5.2.1 ») de Wizards of the Coast LLC, disponible à l’adresse https://www.dndbeyond.com/srd. Le SRD 5.2.1 est régi par la Licence Creative Commons Attribution 4.0 International, disponible à l’adresse https://creativecommons.org/licenses/by/4.0/legalcode.

- [Document anglais d’origine](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)
- [Document français d’origine](https://media.dndbeyond.com/compendium-images/srd/5.2/FR_SRD_CC_v5.2.1.pdf)

Les données structurées reprennent les formulations effectives de l’ancien build, y compris les adaptations éditoriales déjà appliquées et les distances remises en feet. La migration ne constitue pas une nouvelle traduction officielle. Certains défauts typographiques hérités de l’extraction française (mots collés) restent à relire ; les validations de chiffres et dés ne remplacent pas cette relecture.

Les textes et l’index PDF bruts ont été retirés du dépôt après migration. Leur historique reste disponible dans Git, et les documents originaux sont accessibles par les liens ci-dessus.
