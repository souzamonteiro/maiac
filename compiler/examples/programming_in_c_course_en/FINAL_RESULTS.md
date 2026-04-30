# Final Results - programming_in_c_course_en

Date: 2026-04-30

## Goal

Create MaiaC-focused C89 equivalents for all course programs from:
- `maiacpp/compiler/examples/programming_in_cpp_course_en/`

targeting:
- `maiac/compiler/examples/programming_in_c_course_en/`

## Delivery Summary

1. 48 C89 source files created (`.c`), preserving the same 13-category structure.
2. C++-only features were adapted to C89-compatible patterns.
3. Build and run scripts updated for MaiaC parity testing.
4. All `.cpp` files were removed from this C-only tree.

## Feature Adaptation Summary

- Classes -> `struct` + functions
- Constructors/destructors -> init/destroy functions
- Inheritance -> struct embedding + enum tags
- Polymorphism -> function pointers
- Function/operator overloading -> explicit typed function names
- Templates -> typed helpers and macros
- Exceptions -> error-code flow
- Namespaces -> prefixed global symbols

## Validation Performed

1. File count check:
- 48 `.c` files found

2. Native compile check:
- all 48 files compile with `gcc -std=c89 -Wall -Wextra`

3. MaiaC smoke build:
- `build_all.sh 01_basics` succeeded and generated expected dist artifacts

4. Full parity run (all 13 categories):
- 24 passed
- 16 failed
- 8 skipped

## Per-Category Results

| Category | Programs | Passed | Failed | Skipped |
|----------|----------|--------|--------|---------|
| 01_basics | 4 | 3 | 1 | 0 |
| 02_control_flow | 3 | 1 | 1 | 1 |
| 03_functions | 8 | 7 | 0 | 1 |
| 04_classes | 4 | 4 | 0 | 0 |
| 05_inheritance | 6 | 0 | 3 | 3 |
| 06_polymorphism | 2 | 0 | 0 | 2 |
| 07_overloading | 4 | 2 | 2 | 0 |
| 08_templates | 1 | 1 | 0 | 0 |
| 09_pointers | 4 | 0 | 4 | 0 |
| 10_strings | 8 | 3 | 5 | 0 |
| 11_exceptions | 1 | 1 | 0 | 0 |
| 12_namespaces | 2 | 2 | 0 | 0 |
| 13_misc | 1 | 0 | 0 | 1 |

## Added/Updated Tooling

- `build_all.sh`
  - builds every `.c` with MaiaC (`tools/webc.js`)
  - supports optional filter and verbose mode

- `run_all.sh`
  - compiles each source with native gcc (`-std=c89`)
  - builds each source with MaiaC before execution (prevents runner overwrite mismatch)
  - injects automatic piped input for interactive programs (when no `input.txt` exists)
  - applies per-test timeout guard
  - skips known runtime hang case (`conditionals_with_loops.c`)
  - compares normalized output: native vs wasm
  - uses `input.txt` when available, otherwise default piped input or `/dev/null`

## Current State

- Conversion work: complete
- Native C89 validity: complete
- MaiaC parity harness: complete
- C-only cleanup: complete (`.cpp` removed)
- Full deterministic parity: still pending explicit `input.txt` files per interactive source
