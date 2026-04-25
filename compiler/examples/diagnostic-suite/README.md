# MaiaC Diagnostic Suite

This suite contains intentionally problematic direct-example cases that are not part of the green regression suite.

Purpose:

- preserve concrete reproductions of current gaps
- detect when a known limitation stops reproducing
- keep `compiler/examples/suite/` stable and fully green

Current diagnostic cases:

- `01_stdio_file_handles.c` - direct `FILE *` stdio file workflow through the dist path
- `02_stdarg_variadics.c` - direct `stdarg.h` variadic example through the dist path
- `03_setjmp_dist_runner.c` - `setjmp/longjmp` through the generated dist node runner

These cases are exercised by [test-example-diagnostic-suite.js](../../tests/test-example-diagnostic-suite.js).