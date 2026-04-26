# MaiaC Diagnostic Suite

This suite tracks direct-example dist/runtime watchpoints that started as known failures and now serve as regression guards.

Purpose:

- preserve concrete reproductions and regression watchpoints
- detect when a previously-resolved limitation regresses
- keep `compiler/examples/suite/` stable and fully green

Current watchpoint cases:

- `01_stdio_file_handles.c` - direct `FILE *` stdio file workflow through the dist path
- `02_stdarg_variadics.c` - direct `stdarg.h` variadic example through the dist path
- `03_setjmp_dist_runner.c` - `setjmp/longjmp` through the generated dist node runner
- `04_time_basic_dist.c` - basic `time()` / `clock()` behavior through the generated dist node runner
- `05_time_struct_runtime.c` - `gmtime()` / `strftime()` struct-backed path through the generated dist node runner
- `06_locale_basic_dist.c` - basic `setlocale()` behavior through the generated dist node runner
- `07_localeconv_structs.c` - `localeconv()` / `struct lconv` access through the direct example path

Status: all current watchpoint cases are resolved on the mainline and are kept here to quickly detect regressions.

These cases are exercised by [test-example-diagnostic-suite.js](../../tests/test-example-diagnostic-suite.js).