# Benchmark qualité — run de référence

[English](BENCHMARK.md) · [Français](BENCHMARK.fr.md)

> Date : 2026-10-26 (local) · 12 tâches × 2 variantes × 2 répétitions = **48 runs**.
> Question : le routing économise-t-il du coût/quota **sans dégrader la qualité** ?
> Process canonique : [`../bench/README.fr.md`](../bench/README.fr.md) · vérification : `npm run bench:verify`.
> Données : [`benchmarks/2026-10-26-expanded.json`](benchmarks/2026-10-26-expanded.json).
> Pilote précédent : [`benchmarks/2026-10-25-pilot.json`](benchmarks/2026-10-25-pilot.json) (5 tâches, 1 run).

## Réponse en une ligne

Sur 48 runs, le routing passe **23/24 (95,8 %)** contre **21/24 (87,5 %)** pour le baseline, à
**0,0906 $ par tâche acceptée** contre **0,1375 $** : **-34,1 % de coût/quota**. Les tokens bruts
baissent de 5,2 % au total, mais ce n'est pas l'argument : le gain vient des tiers mechanical
(-94 %) et implementation (-53 %). Le tier debugging est un **garde-fou qualité** (+30 % par tâche
acceptée vs Sonnet), pas une source d'économie ; il sur-route Opus sur les bugs simples. Une
politique opt-in Sonnet-first (simulation + pilote 4 runs) est analysée plus bas ; la baseline 48
runs ne charge pas le hook.

## Protocole (résumé)

Le détail canonique, les règles d'ajout de tâche et la checklist de publication sont dans
[`../bench/README.fr.md`](../bench/README.fr.md).

- Chaque run part d'une **copie isolée** : fixture devquiz synthétique pour mechanical/implementation,
  fixtures Python dédiées pour debugging. Le repo source n'est jamais modifié.
- Variante `routed` : `ccmr run`, hook chargé via `--settings`, config isolée
  (`CC_ROUTER_CONFIG_DIR`).
- Variante `baseline` : `claude --model <modèle> --effort <effort>` avec les mêmes flags
  (`-p --output-format json --max-budget-usd 0.50 --permission-mode acceptEdits`), **sans le hook**.
- Checks **automatiques** : IDs présents, JSON structuré, fichiers attendus, YAML valide (PyYAML),
  tests Python, fichier de test non modifié (SHA-1).
- Un run est **accepté** si le check passe, si le code de sortie est 0 et si aucun fichier hors
  `allowedChanges` n'a changé.
- `total_cost_usd` est un coût API-équivalent : avec un abonnement Claude Code, c'est un **proxy de
  la consommation de quota**, pas une facture.

### Tâches

| Id | Tier | Fixture | Baseline | Check |
|---|---|---|---|---|
| `mech-questions` | mechanical | devquiz | sonnet / medium | IDs Q-01..Q-11 présents |
| `mech-features` | mechanical | devquiz | sonnet / medium | IDs F-01..F-14 présents |
| `mech-lots` | mechanical | devquiz | sonnet / medium | JSON `{"A":9,"B":3,"C":2}` |
| `mech-questions-json` | mechanical | devquiz | sonnet / medium | JSON de 11 questions avec texte |
| `impl-roadmap` | implementation | devquiz | opus / high | fichier + IDs + lots A/B/C |
| `impl-profile` | implementation | devquiz | opus / high | YAML valide + AC1 (Python) |
| `impl-angular` | implementation | devquiz | opus / high | YAML + ≥ 8 notions + URLs Angular |
| `impl-questions` | implementation | devquiz | opus / high | 11 réponses avec rationale |
| `debug-calc` | debugging | buggy-python | sonnet / medium | tests verts + test intact |
| `debug-parse` | debugging | buggy-python-parse | sonnet / medium | tests verts + test intact |
| `debug-state` | debugging | buggy-python-state | sonnet / medium | tests verts + test intact |
| `debug-search` | debugging | buggy-python-search | sonnet / medium | tests verts + test intact |

Le baseline représente le comportement visé : Sonnet pour le travail courant, Opus pour
l'implémentation lourde. Ce n'est pas le seul baseline possible (voir « Contrefactuel »).

### Incident de fixture et re-run (transparence)

Le premier run élargi a produit 48 runs, mais `impl-angular` / routé / répétition 2 a échoué pour
une raison de **harness**, pas de raisonnement : Sonnet a tenté `mkdir` + `cat > …` + `python3 -c …`
dans une seule commande Bash. En headless, `acceptEdits` auto-approuve les edits de fichiers, **pas
Bash** ; la commande a été bloquée, aucun fichier n'a été créé, et le modèle a cru avoir réussi.

Correction et re-run :

1. Le répertoire cible `bench/fixtures/devquiz/parcours/` est désormais pré-créé (`.gitkeep`), pour
   que Write puisse créer le fichier sans `mkdir`.
2. `impl-angular` a été rejoué seul : 2 répétitions × 2 variantes, même budget.
3. Le re-run donne routé **1/2** (répétition 1 : YAML invalide, vrai échec Sonnet ; répétition 2 :
   OK) et baseline **2/2**.
4. Les 4 enregistrements `impl-angular` du premier run ont été remplacés par ceux du re-run avec
   `bench:merge` ; le dataset publié contient 48 runs et porte `mergedAt` / `mergedTasks:
   ["impl-angular"]`.

Conséquence : l'échec routé du dataset final est un **vrai échec de qualité** (YAML invalide), pas
l'artefact de harness. Les totaux de passes sont inchangés (23/24 et 21/24), mais la cause est
maintenant honnête. Leçon produit : une validation post-génération (parser le YAML, lancer les
tests) aurait attrapé l'erreur et permis un retry/escalade.

## Résultats globaux

| Variante | Runs | Acceptés | Taux | Coût total | Coût / accepté | Tokens | Tokens / accepté |
|---|---|---|---|---|---|---|---|
| `routed` | 24 | **23** | **95,8 %** | 2,0838 $ | **0,0906 $** | 2 147 568 | 93 373 |
| `baseline` | 24 | 21 | 87,5 % | 2,8874 $ | 0,1375 $ | 2 266 530 | 107 930 |

- **Coût par tâche acceptée : -34,1 %** ; coût total : **-27,8 %**.
- **Tokens bruts : -5,2 %** au total ; **-13,5 %** par tâche acceptée. Ce n'est pas la promesse
  principale, et le signe peut changer selon les tâches (mechanical consomme un peu plus).
- **Aucun changement de fichier hors périmètre** dans les 48 runs.

## Par tier

| Tier | Variante | Runs | Acceptés | Taux | Coût / accepté | Tokens / accepté |
|---|---|---|---|---|---|---|
| mechanical | routed | 8 | 8 | 100 % | **0,0033 $** | 48 386 |
| mechanical | baseline | 8 | 8 | 100 % | 0,0575 $ | 45 869 |
| implementation | routed | 8 | 7 | 87,5 % | **0,1046 $** | 112 382 |
| implementation | baseline | 8 | 8 | 100 % | 0,2237 $ | 119 341 |
| debugging | routed | 8 | 8 | 100 % | 0,1656 $ | 121 726 |
| debugging | baseline | 8 | 5 | 62,5 % | 0,1277 $ | 188 971 |

Lecture :

- **Mechanical** : qualité identique, **-94,2 %** de coût par tâche acceptée. C'est le gain le plus net et
  le plus reproductible.
- **Implementation** : **-53,2 %** de coût par tâche acceptée, mais **7/8 vs 8/8** : Sonnet a produit un
  YAML invalide sur `impl-angular`. Le baseline Opus est plus fiable, pas seulement plus cher.
- **Debugging** : **8/8 vs 5/8** pour le baseline Sonnet, mais **+29,7 %** de coût par tâche acceptée.
  Opus évite deux échecs du baseline sans hook (`debug-calc`, `debug-search`) et coûte cher sur deux
  tâches où Sonnet suffisait (`debug-parse`, `debug-state`).

Le « tokens / accepté » du debugging baseline est gonflé par les runs échoués (les tokens des échecs
sont comptés au numérateur, mais divisés par 5 acceptés). Comparer le coût et le taux de réussite,
pas ce chiffre isolé.

## Par tâche

| Tâche | Tier | Routé | Pass routé | Coût routé / accepté | Baseline | Pass baseline | Coût baseline / accepté | Écart |
|---|---|---|---|---|---|---|---|---|
| `mech-questions` | mechanical | haiku / low | 2/2 | 0,0033 $ | sonnet / medium | 2/2 | 0,0588 $ | **-94,4 %** |
| `mech-features` | mechanical | haiku / low | 2/2 | 0,0032 $ | sonnet / medium | 2/2 | 0,0571 $ | **-94,5 %** |
| `mech-lots` | mechanical | haiku / low | 2/2 | 0,0037 $ | sonnet / medium | 2/2 | 0,0602 $ | **-93,9 %** |
| `mech-questions-json` | mechanical | haiku / low | 2/2 | 0,0032 $ | sonnet / medium | 2/2 | 0,0538 $ | **-94,0 %** |
| `impl-roadmap` | implementation | sonnet / medium | 2/2 | 0,0895 $ | opus / high | 2/2 | 0,2106 $ | **-57,5 %** |
| `impl-profile` | implementation | sonnet / medium | 2/2 | 0,1015 $ | opus / high | 2/2 | 0,2227 $ | **-54,4 %** |
| `impl-angular` | implementation | sonnet / medium | **1/2** | 0,1720 $ | opus / high | 2/2 | 0,2455 $ | -29,9 % |
| `impl-questions` | implementation | sonnet / medium | 2/2 | 0,0892 $ | opus / high | 2/2 | 0,2158 $ | **-58,7 %** |
| `debug-calc` | debugging | opus / high | 2/2 | 0,1559 $ | sonnet / medium | **0/2** | — | — |
| `debug-parse` | debugging | opus / high | 2/2 | 0,1921 $ | sonnet / medium | 2/2 | 0,0893 $ | **+115,1 %** |
| `debug-state` | debugging | opus / high | 2/2 | 0,1637 $ | sonnet / medium | 2/2 | 0,0828 $ | **+97,7 %** |
| `debug-search` | debugging | opus / high | 2/2 | 0,1506 $ | sonnet / medium | **1/2** | 0,1580 $ | -4,7 % |

Notes :

- `debug-calc` : baseline Sonnet **0/2** (liste vide non gérée, `ZeroDivisionError`). Le coût
  baseline de 0,1363 $ correspond à deux runs échoués ; un retry Opus ajouterait ~0,16 $, soit
  ~0,29 $ par résultat accepté. Opus direct reste plus sûr ici.
- `debug-search` : baseline **1/2** (mauvaise première occurrence). Le -4,7 % est fragile : le coût
  baseline par tâche acceptée divise par 1 seul succès ; un retry du run échoué ferait remonter ce coût.
- `impl-angular` : le 1/2 routé est un YAML invalide (`titre: Composants : anatomie…`, deux-points
  non quoté). Ce n'est pas un problème de compréhension de la tâche, mais de syntaxe — exactement ce
  qu'une validation automatique doit attraper.

## Analyse

### Le gain est réel, mais il n'est pas uniforme

Le routing ne rend pas tous les tiers moins chers. Il déplace le curseur :

- mechanical : **-94 %**, qualité identique ;
- implementation : **-53 %**, avec un risque de syntaxe que le baseline Opus n'a pas eu ;
- debugging : **+30 %**, mais **8/8 vs 5/8**.

Le -34,1 % global est donc un mélange : une économie massive sur le travail mécanique, une économie
solide sur l'implémentation, et un surcoût assumé sur le debugging. C'est plus crédible qu'un chiffre
unique qui laisserait croire que tout est moins cher.

### Le tier debugging est trop grossier

Le classifieur envoie **tous** les bugs vers Opus. Or :

- `debug-calc` et `debug-search` ont échoué avec Sonnet dans le baseline **sans hook** (0/2 et
  1/2) ; le pilote réel avec hook passe 4/4 sur `debug-calc` + `debug-search`, donc le besoin
  d'Opus n'est pas déterministe ;
- `debug-parse` et `debug-state` passent avec Sonnet 2/2, à environ **2× moins cher** qu'Opus.

Un tier debugging unique est donc **conservateur** : il protège la qualité, mais sur-route les bugs
simples. L'amélioration logique est une politique **Sonnet d'abord, escalade Opus sur échec de
check** (implémentée en opt-in le 2026-10-26, simulée ci-dessous), ou un sous-classifieur « bug
simple » vs « bug profond » (concurrence, régression, état, flaky). Il faut mesurer le taux
d'escalade et le coût d'un run échoué + retry, pas seulement le coût du run gagnant.

### Simulation : Sonnet-first + escalade Opus (pas un nouveau run)

Les 16 enregistrements debugging du dataset (8 Sonnet baseline, 8 Opus routés) permettent de
simuler une politique « Sonnet d'abord, Opus sur échec de check » :

| Politique | Acceptés | Coût total | Coût / accepté |
|---|---:|---:|---:|
| Sonnet seul | 5/8 | 0,6385 $ | 0,1277 $ |
| Opus direct | 8/8 | 1,3247 $ | 0,1656 $ |
| **Sonnet-first + Opus** | **8/8** | **1,1191 $** | **0,1399 $** |

- **-15,5 %** de coût par tâche acceptée vs Opus direct, à qualité simulée égale (8/8).
- 3 runs sur 8 escaladent (`debug-calc` ×2, `debug-search` ×1) ; les 5 autres restent sur Sonnet.
- **+9,5 %** vs Sonnet seul, mais Sonnet seul n'accepte que 5/8 : on paie le rattrapage des 3 échecs.
- Coût d'un échec + retry, p. ex. `debug-calc` : 0,0704 $ (Sonnet) + 0,1514 $ (Opus) = 0,2218 $.

**Ce que c'est / n'est pas :**

- Une **simulation** à partir des enregistrements existants, pas un nouveau benchmark.
- Le coût du retry Opus est **proxied** par le run Opus frais. En réalité, le retry part de l'arbre
  Sonnet échoué et reçoit la sortie d'échec : le coût peut différer (cache froid, contexte plus
  long, correction partielle). Le pilote d'escalade a mesuré **0,1425 $** pour le retry, contre
  **0,1559 $** en moyenne pour un Opus frais.
- On suppose que le retry Opus réussit quand le run Opus frais a réussi ; aucun deuxième échec
  n'est modélisé.
- Pas de latence, pas de cache, pas de vérification réelle.
- La politique n'est appliquée que si `--verify` et `--escalate` sont fournis ; sans check fiable,
  le debugging reste Opus.

Les pilotes réels ci-dessous montrent que l'hypothèse « Sonnet échoue 0/2 » n'est pas stable :
**4/4** avec hook, mais **un échec réel** sans hook. La simulation est un scénario, pas une
prédiction.

Reproduire : `npm run bench:simulate-escalation` (ou `node bench/simulate-escalation.mjs`).

### Pilote réel Sonnet-first (2026-10-26, 4 runs)

Après la simulation, un pilote réel a testé la politique sur `debug-calc` (`buggy-python`) et
`debug-search` (`buggy-python-search`), avec `debuggingStrategy: "sonnet-first"`,
`--verify "python3 -m unittest <test>.py"`, `--escalate`, budget 0,50 $, copies isolées,
Claude Code 2.1.309.

| Tâche | Run | Modèles | Coût API-équivalent | Check | Escalade | Fichiers changés |
|---|---:|---|---:|---|---|---|
| `debug-calc` | 1 | Sonnet 5.5 | 0,0770 $ | OK | non | `calc.py` |
| `debug-calc` | 2 | Sonnet 5.5 | 0,0812 $ | OK | non | `calc.py` |
| `debug-search` | 1 | Sonnet 5.5 | 0,0827 $ | OK | non | `search.py` |
| `debug-search` | 2 | Sonnet 5.5 | 0,0784 $ | OK | non | `search.py` |

- **4/4 Sonnet passent**, sans escalade ; ~**-49 %** vs Opus routé sur `debug-calc` et ~**-46 %**
  sur `debug-search` (moyennes des deux répétitions), à check égal.
- Le baseline Sonnet du benchmark (sans hook) était **1/4** sur ces deux tâches (`debug-calc` 0/2,
  `debug-search` 1/2). Le pilote utilisait le hook (`--settings`) ; la différence peut venir du
  contexte du hook, de la stochasticité, ou des deux. **Ne pas attribuer la différence au modèle
  seul.**
- Aucun fichier hors `calc.py` / `search.py` modifié ; les checks externes passent.
- **L'escalade n'a pas été exercée dans ces quatre runs** : les quatre runs Sonnet ont réussi.
  Un second pilote, sans hook, a reproduit l'échec Sonnet connu sur `debug-calc` et observé
  l'escalade Opus (section suivante).
- 4 runs, pas un benchmark ; coût API-équivalent, pas facturé.

### Pilote réel d'escalade (2026-10-26, 1 run, 2 tentatives)

Pour exercer réellement le chemin d'échec, un second pilote a utilisé `debug-calc` **sans hook**
(settings vides), afin de retrouver le comportement du baseline Sonnet du benchmark, qui avait
échoué 0/2 sur cette tâche. Configuration : `debuggingStrategy: "sonnet-first"`,
`--verify "python3 -m unittest test_calc.py"`, `--escalate`, budget 0,50 $, copie isolée,
Claude Code 2.1.309.

| Tentative | Modèle | Coût API-équivalent | Check | Escalade |
|---:|---|---:|---|---|
| 1 | Sonnet 5.5 | 0,0707 $ | **échec** : `average([])` → `ZeroDivisionError` | oui |
| 2 | Opus 5.5 | 0,1425 $ | OK (4 tests) | — |

- **Escalade réelle observée** : Sonnet corrige `add` et `clamp` mais rate `average([])` ;
  Opus reçoit la sortie d'échec et corrige `average`. Le run est accepté après 2 tentatives.
- Coût total **0,2132 $** ; référence Opus direct sur `debug-calc` : 0,1514 $ et 0,1605 $,
  moyenne **0,1559 $**. L'échec + retry coûte donc **+36,7 %** vs Opus direct.
- Le retry Opus seul (0,1425 $) est **-8,6 %** vs un run Opus frais : il part d'un arbre
  partiellement corrigé, pas d'une copie neuve. Le cache n'est pas mesuré ; la simulation qui
  proxifie le retry par un run Opus frais est donc légèrement pessimiste sur ce point.
- Seul `calc.py` a été modifié. `__pycache__` créé par `unittest` a été retiré avant le diff ;
  ce n'est pas une édition du modèle.
- **Un échec réel, pas un taux** : ce pilote valide le mécanisme et mesure un cas de coût. Il ne
  prouve pas que Sonnet échoue à un taux donné ; le taux et le coût moyen restent à mesurer sur
  plusieurs runs. Il montre aussi qu'un premier essai raté peut coûter plus cher qu'Opus direct,
  même quand le retry réussit.
- Le run sans hook est le même point de départ que le baseline du benchmark ; le pilote 4/4
  ci-dessus utilisait le hook. La différence hook/stochasticité reste un confondant.
- Données assainies : [`benchmarks/2026-10-26-escalation-pilot.json`](benchmarks/2026-10-26-escalation-pilot.json).
- Reproduire (settings vides, config temporaire) :

```bash
CC_ROUTER_CONFIG_DIR=<tmp-config> node bin/cc-model-router.js run \
  "Debug the failing tests: there is a bug in calc.py, fix it so all tests pass. Do not modify test_calc.py or any other file." \
  --verify "python3 -m unittest test_calc.py" --escalate \
  -- --settings <empty-settings.json> --permission-mode acceptEdits \
     --output-format json --max-budget-usd 0.50
```

### Un échec d'implémentation réel : YAML invalide

Sonnet a créé `parcours/angular.yaml` avec un titre non quoté contenant `:`. PyYAML refuse le
fichier. Opus a produit un YAML valide sur les deux répétitions. Ce n'est pas un échec de routing au
sens « mauvais tier » : c'est un échec de **validation**. Un `ccmr run --verify "python3 -c
'import yaml; yaml.safe_load(open(...))'"` (ou un check de projet) aurait renvoyé un échec, puis un
retry Sonnet ou une escalade Opus aurait récupéré le run. C'est la deuxième priorité produit.
Le pilote d'escalade ci-dessus a depuis exercé ce chemin sur un échec de debugging réel.

### Coût vs tokens : le point crucial

Le routing **n'économise pas toujours des tokens bruts** :

- mechanical : **+5,5 %** de tokens par tâche acceptée (Haiku est un peu plus bavard) ;
- implementation : **-5,8 %** ;
- debugging : tokens totaux légèrement supérieurs (+3,1 %), mais bien moins de tokens par résultat
  accepté grâce aux 8/8 vs 5/8.

Au global, les tokens baissent de 5,2 %, mais ce signe n'est pas garanti. L'économie vient du
**prix par token** et du **poids de quota** du modèle, pas du volume. Toute communication qui promet
« moins de tokens » est fausse ; la promesse correcte est « moins de coût/quota à qualité mesurée
égale ou meilleure ».

### Contrefactuel : le gain dépend du modèle qu'on aurait utilisé

- Si l'utilisateur fait déjà tout en Sonnet : le gain mechanical reste (Haiku), le gain
  implementation disparaît (même modèle), et le debugging devient plus cher mais plus fiable.
- Si l'utilisateur fait déjà tout en Opus : le gain est plus large, surtout sur mechanical et
  implementation.
- Le benchmark cible l'utilisateur qui reste sur un modèle fort par habitude. Il ne prétend pas
  qu'un utilisateur déjà optimal économise.

## Ce que ce run prouve

- Sur **12 tâches et 2 répétitions**, les modèles moins chers produisent des sorties acceptées par
  des checks objectifs, à **-34,1 % de coût par tâche acceptée**.
- Le gain mechanical est **large, stable et sans perte mesurée** (-94 %, 8/8 vs 8/8).
- Le gain implementation est **large** (-53 %) mais pas sans risque : un YAML invalide sur 8 runs
  routés.
- Le tier debugging **a un effet qualité mesurable dans la comparaison produit** : Opus + hook 8/8
  vs Sonnet sans hook 5/8 ; le hook est un confondant, et le pilote réel `debug-calc` +
  `debug-search` (Sonnet + hook 4/4) montre que l'écart n'est pas seulement le modèle.
- L'isolation fonctionne : aucun fichier source modifié, aucun changement hors périmètre.

## Ce que ce run ne prouve pas

- **Significativité statistique** : 12 tâches, 2 répétitions, pas d'intervalle de confiance. Les
  tâches ne sont pas indépendantes (2 runs de la même tâche).
- **Qualité au-delà du binaire** : style, maintenabilité, lisibilité, architecture non évalués.
- **Tâches longues** : pas de refactor multi-fichiers, pas de session interactive, pas de contexte
  volumineux.
- **Erreurs de classification** : les prompts sont choisis pour router correctement ; le taux de
  mauvais routage en usage réel n'est pas mesuré.
- **Quota réel** : le coût API-équivalent n'est pas la consommation exacte d'un abonnement.
- **Généralisation à d'autres modèles** : le lineup est daté (Claude Code 2.1.309, Haiku/Sonnet/Opus
  5.5) ; un changement de modèle ou de prix invalide les chiffres.
- **La politique Sonnet-first** : elle est simulée à partir des enregistrements, et le pilote réel
  n'a pas exercé l'escalade ; le coût du retry et le taux de réussite réel restent à valider.
- **Confondant hook** : la variante routée charge le hook (contexte de recommandation), la baseline
  non. La comparaison est « routeur complet vs Claude nu », pas « modèle A vs modèle B ». Le pilote
  `debug-calc` + `debug-search` (Sonnet + hook 4/4 vs baseline Sonnet 1/4 sur ces tâches) le
  montre.

## Reproduire

```bash
# 1. Vérifier le protocole (obligatoire)
npm run bench:verify

# 1b. Simulation Sonnet-first (aucun appel modèle)
npm run bench:simulate-escalation

# 2. Run de référence : 12 tâches × 2 variantes × 2 répétitions
npm run bench -- --repeats 2 --budget 0.50

# 3. Rapport Markdown
npm run bench:report -- bench/results/<fichier>.json

# 4. Publier le JSON nettoyé (sans chemins/hashes/stderr)
npm run bench:publish -- bench/results/<fichier>.json 2026-10-26-expanded
```

Après une correction de fixture, rejouer une seule tâche puis fusionner :

```bash
npm run bench -- --tasks impl-angular --repeats 2 --budget 0.50 \
  --out bench/results/impl-angular-rerun.json
npm run bench:merge -- bench/results/2026-10-26-expanded.json \
  bench/results/impl-angular-rerun.json \
  --out bench/results/2026-10-26-expanded-merged.json
```

Voir le protocole complet : [`../bench/README.fr.md`](../bench/README.fr.md).

## Prochaines étapes

1. **Debugging plus fin** : `debuggingStrategy: "sonnet-first"` + `--verify --escalate` est
   implémenté (2026-10-26) ; la simulation donne -15,5 % vs Opus direct à 8/8. Pilote réel 4/4
   Sonnet sur `debug-calc` + `debug-search`, sans escalade ; un second pilote sans hook a observé
   un échec Sonnet réel sur `debug-calc` puis une réussite Opus (0,2132 $ vs 0,1559 $ Opus direct,
   +36,7 %). Il reste à mesurer le **taux** d'escalade, le coût moyen et l'effet du cache sur
   plusieurs runs et les 4 tâches.
2. **Validation post-run** : `ccmr run --verify "<commande>"` + `--escalate` (implémenté
   le 2026-10-26, hors chiffres de ce run). C'est ce qui aurait rattrapé le YAML invalide de
   Sonnet : le parser renvoie 1, puis Opus reçoit l'erreur et corrige.
3. **Élargir à 20–30 tâches, 3 répétitions**, avec revue aveugle des diffs et intervalles de
   confiance.
4. **Session interactive validée** : `npm run test:tui` (tmux) vérifie la statusline et le hook dans un vrai TUI, et que `~/.claude` + le repo restent inchangés.
5. **Phase 2 — OpenCode**, après une veille datée fraîche.
6. **Phase 3 — dashboard** branché sur ces métriques (coût/quota, escalade, rework).
7. **Positionnement et lancement** : voir [`COMPETITION.md`](COMPETITION.fr.md) (veille du 2026-10-26).

## Annexe — pilote 2026-10-25

Le pilote initial (5 tâches × 2 variantes = 10 runs, 1 run par tâche et par variante) avait donné :

| Variante | Acceptés | Coût total | Coût / accepté | Tokens |
|---|---|---|---|---|
| `routed` | 5/5 | 0,4386 $ | **0,0877 $** | 556 931 |
| `baseline` | 4/5 | 0,7570 $ | 0,1893 $ | 404 795 |

- Coût par tâche acceptée : **-53,6 %**.
- Tokens bruts : **+37,6 %**.
- Mechanical : Haiku -95,1 % / -93,5 %, qualité identique.
- Implementation : Sonnet -59,6 % / -45,8 % vs Opus, qualité identique.
- Debugging : Opus 1/1, Sonnet 0/1 (`average([])` non géré).
- Aucun fichier hors périmètre modifié.
- Limite : 5 tâches, 1 run, checks binaires ; pas une preuve statistique.

Le run élargi confirme les directions (mechanical massif, implementation solide, debugging
qualitatif) mais corrige deux conclusions du pilote : le debugging n'est pas uniformément
justifié, et l'implémentation Sonnet peut échouer sur la syntaxe. C'est pour cela que le chiffre
global passe de -53,6 % à -34,1 % : il est plus honnête, pas moins bon.
