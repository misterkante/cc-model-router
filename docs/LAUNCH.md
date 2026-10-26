# Launch kit

[English](LAUNCH.md) · [Français](LAUNCH.fr.md)

> Status: draft, not published. Use the claims and caveats below as written.
> Do not add a token-savings claim, a plugin benchmark claim or a quality
> guarantee.

## One line

`cc-model-router` routes each Claude Code turn to Haiku, Sonnet or Opus, and
keeps a verified CLI path for work that needs a deterministic quality gate.

## What is new in 0.2.0

- A native Claude Code plugin built on the Mods API. It classifies each prompt
  and changes the model and effort per turn, without `ccmr run`.
- Cache-aware switching: escalation is immediate, downgrades wait for a cooldown
  and a confidence threshold.
- `/ccmr` shows the current model, the last decision and the routing config.
- The existing CLI keeps `--verify` and `--escalate` for quality-gated work.
- MIT, no proxy, no telemetry.

## Evidence to quote

Use these numbers exactly. They come from the 48-run benchmark, not from the
plugin.

| Claim | Number |
|---|---:|
| Accepted tasks | **23/24 (95.8%)** routed vs 21/24 (87.5%) baseline |
| Cost per accepted task | **$0.0906** vs $0.1375 |
| Change in cost per accepted | **-34.1%** |
| Total cost | $2.0838 vs $2.8874 (-27.8%) |
| Raw tokens | -5.2% overall |
| Mechanical tier | -94.2% per accepted |
| Implementation tier | -53.2% per accepted, 7/8 vs 8/8 |
| Debugging tier | +29.7% per accepted, but 8/8 vs 5/8 |

Plugin checks:

- 54/54 repository tests pass.
- 7/7 plugin tests pass.
- `claude plugin validate` passes for the plugin and the marketplace.
- Real smoke test: only `claude-haiku-5-5`, cost `$0.00069732`.
- Marketplace install tested in an isolated `CLAUDE_CONFIG_DIR`.

## Caveats to repeat

- The 48-run baseline is mixed: Sonnet/medium for mechanical and debugging,
  Opus/high for implementation. The routed variant loads the hook; the baseline
  does not. It is a product comparison, not a pure model A/B.
- The sample is 12 tasks x 2 repeats. No confidence interval, no blind review.
- Debugging is a quality guard, not a saving. Opus passes more, and costs more.
- The plugin is not benchmarked. Its cache-aware rule is a guardrail, not a
  measured result.
- `total_cost_usd` is an API-equivalent proxy for quota, not a subscription bill.
- The plugin does not run `--verify` and does not escalate. The CLI does.
- npm still serves 0.1.1. The plugin installs from the GitHub marketplace now;
  npm 0.2.0 is pending.

## Show HN

Title:

```text
Show HN: Native Claude Code plugin that routes each turn to Haiku/Sonnet/Opus
```

Body:

```text
I built cc-model-router because I kept paying for Opus on work that did not need
it: git commits, renames, lint fixes, then a real debugging task.

The project has two paths.

1. A native Claude Code plugin. It classifies each prompt and changes the model
   and effort for that turn. It is cache-aware: escalation is immediate, but a
   downgrade waits for a cooldown and a confidence threshold. /ccmr shows the
   current model and the last decision.

2. A CLI. ccmr run picks one model at launch. With --verify it runs a command
   you provide, and with --escalate it retries on the next tier and includes the
   failure output.

The evidence I trust most is a 48-run benchmark (12 synthetic tasks x 2 variants
x 2 repeats) with deterministic checks. Routed: 23/24 accepted at $0.0906 per
accepted task. Baseline: 21/24 at $0.1375. That is -34.1% cost per accepted task.
Mechanical work is -94.2%; implementation is -53.2%. Debugging is a guard:
Opus passes 8/8 vs 5/8 for Sonnet, but costs +29.7% per accepted task.

Caveats: the baseline is mixed, the routed variant loads the hook, the sample is
small, and the plugin is not benchmarked. The CLI benchmark is not a per-turn
plugin result.

MIT, no proxy, no telemetry. Feedback on the routing rules and the benchmark
would be useful.

https://github.com/misterkante/cc-model-router
```

## Reddit

Suggested subreddits: r/ClaudeAI, r/ClaudeCode. Read each community's rules before
posting; do not post the same text to several subreddits on the same day.

Title:

```text
I built a native Claude Code plugin that routes each turn to Haiku/Sonnet/Opus
```

Body:

```text
I wanted automatic model routing without launching every task through a wrapper,
so I built a Claude Code plugin on the Mods API.

How it works: the plugin classifies each prompt, then sets the model and effort
for every step of that turn. Tool-call continuations keep the routed model.
Subagents are not routed in this version.

The cache problem is real. Switching models invalidates the prompt cache, so the
plugin escalates immediately but delays downgrades with a cooldown and a
confidence threshold. That rule is a guardrail, not a measured benchmark.

There is also a CLI for quality-gated work: ccmr run --verify "npm test"
--escalate. The check decides whether the run is accepted; a failure retries on
the next tier with the error in the prompt.

Benchmark: 48 runs, 12 synthetic tasks x 2 variants x 2 repeats. Routed 23/24
accepted at $0.0906 per accepted task; baseline 21/24 at $0.1375. -34.1% cost
per accepted task. Mechanical -94.2%, implementation -53.2%. Debugging is +29.7%
per accepted but 8/8 vs 5/8, so it is a quality guard.

The baseline is mixed, the sample is small, and the plugin itself is not
benchmarked. I am sharing the numbers with those limits.

Repo: https://github.com/misterkante/cc-model-router
```

## X / Twitter thread

1.

```text
Claude Code users: you probably pay for Opus on work that does not need it.

I built cc-model-router: a native plugin that routes each turn to Haiku, Sonnet
or Opus, plus a CLI with --verify and --escalate.

MIT. No proxy. No telemetry.

https://github.com/misterkante/cc-model-router
```

2.

```text
The plugin uses the Claude Code Mods API.

It classifies the prompt, then sets the model and effort for every step of the
turn. Tool-call continuations keep the routed model.

/ccmr shows the current model and the last decision.
```

3.

```text
The hard part is the prompt cache.

Switching models invalidates it. So the plugin escalates immediately, but delays
downgrades with a cooldown and a confidence threshold.

That is a guardrail, not a benchmark result.
```

4.

```text
The CLI is for quality-gated work:

ccmr run "task" --verify "npm test" --escalate

A deterministic check decides whether the run is accepted. On failure, the next
tier retries with the error output.
```

5.

```text
48-run benchmark, 12 tasks x 2 variants x 2 repeats:

- 23/24 accepted vs 21/24
- $0.0906 vs $0.1375 per accepted task
- -34.1% cost per accepted
- mechanical -94.2%
- implementation -53.2%
- debugging +29.7%, but 8/8 vs 5/8
```

6.

```text
Caveats: mixed baseline, small sample, the routed variant loads the hook, and
the plugin is not benchmarked. Debugging is a quality guard, not a saving.

Feedback on the routing rules and the benchmark is welcome.
```

## dev.to / Hashnode article

Title:

```text
I built a native Claude Code model router, and measured it on 48 runs
```

Outline:

1. **The problem**: one model for every task, including mechanical work.
2. **The design**: three tiers, global and project config, CLI and plugin.
3. **Why a plugin**: settings hooks can observe but cannot change the model. The
   Mods API can rewrite a request. Show the `prompt.submit` and `turn.step`
   split.
4. **The cache trap**: per-model prompt cache, why per-turn routing can cost
   more, and the escalation/downgrade rule.
5. **The benchmark**: 12 tasks, 2 variants, 2 repeats, deterministic checks.
   Include the table and the mixed-baseline caveat.
6. **What failed**: Sonnet produced invalid YAML on `impl-angular`; Opus was
   oversized on simple bugs. This led to `--verify` / `--escalate` and the
   Sonnet-first option.
7. **The plugin**: install, `/ccmr`, routing modes, limits.
8. **What is next**: bigger benchmark, OpenCode, stats dashboard.

Canonical links: [`BENCHMARK.md`](BENCHMARK.md), [`PLUGIN.md`](PLUGIN.md),
[`COMPETITION.md`](COMPETITION.md).

## LinkedIn

```text
I open-sourced cc-model-router, a native Claude Code plugin and CLI that routes
each task to Haiku, Sonnet or Opus.

The plugin classifies each prompt and changes the model per turn. The CLI adds a
quality gate: ccmr run --verify "npm test" --escalate.

On a 48-run benchmark with deterministic checks, routed tasks were accepted
23/24 vs 21/24, at $0.0906 vs $0.1375 per accepted task (-34.1%). Mechanical work
was -94.2%; implementation -53.2%. Debugging costs +29.7% but passes 8/8 vs 5/8,
so it is a quality guard, not a saving.

The caveats matter: mixed baseline, small sample, and the plugin itself is not
benchmarked. The benchmark is the CLI path.

MIT, no proxy, no telemetry.
https://github.com/misterkante/cc-model-router
```

## Demo script

Record this in a terminal at 100x30 or larger. Do not show a real project or a
real API key.

```bash
ccmr classify "lint the changed files"
ccmr classify "implement the auth endpoint"
ccmr classify "debug why the login test is flaky"
ccmr status
```

Then, in Claude Code:

```text
/plugin marketplace add misterkante/cc-model-router
/plugin install cc-model-router@cc-model-router
/ccmr
```

Optional, if quota allows: one tiny routed prompt, then `/ccmr` again.

## Launch checklist

- [ ] Publish npm `0.2.0` with a valid credential.
- [ ] Run one real task on a real project with the plugin.
- [ ] Record the demo GIF from the script above.
- [ ] Pin the repository and upload `docs/assets/social-preview.png` (web UI).
- [ ] Revoke the exposed npm token (web UI).
- [ ] Publish the dev.to or Hashnode article.
- [ ] Post Show HN on a weekday morning, US Eastern.
- [ ] Post Reddit after reading the subreddit rules.
- [ ] Post the X thread and LinkedIn.
- [ ] Reply to every technical comment with the caveats, not the headline alone.
- [ ] Track 100 stars, 500 downloads and 5 useful feedback items in 30 days.

## Do not say

- "Saves tokens" as the main claim. Raw tokens fell 5.2%, but mechanical tokens
  per accepted task rose 5.5%.
- "Same quality" without the debugging caveat.
- "Benchmarked plugin". The 48 runs measure the CLI.
- "Guaranteed savings". The cache and task mix can change the result.
