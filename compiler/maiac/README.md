# MaiaC compiler scaffold (v1)

This folder contains a scalable compiler architecture with clean layers:

1. frontend: source parsing and CST adapters
2. ast: canonical AST nodes
3. semantic: symbol and type validation
4. ir: lowering from AST to MIR
5. backend/wat: MIR to WAT emitter
6. runtime-abi: host import contracts (browser/node)
7. pipeline: end-to-end compile flow

## Current vertical slice

Frontend parser source:

- uses generated MaiaCC parser from ../C-parser.js (complete grammar)
- then lowers validated tokens into the current v1 subset AST

Supported subset:

- single function `int main() { ... }`
- integer literals and arithmetic (`+ - * /`)
- call statement `js_print_i32(expr);`
- `return expr;`

No libc is used. Host functions are imported from JavaScript runtime.

## Commands

Compile C source to WAT:

```bash
node src/cli/maiac.js path/to/file.c
```

Run E2E smoke test:

```bash
npm test
```
