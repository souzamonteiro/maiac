# MaiaC Fix Plan for MaiaJS Stress Pipeline (2026-05-18)

## Context

During `maiajs/compiler/examples/build_test_dist.sh`, the pipeline (`MaiaJS -> MaiaCpp webcpp -> MaiaC webc`) failed after parser fixes with backend errors in MaiaC.

Observed errors in sequence:

1. `Unknown base symbol 'this' (C_getValue)`
2. `Unknown symbol 'this' (C_getValue)`
3. WAT validation stack underflow:
   - `Compiling function #40 failed: expected 1 elements on the stack for return, found 0`

## Root Causes Identified

## 1) Receiver alias mismatch (`this` vs `self`)

Generated C methods use signatures like:

- `int C_getValue(C* self)`

But lowered expressions still reference `this->value` in some paths.

MaiaC symbol resolution required explicit support to treat `this` as alias of the method receiver parameter (`self`).

## 2) Void host calls in value contexts

Some transpiled expressions use void-returning imports in value contexts (e.g. wrapped in casts/returns).

Without fallback value emission, WAT code can lose stack balance on return paths.

## Changes Applied

File updated:

- `maiac/compiler/c-compiler.js`

### A) Receiver alias support

Added robust `this` aliasing in:

- `resolveDirectSymbol(...)`
- `resolveSymbol(...)`

Resolution order:

1. direct parameter names: `self`, `__self`, `this`
2. case-insensitive name match for `self|this`
3. fallback to first pointer-like parameter

### B) Stack-safe void-call lowering

Updated call emission paths to push `i32.const 0` whenever:

- `keepValue === true`
- function/import result type is `null` (void)

This was applied in all relevant call lowering branches to prevent WAT return stack underflow.

## Validation Checklist

1. Rebuild parser/compiler chain source:
- `cd /Volumes/External_SSD/Documentos/Projects/maiajs`
- `bash compiler/examples/build_test_dist.sh`

2. If still failing, persist intermediate artifacts for inspection:
- `./bin/webjs.sh --file compiler/examples/test.js --cpp-out /tmp/maiajs_diag_test.cpp --no-webcpp`
- `./maiacpp/bin/webcpp.sh /tmp/maiajs_diag_test.cpp --c-out /tmp/maiajs_diag_test.c --wat-out /tmp/maiajs_diag_test.wat --wasm-out /tmp/maiajs_diag_test.wasm`

3. Confirm no `this` symbol errors and no WAT stack-underflow validation error.

## Protocol Alignment

These fixes are in MaiaC backend behavior and must be synchronized in suite order when propagated:

1. MaiaCC (if parser-generator changes exist)
2. MaiaWASM
3. MaiaC
4. MaiaCpp
5. MaiaJS

For this issue, direct parser-generator changes were not required in MaiaC; changes were in compiler lowering logic.
