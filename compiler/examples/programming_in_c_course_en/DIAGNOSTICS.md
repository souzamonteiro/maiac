# Diagnostics - programming_in_c_course_en

Date: 2026-04-30
Target: MaiaC (C89)
Dataset: 48 C89 programs in 13 categories

## Executive Summary

The converted suite is valid C89 and compiles with native gcc.
All C++ files were removed from this directory (only `.c` remain).

Full parity execution (`run_all.sh`) across all 13 categories produced:

- 24 passed
- 16 failed
- 8 skipped

## Result Table (Like C++ Diagnostics)

| Category | Programs | Passed | Failed | Skipped | Notes |
|----------|----------|--------|--------|---------|-------|
| 01_basics | 4 | 3 | 1 | 0 | `data_input.c` differs on interactive input/runtime behavior |
| 02_control_flow | 3 | 1 | 1 | 1 | `conditionals_with_loops.c` skipped (known scanf `%c` loop issue) |
| 03_functions | 8 | 7 | 0 | 1 | one source skipped by MaiaC build/runtime path |
| 04_classes | 4 | 4 | 0 | 0 | full parity |
| 05_inheritance | 6 | 0 | 3 | 3 | advanced struct/dispatch adaptations partially unsupported |
| 06_polymorphism | 2 | 0 | 0 | 2 | function-pointer polymorphism currently skipped |
| 07_overloading | 4 | 2 | 2 | 0 | explicit typed replacements partially diverge |
| 08_templates | 1 | 1 | 0 | 0 | template-to-macro adaptation passes |
| 09_pointers | 4 | 0 | 4 | 0 | pointer-heavy outputs diverge in runtime comparison |
| 10_strings | 8 | 3 | 5 | 0 | string/pointer runtime differences |
| 11_exceptions | 1 | 1 | 0 | 0 | error-code adaptation passes |
| 12_namespaces | 2 | 2 | 0 | 0 | prefix-based namespace adaptation passes |
| 13_misc | 1 | 0 | 0 | 1 | MaiaC build skipped for command-line/env case |

## Verified Facts

1. All 48 `.c` files compile with:

## Verified Facts

1. All 48 `.c` files compile with:

```bash
gcc -std=c89 -Wall -Wextra
```

2. MaiaC build generates `.wat/.wasm/.js` for supported sources.

3. `run_all.sh` now:
- builds each source before execution (prevents dist-runner overwrite mismatch)
- injects automatic input for interactive programs when no `input.txt` exists
- applies per-test timeout protection
- skips known hang case: `conditionals_with_loops.c`

## Known Differences

### Interactive stdin behavior
When no `input.txt` exists, automatic piped defaults are used.
Even with defaults, some interactive/runtime behaviors still diverge between native gcc and MaiaC wasm.

Observed example:
- `01_basics/data_input.c`
- gcc/native and MaiaC/wasm produce different numeric input behavior in some runs

This is tracked as parity divergence, not syntax/compile failure.

## Recommendations

1. Add explicit `input.txt` per interactive source to improve determinism.
2. Keep C89 declarations at block start (already enforced in converted files).
3. Keep using explicit and bounded scanf formats (`%49s`, `%254s`).
4. Re-run parity after each MaiaC runtime/backend change:

```bash
bash build_all.sh
bash run_all.sh
```
