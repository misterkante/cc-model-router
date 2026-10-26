# Changelog

[English](CHANGELOG.md) · [Français](CHANGELOG.fr.md)

Toutes les évolutions notables du projet sont documentées ici. Le format suit
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet utilise le
[versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Kit de lancement bilingue avec preuves, limites, brouillons Show HN, Reddit,
  X, article et LinkedIn.

## [0.2.0] - 2026-10-26

### Ajouté

- Plugin natif Claude Code (API Mods) qui classifie chaque prompt et applique le
  modèle et l’effort à chaque étape du tour.
- Routage par tour avec `routing.mode` : `per-turn`, `session` ou `off`.
- Changements compatibles avec le cache : escalade immédiate, délai et seuil de
  confiance pour les descentes, et `cacheAware: false` pour toujours suivre le
  classifieur.
- Commande `/ccmr` affichant le modèle courant, la dernière décision et la
  configuration de routage.
- Manifeste marketplace à la racine du dépôt et icône du plugin.
- Tests du plugin avec `claude plugin test` et test de parité classifieur CLI/plugin.
- Documentation bilingue du plugin.

### Modifié

- Le paquet npm inclut maintenant `plugin/` et `.claude-plugin/`.
- Le README documente le plugin comme intégration interactive recommandée ; le
  hook des settings reste disponible comme ancien chemin en observation seule.

### Corrigé

- Le plugin garde maintenant le modèle routé pour les continuations après un
  outil, au lieu de revenir au modèle de session à la seconde requête du tour.
- Le délai compatible avec le cache ne change plus de modèle un tour trop tôt.

## [0.1.1] - 2026-10-26

### Corrigé

- Les instructions d’installation du README indiquent maintenant que le package est publié sur npm.

### Modifié

- Badge npm et version `0.1.1`.

## [0.1.0] - 2026-10-26

### Ajouté

- Classifieur heuristique à trois tiers (`mechanical`, `implementation`,
  `debugging`) avec confiance, mots-clés détectés et scores par tier.
- Fusion de la config globale et projet (`~/.claude/model-router.json`,
  `.claude/model-router.json`), la config projet gagne.
- Wrapper `ccmr run` qui mappe un tier vers `--model`, `--effort` et
  `--fallback-model` ; les flags Claude Code supplémentaires passent après `--`.
- Commandes `ccmr classify`, `ccmr status` et `ccmr hook`.
- Intégration du hook Claude Code `UserPromptSubmit` et de la status line.
- Check de qualité opt-in `--verify "<commande>"` et échelle de retry
  `--escalate` (`mechanical → implementation → debugging`), avec la sortie
  d’échec injectée dans le prompt de retry.
- Politique opt-in `debuggingStrategy: "sonnet-first"` : essayer Sonnet sur les
  tâches de debugging, puis retenter avec Opus si `--verify` échoue.
- Harnais de benchmark isolé : 12 tâches synthétiques, 2 variantes,
  2 répétitions (48 runs), checks déterministes, comptabilité coût/tokens et JSON
  sanitisé.
- Résultats de référence publiés dans `docs/benchmarks/2026-10-26-expanded.json`.
- Pilote réel d’escalade et pilotes Sonnet-first dans `docs/benchmarks/`.
- Test TUI automatisé avec `tmux` (`npm run test:tui`).
- CI, templates d’issues, template de pull request, politique de sécurité et
  guide de contribution.

### Notes

- Première release publique. Nom du package `cc-model-router` ; commandes
  `cc-model-router` et `ccmr`. Publié sur npm en `cc-model-router@0.1.0`.
- Le benchmark compare le routeur comme produit à un baseline documenté ; ce
  n’est pas un A/B tout-Opus.
- Le quota d’abonnement est estimé avec le `total_cost_usd` API-équivalent de
  Claude Code, pas avec des dollars facturés.

[Non publié]: https://github.com/misterkante/cc-model-router/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/misterkante/cc-model-router/releases/tag/v0.2.0
[0.1.1]: https://github.com/misterkante/cc-model-router/releases/tag/v0.1.1
[0.1.0]: https://github.com/misterkante/cc-model-router/releases/tag/v0.1.0
