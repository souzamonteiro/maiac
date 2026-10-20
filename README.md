# MaiaC (WebC)

MaiaC is a C-to-WebAssembly compiler focused on a practical C89 subset and a browser/Node execution workflow.

## Process Documentation

Mandatory cross-repository synchronization workflow:

- [docs/Maia_Ecosystem_Synchronization_Protocol.md](docs/Maia_Ecosystem_Synchronization_Protocol.md)

<img src="images/TheWebC.png" style="width: 512px; height: auto;" />

## Overview

MaiaC currently provides:

- C source parsing from EBNF-generated parser artifacts.
- Semantic lowering to a WAT module model.
- WAT emission through template-based backend code.
- Validation/assembly through MaiaWASM.
- Runtime execution support in Node and browser wrappers.

The project uses two local submodules:

- MaiaCC: grammar-to-parser generation.
- MaiaWASM: WAT assembler and validation pipeline.

## Repository Structure

Adjacent string literals retain their C89 concatenation semantics, including
escape boundaries, static pointer/aggregate initialization and array sizes.
Generated grammar rules recognize the fragments; semantic processing combines
their decoded values. Struct-returning calls use independent frame storage per
call expression, including nested arguments and indirect calls, without growing
the linear stack on each loop iteration. Return-value copies evaluate the source
expression once. Integer suffixes and unsigned struct-field types survive into
comparison/division lowering, including `UINT_MAX` guards. Regressions execute in WebAssembly:
`compiler/tests/test-adjacent-string-literals.js` and
`compiler/tests/test-struct-return-temporaries.js` and
`compiler/tests/test-integer-literal-signedness.js`.
Assignments through `struct **` update pointer storage, while assignments through
`struct *` retain whole-struct copying. The pointer-indirection regression checks
linked-list tails, adjacent canaries and dereferenced member updates in WASM.

Static arrays and structs retain their positional aggregate initializers in
linear memory, including nested braces, zero filling, strings and references
to static tables/objects. Static local aggregates are initialized once. This
supports MaiaCC's generated lexer instruction and pattern tables. Unsupported
static expressions and excess elements produce diagnostics. Static designated
initializers remain unsupported. Struct-pointer increments use the pointee
layout size. `compiler/tests/test-static-aggregate-initializers.js` exercises
these contracts in actual WebAssembly execution.

Function pointers returning `void` retain a no-result WebAssembly signature,
including local variables, indexed pointers and nested struct callbacks.
`compiler/tests/test-void-callbacks.js` covers those calls and typed arguments.
It also verifies member access after functions returning struct pointers,
including nested fields and floating values.
Struct-pointer casts retain their target layout, including typedef names.
Arithmetic on pointer fields uses the pointee size, so a `char*` buffer advances
one byte per character during repeated string appends.

The string library definitions use the `size_t` signatures in their public
header. Guest function definitions take precedence over standard host imports,
so linking the C library executes its C implementation in WebAssembly.
`compiler/tests/test-string-library-contracts.js` checks header compatibility
with strict C89 and runs the linked functions without host string imports.
`compiler/tests/test-stdlib-allocator.js` exercises the C allocator through
repeated growth, shrinkage and free cycles, byte preservation and actual WASM
memory growth. Pointer arithmetic on casts resolves typedef struct layouts;
narrow integer casts retain the target width before integer promotion.
Void functions restore their linear stack frame on implicit fallthrough as well
as explicit returns. `compiler/tests/test-void-fallthrough-frames.js` verifies
the stack pointer and caller locals across 20,000 nested calls.

- `compiler/`: parser integration, semantic analysis, lowering, WAT generation, tests.
- `grammar/`: C grammar source files.
- `tools/`: parser generation scripts, runtime helpers, browser runner.
- `bin/`: convenience wrappers (`webc.sh`, `run-test-node.sh`, `run-wasm-browser.sh`).
- `docs/`: project documentation.
- `maiacc/`: MaiaCC submodule.
- `maiawasm/`: MaiaWASM submodule.

## Quick Start

### 1) Build the C parser from EBNF

```bash
bash tools/build-c-parser.sh
```

### 2) Compile a C file to WAT and validate

```bash
bash bin/webc.sh --file ./compiler/examples/test.c --wat-out ./out/test.wat
```

### 3) Run a compiled program in Node

```bash
bash bin/run-test-node.sh compiler/examples/test.c
```

### 4) Run in browser (development runner)

```bash
bash bin/run-wasm-browser.sh
```

Then open:

- `http://127.0.0.1:8080/tools/browser/run-wasm.html`

## Runtime Tooling (Consistent Flow)

### `tools/webc.js` (compile + wrapper + optional run + dist)

`webc` compiles a C source and emits:

- `<out>.wasm`
- `<out>.js` wrapper (`createImports()` + `run()`)
- optional `<out>.wat`

It can also package a complete distributable folder (`--dist`) containing browser and Node runners.

Example:

```bash
node tools/webc.js compiler/examples/test.c -o out/test --wat
```

Run immediately:

```bash
node tools/webc.js compiler/examples/test.c -o out/test --run
```

Optional (experimental include expansion):

```bash
node tools/webc.js compiler/examples/test.c -o out/test --run --resolve-system-includes
```

Create distribution package (browser + node):

```bash
node tools/webc.js compiler/examples/test.c --dist --out-dir dist --name test --wat
```

Create dist and run generated Node runner in one step:

```bash
node tools/webc.js compiler/examples/test.c --dist-run --out-dir dist --name test
```

Dist outputs include:

- `dist/test.wasm`
- `dist/test.js`
- `dist/test.wat` (when `--wat` is used)
- `dist/manifest.json`
- `dist/browser-runner.html`
- `dist/browser-memory-file-store.js`
- `dist/node-runner.js`
- `dist/node-runner.sh`

Run from dist in Node:

```bash
node dist/node-runner.js
# or
bash dist/node-runner.sh
```

Run from dist in browser: serve the repo root and open `dist/browser-runner.html`.

### `tools/create-dist.js` (compatibility wrapper)

`create-dist.js` remains available for backward compatibility and delegates to `webc --dist` internally:

```bash
node tools/create-dist.js compiler/examples/test.c -o dist --name test --wat
```

### `tools/host-env-builder.js` (extern `__host__path` bridge)

`host-env-builder` converts compiler `hostImports` metadata into `imports.env` functions.

C example:

```c
extern void __console__log(char *msg);
extern double __Math__sin(double x);
```

At runtime this maps to `console.log(...)` and `Math.sin(...)`, with automatic C string dereference for `char *` parameters.

## Recommended Validation Flow

Use this sequence to validate compiler/runtime behavior quickly and consistently.

### 1) Core large example (`compiler/examples/test.c`)

```bash
node tools/webc.js compiler/examples/test.c -o out/test --run
node tools/run-test-node.js compiler/examples/test.c
node tools/webc.js compiler/examples/test.c --dist --out-dir dist --name test
node dist/node-runner.js
```

Expected result: all commands complete and return `0`.

### 2) Host extern bridge (`compiler/examples/test-extern.c`)

```bash
node tools/webc.js compiler/examples/test-extern.c -o out/test-extern --run
node tools/run-test-node.js compiler/examples/test-extern.c
```

Expected result: host calls such as `__console__log` and `__Math__sqrt` execute correctly and return `0`.

### 3) About `--resolve-system-includes`

- This flag is optional and currently experimental for complex sources.
- It is useful when you explicitly want inline expansion of system headers.
- The default validation path for `test.c` and `test-extern.c` should run without this flag.

## `setjmp/longjmp` Runtime Semantics (Current)

- Current implementation is host-assisted and **emulated resume**.
- `longjmp` restores `__stack_ptr`/`__frame_ptr`, signals unwind, and runtime re-enters the program entrypoint.
- The next `setjmp` capture for the same `jmp_buf` returns the pending value (`longjmp(..., 0)` normalizes to `1`).
- This is now handled consistently in:
	- `tools/run-test-node.js`
	- `tools/webc.js --run`
	- generated wrapper `run()`
	- `webc --dist` browser runner page
	- `webc --dist` node runner scripts

## Compiler CLI

Main CLI entrypoint:

- `compiler/c-compiler.js`

Typical options:

- `--code <c-code>`: compile inline source.
- `--file <path>`: compile source from file.
- `--ast`: print parse tree.
- `--print-json`, `--print-xml`: print parse outputs.
- `--json-out`, `--xml-out`: write parse outputs.
- `--wat-out`: write generated WAT.
- `--wasm-out`: write assembled WASM.
- `--no-wat`: suppress WAT stdout.
- `--no-validate`: skip validation/assembly.

Example:

```bash
node compiler/c-compiler.js --file ./compiler/examples/test.c --wat-out ./out/test.wat --wasm-out ./out/test.wasm
```

## Test Strategy

Run the full bundle:

```bash
node compiler/tests/test-all.js
```

The full bundle includes the C89 MaiaRegex program tests compiled to WASM with
this repository's `maiaregex` submodule and C allocator implementation. Run
`npm run test:maiaregex` for that integration alone. It asserts the guest test
report and return value, including heap growth for long iterative matches.

Run full regression (bundle + additional focused diagnostics):

```bash
bash tools/run-full-tests.sh
# or
npm run test:full
```

Includes:

- Preprocessor tests.
- C89 mini-suite runtime validation.
- Rich C89 example-suite dist/runtime validation (`compiler/examples/suite/`).
- Large end-to-end example test.
- `stdarg` end-to-end tests.
- `setjmp/longjmp` bootstrap + emulated-resume tests.

The full-regression script also executes focused tests that are intentionally kept
outside `test-all.js` (debug/diagnostic pointer and WAT checks) to provide a
broader post-change safety net.

Optional JSON report:

```bash
node compiler/tests/test-all.js --json-out compiler/tests/outputs/test-report.json
```

For mini-suite artifacts (disabled by default):

```bash
MAIAC_WRITE_TEST_OUTPUTS=1 node compiler/tests/test-c89-mini-suite.js
```

For the rich example suite directly:

```bash
bash compiler/examples/suite/build_all.sh
bash compiler/examples/suite/run_all.sh
```

## Examples (Large + Small)

### Large Example (`test.c`) in Node

```bash
node tools/examples/run-test-node-example.js
```

### Large Example (`test.c`) in Browser

1. Build wasm:

```bash
node tools/examples/build-test-wasm.js
```

2. Serve the repository root:

```bash
bash bin/run-wasm-browser.sh
```

3. Open:

- `http://127.0.0.1:8080/tools/browser/test-large.html`

### Small Example (`simple_add.c`) in Node

```bash
node tools/examples/build-simple-add-wasm.js
node tools/examples/run-simple-add-node.js
```

### Small Example (`simple_add.c`) in Browser

After starting the same browser server (`bin/run-wasm-browser.sh`), open:

- `http://127.0.0.1:8080/tools/browser/simple-add.html`

## Architecture Documentation

For system design, data flow, and diagrams, see:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

Bootstrap details:

- [docs/MAIAC_BOOTSTRAP.md](docs/MAIAC_BOOTSTRAP.md)

## Consistency Rules for Submodules

- `maiacc` in MaiaC and MaiaWASM should reference the same canonical MaiaCC commit.
- Parser changes should be made in grammar sources and regenerated, not edited directly in generated parser files.
- When MaiaWASM parser changes are required, update `grammar/WAT.ebnf`, regenerate `assembler/wat-parser.js`, and then update MaiaC submodule pointer.

## Current Scope and Notes

- Current target is a practical C89 subset with strong runtime validation.
- Some advanced C/library features remain intentionally out of scope.
- Keep generated test artifacts out of version control unless explicitly needed.
