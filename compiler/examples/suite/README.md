# MaiaC C89 Example Suite

Focused runtime-oriented examples that validate MaiaC from C89 source to WAT/WASM and through the generated Node dist runner.

## Layout

- `01_operators` - arithmetic, relational, logical, bitwise, ternary
- `02_control_flow` - if/else, loops, switch, break/continue, goto
- `03_functions` - recursion, pointer-based mutation, function pointers
- `04_arrays` - 1D arrays, matrices, sorting
- `05_pointers` - pointer arithmetic, pointer-to-pointer, pointer arrays
- `06_structs_enums` - struct, nested struct, union, enum, typedef
- `07_memory` - malloc/free and dynamic writes
- `08_strings` - strlen/strcmp/strcpy/strcat/strstr
- `09_preprocessor` - local includes and macro expansion
- `10_stdlib_math` - stdlib conversions and math support
- `11_host_extern` - host import bridge (`__console__log`, `__Math__sqrt`)

Each directory contains:

- one focused `.c` file
- `expected_output.txt`
- generated `dist/` after build

## Usage

From the repository root:

```bash
bash compiler/examples/suite/build_all.sh
bash compiler/examples/suite/run_all.sh
```

Filter one case:

```bash
bash compiler/examples/suite/build_all.sh 09_preprocessor
bash compiler/examples/suite/run_all.sh 09_preprocessor
```

## Goal

This suite is intentionally close in spirit to the MaiaCpp suite, but targets MaiaC directly so every case is native C89 input. It is meant to expose parser, lowering, runtime, library, and dist-runner regressions with small, inspectable programs.

## Current Observations

- The current suite is a green regression suite: every included case builds, runs, and matches expected output.
- MaiaC looks solid for the practical subset covered here: control flow, function calls, arrays, pointers, structs/enums, focused preprocessing, host externs, and basic runtime integration all passed end-to-end.
- The suite does not prove full libc/runtime breadth. During construction, broader heap-array and math/libc patterns were trimmed down to the subset that is stable today.
- In practice, this means the suite is good evidence for current stability, but it should not be read as proof that all hosted C89 library behavior is equally mature.

## Pending Expansion

- Add dedicated examples for richer `stdio` file operations.
- Add standalone examples for `time`, `locale`, `stdarg`, and `setjmp/longjmp`.
- Add a separate diagnostic suite for more aggressive patterns that may still expose compiler/runtime gaps.