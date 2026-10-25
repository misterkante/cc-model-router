# Benchmark qualité

Question : le routing économise-t-il des tokens **sans dégrader la qualité** ?

> Résultats du pilote (2026-10-25) : [`docs/BENCHMARK.md`](../docs/BENCHMARK.md). En résumé : 5/5 tâches acceptées contre 4/5, **-53,6 % de coût par tâche acceptée**, mais **+37,6 % de tokens bruts** — l'économie est en coût/quota, pas en volume.

## Protocole

- Chaque tâche tourne deux fois, dans une copie isolée du repo :
  - `routed` : notre router choisit le modèle ;
  - `baseline` : modèle de référence (Sonnet ou Opus).
- Les checks sont automatiques : IDs présents, fichiers attendus, YAML valide, tests Python.
- Métriques : **pass rate**, coût, tokens, **coût par tâche acceptée**, changements inattendus.
- Les copies sont créées dans `/tmp/cc-router-bench-*` ; le repo source n'est jamais modifié.

## Tâches

| Id | Tier | Fixture | Baseline |
|---|---|---|---|
| `mech-questions` | mechanical | devquiz | sonnet / medium |
| `mech-features` | mechanical | devquiz | sonnet / medium |
| `impl-roadmap` | implementation | devquiz | opus / high |
| `impl-profile` | implementation | devquiz | opus / high |
| `debug-calc` | debugging | buggy-python | sonnet / medium |

## Lancer

```bash
node bench/run.mjs --budget 0.20
node bench/run.mjs --tasks mech-questions,debug-calc --budget 0.10
```

Options :

- `--repo <path>` : repo devquiz source (défaut : `~/dev/misterkante/devquiz`) ;
- `--budget <usd>` : plafond par run (défaut : `0.20`) ;
- `--out <file>` : fichier de résultats JSON.

## Limites

- Petits échantillons : le pilote sert à détecter les écarts grossiers, pas à conclure statistiquement.
- `total_cost_usd` est un coût API-équivalent : avec un abonnement Claude Code, c'est un proxy de la consommation de quota, pas une facture.
- Les checks sont binaires ; ils ne mesurent pas le style ni la maintenabilité.
