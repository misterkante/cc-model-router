# Contributing

Thanks for helping. This project routes Claude Code tasks to the cheapest model that can do the job, without degrading quality.

## Ground rules

- **Never touch a contributor's real `~/.claude` setup.** Tests and benchmarks must run in the sandbox (`CC_ROUTER_CONFIG_DIR`, `claude --settings`).
- **No secrets, tokens, private paths, or real user data** in code, fixtures, or benchmark results.
- One pull request = one concern.
- Keep the core CLI dependency-free unless there is a strong reason.

## Development

Requirements: Node.js >= 18. For the benchmark: Python 3 + PyYAML.

```bash
npm test
npm run bench:verify
```

## Benchmark contributions

The benchmark is the evidence layer of the project. Its canonical protocol is [`bench/README.md`](bench/README.md) (French; commands, file names and schemas are language-neutral).

To add a task:

1. Pick a tier and a baseline (the model a user would have used without the router).
2. Write a prompt that routes to that tier:
   ```bash
   node bin/cc-router.js classify "<prompt>"
   ```
3. Add the task to `bench/tasks.mjs` and its check to `bench/checks.mjs`.
4. Add a synthetic fixture under `bench/fixtures/` if needed.
5. Run `npm run bench:verify` — the check must be **red before** the task.
6. Smoke test cheaply:
   ```bash
   npm run bench -- --tasks <id> --variants routed --budget 0.05
   ```
7. Run the full comparison and publish the JSON in `docs/benchmarks/`.
8. Update `docs/BENCHMARK.md` with results, `n`, and caveats.

A result is only publishable if:

- the check is deterministic and red before / green after;
- the source repo is untouched;
- there are no unexpected file changes;
- the raw JSON is committed (without `dir`, hashes or stderr);
- the text talks about **cost/quota**, not "tokens saved";
- the baseline (counterfactual) is explicit;
- `n`, repetitions and limitations are stated.

## Reporting a benchmark result

Include: date, Claude Code version, model lineup, exact command, budget, `n`, raw JSON, and limitations. Do not cherry-pick runs; publish failures too. If a check was wrong and has been fixed, re-score the existing outputs with `npm run bench:recheck` and document the correction instead of re-running the models.

## Commit style

Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`. Keep the subject imperative and under ~72 characters.

## Code style

- ESM, no build step.
- Prefer small pure functions; keep the classifier testable.
- Add a test for every behavior change (`npm test`).
- Do not add dependencies for the core CLI.

## Security

- The router observes prompts; do not log prompt content by default.
- Benchmark fixtures must be synthetic.
- Do not open a public issue with exploit details; contact the maintainer first.
