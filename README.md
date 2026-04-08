# MaiaC (WebC)

MaiaC is a C-to-WebAssembly compiler focused on a practical C89 subset and a browser/Node execution workflow.

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

Includes:

- Preprocessor tests.
- C89 mini-suite runtime validation.
- Large end-to-end example test.

Optional JSON report:

```bash
node compiler/tests/test-all.js --json-out compiler/tests/outputs/test-report.json
```

For mini-suite artifacts (disabled by default):

```bash
MAIAC_WRITE_TEST_OUTPUTS=1 node compiler/tests/test-c89-mini-suite.js
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
