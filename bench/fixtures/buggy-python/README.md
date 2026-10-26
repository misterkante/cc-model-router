# buggy-python fixture

[English](README.md) · [Français](README.fr.md)

Minimal Python fixture for the `debug-calc` task.

Three bugs are planted in `calc.py`:

1. `add` subtracts instead of adding;
2. `average([])` divides by zero;
3. `clamp` returns `value + 1` instead of `value`.

`test_calc.py` must stay unchanged: the check verifies its SHA-1 and runs
`python3 -m unittest -q test_calc`. The tests must fail before the fix and pass
after it.

Do not "fix" the tests; the task is to fix the implementation.
