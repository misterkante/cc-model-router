# Research — state of the art

[English](RESEARCH.md) · [Français](RESEARCH.fr.md)

> Last model-lineup/CLI check: 2026-10-24
> Competition research: 2026-10-26 (see [`COMPETITION.md`](COMPETITION.md))
> Rule: no coding phase starts without a dated research note.

## 1. Source hierarchy

1. **Primary**: Anthropic documentation and release notes (anthropic.com, docs).
2. **Code**: official GitHub repositories (issues, PRs, releases), `claude --help`.
3. **Community**: Reddit, Hacker News, blogs — useful for real usage, but cross-check.

A fact only enters a decision if it is dated and sourced. Sources that disagree are listed under "Uncertainties".

## 2. Verified Claude lineup (2026-10-24)

| Model | Input/output price (per M tokens) | Role |
|---|---|---|
| Fable 5.1 | $10 / $50 | frontier, heavy coding/reasoning |
| Opus 5.5 | $4 / $20 | judgment, strongest generalist |
| Sonnet 5.5 | $2 / $10 | workhorse, well-scoped tasks |
| Haiku 5.5 | $0.10 / $0.50 (<100K input) | volume, subagents, classification |

- Sources: anthropic.com/claude-opus-5-5, anthropic.com/claude-sonnet-5-5, anthropic.com/claude-haiku-5-5, taskade.com/blog/claude-models-explained, felloai.com.
- Mythos 5.1: restricted to verification programs, out of scope.

## 3. Claude Code CLI 2.1.309 — verified on 2026-10-24

- Accepted model aliases (present in the binary): `fable`, `opus`, `sonnet`, `haiku`.
- `--effort <level>`: `low`, `medium`, `high`, `xhigh`, `max` (no `none`).
- `--fallback-model <model>`: accepts a comma-separated list; switches when the model is overloaded or unavailable.
- `--settings <file-or-json>`: loads additional settings (hooks/statusLine) without modifying `~/.claude/settings.json`.
- `--max-budget-usd <amount>`: spending cap, only with `--print`.
- `claude "prompt"` starts an interactive session; `-p/--print` for non-interactive use.

## 4. Routing ecosystem

- Native Claude Code: `opusplan` alias (Opus for planning → Sonnet for execution), `/model`, per-subagent `model:`. No automatic routing by task type and no mid-session switch.
- Feature requests: #27665 (open, 93.8% of Max tokens on Opus), #44976 (closed duplicate of #15721), #15721 (closed as covered by `opusplan`).
- Closest community hook: `tzachbon/claude-model-router-hook` (5 classes + abstain, global/project config, subagents, warn/autoswitch, 105 ★ on 2026-10-26; no published quality benchmark).
- Python/API router: `edagher92-coder/claude-model-router` (tiers, fallback/escalation, `claude -p` for the subscription; 0 ★).
- Multi-provider gateways: `musistudio/claude-code-router` (37.8k ★), `weave-os/router` (5.6k ★), LiteLLM Auto Router, RouteLLM, ClaudeRipple.
- Details, numbers, links and positioning: [`COMPETITION.md`](COMPETITION.md) (research dated 2026-10-26).
- OpenCode: issue #8456 (auto model by task type), plugins `opencode-model-router`, `Auto (Jev)`.

## 5. Uncertainties / to re-check

- Prices and the lineup move fast: re-check before any publication.
- Web results sometimes contradict each other (articles still citing Opus 4.6 / Sonnet 4.6 / Haiku 4.5).
- `CLAUDE_CONFIG_DIR`: support not confirmed; we use `--settings` + `CC_ROUTER_CONFIG_DIR`.
- Exact `UserPromptSubmit` hook schema (`additionalContext`): to validate in a real session (deferred).

## 6. Decision from the research

- Route by **alias** (`haiku` / `sonnet` / `opus`) by default.
- Pin versions through `tiers.<tier>.model` in config.
- No model hardcoded in the code.
