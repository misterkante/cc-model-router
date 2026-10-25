# cc-model-router

> Automatic model routing for Claude Code — classify each task, pick the cheapest model that can do it, never type `/model` again.

**Status: MVP (0.1.0).** Claude Code first; OpenCode support is on the roadmap.

## Why

In 2026 every dev runs Claude Code, and token spend is the common bottleneck. Most sessions stay on Opus even for `git commit`, renames or lint runs. This router maps three task tiers to three models and keeps the expensive model for the work that needs it.

| Tier | Model | Typical tasks |
|---|---|---|
| `mechanical` | haiku | git ops, renames, formatting, lint, lookups |
| `implementation` | sonnet | features, edits, tests, refactors |
| `debugging` | opus | bugs, regressions, flaky tests, deep analysis |

## Quick start

```bash
node bin/cc-router.js classify "debug why the login test is flaky"
```

Output:

```json
{
  "tier": "debugging",
  "model": "opus",
  "effort": "high",
  "confidence": 1,
  "matched": ["debug", "flaky"],
  "scores": { "mechanical": 0, "implementation": 0, "debugging": 6 }
}
```

Run Claude Code with the routed model:

```bash
node bin/cc-router.js run "implement the auth endpoint"
# equivalent to: claude --model sonnet --effort medium --fallback-model haiku "implement the auth endpoint"
```

Pass extra Claude Code flags after `--`:

```bash
node bin/cc-router.js run "implement the auth endpoint" -- -p
```

Dry run (show the command without executing it):

```bash
CC_ROUTER_DRY_RUN=1 node bin/cc-router.js run "lint the files"
```

Show the effective routing table:

```bash
node bin/cc-router.js status
```

## Configuration

- Global: `~/.claude/model-router.json`
- Project: `.claude/model-router.json` (wins over global)

```json
{
  "defaultTier": "implementation",
  "tiers": {
    "mechanical": { "model": "haiku", "effort": "low" },
    "implementation": { "model": "sonnet", "effort": "medium" },
    "debugging": { "model": "opus", "effort": "high" }
  },
  "extraKeywords": {
    "mechanical": ["bump deps"],
    "debugging": ["segfault"]
  }
}
```

See `examples/model-router.json` for a ready-to-copy file.

## Claude Code integration

Add the hook and status line to your Claude Code settings:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/cc-model-router/hooks/user-prompt-submit.js"
          }
        ]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "node /absolute/path/to/cc-model-router/bin/statusline.js"
  }
}
```

The hook logs every classification to `~/.claude/router.log` and adds the recommended tier/model as additional context.

## Isolated testing (without touching your real `~/.claude`)

Two safety mechanisms:

- `CC_ROUTER_CONFIG_DIR` moves the router's global config and log to a sandbox directory.
- `claude --settings <file>` loads the hook and status line for one Claude Code session only.

Smoke test (dry run, real config untouched):

```bash
./scripts/sandbox.sh
```

Launch a sandboxed Claude Code session with the router hook:

```bash
./scripts/claude-sandbox.sh
```

Your `~/.claude/settings.json` and `~/.claude/model-router.json` are never modified. Auth is preserved because `HOME` is not overridden.

## Benchmark

Pilot: 5 tasks, routed vs baseline, automatic checks. On these tasks, routing passed **5/5 vs 4/5** and cost **$0.0877 per accepted task vs $0.1893** (-53.6%). It does **not** reduce raw tokens (+37.6%): the saving is in cost/quota, not token count.

Full protocol, per-task results and caveats: [`docs/BENCHMARK.md`](docs/BENCHMARK.md).

```bash
node bench/run.mjs --budget 0.50
```

## Limitations (honest ones)

- **A hook cannot change the active model mid-session.** Claude Code has no public API for that today (see issues #44976, #43326, #27665). The hook observes and recommends; `cc-router run` applies the model at launch.
- For interactive plan → code switching, Claude Code's native `opusplan` alias already covers part of the job.
- Classification is heuristic and can be wrong. The `confidence` and `matched` fields are in the output so you can tune the keywords.

## Tests

```bash
npm test
```

## Roadmap

- [x] Heuristic classifier + tier routing
- [x] Global + project config
- [x] Claude Code hook + status line
- [x] CLI `run` wrapper
- [x] Quality benchmark harness (pilot, 5 tasks)
- [ ] OpenCode adapter
- [ ] Stats dashboard (cost/quota saved, escalation rate)

## License

MIT
