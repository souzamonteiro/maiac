# TODO

## Active Follow-ups

- [ ] Publish a supported C89 feature matrix in docs (implemented vs partial vs unsupported).
- [ ] Add a dedicated "Known Limitations" section with concrete examples and expected behavior.
- [ ] Add a browser smoke test workflow that validates loading and running a compiled WASM module via the web runner path.
- [ ] Add a CI guard for submodule consistency (`maiacc` alignment across MaiaC and MaiaWASM).
- [ ] Add golden-output assertions for key float/double formatting paths to prevent regressions in host `printf` behavior.

## Completed Milestones

- [x] Global/static memory lowering fixed for `07_globals_static_memory.c`.
- [x] Real `goto` lowering implemented (forward-goto scoped behavior).
- [x] Indirect function-pointer calls lowered in WAT backend.
- [x] `for`-loop lowering stabilized for current regression suite.
- [x] Preprocessor expanded (`#include`, conditionals, `#undef`) for current supported subset.
- [x] Large example end-to-end runtime test added and passing.
- [x] Test artifact generation made opt-in (`MAIAC_WRITE_TEST_OUTPUTS=1`).
