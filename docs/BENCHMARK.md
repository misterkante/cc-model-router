# Benchmark qualité — pilote

> Date : 2026-10-25
> Question : le routing économise-t-il du coût/quota **sans dégrader la qualité** ?
> Échantillon : 5 tâches × 2 variantes = 10 runs.
> Données brutes : [`benchmarks/2026-10-25-pilot.json`](benchmarks/2026-10-25-pilot.json)

## Résultat en une ligne

Sur ce pilote, le routing passe **5/5 tâches** contre **4/5** pour le baseline, à **0,0877 $ par tâche acceptée** contre **0,1893 $** (-53,6 %). Mais il consomme **37,6 % de tokens bruts en plus** : l'économie est en **coût/quota**, pas en nombre de tokens.

## Protocole

- Chaque run part d'une **copie isolée** : devquiz pour les tâches mechanical/implementation, fixture Python pour le debugging. Le repo source n'est jamais modifié.
- Variante `routed` : `cc-router run`, hook chargé via `--settings`, config dans `.sandbox/config`.
- Variante `baseline` : `claude --model <modèle> --effort <effort>` avec les mêmes flags (`-p --output-format json --max-budget-usd 0.50 --permission-mode acceptEdits`).
- Checks **automatiques** : IDs présents, fichiers attendus, YAML valide (PyYAML), tests Python, fichier de test non modifié.
- Un run est **accepté** si le check passe et si aucun fichier hors périmètre n'a changé.
- `total_cost_usd` est un coût API-équivalent : avec un abonnement Claude Code, c'est un **proxy de la consommation de quota**, pas une facture.

### Tâches

| Id | Tier | Fixture | Baseline |
|---|---|---|---|
| `mech-questions` | mechanical | devquiz | sonnet / medium |
| `mech-features` | mechanical | devquiz | sonnet / medium |
| `impl-roadmap` | implementation | devquiz | opus / high |
| `impl-profile` | implementation | devquiz | opus / high |
| `debug-calc` | debugging | buggy-python | sonnet / medium |

Le baseline représente le comportement visé : Sonnet pour le travail courant, Opus pour l'implémentation lourde. Ce n'est pas le seul baseline possible (voir « Contrefactuel »).

## Résultats

| Tâche | Tier | Routé | Coût routé | Baseline | Coût baseline | Écart | Qualité |
|---|---|---|---|---|---|---|---|
| `mech-questions` | mechanical | haiku / low | 0,0031 $ | sonnet / medium | 0,0631 $ | **-95,1 %** | 2/2 |
| `mech-features` | mechanical | haiku / low | 0,0041 $ | sonnet / medium | 0,0625 $ | **-93,5 %** | 2/2 |
| `impl-roadmap` | implementation | sonnet / medium | 0,1127 $ | opus / high | 0,2790 $ | **-59,6 %** | 2/2 |
| `impl-profile` | implementation | sonnet / medium | 0,1605 $ | opus / high | 0,2964 $ | **-45,8 %** | 2/2 |
| `debug-calc` | debugging | opus / high | 0,1581 $ | sonnet / medium | 0,0560 $ | +182,4 % | routé 1/1, baseline 0/1 |

### Agrégats

| Variante | Runs | Acceptés | Coût total | Coût / accepté | Tokens | Tokens / accepté |
|---|---|---|---|---|---|---|
| `routed` | 5 | **5** | 0,4386 $ | **0,0877 $** | 556 931 | 111 386 |
| `baseline` | 5 | 4 | 0,7570 $ | 0,1893 $ | 404 795 | 101 199 |

- **Coût par tâche acceptée : -53,6 %.**
- **Tokens bruts : +37,6 %** pour le routing.
- Aucun changement de fichier hors périmètre dans les 10 runs.

## Analyse

### Mechanical : le gain est massif et sans perte mesurée

Haiku produit les mêmes listes d'IDs que Sonnet, sans modifier aucun fichier, pour **17 à 20× moins cher**. C'est le cas d'usage idéal : extraction, tri, résumé, lookup.

### Implementation : Sonnet suffit, Opus est du luxe sur ces tâches

Les deux tâches (roadmap, profil YAML) passent avec Sonnet comme avec Opus. Le YAML produit par Sonnet est valide et respecte l'AC1 (langue, volume, pistes actives, notions ordonnées avec `id`, `titre`, `docs`). Opus coûte **46 à 60 % de plus** sans gain mesuré ici.

### Debugging : Opus a évité un échec réel

Sur `debug-calc`, Sonnet a corrigé 2 bugs sur 3 mais a laissé `average([])` planter (`ZeroDivisionError`). Opus a corrigé les 3. Le routage vers Opus coûte 2,8× plus cher que Sonnet **sur ce run**, mais il évite un run échoué et une reprise. C'est exactement le compromis que le tier debugging doit trancher.

### Coût vs tokens : le point crucial

Le routing **n'économise pas des tokens bruts**. Haiku est parfois plus bavard que Sonnet sur une extraction, et Sonnet a produit plus de tokens qu'Opus sur les deux tâches d'implémentation. L'économie vient du **prix par token** et du **poids de quota** du modèle, pas du volume. Toute communication qui promet « moins de tokens » est fausse ; la promesse correcte est « moins de coût/quota à qualité égale ».

### Contrefactuel : le gain dépend du modèle qu'on aurait utilisé

- Si le baseline implementation est déjà Sonnet, le routing implementation **n'économise rien** (même modèle).
- Si le baseline debugging est déjà Opus, le routing debugging **n'économise rien** (même modèle).
- Le gain mesuré vient de l'écart entre le modèle « par défaut » de l'utilisateur et le modèle minimal suffisant. Le benchmark cible l'utilisateur qui reste sur Opus/Sonnet par habitude.

### Après reprise du debug

Le baseline a échoué une fois. Si on le relance avec Opus (0,1581 $), son coût pour 5 tâches acceptées devient ~0,9152 $, soit **0,1830 $/accepté** — encore ~52 % plus cher que le routing. C'est une estimation, pas une mesure.

## Ce que ce pilote prouve

- Sur ces 5 tâches, les modèles moins chers produisent des sorties **acceptées par des checks objectifs**.
- Les économies mechanical et implementation sont **larges et reproductibles** sur les deux tâches de chaque catégorie.
- Le tier debugging **a un effet qualité mesurable** : un modèle moins cher a échoué là où Opus a réussi.
- L'isolation fonctionne : aucun fichier source modifié, aucun changement hors périmètre.

## Ce que ce pilote ne prouve pas

- **Généralisation** : 5 tâches, 1 run par tâche. Pas d'intervalle de confiance, pas de répétition.
- **Qualité au-delà du binaire** : style, maintenabilité, lisibilité, architecture non évalués.
- **Tâches longues** : pas de refactor multi-fichiers, pas de session interactive, pas de contexte volumineux.
- **Erreurs de classification** : le pilote teste des prompts dont le routage est correct ; il ne mesure pas les mauvais routages.
- **Quota réel** : le coût API-équivalent n'est pas la consommation exacte d'un abonnement.

## Reproduire

```bash
node bench/run.mjs --budget 0.50
node bench/run.mjs --tasks debug-calc --budget 0.50
node bench/recheck.mjs bench/results/<fichier>.json <taskId>
```

Voir [`bench/README.md`](../bench/README.md).

## Prochaines étapes

1. **Élargir à 20–30 tâches**, avec 3 répétitions par tâche et des fixtures de debug variées (off-by-one, async, parsing, régression).
2. **Mesurer le rework** : taux d'escalade, coût d'un run échoué, temps perdu.
3. **Revue aveugle** : faire noter les diffs par un humain ou un modèle juge, sans savoir quelle variante les a produits.
4. **Valider la session interactive** (hook + statusline en TUI).
5. **Brancher le dashboard** Phase 3 sur ces métriques.
