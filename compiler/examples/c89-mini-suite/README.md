# C89 Mini Suite (Emscripten Validation)

Small C89 programs split by feature area to approximate the coverage of `examples/test.c` with focused files.

## Files

- `01_arithmetic_ops.c`: arithmetic, relational, logical, ternary, precedence.
- `02_control_flow.c`: `if/else`, `switch`, `for`, `while`, `do-while`, `break`, `continue`, `goto`.
- `03_functions_recursion.c`: function calls, recursion, binary search recursion.
- `04_arrays_matrix.c`: arrays, 2D matrix iteration, bubble sort.
- `05_pointers_and_funcptr.c`: pointers, pointer-to-pointer, function pointers, array of pointers.
- `06_struct_union_enum.c`: `struct`, `union`, `enum`, `typedef`.
- `07_globals_static_memory.c`: globals, static storage, simple allocator simulation.
- `08_bitwise_casts.c`: bitwise operations and type casting patterns.
- `09_preprocessor_strings.c`: macros, string literals, manual `strlen`-style loop.

## End-to-End Validation

Run from project root:

```bash
node tests/test-emscripten-c89-roundtrip.js
```

This script does all stages:

1. Compile each file with `emcc` from `~/emsdk`.
2. Disassemble generated `.wasm` with `wasm-disassembler.js`.
3. Re-assemble generated `.wat` with `wat-assembler.js`.
4. Validate both original and roundtrip wasm with `WebAssembly.validate`.

Outputs are written to:

- `tests/outputs/emscripten-c89-roundtrip/`

## MaiaC Runtime Harness

To run MaiaC's own runtime validation for this suite:

```bash
node compiler/tests/test-c89-mini-suite.js
```

By default, this script validates and executes cases without writing generated `.pre.c`, `.wat`, and `.wasm` files.

To persist generated artifacts for debugging, run with:

```bash
MAIAC_WRITE_TEST_OUTPUTS=1 node compiler/tests/test-c89-mini-suite.js
```

Debug artifacts are written to:

- `compiler/tests/outputs/c89-mini-suite/`

## Robust Test Bundle

To run all current MaiaC validations in sequence:

```bash
node compiler/tests/test-all.js
```

To also emit a JSON report:

```bash
node compiler/tests/test-all.js --json-out compiler/tests/outputs/test-report.json
```

Or via environment variable:

```bash
MAIAC_TEST_REPORT_JSON=compiler/tests/outputs/test-report.json node compiler/tests/test-all.js
```

Current bundle includes:

- `compiler/tests/test-preprocessor.js` (unit/integration checks for macros, includes, conditionals, `#undef`, and recursive-include handling)
- `compiler/tests/test-c89-mini-suite.js`
- `compiler/tests/test-large-example-e2e.js`

### CI Integration

This repository includes a GitHub Actions workflow at:

- `.github/workflows/maiac-tests.yml`

It runs:

```bash
node compiler/tests/test-all.js
```

It is triggered manually only (`workflow_dispatch`).

When triggering, set input `generate_report=true` to run:

```bash
node compiler/tests/test-all.js --json-out compiler/tests/outputs/test-report.json
```

In that mode, it also publishes `compiler/tests/outputs/test-report.json` as artifact (`maiac-test-report`).
