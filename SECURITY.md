# Security policy

[English](SECURITY.md) · [Français](SECURITY.fr.md)

## Supported versions

The latest `0.x` release receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private vulnerability
reporting on the repository (**Security** tab → **Report a vulnerability**).
Include:

- the affected version or commit;
- reproduction steps;
- the impact you see.

You should receive an acknowledgement within 7 days. Please give the project
time to fix the issue before public disclosure.

## Scope and safety notes

- `cc-model-router` runs locally. It does not proxy model traffic, does not
  collect telemetry, and never writes to `~/.claude/settings.json`.
- `ccmr run --verify "<command>"` executes a **user-provided shell
  command** with the user's permissions. Only use commands you trust, and
  prefer read-only checks (tests, typecheck, lint).
- The router reads `~/.claude/model-router.json` and the project's
  `.claude/model-router.json`. Do not put secrets in those files.
- The Claude Code plugin is a mod. Mods run inside Claude Code with the user's
  permissions and are not sandboxed. This plugin reads the same config files and
  the session cwd, changes the model and effort of a request, and makes no
  network requests. It does not run shell commands. Review
  `claude plugin validate plugin` before installing a copy you did not build.
- Benchmark fixtures run in isolated temporary copies. The real project and
  `~/.claude` are not modified.
