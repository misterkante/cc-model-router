# Quality benchmark — reference run

[English](BENCHMARK.md) · [Français](BENCHMARK.fr.md)

> Date: 2026-10-26 (local) · 12 tasks × 2 variants × 2 repeats = **48 runs**.
> Question: does routing save cost/quota **without degrading quality**?
> Canonical process: [`../bench/README.md`](../bench/README.md) · verification: `npm run bench:verify`.
> Data: [`benchmarks/2026-10-26-expanded.json`](benchmarks/2026-10-26-expanded.json).
> Previous pilot: [`benchmarks/2026-10-25-pilot.json`](benchmarks/2026-10-25-pilot.json) (5 tasks, 1 run).

## One-line answer

Across 48 runs, routing passes **23/24 (95.8%)** vs **21/24 (87.5%)** for the baseline, at
**$0.0906 per accepted task** vs **$0.1375**: **-34.1% cost/quota**. Raw tokens fall 5.2% overall,
but that is not the argument: the gain comes from the mechanical (-94%) and implementation (-53%)
tiers. The debugging tier is a **quality guard** (+30% per accepted task vs Sonnet), not a source
of savings; it over-routes Opus on simple bugs. An opt-in Sonnet-first policy (simulation + 4-run
pilot) is analysed below; the 48-run baseline does not load the hook.

## Protocol (summary)

The canonical details, task-addition rules and publication checklist are in
[`../bench/README.md`](../bench/README.md).

- Each run starts from an **isolated copy**: a synthetic daily-quiz fixture for
  mechanical/implementation, dedicated Python fixtures for debugging. The source repo is never
  modified.
- `routed` variant: `ccmr run`, hook loaded via `--settings`, isolated config
  (`CC_ROUTER_CONFIG_DIR`).
- `baseline` variant: `claude --model <model> --effort <effort>` with the same flags
  (`-p --output-format json --max-budget-usd 0.50 --permission-mode acceptEdits`), **without the
  hook**.
- These numbers measure `ccmr run`, one model per process. They are **not** a benchmark of
  the per-turn plugin; see [`PLUGIN.md`](PLUGIN.md) for the plugin and its cache caveat.
- **Automatic** checks: IDs present, structured JSON, expected files, valid YAML (PyYAML), Python
  tests, test file unchanged (SHA-1).
- A run is **accepted** if the check passes, the exit code is 0, and no file outside
  `allowedChanges` changed.
- `total_cost_usd` is an API-equivalent cost: with a Claude Code subscription it is a **proxy for
  quota consumption**, not a bill.

### Tasks

| Id | Tier | Fixture | Baseline | Check |
|---|---|---|---|---|
| `mech-questions` | mechanical | daily-quiz | sonnet / medium | IDs Q-01..Q-11 present |
| `mech-features` | mechanical | daily-quiz | sonnet / medium | IDs F-01..F-14 present |
| `mech-lots` | mechanical | daily-quiz | sonnet / medium | JSON `{"A":9,"B":3,"C":2}` |
| `mech-questions-json` | mechanical | daily-quiz | sonnet / medium | JSON of 11 questions with text |
| `impl-roadmap` | implementation | daily-quiz | opus / high | file + IDs + lots A/B/C |
| `impl-profile` | implementation | daily-quiz | opus / high | valid YAML + AC1 (Python) |
| `impl-angular` | implementation | daily-quiz | opus / high | YAML + ≥ 8 concepts + Angular URLs |
| `impl-questions` | implementation | daily-quiz | opus / high | 11 answers with rationale |
| `debug-calc` | debugging | buggy-python | sonnet / medium | tests green + test file intact |
| `debug-parse` | debugging | buggy-python-parse | sonnet / medium | tests green + test file intact |
| `debug-state` | debugging | buggy-python-state | sonnet / medium | tests green + test file intact |
| `debug-search` | debugging | buggy-python-search | sonnet / medium | tests green + test file intact |

The baseline represents the intended behaviour: Sonnet for current work, Opus for heavy
implementation. It is not the only possible baseline (see "Counterfactual").

### Fixture incident and re-run (transparency)

The first expanded run produced 48 runs, but `impl-angular` / routed / repeat 2 failed for a
**harness** reason, not a reasoning reason: Sonnet tried `mkdir` + `cat > …` + `python3 -c …` in a
single Bash command. In headless mode, `acceptEdits` auto-approves file edits, **not Bash**; the
command was blocked, no file was created, and the model believed it had succeeded.

Fix and re-run:

1. The target directory `bench/fixtures/daily-quiz/parcours/` is now pre-created (`.gitkeep`), so
   Write can create the file without `mkdir`.
2. `impl-angular` was re-run alone: 2 repeats × 2 variants, same budget.
3. The re-run gives routed **1/2** (repeat 1: invalid YAML, a real Sonnet failure; repeat 2: OK)
   and baseline **2/2**.
4. The 4 `impl-angular` records from the first run were replaced by the re-run records with
   `bench:merge`; the published dataset contains 48 runs and carries `mergedAt` / `mergedTasks:
   ["impl-angular"]`.

Consequence: the routed failure in the final dataset is a **real quality failure** (invalid YAML),
not the harness artefact. The pass totals are unchanged (23/24 and 21/24), but the cause is now
honest. Product lesson: post-generation validation (parse the YAML, run the tests) would have
caught the error and allowed a retry/escalation.

## Overall results

| Variant | Runs | Accepted | Rate | Total cost | Cost / accepted | Tokens | Tokens / accepted |
|---|---|---|---|---|---|---|---|
| `routed` | 24 | **23** | **95.8%** | $2.0838 | **$0.0906** | 2,147,568 | 93,373 |
| `baseline` | 24 | 21 | 87.5% | $2.8874 | $0.1375 | 2,266,530 | 107,930 |

- **Cost per accepted task: -34.1%**; total cost: **-27.8%**.
- **Raw tokens: -5.2%** overall; **-13.5%** per accepted task. This is not the main promise, and
  the sign can change by task (mechanical consumes slightly more).
- **No out-of-scope file changes** in the 48 runs.

## By tier

| Tier | Variant | Runs | Accepted | Rate | Cost / accepted | Tokens / accepted |
|---|---|---|---|---|---|---|
| mechanical | routed | 8 | 8 | 100% | **$0.0033** | 48,386 |
| mechanical | baseline | 8 | 8 | 100% | $0.0575 | 45,869 |
| implementation | routed | 8 | 7 | 87.5% | **$0.1046** | 112,382 |
| implementation | baseline | 8 | 8 | 100% | $0.2237 | 119,341 |
| debugging | routed | 8 | 8 | 100% | $0.1656 | 121,726 |
| debugging | baseline | 8 | 5 | 62.5% | $0.1277 | 188,971 |

Reading:

- **Mechanical**: same quality, **-94.2%** cost per accepted. This is the clearest and most
  repeatable gain.
- **Implementation**: **-53.2%** cost per accepted, but **7/8 vs 8/8**: Sonnet produced an invalid
  YAML on `impl-angular`. The Opus baseline is more reliable, not just more expensive.
- **Debugging**: **8/8 vs 5/8** for the Sonnet baseline, but **+29.7%** cost per accepted. Opus
  avoids two baseline failures without the hook (`debug-calc`, `debug-search`) and is expensive on
  two tasks where Sonnet was enough (`debug-parse`, `debug-state`).

The baseline debugging "tokens / accepted" is inflated by failed runs (failure tokens are counted
in the numerator but divided by 5 accepted runs). Compare cost and pass rate, not that isolated
number.

## By task

| Task | Tier | Routed | Routed pass | Routed cost / accepted | Baseline | Baseline pass | Baseline cost / accepted | Delta |
|---|---|---|---|---|---|---|---|---|
| `mech-questions` | mechanical | haiku / low | 2/2 | $0.0033 | sonnet / medium | 2/2 | $0.0588 | **-94.4%** |
| `mech-features` | mechanical | haiku / low | 2/2 | $0.0032 | sonnet / medium | 2/2 | $0.0571 | **-94.5%** |
| `mech-lots` | mechanical | haiku / low | 2/2 | $0.0037 | sonnet / medium | 2/2 | $0.0602 | **-93.9%** |
| `mech-questions-json` | mechanical | haiku / low | 2/2 | $0.0032 | sonnet / medium | 2/2 | $0.0538 | **-94.0%** |
| `impl-roadmap` | implementation | sonnet / medium | 2/2 | $0.0895 | opus / high | 2/2 | $0.2106 | **-57.5%** |
| `impl-profile` | implementation | sonnet / medium | 2/2 | $0.1015 | opus / high | 2/2 | $0.2227 | **-54.4%** |
| `impl-angular` | implementation | sonnet / medium | **1/2** | $0.1720 | opus / high | 2/2 | $0.2455 | -29.9% |
| `impl-questions` | implementation | sonnet / medium | 2/2 | $0.0892 | opus / high | 2/2 | $0.2158 | **-58.7%** |
| `debug-calc` | debugging | opus / high | 2/2 | $0.1559 | sonnet / medium | **0/2** | — | — |
| `debug-parse` | debugging | opus / high | 2/2 | $0.1921 | sonnet / medium | 2/2 | $0.0893 | **+115.1%** |
| `debug-state` | debugging | opus / high | 2/2 | $0.1637 | sonnet / medium | 2/2 | $0.0828 | **+97.7%** |
| `debug-search` | debugging | opus / high | 2/2 | $0.1506 | sonnet / medium | **1/2** | $0.1580 | -4.7% |

Notes:

- `debug-calc`: baseline Sonnet **0/2** (empty list not handled, `ZeroDivisionError`). The baseline
  cost of $0.1363 corresponds to two failed runs; an Opus retry would add ~$0.16, i.e. ~$0.29 per
  accepted result. Opus direct is safer here.
- `debug-search`: baseline **1/2** (wrong first occurrence). The -4.7% is fragile: the baseline cost
  per accepted divides by a single success; a retry of the failed run would push that cost up.
- `impl-angular`: the routed 1/2 is an invalid YAML (`titre: Composants : anatomie…`, unquoted
  colon). This is not a task-comprehension problem but a syntax problem — exactly what automatic
  validation should catch.

## Analysis

### The gain is real, but not uniform

Routing does not make every tier cheaper. It moves the cursor:

- mechanical: **-94%**, same quality;
- implementation: **-53%**, with a syntax risk the Opus baseline did not have;
- debugging: **+30%**, but **8/8 vs 5/8**.

The overall -34.1% is therefore a mix: a massive saving on mechanical work, a solid saving on
implementation, and an accepted surcharge on debugging. That is more credible than a single number
that would suggest everything is cheaper.

### The debugging tier is too coarse

The classifier sends **all** bugs to Opus. Yet:

- `debug-calc` and `debug-search` failed with Sonnet in the baseline **without the hook** (0/2 and
  1/2); the real pilot with the hook passes 4/4 on `debug-calc` + `debug-search`, so the need for
  Opus is not deterministic;
- `debug-parse` and `debug-state` pass with Sonnet 2/2, at about **2× cheaper** than Opus.

A single debugging tier is therefore **conservative**: it protects quality, but over-routes simple
bugs. The logical improvement is a **Sonnet-first, Opus-on-check-failure** policy (implemented as
opt-in on 2026-10-26, simulated below), or a sub-classifier for "simple bug" vs "deep bug"
(concurrency, regression, state, flaky). We need to measure the escalation rate and the cost of a
failed run + retry, not only the cost of the winning run.

### Simulation: Sonnet-first + Opus escalation (not a new run)

The 16 debugging records in the dataset (8 Sonnet baseline, 8 routed Opus) allow simulating a
"Sonnet first, Opus on check failure" policy:

| Policy | Accepted | Total cost | Cost / accepted |
|---|---:|---:|---:|
| Sonnet alone | 5/8 | $0.6385 | $0.1277 |
| Opus direct | 8/8 | $1.3247 | $0.1656 |
| **Sonnet-first + Opus** | **8/8** | **$1.1191** | **$0.1399** |

- **-15.5%** cost per accepted vs Opus direct, at equal simulated quality (8/8).
- 3 of 8 runs escalate (`debug-calc` ×2, `debug-search` ×1); the other 5 stay on Sonnet.
- **+9.5%** vs Sonnet alone, but Sonnet alone accepts only 5/8: you pay to recover the 3 failures.
- Cost of a failure + retry, e.g. `debug-calc`: $0.0704 (Sonnet) + $0.1514 (Opus) = $0.2218.

**What this is / is not:**

- A **simulation** from existing records, not a new benchmark.
- The Opus retry cost is **proxied** by the fresh Opus run. In reality, the retry starts from the
  failed Sonnet tree and receives the failure output: the cost can differ (cold cache, longer
  context, partial correction). The escalation pilot measured **$0.1425** for the retry, vs
  **$0.1559** on average for a fresh Opus run.
- It assumes the Opus retry succeeds when the fresh Opus run succeeded; no second failure is
  modelled.
- No latency, no cache, no real verification.
- The policy only applies when `--verify` and `--escalate` are provided; without a reliable check,
  debugging stays on Opus.

The real pilots below show that the "Sonnet fails 0/2" assumption is not stable: **4/4** with the
hook, but **one real failure** without it. The simulation is a scenario, not a prediction.

Reproduce: `npm run bench:simulate-escalation` (or `node bench/simulate-escalation.mjs`).

### Real Sonnet-first pilot (2026-10-26, 4 runs)

After the simulation, a real pilot tested the policy on `debug-calc` (`buggy-python`) and
`debug-search` (`buggy-python-search`), with `debuggingStrategy: "sonnet-first"`,
`--verify "python3 -m unittest <test>.py"`, `--escalate`, budget $0.50, isolated copies,
Claude Code 2.1.309.

| Task | Run | Models | API-equivalent cost | Check | Escalation | Changed files |
|---|---:|---|---:|---|---|---|
| `debug-calc` | 1 | Sonnet 5.5 | $0.0770 | OK | no | `calc.py` |
| `debug-calc` | 2 | Sonnet 5.5 | $0.0812 | OK | no | `calc.py` |
| `debug-search` | 1 | Sonnet 5.5 | $0.0827 | OK | no | `search.py` |
| `debug-search` | 2 | Sonnet 5.5 | $0.0784 | OK | no | `search.py` |

- **4/4 Sonnet passes**, with no escalation; ~**-49%** vs routed Opus on `debug-calc` and ~**-46%**
  on `debug-search` (averages of the two repeats), at equal check.
- The benchmark Sonnet baseline (without the hook) was **1/4** on these two tasks (`debug-calc` 0/2,
  `debug-search` 1/2). The pilot used the hook (`--settings`); the difference can come from the
  hook context, stochasticity, or both. **Do not attribute the difference to the model alone.**
- No file outside `calc.py` / `search.py` changed; external checks pass.
- **Escalation was not exercised in these four runs**: all four Sonnet runs succeeded. A second
  pilot, without the hook, reproduced the known Sonnet failure on `debug-calc` and observed the
  Opus escalation (next section).
- 4 runs, not a benchmark; API-equivalent cost, not billed.

### Real escalation pilot (2026-10-26, 1 run, 2 attempts)

To actually exercise the failure path, a second pilot used `debug-calc` **without the hook** (empty
settings), to reproduce the benchmark Sonnet baseline behaviour, which had failed 0/2 on this task.
Configuration: `debuggingStrategy: "sonnet-first"`, `--verify "python3 -m unittest test_calc.py"`,
`--escalate`, budget $0.50, isolated copy, Claude Code 2.1.309.

| Attempt | Model | API-equivalent cost | Check | Escalation |
|---:|---|---:|---|---|
| 1 | Sonnet 5.5 | $0.0707 | **failure**: `average([])` → `ZeroDivisionError` | yes |
| 2 | Opus 5.5 | $0.1425 | OK (4 tests) | — |

- **Real escalation observed**: Sonnet fixes `add` and `clamp` but misses `average([])`; Opus
  receives the failure output and fixes `average`. The run is accepted after 2 attempts.
- Total cost **$0.2132**; Opus-direct reference on `debug-calc`: $0.1514 and $0.1605, average
  **$0.1559**. The failure + retry therefore costs **+36.7%** vs Opus direct.
- The Opus retry alone ($0.1425) is **-8.6%** vs a fresh Opus run: it starts from a partially fixed
  tree, not a fresh copy. Cache is not measured; the simulation that proxies the retry with a fresh
  Opus run is therefore slightly pessimistic on this point.
- Only `calc.py` changed. `__pycache__` created by `unittest` was removed before the diff; it is
  not a model edit.
- **One real failure, not a rate**: this pilot validates the mechanism and measures one cost case.
  It does not prove that Sonnet fails at a given rate; the rate and average cost remain to be
  measured over multiple runs. It also shows that a failed first attempt can cost more than Opus
  direct, even when the retry succeeds.
- The run without the hook is the same starting point as the benchmark baseline; the 4/4 pilot
  above used the hook. The hook/stochasticity difference remains a confounder.
- Sanitized data: [`benchmarks/2026-10-26-escalation-pilot.json`](benchmarks/2026-10-26-escalation-pilot.json).
- Reproduce (empty settings, temporary config):

```bash
CC_ROUTER_CONFIG_DIR=<tmp-config> node bin/cc-model-router.js run \
  "Debug the failing tests: there is a bug in calc.py, fix it so all tests pass. Do not modify test_calc.py or any other file." \
  --verify "python3 -m unittest test_calc.py" --escalate \
  -- --settings <empty-settings.json> --permission-mode acceptEdits \
     --output-format json --max-budget-usd 0.50
```

### A real implementation failure: invalid YAML

Sonnet created `parcours/angular.yaml` with an unquoted title containing `:`. PyYAML rejects the
file. Opus produced valid YAML on both repeats. This is not a routing failure in the "wrong tier"
sense: it is a **validation** failure. A `ccmr run --verify "python3 -c
'import yaml; yaml.safe_load(open(...))'"` (or a project check) would have returned a failure, then
a Sonnet retry or an Opus escalation would have recovered the run. This is the second product
priority. The escalation pilot above has since exercised that path on a real debugging failure.

### Cost vs tokens: the crucial point

Routing **does not always save raw tokens**:

- mechanical: **+5.5%** tokens per accepted (Haiku is a little more verbose);
- implementation: **-5.8%**;
- debugging: total tokens slightly higher (+3.1%), but far fewer tokens per accepted result thanks
  to 8/8 vs 5/8.

Overall, tokens fall 5.2%, but that sign is not guaranteed. The saving comes from the **price per
token** and the model's **quota weight**, not from volume. Any communication that promises "fewer
tokens" is wrong; the correct promise is "less cost/quota at equal or better measured quality".

### Counterfactual: the gain depends on the model you would have used

- If the user already does everything on Sonnet: the mechanical gain remains (Haiku), the
  implementation gain disappears (same model), and debugging becomes more expensive but more
  reliable.
- If the user already does everything on Opus: the gain is larger, especially on mechanical and
  implementation.
- The benchmark targets the user who stays on a strong model out of habit. It does not claim that
  an already-optimal user saves.

## What this run proves

- On **12 tasks and 2 repeats**, cheaper models produce outputs accepted by objective checks, at
  **-34.1% cost per accepted task**.
- The mechanical gain is **large, stable and with no measured loss** (-94%, 8/8 vs 8/8).
- The implementation gain is **large** (-53%) but not risk-free: one invalid YAML in 8 routed runs.
- The debugging tier **has a measurable quality effect in the product comparison**: Opus + hook 8/8
  vs Sonnet without hook 5/8; the hook is a confounder, and the real `debug-calc` + `debug-search`
  pilot (Sonnet + hook 4/4) shows the gap is not only the model.
- Isolation works: no source file modified, no out-of-scope change.

## What this run does not prove

- **Statistical significance**: 12 tasks, 2 repeats, no confidence interval. Tasks are not
  independent (2 runs of the same task).
- **Quality beyond the binary**: style, maintainability, readability, architecture are not
  evaluated.
- **Long tasks**: no multi-file refactor, no interactive session, no large context.
- **Classification errors**: prompts are chosen to route correctly; the misrouting rate in real
  usage is not measured.
- **Real quota**: API-equivalent cost is not the exact consumption of a subscription.
- **Generalization to other models**: the lineup is dated (Claude Code 2.1.309, Haiku/Sonnet/Opus
  5.5); a model or price change invalidates the numbers.
- **The Sonnet-first policy**: it is simulated from records, and the real pilot did not exercise
  escalation; the retry cost and real success rate remain to be validated.
- **Hook confounder**: the routed variant loads the hook (recommendation context), the baseline
  does not. The comparison is "full router vs plain Claude", not "model A vs model B". The
  `debug-calc` + `debug-search` pilot (Sonnet + hook 4/4 vs Sonnet baseline 1/4 on these tasks)
  shows this.

## Reproduce

```bash
# 1. Verify the protocol (mandatory)
npm run bench:verify

# 1b. Sonnet-first simulation (no model calls)
npm run bench:simulate-escalation

# 2. Reference run: 12 tasks × 2 variants × 2 repeats
npm run bench -- --repeats 2 --budget 0.50

# 3. Markdown report
npm run bench:report -- bench/results/<file>.json

# 4. Publish the sanitized JSON (no paths/hashes/stderr)
npm run bench:publish -- bench/results/<file>.json 2026-10-26-expanded
```

After a fixture fix, re-run a single task then merge:

```bash
npm run bench -- --tasks impl-angular --repeats 2 --budget 0.50 \
  --out bench/results/impl-angular-rerun.json
npm run bench:merge -- bench/results/2026-10-26-expanded.json \
  bench/results/impl-angular-rerun.json \
  --out bench/results/2026-10-26-expanded-merged.json
```

See the full protocol: [`../bench/README.md`](../bench/README.md).

## Next steps

1. **Finer debugging**: `debuggingStrategy: "sonnet-first"` + `--verify --escalate` is implemented
   (2026-10-26); the simulation gives -15.5% vs Opus direct at 8/8. Real pilot 4/4 Sonnet on
   `debug-calc` + `debug-search`, with no escalation; a second pilot without the hook observed a
   real Sonnet failure on `debug-calc` then an Opus success ($0.2132 vs $0.1559 Opus direct,
   +36.7%). The **rate** of escalation, average cost and cache effect remain to be measured over
   multiple runs and all 4 tasks.
2. **Post-run validation**: `ccmr run --verify "<command>"` + `--escalate` (implemented on
   2026-10-26, outside the numbers of this run). This is what would have caught Sonnet's invalid
   YAML: the parser returns 1, then Opus receives the error and fixes it.
3. **Expand to 20–30 tasks, 3 repeats**, with blind diff review and confidence intervals.
4. **Interactive session validated**: `npm run test:tui` (tmux) checks the statusline and hook in a
   real TUI, and that `~/.claude` + the repo remain unchanged.
5. **Phase 2 — OpenCode**, after fresh dated research.
6. **Phase 3 — dashboard** wired to these metrics (cost/quota, escalation, rework).
7. **Positioning and launch**: see [`COMPETITION.md`](COMPETITION.md) (research dated 2026-10-26).

## Appendix — 2026-10-25 pilot

The initial pilot (5 tasks × 2 variants = 10 runs, 1 run per task and variant) gave:

| Variant | Accepted | Total cost | Cost / accepted | Tokens |
|---|---|---|---|---|
| `routed` | 5/5 | $0.4386 | **$0.0877** | 556,931 |
| `baseline` | 4/5 | $0.7570 | $0.1893 | 404,795 |

- Cost per accepted task: **-53.6%**.
- Raw tokens: **+37.6%**.
- Mechanical: Haiku -95.1% / -93.5%, same quality.
- Implementation: Sonnet -59.6% / -45.8% vs Opus, same quality.
- Debugging: Opus 1/1, Sonnet 0/1 (`average([])` not handled).
- No out-of-scope file modified.
- Limitation: 5 tasks, 1 run, binary checks; not statistical evidence.

The expanded run confirms the directions (massive mechanical, solid implementation, qualitative
debugging) but corrects two pilot conclusions: debugging is not uniformly justified, and Sonnet
implementation can fail on syntax. That is why the overall number moves from -53.6% to -34.1%: it is
more honest, not worse.
