# Plan d'implémentation — Auto Model Router

[English](IMPLEMENTATION_PLAN.md) · [Français](IMPLEMENTATION_PLAN.fr.md)

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
2. Noter les faits **datés et sourcés** dans `docs/RESEARCH.fr.md`.
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
7. Veille web datée obligatoire avant chaque phase de code, consignée dans `docs/RESEARCH.fr.md`.

## 📋 Phases

- [x] Phase 0 — Veille & découverte : ✅ terminée (voir `docs/RESEARCH.fr.md`)
- [x] Phase 1 — MVP Claude Code : hook + config + routing + override + status ✅
- [ ] Phase 2 — OpenCode : routing / plugin équivalent
- [ ] Phase 3 — Mesure & stats : coût/quota économisé, coûts, escalade qualité

## 📦 Livrables Phase 1 (2026-10-24)

| Fichier | Rôle |
|---|---|
| `src/classifier.js` | Classifieur heuristique (3 tiers, scoring, confidence) |
| `src/config.js` | Merge config globale + projet |
| `bin/cc-model-router.js` | CLI : `classify`, `run`, `status`, `hook` |
| `src/hook.js` | Hook `UserPromptSubmit` (log + contexte) |
| `hooks/user-prompt-submit.js` | Entrée hook pour Claude Code |
| `bin/statusline.js` | Status line : modèle courant + mapping des tiers |
| `tests/classifier.test.js` | 16 tests (routing, fallback, config, isolation) |
| `examples/model-router.json` | Config d'exemple |
| `docs/RESEARCH.fr.md` | Veille datée : lineup, écosystème, incertitudes |

## 🧪 Preuves Phase 1

- `node --test tests/*.test.js` → **53/53 tests passent**
- `npm run docs:check` → tous les liens Markdown relatifs et les paires bilingues résolvent
- `ccmr classify "debug why the login test is flaky"` → `debugging` / `opus` / confidence 1
- `ccmr run` (dry-run) → `claude --model sonnet "implement the auth endpoint"`
- Hook `UserPromptSubmit` → log dans `.sandbox/config/router.log` (isolation) + `additionalContext` correct
- `./scripts/sandbox.sh` → smoke test complet sans toucher `~/.claude`
- [x] Validation en session réelle Claude Code (headless `-p`) : ✅ 2026-10-25 (voir résultats ci-dessous)
- [x] Validation en session interactive (hook + statusline en TUI) : `npm run test:tui` (tmux, 2026-10-26)

## 🔧 Correctifs d'alignement Claude Code (2026-10-24)

Vérifiés sur le CLI 2.1.309 (`claude --help` + inspection du binaire) :
- `effort: "none"` était invalide → `"low"` (valeurs : low/medium/high/xhigh/max).
- `ccmr run` applique désormais `--effort` et `--fallback-model`.
- Fallbacks par tier : mechanical → sonnet ; implementation → haiku ; debugging → sonnet,haiku.
- Passthrough d'arguments Claude via `-- <args>` (ex: `-- -p`).
- Alias `haiku` / `sonnet` / `opus` / `fable` confirmés.

## 🧪 Test réel devquiz (2026-10-25)

Contexte : copie de devquiz dans `$TMPDIR/devquiz-router-test`, CLI Claude Code 2.1.309, `-p --output-format json`, plafond 0,30 $/run, hook via `--settings`.

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
Détail : `docs/BENCHMARK.fr.md` ; process canonique : `bench/README.fr.md` ; vérification : `npm run bench:verify` ; données : `docs/benchmarks/2026-10-26-expanded.json`.

| Variante | Acceptés | Coût total | Coût / accepté | Tokens |
|---|---|---|---|---|
| routed | 23/24 (95,8 %) | 2,0838 $ | **0,0906 $** | 2 147 568 |
| baseline | 21/24 (87,5 %) | 2,8874 $ | 0,1375 $ | 2 266 530 |

- Coût par tâche acceptée : **-34,1 %** ; coût total : -27,8 %.
- Tokens bruts : -5,2 % au total ; -13,5 % par tâche acceptée → l'économie reste en **coût/quota**, pas en volume.
- Mechanical : Haiku -94,2 %, 8/8 vs 8/8.
- Implementation : Sonnet -53,2 %, 7/8 vs 8/8 ; un YAML invalide sur `impl-angular` (vrai échec Sonnet, rattrapable par validation).
- Debugging : Opus 8/8 vs Sonnet 5/8, mais +29,7 % par tâche acceptée ; Opus nécessaire sur `debug-calc`/`debug-search`, surdimensionné sur `debug-parse`/`debug-state`.
- Aucun fichier hors périmètre modifié.
- Incident : `impl-angular` routé repeat 2 du premier run = commande Bash bloquée (artefact harness) ; fixture corrigée (`parcours/.gitkeep`), tâche rejouée et fusionnée. L'échec final est le YAML invalide, pas l'artefact.
- Limite : 12 tâches, 2 répétitions, checks binaires, pas de revue aveugle ; pas encore une preuve statistique.

Le pilote initial (5 tâches, 1 run) avait donné -53,6 % de coût par tâche acceptée et +37,6 % de tokens. Le run élargi corrige deux conclusions : le debugging n'est pas uniformément justifié, et Sonnet peut échouer sur la syntaxe. Le chiffre global baisse (-34,1 %) parce qu'il est plus honnête, pas parce que le routing est moins bon.

## ✅ Validation + escalade (2026-10-26)

Problème mesuré : sur 48 runs, Sonnet a produit un YAML invalide sur `impl-angular` (1/8 échec implementation) ; le baseline Opus était 8/8. Le routeur doit pouvoir **vérifier puis escalader**, pas seulement choisir un modèle au lancement.

Implémentation :

- `ccmr run "<task>" --verify "<commande>"` exécute la commande après Claude, dans le répertoire courant.
- `--escalate` rejoue avec le tier suivant (`mechanical → implementation → debugging`) et inclut la sortie d'échec dans le prompt de retry.
- `src/runner.js` : parsing des flags, plan d'escalade, prompt de retry, orchestration injectable (`runClaude` / `runVerify`).
- `bin/cc-model-router.js` : wiring `spawnSync`, dry-run avec plan d'escalade, exit code de la vérification.
- Tests : 24 tests runner + 18 tests classifier/config + 3 tests CLI (faux binaire Claude, zéro quota) + 7 tests d'intégration hook/statusline + 1 test `check-one`. `npm test` = **53 tests**.
- Limites : pas de rollback ; le retry réutilise l'arbre de travail ; la commande de vérification est fournie par l'utilisateur ; simulation + pilote réel 4/4 sur `debug-calc` + `debug-search` ; un second pilote sans hook a exercé l'escalade réelle (voir ci-dessous).
- Hook + statusline validés avec des payloads réels (config globale + override projet) ; le rendu TUI est vérifié automatiquement par `npm run test:tui` (tmux, statusline + hook réels, settings réels inchangés).

Pourquoi ça compte : c'est la réponse directe au seul échec qualité mesuré. Un `--verify` qui parse le YAML aurait renvoyé 1, et `--escalate` aurait laissé Opus corriger avec l'erreur sous les yeux. La simulation Sonnet-first, le pilote réel 4/4 et le pilote d'escalade ci-dessous donnent une première estimation ; le taux d'escalade reste à mesurer.

## 🧪 Debugging Sonnet-first (opt-in, 2026-10-26)

- `debuggingStrategy: "sonnet-first"` : premier essai Sonnet/medium (configurable via `debuggingFirst`), retry Opus/high sur échec de `--verify`.
- Ne s'applique que si `--verify` **et** `--escalate` sont fournis ; sinon le debugging reste Opus. Le défaut `"opus"` est inchangé.
- Simulation sur les 16 enregistrements debugging : **8/8 acceptés**, 1,1191 $ vs 1,3247 $ Opus direct (**-15,5 % par tâche acceptée**), 3/8 retries. `bench/simulate-escalation.mjs` (aucun appel modèle).
- Pilote réel (4 runs, `debug-calc` + `debug-search`) : Sonnet **4/4**, 0,0770 $ / 0,0812 $ / 0,0827 $ / 0,0784 $, checks OK, **pas d'escalade** ; ~-49 % sur `debug-calc`, ~-46 % sur `debug-search` vs Opus routé. Le baseline Sonnet du benchmark était **1/4** sur ces deux tâches **sans hook** → confondant hook/stochasticité.
- Pilote réel d'escalade (1 run, `debug-calc`, **sans hook**) : Sonnet échoue `test_average_empty` (`ZeroDivisionError`), Opus reçoit la sortie et réussit. Coût **0,2132 $** (0,0707 $ + 0,1425 $) vs **0,1559 $** Opus direct, soit **+36,7 %** ; seul `calc.py` change. Un échec réel, pas un taux : il valide le mécanisme et montre qu'un premier essai raté peut coûter plus cher.
- Implémentation : `src/config.js` (merge), `src/runner.js` (`initialDecision`, `escalationPlanFor`), CLI dry-run/status, statusline `D:sonnet→opus`, note dans le hook.
- Tests : 11 nouveaux tests (runner, config, CLI, hook/statusline) + 1 test `bench/check-one.mjs` ; `npm test` = **53 tests**.
- Limites : simulation + deux petits pilotes ; le taux d'escalade et le coût moyen restent à mesurer ; le retry réutilise l'arbre échoué ; nécessite un check fiable.

## 🔎 Veille concurrence et lancement (2026-10-26)

- [`docs/COMPETITION.fr.md`](docs/COMPETITION.fr.md) : demande (issues #27665 et #44976), ce que fait le natif (`opusplan`, cache), concurrents directs et indirects (tzachbon 105 ★, edagher 0 ★, CCR 37,8k ★, Weave 5,6k ★, LiteLLM, RouteLLM, ClaudeRipple).
- Créneau : **natif Claude Code + tiers par tâche + benchmark 48 runs + vérification/escalade**. Pas de proxy, pas de clé API, MIT.
- Verdict : **Go OSS/portfolio ; No-Go comme entreprise seule** sans équipe, dashboard, support et couche commerciale.
- Lancement : le benchmark est la preuve ; Show HN + Reddit + article. Claims mesurés, baseline mixte explicite, échantillon petit assumé.
- Prochaine action : publication GitHub/npm, GIF, article ; élargir le benchmark avant les gros claims.

## ⚠️ Limite connue (à documenter pour les users)

Claude Code ne permet pas encore à un hook de changer le modèle en cours de session (issues #44976, #43326, #27665). Donc :
- le hook **observe et recommande** ;
- `ccmr run` applique le modèle **au lancement** ;
- en interactif, l'alias natif `opusplan` couvre le plan → code.

## ⚠️ Critères de succès

- Zéro `/model` manuel pour les tâches routables.
- Réduction des **coûts/quota** mesurable (preuve avant/après) ; les tokens bruts peuvent augmenter.
- Qualité préservée (escalade intelligente).

## 🔜 Prochaines actions

- [x] Benchmark élargi (12 tâches × 2 répétitions, 48 runs) — voir `docs/BENCHMARK.fr.md`.
- [x] Validation + escalade : `run --verify "<commande>"`, retry avec le modèle suivant si le check échoue.
- [x] Provoquer une escalade réelle : `debug-calc` sans hook, Sonnet échoue, Opus réussit ; 0,2132 $ vs 0,1559 $ Opus direct (+36,7 %).
- [ ] Mesurer le taux d'escalade et le coût moyen sur plusieurs runs/tâches — simulation -15,5 % ; un échec réel observé.
- [x] Politique debugging plus fine : Sonnet-first opt-in + escalade Opus sur échec (`debuggingStrategy`).
- [ ] Élargir le benchmark à 20–30 tâches, 3 répétitions, revue aveugle.
- [ ] Mesurer le rework (temps perdu, runs échoués).
- [x] Hook + statusline validés hors TUI (payloads réels, config projet).
- [x] Rendu TUI automatisé (`scripts/tui-smoke.sh`, tmux) : statusline + hook réels, `~/.claude` et repo inchangés.
- [ ] Mettre à jour `docs/RESEARCH.fr.md` avant Phase 2 (veille datée).
- [x] Veille concurrence + positionnement + plan de lancement (`docs/COMPETITION.fr.md`).
- [x] Préparation lancement (code) : `LICENSE`, `SECURITY.md`, CI, templates d'issues/PR, `scripts/demo.sh`, `package.json` (`files`, `prepublishOnly`) ; nom npm `cc-model-router` disponible.
- [x] Nom du binaire : package `cc-model-router`, binaires `cc-model-router` + alias `ccmr` (évite la collision avec `cc-router@4.0.0`).
- [x] Dépôt GitHub public créé et poussé, description, homepage, 12 topics, issues/projects/discussions, CI verte.
- [x] Clone propre depuis GitHub : `npm test` 53/53, `bench:verify` 12/12 checks rouges avant, simulation d'escalade OK (aucun run modèle).
- [ ] Publication npm (tarball validé, pas encore publié).
- [ ] Épinglage du dépôt et social preview : web-only, aucune API GitHub publique.
- [ ] GIF de démo et article de lancement (les graphiques localisés sont prêts).
- [ ] Phase 2 — adaptateur OpenCode (routing par tour / plugin).
- [ ] Phase 3 — dashboard de stats (coût/quota économisé, escalade).
- [ ] Golden tests sur des prompts réels.
- [ ] Publication npm réelle (le README et les métadonnées sont prêts).

## 📝 Suivi

- Journal tenu à jour à chaque phase / décision.
- Toute décision technique = entrée datée + justification.
