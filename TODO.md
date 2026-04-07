# TODO

## Current compiler follow-ups

- [ ] Fix the remaining global/static memory lowering issue in `compiler/examples/c89-mini-suite/07_globals_static_memory.c` (`i32.store` stack mismatch during WASM validation).
- [ ] Implement real `goto` lowering instead of the current placeholder behavior.
- [ ] Implement indirect function pointer calls in the WAT backend.
- [ ] Revisit `for`-loop lowering to ensure full runtime correctness in all regression cases.
- [ ] Expand the C preprocessor beyond the current normalization/macros subset (`#include`, conditional directives, richer macro behavior).
- [ ] Add more automated end-to-end runtime tests for large examples in `compiler/examples/test.c`.
- [ ] Decide which generated artifacts should stay out of version control and document the expected workflow for test outputs.

## Notes

- The mini-suite harness in `compiler/tests/test-c89-mini-suite.js` is green for the supported subset.
- `test.c` currently compiles within the timeout budget, but some advanced runtime features still need follow-up.
