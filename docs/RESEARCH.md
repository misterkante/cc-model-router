# Veille — état de l'art

> Dernière vérification : 2026-10-24
> Règle : aucune phase de code ne démarre sans une note de veille datée.

## 1. Hiérarchie des sources

1. **Primaire** : documentation et release notes Anthropic (anthropic.com, docs).
2. **Code** : dépôts GitHub officiels (issues, PR, releases), CLI `claude --help`.
3. **Communauté** : Reddit, Hacker News, blogs — utiles pour l'usage réel, à recouper.

Un fait n'entre dans une décision que s'il est daté et sourcé. Les sources qui se contredisent sont listées dans « Incertitudes ».

## 2. Lineup Claude vérifiée (2026-10-24)

| Modèle | Prix input/output (par M tokens) | Rôle |
|---|---|---|
| Fable 5.1 | $10 / $50 | frontier, coding/reasoning lourd |
| Opus 5.5 | $4 / $20 | jugement, généraliste le plus fort |
| Sonnet 5.5 | $2 / $10 | workhorse, tâches bien cadrées |
| Haiku 5.5 | $0.10 / $0.50 (<100K input) | volume, subagents, classification |

- Sources : anthropic.com/claude-opus-5-5, anthropic.com/claude-sonnet-5-5, anthropic.com/claude-haiku-5-5, taskade.com/blog/claude-models-explained, felloai.com.
- Mythos 5.1 : réservé aux programmes de vérification, hors scope.

## 3. CLI Claude Code 2.1.309 — vérifié le 2026-10-24

- Alias de modèle acceptés (présents dans le binaire) : `fable`, `opus`, `sonnet`, `haiku`.
- `--effort <level>` : `low`, `medium`, `high`, `xhigh`, `max` (pas de `none`).
- `--fallback-model <model>` : accepte une liste séparée par virgules ; bascule si le modèle est surchargé ou indisponible.
- `--settings <file-or-json>` : charge des settings additionnels (hooks/statusLine) sans modifier `~/.claude/settings.json`.
- `--max-budget-usd <amount>` : plafond de dépense, uniquement avec `--print`.
- `claude "prompt"` démarre une session interactive ; `-p/--print` pour le non-interactif.

## 4. Écosystème routing

- Claude Code natif : alias `opusplan` (Opus en plan → Sonnet en exécution).
- Feature requests ouvertes : #44976, #43326, #27665 (auto routing par task type).
- Hook communautaire : `tzachbon/claude-model-router-hook` (tiers, config globale/projet, subagents).
- OpenCode : issue #8456 (auto model par task type), plugins `opencode-model-router`, `Auto (Jev)`.

## 5. Incertitudes / à revérifier

- Les prix et la lineup bougent vite : revérifier avant toute publication.
- Les résultats web se contredisent parfois (articles citant encore Opus 4.6 / Sonnet 4.6 / Haiku 4.5).
- `CLAUDE_CONFIG_DIR` : support non confirmé ; on utilise `--settings` + `CC_ROUTER_CONFIG_DIR`.
- Schéma exact du hook `UserPromptSubmit` (`additionalContext`) : à valider en session réelle (reporté).

## 6. Décision issue de la veille

- Router par **alias** (`haiku` / `sonnet` / `opus`) par défaut.
- Versions épinglables via `tiers.<tier>.model` en config.
- Aucun modèle codé en dur dans le code.
