# Quality benchmark — protocol

[English](README.md) · [Français](README.fr.md)

> **Canonical** document for the benchmark process. Every contribution follows it.
> Published results: [`docs/BENCHMARK.md`](../docs/BENCHMARK.md) and [`docs/benchmarks/`](../docs/benchmarks/).

## 1. Question

Does routing save **cost/quota** **without degrading quality**?

The benchmark does **not** try to prove a raw-token saving. A cheaper model can be more
verbose; the saving comes from the price/quota weight per token. Any publication that talks
about "tokens saved" is outside the protocol.

What the benchmark does not measure (yet): style, maintainability, architecture, long
interactive sessions, classification errors, the exact quota of a subscription.

## 2. Vocabulary

| Term | Definition |
|---|---|
| **Run** | One execution of a task in a variant. |
| **Variant** | `routed` (the router chooses) or `baseline` (imposed reference model). |
| **Accepted task** | Green check, exit code 0 **and** no file outside `allowedChanges`. |
| **Check** | Deterministic, local, network-free function that returns `{ pass, detail }`. |
| **Fixture** | Minimal, synthetic repository in which the run works. |
| **Baseline** | Model/effort a user would have used without the router. |
| **API-equivalent cost** | `total_cost_usd` returned by Claude Code; a quota proxy, not a bill. |
| **Counterfactual** | The chosen baseline; the gain depends on it (see §3.6). |

## 3. Protocol

### 3.1 Isolation

- Each run starts from a **fresh copy** of the fixture (`mkdtemp` + `cpSync`). The source
  repository is never modified.
- The router config is moved via `CC_ROUTER_CONFIG_DIR` to an **empty temporary directory**:
  the benchmarked routing is the default one, without project config or personal global
  config.
- The hook is loaded **only for the routed variant** via
  `claude --settings .sandbox/claude-settings.json`. The baseline is a plain Claude call,
  without the hook: the comparison is "full router vs plain Claude", not an isolated model
  A/B.
- `HOME` is **not** modified: Claude Code auth stays intact.
- Forbidden: modifying `~/.claude/settings.json`, `~/.claude/model-router.json`, or the real
  repository.

### 3.2 Variants

| Variant | Command | Model |
|---|---|---|
| `routed` | `ccmr run "<prompt>" -- <flags>` | chosen by the classifier |
| `baseline` | `claude --model <m> --effort <e> <flags> "<prompt>"` | imposed by the task |

Both variants receive the same run flags, but only the routed variant adds `--settings` for
the hook:

```text
-p --output-format json --max-budget-usd <budget> --permission-mode acceptEdits
```

No `--dangerously-skip-permissions`. No network requested by the tasks. Timeout: 300 s.

**Important headless limitation**: `--permission-mode acceptEdits` auto-approves file edits,
**not Bash commands**. A model that tries `mkdir`/`cat` in Bash can be blocked and believe it
created the file. This is not a reasoning failure: it is a harness limitation. Fixtures must
**pre-create target directories** (e.g. `parcours/.gitkeep`) so the model can use Write. A run
blocked this way is documented and re-run after fixing the fixture, never counted as a router
win.

### 3.3 Checks

A check must be:

- **deterministic**: same input → same result;
- **local**: no network call, no judge model;
- **red before, green after**: on a fresh fixture copy, the check must fail;
- **bounded**: it modifies nothing, it reads and may run local tests;
- **spec-aligned**, not tied to a particular implementation (e.g. accept `pistes` or
  `pistes_actives`).

For editing tasks, `allowedChanges` lists the only allowed files. Any other change makes the
task unaccepted.

### 3.4 Metrics

| Metric | Calculation | Role |
|---|---|---|
| **Pass rate** | accepted / runs | binary quality |
| **Cost / accepted task** | total cost / accepted | main metric |
| **Raw tokens** | input + cache + output | secondary, never the sales argument |
| **Unexpected changes** | files outside `allowedChanges` | quality guard |
| **Rework / escalation** | failed runs + retries | to measure (Phase 3) |

### 3.5 Size and repeats

- A pilot can have 5 tasks × 1 run: it detects coarse gaps, it does not conclude.
- A "proof" publication requires **≥ 12 tasks** and **≥ 2 repeats** per task, with varied
  fixtures.
- The reference run is:
  ```bash
  npm run bench -- --repeats 2 --budget 0.50
  ```
  i.e. 12 tasks × 2 variants × 2 repeats = **48 runs**.
- Every publication states `n`, the number of runs and the limitations.

### 3.6 Interpretation

- The gain depends on the **baseline**: if the user is already on Sonnet, routing
  implementation to Sonnet saves nothing.
- A baseline that fails is not a quality baseline: for debugging, compare Opus to Opus (no
  gain) or document that the cheaper baseline fails.
- Never generalize beyond the sample.
- Publish the raw JSON, including failures.

## 4. Current tasks

| Id | Tier | Fixture | Baseline | Check |
|---|---|---|---|---|
| `mech-questions` | mechanical | devquiz | sonnet / medium | IDs Q-01..Q-11 present |
| `mech-features` | mechanical | devquiz | sonnet / medium | IDs F-01..F-14 present |
| `mech-lots` | mechanical | devquiz | sonnet / medium | JSON `{"A":9,"B":3,"C":2}` |
| `mech-questions-json` | mechanical | devquiz | sonnet / medium | JSON of 11 questions with text |
| `impl-roadmap` | implementation | devquiz | opus / high | file + IDs + lots A/B/C |
| `impl-profile` | implementation | devquiz | opus / high | valid YAML + AC1 (Python) |
| `impl-angular` | implementation | devquiz | opus / high | YAML + ≥ 8 concepts + Angular URLs |
| `impl-questions` | implementation | devquiz | opus / high | 11 answers with rationale |
| `debug-calc` | debugging | buggy-python | sonnet / medium | tests green + test file intact |
| `debug-parse` | debugging | buggy-python-parse | sonnet / medium | tests green + test file intact |
| `debug-state` | debugging | buggy-python-state | sonnet / medium | tests green + test file intact |
| `debug-search` | debugging | buggy-python-search | sonnet / medium | tests green + test file intact |

The `devquiz` fixture is **local and synthetic** (`bench/fixtures/devquiz/`). To test your real
repository:

```bash
node bench/run.mjs --repo /path/to/devquiz --budget 0.50
```

## 5. Add a task

1. **Choose the tier** and the baseline. The baseline represents what the user would have
   used without the router.
2. **Write the prompt** so it routes to the target tier. Check:
   ```bash
   node bin/cc-model-router.js classify "<prompt>"
   ```
3. **Declare the task** in [`tasks.mjs`](tasks.mjs): `id`, `tier`, `fixture`, `baseline`,
   `prompt`, `allowedChanges`, `check`.
4. **Write the check** in [`checks.mjs`](checks.mjs) (see §6).
5. **Add a fixture** if needed (see §7).
6. **Verify the protocol**:
   ```bash
   npm run bench:verify
   ```
   The check must be red before the task; the prompt must route to the right tier.
7. **Routed-only smoke test**, low budget:
   ```bash
   node bench/run.mjs --tasks <id> --variants routed --budget 0.05
   ```
8. **Full run**, then publish (see §9).

Conventions:

- one task = one verifiable behaviour;
- realistic prompt, no hint about the answer or the model;
- no secret, no personal data, no network dependency;
- small fixture (a few files), readable, versionable;
- minimal `allowedChanges`.

## 6. Write a check

Signature:

```js
// checks.mjs
const CHECKS = {
  "my-check": ({ dir, result, beforeHashes, afterHashes }) => {
    // read files, run local tests
    return { pass: true, detail: "..." };
  }
};
```

Rules:

- `dir`: root of the isolated copy;
- `result`: Claude Code JSON (`result.result` = final text);
- `beforeHashes` / `afterHashes`: SHA-1 snapshots to detect cheating (e.g. modified test);
- never write to `dir`;
- never call a model or the network;
- if a prerequisite is missing (e.g. PyYAML), fail with an explicit message.

Check examples:

- IDs present in the answer;
- file created + minimal structure;
- YAML parsed + required fields;
- local tests green + test file unchanged (hash).

## 7. Add a fixture

- Create `bench/fixtures/<name>/` with the minimum files.
- **Pre-create target directories** (e.g. `parcours/.gitkeep`): in headless mode, Bash is not
  auto-approved, so `mkdir` can be blocked. Write creates the file if the directory exists.
- **Synthetic**: no proprietary code, no secrets, no real data.
- For a bug: tests must **fail before** the fix and **pass after**.
- Document the fixture in `tasks.mjs` (`fixture` field).
- Verify: `npm run bench:verify` must confirm the check is red before.

## 8. Run

```bash
# Verify the protocol (mandatory before any run)
npm run bench:verify

# Smoke test: one task, one variant, low budget
npm run bench -- --tasks mech-questions --variants routed --budget 0.05

# Full run (12 tasks, 2 variants, 2 repeats)
npm run bench -- --repeats 2 --budget 0.50

# Readable Markdown report
npm run bench:report -- bench/results/<file>.json

# Against your real devquiz repository
npm run bench -- --repo /path/to/devquiz --budget 0.50

# Re-score a result after fixing a check (without re-running the models)
npm run bench:recheck -- bench/results/<file>.json <taskId>

# Simulate a Sonnet-first policy (no model call)
npm run bench:simulate-escalation

# Check one task in a copy (checks that only read the directory)
node bench/check-one.mjs impl-angular <copy>

# Merge a task re-run after a fixture fix
npm run bench:merge -- bench/results/<base>.json bench/results/<rerun>.json --out bench/results/<merged>.json
```

Options:

| Option | Default | Role |
|---|---|---|
| `--tasks` | all | comma-separated id list |
| `--variants` | `routed,baseline` | variants to run |
| `--repeats` | `1` | repeats per task and variant |
| `--budget` | `0.20` | API-equivalent cap per run |
| `--repo` | local fixture | alternative devquiz repository |
| `--out` | `bench/results/run-<date>.json` | output file |

## 9. Results

- Local runs go to `bench/results/` (git-ignored).
- **Published** results go to `docs/benchmarks/<date>-<name>.json`, without `dir`,
  `beforeHashes`, `afterHashes` or `stderr`:
  ```bash
  npm run bench:publish -- bench/results/<file>.json 2026-10-26-expanded
  ```
- Main fields of a result:

```json
{
  "generatedAt": "2026-10-25T22:06:00.000Z",
  "claudeVersion": "2.1.309",
  "routerVersion": "0.1.0",
  "nodeVersion": "v22.0.0",
  "budgetPerRunUsd": "0.50",
  "repeats": 2,
  "summary": {
    "routed": { "runs": 24, "passed": 23, "costPerPassedUsd": 0.090599, "totalTokens": 2147568 },
    "baseline": { "runs": 24, "passed": 21, "costPerPassedUsd": 0.137495, "totalTokens": 2266530 }
  },
  "results": [
    {
      "task": "debug-calc",
      "tier": "debugging",
      "variant": "routed",
      "repeat": 1,
      "model": ["claude-opus-5-5"],
      "cost_usd": 0.1581396,
      "tokens": 107999,
      "changedFiles": ["calc.py"],
      "unexpectedChanges": [],
      "check": { "pass": true, "detail": "tests pass" },
      "accepted": true
    }
  ]
}
```

- If a check was wrong and has been fixed, **re-score** existing outputs with `bench:recheck`
  and publish a `-rescored.json` file documenting the correction. Do not re-run the models to
  "improve" a result.
- If a **fixture** was faulty (e.g. a missing directory that blocks Bash), fix the fixture,
  **re-run the task alone**, then merge with `bench:merge`:
  ```bash
  npm run bench -- --tasks impl-angular --repeats 2 --budget 0.50 \
    --out bench/results/impl-angular-rerun.json
  npm run bench:merge -- bench/results/<base>.json \
    bench/results/impl-angular-rerun.json \
    --out bench/results/<base>-merged.json
  ```
  Document the reason for the re-run and the replaced tasks; the published JSON carries
  `mergedAt` and `mergedTasks`. Never merge a re-run silently.
- `bench:publish` removes `dir`, `beforeHashes`, `afterHashes`, `stderr` and `resultPreview`
  from the published JSON.

### Sonnet-first simulation (no model call)

`npm run bench:simulate-escalation` reads `docs/benchmarks/2026-10-26-expanded.json`, pairs the
debugging baseline (Sonnet) and routed (Opus) records, then simulates "Sonnet first, Opus on
verification failure". It prints a table; `--json` produces JSON, `--out <file>` writes it,
`--data <file>` changes the dataset.

- **No model call**, no quota consumed, no change to the reference results.
- The Opus retry cost is **proxied** by the fresh Opus run; the real retry starts from the
  failed Sonnet tree and receives the failure output.
- It assumes the Opus retry succeeds when the fresh Opus run succeeded; no second failure, no
  latency, no cold cache.
- This is an **analysis**, not a benchmark. Say so explicitly in any communication.

## 10. Pre-publication checklist

- [ ] `npm run bench:verify` green.
- [ ] `npm run docs:check` green.
- [ ] All runs have exit code 0, or the failure is documented.
- [ ] No unexpected change, or it is explained.
- [ ] If runs were re-run/merged, the reason and `mergedTasks` are documented.
- [ ] `n`, number of runs and repeats stated.
- [ ] Claude Code version and model lineup dated (`docs/RESEARCH.md`).
- [ ] Raw JSON published in `docs/benchmarks/`.
- [ ] `docs/BENCHMARK.md` updated (table + analysis + limitations).
- [ ] No secret, private path or token in the JSON.
- [ ] The text talks **cost/quota**, not "tokens saved".
- [ ] The counterfactual (baseline) is explicit.

## 11. Known limitations

- Binary checks: writing quality is not scored.
- 12 tasks, 2 repeats: no confidence interval or blind review; runs of the same task are not
  independent.
- API-equivalent cost ≠ real subscription quota.
- The reference-run prompts route correctly; classification errors are not measured.
- Interactive sessions (TUI) are not covered by this harness.

## 12. References

- [`docs/BENCHMARK.md`](../docs/BENCHMARK.md) — results and analysis.
- [`docs/RESEARCH.md`](../docs/RESEARCH.md) — dated facts about the lineup and CLI.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution rules.
