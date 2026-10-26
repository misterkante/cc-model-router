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

### Verify and escalate

Run a check after the task, and retry with the next tier if it fails:

```bash
node bin/cc-router.js run "implement the auth endpoint" --verify "npm test" --escalate
```

- `--verify "<command>"` runs after Claude finishes, in the current directory.
- Router flags go before `--`; everything after `--` is passed to Claude Code.
- Without `--escalate`, a failure is reported and `cc-router` exits non-zero.
- With `--escalate`, a failed check retries with the next tier (`mechanical → implementation → debugging`) and includes the failure output in the retry prompt.
- Claude's exit status is reported; the verification command is the gate. If the check passes, the run is accepted even when Claude exited non-zero.
- Use a read-only check (tests, typecheck, lint). A command that rewrites files changes the state the retry sees.
- The retry reuses the working tree and does **not** roll back. Commit or stash first if you need a clean rollback.
- The verification command is user-provided and runs with your shell permissions.

This closes the one real quality failure measured in the 48-run benchmark: Sonnet produced an invalid YAML, and an Opus retry would have had the parser output to fix it.

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
  "debuggingStrategy": "opus",
  "debuggingFirst": { "model": "sonnet", "effort": "medium" },
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

See `examples/model-router.json` for a ready-to-copy file, and
`examples/model-router.sonnet-first.json` for the opt-in debugging policy.

### Optional: Sonnet-first debugging

Set `"debuggingStrategy": "sonnet-first"` to try Sonnet on debugging tasks first and retry with the
configured debugging tier (Opus by default) when `--verify` fails. It only applies when **both**
`--verify` and `--escalate` are supplied; without the safety net, debugging stays on Opus. Override
the first attempt with `debuggingFirst` (default `sonnet` / `medium`).

A simulation from the 48-run records estimates **-15.5% debugging cost** vs Opus-first at 8/8
accepted, with 3/8 retries. It is a simulation, not a new benchmark: see
[`docs/BENCHMARK.md`](docs/BENCHMARK.md) and `node bench/simulate-escalation.mjs`.

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

Reference run: **12 tasks × 2 variants × 2 repeats = 48 runs**, automatic checks, isolated copies. Routing passed **23/24 (95.8%) vs 21/24 (87.5%)** and cost **$0.0906 per accepted task vs $0.1375** (-34.1%). Raw tokens fell 5.2% overall, but that is not the claim: the saving is in cost/quota, carried by mechanical (-94%) and implementation (-53%). Debugging is a quality guard in this comparison (+30% per accepted vs the Sonnet baseline), not a saving; the baseline does not load the hook (see limitations).

The run also found the next product gap: Sonnet produced one invalid YAML on an implementation task, and the debugging tier over-routes Opus on simple bugs. `run --verify` + `--escalate` closes the first gap; an opt-in Sonnet-first debugging policy closes the second. A simulation from the same records estimates **-15.5% debugging cost** vs Opus-first at 8/8 accepted, with 3/8 retries; it is a simulation, not a new run, and is not included in the 48-run numbers. A 4-run real pilot on `debug-calc` and `debug-search` then passed 4/4 with Sonnet and no escalation. A second real pilot without the hook reproduced the known Sonnet failure on `debug-calc`: Sonnet failed the check, Opus retried and passed, for **$0.2132 vs $0.1559** Opus direct (+36.7%). That is one real failure, not a rate; it validates the mechanism and shows a failed first attempt can cost more than going straight to Opus. None of these pilots is a benchmark.

Full results, per-tier analysis, incident log and caveats: [`docs/BENCHMARK.md`](docs/BENCHMARK.md). Canonical process: [`bench/README.md`](bench/README.md).

```bash
npm run bench:verify
npm run bench -- --repeats 2 --budget 0.50
npm run bench:report -- bench/results/<file>.json
```

## How it compares

- **Native Claude Code**: `/model`, `--model`, `opusplan`, subagents with `model:`; no per-task tiering and no published task-level quality benchmark.
- **tzachbon/claude-model-router-hook**: the closest hook-based router (5 task classes, subagent routing, warn/autoswitch); no published task benchmark or post-run verification. It defaults implementation and debugging to Opus; our default is Sonnet for implementation and Opus for debugging, with an opt-in Sonnet-first debugging policy.
- **Gateways (Claude Code Router, Weave, LiteLLM, ClaudeRipple)**: multi-provider routing at scale, usually through a local proxy or endpoint change; their benchmarks are general, not Claude Code task-level.
- **cc-model-router**: Claude Code-native, three tiers, a 48-run benchmark with deterministic checks, `--verify`/`--escalate`, and an opt-in Sonnet-first debugging policy; MIT, no proxy, no telemetry.

See [`docs/COMPETITION.md`](docs/COMPETITION.md) for the dated research, links, positioning and launch plan.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Run `npm test` and `npm run bench:verify` before opening a pull request.

## Limitations (honest ones)

- **A hook cannot change the active model mid-session.** Claude Code has no public API for that today (see issues #44976, #43326, #27665). The hook observes and recommends; `cc-router run` applies the model at launch.
- **Routing is session-level, not turn-level.** Switching models mid-session invalidates the prompt cache; `cc-router run` picks one model at launch. `--verify` starts a new session only after a failure, so a retry pays a cold cache.
- For interactive plan → code switching, Claude Code's native `opusplan` alias already covers part of the job.
- Classification is heuristic and can be wrong. The `confidence` and `matched` fields are in the output so you can tune the keywords.
- **Verification and escalation are opt-in.** The router does not know your test command; a retry reuses the working tree and can duplicate work or cost more. Use a clean git state for important runs.
- **Sonnet-first debugging has a simulation and two small pilots, not a benchmark.** It requires a reliable `--verify` command and `--escalate`; without them, debugging stays on Opus. The 15.5% figure reuses existing records and assumes the Opus retry succeeds at the recorded cost. The 4-run pilot passed 4/4 with Sonnet; a second pilot without the hook observed one real Sonnet failure on `debug-calc`, recovered by Opus for **$0.2132 vs $0.1559** Opus direct (+36.7%). One failure is not an escalation rate, and a failed first attempt can cost more than Opus direct.
- **The 48-run baseline does not load the hook; the routed variant does.** The comparison measures the router as a product, not a pure model A/B. The real `debug-calc` + `debug-search` pilot (Sonnet-first + hook, 4/4) vs the baseline Sonnet (1/4 on the same tasks) shows the difference can matter.

## Tests

```bash
npm test
```

### TUI smoke test (opt-in)

The statusline and hook can be checked end-to-end in a real Claude Code TUI. It needs `claude`, `tmux` and a working login, starts in a temporary directory, sends one tiny prompt, and verifies that the real `~/.claude` settings and the repository are unchanged:

```bash
npm run test:tui
npm run test:tui -- --sonnet-first
```

This is not part of `npm test` or CI because it uses the real Claude Code session and spends a small amount of quota.

## Roadmap

- [x] Heuristic classifier + tier routing
- [x] Global + project config
- [x] Claude Code hook + status line
- [x] CLI `run` wrapper
- [x] Quality benchmark harness (12 tasks × 2 repeats, 48 runs)
- [x] Validation + escalation (`run --verify`, retry with next model)
- [x] Finer debugging policy (opt-in Sonnet-first, Opus on failed check)
- [x] Real escalation exercised (one `debug-calc` Sonnet failure → Opus retry; +36.7% vs Opus direct)
- [ ] Measure Sonnet-first escalation rate and average retry cost across tasks/repeats
- [ ] OpenCode adapter
- [ ] Stats dashboard (cost/quota saved, escalation rate)

## License

MIT
