# MaiaC Parity Implementation Checklist

Date: 2026-04-28

This checklist turns the parity roadmap into concrete execution items.

## Phase 1 — Core Semantic Fixes

### 1. Indirect calls and function pointers
- [x] Reproduce failure with `function_array_dispatch_demo.c`
- [x] Reproduce failure with `function_table_demo.c`
- [x] Inspect generated WAT for function pointer loads and `call_indirect`
- [x] Verify function table contents and indices
- [x] Verify emitted indirect function type signature
- [ ] Add/confirm minimal compiler probe for local function pointer calls
- [x] Fix incorrect lowering
- [x] Re-run parity examples for function pointers

Notes:
- Root cause found: indexed postfix expressions such as `steps[i](value)` were returning early from indexed-access lowering and never reached indirect call emission.
- Implemented fix in `compiler/c-compiler.js` so index-followed-by-call now emits `call_indirect`.
- Result: `function_array_dispatch_demo.c` and `function_table_demo.c` now pass.

### 2. Struct pass-by-value
- [x] Reproduce failure with `struct_layout_demo.c`
- [x] Build a minimal `struct Pair` by-value probe
- [x] Inspect callee parameter layout
- [x] Fix aggregate argument lowering
- [x] Re-run struct examples

Notes:
- Root cause found: struct parameters were missing resolved layout metadata during parameter extraction, so the callee frame treated them like 4-byte scalars.
- A second issue in `buildFunctionPrologue()` stored the incoming parameter pointer value instead of copying aggregate bytes into the callee frame.
- Implemented fix in `compiler/c-compiler.js` to resolve struct layouts for parameters and copy by-value aggregate arguments into frame-backed storage.
- Result: `struct_layout_demo.c` now passes.

### 2b. Member-style callbacks through struct fields
- [x] Reproduce failure with `method_style_counter_demo.c`
- [x] Inspect direct member-access followed by call
- [x] Fix indirect call lowering for `obj.cb(...)`
- [x] Re-run callback-style struct example

Notes:
- Root cause found: direct member access returned the loaded field value before call lowering had a chance to emit `call_indirect`.
- Implemented fix in `compiler/c-compiler.js` so member-access callees followed by `(...)` are lowered as indirect calls.
- Result: `method_style_counter_demo.c` now passes.

### 3. Pointer-based struct and embedded-array stores
- [x] Reproduce `stack_array_demo.c`
- [x] Reproduce `queue_ring_demo.c`
- [x] Inspect lvalue lowering for `->field` stores
- [x] Inspect lvalue lowering for embedded array stores
- [x] Fix store emission paths
- [x] Re-run container examples

Notes:
- Root cause found: postfix `++` and `--` on indirect lvalues were silently bypassed by `compilePostfixExpression()` whenever the target was a struct member or indexed access.
- This broke state transitions such as `s->top++`, `s->top--`, `q->count++`, and `q->tail = ...` patterns built on those values.
- Implemented fix in `compiler/c-compiler.js` by adding indirect-lvalue update lowering and routing both prefix/postfix update expressions through it.
- Result: `stack_array_demo.c` and `queue_ring_demo.c` now pass.

## Phase 2 — Codegen Robustness

### 4. Recursive / void stack discipline
- [x] Reproduce `tree_walk_demo.c` validation failure
- [x] Reproduce `triangle_pattern_demo.c` validation failure
- [x] Inspect generated WAT stack balance
- [x] Fix invalid branch/return stack effects
- [x] Re-run failing recursive examples

Notes:
- Root cause found: `void` functions were incorrectly lowered with `(result i32)` because a null return type was being collapsed to `'i32'` during function model construction.
- This made early `return;` paths invalid in generated WAT for recursive void functions.
- Implemented fix in `compiler/c-compiler.js` so null result types are preserved for `void` functions.
- Result: `tree_walk_demo.c` and `triangle_pattern_demo.c` now pass.

### 5. Low-level pointer casts and byte writes
- [x] Reproduce `generic_swap_demo.c` build failure
- [x] Inspect cast + byte-indexing codegen
- [x] Fix emitted load/store sequence
- [x] Re-run low-level pointer examples

Notes:
- Root cause found: internal temporary locals were being declared as `i8`, which is not a valid WebAssembly local type.
- Implemented fix in `compiler/c-compiler.js` to normalize internal temporary locals through `toWatType()`, yielding valid `i32` locals for byte-oriented operations.
- Result: `generic_swap_demo.c` now passes.

## Phase 3 — Strings and Pointer Semantics

### 6. Strings and character indexing
- [x] Reproduce `palindrome_batch_demo.c`
- [x] Add a minimal `strlen` probe
- [x] Add a minimal `s[i]` probe
- [x] Fix string pointer / character load semantics
- [x] Re-run string-oriented examples

Notes:
- Root cause found: unresolved `strlen` calls were falling back to the compiler's “unknown function call returns 0” path, so palindrome logic always compared from `right = -1`.
- Implemented fix by registering `strlen` as a fixed-signature C89 host function and adding its runtime implementation in `src/runtime/c89-js-hosts.js`.
- Result: `palindrome_batch_demo.c` now passes.

## Phase 4 — Unsupported Platform Features

### 7. Threading boundary
- [x] Decide whether `pthread` is unsupported or partially supported
- [x] If unsupported, document it explicitly
- [x] If supported, add host/runtime implementation tasks
- [x] Update parity expectations accordingly

Decision (2026-04-28):
- For the current Node.js/JS host runtime path, `pthread` is treated as unsupported.
- In parallel, a dedicated implementation track is opened for C/WAT-level threading using MaiaWASM SMP instructions and a non-JS host/runtime integration path.

Execution tracks:
- Track A — JS runtime boundary
	- Keep `pthread_counter_demo.c` as expected-fail in the JS parity gate.
	- Document clearly that pass/fail mismatch here is a platform boundary, not a MaiaC codegen regression.

- Track B — C/WAT threaded runtime (MaiaWASM SMP)
	- Define ABI between MaiaC pthread calls and MaiaWASM SMP primitives.
	- Implement pthread core subset (`pthread_create`, `pthread_join`, `pthread_mutex_*`) in C/WAT runtime libraries.
	- Add synchronization and memory-ordering validation probes.
	- Promote `pthread_counter_demo.c` from expected-fail to required-pass once the runtime path is available.

## Validation Gate
- [x] Run `bash compare_native_vs_maiac.sh`
- [x] Record updated counts in `PARITY_DIAGNOSTIC_AND_ROADMAP.md`
- [ ] Keep new regressions out of previously passing examples

Current parity snapshot:
- PASS = 22
- FAIL = 1
- MAIAC_BUILD_FAIL = 0
