# Claude Code plugin

[English](PLUGIN.md) · [Français](PLUGIN.fr.md)

`cc-model-router` also ships as a Claude Code plugin. The plugin is a mod: it
reads each prompt, classifies it with the same classifier and config as the
CLI, and rewrites the model and effort for that turn. You run `claude` normally;
you do not type `ccmr run` and you do not start a second Claude process.

## Requirements

- Claude Code 2.1.287 or later. Tested on 2.1.309.
- A trusted workspace. Claude Code does not load mods in an untrusted
  directory or when hooks are disabled.

## Install

### From the marketplace

In a Claude Code session:

```text
/plugin marketplace add misterkante/cc-model-router
/plugin install cc-model-router@cc-model-router
```

The install command opens the plugin details so you can choose user, project or
local scope. If Claude Code asks for a reload, run `/reload-plugins`. Then run
`/ccmr` to see the current model and the last routing decision.

From a shell, without an interactive session:

```bash
claude plugin marketplace add misterkante/cc-model-router
claude plugin install cc-model-router@cc-model-router
```

### From a local clone

```bash
claude --plugin-dir /path/to/cc-model-router/plugin
```

This loads the plugin for one session and is the development path.

### From the npm package

Once npm `0.2.0` is published, its tarball contains the same `plugin/`
directory. Point Claude Code at it:

```bash
claude --plugin-dir "$(npm root -g)/cc-model-router/plugin"
```

## How it routes

| Hook | What it does |
|---|---|
| `prompt.submit` | Classifies the prompt with `src/classifier.js` semantics and the merged global/project config. |
| `turn.start` | Attaches the decision to the turn id. |
| `turn.step` | Rewrites `model` and `effort` on every request in the turn. Tool-call continuations keep the same model. Subagent requests are left alone. |
| `turn.complete` | Drops the turn state. |
| `/ccmr` | Prints the current model, the last decision, and the routing mode. |

The plugin and the CLI share the same config format and the same tier
mapping. The project config still wins over the global config.

## Configuration

The plugin reads the same files as the CLI:

- Global: `~/.claude/model-router.json`
- Project: `.claude/model-router.json` (wins over global)
- `CC_ROUTER_CONFIG_DIR` moves the global config location.

Add a `routing` object to control switching:

```json
{
  "routing": {
    "mode": "per-turn",
    "cacheAware": true,
    "minTurnsBetweenSwitches": 2,
    "minConfidence": 0.5
  }
}
```

| Mode | Behaviour |
|---|---|
| `per-turn` | Classify every prompt. This is the default. |
| `session` | Choose once on the first prompt and keep that model for the session. |
| `off` | Observe and classify, but never change the model. |

### Cache-aware switching

Switching models invalidates the prompt cache for that conversation. The
plugin therefore treats escalation and downgrade differently:

- Same model: the effort can change without a model switch.
- Escalation (for example Sonnet to Opus): applied immediately, because the
  quality reason is stronger than the cache cost.
- Downgrade (for example Opus to Sonnet or Haiku): applied only after
  `minTurnsBetweenSwitches` turns and when the classifier confidence is at
  least `minConfidence`.
- `cacheAware: false` always follows the classifier. It can cost more than it
  saves on a long conversation because every switch misses the cache.

The cache rule is a guardrail, not a measured result. The 48-run benchmark
measures one task per process, not this per-turn plugin. Do not present the
benchmark numbers as a plugin benchmark.

## Quality and escalation

The plugin only routes. It does not run `--verify` and does not retry a failed
task with a larger model. Use `ccmr run --verify "<command>" --escalate` when
the task needs a deterministic quality gate.

Debugging still goes to Opus by default. The opt-in Sonnet-first debugging
strategy requires `--verify` and `--escalate`, so the plugin does not apply it.
Claude Code's own automatic fallback still works; the plugin does not set a
per-turn fallback model.

Subagents are not routed by this version. They keep the session model.

## Verification

From the repository:

```bash
npm run plugin:validate
npm run plugin:test
```

The plugin test suite covers classification, project keywords, Haiku routing,
Opus escalation, the cache-aware cooldown, `off` and `session` modes, and the
second request of a tool-call turn.

A real smoke test with a budget cap:

```bash
claude --plugin-dir ./plugin --max-budget-usd 0.02 --output-format json \
  -p "fix typo: teh"
```

Observed on 2026-10-26: the run used only `claude-haiku-5-5`, cost
`$0.00069732`, and returned success. This is a smoke test, not a benchmark.

The marketplace flow was also tested with an isolated `CLAUDE_CONFIG_DIR`:
marketplace add and install succeeded, plugin `0.2.0` was enabled, and `/ccmr`
returned the current model and `mode=per-turn` with no model call.

## Security

- Mods are not sandboxed by Claude Code: they run with your permissions. This
  plugin only reads the router config files and the session cwd, and it makes no
  network requests.
- It has no telemetry.
- It can change the model and effort of a request. Read `plugin/hooks/register.js`
  and run `claude plugin validate plugin` before installing a copy you did not
  build.
