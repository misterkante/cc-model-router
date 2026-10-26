# Veille — état de l'art

[English](RESEARCH.md) · [Français](RESEARCH.fr.md)

> Dernière vérification lineup/CLI : 2026-10-24
> Veille concurrence : 2026-10-26 (voir [`COMPETITION.fr.md`](COMPETITION.fr.md))
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

- Claude Code natif : alias `opusplan` (Opus en plan → Sonnet en exécution), `/model`, `model:` par sous-agent. Pas de routage automatique par type de tâche ni de switch mid-session.
- Feature requests : #27665 (ouverte, 93,8 % des tokens Max sur Opus), #44976 (fermée doublon de #15721), #15721 (fermée comme couverte par `opusplan`).
- Hook communautaire le plus proche : `tzachbon/claude-model-router-hook` (5 classes + abstain, config globale/projet, sous-agents, warn/autoswitch, 105 ★ au 2026-10-26 ; pas de benchmark de qualité publié).
- Routeur Python/API : `edagher92-coder/claude-model-router` (tiers, fallback/escalade, `claude -p` pour l'abonnement ; 0 ★).
- Gateways multi-provider : `musistudio/claude-code-router` (37,8k ★), `weave-os/router` (5,6k ★), LiteLLM Auto Router, RouteLLM, ClaudeRipple.
- Détail, chiffres, liens et positionnement : [`COMPETITION.fr.md`](COMPETITION.fr.md) (veille du 2026-10-26).
- OpenCode : issue #8456 (auto model par task type), plugins `opencode-model-router`, `Auto (Jev)`.

## 4b. Plugins Claude Code et API Mods (2026-10-26)

- Les mods sont des plugins dont les hooks JavaScript tournent dans Claude Code.
  Ils exigent Claude Code 2.1.287 ou plus récent dans le terminal. La version
  locale est 2.1.309.
- Un mod peut réécrire un prompt ou une requête, y compris le modèle envoyé au
  provider. Il n’est pas sandboxé : il tourne avec les permissions de
  l’utilisateur et peut lire des fichiers, lancer des processus et faire des
  requêtes réseau. L’utilisateur doit lire `claude plugin validate <chemin>`
  avant d’installer.
- Un marketplace est un fichier `.claude-plugin/marketplace.json` à la racine du
  dépôt. Une source de plugin relative se résout depuis cette racine, donc
  `./plugin` est le dossier du plugin dans ce dépôt.
- Flux d’installation : `/plugin marketplace add <owner/repo>`, puis
  `/plugin install <plugin>@<marketplace>` et choisir un scope. Depuis un shell :
  `claude plugin install <plugin>@<marketplace>`.
- `--plugin-dir <chemin>` charge un plugin pour une session et sert au
  développement. Les plugins déjà installés se chargent aussi en `claude -p` ;
  `/plugin` n’est pas disponible en mode non interactif.
- Sources : code.claude.com/docs/en/plugins/mods/overview,
  code.claude.com/docs/en/plugins/install,
  code.claude.com/docs/en/plugins/marketplace-reference (consultées le 2026-10-26).

## 5. Incertitudes / à revérifier

- Les prix et la lineup bougent vite : revérifier avant toute publication.
- Les résultats web se contredisent parfois (articles citant encore Opus 4.6 / Sonnet 4.6 / Haiku 4.5).
- `CLAUDE_CONFIG_DIR` : support non confirmé ; on utilise `--settings` + `CC_ROUTER_CONFIG_DIR`.
- L’API Mods est récente (2.1.287). Les noms d’événements et les signatures
  peuvent changer ; le plugin est testé sur 2.1.309 et la version est documentée
  dans le README.
- Schéma exact du hook `UserPromptSubmit` (`additionalContext`) : validé en
  session réelle le 2026-10-25 ; le plugin utilise l’API Mods séparée.

## 6. Décision issue de la veille

- Router par **alias** (`haiku` / `sonnet` / `opus`) par défaut.
- Versions épinglables via `tiers.<tier>.model` en config.
- Aucun modèle codé en dur dans le code.
