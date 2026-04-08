# TODO

## Current compiler follow-ups

- [x] Fix the remaining global/static memory lowering issue in `compiler/examples/c89-mini-suite/07_globals_static_memory.c` (`i32.store` stack mismatch during WASM validation).
- [x] Implement real `goto` lowering instead of the current placeholder behavior.
- [x] Implement indirect function pointer calls in the WAT backend.
- [x] Revisit `for`-loop lowering to ensure full runtime correctness in all regression cases.
- [x] Expand the C preprocessor beyond the current normalization/macros subset (`#include`, conditional directives, richer macro behavior).
- [x] Add more automated end-to-end runtime tests for large examples in `compiler/examples/test.c`.
- [x] Decide which generated artifacts should stay out of version control and document the expected workflow for test outputs.

## Notes

- The mini-suite harness in `compiler/tests/test-c89-mini-suite.js` is green for the supported subset.
- Runtime for `02_control_flow.c` now runs (no skip), including `goto` behavior.
- `07_globals_static_memory.c` now passes runtime (`50`) with validation enabled.
- `05_pointers_and_funcptr.c` now passes runtime (`47`) with `call_indirect` lowering.
- Preprocessor now supports `#include` (local), `#if/#ifdef/#ifndef/#elif/#else/#endif`, and `#undef`.
- Large example E2E was added at `compiler/tests/test-large-example-e2e.js` and is passing.
- Test artifacts in `compiler/tests/outputs/` are now opt-in via `MAIAC_WRITE_TEST_OUTPUTS=1`.
- `test.c` currently compiles within the timeout budget, but some advanced runtime features still need follow-up.
