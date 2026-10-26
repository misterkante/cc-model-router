# Competition, positioning and launch

[English](COMPETITION.md) · [Français](COMPETITION.fr.md)

> Research dated **2026-10-26**. Adoption numbers (stars, forks, versions, downloads) and
> prices move fast: re-check before every public announcement.
>
> Rule: primary sources (Anthropic docs, GitHub repositories, npm, published benchmarks).
> Self-reported data is marked as such. Links are at the end of the document.

## 1. Executive summary

- **Demand is real and documented.** Anthropic issues about automatic routing total 30+
  related requests; a usage analysis from one Max subscriber (17 days) shows **93.8% of
  tokens sent to Opus** and **97.8% of the cost**. One power user reports **$5,489 in 44
  days**, of which 60–70% of tasks could have run on Sonnet or Haiku.
- **The market is crowded, but not where we are.** Multi-provider gateways (Claude Code
  Router, Weave, LiteLLM, ClaudeRipple) own the "route everything, several providers"
  space. Claude-only hooks also exist (the closest: `tzachbon/claude-model-router-hook`,
  105 ★), but **none of the hooks examined publishes a per-task Claude Code quality
  benchmark with post-run verification**.
- **Our slot: native + evidence + recovery.** Three tiers, a 48-run benchmark with
  deterministic checks, and `run --verify` / `--escalate` to recover from a quality
  failure. No proxy, no API key to change, no telemetry.
- **Verdict: Go for open source / portfolio, No-Go as a standalone company.** The project
  is credible and differentiated for an OSS launch and a skills showcase. It is not a
  defensible business without a team, dashboard, support and commercial layer.
- **Launch: the benchmark is the lead product.** The message is not "first router" or
  "zero quality loss"; it is "here are 48 runs, 23/24 vs 21/24, -34.1% cost per accepted
  task, and here is how we recover from the failure".

## 2. Evidence of demand

### 2.1 Anthropic data (self-reported, present it as such)

**Issue #27665** — opened 2026-02-22, still open, 30+ related issues.
A Max subscriber (17 days, $200/month plan, Claude Code v2.1.50) measures with `ccusage`:

| Model | Tokens | Share | API-equivalent cost |
|---|---:|---:|---:|
| Opus 4.6 | 1,405,957,116 | 77.0% | $1,011.59 |
| Opus 4.5 | 305,903,815 | 16.8% | $234.43 |
| Haiku 4.5 | 94,216,971 | 5.2% | $16.02 |
| Sonnet 4.5 / 4.6 | 18,331,138 | 1.0% | $12.36 |
| **Total** | **1,825,500,411** | **100%** | **$1,274.40** |

- **93.8% of tokens and 97.8% of the cost go to Opus.**
- 96% of those Opus tokens are **cache reads**: the full context is sent back on every
  turn, even for a "yes, go ahead" or a `grep`.
- The author calls `opusplan` broken and too coarse (plan vs execution), and lists 30+
  related issues (routing by skill, tool, subagent, complexity).

**Issue #44976** — opened 2026-04-08, closed as a duplicate of #15721.
A power user reports **$5,489 in 44 days** (February–April 2026), of which **60–70%** of
tokens were on tasks where Sonnet or Haiku would have been enough (file reads, simple
edits, exploration, chat). Estimate: **$2,000–3,000/month** saved for a heavy user,
without quality loss.

**Takeaway:** this is individual, self-reported data, not a controlled study. It proves a
**strong signal**, not a population. The project benchmark exists precisely to produce a
reproducible measurement at our scale.

### 2.2 What Claude Code does natively (and what is missing)

- `/model`, `--model`, `--effort`, `--fallback-model`: **manual** selection or at launch,
  no automatic routing by task type.
- `opusplan`: Opus in plan mode, Sonnet in execution. Covers **plan → code**, not
  mechanical vs implementation vs debugging; users find it too coarse (issue #15721,
  closed as "covered" by a collaborator, but requests continue).
- Subagents: an agent file can declare `model:`; that is routing **per subagent**, not per
  task, and the subagent inherits the parent model by default.
- **No mid-session model switch** through a public hook. That is the constraint that
  shapes the whole design: the hook observes/recommends, `ccmr run` applies at launch.

### 2.3 The cache constraint that makes per-turn routing dangerous

The prompt cache is **per model**. Changing model mid-conversation invalidates the cache:
the whole history is re-read at full price on the new model. In issue #27665, several users
document this trap:

- a few switches in a 50K–200K token session can cost **more** than staying on Opus;
- the healthy granularity is therefore **at session launch** (or subagent spawn), not at
  every turn;
- escalation when the task is **visibly stuck** can be cheaper than five failed cycles on
  a weaker model.

That is exactly the project's trade-off: **one model per run**, then `--verify` and
`--escalate` that start a new session only on failure. You pay a cold cache on retry, but
only when the first attempt failed.

## 3. Competitive landscape (as of 2026-10-26)

| Actor | Type | License | Adoption | What it does | Limit vs us |
|---|---|---|---|---|---|
| **Native Claude Code** (`/model`, `opusplan`, subagents) | Built-in | Proprietary | Free, installed | Manual selection; Opus plan → Sonnet execution; `model:` per subagent | No routing by task type; no task benchmark; `opusplan` coarse |
| **tzachbon/claude-model-router-hook** | Claude Code hook | MIT | **105 ★**, 14 forks, 40 commits | 5 classes + abstain, subagent routing, warn/autoswitch, global/project config | Opus by default on implementation/debugging (conservative); **no published quality benchmark**; no post-run verification |
| **edagher92-coder/claude-model-router** | Python/API router | MIT | **0 ★**, 90 commits | haiku/sonnet/glm/opus/fable tiers, fallback/escalation, CSV log, subscription via `claude -p` | Separate router, not a native hook; model bench, not a Claude Code task benchmark; almost no adoption |
| **musistudio/claude-code-router (CCR)** | Local gateway | MIT | **37.8k ★**, 3.2k forks, v3.1.3, ~9k downloads/week | Multi-provider gateway/control plane, dashboard, rules, fallback, many agents | Heavy; endpoint/proxy change; no per-task Claude Code quality benchmark |
| **weave-os/router** | Gateway | Apache-2.0 | **5.6k ★**, 160 forks | Go, < 50 ms, "40–70% lower cost" via endpoint change | Generalist agentic router; no per-task Claude Code benchmark |
| **LiteLLM Auto Router** | Gateway | OSS | Widely used | Heuristic classifier, SIMPLE/MEDIUM/COMPLEX/REASONING tiers; **40.4% cheaper at 97.1% quality** (220 prompts); **74.5% cheaper at 87.3%** (8,399 prompts) | Generalist, proxy; quality drops on RouterArena (68.6% vs 78.5%); not native Claude Code |
| **RouteLLM** | Research router | Apache-2.0 | Research project | Trained classifiers, OpenAI-compatible server | Generalist; no Claude Code integration |
| **ClaudeRipple** | Multi-provider proxy | GPL-3.0 | **72 ★**, 16 forks, 850 commits | Claude Desktop/Code with GPT/DeepSeek/etc., effort per prompt, subagents | Not a Claude-only per-tier router; heavy proxy; GPL |

**Adjacent work (not complete routers):** `better-model` (agents + `CLAUDE.md`),
`attune-ai` (multi-tier routing), `claude-router` (28 ★, one maintainer, cited in
#27665). They validate demand but do not publish a per-task quality benchmark.

### What the table really says

- **The closest direct competitor is `tzachbon`**, not CCR/Weave/LiteLLM: same idea
  (hook, tiers, global/project config), same license, already 105 ★. It is more mature on
  subagents and task classes.
- **Gateways are another market**: multi-provider, dashboard, enterprises. They solve
  "use GPT/DeepSeek/Ollama in Claude Code", not "choose between Haiku/Sonnet/Opus for
  this Claude Code task".
- **LiteLLM is the evidence reference**: 8,619 prompts, public numbers, but a generalist
  router and a visible quality loss on hard benchmarks. It is an indirect competitor and
  a methodological model.
- **None of the projects examined combines** native Claude Code + per-task tiers +
  reproducible benchmark + verification/escalation. That is our space, not a technical
  revolution.

## 4. Positioning map

```
                    published quality evidence
                            ▲
                            │
             LiteLLM        │        cc-model-router
          (gateway, large   │        (native, 48 runs,
           benchmark)       │         verification)
                            │
   gateway ◄────────────────┼────────────────► native
                            │
        CCR / Weave /       │        tzachbon (hook)
        ClaudeRipple        │        Native Claude Code
                            │        (opusplan, /model)
                            ▼
                    no task evidence
```

- **Horizontal axis**: integration (proxy/gateway ↔ native Claude Code).
- **Vertical axis**: evidence (no quality benchmark ↔ published benchmark).
- **Our cell**: native + evidence + recovery. It is narrow, but consistent with the cache
  constraint and the "cost/quota at equal quality" promise.

## 5. Differentiation (honest)

### What we do that others do not (among the projects examined, as of 2026-10-26)

1. **A reproducible Claude Code task benchmark**: 12 tasks × 2 variants × 2 repeats = 48
   runs, deterministic checks, cost per **accepted** task, published and sanitized
   dataset, protocol in `bench/README.md`.
2. **Post-run verification**: `ccmr run "<task>" --verify "<command>"` runs the check
   after Claude; `--escalate` retries with the next tier and injects the failure output
   into the prompt. This is the direct answer to the only measured quality failure
   (Sonnet's invalid YAML on `impl-angular`).
3. **Native integration, no proxy**: `haiku`/`sonnet`/`opus` aliases, `--model`,
   `--effort`, `--fallback-model`, `--settings` for isolation. No API key, no
   `ANTHROPIC_BASE_URL`, no telemetry.
4. **Simplicity**: 3 tiers, Node ≥ 18, MIT, zero runtime dependencies. The closest
   competitor is bash/Python with 5 classes and subagent hooks; the gateways are
   platforms.
5. **An opt-in Sonnet-first debugging policy**: Sonnet first, Opus on `--verify` failure,
   with a simulation at **-15.5% cost per accepted** vs Opus direct at 8/8 (3/8 retries).
   A real 4-run pilot on `debug-calc` + `debug-search` passes 4/4 with Sonnet, no
   escalation. A second pilot, without the hook, reproduced the known Sonnet failure on
   `debug-calc`: Sonnet fails the check, Opus receives the error and succeeds, for
   **$0.2132 vs $0.1559** Opus direct (+36.7%). That is one real failure and a measured
   cost, not a rate; a failed first attempt can cost more than Opus direct. Not a
   benchmark claim.

### What others do better (acknowledge it)

- **tzachbon**: subagent routing (`Agent`/`Task`), 5 classes + abstain, installer,
  classifier fallback via `claude -p`, 105 ★. We do not yet route subagents.
- **CCR / ClaudeRipple / Weave**: multi-provider, dashboard, desktop app, observability,
  scale. We are Claude-only and CLI.
- **LiteLLM**: 8,619 prompts, production gateway, observability. Our sample is much
  smaller (12 tasks, 2 repeats).
- **Native**: zero install, zero risk, `opusplan` already there. Our tool must justify an
  extra install through measurement and recovery.

### Claim discipline

- **Do not say**: "first router", "zero quality loss", "tokens saved", "works for
  everyone".
- **Say**: "48 runs, 23/24 vs 21/24 accepted, -34.1% cost per accepted task vs a mixed
  Sonnet/Opus baseline; small sample; debugging is a quality guard, not a saving".
- **Exact baseline**: Sonnet/medium for mechanical and debugging, Opus/high for
  implementation. It is **not** an all-Opus baseline. It is the behaviour the router
  targets; comparing against all-Opus would artificially inflate the saving.
- **The number not to hide**: Sonnet failed 1/8 in implementation (invalid YAML).
  `--verify`/`--escalate` is the answer; one real debugging failure was recovered in a
  pilot (Sonnet → Opus, +36.7% vs Opus direct), but the rate and average cost are not yet
  measured in the 48 runs.

## 6. Viability

### Green light

- **Demand**: documented by issues, competitors and real costs.
- **Niche**: gateways are big but generalist; the closest competing hook is small (105 ★)
  and has no benchmark. A native, measured, verified, MIT tool has a place.
- **Development cost**: low (Node, zero dependencies, already 53 tests).
- **Portfolio value**: high (research, CLI, hooks, isolation, tests, benchmark,
  cost/quality analysis, honest documentation).

### Red light / risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Anthropic ships native routing | Medium | High | Move toward **evidence** and **verification**; basic routing will be commoditized |
| A gateway adds per-task routing | High | Medium | Stay native, simple, no proxy; target users who refuse a gateway |
| `tzachbon` adds a benchmark | Medium | Medium | Collaborate / credit; our advantage is verification and data |
| Sample too small | Certain | Medium | Expand to 20–30 tasks, 3 repeats, blind review, confidence intervals before big claims |
| Lineup/prices change | High | Low | Aliases, config, dated re-check |
| Cache invalidated on retry | Certain | Low | Retry only on failure; document the cost |
| `--verify` runs a user command | Certain | Medium | Document "read-only checks", no secrets, no telemetry |
| Anthropic brand confusion | Low | Medium | MIT, "not affiliated" notice, no Anthropic logo |

### Verdict

**Go for open source and portfolio. No-Go as a standalone company as it stands.**

The project can become a reference tool for "route Claude Code by task with evidence".
Alone, it cannot beat CCR/Weave/LiteLLM on multi-provider, nor Anthropic on native
integration. Its defense is **evidence, verification, simplicity and trust** — not
technology.

If monetization ever happens: team dashboard, shared routing policy, CI integration,
support. Validate demand through the OSS launch before writing a line of commercial code.

## 7. Launch plan

### 7.1 Pre-launch (2 weeks)

- [x] **Freeze scope**: 3 tiers, `run --verify`/`--escalate`, opt-in Sonnet-first policy, 48-run benchmark.
- [x] **npm (metadata)**: `repository`, `homepage`, `bugs`, `files`, `author` added;
      `npm pack --dry-run` OK.
- [x] **npm (publication)**: `cc-model-router@0.1.0` published on 2026-10-26; `0.1.1`
      fixes the published README; clean install verified with both `ccmr` and `cc-model-router`.
- [x] **Binary name**: decided — package `cc-model-router`, binaries `cc-model-router`
      and alias `ccmr`. `cc-router` is already taken on npm (`cc-router@4.0.0`) and is not used.
- [x] **GitHub**: public repository created and pushed, description, homepage, 12 topics
      (`claude-code`, `model-router`, `cost-optimization`, `llm`, `mit-license`, etc.),
      issues/projects/discussions enabled, CI green.
- [ ] **GitHub (web-only)**: social preview and repository pin on the profile. No public
      GitHub API allows changing them (see note below). The social preview image is ready:
      [`docs/assets/social-preview.png`](assets/social-preview.png).
- [x] **CI**: `npm test` + `npm run docs:check` + `npm run bench:verify` (no real Claude call) — `.github/workflows/ci.yml`.
- [x] **README**: installation, CLI reference, comparison table, visible limitations,
      links to `docs/BENCHMARK.md` / `.fr.md`, `docs/COMPETITION.md` / `.fr.md` and the docs index in both languages.
- [ ] **Visual demo**: demo GIF. Localized benchmark charts are done.
- [ ] **Reproduce the full 48-run benchmark** from a clean clone; protocol check and escalation simulation already pass without model calls.
- [ ] **60 s demo**: `classify`, `run --verify` (dry-run or small run), `status`.
- [ ] **Blog post**: "I measured 48 Claude Code runs: -34% cost per accepted task, and
      the failure that matters" — method, invalid YAML, verification.
- [x] **Security**: `SECURITY.md`, issue/PR templates, "not affiliated with Anthropic" notice.

> **Profile pinning**: GitHub does not provide a public mutation (`pinRepository` does not
> exist; `/user/pinned_repositories` returns 404). Pinning is done in the web UI: profile →
> *Customize your pins* → select `cc-model-router` → *Save pins*. The profile README can
> also feature it.

### 7.2 Launch day

- **Show HN**: "Show HN: A Claude Code model router with a 48-run quality benchmark".
  Post on a Tuesday–Thursday morning (US time), be present in the comments, link directly
  to the benchmark and limitations.
- **Reddit**: r/ClaudeAI and r/ClaudeCode; follow self-promotion rules; post the
  benchmark, not just the link.
- **X/Twitter**: short thread with the number, the chart and the YAML failure; #ClaudeCode.
- **dev.to / Hashnode**: method + results article.
- **LinkedIn**: portfolio/career angle, not hype.
- **Avoid**: spamming the Anthropic issue tracker; if commenting, bring the data and
  disclose the project.

### 7.3 Message

**One sentence:**
> Claude Code routed by task — Haiku for mechanical work, Sonnet for implementation, Opus
> for debugging — with a 48-run benchmark and a verify/escalate loop.

**Evidence:**
> 23/24 vs 21/24 accepted; $0.0906 vs $0.1375 per accepted task (-34.1%); 12 tasks, 2
> repeats; debugging = quality guard (+29.7%), not a saving; baseline without the hook
> (product comparison, not an isolated model A/B).

**Honesty:**
> Small sample, not statistical proof; Sonnet failed 1/8 in implementation;
> `--verify`/`--escalate` is the answer, not yet in the 48 runs; the Sonnet-first policy
> is a simulation + two small pilots, not a benchmark. One real failure was recovered
> (Sonnet → Opus, $0.2132 vs $0.1559 Opus direct, +36.7%), but the escalation rate remains
> unknown; no proxy, no API key, MIT.

### 7.4 Post-launch metrics

| Horizon | Track | Realistic target |
|---|---|---|
| 30 days | stars, npm downloads, issues, benchmark reproductions | 100 ★, 500 dl, 5 useful feedback items |
| 60 days | contributors, PRs, external benchmarks, reported savings | 250 ★, 1k dl, 1 contributor |
| 90 days | OpenCode / dashboard / commercial decision | documented Go/No-Go |

Do not optimize stars. Optimize: **benchmark reproductions**, **real usage feedback**,
**actionable issues**.

## 8. Career value

What the project demonstrates, concretely:

- **Problem selection**: start from a real pain (Claude Code cost/quota), not from a
  technology.
- **Dated research**: lineup, CLI, issues, competitors, primary sources.
- **Engineering**: Node CLI, hooks, global/project config, isolation, `spawnSync`,
  argument parsing, exit codes, dry-run.
- **Quality**: 53 tests, fake Claude binary, integration tests, `bench:verify`,
  deterministic checks, sanitized dataset, automated TUI smoke test (`test:tui`, tmux).
- **Cost/quality analysis**: cost per accepted task, baseline, tokens vs cost, limits.
- **Communication**: README, reproducible benchmark, honest documentation, this document.

Reusable artifacts: MIT repository, JSON dataset, blog post, talk "measuring a model
router without lying to yourself", possible Claude Code cost/quality consulting.

## 9. Sources

### Anthropic / Claude Code

- Issue #27665 — *Intelligent Model Routing — 93.8% of Max subscriber tokens to Opus*:
  <https://github.com/anthropics/claude-code/issues/27665> (opened 2026-02-22).
- Issue #44976 — *Auto model routing by task type*:
  <https://github.com/anthropics/claude-code/issues/44976> (2026-04-08, closed duplicate).
- Issue #15721 — *Automatic Model Switching for Plan Mode*:
  <https://github.com/anthropics/claude-code/issues/15721> (closed 2026-08-17).
- Claude Code model docs (aliases, `opusplan`, effort):
  <https://code.claude.com/docs/en/model-config>.
- Prompt caching docs:
  <https://platform.claude.com/docs/en/build-with-claude/prompt-caching>.

### Competition

- `tzachbon/claude-model-router-hook`:
  <https://github.com/tzachbon/claude-model-router-hook> (MIT, 105 ★ on 2026-10-26).
- `edagher92-coder/claude-model-router`:
  <https://github.com/edagher92-coder/claude-model-router> (MIT, 0 ★ on 2026-10-26).
- `musistudio/claude-code-router`:
  <https://github.com/musistudio/claude-code-router> (MIT, 37.8k ★ on 2026-10-26).
- `@musistudio/claude-code-router` npm:
  <https://www.npmjs.com/package/@musistudio/claude-code-router> (v3.1.3).
- `weave-os/router`:
  <https://github.com/weave-os/router> (Apache-2.0, 5.6k ★ on 2026-10-26).
- Weave Show HN:
  <https://news.ycombinator.com/item?id=48688700> (216 points, 113 comments).
- LiteLLM Auto Router — cost/quality benchmark:
  <https://docs.litellm.ai/blog/auto-router-cost-quality-benchmark>.
- LiteLLM — public benchmarks:
  <https://docs.litellm.ai/docs/auto_router/benchmarks>.
- `lm-sys/RouteLLM`:
  <https://github.com/lm-sys/RouteLLM> (Apache-2.0).
- `PBJ-2/clauderipple`:
  <https://github.com/PBJ-2/clauderipple> (GPL-3.0, 72 ★ on 2026-10-26).

### Project

- `docs/BENCHMARK.md` — 48-run results, analysis, incident, limits.
- `docs/benchmarks/2026-10-26-expanded.json` — published, sanitized dataset.
- `bench/README.md` — canonical protocol, merge, publication.
- `docs/RESEARCH.md` — lineup/CLI research (2026-10-24).

## 10. Uncertainties to re-check before publication

- **Adoption numbers** (stars, forks, downloads): 2026-10-26 snapshot, refresh on launch
  day.
- **Native Anthropic routing**: `opusplan` is there, #15721 is closed, but #27665 remains
  open and users ask for more. Watch for a possible native version.
- **Lineup and prices**: Fable 5.1 / Opus 5.5 / Sonnet 5.5 / Haiku 5.5 on 2026-10-24;
  re-check before any public number.
- **npm/bin name**: `cc-model-router` is published (`0.1.1`, 2026-10-26); the `cc-router`
  binary is already taken by the npm package `cc-router@4.0.0`. Decision: package
  `cc-model-router`, binaries `cc-model-router` + alias `ccmr`, no collision.
- **Benchmark**: 12 tasks, 2 repeats; no confidence intervals, no blind review. Do not present it as
  statistical proof.
- **Brand**: do not suggest an Anthropic affiliation; MIT, explicit notice.
- **Direct competitor**: `tzachbon` may add a benchmark or change strategy; re-read its
  README before launch.
