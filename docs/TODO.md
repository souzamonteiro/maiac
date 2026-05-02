# TODO

## Active Follow-ups

- [ ] Publish a supported C89 feature matrix in docs (implemented vs partial vs unsupported).
- [ ] Add a dedicated "Known Limitations" section with concrete examples and expected behavior.
- [ ] Document and investigate escaped-quote/backslash behavior in string literals (for example, `\"`) with MaiaCC parser generation. Keep MaiaC grammar stable and prioritize a generator-level fix before any new grammar workaround.
- [ ] Add a browser smoke test workflow that validates loading and running a compiled WASM module via the web runner path.
- [ ] Add a CI guard for submodule consistency (`maiacc` alignment across MaiaC and MaiaWASM).
- [ ] Add golden-output assertions for key float/double formatting paths to prevent regressions in host `printf` behavior.

## Follow-ups From `compiler/examples/suite`

- [ ] Expand the green suite to cover `stdio` file workflows (`fopen`/`fread`/`fwrite`/`fseek`) directly in `compiler/examples/suite`, even though runtime host tests already cover them.
- [ ] Expand the green suite to cover `time`, `locale`, `stdarg`, and `setjmp/longjmp` with standalone example programs, so the example suite reflects more of `test-all.js`.
- [ ] Add a separate diagnostic suite for intentionally aggressive/possibly-red cases, instead of overloading the green suite with unstable expectations.
- [ ] Investigate dynamic heap array behavior beyond scalar `malloc(sizeof(T))` usage. The suite validated scalar heap read/write reliably, but richer indexed heap-array patterns were not stable enough to keep in the green suite.
- [ ] Investigate broader libc/math coverage before claiming practical support beyond the currently validated subset. The green suite ended up confirming stable behavior for only a narrow math path (`sin(0.0)`) and a focused subset of string/libc calls.
- [ ] Reconcile the rich example suite evidence with `docs/C89_CONFORMANCE_MATRIX.md`, especially for memory, libc, and runtime-library breadth claims.

## Critical If Reproduced

- [ ] If dynamic heap arrays continue failing outside scalar `malloc` patterns, treat that as high-priority runtime/compiler work because it limits confidence in practical heap-backed container code.
- [ ] If additional libc/math functions regress under direct example-suite coverage, prioritize that quickly because it weakens the claim that MaiaC is stable for practical hosted C89 programs.

## Concrete Diagnostic-Suite Findings

- [ ] Add new aggressive hosted-lib diagnostic cases beyond the now-resolved baseline (`FILE`, `stdarg`, `time`, `locale`, `setjmp`) to catch future regressions earlier.

## Completed Milestones

- [x] Global/static memory lowering fixed for `07_globals_static_memory.c`.
- [x] Real `goto` lowering implemented (forward-goto scoped behavior).
- [x] Indirect function-pointer calls lowered in WAT backend.
- [x] `for`-loop lowering stabilized for current regression suite.
- [x] Preprocessor expanded (`#include`, conditionals, `#undef`) for current supported subset.
- [x] Large example end-to-end runtime test added and passing.
- [x] Test artifact generation made opt-in (`MAIAC_WRITE_TEST_OUTPUTS=1`).
- [x] Rich C89 example suite added under `compiler/examples/suite` and integrated into `compiler/tests/test-all.js`.
- [x] Direct dist/example path now resolves system headers by default, so header-defined types like `FILE` are processed from real includes.
- [x] Direct dist/example hosted-lib regressions resolved for `FILE` stdio, `stdarg`, `time`, `locale`, and `setjmp/longjmp`.
