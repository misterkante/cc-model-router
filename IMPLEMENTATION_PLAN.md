# Plan d'implémentation — Auto Model Router

> Dernière mise à jour : 2026-10-26
> Statut : Phase 1 terminée (MVP Claude Code) + benchmark élargi (48 runs) + validation/escalade

## 🎯 Vision

Éliminer le `/model` manuel : router automatiquement Claude Code (puis OpenCode) vers le modèle adapté à la complexité de la tâche (Haiku / Sonnet / Opus), pour réduire la consommation de **quota/coût** tout en préservant la qualité. Les tokens bruts ne baissent pas toujours : c'est le coût par résultat accepté qui compte.

## 🧩 Contexte & problème

- En 2026, l'adoption de Claude Code est généralisée. Point commun de tous les users : la consommation de tokens épuise vite les credits, alors qu'on veut faire de "big things".
- Solution visée : bascule automatique de modèle selon la tâche, sans intervention manuelle (`/model`).
- État de l'art constaté (oct. 2026) :
  - Claude Code : alias natif `opusplan` (Opus en plan → Sonnet en exécution). Feature requests ouverts pour routing auto : #44976, #43326, #27665.
  - Hook communautaire : `tzachbon/claude-model-router-hook` (tiers mechanical/implementation/debugging ; config globale + projet ; gestion subagents).
  - OpenCode : feature request #8456 (auto model par task type) ; plugins `opencode-model-router`, `Auto (Jev)` ; routing local/cloud.

## 🔎 Phase 0 — Veille (obligatoire avant chaque phase de code)

1. Chercher sur le web, **sources primaires d'abord** (Anthropic docs/release notes, GitHub officiel).
2. Noter les faits **datés et sourcés** dans `docs/RESEARCH.md`.
3. Lister les incertitudes et les contradictions entre sources.
4. Décider, puis coder.

## ✅ Décisions prises

1. Produit **open source** (licence MIT envisagée).
2. Scope MVP : **Claude Code** → extension **OpenCode** ensuite.
3. Tiers de routing :
   - mechanical → Haiku (effort : low)
   - implementation → Sonnet (effort : medium)
   - debugging / complex → Opus (effort : high)
4. Subagents : forcer le tier par classe de tâche ; modèle explicite > déduit ; plafond de délégation imbriqué.
5. Config : globale (`~/.claude/model-router.json`) + projet (`.claude/model-router.json`).
6. Isolation des tests : `CC_ROUTER_CONFIG_DIR` + `claude --settings` (jamais `~/.claude/settings.json`) ; `HOME` non modifié pour préserver l'auth Claude.
7. Veille web datée obligatoire avant chaque phase de code, consignée dans `docs/RESEARCH.md`.

## 📋 Phases

- [x] Phase 0 — Veille & découverte : ✅ terminée (voir `docs/RESEARCH.md`)
- [x] Phase 1 — MVP Claude Code : hook + config + routing + override + status ✅
- [ ] Phase 2 — OpenCode : routing / plugin équivalent
- [ ] Phase 3 — Mesure & stats : tokens économisés, coûts, escalade qualité

## 📦 Livrables Phase 1 (2026-10-24)

| Fichier | Rôle |
|---|---|
| `src/classifier.js` | Classifieur heuristique (3 tiers, scoring, confidence) |
| `src/config.js` | Merge config globale + projet |
| `bin/cc-router.js` | CLI : `classify`, `run`, `status`, `hook` |
| `src/hook.js` | Hook `UserPromptSubmit` (log + contexte) |
| `hooks/user-prompt-submit.js` | Entrée hook pour Claude Code |
| `bin/statusline.js` | Status line : modèle courant + mapping des tiers |
| `tests/classifier.test.js` | 16 tests (routing, fallback, config, isolation) |
| `examples/model-router.json` | Config d'exemple |
| `docs/RESEARCH.md` | Veille datée : lineup, écosystème, incertitudes |

## 🧪 Preuves Phase 1

- `node --test tests/*.test.js` → **16/16 tests passent**
- `cc-router classify "debug why the login test is flaky"` → `debugging` / `opus` / confidence 1
- `cc-router run` (dry-run) → `claude --model sonnet "implement the auth endpoint"`
- Hook `UserPromptSubmit` → log dans `.sandbox/config/router.log` (isolation) + `additionalContext` correct
- `./scripts/sandbox.sh` → smoke test complet sans toucher `~/.claude`
- [x] Validation en session réelle Claude Code (headless `-p`) : ✅ 2026-10-25 (voir résultats ci-dessous)
- [ ] Validation en session interactive (hook + statusline en TUI) : à faire

## 🔧 Correctifs d'alignement Claude Code (2026-10-24)

Vérifiés sur le CLI 2.1.309 (`claude --help` + inspection du binaire) :
- `effort: "none"` était invalide → `"low"` (valeurs : low/medium/high/xhigh/max).
- `cc-router run` applique désormais `--effort` et `--fallback-model`.
- Fallbacks par tier : mechanical → sonnet ; implementation → haiku ; debugging → sonnet,haiku.
- Passthrough d'arguments Claude via `-- <args>` (ex: `-- -p`).
- Alias `haiku` / `sonnet` / `opus` / `fable` confirmés.

## 🧪 Test réel devquiz (2026-10-25)

Contexte : copie de devquiz dans `/tmp/devquiz-router-test`, CLI Claude Code 2.1.309, `-p --output-format json`, plafond 0,30 $/run, hook via `--settings`.

| Run | Routage | Modèle réel | Coût | Fichiers |
|---|---|---|---|---|
| A (mechanical) | haiku / low | claude-haiku-5-5 | $0.00334 | aucun |
| A baseline (sans routeur) | sonnet / medium | claude-sonnet-5-5 | $0.05859 | aucun |
| B (implementation) | sonnet / medium | claude-sonnet-5-5 | $0.10274 | `docs/ROADMAP.md` |

- Économie Tâche A : **-94,3 %** vs Sonnet ($0.00334 vs $0.05859).
- Hook `UserPromptSubmit` déclenché en headless : 2 entrées dans `.sandbox/config/router.log`.
- Aucun fichier du devquiz réel modifié ; `~/.claude` intact.
- Coût total du test : **~$0.165**.
- Limite : 1 échantillon par tâche ; la session interactive reste à valider.

## 📊 Benchmark qualité — run de référence (2026-10-26)

Question : le routing économise-t-il du coût/quota **sans dégrader la qualité** ?
Protocole : 12 tâches × 2 variantes × 2 répétitions = 48 runs, copies isolées, checks automatiques, budget 0,50 $/run.
Détail : `docs/BENCHMARK.md` ; process canonique : `bench/README.md` ; vérification : `npm run bench:verify` ; données : `docs/benchmarks/2026-10-26-expanded.json`.

| Variante | Acceptés | Coût total | Coût / accepté | Tokens |
|---|---|---|---|---|
| routed | 23/24 (95,8 %) | 2,0838 $ | **0,0906 $** | 2 147 568 |
| baseline | 21/24 (87,5 %) | 2,8874 $ | 0,1375 $ | 2 266 530 |

- Coût par tâche acceptée : **-34,1 %** ; coût total : -27,8 %.
- Tokens bruts : -5,2 % au total ; -13,5 % par accepté → l'économie reste en **coût/quota**, pas en volume.
- Mechanical : Haiku -94,3 %, 8/8 vs 8/8.
- Implementation : Sonnet -53,2 %, 7/8 vs 8/8 ; un YAML invalide sur `impl-angular` (vrai échec Sonnet, rattrapable par validation).
- Debugging : Opus 8/8 vs Sonnet 5/8, mais +29,7 % par accepté ; Opus nécessaire sur `debug-calc`/`debug-search`, surdimensionné sur `debug-parse`/`debug-state`.
- Aucun fichier hors périmètre modifié.
- Incident : `impl-angular` routé repeat 2 du premier run = commande Bash bloquée (artefact harness) ; fixture corrigée (`parcours/.gitkeep`), tâche rejouée et fusionnée. L'échec final est le YAML invalide, pas l'artefact.
- Limite : 12 tâches, 2 répétitions, checks binaires, pas de revue aveugle ; pas encore une preuve statistique.

Le pilote initial (5 tâches, 1 run) avait donné -53,6 % de coût par accepté et +37,6 % de tokens. Le run élargi corrige deux conclusions : le debugging n'est pas uniformément justifié, et Sonnet peut échouer sur la syntaxe. Le chiffre global baisse (-34,1 %) parce qu'il est plus honnête, pas parce que le routing est moins bon.

## ✅ Validation + escalade (2026-10-26)

Problème mesuré : sur 48 runs, Sonnet a produit un YAML invalide sur `impl-angular` (1/8 échec implementation) ; le baseline Opus était 8/8. Le routeur doit pouvoir **vérifier puis escalader**, pas seulement choisir un modèle au lancement.

Implémentation :

- `cc-router run "<task>" --verify "<commande>"` exécute la commande après Claude, dans le répertoire courant.
- `--escalate` rejoue avec le tier suivant (`mechanical → implementation → debugging`) et inclut la sortie d'échec dans le prompt de retry.
- `src/runner.js` : parsing des flags, plan d'escalade, prompt de retry, orchestration injectable (`runClaude` / `runVerify`).
- `bin/cc-router.js` : wiring `spawnSync`, dry-run avec plan d'escalade, exit code de la vérification.
- Tests : 18 tests unitaires + 2 tests CLI avec un faux binaire Claude (aucun quota consommé). `npm test` = **36 tests**.
- Limites : pas de rollback ; le retry réutilise l'arbre de travail ; la commande de vérification est fournie par l'utilisateur ; pas encore mesuré sur un benchmark réel.

Pourquoi ça compte : c'est la réponse directe au seul échec qualité mesuré. Un `--verify` qui parse le YAML aurait renvoyé 1, et `--escalate` aurait laissé Opus corriger avec l'erreur sous les yeux. La prochaine étape est de mesurer le taux d'escalade et le coût réel (échec + retry) sur les 12 tâches.

## ⚠️ Limite connue (à documenter pour les users)

Claude Code ne permet pas encore à un hook de changer le modèle en cours de session (issues #44976, #43326, #27665). Donc :
- le hook **observe et recommande** ;
- `cc-router run` applique le modèle **au lancement** ;
- en interactif, l'alias natif `opusplan` couvre le plan → code.

## ⚠️ Critères de succès

- Zéro `/model` manuel pour les tâches routables.
- Réduction des **coûts/quota** mesurable (preuve avant/après) ; les tokens bruts peuvent augmenter.
- Qualité préservée (escalade intelligente).

## 🔜 Prochaines actions

- [x] Benchmark élargi (12 tâches × 2 répétitions, 48 runs) — voir `docs/BENCHMARK.md`.
- [x] Validation + escalade : `run --verify "<commande>"`, retry avec le modèle suivant si le check échoue.
- [ ] Mesurer l'escalade sur le benchmark (taux, coût échec + retry).
- [ ] Politique debugging plus fine : Sonnet d'abord, escalade Opus sur échec, ou sous-classifieur simple/profond.
- [ ] Élargir le benchmark à 20–30 tâches, 3 répétitions, revue aveugle.
- [ ] Mesurer le rework (temps perdu, runs échoués).
- [ ] Valider la session interactive (hook + statusline en TUI).
- [ ] Mettre à jour `docs/RESEARCH.md` avant Phase 2 (veille datée).
- [ ] Phase 2 — adaptateur OpenCode (routing par tour / plugin).
- [ ] Phase 3 — dashboard de stats (coût/quota économisé, escalade).
- [ ] Golden tests sur des prompts réels.
- [ ] Publication npm + README final.

## 📝 Suivi

- Journal tenu à jour à chaque phase / décision.
- Toute décision technique = entrée datée + justification.
