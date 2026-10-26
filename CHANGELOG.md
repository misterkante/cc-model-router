# Changelog

[English](CHANGELOG.md) · [Français](CHANGELOG.fr.md)

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Bilingual launch kit with claims, caveats, Show HN, Reddit, X, article and
  LinkedIn drafts.

## [0.2.0] - 2026-10-26

### Added

- Native Claude Code plugin (Mods API) that classifies each prompt and applies
  the model and effort to every step of the turn.
- Per-turn routing with `routing.mode`: `per-turn`, `session` or `off`.
- Cache-aware switching: immediate escalation, cooldown and confidence gate for
  downgrades, and `cacheAware: false` to always follow the classifier.
- `/ccmr` command showing the current model, the last decision and the routing
  configuration.
- Marketplace manifest at the repository root and a plugin icon.
- Plugin tests with `claude plugin test` and a CLI/plugin classifier parity test.
- Bilingual plugin documentation.

### Changed

- npm package now includes `plugin/` and `.claude-plugin/`.
- README documents the plugin as the recommended interactive integration; the
  settings hook remains available as the observe-only legacy path.

### Fixed

- The plugin now keeps the routed model for tool-call continuations instead of
  falling back to the session model on the second request of a turn.
- The cache-aware cooldown no longer switches one turn too early.

## [0.1.1] - 2026-10-26

### Fixed

- README install instructions now state that the package is published on npm.

### Changed

- npm package badge and version `0.1.1`.

## [0.1.0] - 2026-10-26

### Added

- Heuristic three-tier classifier (`mechanical`, `implementation`, `debugging`)
  with confidence, matched keywords and per-tier scores.
- Global and project config merge (`~/.claude/model-router.json`,
  `.claude/model-router.json`), project config wins.
- `ccmr run` wrapper that maps a tier to `--model`, `--effort` and
  `--fallback-model`; extra Claude Code flags go after `--`.
- `ccmr classify`, `ccmr status` and `ccmr hook` commands.
- Claude Code `UserPromptSubmit` hook and status line integration.
- Opt-in `--verify "<command>"` quality gate and `--escalate` retry ladder
  (`mechanical → implementation → debugging`), including failure output in the
  retry prompt.
- Opt-in `debuggingStrategy: "sonnet-first"` policy: try Sonnet on debugging
  tasks first, retry with Opus when `--verify` fails.
- Isolated benchmark harness: 12 synthetic tasks, 2 variants, 2 repeats
  (48 runs), deterministic checks, cost/token accounting and sanitized JSON.
- Published reference results in `docs/benchmarks/2026-10-26-expanded.json`.
- Real escalation pilot and Sonnet-first pilots in `docs/benchmarks/`.
- Automated TUI smoke test with `tmux` (`npm run test:tui`).
- CI, issue templates, pull-request template, security policy and contributing
  guide.

### Notes

- First public release. Package name `cc-model-router`; commands
  `cc-model-router` and `ccmr`. Published on npm as `cc-model-router@0.1.0`.
- The benchmark compares the router as a product against a documented baseline;
  it is not an all-Opus A/B test.
- Subscription quota is estimated with Claude Code's API-equivalent
  `total_cost_usd`, not billed subscription dollars.

[Unreleased]: https://github.com/misterkante/cc-model-router/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/misterkante/cc-model-router/releases/tag/v0.2.0
[0.1.1]: https://github.com/misterkante/cc-model-router/releases/tag/v0.1.1
[0.1.0]: https://github.com/misterkante/cc-model-router/releases/tag/v0.1.0
