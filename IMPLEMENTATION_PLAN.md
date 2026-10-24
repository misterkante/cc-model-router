# Plan d'implémentation — Auto Model Router

> Dernière mise à jour : 2026-10-24
> Statut : Phase 1 terminée (MVP Claude Code)

## 🎯 Vision

Éliminer le `/model` manuel : router automatiquement Claude Code (puis OpenCode) vers le modèle adapté à la complexité de la tâche (Haiku / Sonnet / Opus), pour réduire la consommation de tokens et d'credits tout en préservant la qualité.

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
   - mechanical → Haiku (effort : none)
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
| `tests/classifier.test.js` | 15 tests (routing, fallback, config, isolation) |
| `examples/model-router.json` | Config d'exemple |
| `docs/RESEARCH.md` | Veille datée : lineup, écosystème, incertitudes |

## 🧪 Preuves Phase 1

- `node --test tests/*.test.js` → **15/15 tests passent**
- `cc-router classify "debug why the login test is flaky"` → `debugging` / `opus` / confidence 1
- `cc-router run` (dry-run) → `claude --model sonnet "implement the auth endpoint"`
- Hook `UserPromptSubmit` → log dans `.sandbox/config/router.log` (isolation) + `additionalContext` correct
- `./scripts/sandbox.sh` → smoke test complet sans toucher `~/.claude`
- [ ] Validation en session réelle Claude Code : **reportée** (budget crédits — à faire après les livraisons du week-end)

## ⚠️ Limite connue (à documenter pour les users)

Claude Code ne permet pas encore à un hook de changer le modèle en cours de session (issues #44976, #43326, #27665). Donc :
- le hook **observe et recommande** ;
- `cc-router run` applique le modèle **au lancement** ;
- en interactif, l'alias natif `opusplan` couvre le plan → code.

## ⚠️ Critères de succès

- Zéro `/model` manuel pour les tâches routables.
- Réduction des tokens/couts **mesurable** (preuve avant/après).
- Qualité préservée (escalade intelligente).

## 🔜 Prochaines actions

- [ ] Mettre à jour `docs/RESEARCH.md` avant Phase 2 (veille datée).
- [ ] Phase 2 — adaptateur OpenCode (routing par tour / plugin).
- [ ] Phase 3 — dashboard de stats (tokens économisés, escalade).
- [ ] Golden tests sur des prompts réels.
- [ ] Publication npm + README final.

## 📝 Suivi

- Journal tenu à jour à chaque phase / décision.
- Toute décision technique = entrée datée + justification.
