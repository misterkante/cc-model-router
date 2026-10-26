# Documentation

[English](README.md) · [Français](README.fr.md)

Commence par le [README principal](../README.fr.md) pour l’installation et l’usage.

| Document | Contenu |
|---|---|
| [`BENCHMARK.fr.md`](BENCHMARK.fr.md) | Résultats de référence (48 runs), analyse par tier, incidents, pilotes et limites. |
| [`COMPETITION.fr.md`](COMPETITION.fr.md) | Veille concurrentielle datée, positionnement, plan de lancement et risques. |
| [`RESEARCH.fr.md`](RESEARCH.fr.md) | Faits datés sur la lineup Claude Code, les flags et les issues liées. |
| [`benchmarks/`](benchmarks/) | JSON brut sanitisé des runs et pilotes publiés. |
| [`../bench/README.fr.md`](../bench/README.fr.md) | Protocole benchmark canonique : fixtures, checks, commandes et règles de publication. |
| [`../IMPLEMENTATION_PLAN.fr.md`](../IMPLEMENTATION_PLAN.fr.md) | Journal de construction, décisions, nombre de tests et travail restant. |
| [`../CONTRIBUTING.fr.md`](../CONTRIBUTING.fr.md) | Conventions de développement, benchmark et commits. |
| [`../SECURITY.fr.md`](../SECURITY.fr.md) | Modèle de menace des commandes de vérification et signalement des vulnérabilités. |
| [`../CHANGELOG.fr.md`](../CHANGELOG.fr.md) | Historique des versions. |
| [`assets/`](assets/) | Social preview et graphiques du benchmark utilisés par les README. |
| [`../scripts/make-benchmark-charts.py`](../scripts/make-benchmark-charts.py) | Régénère les graphiques localisés du benchmark depuis le JSON publié. |

## Lire les chiffres

- La métrique principale est le **coût par tâche acceptée**, avec le
  `total_cost_usd` API-équivalent de Claude Code comme proxy du quota. Ce n’est
  pas une facture d’abonnement.
- Le baseline des 48 runs est mixte : Sonnet/medium pour mechanical et debugging,
  Opus/high pour implementation. Ce n’est pas une comparaison tout-Opus.
- Le baseline ne charge pas le hook ; la variante routée le charge. Le résultat
  mesure le routeur comme produit, pas un A/B de modèles isolés.
- Les tokens bruts sont secondaires et peuvent bouger dans les deux sens. La
  promesse est le coût/quota économisé à qualité égale, jamais « des tokens
  économisés ».
- L’échantillon est de 12 tâches × 2 répétitions. Pas d’intervalle de confiance
  ni de revue aveugle ; ne pas généraliser au-delà.

## Versions linguistiques

Tous les docs racine (`CHANGELOG`, `CODE_OF_CONDUCT`, `CONTRIBUTING`, `IMPLEMENTATION_PLAN`, `SECURITY`) ont aussi une version `.fr.md`.

- Anglais : [README principal](../README.md), [index docs](README.md), [`BENCHMARK.md`](BENCHMARK.md), [`COMPETITION.md`](COMPETITION.md), [`RESEARCH.md`](RESEARCH.md), [`../bench/README.md`](../bench/README.md).
- Français : [README principal](../README.fr.md), [index docs](README.fr.md), [`BENCHMARK.fr.md`](BENCHMARK.fr.md), [`COMPETITION.fr.md`](COMPETITION.fr.md), [`RESEARCH.fr.md`](RESEARCH.fr.md), [`../bench/README.fr.md`](../bench/README.fr.md).
