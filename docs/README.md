# Documentation

[English](README.md) · [Français](README.fr.md)

Start with the [README](../README.md) for installation and usage.

| Document | What it covers |
|---|---|
| [`BENCHMARK.md`](BENCHMARK.md) | Reference 48-run results, per-tier analysis, incidents, pilots and limitations. |
| [`COMPETITION.md`](COMPETITION.md) | Dated competitive research, positioning, launch plan and risks. |
| [`RESEARCH.md`](RESEARCH.md) | Dated facts about the Claude Code model lineup, flags and related issues. |
| [`PLUGIN.md`](PLUGIN.md) | Claude Code plugin: install, per-turn routing, cache-aware switching, limits and verification. |
| [`benchmarks/`](benchmarks/) | Sanitized raw JSON for the published runs and pilots. |
| [`../bench/README.md`](../bench/README.md) | Canonical benchmark protocol: fixtures, checks, commands and publication rules. |
| [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) | Build log, decisions, test count and remaining work. |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Development, benchmark and commit conventions. |
| [`../SECURITY.md`](../SECURITY.md) | Threat model for verification commands and vulnerability reporting. |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Release history. |
| [`assets/`](assets/) | Social preview and benchmark charts used by the READMEs. |
| [`../scripts/make-benchmark-charts.py`](../scripts/make-benchmark-charts.py) | Regenerates the localized benchmark charts from the published JSON. |

## Reading the numbers

- The main metric is **cost per accepted task**, using Claude Code's
  API-equivalent `total_cost_usd` as a proxy for quota. It is not a
  subscription bill.
- The 48-run baseline is mixed: Sonnet/medium for mechanical and debugging,
  Opus/high for implementation. It is not an all-Opus comparison.
- The baseline does not load the hook; the routed variant does. The result
  measures the router as a product, not a pure model A/B.
- Raw token counts are secondary and can move in either direction. The claim is
  cost/quota saved at equal quality, never "tokens saved".
- The sample is 12 tasks × 2 repeats. It has no confidence intervals or blind
  review; do not generalize beyond it.

## Language versions

All root docs (`CHANGELOG`, `CODE_OF_CONDUCT`, `CONTRIBUTING`, `IMPLEMENTATION_PLAN`, `SECURITY`) also have a `.fr.md` version.

- English: [project README](../README.md), [docs index](README.md), [`BENCHMARK.md`](BENCHMARK.md), [`COMPETITION.md`](COMPETITION.md), [`RESEARCH.md`](RESEARCH.md), [`PLUGIN.md`](PLUGIN.md), [`../bench/README.md`](../bench/README.md).
- French: [project README](../README.fr.md), [docs index](README.fr.md), [`BENCHMARK.fr.md`](BENCHMARK.fr.md), [`COMPETITION.fr.md`](COMPETITION.fr.md), [`RESEARCH.fr.md`](RESEARCH.fr.md), [`PLUGIN.fr.md`](PLUGIN.fr.md), [`../bench/README.fr.md`](../bench/README.fr.md).
