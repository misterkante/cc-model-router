# Fixtures

[English](README.md) · [Français](README.fr.md)

Every fixture is synthetic and self-contained. Checks must be **red before** the
task and **green after** it; `npm run bench:verify` enforces this for file-based
checks.

| Fixture | Used by | Planted defects |
|---|---|---|
| `devquiz/` | `mech-*`, `impl-*` | None. Synthetic spec with F-01..F-14, Q-01..Q-11 and F-01 AC1. |
| `buggy-python/` | `debug-calc` | `add` subtracts, `average([])` divides by zero, `clamp` off-by-one. |
| `buggy-python-parse/` | `debug-parse` | Duration parser rejects spaces, accepts `90m` and `1h90m`. |
| `buggy-python-state/` | `debug-state` | Cart shares the input list, removes all matches, ignores missing updates, accepts negative values. |
| `buggy-python-search/` | `debug-search` | Binary search returns any match instead of the first; `find_all` is inverted. |

For a debug fixture, the test file is part of the contract: the check verifies
its SHA-1 and refuses a run that edits the tests instead of the implementation.
