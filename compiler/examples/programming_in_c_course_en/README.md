# Programming in C Course (English) - MaiaC C89 Suite

## Overview

This directory contains 48 C89 examples adapted from the English C++ course set.
The goal is to provide robust MaiaC test inputs using valid and idiomatic C89 code.

Source used for adaptation:
- `maiacpp/compiler/examples/programming_in_cpp_course_en/`

Target directory:
- `maiac/compiler/examples/programming_in_c_course_en/`

## Adaptation Rules

- C++ iostream (`cout`, `cin`) -> C stdio (`printf`, `scanf`)
- Classes -> `struct` + explicit functions
- Inheritance -> struct embedding + type tags (`enum`)
- Polymorphism (virtual methods) -> function pointers in structs
- Overloading -> explicit function names by type
- Templates -> typed helpers + macros
- Exceptions (`try/catch/throw`) -> error code pattern
- Namespaces -> symbol prefixes

## Directory Structure

- `01_basics`
- `02_control_flow`
- `03_functions`
- `04_classes`
- `05_inheritance`
- `06_polymorphism`
- `07_overloading`
- `08_templates`
- `09_pointers`
- `10_strings`
- `11_exceptions`
- `12_namespaces`
- `13_misc`
- `build_all.sh`
- `run_all.sh`
- `DIAGNOSTICS.md`
- `FINAL_RESULTS.md`

## Build

Build all `.c` files with MaiaC:

```bash
cd maiac/compiler/examples/programming_in_c_course_en
bash build_all.sh
```

Build only one category:

```bash
bash build_all.sh 01_basics
```

Verbose mode:

```bash
bash build_all.sh --verbose
```

## Run and Compare

`run_all.sh` compiles each source with native `gcc -std=c89`, builds the same source with MaiaC, and compares normalized outputs.

```bash
bash run_all.sh
bash run_all.sh 01_basics
```

Notes:
- If `input.txt` exists in a category folder, it is used as stdin.
- If no `input.txt` exists, default piped input is used for known interactive programs.
- Per-test timeout protection is enabled.
- Known hang case `conditionals_with_loops.c` is skipped.

## Final Results (Complete Run)

Complete parity run across all 48 C89 programs:

- 24 passed
- 16 failed
- 8 skipped

### Results by Category

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

## Current Status

- 48 C89 files created and validated with `gcc -std=c89`.
- C-only cleanup complete (`.cpp` files removed from this tree).
- Full parity results recorded in `FINAL_RESULTS.md`.
- Known runtime differences are tracked in `DIAGNOSTICS.md`.
