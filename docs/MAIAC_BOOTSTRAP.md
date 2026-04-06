# MaiaC bootstrap

This document defines the first practical workflow for MaiaC using the two local submodules:

- maiacc: parser generation
- maiawasm: WAT and assembler references

## 1) Generate C parser from EBNF with MaiaCC

Source grammar:

- grammar/C.ebnf

Command:

```bash
bash tools/build-c-parser.sh
```

Outputs:

- compiler/C-parser.js
- compiler/_c-grammar.xml

## 2) Generate WAT templates from C examples using Emscripten

Source examples:

- maiawasm/assembler/examples/c89-mini-suite/*.c
- maiawasm/assembler/examples/test.c

Command:

```bash
bash tools/gen-emscripten-wat-templates.sh
```

Outputs:

- compiler/templates/wat-from-emscripten/*.wasm
- compiler/templates/wat-from-emscripten/*.wat

## 3) Planned compiler direction

- Parse C with generated parser from grammar/C.ebnf.
- Build MaiaC AST and semantic checks for the supported C subset.
- Emit WAT using the generated templates as reference patterns.
- Target browser runtime only.
- No libc implementation in MaiaC; use JS/browser APIs through imports.

## Tooling requirements

- node
- emcc (Emscripten)
- wabt (wasm2wat) or binaryen (wasm-dis)
