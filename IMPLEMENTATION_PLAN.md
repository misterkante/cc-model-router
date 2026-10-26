# Implementation plan — Auto Model Router

[English](IMPLEMENTATION_PLAN.md) · [Français](IMPLEMENTATION_PLAN.fr.md)

> Last updated: 2026-10-26
> Status: Phase 1 complete (Claude Code MVP + plugin) + expanded benchmark (48 runs) + verification/escalation

## 🎯 Vision

Remove manual `/model` switching: automatically route Claude Code (then OpenCode) to the
model that fits the task complexity (Haiku / Sonnet / Opus), to reduce **quota/cost**
consumption while preserving quality. Raw tokens do not always fall: what matters is cost
per accepted result.

## 🧩 Context & problem

- In 2026, Claude Code adoption is widespread. Every user shares one pain: token
  consumption drains credits fast, while we want to do "big things".
- Target solution: automatic model switching by task, without manual `/model`.
- State of the art observed (Oct. 2026):
  - Claude Code: native `opusplan` alias (Opus for planning → Sonnet for execution). Open
    feature requests for auto-routing: #44976, #43326, #27665.
  - Community hook: `tzachbon/claude-model-router-hook` (mechanical/implementation/debugging
    tiers; global + project config; subagent handling).
  - OpenCode: feature request #8456 (auto model by task type); plugins
    `opencode-model-router`, `Auto (Jev)`; local/cloud routing.

## 🔎 Phase 0 — Research (mandatory before every coding phase)

1. Search the web, **primary sources first** (Anthropic docs/release notes, official GitHub).
2. Record **dated and sourced** facts in `docs/RESEARCH.md`.
3. List uncertainties and contradictions between sources.
4. Decide, then code.

## ✅ Decisions made

1. **Open source** product (MIT license).
2. MVP scope: **Claude Code** → **OpenCode** extension next.
3. Routing tiers:
   - mechanical → Haiku (effort: low)
   - implementation → Sonnet (effort: medium)
   - debugging / complex → Opus (effort: high)
4. Subagents: force the tier by task class; explicit model > inferred; nested delegation
   cap.
5. Config: global (`~/.claude/model-router.json`) + project (`.claude/model-router.json`).
6. Test isolation: `CC_ROUTER_CONFIG_DIR` + `claude --settings` (never
   `~/.claude/settings.json`); `HOME` unchanged to preserve Claude auth.
7. Dated web research mandatory before each coding phase, recorded in
   `docs/RESEARCH.md`.

## 📋 Phases

- [x] Phase 0 — Research & discovery: ✅ done (see `docs/RESEARCH.md`)
- [x] Phase 1 — Claude Code MVP: hook + config + routing + override + status ✅
- [x] Phase 1.5 — Native Claude Code plugin (Mods API, per-turn routing) ✅
- [ ] Phase 2 — OpenCode: equivalent routing / plugin
- [ ] Phase 3 — Measurement & stats: cost/quota saved, costs, quality escalation

## 📦 Phase 1 deliverables (2026-10-24)

| File | Role |
|---|---|
| `src/classifier.js` | Heuristic classifier (3 tiers, scoring, confidence) |
| `src/config.js` | Global + project config merge |
| `bin/cc-model-router.js` | CLI: `classify`, `run`, `status`, `hook` |
| `src/hook.js` | `UserPromptSubmit` hook (log + context) |
| `hooks/user-prompt-submit.js` | Hook entry point for Claude Code |
| `bin/statusline.js` | Status line: current model + tier mapping |
| `tests/classifier.test.js` | 16 tests (routing, fallback, config, isolation) |
| `examples/model-router.json` | Example config |
| `docs/RESEARCH.md` | Dated research: lineup, ecosystem, uncertainties |

## 🧪 Phase 1 evidence

- `node --test tests/*.test.js` → **54/54 tests pass**
- `npm run docs:check` → all relative Markdown links and bilingual pairs resolve
- `ccmr classify "debug why the login test is flaky"` → `debugging` / `opus` / confidence 1
- `ccmr run` (dry-run) → `claude --model sonnet "implement the auth endpoint"`
- `UserPromptSubmit` hook → log in `.sandbox/config/router.log` (isolation) + correct
  `additionalContext`
- `./scripts/sandbox.sh` → full smoke test without touching `~/.claude`
- [x] Real Claude Code session validation (headless `-p`): ✅ 2026-10-25 (see results below)
- [x] Interactive session validation (hook + statusline in TUI): `npm run test:tui` (tmux,
  2026-10-26)

## 🔧 Claude Code alignment fixes (2026-10-24)

Verified on CLI 2.1.309 (`claude --help` + binary inspection):

- `effort: "none"` was invalid → `"low"` (values: low/medium/high/xhigh/max).
- `ccmr run` now applies `--effort` and `--fallback-model`.
- Fallbacks by tier: mechanical → sonnet; implementation → haiku; debugging → sonnet,haiku.
- Claude argument passthrough via `-- <args>` (e.g. `-- -p`).
- Aliases `haiku` / `sonnet` / `opus` / `fable` confirmed.

## 🧪 Real devquiz test (2026-10-25)

Context: devquiz copy in `$TMPDIR/devquiz-router-test`, Claude Code CLI 2.1.309,
`-p --output-format json`, $0.30/run cap, hook via `--settings`.

| Run | Routing | Actual model | Cost | Files |
|---|---|---|---|---|
| A (mechanical) | haiku / low | claude-haiku-5-5 | $0.00334 | none |
| A baseline (no router) | sonnet / medium | claude-sonnet-5-5 | $0.05859 | none |
| B (implementation) | sonnet / medium | claude-sonnet-5-5 | $0.10274 | `docs/ROADMAP.md` |

- Task A saving: **-94.3%** vs Sonnet ($0.00334 vs $0.05859).
- `UserPromptSubmit` hook triggered in headless: 2 entries in `.sandbox/config/router.log`.
- No real devquiz file modified; `~/.claude` intact.
- Total test cost: **~$0.165**.
- Limitation: 1 sample per task; the interactive session remained to validate.

## 📊 Quality benchmark — reference run (2026-10-26)

Question: does routing save cost/quota **without degrading quality**?
Protocol: 12 tasks × 2 variants × 2 repeats = 48 runs, isolated copies, automatic checks,
$0.50/run budget.
Detail: `docs/BENCHMARK.md`; canonical process: `bench/README.md`; verification:
`npm run bench:verify`; data: `docs/benchmarks/2026-10-26-expanded.json`.

| Variant | Accepted | Total cost | Cost / accepted | Tokens |
|---|---|---|---|---|
| routed | 23/24 (95.8%) | $2.0838 | **$0.0906** | 2,147,568 |
| baseline | 21/24 (87.5%) | $2.8874 | $0.1375 | 2,266,530 |

- Cost per accepted task: **-34.1%**; total cost: -27.8%.
- Raw tokens: -5.2% overall; -13.5% per accepted → the saving remains in **cost/quota**, not
  volume.
- Mechanical: Haiku -94.2%, 8/8 vs 8/8.
- Implementation: Sonnet -53.2%, 7/8 vs 8/8; one invalid YAML on `impl-angular` (real Sonnet
  failure, recoverable by validation).
- Debugging: Opus 8/8 vs Sonnet 5/8, but +29.7% per accepted; Opus necessary on
  `debug-calc`/`debug-search`, oversized on `debug-parse`/`debug-state`.
- No out-of-scope file modified.
- Incident: `impl-angular` routed repeat 2 of the first run = blocked Bash command (harness
  artefact); fixture fixed (`parcours/.gitkeep`), task re-run and merged. The final failure
  is the invalid YAML, not the artefact.
- Limitation: 12 tasks, 2 repeats, binary checks, no blind review; not yet statistical
  proof.

The initial pilot (5 tasks, 1 run) gave -53.6% cost per accepted and +37.6% tokens. The
expanded run corrects two conclusions: debugging is not uniformly justified, and Sonnet can
fail on syntax. The overall number drops (-34.1%) because it is more honest, not because
routing is worse.

## ✅ Verification + escalation (2026-10-26)

Measured problem: across 48 runs, Sonnet produced an invalid YAML on `impl-angular` (1/8
implementation failure); the Opus baseline was 8/8. The router must be able to **verify then
escalate**, not only choose a model at launch.

Implementation:

- `ccmr run "<task>" --verify "<command>"` runs the command after Claude, in the current
  directory.
- `--escalate` retries with the next tier (`mechanical → implementation → debugging`) and
  includes the failure output in the retry prompt.
- `src/runner.js`: flag parsing, escalation plan, retry prompt, injectable orchestration
  (`runClaude` / `runVerify`).
- `bin/cc-model-router.js`: `spawnSync` wiring, dry-run with escalation plan, verification
  exit code.
- Tests: 24 runner tests + 18 classifier/config tests + 3 CLI tests (fake Claude binary,
  zero quota) + 7 hook/statusline integration tests + 1 `check-one` test + 1 CLI/plugin
  classifier parity test. `npm test` = **54 tests**.
- Limits: no rollback; the retry reuses the working tree; the verification command is
  user-provided; simulation + real 4/4 pilot on `debug-calc` + `debug-search`; a second pilot
  without the hook exercised real escalation (see below).
- Hook + statusline validated with real payloads (global config + project override); the
  TUI rendering is checked automatically by `npm run test:tui` (tmux, real statusline + hook,
  real settings unchanged).

Why it matters: this is the direct answer to the only measured quality failure. A `--verify`
that parses the YAML would have returned 1, and `--escalate` would have let Opus fix it with
the error in front of it. The Sonnet-first simulation, the real 4/4 pilot and the escalation
pilot below give a first estimate; the escalation rate remains to be measured.

## 🔌 Native Claude Code plugin (0.2.0, 2026-10-26)

Problem: the settings hook can observe and recommend, but it cannot change the
model inside an interactive session. Users still had to launch `ccmr run` for
every task, which is not the direct Claude Code experience they asked for.

Research: official Mods API and marketplace documentation (fetched 2026-10-26,
recorded in `docs/RESEARCH.md`). Mods require Claude Code 2.1.287+; the local
version is 2.1.309.

Implementation:

- `plugin/.claude-plugin/plugin.json`: manifest, version `0.2.0`.
- `plugin/hooks/register.js`: hooks `session.start`, `prompt.submit`,
  `turn.start`, `turn.step`, `turn.complete`, plus the `/ccmr` command.
- `plugin/lib/classifier.js` and `plugin/lib/config.js`: plugin copies of the
  canonical classifier and config merge, checked by a parity test.
- `.claude-plugin/marketplace.json`: marketplace entry with `source: "./plugin"`.
- `docs/PLUGIN.md` / `.fr.md`: install, routing modes, cache-aware switching,
  quality limits and security.
- `routing` config: `mode` (`per-turn`, `session`, `off`), `cacheAware`,
  `minTurnsBetweenSwitches`, `minConfidence`.
- Escalation is immediate; downgrades wait for the cooldown and a confidence
  threshold. This is a guardrail, not a benchmarked result.
- `turn.step` rewrites every request in the turn, so tool-call continuations
  keep the routed model. Subagent requests are left alone.
- The plugin does not run `--verify` or escalate. `ccmr run` remains the
  quality-gated path.
- Fixed the off-by-one in the cache-aware cooldown and the second-request model
  fallback.

Evidence:

- `claude plugin validate plugin` passes; hooks and API calls are listed.
- `claude plugin test plugin` → **7/7 tests pass**.
- `npm test` → **54/54 tests pass**, including CLI/plugin classifier parity.
- Real smoke test on 2026-10-26:
  `claude --plugin-dir ./plugin --max-budget-usd 0.02 --output-format json -p "fix typo: teh"`.
  Result: only `claude-haiku-5-5`, cost `$0.00069732`, success. The earlier
  version also used Sonnet on the second request; the fix removed that.
- `/ccmr` in a plugin session reported the current model, last decision and
  `mode=per-turn cacheAware=true minTurns=2`.
- Marketplace flow tested in an isolated `CLAUDE_CONFIG_DIR`: marketplace add and
  install succeeded, plugin `0.2.0` was enabled, and `/ccmr` returned
  `current=claude-opus-5-5`, `last=no decision yet`, `mode=per-turn` with no
  model call.
- Limits: no plugin benchmark; per-turn cache behavior is a guardrail; no
  subagent routing; no verification/escalation in the plugin.

## 🧪 Sonnet-first debugging (opt-in, 2026-10-26)

- `debuggingStrategy: "sonnet-first"`: first attempt Sonnet/medium (configurable via
  `debuggingFirst`), Opus/high retry on `--verify` failure.
- Only applies when `--verify` **and** `--escalate` are provided; otherwise debugging stays
  on Opus. The `"opus"` default is unchanged.
- Simulation on the 16 debugging records: **8/8 accepted**, $1.1191 vs $1.3247 Opus direct
  (**-15.5% per accepted**), 3/8 retries. `bench/simulate-escalation.mjs` (no model call).
- Real pilot (4 runs, `debug-calc` + `debug-search`): Sonnet **4/4**, $0.0770 / $0.0812 /
  $0.0827 / $0.0784, checks OK, **no escalation**; ~-49% on `debug-calc`, ~-46% on
  `debug-search` vs routed Opus. The benchmark Sonnet baseline was **1/4** on these two tasks
  **without the hook** → hook/stochasticity confound.
- Real escalation pilot (1 run, `debug-calc`, **without hook**): Sonnet fails
  `test_average_empty` (`ZeroDivisionError`), Opus receives the output and succeeds. Cost
  **$0.2132** ($0.0707 + $0.1425) vs **$0.1559** Opus direct, i.e. **+36.7%**; only `calc.py`
  changes. One real failure, not a rate: it validates the mechanism and shows a failed first
  attempt can cost more.
- Implementation: `src/config.js` (merge), `src/runner.js` (`initialDecision`,
  `escalationPlanFor`), CLI dry-run/status, statusline `D:sonnet→opus`, note in the hook.
- Tests: 11 new tests (runner, config, CLI, hook/statusline) + 1 `bench/check-one.mjs` test;
  `npm test` = **54 tests**.
- Limits: simulation + two small pilots; escalation rate and average cost remain to be
  measured; retry reuses the failed tree; requires a reliable check.

## 🔎 Competition research and launch (2026-10-26)

- [`docs/COMPETITION.md`](docs/COMPETITION.md): demand (issues #27665 and #44976), what native
  Claude Code does (`opusplan`, cache), direct and indirect competitors (tzachbon 105 ★,
  edagher 0 ★, CCR 37.8k ★, Weave 5.6k ★, LiteLLM, RouteLLM, ClaudeRipple).
- Slot: **native Claude Code + per-task tiers + 48-run benchmark + verification/escalation**.
  No proxy, no API key, MIT.
- Verdict: **Go OSS/portfolio; No-Go as a standalone company** without a team, dashboard,
  support and commercial layer.
- Launch: the benchmark is the evidence; Show HN + Reddit + article. Measured claims,
  explicit mixed baseline, small sample acknowledged.
- Next action: launch content (GIF, article, Show HN); expand the benchmark before big claims.

## ⚠️ Known limitation (document for users)

A settings hook still cannot change the model mid-session (issues #44976, #43326,
#27665). The native plugin solves this through the separate Mods API:

- the settings hook **observes and recommends**;
- `ccmr run` applies the model **at launch** and remains the quality-gated path;
- the plugin applies the model **per turn** and does not verify or escalate;
- per-turn switches can invalidate the prompt cache, hence the cache-aware
  cooldown for downgrades;
- subagents are not routed by the plugin.

## ⚠️ Success criteria

- Zero manual `/model` for routable tasks.
- Measurable reduction in **costs/quota** (before/after evidence); raw tokens may increase.
- Quality preserved (smart escalation).

## 🔜 Next actions

- [x] Expanded benchmark (12 tasks × 2 repeats, 48 runs) — see `docs/BENCHMARK.md`.
- [x] Verification + escalation: `run --verify "<command>"`, retry with the next model if the
  check fails.
- [x] Trigger a real escalation: `debug-calc` without hook, Sonnet fails, Opus succeeds;
  $0.2132 vs $0.1559 Opus direct (+36.7%).
- [ ] Measure the escalation rate and average cost over multiple runs/tasks — simulation
  -15.5%; one real failure observed.
- [x] Finer debugging policy: opt-in Sonnet-first + Opus escalation on failure
  (`debuggingStrategy`).
- [ ] Expand the benchmark to 20–30 tasks, 3 repeats, blind review.
- [ ] Measure rework (lost time, failed runs).
- [x] Hook + statusline validated outside the TUI (real payloads, project config).
- [x] Automated TUI rendering (`scripts/tui-smoke.sh`, tmux): real statusline + hook,
  `~/.claude` and repo unchanged.
- [ ] Update `docs/RESEARCH.md` before Phase 2 (dated research).
- [x] Competition research + positioning + launch plan (`docs/COMPETITION.md`).
- [x] Launch preparation (code): `LICENSE`, `SECURITY.md`, CI, issue/PR templates,
  `scripts/demo.sh`, `package.json` (`files`, `prepublishOnly`); npm package
  `cc-model-router` published.
- [x] Binary name: package `cc-model-router`, binaries `cc-model-router` + alias `ccmr`
  (avoids the collision with `cc-router@4.0.0`).
- [x] Public GitHub repository created and pushed, description, homepage, 12 topics,
  issues/projects/discussions, CI green.
- [x] Clean clone from GitHub: `npm test` 54/54, `bench:verify` 12/12 checks red before,
  escalation simulation OK (no model run).
- [x] npm publication: `cc-model-router@0.1.0` published on 2026-10-26; `0.1.1` fixes the
  published README; clean install verified.
- [x] Native Claude Code plugin: per-turn routing, cache-aware switching, `/ccmr`,
  marketplace manifest and 7 plugin tests.
- [ ] npm publication of `0.2.0` (blocked until a valid npm credential is available).
- [ ] Repository pin and social preview: web-only, no public GitHub API.
- [ ] Demo GIF and launch article (localized charts are done).
- [ ] Phase 2 — OpenCode adapter (per-turn routing / plugin).
- [ ] Phase 3 — stats dashboard (cost/quota saved, escalation).
- [ ] Golden tests on real prompts.

## 📝 Tracking

- Journal kept up to date at every phase / decision.
- Every technical decision = dated entry + justification.
