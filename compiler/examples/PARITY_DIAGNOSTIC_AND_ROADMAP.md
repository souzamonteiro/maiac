# MaiaC Parity Diagnostic and Roadmap

Date: 2026-04-28

## Purpose

This document records the current GCC vs MaiaC parity status for the examples under `compiler/examples/c89-parity/`, identifies the most likely technical causes behind each class of failure, and proposes an implementation roadmap to move MaiaC toward reliable C89 coverage.

The parity suite is intentionally designed to expose real compiler/runtime gaps. A failing example is not a problem with the example itself; it is a reproducible signal that MaiaC still needs work in a specific language or code generation area.

## Current Validation Entry Point

Run from `compiler/examples`:

```bash
bash compare_native_vs_maiac.sh
```

The script:
- builds each example with `gcc -std=c89`
- builds the same source with MaiaC
- runs both outputs
- compares exit code and stdout
- reports build failures separately from output mismatches

## Current Status Summary

Latest run result:

- PASS = 22
- FAIL = 1
- NATIVE_BUILD_FAIL = 0
- MAIAC_BUILD_FAIL = 0

This means MaiaC already handles a meaningful subset of C89 examples, especially deterministic scalar algorithms, but still has major gaps in:

- host/platform integration

At this point, the remaining parity gap is concentrated in host/platform integration for threading.

## Passing Areas

The following categories currently work well enough to match GCC for the included examples:

### Algorithms / scalar control flow

These examples currently pass:

- `c89-parity/algorithms/bfs_grid_demo.c`
- `c89-parity/algorithms/factorial_iterative_demo.c`
- `c89-parity/algorithms/factorial_recursive_demo.c`
- `c89-parity/algorithms/merge_sort_demo.c`
- `c89-parity/algorithms/quicksort_demo.c`
- `c89-parity/algorithms/recursive_power_demo.c`
- `c89-parity/algorithms/search_and_sort_demo.c`
- `c89-parity/algorithms/selection_sort_demo.c`

### Some basic function usage

These examples currently pass:

- `c89-parity/basics/callback_pipeline_demo.c`
- `c89-parity/basics/function_array_dispatch_demo.c`
- `c89-parity/basics/function_table_demo.c`
- `c89-parity/basics/method_style_counter_demo.c`
- `c89-parity/basics/struct_layout_demo.c`
- `c89-parity/basics/variadic_sum_demo.c`

### Some pointer / linked data behavior

These examples currently pass:

- `c89-parity/data-structures/linked_list_demo.c`
- `c89-parity/data-structures/queue_ring_demo.c`
- `c89-parity/data-structures/stack_array_demo.c`

### Simple terminal output programs

These examples currently pass:

- `c89-parity/programs/ascii_frame_demo.c`
- `c89-parity/programs/palindrome_batch_demo.c`
- `c89-parity/programs/triangle_pattern_demo.c`

## Failing Areas by Category

### 1. Indirect function calls / function pointer arrays

Examples:

- `c89-parity/basics/function_array_dispatch_demo.c`
- `c89-parity/basics/function_table_demo.c`

Observed behavior:
- GCC computes the expected arithmetic results.
- MaiaC prints `0`, `1`, `2` instead of the actual function results.

Status:
- Fixed on 2026-04-28 for indexed function-pointer calls.

Root cause found:
- Indexed postfix expressions such as `steps[i](value)` were handled by the indexed-access path and returned before the call path was considered.
- As a result, MaiaC loaded and printed the function table index (`0`, `1`, `2`) instead of performing `call_indirect`.

Implemented fix:
- `compiler/c-compiler.js` now detects index-followed-by-call and emits `call_indirect` using the loaded callee index.

Current outcome:
- `c89-parity/basics/function_array_dispatch_demo.c` passes
- `c89-parity/basics/function_table_demo.c` passes

Why this matters:
- This blocks any serious C code that relies on dispatch tables, callbacks, virtual-method-like patterns, or plugin-style architecture.

### 2. Method-style callbacks stored inside structs

Example:

- `c89-parity/basics/method_style_counter_demo.c`

Observed behavior:
- GCC updates the struct field through the callback.
- MaiaC returns `0` instead of the expected updated values.

Status:
- Fixed on 2026-04-28 for direct member-access callbacks.

Root cause found:
- Direct member-access expressions such as `counter.change(&counter, 5)` returned the loaded function-table index before the call suffix path could emit `call_indirect`.

Implemented fix:
- `compiler/c-compiler.js` now detects member-access-followed-by-call and lowers it as an indirect call.

Current outcome:
- `c89-parity/basics/method_style_counter_demo.c` passes

Why this matters:
- This pattern is a compact reproducer for “object-like C”, which is common in embedded and systems code.

### 3. Struct pass-by-value

Example:

- `c89-parity/basics/struct_layout_demo.c`

Observed behavior:
- Direct field access in `main()` works (`origin=(3,5)` matched GCC).
- Functions receiving the struct by value return `0` for computed results.

Status:
- Fixed on 2026-04-28 for frame-backed by-value struct parameters.

Root cause found:
- Struct parameter extraction did not resolve `structLayout`, so by-value parameters were sized like 4-byte scalars.
- `buildFunctionPrologue()` also stored the incoming pointer value instead of copying aggregate bytes into the callee frame slot.

Implemented fix:
- Parameter extraction now resolves struct layout metadata.
- By-value struct parameters are copied byte-for-byte into callee frame-backed storage before field loads occur.

Current outcome:
- `c89-parity/basics/struct_layout_demo.c` passes

Why this matters:
- Struct-by-value is basic C89 behavior and heavily used in small utility code.

### 4. Generic byte-level swap

Example:

- `c89-parity/basics/generic_swap_demo.c`

Status:
- Fixed on 2026-04-28.

Root cause found:
- Internal compiler temporaries were being declared as `i8`, which is not a valid WebAssembly local type.

Implemented fix:
- Internal temporaries are now normalized through `toWatType()`, so byte-oriented helpers still use valid `i32` locals.

Current outcome:
- `c89-parity/basics/generic_swap_demo.c` passes

Why this matters:
- This is a good reproducer for low-level pointer arithmetic and cast handling.

### 5. Queue/stack mutation through struct pointers

Examples:

- `c89-parity/data-structures/queue_ring_demo.c`
- `c89-parity/data-structures/stack_array_demo.c`

Status:
- Fixed on 2026-04-28 for postfix updates on indirect lvalues.

Root cause found:
- Postfix `++` and `--` on indirect lvalues were bypassed when the target was a struct member or indexed access.
- This prevented state updates such as `s->top++`, `s->top--`, `q->count++`, and related container transitions from being written back.

Implemented fix:
- `compiler/c-compiler.js` now lowers prefix/postfix updates through a generic indirect-lvalue path, so member and indexed targets are updated in memory.

Current outcome:
- `c89-parity/data-structures/queue_ring_demo.c` passes
- `c89-parity/data-structures/stack_array_demo.c` passes

Why this matters:
- This blocks most practical data structure implementations.

### 6. Recursive tree walking / recursive output generation

Examples:

- `c89-parity/data-structures/tree_walk_demo.c`
- `c89-parity/programs/triangle_pattern_demo.c`

Status:
- Fixed on 2026-04-28.

Root cause found:
- `void` functions were incorrectly assigned `(result i32)` during function model construction because null return types were collapsed to `'i32'`.
- This made plain `return;` paths invalid in generated WAT.

Implemented fix:
- Null result types are now preserved for `void` functions.

Current outcome:
- `c89-parity/data-structures/tree_walk_demo.c` passes
- `c89-parity/programs/triangle_pattern_demo.c` passes

Why this matters:
- This is a codegen correctness issue, not just a missing feature.
- It can break many recursive or nested-control-flow programs even when syntax and semantic analysis succeed.

### 7. String and pointer logic

Example:

- `c89-parity/programs/palindrome_batch_demo.c`

Status:
- Fixed on 2026-04-28 for `strlen`-based palindrome logic.

Root cause found:
- Unresolved `strlen` calls fell through the unknown-function path and produced `0`, which made the palindrome bounds logic degenerate.

Implemented fix:
- `strlen` is now lowered as a fixed-signature C89 host function and implemented in the default runtime hosts.

Current outcome:
- `c89-parity/programs/palindrome_batch_demo.c` passes

Why this matters:
- This affects real-world text handling, parsers, tokenizers, and many standard-library-like routines.

### 8. Host/platform integration

Example:

- `c89-parity/systems/pthread_counter_demo.c`

Observed behavior:
- GCC returns `counter=5`.
- MaiaC prints `counter=0`.

Likely cause:
- `pthread` behavior is not implemented or is stubbed.
- Even if linking succeeds, the runtime does not provide real thread creation, synchronization, or host-side updates.
- This is likely outside the current supported execution model and should be treated as an unsupported feature until a threading design exists.

Current policy (2026-04-28):
- In the current Node.js/JavaScript host runtime, `pthread` is explicitly unsupported.
- A separate implementation track will target C/WAT-level threading using MaiaWASM SMP instructions and a host/runtime path that is not constrained by JS threading limitations.

Why this matters:
- Not a short-term blocker for core C89 semantics, but important to document as unsupported.

## Diagnostic Interpretation

The parity suite suggests MaiaC is currently strongest in:
- scalar arithmetic
- loops
- recursion for simple scalar-return functions
- deterministic array algorithms when memory aliasing is limited
- basic variadic integer accumulation

The suite suggests MaiaC is currently weakest in:
- host/platform integration

## Probable Internal Root Causes

Based on the observed symptoms, the highest-probability remaining root cause is:

1. **Unsupported or incomplete threading/runtime integration**
  - `pthread` semantics are not implemented in the current host/runtime model.

## Recommended Debugging Order

The order below is chosen to maximize value while minimizing diagnostic noise.

### Phase 1 — Mark unsupported platform features explicitly (JS runtime path)

#### 1. Threading / `pthread`
Target example:
- `pthread_counter_demo.c`

Tasks:
- decide whether to:
  - mark `pthread` as unsupported for now, or
  - provide a documented host stub strategy
- update docs and comparison expectations accordingly

Status:
- `pthread` is now treated as unsupported in the current JS host runtime path.

### Phase 2 — Implement pthread runtime on C/WAT + MaiaWASM SMP

#### 2. Threading runtime implementation track
Target example:
- `pthread_counter_demo.c`

Tasks:
- define the pthread-to-runtime ABI used by MaiaC-generated code
- map synchronization primitives onto MaiaWASM SMP instructions
- implement minimal pthread subset in C/WAT runtime libraries:
  - `pthread_create`
  - `pthread_join`
  - `pthread_mutex_init`
  - `pthread_mutex_lock`
  - `pthread_mutex_unlock`
  - `pthread_mutex_destroy`
- add deterministic thread synchronization probes to compiler/examples and runtime tests
- switch `pthread_counter_demo.c` from expected-fail to expected-pass for SMP-capable targets

Expected outcome:
- clear boundary in JS runtime and a concrete path to real pthread support on SMP-capable targets

## Suggested Milestones

### Milestone A — Core semantic parity
Goal:
- all algorithm examples pass
- function pointer demos pass
- struct-by-value demo passes
- stack/queue demos pass

Definition of done:
- no function-pointer-related failures
- no basic struct mutation failures
- no queue/stack silent-output failures

### Milestone B — Documentation and support boundaries
Goal:
- clearly separate unsupported platform APIs from compiler bugs

Definition of done:
- JS runtime path documents `pthread` as unsupported
- SMP runtime path has an implementation plan with measurable gates

### Milestone C — Threaded runtime parity (SMP targets)
Goal:
- make `pthread_counter_demo.c` pass on the C/WAT runtime path backed by MaiaWASM SMP

Definition of done:
- pthread subset runtime is implemented and linked
- thread scheduling/synchronization tests are deterministic
- `pthread_counter_demo.c` passes on SMP-capable target configuration

## Recommended New Internal Compiler Tests

In addition to the example suite, add minimal compiler-level regression tests for these probes:

1. indirect call through local function pointer
2. indirect call through array of function pointers
3. struct argument passed by value
4. store to `ptr->field`
5. store to `ptr->array[i]`
6. byte-wise swap through casted `char *`
7. recursive void function with output
8. string palindrome primitive (`strlen` + indexing)

These tests should be as small as possible and live closer to compiler validation, while the examples remain end-to-end parity programs.

## Operational Recommendation

Keep `compare_native_vs_maiac.sh` as a standing parity gate.

Recommended workflow:
1. implement/fix one compiler feature
2. rerun parity suite
3. record delta in this document
4. only then move to the next cluster of failures

This will prevent regressions and provide visible evidence that MaiaC is approaching production readiness.

## Immediate Next Best Task

The highest-value next implementation target is:

**Explicit `pthread` support boundary or runtime implementation**

Why:
- all current compiler/codegen parity failures are resolved
- the only remaining mismatch is a host/runtime threading feature gap

Recommended immediate action split:
- short term: keep JS parity gate with `pthread` as documented expected-fail
- medium term: start the MaiaWASM SMP runtime implementation track in C/WAT

Together, these two areas are likely to remove a large portion of the current parity failures.
